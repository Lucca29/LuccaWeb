// Configuration de l'API
const API_BASE = 'https://luccaweb.fr/api';
console.log('🔧 API_BASE configuré:', API_BASE);
let authToken = localStorage.getItem('authToken');
console.log('🔑 Token initial:', authToken ? 'TROUVÉ' : 'AUCUN');

// State management
const state = {
    currentPage: 'dashboard',
    user: null,
    articles: [],
    categories: [],
    currentArticle: null,
    loading: false
};

// Utilitaires
const utils = {
    // Formatage des dates
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Formatage des nombres
    formatNumber(num) {
        return new Intl.NumberFormat('fr-FR').format(num);
    },

    // Génération de slug
    generateSlug(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[àáäâ]/g, 'a')
            .replace(/[èéëê]/g, 'e')
            .replace(/[ìíïî]/g, 'i')
            .replace(/[òóöô]/g, 'o')
            .replace(/[ùúüû]/g, 'u')
            .replace(/[ñ]/g, 'n')
            .replace(/[ç]/g, 'c')
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    },

    // Extraction du texte HTML
    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }
};

// API Functions
const api = {
    // Authentification
    async login(email, password) {
        console.log('🌐 URL API:', `${API_BASE}/auth/login`);
        console.log('📦 Données envoyées:', { email, password: '***' });
        
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur response:', errorText);
            throw new Error(`Erreur de connexion: ${response.status}`);
        }

        const data = await response.json();
        console.log('📨 Data reçue:', data);
        
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        console.log('💾 Token stocké:', authToken ? 'OUI' : 'NON');
        
        return data;
    },

    // Vérification du token
    async verifyToken() {
        if (!authToken) {
            console.log('Aucun token trouvé');
            return false;
        }

        try {
            const response = await fetch(`${API_BASE}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                state.user = data.user;
                return true;
            } else {
                console.log('Token invalide, suppression...');
                localStorage.removeItem('authToken');
                authToken = null;
                return false;
            }
        } catch (error) {
            console.log('Erreur vérification token:', error);
            localStorage.removeItem('authToken');
            authToken = null;
            return false;
        }
    },

    // Headers avec authentification
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        return headers;
    },

    // Articles
    async getArticles(params = {}) {
        const url = new URL(`${API_BASE}/articles`);
        Object.keys(params).forEach(key => {
            if (params[key]) url.searchParams.append(key, params[key]);
        });

        console.log('📄 Chargement des articles:', url.toString());
        const response = await fetch(url, {
            headers: this.getHeaders()
        });

        console.log('📄 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur articles:', errorText);
            throw new Error('Erreur lors du chargement des articles');
        }

        const data = await response.json();
        console.log('📄 Articles data:', data);
        
        // L'API retourne {success: true, data: {...}}
        if (data.success && data.data) {
            return data.data;
        } else if (data.articles && data.pagination) {
            // Format direct avec articles et pagination
            return data;
        } else {
            console.error('❌ Format inattendu pour les articles:', data);
            return {
                articles: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    total: 0
                }
            };
        }
    },

    async getArticle(id) {
        const response = await fetch(`${API_BASE}/articles/id/${id}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Article non trouvé');
        }

        return response.json();
    },

    async createArticle(articleData) {
        const response = await fetch(`${API_BASE}/articles`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(articleData)
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la création de l\'article');
        }

        return response.json();
    },

    async updateArticle(id, articleData) {
        const response = await fetch(`${API_BASE}/articles/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(articleData)
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la mise à jour de l\'article');
        }

        return response.json();
    },

    async deleteArticle(id) {
        const response = await fetch(`${API_BASE}/articles/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la suppression de l\'article');
        }

        return response.json();
    },

    // Catégories
    async getCategories() {
        console.log('📋 Chargement des catégories...');
        const response = await fetch(`${API_BASE}/categories`, {
            headers: this.getHeaders()
        });

        console.log('📋 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur categories:', errorText);
            throw new Error('Erreur lors du chargement des catégories');
        }

        const data = await response.json();
        console.log('📋 Categories data:', data);
        
        // L'API retourne {success: true, data: [...]}
        if (data.success && data.data) {
            return data.data;
        } else if (Array.isArray(data)) {
            return data;
        } else {
            console.error('❌ Format inattendu pour les catégories:', data);
            return [];
        }
    },

    async createCategory(categoryData) {
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(categoryData)
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la création de la catégorie');
        }

        return response.json();
    },

    async updateCategory(id, categoryData) {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(categoryData)
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la mise à jour de la catégorie');
        }

        return response.json();
    },

    async deleteCategory(id) {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la suppression de la catégorie');
        }

        return response.json();
    },

    // Upload d'images
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Erreur lors de l\'upload de l\'image');
        }

        return response.json();
    },

    // Statistiques
    async getDashboardStats() {
        console.log('📊 Chargement des statistiques...');
        const response = await fetch(`${API_BASE}/articles/stats/dashboard`, {
            headers: this.getHeaders()
        });

        console.log('📊 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur stats:', errorText);
            throw new Error('Erreur lors du chargement des statistiques');
        }

        const data = await response.json();
        console.log('📊 Stats data:', data);
        
        // L'API retourne {success: true, data: {...}}
        if (data.success && data.data) {
            return data.data;
        } else if (data.totalArticles !== undefined) {
            // Format direct avec les propriétés
            return data;
        } else {
            console.error('❌ Format inattendu pour les stats:', data);
            return {
                totalArticles: 0,
                totalViews: 0,
                publishedArticles: 0,
                draftArticles: 0
            };
        }
    },

    async getDetailedStats(period = 30) {
        try {
            console.log('📊 Chargement des statistiques détaillées...');
            const response = await fetch(`${API_BASE}/articles/stats/detailed?period=${period}`, {
                headers: this.getHeaders()
            });

            console.log('📊 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erreur stats détaillées:', errorText);
                throw new Error('Erreur lors du chargement des statistiques détaillées');
            }

            const data = await response.json();
            console.log('📊 Statistiques détaillées:', data);
            
            // L'API retourne {success: true, data: {...}}
            if (data.success && data.data) {
                return data.data;
            } else {
                console.error('❌ Format inattendu pour les stats détaillées:', data);
                return {
                    totalArticles: 0,
                    totalViews: 0,
                    avgViewsPerArticle: 0,
                    publishedArticles: 0,
                    avgReadingTime: 0,
                    avgViewsPerDay: 0,
                    publishingFrequency: 0,
                    draftRatio: 0,
                    readingTimeChange: 0,
                    viewsPerDayChange: 0,
                    publishingFrequencyChange: 0,
                    draftRatioChange: 0,
                    avgWordCount: 0,
                    mostActiveCategory: '',
                    popularTags: [],
                    topArticles: [],
                    recentActivity: []
                };
            }
        } catch (error) {
            console.error('❌ Erreur statistiques détaillées:', error);
            throw error;
        }
    }
};

// UI Components
const ui = {
    // Affichage des notifications
    showToast(message, type = 'info', title = '') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="toast-icon ${icons[type]}"></i>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Animation d'entrée
        setTimeout(() => toast.classList.add('show'), 100);

        // Suppression automatique
        setTimeout(() => {
            if (toast.parentNode === container) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode === container) {
                        container.removeChild(toast);
                    }
                }, 300);
            }
        }, 5000);

        // Bouton de fermeture
        toast.querySelector('.toast-close').addEventListener('click', () => {
            if (toast.parentNode === container) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode === container) {
                        container.removeChild(toast);
                    }
                }, 300);
            }
        });
    },

    // Affichage/masquage du loading
    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
        state.loading = true;
    },

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
        state.loading = false;
    },

    // Affichage/masquage des modales
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    // Navigation entre les pages
    showPage(pageId) {
        // Masquer toutes les pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Afficher la page demandée
        document.getElementById(`${pageId}-page`).classList.add('active');

        // Mettre à jour la navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

        // Mettre à jour le titre
        const titles = {
            dashboard: 'Dashboard',
            articles: 'Gestion des Articles',
            'new-article': 'Nouvel Article',
            categories: 'Gestion des Catégories',
            statistics: 'Statistiques Détaillées',
            media: 'Médiathèque'
        };
        document.getElementById('pageTitle').textContent = titles[pageId] || pageId;

        state.currentPage = pageId;

        // Charger les données si nécessaire
        this.loadPageData(pageId);
    },

    async loadPageData(pageId) {
        try {
            switch (pageId) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'articles':
                    await this.loadArticles();
                    break;
                case 'categories':
                    await this.loadCategories();
                    break;
                case 'statistics':
                    await this.loadStatistics();
                    break;
                case 'media':
                    await this.loadMedia();
                    break;
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    // Chargement du dashboard
    async loadDashboard() {
        try {
            const stats = await api.getDashboardStats();
            console.log('📊 Stats reçues:', stats);
            
            // Vérifier que les stats ont le bon format
            const safeStats = {
                totalArticles: stats.totalArticles || 0,
                totalViews: stats.totalViews || 0,
                publishedArticles: stats.publishedArticles || 0,
                draftArticles: stats.draftArticles || 0
            };
            
            // Mise à jour des statistiques
            document.getElementById('totalArticles').textContent = utils.formatNumber(safeStats.totalArticles);
            document.getElementById('totalViews').textContent = utils.formatNumber(safeStats.totalViews);
            document.getElementById('publishedArticles').textContent = utils.formatNumber(safeStats.publishedArticles);
            document.getElementById('draftArticles').textContent = utils.formatNumber(safeStats.draftArticles);
            
            // Mise à jour du badge dans la sidebar
            document.getElementById('articleCount').textContent = safeStats.totalArticles;

            // Chargement des articles récents
            const recentResponse = await api.getArticles({ limit: 5, sort: 'created_at', order: 'desc' });
            console.log('📄 Articles récents:', recentResponse);
            this.renderRecentArticles(recentResponse.articles || []);

            // Chargement des articles populaires
            const popularResponse = await api.getArticles({ limit: 5, sort: 'views', order: 'desc' });
            console.log('📄 Articles populaires:', popularResponse);
            this.renderPopularArticles(popularResponse.articles || []);

        } catch (error) {
            console.error('❌ Erreur chargement dashboard:', error);
            this.showToast('Erreur lors du chargement du dashboard: ' + error.message, 'error');
        }
    },

    renderRecentArticles(articles) {
        const container = document.getElementById('recentArticlesList');
        
        if (articles.length === 0) {
            container.innerHTML = '<div class="text-muted">Aucun article récent</div>';
            return;
        }

        container.innerHTML = articles.map(article => `
            <div class="article-item" data-article-id="${article.id}">
                <div class="article-thumbnail">
                    ${article.featured_image ? 
                        `<img src="${article.featured_image}" alt="${article.title}">` : 
                        '<i class="fas fa-image"></i>'
                    }
                </div>
                <div class="article-info">
                    <div class="article-title">${article.title}</div>
                    <div class="article-meta">${utils.formatDate(article.created_at)}</div>
                </div>
                <div class="article-views">
                    <i class="fas fa-eye"></i>
                    ${utils.formatNumber(article.views)}
                </div>
            </div>
        `).join('');
        
        // Ajouter les event listeners
        container.querySelectorAll('.article-item[data-article-id]').forEach(item => {
            item.addEventListener('click', () => {
                const articleId = parseInt(item.dataset.articleId);
                ui.editArticle(articleId);
            });
        });
    },

    renderPopularArticles(articles) {
        const container = document.getElementById('popularArticlesList');
        
        if (articles.length === 0) {
            container.innerHTML = '<div class="text-muted">Aucun article populaire</div>';
            return;
        }

        container.innerHTML = articles.map(article => `
            <div class="article-item" data-article-id="${article.id}">
                <div class="article-thumbnail">
                    ${article.featured_image ? 
                        `<img src="${article.featured_image}" alt="${article.title}">` : 
                        '<i class="fas fa-image"></i>'
                    }
                </div>
                <div class="article-info">
                    <div class="article-title">${article.title}</div>
                    <div class="article-meta">${utils.formatDate(article.created_at)}</div>
                </div>
                <div class="article-views">
                    <i class="fas fa-eye"></i>
                    ${utils.formatNumber(article.views)}
                </div>
            </div>
        `).join('');
        
        // Ajouter les event listeners
        container.querySelectorAll('.article-item[data-article-id]').forEach(item => {
            item.addEventListener('click', () => {
                const articleId = parseInt(item.dataset.articleId);
                ui.editArticle(articleId);
            });
        });
    },

    // Chargement des articles
    async loadArticles(params = {}) {
        try {
            const response = await api.getArticles({
                page: 1,
                limit: 10,
                ...params
            });

            state.articles = response.articles;
            this.renderArticlesTable(response);
            this.renderPagination(response.pagination, 'articlesPagination');

        } catch (error) {
            this.showToast('Erreur lors du chargement des articles', 'error');
        }
    },

    renderArticlesTable(response) {
        const container = document.getElementById('articlesTable');
        const articles = response.articles;

        if (articles.length === 0) {
            container.innerHTML = '<div class="no-data">Aucun article trouvé</div>';
            return;
        }

        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Titre</th>
                        <th>Catégorie</th>
                        <th>Statut</th>
                        <th>Vues</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${articles.map(article => `
                        <tr>
                            <td>
                                <strong>${article.title}</strong>
                                ${article.excerpt ? `<br><small class="text-muted">${article.excerpt.substring(0, 100)}...</small>` : ''}
                            </td>
                            <td>
                                ${article.category_name ? 
                                    `<span class="category-badge" style="background-color: ${article.category_color || '#007bff'}20; color: ${article.category_color || '#007bff'}">${article.category_name}</span>` : 
                                    '-'
                                }
                            </td>
                            <td>
                                <span class="status-badge ${article.status}">
                                    ${article.status === 'published' ? 'Publié' : 'Brouillon'}
                                </span>
                            </td>
                            <td>${utils.formatNumber(article.views)}</td>
                            <td>${utils.formatDate(article.created_at)}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="table-action edit" data-action="edit" data-article-id="${article.id}" title="Modifier">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="table-action delete" data-action="delete" data-article-id="${article.id}" title="Supprimer">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        // Ajouter les event listeners pour les actions
        container.querySelectorAll('.table-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                const articleId = parseInt(btn.dataset.articleId);
                
                if (action === 'edit') {
                    ui.editArticle(articleId);
                } else if (action === 'delete') {
                    ui.deleteArticle(articleId);
                }
            });
        });
    },

    renderPagination(pagination, containerId) {
        const container = document.getElementById(containerId);
        const { currentPage, totalPages, total } = pagination;

        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        const startItem = (currentPage - 1) * 10 + 1;
        const endItem = Math.min(currentPage * 10, total);

        container.innerHTML = `
            <div class="pagination-info">
                Affichage de ${startItem} à ${endItem} sur ${total} résultats
            </div>
            <div class="pagination-buttons">
                <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </button>
                ${this.renderPageNumbers(currentPage, totalPages)}
                <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
        
        // Ajouter les event listeners pour la pagination
        container.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page) {
                    ui.changePage(page);
                }
            });
        });
    },

    renderPageNumbers(currentPage, totalPages) {
        let pages = [];
        const maxVisible = 5;
        
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(`
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `);
        }

        return pages.join('');
    },

    changePage(page) {
        const params = this.getArticleFilters();
        params.page = page;
        this.loadArticles(params);
    },

    getArticleFilters() {
        return {
            status: document.getElementById('statusFilter').value,
            category: document.getElementById('categoryFilter').value,
            search: document.getElementById('searchArticles').value
        };
    },

    // Gestion des articles
    async editArticle(id) {
        try {
            this.showLoading();
            const response = await api.getArticle(id);
            console.log('🔧 Article data received:', response);
            
            // L'API retourne {success: true, data: {...}}
            const article = response.success ? response.data : response;
            this.populateArticleForm(article);
            this.showPage('new-article');
            document.getElementById('articleFormTitle').textContent = 'Modifier l\'Article';
        } catch (error) {
            console.error('❌ Erreur chargement article:', error);
            this.showToast('Erreur lors du chargement de l\'article', 'error');
        } finally {
            this.hideLoading();
        }
    },

    async deleteArticle(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
            return;
        }

        try {
            this.showLoading();
            await api.deleteArticle(id);
            this.showToast('Article supprimé avec succès', 'success');
            this.loadArticles();
        } catch (error) {
            this.showToast('Erreur lors de la suppression', 'error');
        } finally {
            this.hideLoading();
        }
    },

    populateArticleForm(article) {
        console.log('📝 Populating form with article:', article);
        
        document.getElementById('articleId').value = article.id;
        document.getElementById('articleTitle').value = article.title;
        document.getElementById('articleSlug').value = article.slug;
        document.getElementById('articleExcerpt').value = article.excerpt || '';
        document.getElementById('articleCategory').value = article.category_id || '';
        document.getElementById('articleTags').value = article.tags || '';
        document.getElementById('articleContent').innerHTML = article.content;
        document.getElementById('metaTitle').value = article.meta_title || '';
        document.getElementById('metaDescription').value = article.meta_description || '';

        // Image à la une
        if (article.image_url || article.featured_image) {
            document.getElementById('imagePreview').style.display = 'block';
            // Utiliser image_url (chemin complet) si disponible, sinon construire le chemin
            document.getElementById('previewImg').src = article.image_url || `/uploads/${article.featured_image}`;
            document.querySelector('.upload-placeholder').style.display = 'none';
        }

        console.log('📝 Article ID set to:', document.getElementById('articleId').value);
        state.currentArticle = article;
    },

    resetArticleForm() {
        document.getElementById('articleForm').reset();
        document.getElementById('articleId').value = '';
        document.getElementById('articleContent').innerHTML = 'Écrivez votre article ici...';
        document.getElementById('imagePreview').style.display = 'none';
        document.querySelector('.upload-placeholder').style.display = 'block';
        document.getElementById('articleFormTitle').textContent = 'Nouvel Article';
        state.currentArticle = null;
    },

    // Chargement des catégories
    async loadCategories() {
        try {
            const categories = await api.getCategories();
            console.log('📋 Categories reçues:', categories);
            
            if (!Array.isArray(categories)) {
                throw new Error('Format de catégories invalide');
            }
            
            state.categories = categories;
            this.renderCategoriesGrid(categories);
            this.populateCategoryFilters(categories);
            this.populateArticleCategorySelect(categories);
        } catch (error) {
            console.error('❌ Erreur chargement catégories:', error);
            this.showToast('Erreur lors du chargement des catégories: ' + error.message, 'error');
        }
    },

    renderCategoriesGrid(categories) {
        const container = document.getElementById('categoriesGrid');

        if (categories.length === 0) {
            container.innerHTML = '<div class="no-data">Aucune catégorie trouvée</div>';
            return;
        }

        container.innerHTML = categories.map(category => `
            <div class="category-card">
                <div class="category-header">
                    <div class="category-color" style="background-color: ${category.color}"></div>
                    <div class="category-actions">
                        <button class="table-action edit" data-action="edit" data-category-id="${category.id}" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="table-action delete" data-action="delete" data-category-id="${category.id}" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="category-name">${category.name}</div>
                <div class="category-description">${category.description || 'Aucune description'}</div>
                <div class="category-stats">${category.article_count || 0} article(s)</div>
            </div>
        `).join('');
        
        // Ajouter les event listeners pour les actions des catégories
        container.querySelectorAll('.table-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                const categoryId = parseInt(btn.dataset.categoryId);
                
                if (action === 'edit') {
                    ui.editCategory(categoryId);
                } else if (action === 'delete') {
                    ui.deleteCategory(categoryId);
                }
            });
        });
    },

    populateCategoryFilters(categories) {
        const select = document.getElementById('categoryFilter');
        select.innerHTML = '<option value="">Toutes les catégories</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    },

    populateArticleCategorySelect(categories) {
        const select = document.getElementById('articleCategory');
        select.innerHTML = '<option value="">Sélectionner une catégorie</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    },

    // Gestion des catégories
    editCategory(id) {
        const category = state.categories.find(cat => cat.id === id);
        if (category) {
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryDescription').value = category.description || '';
            document.getElementById('categoryColor').value = category.color;
            document.getElementById('categoryModalTitle').textContent = 'Modifier la Catégorie';
            this.showModal('categoryModal');
        }
    },

    async deleteCategory(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
            return;
        }

        try {
            this.showLoading();
            await api.deleteCategory(id);
            this.showToast('Catégorie supprimée avec succès', 'success');
            this.loadCategories();
        } catch (error) {
            this.showToast('Erreur lors de la suppression', 'error');
        } finally {
            this.hideLoading();
        }
    },

    // Placeholder pour les médias
    async loadMedia() {
        const container = document.getElementById('mediaGrid');
        container.innerHTML = '<div class="no-data">Fonctionnalité en cours de développement</div>';
    },

    // Gestion des statistiques
    async loadStatistics() {
        try {
            this.showLoading();
            const stats = await api.getDetailedStats();
            this.renderStatistics(stats);
        } catch (error) {
            console.error('❌ Erreur chargement statistiques:', error);
            this.showToast('Erreur lors du chargement des statistiques', 'error');
        } finally {
            this.hideLoading();
        }
    },

    renderStatistics(stats) {
        console.log('📊 Rendering statistics:', stats);
        
        // Vue d'ensemble
        document.getElementById('statsTotal').textContent = stats.totalArticles || 0;
        document.getElementById('statsViews').textContent = utils.formatNumber(stats.totalViews || 0);
        document.getElementById('statsAvgViews').textContent = Math.round(stats.avgViewsPerArticle || 0);
        document.getElementById('statsPublished').textContent = stats.publishedArticles || 0;

        // Métriques de performance
        document.getElementById('avgReadingTime').textContent = `${stats.avgReadingTime || 0} min`;
        document.getElementById('avgViewsPerDay').textContent = Math.round(stats.avgViewsPerDay || 0);
        document.getElementById('publishingFrequency').textContent = `${stats.publishingFrequency || 0}/semaine`;
        document.getElementById('draftRatio').textContent = `${Math.round(stats.draftRatio || 0)}%`;

        // Changements en pourcentage
        this.updateMetricChange('readingTimeChange', stats.readingTimeChange || 0);
        this.updateMetricChange('viewsPerDayChange', stats.viewsPerDayChange || 0);
        this.updateMetricChange('publishingFrequencyChange', stats.publishingFrequencyChange || 0);
        this.updateMetricChange('draftRatioChange', stats.draftRatioChange || 0);

        // Analyse du contenu
        document.getElementById('avgWordCount').textContent = `${stats.avgWordCount || 0} mots`;
        document.getElementById('mostActiveCategory').textContent = stats.mostActiveCategory || '-';

        // Tags populaires
        this.renderPopularTags(stats.popularTags || []);

        // Top articles
        this.renderTopArticles(stats.topArticles || []);

        // Timeline d'activité
        this.renderActivityTimeline(stats.recentActivity || []);

        // Initialiser les graphiques (placeholder)
        this.initializeCharts(stats);
    },

    updateMetricChange(elementId, value) {
        const element = document.getElementById(elementId);
        const isPositive = value >= 0;
        element.textContent = `${isPositive ? '+' : ''}${value}%`;
        element.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
    },

    renderPopularTags(tags) {
        const container = document.getElementById('popularTags');
        if (tags.length === 0) {
            container.innerHTML = '<span class="analysis-value">Aucun tag</span>';
            return;
        }

        container.innerHTML = tags.map(tag => 
            `<span class="tag-item">${tag.name} (${tag.count})</span>`
        ).join('');
    },

    renderTopArticles(articles) {
        const container = document.getElementById('topArticlesList');
        
        if (articles.length === 0) {
            container.innerHTML = '<div class="no-data">Aucune donnée de vues disponible</div>';
            return;
        }

        container.innerHTML = articles.map(article => `
            <div class="top-article-item">
                <div class="top-article-info">
                    <div class="top-article-title">${article.title}</div>
                    <div class="top-article-meta">
                        ${utils.formatDate(article.created_at)} • ${article.category_name || 'Sans catégorie'}
                    </div>
                </div>
                <div class="top-article-views">${utils.formatNumber(article.views || 0)} vues</div>
            </div>
        `).join('');
    },

    renderActivityTimeline(activities) {
        const container = document.getElementById('activityTimeline');
        
        if (activities.length === 0) {
            container.innerHTML = '<div class="no-data">Aucune activité récente</div>';
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.description}</div>
                    <div class="activity-time">${utils.formatDate(activity.created_at)}</div>
                </div>
            </div>
        `).join('');
    },

    getActivityIcon(type) {
        const icons = {
            'create': 'plus',
            'update': 'edit',
            'delete': 'trash',
            'publish': 'globe'
        };
        return icons[type] || 'circle';
    },

    initializeCharts(stats) {
        // Placeholder pour les graphiques
        const chartContainers = ['viewsChart', 'categoryChart', 'publishingChart'];
        
        chartContainers.forEach(id => {
            const container = document.getElementById(id).parentElement;
            container.innerHTML = `
                <div style="height: 300px; display: flex; align-items: center; justify-content: center; color: var(--text-muted);">
                    <div style="text-align: center;">
                        <i class="fas fa-chart-line" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                        <div>Graphique en cours de développement</div>
                        <div style="font-size: 0.875rem; margin-top: 0.5rem;">Les données seront affichées prochainement</div>
                    </div>
                </div>
            `;
        });
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM chargé, initialisation...');
    
    // Vérification de l'authentification
    const isAuthenticated = await api.verifyToken();
    console.log('🔐 Authentifié:', isAuthenticated);
    
    if (!isAuthenticated) {
        // Masquer le contenu principal et afficher la modal de connexion
        console.log('❌ Non authentifié, affichage modal');
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('sidebar').style.display = 'none';
        ui.showModal('loginModal');
    } else {
        // Afficher l'interface si authentifié
        console.log('✅ Authentifié, affichage interface');
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('sidebar').style.display = 'block';
        
        // S'assurer que la modal est bien fermée
        ui.hideModal('loginModal');
        
        // Mettre à jour les infos utilisateur
        if (state.user) {
            document.getElementById('userName').textContent = state.user.name || 'Admin';
        }
        
        // Initialisation de l'interface
        ui.showPage('dashboard');
        ui.loadCategories();
    }

    // IMPORTANT: Initialiser les event listeners même si non authentifié
    initializeEventListeners();
});

// Fonction pour initialiser tous les event listeners
function initializeEventListeners() {
    console.log('🎯 Initialisation des event listeners...');

    // Navigation
    document.querySelectorAll('[data-page]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.getAttribute('data-page');
            ui.showPage(page);
        });
    });

    // Sidebar toggle (mobile)
    document.getElementById('mobileToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // Connexion
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('🔑 Tentative de connexion...');
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        console.log('📧 Email:', email);

        try {
            ui.showLoading();
            console.log('📡 Appel API login...');
            const result = await api.login(email, password);
            console.log('✅ Résultat login:', result);
            
            // Stocker les informations utilisateur
            state.user = result.user;
            console.log('👤 Utilisateur stocké:', state.user);
            
            ui.hideModal('loginModal');
            console.log('❌ Modal fermée');
            
            // Afficher l'interface
            document.getElementById('mainContent').style.display = 'block';
            document.getElementById('sidebar').style.display = 'block';
            console.log('🖥️ Interface affichée');
            
            ui.showToast('Connexion réussie', 'success');
            ui.showPage('dashboard');
            ui.loadCategories();
            
            // Mettre à jour l'interface utilisateur
            document.getElementById('userName').textContent = result.user.name || 'Admin';
            
        } catch (error) {
            console.error('❌ Erreur de connexion:', error);
            ui.showToast('Erreur de connexion: ' + error.message, 'error');
        } finally {
            ui.hideLoading();
        }
    });

    // Déconnexion
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('authToken');
        authToken = null;
        state.user = null;
        
        // Masquer l'interface et afficher la modal de connexion
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('sidebar').style.display = 'none';
        ui.showModal('loginModal');
        ui.showToast('Vous êtes déconnecté', 'info');
    });

    // Filtres articles
    ['statusFilter', 'categoryFilter', 'searchArticles'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            ui.loadArticles(ui.getArticleFilters());
        });
    });

    // Recherche articles (avec debounce)
    let searchTimeout;
    document.getElementById('searchArticles').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            ui.loadArticles(ui.getArticleFilters());
        }, 500);
    });

    // Gestion du titre d'article
    document.getElementById('articleTitle').addEventListener('input', (e) => {
        const title = e.target.value;
        const slugField = document.getElementById('articleSlug');
        if (!slugField.value || slugField.dataset.auto !== 'false') {
            slugField.value = utils.generateSlug(title);
            slugField.dataset.auto = 'true';
        }
    });

    // Slug manuel
    document.getElementById('articleSlug').addEventListener('input', (e) => {
        e.target.dataset.auto = 'false';
    });

    // Upload d'image
    document.getElementById('featuredImage').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            ui.showLoading();
            const result = await api.uploadImage(file);
            
            // Affichage de la prévisualisation
            document.getElementById('imagePreview').style.display = 'block';
            document.getElementById('previewImg').src = result.url;
            document.querySelector('.upload-placeholder').style.display = 'none';
            
            ui.showToast('Image uploadée avec succès', 'success');
        } catch (error) {
            ui.showToast('Erreur lors de l\'upload', 'error');
        } finally {
            ui.hideLoading();
        }
    });

    // Suppression d'image
    document.getElementById('removeImage').addEventListener('click', () => {
        document.getElementById('featuredImage').value = '';
        document.getElementById('imagePreview').style.display = 'none';
        document.querySelector('.upload-placeholder').style.display = 'block';
    });

    // Editeur de contenu simple
    document.querySelectorAll('.editor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            document.execCommand(action, false, null);
            btn.classList.toggle('active');
        });
    });

    // Sélecteur de niveau de titre
    const headingSelect = document.getElementById('headingSelect');
    if (headingSelect) {
        headingSelect.addEventListener('change', () => {
            const selectedValue = headingSelect.value;
            if (selectedValue) {
                // Formatage du texte sélectionné ou nouvelle ligne avec le niveau choisi
                if (selectedValue === 'p') {
                    document.execCommand('formatBlock', false, '<p>');
                } else {
                    document.execCommand('formatBlock', false, `<${selectedValue}>`);
                }
                
                // Remettre le sélecteur à sa valeur par défaut
                setTimeout(() => {
                    headingSelect.value = '';
                }, 100);
            }
        });
    }

    // Compteurs de caractères
    ['metaTitle', 'metaDescription'].forEach(id => {
        const field = document.getElementById(id);
        const counter = field.nextElementSibling;
        
        field.addEventListener('input', () => {
            const length = field.value.length;
            const max = field.getAttribute('maxlength');
            counter.textContent = `${length}/${max} caractères`;
            
            if (length > max * 0.9) {
                counter.style.color = 'var(--warning-color)';
            } else {
                counter.style.color = 'var(--text-muted)';
            }
        });
    });

    // Sauvegarde d'article
    document.getElementById('saveAsDraft').addEventListener('click', () => {
        saveArticle('draft');
    });

    document.getElementById('publishArticle').addEventListener('click', () => {
        saveArticle('published');
    });

    async function saveArticle(status) {
        // Extraire le nom de fichier de l'URL de l'image
        let featuredImage = null;
        const previewImg = document.getElementById('previewImg');
        if (previewImg && previewImg.src && previewImg.src.includes('/uploads/')) {
            // Extraire juste le nom de fichier de l'URL
            featuredImage = previewImg.src.split('/uploads/').pop();
        }

        const formData = {
            title: document.getElementById('articleTitle').value,
            slug: document.getElementById('articleSlug').value,
            excerpt: document.getElementById('articleExcerpt').value,
            content: document.getElementById('articleContent').innerHTML,
            category_id: document.getElementById('articleCategory').value || null,
            tags: document.getElementById('articleTags').value,
            meta_title: document.getElementById('metaTitle').value,
            meta_description: document.getElementById('metaDescription').value,
            status: status,
            featured_image: featuredImage
        };

        // Validation
        if (!formData.title.trim()) {
            ui.showToast('Le titre est requis', 'error');
            return;
        }

        if (!formData.content.trim() || formData.content === 'Écrivez votre article ici...') {
            ui.showToast('Le contenu est requis', 'error');
            return;
        }

        try {
            ui.showLoading();
            
            const articleId = document.getElementById('articleId').value;
            console.log('💾 Saving article - ID:', articleId, 'Type:', typeof articleId);
            let result;

            if (articleId && articleId !== '') {
                console.log('🔄 Updating existing article with ID:', articleId);
                result = await api.updateArticle(articleId, formData);
                ui.showToast('Article mis à jour avec succès', 'success');
            } else {
                console.log('✨ Creating new article');
                result = await api.createArticle(formData);
                ui.showToast('Article créé avec succès', 'success');
            }

            // Redirection vers la liste des articles
            setTimeout(() => {
                ui.resetArticleForm();
                ui.showPage('articles');
            }, 1000);

        } catch (error) {
            ui.showToast(error.message, 'error');
        } finally {
            ui.hideLoading();
        }
    }

    // Gestion des catégories
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryModalTitle').textContent = 'Nouvelle Catégorie';
        ui.showModal('categoryModal');
    });

    document.getElementById('closeCategoryModal').addEventListener('click', () => {
        ui.hideModal('categoryModal');
    });

    document.getElementById('cancelCategory').addEventListener('click', () => {
        ui.hideModal('categoryModal');
    });

    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDescription').value,
            color: document.getElementById('categoryColor').value
        };

        try {
            ui.showLoading();
            
            const categoryId = document.getElementById('categoryId').value;
            
            if (categoryId) {
                await api.updateCategory(categoryId, formData);
                ui.showToast('Catégorie mise à jour avec succès', 'success');
            } else {
                await api.createCategory(formData);
                ui.showToast('Catégorie créée avec succès', 'success');
            }

            ui.hideModal('categoryModal');
            ui.loadCategories();

        } catch (error) {
            ui.showToast(error.message, 'error');
        } finally {
            ui.hideLoading();
        }
    });

    // Gestion des statistiques
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            // Retirer la classe active de tous les boutons
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            // Ajouter la classe active au bouton cliqué
            btn.classList.add('active');
            
            const period = parseInt(btn.dataset.period);
            try {
                ui.showLoading();
                const stats = await api.getDetailedStats(period);
                ui.renderStatistics(stats);
            } catch (error) {
                ui.showToast('Erreur lors du chargement des statistiques', 'error');
            } finally {
                ui.hideLoading();
            }
        });
    });

    // Bouton actualiser statistiques
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', () => {
            if (state.currentPage === 'statistics') {
                ui.loadStatistics();
                ui.showToast('Statistiques actualisées', 'info');
            }
        });
    }

    // Bouton exporter statistiques (placeholder)
    const exportStatsBtn = document.getElementById('exportStatsBtn');
    if (exportStatsBtn) {
        exportStatsBtn.addEventListener('click', () => {
            ui.showToast('Fonctionnalité d\'export en cours de développement', 'info');
        });
    }

    // Rafraîchissement
    document.getElementById('refreshBtn').addEventListener('click', () => {
        ui.loadPageData(state.currentPage);
        ui.showToast('Données actualisées', 'info');
    });

    // Fermeture des modales en cliquant à l'extérieur
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}; 