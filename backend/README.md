# 🚀 Backend Blog - Agence Lucca

Backend complet pour la gestion du blog de l'Agence Lucca avec API REST, authentification JWT, et gestion d'images.

## 📋 Fonctionnalités

### ✨ Gestion des Articles
- ✅ **CRUD complet** (Create, Read, Update, Delete)
- ✅ **Upload d'images** avec optimisation automatique
- ✅ **Système de brouillons/publication**
- ✅ **Génération automatique de slugs**
- ✅ **Pagination et filtres**
- ✅ **Recherche textuelle**
- ✅ **Compteur de vues**
- ✅ **Tags et catégories**
- ✅ **Meta SEO** (title, description)

### 🔐 Authentification & Sécurité
- ✅ **JWT avec expiration (24h)**
- ✅ **Rate limiting** (anti-spam)
- ✅ **Validation des données**
- ✅ **Hashage sécurisé des mots de passe**
- ✅ **Middleware de sécurité (Helmet)**
- ✅ **Protection CORS**

### 🎨 Gestion des Catégories
- ✅ **CRUD complet**
- ✅ **Couleurs personnalisées**
- ✅ **Comptage automatique d'articles**
- ✅ **Protection contre suppression si articles liés**

### 📸 Gestion des Images
- ✅ **Upload sécurisé** (5MB max)
- ✅ **Optimisation automatique** (WebP, compression)
- ✅ **Redimensionnement intelligent**
- ✅ **Validation des formats** (jpg, png, webp, gif)
- ✅ **Suppression automatique** des anciennes images

### 📊 Dashboard Admin
- ✅ **Statistiques complètes**
- ✅ **Articles récents et populaires**
- ✅ **Compteurs en temps réel**

## 🛠️ Installation

### Prérequis
- Node.js 16+ 
- npm ou yarn

### Étapes d'installation

1. **Installer les dépendances**
```bash
npm install
```

2. **Initialiser la base de données**
```bash
npm run init-db
```

3. **Démarrer le serveur**
```bash
# Mode développement (avec auto-reload)
npm run dev

# Mode production
npm start
```

Le serveur démarre sur `http://localhost:3000`

## 🔧 Configuration

Modifiez le fichier `config.js` selon vos besoins :

```javascript
module.exports = {
  PORT: 3000,
  DB_PATH: './database/blog.db',
  JWT_SECRET: 'changez-cette-cle-en-production',
  UPLOAD_DIR: './uploads',
  MAX_FILE_SIZE: 5242880, // 5MB
  ADMIN_EMAIL: 'admin@agence-lucca.fr',
  ADMIN_PASSWORD: 'AdminLucca2024!'
};
```

## 📚 Documentation API

### 🔗 Endpoints Principaux

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/health` | État de l'API | ❌ |
| `GET` | `/api/docs` | Documentation | ❌ |

### 🔐 Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/auth/login` | Connexion admin |
| `GET` | `/api/auth/verify` | Vérifier token |
| `POST` | `/api/auth/change-password` | Changer mot de passe |

**Exemple de connexion :**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@agence-lucca.fr",
    "password": "AdminLucca2024!"
  }'
```

### 📝 Articles

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/articles` | Lister articles | ❌ |
| `GET` | `/api/articles/:slug` | Article par slug | ❌ |
| `POST` | `/api/articles` | Créer article | ✅ Admin |
| `PUT` | `/api/articles/:id` | Modifier article | ✅ Admin |
| `DELETE` | `/api/articles/:id` | Supprimer article | ✅ Admin |
| `GET` | `/api/articles/stats/dashboard` | Statistiques | ✅ Admin |

**Paramètres de requête pour GET /api/articles :**
- `page` : Numéro de page (défaut: 1)
- `limit` : Articles par page (défaut: 10, max: 50)
- `category` : Filtrer par catégorie
- `status` : Filtrer par statut (admin uniquement)
- `search` : Recherche textuelle

**Exemple de création d'article :**
```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Mon Premier Article" \
  -F "content=Contenu de l'article..." \
  -F "excerpt=Résumé de l'article" \
  -F "category=developpement-web" \
  -F "tags=javascript,nodejs" \
  -F "status=published" \
  -F "featured_image=@image.jpg"
```

### 🎨 Catégories

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `GET` | `/api/categories` | Lister catégories | ❌ |
| `GET` | `/api/categories/:slug` | Catégorie par slug | ❌ |
| `POST` | `/api/categories` | Créer catégorie | ✅ Admin |
| `PUT` | `/api/categories/:id` | Modifier catégorie | ✅ Admin |
| `DELETE` | `/api/categories/:id` | Supprimer catégorie | ✅ Admin |

## 🗃️ Structure de la Base de Données

### Table `users`
```sql
- id (INTEGER PRIMARY KEY)
- email (TEXT UNIQUE)
- password (TEXT) -- Hashé avec bcrypt
- name (TEXT)
- role (TEXT DEFAULT 'admin')
- created_at, updated_at (DATETIME)
```

### Table `articles`
```sql
- id (INTEGER PRIMARY KEY)
- title (TEXT)
- slug (TEXT UNIQUE) -- Généré automatiquement
- excerpt (TEXT) -- Résumé
- content (TEXT) -- Contenu complet
- featured_image (TEXT) -- Nom du fichier
- category (TEXT) -- Slug de la catégorie
- tags (TEXT) -- Séparés par des virgules
- status (TEXT) -- 'draft' ou 'published'
- meta_title, meta_description (TEXT) -- SEO
- author_id (INTEGER) -- Référence vers users
- views (INTEGER DEFAULT 0)
- created_at, updated_at, published_at (DATETIME)
```

### Table `categories`
```sql
- id (INTEGER PRIMARY KEY)
- name (TEXT UNIQUE)
- slug (TEXT UNIQUE)
- description (TEXT)
- color (TEXT) -- Code hexadécimal
- created_at (DATETIME)
```

## 🔒 Sécurité

- **Rate Limiting** : 100 req/15min (5 pour login)
- **Validation** : express-validator sur toutes les entrées
- **Upload sécurisé** : Filtrage des extensions, taille limitée
- **JWT** : Tokens expiration 24h
- **Helmet** : Headers de sécurité
- **CORS** : Origines autorisées configurables

## 📁 Structure du Projet

```
backend/
├── config.js              # Configuration
├── server.js              # Serveur principal
├── package.json           # Dépendances
├── database/
│   └── init.js            # Initialisation DB
├── middleware/
│   ├── auth.js            # Authentification JWT
│   └── upload.js          # Gestion upload images
├── routes/
│   ├── auth.js            # Routes authentification
│   ├── articles.js        # Routes articles
│   └── categories.js      # Routes catégories
├── uploads/               # Images uploadées
└── database/
    └── blog.db           # Base SQLite
```

## 🚀 Déploiement

### Variables d'environnement
```bash
export NODE_ENV=production
export PORT=3000
export JWT_SECRET="votre-cle-super-secrete"
export ADMIN_EMAIL="votre@email.com"
export ADMIN_PASSWORD="MotDePasseSecurise"
```

### Avec PM2
```bash
npm install -g pm2
pm2 start server.js --name "agence-lucca-blog"
pm2 startup
pm2 save
```

## 🧪 Tests

Testez l'API avec des outils comme :
- **Postman** : Importez la collection depuis `/api/docs`
- **curl** : Exemples dans cette documentation
- **Thunder Client** (VS Code)

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@agence-lucca.fr
- 📖 Documentation : `http://localhost:3000/api/docs`
- 🏥 Health check : `http://localhost:3000/api/health`

## 🎯 Prochaines Fonctionnalités

- [ ] Système de commentaires
- [ ] Authentification multi-utilisateurs
- [ ] Envoi d'emails (newsletters)
- [ ] Export/Import d'articles
- [ ] Analyse de performance
- [ ] Interface admin web complète

---

🔥 **Backend créé avec amour par l'équipe Agence Lucca** 💙 