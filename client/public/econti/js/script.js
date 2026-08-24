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

document.body.classList.add('is-loading');

// Header Scroll State
const header = document.querySelector('.top-header');
window.addEventListener('scroll', () => {
    // Cabeçalho muda de estado ao sair do herói (aprox 70% da tela)
    if (window.scrollY > window.innerHeight * 0.7) {
        header?.classList.add('is-scrolled');
    } else {
        header?.classList.remove('is-scrolled');
    }
});

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

const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        const video = entry.target.querySelector('video');
        if (!video) return;

        if (window.innerWidth < 1024) {
            // Mobile: Toca apenas se estiver bem visível (mais de 60%)
            if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        } else {
            // Desktop: Pausa se sair da tela (o play é via hover)
            if (!entry.isIntersecting) {
                video.pause();
            }
        }
    });
}, { threshold: [0, 0.6] });

projectCards.forEach((card) => {
    videoObserver.observe(card);

    // Reprodução ao passar o mouse (Desktop)
    card.addEventListener('mouseenter', () => {
        if (window.innerWidth >= 1024) {
            const video = card.querySelector('video');
            if (video) {
                video.play().catch(() => {});
            }
        }
    });

    card.addEventListener('mouseleave', () => {
        if (window.innerWidth >= 1024) {
            const video = card.querySelector('video');
            if (video) {
                video.pause();
            }
        }
    });

    card.addEventListener('click', () => {
        const videoSrc = card.dataset.video;
        const imgSrc = card.querySelector('img')?.src;

        if (!modal) return;

        if (videoSrc && modalVideo) {
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
    });
});

// Fullscreen para parceiros e imagens do rio
const fullscreenImages = document.querySelectorAll('.partner-logo img, .river-column img');
fullscreenImages.forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
        if (!modal || !modalImg) return;
        
        modalImg.src = img.src;
        modalImg.style.display = 'block';
        if (modalVideo) modalVideo.style.display = 'none';
        
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
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
if (teamSection && teamCards.length > 0) {
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
    });

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

if (heroSection && collageItems.length > 0) {
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
    });

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

// --- LOTTIE BUILDING ANIMATION ---
const lottieContainer = document.getElementById('lottie-building');
if (lottieContainer) {
    lottie.loadAnimation({
        container: lottieContainer,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://lottie.host/17e57c8d-6997-400a-b333-e59389274291/3L29H7tC9F.json'
    });
}

// --- MOBILE PHOTO EFFECTS ---
if (window.innerWidth < 1024) {
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const vh = window.innerHeight;
        
        document.querySelectorAll('.team-card, .river-column img, .service-card img').forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            if (rect.top < vh && rect.bottom > 0) {
                const centerDiff = (rect.top + rect.height/2) - vh/2;
                const movement = centerDiff * 0.05;
                const rotation = (i % 2 === 0 ? 1 : -1) * (centerDiff * 0.01);
                
                el.style.transform = `translateY(${movement}px) rotate(${rotation}deg)`;
            }
        });
    });
}
