// ==================== CONFIGURATION ====================
const CONFIG = {
    particles: {
        count: window.innerWidth < 768 ? 30 : 80, // Moins de particules sur mobile
        speed: window.innerWidth < 768 ? 0.3 : 0.5,
        colors: ['#4FFFB0', '#8b5cf6', '#ec4899', '#10b981', '#6366f1'],
        sizes: window.innerWidth < 768 ? [1, 2] : [1, 2, 3]
    },
    waves: {
        count: window.innerWidth < 768 ? 2 : 3,
        speed: 0.02,
        amplitude: window.innerWidth < 768 ? 20 : 30
    }
};

// ==================== BACKGROUND ANIMÉ ====================
class AnimatedBackground {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.waves = [];
        this.mouse = { x: 0, y: 0 };
        this.init();
    }

    init() {
        this.createCanvas();
        this.createParticles();
        this.createWaves();
        this.bindEvents();
        this.animate();
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'animated-bg';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            pointer-events: none;
        `;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
    }

    createParticles() {
        for (let i = 0; i < CONFIG.particles.count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * CONFIG.particles.speed,
                vy: (Math.random() - 0.5) * CONFIG.particles.speed,
                size: CONFIG.particles.sizes[Math.floor(Math.random() * CONFIG.particles.sizes.length)],
                color: CONFIG.particles.colors[Math.floor(Math.random() * CONFIG.particles.colors.length)],
                opacity: Math.random() * 0.5 + 0.2,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }

    createWaves() {
        for (let i = 0; i < CONFIG.waves.count; i++) {
            this.waves.push({
                y: this.canvas.height * 0.3 + i * 100,
                amplitude: CONFIG.waves.amplitude + i * 10,
                frequency: 0.01 + i * 0.005,
                phase: i * Math.PI / 3,
                speed: CONFIG.waves.speed + i * 0.01,
                color: CONFIG.particles.colors[i % CONFIG.particles.colors.length],
                opacity: 0.1 - i * 0.02
            });
        }
    }

    updateParticles() {
        this.particles.forEach(particle => {
            // Mouvement
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Rebond sur les bords
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;

            // Effet de pulsation
            particle.pulse += 0.02;
            particle.currentOpacity = particle.opacity + Math.sin(particle.pulse) * 0.2;

            // Attraction vers la souris
            const dx = this.mouse.x - particle.x;
            const dy = this.mouse.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 150) {
                const force = (150 - distance) / 150;
                particle.vx += dx * force * 0.0001;
                particle.vy += dy * force * 0.0001;
            }
        });
    }

    updateWaves() {
        this.waves.forEach(wave => {
            wave.phase += wave.speed;
        });
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, Math.min(1, particle.currentOpacity));
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Effet de glow
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    drawWaves() {
        this.waves.forEach(wave => {
            this.ctx.save();
            this.ctx.globalAlpha = wave.opacity;
            this.ctx.strokeStyle = wave.color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            for (let x = 0; x <= this.canvas.width; x += 5) {
                const y = wave.y + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
            this.ctx.restore();
        });
    }

    drawConnections() {
        this.ctx.save();
        this.particles.forEach((particle, i) => {
            for (let j = i + 1; j < this.particles.length; j++) {
                const other = this.particles[j];
                const dx = particle.x - other.x;
                const dy = particle.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    this.ctx.globalAlpha = (100 - distance) / 100 * 0.2;
                    this.ctx.strokeStyle = particle.color;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(other.x, other.y);
                    this.ctx.stroke();
                }
            }
        });
        this.ctx.restore();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.updateParticles();
        this.updateWaves();
        
        this.drawWaves();
        this.drawConnections();
        this.drawParticles();
        
        requestAnimationFrame(() => this.animate());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            this.updateConfigForDevice();
        });
        
        // Désactiver l'interaction souris sur mobile
        if (!this.isMobile()) {
            window.addEventListener('mousemove', (e) => {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            });
        }
        
        // Support tactile
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                this.mouse.x = e.touches[0].clientX;
                this.mouse.y = e.touches[0].clientY;
            }
        });
    }
    
    isMobile() {
        return window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    updateConfigForDevice() {
        if (this.isMobile()) {
            // Réduire les particules sur mobile
            if (this.particles.length > 30) {
                this.particles = this.particles.slice(0, 30);
            }
            // Réduire les ondes
            if (this.waves.length > 2) {
                this.waves = this.waves.slice(0, 2);
            }
        }
    }
}

// ==================== ANIMATIONS AVANCÉES ====================
class AdvancedAnimations {
    constructor() {
        this.init();
    }

    init() {
        this.setupScrollAnimations();
        this.setupHoverEffects();
        this.setupTypewriter();
        this.setupParallax();
        this.setupGlowEffects();
    }

    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Ajouter les classes d'animation seulement si les éléments existent
        const elementsToAnimate = document.querySelectorAll('.hero-content, .partners, .why-lucca-content, .stat-item, .pricing-card');
        if (elementsToAnimate.length > 0) {
            elementsToAnimate.forEach(el => {
                el.classList.add('animate-on-scroll');
                observer.observe(el);
            });
        }
    }

    setupHoverEffects() {
        const isMobile = window.innerWidth < 768;
        
        // Effet tilt sur les cartes (désactivé sur mobile)
        if (!isMobile) {
            document.querySelectorAll('.partner-logo').forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateX = (y - centerY) / 10;
                    const rotateY = (centerX - x) / 10;
                    
                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
                });
            });
        }

        // Effet de glitch sur le logo
        const logo = document.querySelector('.logo');
        if (logo) {
            const eventType = isMobile ? 'touchstart' : 'mouseenter';
            
            logo.addEventListener(eventType, () => {
                logo.classList.add('glitch-effect');
                setTimeout(() => logo.classList.remove('glitch-effect'), 500);
            });
        }
    }

    setupTypewriter() {
        const heroTitle = document.querySelector('.hero-title');
        if (!heroTitle) return; // Sortir si l'élément n'existe pas
        const text = heroTitle.textContent;
        
        // Créer un conteneur pour l'effet typewriter
        heroTitle.innerHTML = `
            <span class="typewriter-text"></span>
        `;
        
        const textSpan = heroTitle.querySelector('.typewriter-text');
        
        let i = 0;
        let isDeleting = false;
        let currentText = '';
        
        const typeWriter = () => {
            if (!isDeleting && i < text.length) {
                // Écriture
                currentText += text.charAt(i);
                textSpan.textContent = currentText;
                i++;
                setTimeout(typeWriter, 80 + Math.random() * 40); // Vitesse variable pour plus de réalisme
            } else if (!isDeleting && i >= text.length) {
                // Animation terminée
                return;
            }
        };
        
        // Démarrer l'animation après 800ms
        setTimeout(() => {
            typeWriter();
        }, 800);
    }

    setupParallax() {
        const isMobile = window.innerWidth < 768;
        
        // Réduire l'effet parallax sur mobile pour les performances
        if (!isMobile) {
            window.addEventListener('scroll', () => {
                const scrolled = window.pageYOffset;
                const parallaxElements = document.querySelectorAll('.bg-blur');
                
                parallaxElements.forEach((el, index) => {
                    const speed = 0.5 + index * 0.1;
                    el.style.transform = `translateY(${scrolled * speed}px)`;
                });
            });
        } else {
            // Version simplifiée pour mobile
            let ticking = false;
            
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        const scrolled = window.pageYOffset;
                        const parallaxElements = document.querySelectorAll('.bg-blur');
                        
                        parallaxElements.forEach((el, index) => {
                            const speed = 0.2 + index * 0.05; // Vitesse réduite
                            el.style.transform = `translateY(${scrolled * speed}px)`;
                        });
                        
                        ticking = false;
                    });
                    ticking = true;
                }
            });
        }
    }

    setupGlowEffects() {
        // Effet de glow sur les boutons
        document.querySelectorAll('.cta-button, .hero-cta, .pricing-button').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                btn.style.setProperty('--mouse-x', x + 'px');
                btn.style.setProperty('--mouse-y', y + 'px');
            });
        });
        
        // Animation spéciale pour les cartes de pricing
        document.querySelectorAll('.pricing-card').forEach((card, index) => {
            // Délai d'animation basé sur l'index
            card.style.animationDelay = `${index * 0.2}s`;
            
            // Effet de pulsation subtile pour la carte featured
            if (card.classList.contains('pricing-featured')) {
                setInterval(() => {
                    card.style.boxShadow = '0 0 30px rgba(79, 255, 176, 0.3)';
                    setTimeout(() => {
                        card.style.boxShadow = '0 0 15px rgba(79, 255, 176, 0.2)';
                    }, 1000);
                }, 3000);
            }
        });
    }
}

// ==================== MENU MOBILE AVANCÉ ====================
class MobileMenu {
    constructor() {
        this.navToggle = document.querySelector('.nav-toggle');
        this.navList = document.querySelector('.nav-list');
        this.navOverlay = document.querySelector('.nav-overlay');
        this.isOpen = false;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        this.navToggle.addEventListener('click', () => this.toggle());
        
        // Fermer en cliquant sur l'overlay
        this.navOverlay.addEventListener('click', () => this.close());
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => this.close());
        });
        
        document.addEventListener('click', (e) => {
            if (!this.navToggle.contains(e.target) && !this.navList.contains(e.target)) {
                this.close();
            }
        });
        
        // Fermer avec la touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.isOpen = true;
        this.navList.classList.add('active');
        this.navToggle.classList.add('active');
        this.navOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Animation des liens
        document.querySelectorAll('.nav-link').forEach((link, index) => {
            link.style.transitionDelay = `${index * 0.1}s`;
        });
    }

    close() {
        this.isOpen = false;
        this.navList.classList.remove('active');
        this.navToggle.classList.remove('active');
        this.navOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ==================== HEADER DYNAMIQUE ====================
class DynamicHeader {
    constructor() {
        this.header = document.querySelector('.header');
        this.lastScroll = 0;
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => this.handleScroll());
    }

    handleScroll() {
        const currentScroll = window.pageYOffset;
        
        // Changement de style selon le scroll
        if (currentScroll > 100) {
            this.header.classList.add('scrolled');
        } else {
            this.header.classList.remove('scrolled');
        }
        
        // Masquer/afficher selon la direction
        if (currentScroll > this.lastScroll && currentScroll > 200) {
            this.header.classList.add('hidden');
        } else {
            this.header.classList.remove('hidden');
        }
        
        this.lastScroll = currentScroll;
    }
}

// ==================== PORTFOLIO CAROUSEL ====================
class PortfolioCarousel {
    constructor() {
        this.carousel = document.querySelector('.portfolio-carousel');
        this.track = document.querySelector('.portfolio-track');
        this.slides = document.querySelectorAll('.portfolio-slide');
        this.indicators = document.querySelectorAll('.portfolio-indicator');
        this.prevBtn = document.querySelector('.portfolio-prev');
        this.nextBtn = document.querySelector('.portfolio-next');
        
        this.currentSlide = 0;
        this.totalSlides = this.slides.length;
        this.autoplayInterval = null;
        this.autoplayDelay = 5000; // 5 secondes
        
        if (this.carousel) {
            this.init();
        }
    }
    
    init() {
        this.bindEvents();
        // this.startAutoplay(); // Désactivé à cause du GIF animé
        this.updateIndicators();
    }
    
    bindEvents() {
        // Navigation buttons
        this.prevBtn?.addEventListener('click', () => this.previousSlide());
        this.nextBtn?.addEventListener('click', () => this.nextSlide());
        
        // Indicators
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });
        
        // Autoplay désactivé
        // this.carousel.addEventListener('mouseenter', () => this.stopAutoplay());
        // this.carousel.addEventListener('mouseleave', () => this.startAutoplay());
        
        // Touch/swipe support
        let startX = 0;
        let endX = 0;
        
        this.carousel.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });
        
        this.carousel.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            this.handleSwipe(startX, endX);
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.carousel.matches(':hover')) {
                if (e.key === 'ArrowLeft') this.previousSlide();
                if (e.key === 'ArrowRight') this.nextSlide();
            }
        });
    }
    
    handleSwipe(startX, endX) {
        const threshold = 50;
        const diff = startX - endX;
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                this.nextSlide();
            } else {
                this.previousSlide();
            }
        }
    }
    
    goToSlide(index) {
        this.currentSlide = index;
        this.updateCarousel();
        this.updateIndicators();
        // this.restartAutoplay(); // Désactivé
    }
    
    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
        this.updateCarousel();
        this.updateIndicators();
        // this.restartAutoplay(); // Désactivé
    }
    
    previousSlide() {
        this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
        this.updateCarousel();
        this.updateIndicators();
        // this.restartAutoplay(); // Désactivé
    }
    
    updateCarousel() {
        const translateX = -this.currentSlide * 100;
        this.track.style.transform = `translateX(${translateX}%)`;
        
        // Update active slide
        this.slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === this.currentSlide);
        });
    }
    
    updateIndicators() {
        this.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentSlide);
        });
    }
    
    startAutoplay() {
        this.stopAutoplay();
        this.autoplayInterval = setInterval(() => {
            this.nextSlide();
        }, this.autoplayDelay);
    }
    
    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
    }
    
    restartAutoplay() {
        this.stopAutoplay();
        setTimeout(() => {
            this.startAutoplay();
        }, 1000); // Restart after 1 second
    }
}

// ==================== VERSION SELECTOR ====================
class VersionSelector {
    constructor() {
        this.init();
    }
    
    init() {
        const versionButtons = document.querySelectorAll('.version-btn');
        if (versionButtons.length === 0) return; // Sortir si aucun bouton n'existe
        
        versionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const version = e.currentTarget.dataset.version;
                this.switchVersion(version);
            });
        });
    }
    
    switchVersion(version) {
        const desktopContainer = document.querySelector('.desktop-container');
        const mobileContainer = document.querySelector('.mobile-container');
        const buttons = document.querySelectorAll('.version-btn');
        
        if (!desktopContainer || !mobileContainer) return; // Sortir si les conteneurs n'existent pas
        
        // Reset all
        desktopContainer.classList.remove('active');
        mobileContainer.classList.remove('active');
        buttons.forEach(btn => btn.classList.remove('active'));
        
        // Activate selected
        if (version === 'desktop') {
            desktopContainer.classList.add('active');
            const desktopBtn = document.querySelector('[data-version="desktop"]');
            if (desktopBtn) desktopBtn.classList.add('active');
        } else {
            mobileContainer.classList.add('active');
            const mobileBtn = document.querySelector('[data-version="mobile"]');
            if (mobileBtn) mobileBtn.classList.add('active');
        }
    }
}

// ==================== ESTIMATEUR ====================
class NeedsEstimator {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 8;
        this.answers = {};
        this.selectedServices = [];
        this.init();
    }

    init() {
        if (!document.getElementById('step1')) {
            console.log('Estimateur: Pas de step1 trouvé, pas sur la page estimateur');
            return;
        }
        
        console.log('Estimateur: Initialisation...');
        this.bindEvents();
        this.updateProgress();
        
        // La bulle mobile est maintenant gérée entièrement par CSS
        
        console.log('Estimateur: Initialisé avec succès');
    }

    bindEvents() {
        console.log('Estimateur: Configuration des événements...');
        
        // Test simple - ajouter un event listener sur le document entier
        document.addEventListener('click', (e) => {
            console.log('Estimateur: Clic détecté quelque part sur la page');
            console.log('Estimateur: Élément cliqué:', e.target);
            console.log('Estimateur: Classes de l\'élément:', e.target.className);
            
            // Vérifier si c'est un bouton d'option ou un de ses enfants
            const optionBtn = e.target.closest('.option-btn');
            if (optionBtn) {
                console.log('Estimateur: Clic sur bouton d\'option détecté!');
                console.log('Estimateur: Valeur du bouton:', optionBtn.dataset.value);
                
                // Vérifier si le bouton est dans l'étape active
                const questionCard = optionBtn.closest('.question-card');
                const isActive = questionCard && questionCard.classList.contains('active');
                
                console.log('Estimateur: Bouton dans étape active:', isActive);
                
                if (isActive) {
                    console.log('Estimateur: Traitement du clic...');
                    this.handleOptionClick({ currentTarget: optionBtn });
                }
            }
            
            // Vérifier si c'est le bouton "Continuer"
            const continueBtn = e.target.closest('.continue-btn');
            if (continueBtn) {
                console.log('Estimateur: Clic sur bouton Continuer détecté!');
                this.handleContinueClick();
            }
        });
        
        // Vérification des éléments présents
        setTimeout(() => {
            const activeCard = document.querySelector('.question-card.active');
            const buttons = document.querySelectorAll('.option-btn');
            const activeButtons = document.querySelectorAll('.question-card.active .option-btn');
            
            console.log('Estimateur: Carte active trouvée:', !!activeCard);
            console.log('Estimateur: Nombre total de boutons:', buttons.length);
            console.log('Estimateur: Nombre de boutons actifs:', activeButtons.length);
            
            if (activeButtons.length > 0) {
                console.log('Estimateur: Premier bouton actif:', activeButtons[0]);
                console.log('Estimateur: Style du premier bouton:', window.getComputedStyle(activeButtons[0]));
            }
        }, 100);
    }

    handleOptionClick(e) {
        console.log('Estimateur: handleOptionClick appelé');
        const button = e.currentTarget;
        const value = button.dataset.value;
        const step = this.currentStep;
        const isMultiSelect = button.closest('.multi-select');

        console.log(`Estimateur: Traitement clic - Valeur: ${value}, Étape: ${step}, Multi-select: ${!!isMultiSelect}`);

        if (isMultiSelect) {
            // Gestion multi-sélection pour les services
            this.handleMultiSelect(button, value);
        } else {
            // Sélection unique
            this.handleSingleSelect(button, value, step);
        }
    }

    handleSingleSelect(button, value, step) {
        console.log(`Estimateur: handleSingleSelect - Étape ${step}, Valeur: ${value}`);
        
        // Désélectionner les autres boutons de cette étape
        const stepElement = document.getElementById(`step${step}`);
        if (stepElement) {
            stepElement.querySelectorAll('.option-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            console.log('Estimateur: Autres boutons désélectionnés');
        }

        // Sélectionner le bouton cliqué
        button.classList.add('selected');
        console.log('Estimateur: Bouton sélectionné');
        
        // Enregistrer la réponse
        this.answers[`step${step}`] = value;
        console.log('Estimateur: Réponse enregistrée:', this.answers);

        // Démarrer l'animation de transition
        this.animateTransition(step, value);
    }

    handleMultiSelect(button, value) {
        if (value === 'aucun') {
            // Si "Aucun" est sélectionné, désélectionner tout le reste
            document.querySelectorAll('.multi-select .option-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            button.classList.add('selected');
            this.selectedServices = ['aucun'];
        } else {
            // Désélectionner "Aucun" si autre chose est sélectionné
            const aucunBtn = document.querySelector('.option-btn[data-value="aucun"]');
            if (aucunBtn) aucunBtn.classList.remove('selected');

            // Toggle la sélection
            button.classList.toggle('selected');
            
            if (button.classList.contains('selected')) {
                if (!this.selectedServices.includes(value)) {
                    this.selectedServices.push(value);
                }
            } else {
                this.selectedServices = this.selectedServices.filter(s => s !== value);
            }
        }

        // Afficher le bouton continuer
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn && this.selectedServices.length > 0) {
            continueBtn.style.display = 'block';
        }
    }

    handleContinueClick() {
        console.log('Estimateur: handleContinueClick appelé');
        console.log('Estimateur: Services sélectionnés:', this.selectedServices);
        
        // Enregistrer les services sélectionnés
        this.answers.services = this.selectedServices;
        
        // Masquer le bouton continuer
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) {
            continueBtn.style.display = 'none';
        }
        
        // Créer un message d'engagement pour les services
        const message = this.getServicesMessage();
        
        // Animer la transition vers les résultats
        this.animateToResults(message);
    }

    getServicesMessage() {
        if (this.selectedServices.includes('aucun')) {
            return "<strong>Parfait !</strong> Nous nous concentrerons sur l'essentiel : un site web performant et professionnel.";
        } else if (this.selectedServices.length === 1) {
            return "<strong>Excellent choix !</strong> Ce service complémentaire ajoutera une vraie valeur à votre site web.";
        } else {
            return "<strong>Fantastique !</strong> Cette combinaison de services vous donnera un avantage concurrentiel significatif.";
        }
    }

    animateToResults(message) {
        const currentStepElement = document.getElementById('step7');
        const infoMessage = document.getElementById('infoMessage');
        
        // 1. Faire disparaître la question actuelle
        currentStepElement.style.transform = 'translateY(-30px)';
        currentStepElement.style.opacity = '0';
        
        setTimeout(() => {
            // 2. Masquer complètement la question
            currentStepElement.classList.remove('active');
            
            // 3. Préparer et afficher le message d'engagement
            infoMessage.innerHTML = message;
            infoMessage.style.transform = 'translateY(30px)';
            infoMessage.style.opacity = '0';
            infoMessage.classList.add('show');
            
            // 4. Animer l'entrée du message
            setTimeout(() => {
                infoMessage.style.transform = 'translateY(0)';
                infoMessage.style.opacity = '1';
                
                // 5. Faire disparaître le message après 2.5 secondes
                setTimeout(() => {
                    infoMessage.style.transform = 'translateY(-30px)';
                    infoMessage.style.opacity = '0';
                    
                    setTimeout(() => {
                        infoMessage.classList.remove('show');
                        
                        // 6. Afficher les résultats
                        this.showResults();
                    }, 300);
                }, 2500);
            }, 100);
        }, 300);
    }

    showResults() {
        this.currentStep = 8;
        this.generateResults();

        // Désactive le scroll et remonte en haut
        window.scrollTo(0, 0);
        document.body.style.overflow = 'hidden';

        // Préparer et afficher l'étape des résultats
        const resultsStepElement = document.getElementById('step8');
        if (resultsStepElement) {
            resultsStepElement.style.transform = 'translateY(30px)';
            resultsStepElement.style.opacity = '0';
            resultsStepElement.classList.add('active');
            
            setTimeout(() => {
                resultsStepElement.style.transform = 'translateY(0)';
                resultsStepElement.style.opacity = '1';
            }, 100);
        }

        this.updateProgress();
    }

    animateTransition(step, value) {
        const currentStepElement = document.getElementById(`step${step}`);
        const infoMessage = document.getElementById('infoMessage');
        
        // Cas spécial : étape 2 avec réponse "oui" ne doit pas montrer de message
        // mais aller directement à l'étape 2b
        if (step === 2 && value === 'oui') {
            // 1. Faire disparaître la question actuelle
            currentStepElement.style.transform = 'translateY(-30px)';
            currentStepElement.style.opacity = '0';
            
            setTimeout(() => {
                currentStepElement.classList.remove('active');
                this.showNextStep(step);
            }, 300);
            return;
        }
        
        // 1. Faire disparaître la question actuelle
        currentStepElement.style.transform = 'translateY(-30px)';
        currentStepElement.style.opacity = '0';
        
        setTimeout(() => {
            // 2. Masquer complètement la question
            currentStepElement.classList.remove('active');
            
            // 3. Préparer et afficher le message d'engagement
            const message = this.getEngagementMessage(step, value);
            infoMessage.innerHTML = message;
            infoMessage.style.transform = 'translateY(30px)';
            infoMessage.style.opacity = '0';
            infoMessage.classList.add('show');
            
            // 4. Animer l'entrée du message
            setTimeout(() => {
                infoMessage.style.transform = 'translateY(0)';
                infoMessage.style.opacity = '1';
                
                // 5. Faire disparaître le message après 2.5 secondes
                setTimeout(() => {
                    infoMessage.style.transform = 'translateY(-30px)';
                    infoMessage.style.opacity = '0';
                    
                    setTimeout(() => {
                        infoMessage.classList.remove('show');
                        
                        // 6. Afficher la question suivante
                        this.showNextStep(step);
                    }, 300);
                }, 2500);
            }, 100);
        }, 300);
    }

    getEngagementMessage(step, value) {
        switch (step) {
            case 1:
                return this.getProfileMessage(value);
            case 2:
                return value === 'oui' ? 
                    "<strong>Parfait !</strong> Nous allons analyser votre site actuel pour l'améliorer." :
                    "<strong>Excellent !</strong> Nous allons créer votre première présence en ligne professionnelle.";
            case '2b':
                return value === 'ameliorer' ? 
                    "<strong>Excellente idée !</strong> Nous allons optimiser votre site existant pour de meilleures performances." :
                    "<strong>Parfait !</strong> Un nouveau site vous donnera une base solide et moderne.";
            case 3:
                return value === 'oui' ? 
                    "<strong>Excellent !</strong> Nous pourrons intégrer votre identité existante dans votre site." :
                    "<strong>Pas de problème !</strong> Nous pouvons créer une identité visuelle complète pour votre entreprise.";
            case 4:
                return value === 'oui' ? 
                    "<strong>Parfait !</strong> Nous intégrerons vos réseaux sociaux pour maximiser votre visibilité." :
                    "<strong>Bonne opportunité !</strong> Nous pourrons vous conseiller sur les réseaux sociaux adaptés à votre activité.";
            case 5:
                return "<strong>Merci !</strong> Cette information nous aide à vous proposer les meilleures solutions dans votre budget.";
            case 6:
                return value === '1page' ? 
                    "<strong>Site vitrine !</strong> Parfait pour présenter votre activité de manière concise et efficace." :
                    "<strong>Site multi-pages !</strong> Excellent choix pour améliorer votre référencement Google.";
            default:
                return "<strong>Parfait !</strong> Nous prenons note de votre choix.";
        }
    }

    showNextStep(currentStep) {
        // Déterminer la prochaine étape
        let nextStep;
        if (currentStep === 2 && this.answers.step2 === 'oui') {
            nextStep = '2b';
        } else if (currentStep === '2b') {
            nextStep = 3;
        } else if (currentStep === 7) {
            this.answers.services = this.selectedServices;
            nextStep = 8;
            this.generateResults();
            return;
        } else {
            nextStep = currentStep + 1;
        }

        this.currentStep = nextStep;
        
        // Préparer et afficher la prochaine étape
        const nextStepElement = document.getElementById(`step${nextStep}`);
        if (nextStepElement) {
            nextStepElement.style.transform = 'translateY(30px)';
            nextStepElement.style.opacity = '0';
            nextStepElement.classList.add('active');
            
            setTimeout(() => {
                nextStepElement.style.transform = 'translateY(0)';
                nextStepElement.style.opacity = '1';
            }, 100);
        }

        this.updateProgress();
    }

    getProfileMessage(profile) {
        const messages = {
            'restaurateur': "<strong>Saviez-vous que</strong> 87% des clients consultent le site web d'un restaurant avant de s'y rendre ?",
            'commercant': "<strong>Saviez-vous que</strong> 76% des consommateurs recherchent des informations sur un commerce en ligne avant de se déplacer ?",
            'bar': "<strong>Saviez-vous que</strong> 68% des clients vérifient les horaires et l'ambiance d'un bar/PMU sur internet avant leur visite ?",
            'autres': "<strong>Saviez-vous que</strong> 81% des entreprises considèrent leur site web comme leur meilleur outil de marketing ?"
        };
        return messages[profile] || messages['autres'];
    }

    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const mobileBubble = document.getElementById('mobileBubble');
        const bubbleFill = document.getElementById('bubbleFill');
        const bubblePercentage = document.getElementById('bubblePercentage');
        
        if (progressFill && progressText) {
            const stepNumber = this.currentStep === '2b' ? 2.5 : this.currentStep;
            const percentage = (stepNumber / this.totalSteps) * 100;
            
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `Étape ${Math.ceil(stepNumber)} sur ${this.totalSteps}`;

            // Mise à jour de la bulle mobile
            if (mobileBubble) {
                if (bubbleFill) {
                    bubbleFill.style.height = `${percentage}%`;
                }
                
                if (bubblePercentage) {
                    bubblePercentage.textContent = `${Math.round(percentage)}%`;
                }
            }
        }
    }

    generateResults() {
        const resultsSummary = document.getElementById('resultsSummary');
        if (!resultsSummary) return;

        const estimation = this.calculateEstimation();
        
        resultsSummary.innerHTML = `
            <div class="result-item">
                <span class="result-label">Type de site recommandé</span>
                <span class="result-value">${estimation.siteType}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Services inclus</span>
                <span class="result-value">${estimation.services.join(', ')}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Délai estimé</span>
                <span class="result-value estimation-value-vertical">
                  <div class='estimation-main-value'>${estimation.timeline}</div>
                  ${estimation.timelineComparaison ? `<div class='estimation-badge-wrapper'><span class='estimation-badge'>${estimation.timelineComparaison}</span></div>` : ''}
                </span>
            </div>
            <div class="result-item">
                <span class="result-label">Estimation budgétaire</span>
                <span class="result-value estimation-value-vertical">
                  <div class='estimation-main-value'>${estimation.price}</div>
                  ${estimation.priceComparaison ? `<div class='estimation-badge-wrapper'><span class='estimation-badge'>${estimation.priceComparaison}</span></div>` : ''}
                </span>
            </div>
        `;
    }

    calculateEstimation() {
        let basePrice = 800; // Prix de base pour un site vitrine
        let services = ['Création du site web'];
        let timeline = '1 à 2 semaines';
        let siteType = 'Site vitrine 1 page';
        let prixAgence = 1150;
        let delaiAgence = 6; // jours
        let timelineComparaison = '';
        let priceComparaison = '';
        let delaiProjet = 7; // jours par défaut (1 semaine)

        // Ajuster selon le type de site
        if (this.answers.step6 === 'multipages') {
            basePrice = 1600;
            siteType = 'Site multi-pages (4-6 pages)';
            timeline = '3 à 4 semaines';
            services.push('Optimisation SEO de base');
            prixAgence = 2750;
            delaiAgence = 12.5;
            delaiProjet = 21;
        }

        // Ajouter les coûts selon les réponses
        if (this.answers.step3 === 'non') {
            basePrice += 400; // Création identité visuelle
            services.push('Création identité visuelle');
        }

        if (this.answers.step4 === 'oui') {
            basePrice += 49; // Intégration réseaux sociaux
            services.push('Intégration réseaux sociaux');
        }

        // Ajouter les services complémentaires
        if (this.selectedServices && this.selectedServices.length > 0 && !this.selectedServices.includes('aucun')) {
            this.selectedServices.forEach(service => {
                switch (service) {
                    case 'photos':
                        basePrice += 400;
                        services.push('Shooting photo');
                        break;
                    case 'seo':
                        basePrice += 199;
                        services.push('Optimisation SEO avancée');
                        break;
                    case 'avis-google':
                        basePrice += 99;
                        services.push('Optimisation avis Google');
                        break;
                    case 'videos':
                        basePrice += 300;
                        services.push('Création vidéos');
                        break;
                    case 'qr-codes':
                        basePrice += 49;
                        services.push('QR codes personnalisés');
                        break;
                }
            });
        }

        // Ajuster le délai selon la complexité
        if (services.length > 4) {
            if (this.answers.step6 === 'multipages') {
                timeline = '4 semaines max';
                delaiProjet = 28;
            } else {
                timeline = '2 semaines max';
                delaiProjet = 14;
            }
        }

        // Comparaison prix
        let percentEconomy = Math.round(100 * (1 - basePrice / prixAgence));
        // Clamp entre 20 et 50
        if (isNaN(percentEconomy) || percentEconomy < 20) percentEconomy = 20;
        if (percentEconomy > 50) percentEconomy = 50;
        priceComparaison = `soit ${percentEconomy}% moins cher qu'une agence locale`;

        // Comparaison délai
        let percentFaster = Math.round(100 * (1 - delaiProjet / delaiAgence));
        if (isNaN(percentFaster) || percentFaster < 20) percentFaster = 20;
        if (percentFaster > 50) percentFaster = 50;
        timelineComparaison = `soit ${percentFaster}% plus rapide qu'une agence locale`;

        return {
            siteType,
            services,
            timeline,
            price: `À partir de ${basePrice}€`,
            priceComparaison,
            timelineComparaison
        };
    }

    // Réactive le scroll si on quitte l'étape 8 (ex: si on relance l'estimateur)
    // À placer dans la logique de reset ou de retour en arrière si besoin :
    resetEstimator() {
        document.body.style.overflow = '';
        // ... le reste du reset ...
    }
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser toutes les classes
    new AnimatedBackground();
    new AdvancedAnimations();
    new MobileMenu();
    new DynamicHeader();
    new PortfolioCarousel();
    new VersionSelector();
    new NeedsEstimator();
    
    // Smooth scroll pour les ancres
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Loading animation
    document.body.classList.add('loaded');
});

// ==================== FONCTIONS PACK DETAILS ====================
function showPackDetails() {
    const normalView = document.querySelector('.pack-normal-view');
    const detailsView = document.querySelector('.pack-details-view');
    
    if (!normalView || !detailsView) return; // Sortir si les éléments n'existent pas
    
    normalView.style.display = 'none';
    detailsView.style.display = 'block';
    
    // Animation d'entrée
    detailsView.style.opacity = '0';
    detailsView.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        detailsView.style.transition = 'all 0.3s ease';
        detailsView.style.opacity = '1';
        detailsView.style.transform = 'translateY(0)';
    }, 10);
}

function hidePackDetails() {
    const normalView = document.querySelector('.pack-normal-view');
    const detailsView = document.querySelector('.pack-details-view');
    
    if (!normalView || !detailsView) return; // Sortir si les éléments n'existent pas
    
    detailsView.style.opacity = '0';
    detailsView.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        detailsView.style.display = 'none';
        normalView.style.display = 'block';
        
        // Animation d'entrée pour la vue normale
        normalView.style.opacity = '0';
        normalView.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            normalView.style.transition = 'all 0.3s ease';
            normalView.style.opacity = '1';
            normalView.style.transform = 'translateY(0)';
        }, 10);
    }, 300);
}

// === Masquer/afficher le header de l'estimateur selon le scroll ===
(function() {
  let lastScrollY = window.scrollY;
  const header = document.querySelector('.estimator-header-fixed');
  if (!header) return;
  window.addEventListener('scroll', function() {
    const currentY = window.scrollY;
    if (currentY > lastScrollY && currentY > 40) {
      // Scroll vers le bas
      header.classList.add('header-hidden');
    } else {
      // Scroll vers le haut
      header.classList.remove('header-hidden');
    }
    lastScrollY = currentY;
  });
})(); 