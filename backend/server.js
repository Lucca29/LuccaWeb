const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');
const { initDatabase } = require('./database/init');

// Routes
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const categoryRoutes = require('./routes/categories');
const contactRoutes = require('./routes/contact');

const app = express();

// Middleware de sécurité - Temporairement désactivé pour le développement
// app.use(helmet({
//     contentSecurityPolicy: {
//         directives: {
//             defaultSrc: ["'self'"],
//             styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://cdn.tiny.cloud"],
//             scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "https://cdn.tiny.cloud"],
//             scriptSrcAttr: ["'unsafe-inline'", "'unsafe-hashes'"], // Autorise tous les gestionnaires d'événements inline
//             fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
//             imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
//             connectSrc: ["'self'", "https://cdn.tiny.cloud"],
//             frameSrc: ["'self'"],
//             workerSrc: ["'self'", "blob:"],
//             objectSrc: ["'none'"],
//             baseUri: ["'self'"]
//         }
//     }
// }));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requêtes par IP
    message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives de connexion par IP
    message: { error: 'Trop de tentatives de connexion, veuillez réessayer plus tard.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/contact', contactRoutes);

// Route de base pour l'API
app.get('/api', (req, res) => {
    res.json({
        message: 'API Blog Agence Lucca',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            articles: '/api/articles', 
            categories: '/api/categories',
            contact: '/api/contact',
            health: '/api/health',
            docs: '/api/docs'
        }
    });
});

// Route racine - Interface d'administration
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour afficher un article
app.get('/article/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'article.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Documentation simple
app.get('/api/docs', (req, res) => {
    res.json({
        title: 'API Blog Agence Lucca - Documentation',
        version: '1.0.0',
        baseUrl: `${req.protocol}://${req.get('host')}/api`,
        endpoints: {
            authentication: {
                'POST /auth/login': 'Connexion admin',
                'GET /auth/verify': 'Vérification du token',
                'POST /auth/change-password': 'Changement de mot de passe'
            },
            articles: {
                'GET /articles': 'Liste des articles (avec pagination, filtres)',
                'GET /articles/:slug': 'Article par slug',
                'POST /articles': 'Créer un article (auth requise)',
                'PUT /articles/:id': 'Modifier un article (auth requise)',
                'DELETE /articles/:id': 'Supprimer un article (auth requise)',
                'POST /articles/upload': 'Upload d\'image (auth requise)',
                'GET /articles/stats/dashboard': 'Statistiques dashboard (auth requise)'
            },
            categories: {
                'GET /categories': 'Liste des catégories',
                'POST /categories': 'Créer une catégorie (auth requise)',
                'PUT /categories/:id': 'Modifier une catégorie (auth requise)',
                'DELETE /categories/:id': 'Supprimer une catégorie (auth requise)'
            }
        }
    });
});

// Route par défaut pour l'interface d'administration
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur:', err);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
    });
});

// Gestion des routes non trouvées
app.use((req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.path
    });
});

// Démarrage du serveur
async function startServer() {
    try {
        // Initialisation de la base de données
        console.log('🔄 Initialisation de la base de données...');
        await initDatabase();
        console.log('✅ Base de données initialisée avec succès');
        
        console.log('📧 Admin: admin@agence-lucca.fr');
        console.log('🔐 Mot de passe: AdminLucca2024!');
        
        // Démarrage du serveur
        app.listen(config.port, '0.0.0.0', () => {
            console.log('🚀 =================================');
            console.log('🎉 SERVEUR BLOG AGENCE LUCCA DÉMARRÉ');
            console.log('🚀 =================================');
            console.log(`📡 Port: ${config.port}`);
            console.log(`🌍 Environnement: ${config.nodeEnv}`);
            console.log(`📊 Interface Admin: http://localhost:${config.port}`);
            console.log(`📊 API Health: http://localhost:${config.port}/api/health`);
            console.log(`📚 Documentation: http://localhost:${config.port}/api/docs`);
            console.log('🔐 Admin par défaut:');
            console.log('   📧 Email: admin@agence-lucca.fr');
            console.log('   🔑 Mot de passe: AdminLucca2024!');
            console.log('🚀 =================================');
        });
        
    } catch (error) {
        console.error('❌ Erreur lors du démarrage:', error);
        process.exit(1);
    }
}

startServer(); 