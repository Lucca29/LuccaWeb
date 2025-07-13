const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de la base de données
const dbPath = './database/blog.db';
const db = new sqlite3.Database(dbPath);

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
    db.serialize(() => {
        // Table des utilisateurs
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table des catégories
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            color TEXT DEFAULT '#007bff',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table des articles
        db.run(`CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            content TEXT,
            excerpt TEXT,
            featured_image TEXT,
            category_id INTEGER,
            status TEXT DEFAULT 'draft',
            views INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )`);

        // Créer l'utilisateur admin par défaut
        const adminPassword = bcrypt.hashSync('AdminLucca2024!', 10);
        db.run(`INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)`, 
            ['admin@agence-lucca.fr', adminPassword, 'admin']);

        console.log('✅ Base de données initialisée');
    });
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
        whereClause += ' AND a.category_id = ?';
        params.push(category);
    }
    
    const query = `
        SELECT a.*, c.name as category_name, c.color as category_color
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
    `;
    
    db.all(query, [...params, limit, offset], (err, articles) => {
        if (err) {
            console.error('Erreur articles:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        // Compter le total
        db.get(`SELECT COUNT(*) as total FROM articles a ${whereClause}`, params, (err, result) => {
            if (err) {
                console.error('Erreur count:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }
            
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
        });
    });
});

app.get('/api/articles/:slug', (req, res) => {
    const { slug } = req.params;
    
    const query = `
        SELECT a.*, c.name as category_name, c.color as category_color
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.slug = ?
    `;
    
    db.get(query, [slug], (err, article) => {
        if (err) {
            console.error('Erreur article:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        if (!article) {
            return res.status(404).json({ success: false, message: 'Article non trouvé' });
        }
        
        // Incrémenter les vues
        db.run('UPDATE articles SET views = views + 1 WHERE id = ?', [article.id]);
        
        res.json({
            success: true,
            data: article
        });
    });
});

app.post('/api/articles', (req, res) => {
    const { title, content, excerpt, category_id, status = 'draft' } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const query = `
        INSERT INTO articles (title, slug, content, excerpt, category_id, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [title, slug, content, excerpt, category_id, status], function(err) {
        if (err) {
            console.error('Erreur création article:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        res.json({
            success: true,
            data: { id: this.lastID, slug }
        });
    });
});

app.put('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    const { title, content, excerpt, category_id, status } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const query = `
        UPDATE articles 
        SET title = ?, slug = ?, content = ?, excerpt = ?, category_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    db.run(query, [title, slug, content, excerpt, category_id, status, id], function(err) {
        if (err) {
            console.error('Erreur mise à jour article:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        res.json({
            success: true,
            data: { id, slug }
        });
    });
});

app.delete('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM articles WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Erreur suppression article:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        res.json({
            success: true,
            message: 'Article supprimé'
        });
    });
});

// Routes des catégories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY name', (err, categories) => {
        if (err) {
            console.error('Erreur catégories:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        res.json({
            success: true,
            data: categories
        });
    });
});

app.post('/api/categories', (req, res) => {
    const { name, description, color } = req.body;
    
    db.run('INSERT INTO categories (name, description, color) VALUES (?, ?, ?)', 
        [name, description, color], function(err) {
        if (err) {
            console.error('Erreur création catégorie:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        res.json({
            success: true,
            data: { id: this.lastID }
        });
    });
});

app.put('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, color } = req.body;
    
    db.run('UPDATE categories SET name = ?, description = ?, color = ? WHERE id = ?', 
        [name, description, color, id], function(err) {
        if (err) {
            console.error('Erreur mise à jour catégorie:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        res.json({
            success: true,
            message: 'Catégorie mise à jour'
        });
    });
});

app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Erreur suppression catégorie:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        
        res.json({
            success: true,
            message: 'Catégorie supprimée'
        });
    });
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