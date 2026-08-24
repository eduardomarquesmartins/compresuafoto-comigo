const loader = document.querySelector('.loader');
const revealItems = document.querySelectorAll('.reveal');
const projectCards = document.querySelectorAll('.project-card');
const modal = document.querySelector('.media-modal');
const modalVideo = modal?.querySelector('video');
const modalImg = modal?.querySelector('img');
const modalClose = document.querySelector('.media-modal__close');
const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('.mobile-menu');
const navLinks = document.querySelectorAll('.rail-nav a');
const sections = document.querySelectorAll('section[id]');
const contactForm = document.querySelector('#contact-form');
const whatsappLinks = document.querySelectorAll('[data-whatsapp]');
const phoneNumber = '5551989794082';
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.body.classList.add('is-loading');

// Header Scroll State
const header = document.querySelector('.top-header');
const updateHeaderState = () => {
    if (window.scrollY > window.innerHeight * 0.7) {
        header?.classList.add('is-scrolled');
    } else {
        header?.classList.remove('is-scrolled');
    }
};

window.addEventListener('scroll', updateHeaderState, { passive: true });
updateHeaderState();

const hideLoader = () => {
    loader?.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
};

window.addEventListener('load', () => setTimeout(hideLoader, 350));
setTimeout(hideLoader, 1800);

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.05, /* Mais sensível para mobile */
    rootMargin: '0px 0px -20px 0px'
});

revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 4, 3) * 90}ms`;
    revealObserver.observe(item);
});

document.querySelectorAll('.pop-reveal').forEach(item => {
    revealObserver.observe(item);
});

const openModal = ({ videoSrc = '', imgSrc = '' } = {}) => {
    if (!modal) return;

    if (videoSrc && modalVideo) {
        modalVideo.preload = 'metadata';
        modalVideo.src = videoSrc;
        modalVideo.style.display = 'block';
        modalVideo.play().catch(() => {});
    } else if (imgSrc && modalImg) {
        modalImg.src = imgSrc;
        modalImg.style.display = 'block';
    } else {
        return;
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
};

projectCards.forEach((card) => {
    card.addEventListener('click', () => {
        const videoSrc = card.dataset.video;
        const imgSrc = card.querySelector('img')?.src;
        openModal({ videoSrc, imgSrc: videoSrc ? '' : imgSrc });
    });
});

// Fullscreen para parceiros e imagens do rio
const fullscreenImages = document.querySelectorAll('.partner-logo img, .river-column img');
fullscreenImages.forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
        openModal({ imgSrc: img.src });
        e.stopPropagation();
    });
});

const closeModal = () => {
    if (!modal) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    
    if (modalVideo) {
        modalVideo.pause();
        modalVideo.src = '';
        modalVideo.style.display = 'none';
    }
    
    if (modalImg) {
        modalImg.src = '';
        modalImg.style.display = 'none';
    }
    
    document.body.style.overflow = '';
};

modalClose?.addEventListener('click', closeModal);
modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeModal();
        closeMobileMenu();
    }
});

const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        navLinks.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
        });
    });
}, {
    threshold: 0.34
});

sections.forEach((section) => navObserver.observe(section));

function openMobileMenu() {
    mobileMenu?.classList.add('is-open');
    menuButton?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    mobileMenu?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (!modal?.classList.contains('is-open')) {
        document.body.style.overflow = '';
    }
}

menuButton?.addEventListener('click', () => {
    if (mobileMenu?.classList.contains('is-open')) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
});

mobileMenu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
});

const buildWhatsappUrl = (name = '', subject = '', message = '') => {
    const fallback = 'Olá! Quero entender como a & CONTI pode ajudar minha marca.';
    const text = message
        ? `Olá! Meu nome é *${name || 'Não informado'}*.\n\n*Assunto:* ${subject || 'Geral'}\n*Mensagem:* ${message}`
        : fallback;

    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
};

contactForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.querySelector('#contact-name')?.value.trim();
    const subject = document.querySelector('#contact-subject')?.value.trim();
    const message = document.querySelector('#contact-message')?.value.trim();

    if (!name || !message) {
        alert('Por favor, preencha pelo menos o nome e a mensagem.');
        return;
    }

    window.open(buildWhatsappUrl(name, subject, message), '_blank');
});

whatsappLinks.forEach((link) => {
    link.addEventListener('click', () => {
        window.open(buildWhatsappUrl(), '_blank');
    });
});

/* --- TEAM 3D SCROLL ANIMATION --- */
const teamSection = document.querySelector('.team-3d');
const teamCards = document.querySelectorAll('.team-card');
if (!prefersReducedMotion && teamSection && teamCards.length > 0) {
    const isMobile = window.innerWidth < 768;
    let currentScroll = 0;
    let targetScroll = 0;
    let isTeamVisible = false;
    
    const lerp = (start, end, factor) => start + (end - start) * factor;

    const teamVisibilityObserver = new IntersectionObserver(entries => {
        isTeamVisible = entries[0].isIntersecting;
    }, { threshold: 0.01 });
    teamVisibilityObserver.observe(teamSection);

    const update3DScene = () => {
        if (!isTeamVisible) {
            requestAnimationFrame(update3DScene);
            return;
        }

        currentScroll = lerp(currentScroll, targetScroll, 0.08);
        const offsetSpacing = 0.15;
        const totalAnimSpace = 1 + (teamCards.length - 1) * offsetSpacing;

        teamCards.forEach((card, index) => {
            const position = (currentScroll * totalAnimSpace) - (index * offsetSpacing);
            if (position < -0.2 || position > 1.2) {
                card.style.opacity = '0';
                return;
            }

            const y = (1 - (position * 2)) * window.innerHeight * 1.2;
            const x = Math.sin(position * Math.PI) * 350; 
            const z = (position * 2000) - 1500;
            const rotateY = isMobile ? position * -15 : Math.sin(position * Math.PI) * -25;
            const rotateZ = isMobile ? 0 : Math.sin(position * Math.PI) * 12;

            let opacity = 1;
            if (position < 0.15) opacity = position / 0.15;
            if (position > 0.85) opacity = (1 - position) / 0.15;

            card.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
            card.style.opacity = Math.max(0, Math.min(1, opacity));
        });

        requestAnimationFrame(update3DScene);
    };

    window.addEventListener('scroll', () => {
        if (!isTeamVisible) return;
        const rect = teamSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const totalScrollDistance = rect.height - windowHeight;
        
        if (rect.top <= windowHeight && rect.bottom >= 0) {
            const scrolled = windowHeight - rect.top;
            targetScroll = Math.max(0, Math.min(1, (scrolled - windowHeight) / totalScrollDistance));
        }
    }, { passive: true });

    update3DScene();
}

/* --- HERO PARALLAX ANIMATION --- */
const heroSection = document.querySelector('.hero');
const collageItems = document.querySelectorAll('.hero-collage-item');
let mouseX = 0;
let mouseY = 0;
let currentX = 0;
let currentY = 0;
let isHeroVisible = true;

if (!prefersReducedMotion && heroSection && collageItems.length > 0) {
    const heroVisibilityObserver = new IntersectionObserver(entries => {
        isHeroVisible = entries[0].isIntersecting;
    }, { threshold: 0.1 });
    heroVisibilityObserver.observe(heroSection);

    window.addEventListener('mousemove', (e) => {
        if (!isHeroVisible || window.innerWidth < 1024) return;
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Mobile Parallax via Scroll
    window.addEventListener('scroll', () => {
        if (!isHeroVisible || window.innerWidth >= 1024) return;
        const scrolled = window.scrollY;
        // Transformamos o scroll em um valor de -1 a 1 baseado na posição da tela
        mouseX = Math.sin(scrolled * 0.005) * 0.4; // Balanço horizontal
        mouseY = (scrolled / 500); // Movimento vertical direto
    }, { passive: true });

    const animateParallax = () => {
        if (!isHeroVisible) {
            requestAnimationFrame(animateParallax);
            return;
        }

        // Interpolação suave (lerp)
        currentX += (mouseX - currentX) * 0.08;
        currentY += (mouseY - currentY) * 0.08;

        collageItems.forEach((item, index) => {
            const img = item.querySelector('img');
            if (img) {
                if (window.innerWidth >= 1024) {
                    // Restaura o efeito original do Desktop (3D)
                    const depthX = (index % 4 + 1) * 45;
                    const depthY = (index % 3 + 1) * 40;
                    const x = -currentX * depthX;
                    const y = -currentY * depthY;
                    const rotateX = currentY * 15;
                    const rotateY = -currentX * 15;
                    const scale = 1 + (Math.abs(currentX) + Math.abs(currentY)) * 0.05;
                    img.style.transform = `translate3d(${x}px, ${y}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
                } else {
                    // Mantém o efeito otimizado para Mobile (2D)
                    const factor = (index % 3 + 1);
                    const x = -currentX * (factor * 30);
                    const y = -currentY * (factor * 40);
                    const rotate = currentX * 10;
                    img.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)`;
                }
            }
        });

        requestAnimationFrame(animateParallax);
    };

    animateParallax();
}

// --- MOBILE PHOTO EFFECTS ---
if (!prefersReducedMotion && window.innerWidth < 1024) {
    const mobilePhotoElements = document.querySelectorAll('.team-card, .river-column img, .services-brands__card img');
    let mobilePhotoTicking = false;

    const updateMobilePhotoEffects = () => {
        const vh = window.innerHeight;

        mobilePhotoElements.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            if (rect.top < vh && rect.bottom > 0) {
                const centerDiff = (rect.top + rect.height / 2) - vh / 2;
                const movement = centerDiff * 0.05;
                const rotation = (i % 2 === 0 ? 1 : -1) * (centerDiff * 0.01);

                el.style.transform = `translateY(${movement}px) rotate(${rotation}deg)`;
            }
        });

        mobilePhotoTicking = false;
    };

    window.addEventListener('scroll', () => {
        if (mobilePhotoTicking) return;
        mobilePhotoTicking = true;
        requestAnimationFrame(updateMobilePhotoEffects);
    }, { passive: true });

    updateMobilePhotoEffects();
}

// --- INTERACTIVE MONTHLY PLANNING SIMULATOR ---
const strategyDatabase = {
    week1: {
        lancamento: "Teasers e contagem regressiva para atiçar a curiosidade e desejo do público.",
        oferta: "Aquecimento de público anunciando que uma oferta/condição exclusiva vem aí.",
        branding: "Histórias marcantes e posts reforçando os diferencias e autoridade da sua marca."
    },
    week2: {
        maes: "Campanha emocional com fotos e vídeos focando na conexão de mães e filhos.",
        black: "Conteúdo estratégico revelando as primeiras grandes oportunidades da Black Friday.",
        natal: "Campanha institucional acolhedora focada nos sentimentos de final de ano.",
        institucional: "Storytelling humanizado mostrando os bastidores e os valores da sua equipe."
    },
    week3: {
        sorteio: "Lançamento da Ação Premiada/Sorteio oficial para explodir o engajamento do perfil.",
        live: "Super live de vendas / evento online focado em sanar dúvidas e fechar pedidos.",
        audiovisual: "Lançamento do vídeo comercial cinematográfico impulsionado com tráfego pago."
    },
    week4: {
        lancamento: "Escala dos anúncios de conversão + depoimentos reais de clientes e prova social.",
        oferta: "Gatilhos de escassez e urgência: contagem regressiva para fechar o carrinho.",
        branding: "Fechamento do ciclo mensal, análise aprofundada de métricas e relatório de ROI."
    }
};

const runSimulation = () => {
    const dateVal = document.querySelector('[data-group="date"] .simulator-btn.is-active')?.dataset.val || 'maes';
    const focusVal = document.querySelector('[data-group="focus"] .simulator-btn.is-active')?.dataset.val || 'lancamento';
    const actionVal = document.querySelector('[data-group="action"] .simulator-btn.is-active')?.dataset.val || 'sorteio';

    const week1Desc = document.querySelector('#week-1 .week-desc');
    const week2Desc = document.querySelector('#week-2 .week-desc');
    const week3Desc = document.querySelector('#week-3 .week-desc');
    const week4Desc = document.querySelector('#week-4 .week-desc');

    if (week1Desc) {
        week1Desc.style.opacity = 0;
        setTimeout(() => {
            week1Desc.textContent = strategyDatabase.week1[focusVal] || "...";
            week1Desc.style.opacity = 1;
        }, 150);
    }
    
    if (week2Desc) {
        week2Desc.style.opacity = 0;
        setTimeout(() => {
            week2Desc.textContent = strategyDatabase.week2[dateVal] || "...";
            week2Desc.style.opacity = 1;
        }, 150);
    }

    if (week3Desc) {
        week3Desc.style.opacity = 0;
        setTimeout(() => {
            week3Desc.textContent = strategyDatabase.week3[actionVal] || "...";
            week3Desc.style.opacity = 1;
        }, 150);
    }

    if (week4Desc) {
        week4Desc.style.opacity = 0;
        setTimeout(() => {
            week4Desc.textContent = strategyDatabase.week4[focusVal] || "...";
            week4Desc.style.opacity = 1;
        }, 150);
    }
};

// Delegação de eventos no document para os botões do simulador
document.addEventListener('click', (event) => {
    const btn = event.target.closest('.simulator-btn');
    if (!btn) return;
    
    const group = btn.closest('.simulator-buttons');
    if (!group) return;
    
    event.preventDefault();
    
    group.querySelectorAll('.simulator-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    runSimulation();
});

// Run initially to populate on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(runSimulation, 400);
});
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setTimeout(runSimulation, 400);
}

// --- BENTO GRID SPOTLIGHT EFFECT ---
document.querySelectorAll('.services-brands__card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--x', `${x}px`);
        card.style.setProperty('--y', `${y}px`);
    });
});

