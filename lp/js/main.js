/* ========================================
   Zyntra - Sistema de Gestão Empresarial
   JavaScript - Interactions & Animations
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ========== HEADER SCROLL EFFECT ==========
    const header = document.getElementById('header');

    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('header--scrolled');
        } else {
            header.classList.remove('header--scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ========== MOBILE MENU ==========
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('nav');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        nav.classList.toggle('active');
        document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu on link click
    document.querySelectorAll('.header__link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            nav.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // ========== FEATURE TABS ==========
    const tabs = document.querySelectorAll('.features__tab');
    const panels = document.querySelectorAll('.features__panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Remove active from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Add active to clicked tab and corresponding panel
            tab.classList.add('active');
            document.getElementById(`tab-${target}`).classList.add('active');
        });
    });

    // ========== PRICING TOGGLE (removed - prices are now "Sob consulta") ==========

    // ========== FAQ ACCORDION ==========
    const faqItems = document.querySelectorAll('.faq__item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq__question');
        const answer = item.querySelector('.faq__answer');

        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all
            faqItems.forEach(i => {
                i.classList.remove('active');
                i.querySelector('.faq__answer').style.maxHeight = '0';
            });

            // Open clicked if it wasn't active
            if (!isActive) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });

    // ========== SCROLL ANIMATIONS ==========
    const animateElements = () => {
        const elements = document.querySelectorAll(
            '.stat, .benefit-card, .step, .pricing-card, .testimonial-card, .faq__item, .contact__info-card'
        );

        elements.forEach(el => {
            el.classList.add('animate-on-scroll');
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.classList.add('visible');
                        }, index * 100);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        elements.forEach(el => observer.observe(el));
    };

    animateElements();

    // ========== SMOOTH SCROLL FOR ANCHOR LINKS ==========
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ========== CONTACT FORM (EmailJS Integration) ==========
    // Para ativar: 1) Crie conta em emailjs.com  2) Substitua os IDs abaixo
    const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';       // Sua public key do EmailJS
    const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';       // Seu service ID
    const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';     // Seu template ID

    // Inicializar EmailJS (só se a key foi configurada)
    const emailjsReady = EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY';
    if (emailjsReady && typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }

    const contactForm = document.getElementById('contactForm');

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData);

        const btn = contactForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;

        // Estado: enviando
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Enviando...
        `;
        btn.disabled = true;

        const showSuccess = () => {
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <path d="M22 4 12 14.01l-3-3"/>
                </svg>
                Mensagem Enviada!
            `;
            btn.style.background = '#00B894';
            btn.style.borderColor = '#00B894';

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.disabled = false;
                contactForm.reset();
            }, 3000);
        };

        const showError = () => {
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Erro ao enviar
            `;
            btn.style.background = '#E17055';
            btn.style.borderColor = '#E17055';

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.disabled = false;
            }, 3000);
        };

        if (emailjsReady && typeof emailjs !== 'undefined') {
            // Envio real via EmailJS
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                from_name: data.name,
                from_email: data.email,
                phone: data.phone,
                company: data.company,
                message: data.message
            }).then(showSuccess).catch((err) => {
                console.error('EmailJS error:', err);
                showError();
            });
        } else {
            // Fallback: simula envio (remover quando EmailJS estiver configurado)
            console.log('Form data (EmailJS não configurado):', data);
            setTimeout(showSuccess, 1500);
        }
    });

    // ========== STATS INTERSECTION FADE-IN ==========
    const statsSection = document.querySelector('.stats');

    if (statsSection) {
        const statsObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        statsSection.style.opacity = '1';
                        statsSection.style.transform = 'translateY(0)';
                        statsObserver.unobserve(statsSection);
                    }
                });
            },
            { threshold: 0.3 }
        );
        statsSection.style.opacity = '0';
        statsSection.style.transform = 'translateY(20px)';
        statsSection.style.transition = 'all 0.6s ease';
        statsObserver.observe(statsSection);
    }

    // ========== TYPING EFFECT FOR HERO (subtle) ==========
    const heroTitle = document.querySelector('.hero__title');
    if (heroTitle) {
        heroTitle.style.opacity = '0';
        heroTitle.style.transform = 'translateY(20px)';
        setTimeout(() => {
            heroTitle.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            heroTitle.style.opacity = '1';
            heroTitle.style.transform = 'translateY(0)';
        }, 200);
    }

    // ========== PARALLAX ON HERO SHAPES ==========
    const shapes = document.querySelectorAll('.shape');

    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;

        shapes.forEach((shape, i) => {
            const speed = (i + 1) * 10;
            shape.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        });
    }, { passive: true });

    // ========== ADD SPIN CSS ==========
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .spin {
            animation: spin 1s linear infinite;
        }
    `;
    document.head.appendChild(style);

    // ========== LGPD COOKIE CONSENT ==========
    const cookieBanner = document.getElementById('cookieBanner');
    const cookieAccept = document.getElementById('cookieAccept');
    const cookieReject = document.getElementById('cookieReject');

    if (cookieBanner) {
        const cookieConsent = localStorage.getItem('zyntra_cookie_consent');

        if (!cookieConsent) {
            // Mostrar banner após 1.5s
            setTimeout(() => {
                cookieBanner.classList.add('visible');
            }, 1500);
        } else if (cookieConsent === 'accepted') {
            // Ativar analytics se já aceitou
            enableAnalytics();
        }

        if (cookieAccept) {
            cookieAccept.addEventListener('click', () => {
                localStorage.setItem('zyntra_cookie_consent', 'accepted');
                localStorage.setItem('zyntra_cookie_date', new Date().toISOString());
                cookieBanner.classList.remove('visible');
                enableAnalytics();
            });
        }

        if (cookieReject) {
            cookieReject.addEventListener('click', () => {
                localStorage.setItem('zyntra_cookie_consent', 'rejected');
                localStorage.setItem('zyntra_cookie_date', new Date().toISOString());
                cookieBanner.classList.remove('visible');
                disableAnalytics();
            });
        }
    }

    function enableAnalytics() {
        // Habilita Google Analytics (descomente quando tiver o ID real)
        // window['ga-disable-G-XXXXXXXXXX'] = false;
        console.log('Analytics: cookies aceitos');
    }

    function disableAnalytics() {
        // Desabilita Google Analytics
        window['ga-disable-G-XXXXXXXXXX'] = true;
        // Remove cookies do GA
        document.cookie.split(';').forEach(c => {
            const name = c.trim().split('=')[0];
            if (name.startsWith('_ga') || name.startsWith('_gid')) {
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            }
        });
        console.log('Analytics: cookies rejeitados');
    }

});
