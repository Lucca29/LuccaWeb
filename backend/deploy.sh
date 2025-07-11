#!/bin/bash

echo "🚀 Déploiement de l'API Agence Lucca sur IONOS"
echo "=============================================="

# Mise à jour du système
echo "📦 Mise à jour du système..."
sudo apt update && sudo apt upgrade -y

# Installation de Node.js
echo "📦 Installation de Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installation de PM2
echo "📦 Installation de PM2..."
sudo npm install -g pm2

# Vérification des versions
echo "✅ Versions installées :"
node --version
npm --version
pm2 --version

# Installation des dépendances
echo "📦 Installation des dépendances..."
npm install

# Création des dossiers nécessaires
echo "📁 Création des dossiers..."
mkdir -p logs
mkdir -p uploads
mkdir -p database

# Initialisation de la base de données
echo "🗄️ Initialisation de la base de données..."
npm run init-db

# Configuration des permissions
echo "🔐 Configuration des permissions..."
chmod +x deploy.sh

# Démarrage avec PM2
echo "🚀 Démarrage de l'application avec PM2..."
pm2 start ecosystem.config.js --env production

# Sauvegarde de la configuration PM2
pm2 save
pm2 startup

echo "✅ Déploiement terminé !"
echo "📊 Pour surveiller : pm2 monit"
echo "📋 Pour voir les logs : pm2 logs agence-lucca-api"
echo "🔄 Pour redémarrer : pm2 restart agence-lucca-api" 