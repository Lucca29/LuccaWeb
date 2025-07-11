const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config');

const db = new sqlite3.Database(config.DB_PATH);

const addTitleLevelColumn = () => {
  return new Promise((resolve, reject) => {
    // Vérifier si la colonne existe déjà
    db.all("PRAGMA table_info(articles)", (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const columnExists = rows.some(row => row.name === 'title_level');
      
      if (columnExists) {
        console.log('✅ La colonne title_level existe déjà');
        resolve();
        return;
      }
      
      // Ajouter la colonne title_level
      db.run(`
        ALTER TABLE articles ADD COLUMN title_level TEXT DEFAULT 'h2'
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log('✅ Colonne title_level ajoutée avec succès');
        resolve();
      });
    });
  });
};

if (require.main === module) {
  addTitleLevelColumn()
    .then(() => {
      db.close();
      console.log('🎉 Migration terminée avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la migration:', error);
      db.close();
      process.exit(1);
    });
}

module.exports = { addTitleLevelColumn }; 