const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const config = require('../config');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation des données de connexion
const validateLogin = [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe requis (min 6 caractères)')
];

// Route de connexion
router.post('/login', validateLogin, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, user) => {
      if (err) {
        console.error('Erreur DB lors de la connexion:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur serveur'
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      try {
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            message: 'Email ou mot de passe incorrect'
          });
        }

        // Générer le token JWT
        const token = jwt.sign(
          { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            role: user.role 
          },
          config.jwtSecret,
          { expiresIn: '24h' }
        );

        res.json({
          success: true,
          message: 'Connexion réussie',
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        });

      } catch (error) {
        console.error('Erreur lors de la vérification du mot de passe:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur serveur'
        });
      }
    }
  );
});

// Route pour vérifier le token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Route pour changer le mot de passe
router.post('/change-password', 
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword').isLength({ min: 6 }).withMessage('Nouveau mot de passe requis (min 6 caractères)')
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

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    db.get(
      'SELECT password FROM users WHERE id = ?',
      [userId],
      async (err, user) => {
        if (err) {
          console.error('Erreur DB:', err);
          return res.status(500).json({
            success: false,
            message: 'Erreur serveur'
          });
        }

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'Utilisateur non trouvé'
          });
        }

        try {
          const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
          
          if (!isCurrentPasswordValid) {
            return res.status(401).json({
              success: false,
              message: 'Mot de passe actuel incorrect'
            });
          }

          const hashedNewPassword = await bcrypt.hash(newPassword, 10);

          db.run(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedNewPassword, userId],
            (err) => {
              if (err) {
                console.error('Erreur lors de la mise à jour du mot de passe:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Erreur lors de la mise à jour'
                });
              }

              res.json({
                success: true,
                message: 'Mot de passe mis à jour avec succès'
              });
            }
          );

        } catch (error) {
          console.error('Erreur lors du hashage:', error);
          res.status(500).json({
            success: false,
            message: 'Erreur serveur'
          });
        }
      }
    );
  }
);

module.exports = router; 