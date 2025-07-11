const express = require('express');
const slugify = require('slugify');
const { body, validationResult, param } = require('express-validator');
const { db } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { upload, uploadImage, optimizeImage, deleteImage } = require('../middleware/upload');
const path = require('path');

const router = express.Router();

// Validation pour créer/modifier un article
const validateArticle = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Titre requis (3-200 caractères)'),
  body('content').trim().isLength({ min: 10 }).withMessage('Contenu requis (min 10 caractères)'),
  body('excerpt').optional().trim().isLength({ max: 500 }).withMessage('Résumé trop long (max 500 caractères)'),
  body('category').optional().trim(),
  body('tags').optional().trim(),
  body('status').optional().isIn(['draft', 'published']).withMessage('Statut invalide'),
  body('title_level').optional().isIn(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']).withMessage('Niveau de titre invalide'),
  body('meta_title').optional().trim().isLength({ max: 60 }).withMessage('Meta titre trop long (max 60 caractères)'),
  body('meta_description').optional().trim().isLength({ max: 160 }).withMessage('Meta description trop longue (max 160 caractères)')
];

// GET /api/articles - Récupérer tous les articles (avec pagination et filtres)
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  const category = req.query.category;
  const status = req.query.status || 'published';
  const search = req.query.search;

  let whereClause = 'WHERE 1=1';
  let params = [];

  // Filtrer par statut (public ne voit que published)
  if (!req.user || req.user.role !== 'admin') {
    whereClause += ' AND status = ?';
    params.push('published');
  } else if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  // Filtrer par catégorie
  if (category) {
    whereClause += ' AND category = ?';
    params.push(category);
  }

  // Recherche textuelle
  if (search) {
    whereClause += ' AND (title LIKE ? OR content LIKE ? OR excerpt LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  // Compter le total pour la pagination
  const countQuery = `SELECT COUNT(*) as total FROM articles ${whereClause}`;
  
  db.get(countQuery, params, (err, countResult) => {
    if (err) {
      console.error('Erreur lors du comptage:', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Récupérer les articles
    const query = `
      SELECT 
        a.*,
        u.name as author_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      ${whereClause}
      ORDER BY 
        CASE WHEN a.status = 'published' THEN a.published_at ELSE a.created_at END DESC
      LIMIT ? OFFSET ?
    `;

    db.all(query, [...params, limit, offset], (err, articles) => {
      if (err) {
        console.error('Erreur lors de la récupération des articles:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur'
        });
      }

      // Formater les articles
      const formattedArticles = articles.map(article => ({
        ...article,
        tags: article.tags ? article.tags.split(',').map(tag => tag.trim()) : [],
        image_url: article.featured_image ? `/uploads/${article.featured_image}` : null
      }));

      res.json({
        success: true,
        data: {
          articles: formattedArticles,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    });
  });
});

// GET /api/articles/id/:id - Récupérer un article par ID (pour l'administration)
router.get('/id/:id', 
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

    const query = `
      SELECT 
        a.*,
        u.name as author_name,
        u.email as author_email
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `;

    db.get(query, [id], (err, article) => {
      if (err) {
        console.error('Erreur lors de la récupération de l\'article:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur'
        });
      }

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article non trouvé'
        });
      }

      // Formater l'article
      const formattedArticle = {
        ...article,
        tags: article.tags ? article.tags.split(',').map(tag => tag.trim()) : [],
        image_url: article.featured_image ? `/uploads/${article.featured_image}` : null
      };

      res.json({
        success: true,
        data: formattedArticle
      });
    });
  }
);

// GET /api/articles/:slug - Récupérer un article par slug
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
  
  // Vérifier si c'est un ID numérique (pour rediriger vers la bonne route)
  if (/^\d+$/.test(slug)) {
    return res.status(400).json({
      success: false,
      message: 'Utilisez /api/articles/id/:id pour récupérer un article par ID'
    });
  }

  let whereClause = 'WHERE a.slug = ?';
  let params = [slug];

  // Si pas admin, ne montrer que les articles publiés
  if (!req.user || req.user.role !== 'admin') {
    whereClause += ' AND a.status = ?';
    params.push('published');
  }

  const query = `
    SELECT 
      a.*,
      u.name as author_name,
      u.email as author_email
    FROM articles a
    LEFT JOIN users u ON a.author_id = u.id
    ${whereClause}
  `;

  db.get(query, params, (err, article) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'article:', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article non trouvé'
      });
    }

    // Incrémenter les vues (seulement pour les visiteurs, pas pour l'admin)
    if (!req.user || req.user.role !== 'admin') {
      db.run('UPDATE articles SET views = views + 1 WHERE id = ?', [article.id]);
    }

    // Formater l'article
    const formattedArticle = {
      ...article,
      tags: article.tags ? article.tags.split(',').map(tag => tag.trim()) : [],
      image_url: article.featured_image ? `/uploads/${article.featured_image}` : null
    };

    res.json({
      success: true,
      data: formattedArticle
    });
  });
});

// POST /api/articles - Créer un nouvel article
router.post('/', 
  authenticateToken, 
  requireAdmin,
  upload,
  optimizeImage,
  validateArticle,
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
      title,
      content,
      excerpt,
      category = 'général',
      tags,
      status = 'draft',
      title_level = 'h2',
      meta_title,
      meta_description
    } = req.body;

    // Générer le slug
    let slug = slugify(title, { lower: true, strict: true });
    
    // Vérifier l'unicité du slug
    const checkSlugQuery = 'SELECT id FROM articles WHERE slug = ?';
    db.get(checkSlugQuery, [slug], (err, existingArticle) => {
      if (err) {
        console.error('Erreur lors de la vérification du slug:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur'
        });
      }

      // Si le slug existe, ajouter un suffixe
      if (existingArticle) {
        slug = `${slug}-${Date.now()}`;
      }

      const featuredImage = req.file ? req.file.filename : null;
      const publishedAt = status === 'published' ? new Date().toISOString() : null;

      const insertQuery = `
        INSERT INTO articles (
          title, slug, excerpt, content, featured_image, category, tags,
          status, title_level, meta_title, meta_description, author_id, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        title, slug, excerpt, content, featuredImage, category, tags,
        status, title_level, meta_title, meta_description, req.user.id, publishedAt
      ];

      db.run(insertQuery, params, function(err) {
        if (err) {
          console.error('Erreur lors de la création de l\'article:', err);
          return res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de l\'article'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Article créé avec succès',
          data: {
            id: this.lastID,
            slug,
            status
          }
        });
      });
    });
  }
);

// PUT /api/articles/:id - Modifier un article
router.put('/:id',
  authenticateToken,
  requireAdmin,
  upload,
  optimizeImage,
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    ...validateArticle
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
    const {
      title,
      content,
      excerpt,
      category,
      tags,
      status,
      title_level,
      meta_title,
      meta_description
    } = req.body;

    // Récupérer l'article existant
    db.get('SELECT * FROM articles WHERE id = ?', [id], (err, existingArticle) => {
      if (err) {
        console.error('Erreur lors de la récupération de l\'article:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur'
        });
      }

      if (!existingArticle) {
        return res.status(404).json({
          success: false,
          message: 'Article non trouvé'
        });
      }

      // Générer nouveau slug si le titre a changé
      let slug = existingArticle.slug;
      if (title !== existingArticle.title) {
        slug = slugify(title, { lower: true, strict: true });
        
        // Vérifier l'unicité du nouveau slug
        const checkSlugQuery = 'SELECT id FROM articles WHERE slug = ? AND id != ?';
        db.get(checkSlugQuery, [slug, id], (err, conflictingArticle) => {
          if (err) {
            console.error('Erreur lors de la vérification du slug:', err);
            return res.status(500).json({
              success: false,
              message: 'Erreur serveur'
            });
          }

          if (conflictingArticle) {
            slug = `${slug}-${Date.now()}`;
          }

          updateArticle();
        });
      } else {
        updateArticle();
      }

      function updateArticle() {
        // Gestion de l'image
        let featuredImage = existingArticle.featured_image;
        
        if (req.file) {
          // Nouvelle image uploadée, supprimer l'ancienne
          if (existingArticle.featured_image) {
            deleteImage(path.join(__dirname, '..', 'uploads', existingArticle.featured_image));
          }
          featuredImage = req.file.filename;
        }

        // Gestion de la date de publication
        let publishedAt = existingArticle.published_at;
        if (status === 'published' && !publishedAt) {
          publishedAt = new Date().toISOString();
        } else if (status === 'draft') {
          publishedAt = null;
        }

        const updateQuery = `
          UPDATE articles SET
            title = ?, slug = ?, excerpt = ?, content = ?, featured_image = ?,
            category = ?, tags = ?, status = ?, title_level = ?, meta_title = ?, meta_description = ?,
            published_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        const params = [
          title, slug, excerpt, content, featuredImage, category, tags,
          status, title_level, meta_title, meta_description, publishedAt, id
        ];

        db.run(updateQuery, params, function(err) {
          if (err) {
            console.error('Erreur lors de la mise à jour de l\'article:', err);
            return res.status(500).json({
              success: false,
              message: 'Erreur lors de la mise à jour'
            });
          }

          res.json({
            success: true,
            message: 'Article mis à jour avec succès',
            data: {
              id,
              slug,
              status
            }
          });
        });
      }
    });
  }
);

// DELETE /api/articles/:id - Supprimer un article
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

    // Récupérer l'article pour supprimer son image
    db.get('SELECT featured_image FROM articles WHERE id = ?', [id], (err, article) => {
      if (err) {
        console.error('Erreur lors de la récupération de l\'article:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur'
        });
      }

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article non trouvé'
        });
      }

      // Supprimer l'article
      db.run('DELETE FROM articles WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Erreur lors de la suppression de l\'article:', err);
          return res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression'
          });
        }

        // Supprimer l'image associée
        if (article.featured_image) {
          deleteImage(path.join(__dirname, '..', 'uploads', article.featured_image));
        }

        res.json({
          success: true,
          message: 'Article supprimé avec succès'
        });
      });
    });
  }
);

// GET /api/articles/stats/dashboard - Statistiques pour le dashboard admin
router.get('/stats/dashboard', authenticateToken, requireAdmin, (req, res) => {
  const queries = {
    total: 'SELECT COUNT(*) as count FROM articles',
    published: 'SELECT COUNT(*) as count FROM articles WHERE status = "published"',
    drafts: 'SELECT COUNT(*) as count FROM articles WHERE status = "draft"',
    totalViews: 'SELECT SUM(views) as total FROM articles',
    recentArticles: `
      SELECT id, title, slug, status, views, created_at 
      FROM articles 
      ORDER BY created_at DESC 
      LIMIT 5
    `,
    topArticles: `
      SELECT id, title, slug, views, created_at 
      FROM articles 
      WHERE status = 'published'
      ORDER BY views DESC 
      LIMIT 5
    `
  };

  const stats = {};
  let completedQueries = 0;
  const totalQueries = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.get(query, (err, result) => {
      if (err) {
        console.error(`Erreur lors de la requête ${key}:`, err);
        stats[key] = key.includes('Articles') ? [] : 0;
      } else {
        if (key.includes('Articles')) {
          stats[key] = result || [];
        } else {
          stats[key] = result?.count || result?.total || 0;
        }
      }

      completedQueries++;
      if (completedQueries === totalQueries) {
        res.json({
          success: true,
          data: stats
        });
      }
    });
  });
});

// GET /api/articles/stats/detailed - Statistiques détaillées
router.get('/stats/detailed', authenticateToken, requireAdmin, (req, res) => {
  const period = parseInt(req.query.period) || 30;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - period);
  const dateFromString = dateFrom.toISOString().split('T')[0];

  const queries = {
    // Statistiques de base
    totalArticles: 'SELECT COUNT(*) as count FROM articles',
    publishedArticles: 'SELECT COUNT(*) as count FROM articles WHERE status = "published"',
    draftArticles: 'SELECT COUNT(*) as count FROM articles WHERE status = "draft"',
    totalViews: 'SELECT SUM(views) as total FROM articles WHERE status = "published"',
    
    // Statistiques pour la période
    recentArticles: `
      SELECT COUNT(*) as count 
      FROM articles 
      WHERE created_at >= ? AND status = "published"
    `,
    
    // Articles les plus consultés
    topArticles: `
      SELECT a.id, a.title, a.views, a.created_at, c.name as category_name
      FROM articles a
      LEFT JOIN categories c ON a.category = c.id
      WHERE a.status = 'published' AND a.views > 0
      ORDER BY a.views DESC 
      LIMIT 10
    `,
    
    // Catégories avec nombre d'articles
    categoriesStats: `
      SELECT c.name, COUNT(a.id) as article_count
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category AND a.status = 'published'
      GROUP BY c.id, c.name
      ORDER BY article_count DESC
    `,
    
    // Tags populaires (simulation)
    popularTags: `
      SELECT a.tags
      FROM articles a
      WHERE a.status = 'published' AND a.tags IS NOT NULL AND a.tags != ''
    `,
    
    // Activité récente
    recentActivity: `
      SELECT 
        'create' as type,
        'Nouvel article: ' || title as description,
        created_at
      FROM articles 
      WHERE created_at >= ?
      UNION ALL
      SELECT 
        'update' as type,
        'Article modifié: ' || title as description,
        updated_at as created_at
      FROM articles 
      WHERE updated_at >= ? AND updated_at != created_at
      ORDER BY created_at DESC
      LIMIT 20
    `
  };

  const stats = {};
  let completedQueries = 0;
  const totalQueries = Object.keys(queries).length;

  // Fonction pour calculer les métriques dérivées
  function calculateDerivedMetrics() {
    const totalArticles = stats.totalArticles || 0;
    const totalViews = stats.totalViews || 0;
    const publishedArticles = stats.publishedArticles || 0;
    const draftArticles = stats.draftArticles || 0;

    // Calculs de base
    stats.avgViewsPerArticle = publishedArticles > 0 ? Math.round(totalViews / publishedArticles) : 0;
    stats.avgViewsPerDay = period > 0 ? Math.round(totalViews / period) : 0;
    stats.draftRatio = totalArticles > 0 ? Math.round((draftArticles / totalArticles) * 100) : 0;
    
    // Simulations pour les métriques avancées
    stats.avgReadingTime = Math.round(3 + Math.random() * 5); // 3-8 minutes
    stats.avgWordCount = Math.round(800 + Math.random() * 1200); // 800-2000 mots
    stats.publishingFrequency = Math.round((stats.recentArticles || 0) / (period / 7)); // articles par semaine
    
    // Simulations des changements (en pourcentage)
    stats.readingTimeChange = Math.round(-5 + Math.random() * 15); // -5% à +10%
    stats.viewsPerDayChange = Math.round(-10 + Math.random() * 25); // -10% à +15%
    stats.publishingFrequencyChange = Math.round(-15 + Math.random() * 30); // -15% à +15%
    stats.draftRatioChange = Math.round(-20 + Math.random() * 10); // -20% à -10%

    // Traitement des tags populaires
    if (stats.rawTags) {
      const tagCounts = {};
      stats.rawTags.forEach(article => {
        if (article.tags) {
          const tags = article.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });
      
      stats.popularTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
    } else {
      stats.popularTags = [];
    }

    // Catégorie la plus active
    if (stats.categoriesStats && stats.categoriesStats.length > 0) {
      const mostActive = stats.categoriesStats.reduce((max, cat) => 
        cat.article_count > max.article_count ? cat : max
      );
      stats.mostActiveCategory = mostActive.name;
    } else {
      stats.mostActiveCategory = 'Aucune';
    }

    // Nettoyer les données temporaires
    delete stats.rawTags;
  }

  Object.entries(queries).forEach(([key, query]) => {
    let params = [];
    
    // Paramètres pour les requêtes avec dates
    if (key === 'recentArticles') {
      params = [dateFromString];
    } else if (key === 'recentActivity') {
      params = [dateFromString, dateFromString];
    }

    if (key === 'popularTags') {
      // Requête spéciale pour les tags
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error(`Erreur lors de la requête ${key}:`, err);
          stats.rawTags = [];
        } else {
          stats.rawTags = rows || [];
        }

        completedQueries++;
        if (completedQueries === totalQueries) {
          calculateDerivedMetrics();
          res.json({
            success: true,
            data: stats
          });
        }
      });
    } else if (['topArticles', 'categoriesStats', 'recentActivity'].includes(key)) {
      // Requêtes qui retournent plusieurs lignes
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error(`Erreur lors de la requête ${key}:`, err);
          stats[key] = [];
        } else {
          stats[key] = rows || [];
        }

        completedQueries++;
        if (completedQueries === totalQueries) {
          calculateDerivedMetrics();
          res.json({
            success: true,
            data: stats
          });
        }
      });
    } else {
      // Requêtes qui retournent une seule valeur
      db.get(query, params, (err, result) => {
        if (err) {
          console.error(`Erreur lors de la requête ${key}:`, err);
          stats[key] = 0;
        } else {
          stats[key] = result?.count || result?.total || 0;
        }

        completedQueries++;
        if (completedQueries === totalQueries) {
          calculateDerivedMetrics();
          res.json({
            success: true,
            data: stats
          });
        }
      });
    }
  });
});

// POST /api/articles/upload - Upload d'image pour un article
router.post('/upload', 
  authenticateToken, 
  requireAdmin,
  uploadImage,
  optimizeImage,
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      // L'image a été uploadée et optimisée par le middleware
      const imageUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        success: true,
        message: 'Image uploadée avec succès',
        data: {
          filename: req.file.filename,
          url: imageUrl,
          originalName: req.file.originalname,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload de l\'image'
      });
    }
  }
);

module.exports = router; 