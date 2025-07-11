module.exports = {
  // Configuration du serveur
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Base de données
  DB_PATH: process.env.DB_PATH || './database/blog.db',

  // JWT Secret (changez cette clé en production !)
  jwtSecret: process.env.JWT_SECRET || 'votre_cle_secrete_super_longue_et_complexe_ici_2024',

  // Upload d'images
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp', 'gif'],

  // Admin par défaut
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@agence-lucca.fr',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminLucca2024!',

  // CORS - Ajout des domaines de production
  CORS_ORIGINS: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://localhost:5000',
    'https://votre-domaine.com', // Remplacez par votre domaine
    'https://www.votre-domaine.com' // Remplacez par votre domaine
  ]
}; 