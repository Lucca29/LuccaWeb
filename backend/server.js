const express = require('express');
const path = require('path');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de la base de données
const dbPath = './database/blog.db';
const db = new Database(dbPath);

// Configuration CORS - Permettre les requêtes depuis votre domaine
app.use(cors({
    origin: ['https://www.luccaweb.fr', 'https://luccaweb.fr', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuration de l'upload
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialisation de la base de données
function initDatabase() {
    // Table des utilisateurs
    db.exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Table des catégories
    db.exec(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#007bff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Table des articles
    db.exec(`CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        content TEXT,
        excerpt TEXT,
        featured_image TEXT,
        category TEXT DEFAULT 'général',
        status TEXT DEFAULT 'draft',
        views INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    )`);

    // Créer l'utilisateur admin par défaut
    const adminPassword = bcrypt.hashSync('AdminLucca2024!', 10);
    const stmt = db.prepare(`INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)`);
    stmt.run('admin@agence-lucca.fr', adminPassword, 'admin');

    console.log('✅ Base de données initialisée');
}

// Routes API

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Routes d'authentification
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Vérifier les identifiants
        if (email === 'admin@agence-lucca.fr' && password === 'AdminLucca2024!') {
            const token = jwt.sign(
                { email, role: 'admin' },
                'AgenceLuccaSecret2024',
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                token,
                user: { email, role: 'admin' }
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Identifiants incorrects'
            });
        }
    } catch (error) {
        console.error('Erreur login:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

app.get('/api/auth/verify', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token manquant' });
        }

        const decoded = jwt.verify(token, 'AgenceLuccaSecret2024');
        res.json({
            success: true,
            user: decoded
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token invalide'
        });
    }
});

// Routes des articles
app.get('/api/articles', (req, res) => {
    const { page = 1, limit = 10, status, category } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (status) {
        whereClause += ' AND a.status = ?';
        params.push(status);
    }
    
    if (category) {
        whereClause += ' AND a.category = ?';
        params.push(category);
    }
    
    const query = `
        SELECT a.*
        FROM articles a
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
    `;
    
    try {
        const stmt = db.prepare(query);
        const articles = stmt.all(...params, limit, offset);
        
        // Compter le total
        const countStmt = db.prepare(`SELECT COUNT(*) as total FROM articles a ${whereClause}`);
        const result = countStmt.get(...params);
        
        res.json({
            success: true,
            data: {
                articles,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(result.total / limit),
                    total: result.total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Erreur articles:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

app.get('/api/articles/:slug', (req, res) => {
    const { slug } = req.params;
    
    const query = `
        SELECT a.*
        FROM articles a
        WHERE a.slug = ?
    `;
    
    try {
        const stmt = db.prepare(query);
        const article = stmt.get(slug);
        
        if (!article) {
            return res.status(404).json({ success: false, message: 'Article non trouvé' });
        }
        
        // Incrémenter les vues
        const updateStmt = db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?');
        updateStmt.run(article.id);
        
        res.json({
            success: true,
            data: article
        });
    } catch (error) {
        console.error('Erreur article:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

app.post('/api/articles', (req, res) => {
    const { title, content, excerpt, category, status = 'draft' } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const query = `
        INSERT INTO articles (title, slug, content, excerpt, category, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    try {
        const stmt = db.prepare(query);
        const result = stmt.run(title, slug, content, excerpt, category, status);
        
        res.json({
            success: true,
            data: { id: result.lastInsertRowid, slug }
        });
    } catch (error) {
        console.error('Erreur création article:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

app.put('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    const { title, content, excerpt, category, status } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const query = `
        UPDATE articles 
        SET title = ?, slug = ?, content = ?, excerpt = ?, category = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    try {
        const stmt = db.prepare(query);
        stmt.run(title, slug, content, excerpt, category, status, id);
        
        res.json({
            success: true,
            data: { id, slug }
        });
    } catch (error) {
        console.error('Erreur mise à jour article:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

app.delete('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        const stmt = db.prepare('DELETE FROM articles WHERE id = ?');
        stmt.run(id);
        
        res.json({
            success: true,
            message: 'Article supprimé'
        });
    } catch (error) {
        console.error('Erreur suppression article:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Routes des catégories
app.get('/api/categories', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM categories ORDER BY name');
        const categories = stmt.all();
        
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Erreur catégories:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

app.post('/api/categories', (req, res) => {
    const { name, description, color } = req.body;
    
    try {
        const stmt = db.prepare('INSERT INTO categories (name, description, color) VALUES (?, ?, ?)');
        const result = stmt.run(name, description, color);
        
        res.json({
            success: true,
            data: { id: result.lastInsertRowid }
        });
    } catch (error) {
        console.error('Erreur création catégorie:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

app.put('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, color } = req.body;
    
    try {
        const stmt = db.prepare('UPDATE categories SET name = ?, description = ?, color = ? WHERE id = ?');
        stmt.run(name, description, color, id);
        
        res.json({
            success: true,
            message: 'Catégorie mise à jour'
        });
    } catch (error) {
        console.error('Erreur mise à jour catégorie:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    
    try {
        const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
        stmt.run(id);
        
        res.json({
            success: true,
            message: 'Catégorie supprimée'
        });
    } catch (error) {
        console.error('Erreur suppression catégorie:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Upload d'images
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier uploadé' });
    }
    
    const filename = `article-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const filepath = path.join(__dirname, 'uploads', filename);
    
    // Renommer le fichier temporaire
    fs.renameSync(req.file.path, filepath);
    
    res.json({
        success: true,
        data: {
            filename,
            url: `/uploads/${filename}`
        }
    });
});

// Routes des pages

// Route racine - Site principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour l'interface d'administration
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Routes pour le site principal
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/blog', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog.html'));
});

app.get('/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'services.html'));
});

app.get('/services-identite', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'services-identite.html'));
});

app.get('/services-sur-mesure', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'services-sur-mesure.html'));
});

app.get('/qui-sommes-nous', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'qui-sommes-nous.html'));
});

app.get('/cas-etudes', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cas-etudes.html'));
});

app.get('/avis', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'avis.html'));
});

app.get('/estimer-mes-besoins', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'estimer-mes-besoins.html'));
});

// Route pour afficher un article
app.get('/article/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'article.html'));
});

// Route par défaut pour le site principal
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur
async function startServer() {
    try {
        // Initialisation de la base de données
        initDatabase();
        
        // Créer les dossiers nécessaires
        if (!fs.existsSync('./uploads')) {
            fs.mkdirSync('./uploads');
        }
        if (!fs.existsSync('./database')) {
            fs.mkdirSync('./database');
        }
        
        app.listen(PORT, () => {
            console.log(`🚀 Serveur démarré sur le port ${PORT}`);
            console.log(`📱 Site principal: http://localhost:${PORT}`);
            console.log(`🔧 Interface admin: http://localhost:${PORT}/admin`);
            console.log(`📊 API: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Erreur démarrage serveur:', error);
        process.exit(1);
    }
}

startServer(); 