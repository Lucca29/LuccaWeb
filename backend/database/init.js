const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const config = require('../config');

// Créer le dossier database s'il n'existe pas
const dbDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

const db = new sqlite3.Database(config.DB_PATH);

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      // Table des utilisateurs (admin)
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Table des articles de blog
      db.run(`
        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          excerpt TEXT,
          content TEXT NOT NULL,
          featured_image TEXT,
          category TEXT DEFAULT 'général',
          tags TEXT,
          status TEXT DEFAULT 'draft',
          meta_title TEXT,
          meta_description TEXT,
          author_id INTEGER,
          views INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          published_at DATETIME,
          FOREIGN KEY (author_id) REFERENCES users (id)
        )
      `);

      // Table des catégories
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          color TEXT DEFAULT '#007bff',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Table des commentaires (pour plus tard)
      db.run(`
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id INTEGER NOT NULL,
          author_name TEXT NOT NULL,
          author_email TEXT NOT NULL,
          content TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
        )
      `);

      // Créer l'utilisateur admin par défaut
      const hashedPassword = await bcrypt.hash(config.ADMIN_PASSWORD, 10);
      
      db.run(`
        INSERT OR IGNORE INTO users (email, password, name, role)
        VALUES (?, ?, ?, ?)
      `, [config.ADMIN_EMAIL, hashedPassword, 'Administrateur', 'admin']);

      // Créer quelques catégories par défaut
      const defaultCategories = [
        { name: 'Développement Web', slug: 'developpement-web', description: 'Articles sur le développement web', color: '#007bff' },
        { name: 'Design', slug: 'design', description: 'Articles sur le design et UX/UI', color: '#6f42c1' },
        { name: 'SEO', slug: 'seo', description: 'Articles sur le référencement naturel', color: '#28a745' },
        { name: 'Actualités', slug: 'actualites', description: 'Actualités de l\'agence', color: '#fd7e14' },
        { name: 'Tutoriels', slug: 'tutoriels', description: 'Guides et tutoriels', color: '#20c997' }
      ];

      for (const category of defaultCategories) {
        db.run(`
          INSERT OR IGNORE INTO categories (name, slug, description, color)
          VALUES (?, ?, ?, ?)
        `, [category.name, category.slug, category.description, category.color]);
      }

      console.log('✅ Base de données initialisée avec succès');
      console.log(`📧 Admin: ${config.ADMIN_EMAIL}`);
      console.log(`🔐 Mot de passe: ${config.ADMIN_PASSWORD}`);
      
      resolve();
    });
  });
};

if (require.main === module) {
  initDatabase()
    .then(() => {
      db.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      db.close();
      process.exit(1);
    });
}

module.exports = { initDatabase, db }; 