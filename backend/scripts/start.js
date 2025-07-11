#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Script de démarrage - Backend Blog Agence Lucca');
console.log('================================================\n');

// Vérifications préalables
function checkRequirements() {
  console.log('🔍 Vérification des prérequis...');
  
  // Vérifier Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 16) {
    console.error('❌ Node.js 16+ requis. Version actuelle:', nodeVersion);
    process.exit(1);
  }
  console.log('✅ Node.js version:', nodeVersion);
  
  // Vérifier si les dépendances sont installées
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Installation des dépendances...');
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dépendances installées');
    } catch (error) {
      console.error('❌ Erreur lors de l\'installation des dépendances');
      process.exit(1);
    }
  } else {
    console.log('✅ Dépendances déjà installées');
  }
}

// Créer les dossiers nécessaires
function createDirectories() {
  console.log('\n📁 Création des dossiers...');
  
  const dirs = ['database', 'uploads'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Dossier créé: ${dir}/`);
    } else {
      console.log(`✅ Dossier existe: ${dir}/`);
    }
  });
}

// Initialiser la base de données
function initDatabase() {
  console.log('\n🗃️ Initialisation de la base de données...');
  
  if (!fs.existsSync('database/blog.db')) {
    try {
      execSync('node database/init.js', { stdio: 'inherit' });
      console.log('✅ Base de données initialisée');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de la base de données');
      process.exit(1);
    }
  } else {
    console.log('✅ Base de données existe déjà');
  }
}

// Afficher les informations de démarrage
function showStartupInfo() {
  const config = require('../config');
  
  console.log('\n🎉 Prêt à démarrer !');
  console.log('==================');
  console.log(`📡 Port: ${config.PORT}`);
  console.log(`📧 Admin: ${config.ADMIN_EMAIL}`);
  console.log(`🔑 Mot de passe: ${config.ADMIN_PASSWORD}`);
  console.log('\n🚀 Pour démarrer le serveur:');
  console.log('  npm start     (mode production)');
  console.log('  npm run dev   (mode développement)');
  console.log('\n📚 URLs utiles:');
  console.log(`  Health: http://localhost:${config.PORT}/api/health`);
  console.log(`  Docs:   http://localhost:${config.PORT}/api/docs`);
}

// Exécution
try {
  checkRequirements();
  createDirectories();
  initDatabase();
  showStartupInfo();
} catch (error) {
  console.error('\n❌ Erreur durant l\'initialisation:', error.message);
  process.exit(1);
} 