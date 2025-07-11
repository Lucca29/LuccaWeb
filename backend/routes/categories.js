const express = require('express');
const slugify = require('slugify');
const { body, validationResult, param } = require('express-validator');
const { db } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation pour créer/modifier une catégorie
const validateCategory = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Nom requis (2-50 caractères)'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description trop longue (max 200 caractères)'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Couleur invalide (format #RRGGBB)')
];

// GET /api/categories - Récupérer toutes les catégories
router.get('/', (req, res) => {
  const query = `
    SELECT 
      c.*,
      COUNT(a.id) as article_count
    FROM categories c
    LEFT JOIN articles a ON c.slug = a.category AND a.status = 'published'
    GROUP BY c.id
    ORDER BY c.name ASC
  `;

  db.all(query, (err, categories) => {
    if (err) {
      console.error('Erreur lors de la récupération des catégories:', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }

    res.json({
      success: true,
      data: categories
    });
  });
});

// GET /api/categories/:slug - Récupérer une catégorie par slug
router.get('/:slug', [
  param('slug').trim().notEmpty().withMessage('Slug requis')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Slug invalide',
      errors: errors.array()
    });
  }

  const { slug } = req.params;

  const query = `
    SELECT 
      c.*,
      COUNT(a.id) as article_count
    FROM categories c
    LEFT JOIN articles a ON c.slug = a.category AND a.status = 'published'
    WHERE c.slug = ?
    GROUP BY c.id
  `;

  db.get(query, [slug], (err, category) => {
    if (err) {
      console.error('Erreur lors de la récupération de la catégorie:', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }

    res.json({
      success: true,
      data: category
    });
  });
});

// POST /api/categories - Créer une nouvelle catégorie
router.post('/',
  authenticateToken,
  requireAdmin,
  validateCategory,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      color = '#007bff'
    } = req.body;

    // Générer le slug
    let slug = slugify(name, { lower: true, strict: true });

    // Vérifier l'unicité du slug
    const checkSlugQuery = 'SELECT id FROM categories WHERE slug = ?';
    db.get(checkSlugQuery, [slug], (err, existingCategory) => {
      if (err) {
        console.error('Erreur lors de la vérification du slug:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur'
        });
      }

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Une catégorie avec ce nom existe déjà'
        });
      }

      const insertQuery = `
        INSERT INTO categories (name, slug, description, color)
        VALUES (?, ?, ?, ?)
      `;

      db.run(insertQuery, [name, slug, description, color], function(err) {
        if (err) {
          console.error('Erreur lors de la création de la catégorie:', err);
          return res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de la catégorie'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Catégorie créée avec succès',
          data: {
            id: this.lastID,
            name,
            slug,
            description,
            color
          }
        });
      });
    });
  }
);

// PUT /api/categories/:id - Modifier une catégorie
router.put('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    ...validateCategory
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, description, color } = req.body;

    // Récupérer la catégorie existante
    db.get('SELECT * FROM categories WHERE id = ?', [id], (err, existingCategory) => {
      if (err) {
        console.error('Erreur lors de la récupération de la catégorie:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur'
        });
      }

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Catégorie non trouvée'
        });
      }

      // Générer nouveau slug si le nom a changé
      let slug = existingCategory.slug;
      if (name !== existingCategory.name) {
        slug = slugify(name, { lower: true, strict: true });

        // Vérifier l'unicité du nouveau slug
        const checkSlugQuery = 'SELECT id FROM categories WHERE slug = ? AND id != ?';
        db.get(checkSlugQuery, [slug, id], (err, conflictingCategory) => {
          if (err) {
            console.error('Erreur lors de la vérification du slug:', err);
            return res.status(500).json({
              success: false,
              message: 'Erreur serveur'
            });
          }

          if (conflictingCategory) {
            return res.status(400).json({
              success: false,
              message: 'Une catégorie avec ce nom existe déjà'
            });
          }

          updateCategory();
        });
      } else {
        updateCategory();
      }

      function updateCategory() {
        const updateQuery = `
          UPDATE categories SET
            name = ?, slug = ?, description = ?, color = ?
          WHERE id = ?
        `;

        db.run(updateQuery, [name, slug, description, color, id], function(err) {
          if (err) {
            console.error('Erreur lors de la mise à jour de la catégorie:', err);
            return res.status(500).json({
              success: false,
              message: 'Erreur lors de la mise à jour'
            });
          }

          // Si le slug a changé, mettre à jour les articles
          if (slug !== existingCategory.slug) {
            db.run(
              'UPDATE articles SET category = ? WHERE category = ?',
              [slug, existingCategory.slug],
              (err) => {
                if (err) {
                  console.error('Erreur lors de la mise à jour des articles:', err);
                }
              }
            );
          }

          res.json({
            success: true,
            message: 'Catégorie mise à jour avec succès',
            data: {
              id,
              name,
              slug,
              description,
              color
            }
          });
        });
      }
    });
  }
);

// DELETE /api/categories/:id - Supprimer une catégorie
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalide')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ID invalide',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Vérifier si la catégorie existe
    db.get('SELECT slug FROM categories WHERE id = ?', [id], (err, category) => {
      if (err) {
        console.error('Erreur lors de la récupération de la catégorie:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur'
        });
      }

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Catégorie non trouvée'
        });
      }

      // Vérifier s'il y a des articles dans cette catégorie
      db.get(
        'SELECT COUNT(*) as count FROM articles WHERE category = ?',
        [category.slug],
        (err, result) => {
          if (err) {
            console.error('Erreur lors de la vérification des articles:', err);
            return res.status(500).json({
              success: false,
              message: 'Erreur serveur'
            });
          }

          if (result.count > 0) {
            return res.status(400).json({
              success: false,
              message: `Impossible de supprimer cette catégorie car elle contient ${result.count} article(s). Veuillez d'abord déplacer ou supprimer ces articles.`
            });
          }

          // Supprimer la catégorie
          db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
            if (err) {
              console.error('Erreur lors de la suppression de la catégorie:', err);
              return res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression'
              });
            }

            res.json({
              success: true,
              message: 'Catégorie supprimée avec succès'
            });
          });
        }
      );
    });
  }
);

module.exports = router; 