#!/bin/bash

echo "🚀 Démarrage rapide - Backend Blog Agence Lucca"
echo "=============================================="

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/"
    exit 1
fi

# Exécuter le script de setup
echo "🔧 Configuration automatique..."
npm run setup

echo ""
echo "🚀 Démarrage du serveur en mode développement..."
echo "💡 Utilisez Ctrl+C pour arrêter le serveur"
echo ""

# Démarrer le serveur
npm run dev 