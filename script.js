// ============================
// NAV DROPDOWN
// ============================
const dropdownWrap = document.getElementById('navDropdownWrap');
const dropdownBtn  = document.getElementById('navDropdownBtn');

dropdownBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = dropdownWrap.classList.toggle('open');
  dropdownBtn.setAttribute('aria-expanded', isOpen);
});

// Close dropdown when clicking a link inside it or outside
document.getElementById('navDropdown').querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => dropdownWrap.classList.remove('open'));
});
document.addEventListener('click', () => dropdownWrap.classList.remove('open'));

// ============================
// NAV — scroll state & burger
// ============================
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const navMobile = document.getElementById('navMobile');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
  document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

burger.addEventListener('click', () => {
  navMobile.classList.toggle('open');
});

navMobile.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navMobile.classList.remove('open'));
});

// ============================
// HERO PARALLAX
// ============================
const heroImg = document.getElementById('heroImg');
window.addEventListener('scroll', () => {
  if (window.scrollY < window.innerHeight) {
    heroImg.style.transform = `scale(1.05) translateY(${window.scrollY * 0.25}px)`;
  }
}, { passive: true });

// ============================
// REVEAL ON SCROLL
// ============================
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

reveals.forEach(el => revealObserver.observe(el));

// Expose observer so config-loader can register dynamic elements
window.__revealObserver = revealObserver;
window.__animateCounter = animateCounter;

// ============================
// COUNTER ANIMATION
// ============================
function animateCounter(el) {
  const target = parseInt(el.dataset.count, 10);
  const duration = 1600;
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  };
  requestAnimationFrame(update);
}

const counters = document.querySelectorAll('.stat__num');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

counters.forEach(c => counterObserver.observe(c));

// ============================
// FAQ ACCORDION
// ============================
document.querySelectorAll('.faq__question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const answer = item.querySelector('.faq__answer');
    const isOpen = item.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq__item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq__answer').style.maxHeight = '0';
    });

    // Toggle clicked
    if (!isOpen) {
      item.classList.add('open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

// ============================
// CONTACT FORM
// ============================
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.btn');
  const success = document.getElementById('formSuccess');

  btn.disabled = true;
  btn.querySelector('.btn__text').textContent = 'Enviando…';

  // Simulate async send (replace with real fetch to your backend/formspree)
  setTimeout(() => {
    form.reset();
    btn.disabled = false;
    btn.querySelector('.btn__text').textContent = 'Enviar consulta';
    success.classList.add('visible');
    setTimeout(() => success.classList.remove('visible'), 5000);
  }, 1200);
});

// ============================
// PHOTO MODAL + LIGHTBOX
// ============================
const photoModal    = document.getElementById('photoModal');
const modalTitle    = photoModal.querySelector('.photo-modal__title');
const modalDesc     = photoModal.querySelector('.photo-modal__desc');
const modalGrid     = photoModal.querySelector('.photo-modal__grid');
const modalClose    = photoModal.querySelector('.photo-modal__close');
const modalBackdrop = photoModal.querySelector('.photo-modal__backdrop');

const photoLightbox = document.getElementById('photoLightbox');
const lbImg         = photoLightbox.querySelector('.photo-lb__img');
const lbCounter     = photoLightbox.querySelector('.photo-lb__counter');
const lbClose       = photoLightbox.querySelector('.photo-lb__close');
const lbBackdrop    = photoLightbox.querySelector('.photo-lb__backdrop');
const lbPrev        = photoLightbox.querySelector('.photo-lb__prev');
const lbNext        = photoLightbox.querySelector('.photo-lb__next');

let lbMedia  = [];
let lbIndex  = 0;

function isVideo(src) {
  return /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(src);
}

function mediaThumbHTML(src, title, i) {
  if (isVideo(src)) {
    return `
      <div class="photo-modal__video-wrap" data-index="${i}">
        <video src="${src}" class="photo-modal__thumb" preload="metadata" muted playsinline></video>
        <span class="photo-modal__play-icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </span>
      </div>`;
  }
  return `<img src="${src}" alt="${title} ${i + 1}" class="photo-modal__thumb" loading="lazy" data-index="${i}" />`;
}

function openPhotoModal(title, description, photos) {
  modalTitle.textContent = title;
  modalDesc.textContent  = description;

  if (!photos || photos.length === 0) {
    modalGrid.innerHTML = `<p class="photo-modal__empty">📷 Fotos y vídeos próximamente</p>`;
  } else {
    modalGrid.innerHTML = photos.map((src, i) => mediaThumbHTML(src, title, i)).join('');
    // Click handlers for images
    modalGrid.querySelectorAll('.photo-modal__thumb[data-index]').forEach(img => {
      img.addEventListener('click', () => openLightbox(photos, parseInt(img.dataset.index)));
    });
    // Click handlers for video wrappers
    modalGrid.querySelectorAll('.photo-modal__video-wrap').forEach(wrap => {
      wrap.addEventListener('click', () => openLightbox(photos, parseInt(wrap.dataset.index)));
    });
  }

  photoModal.setAttribute('aria-hidden', 'false');
  photoModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePhotoModal() {
  photoModal.classList.remove('open');
  photoModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  // Pause any playing video
  const vid = photoLightbox.querySelector('.photo-lb__video');
  if (vid) vid.pause();
}

function openLightbox(media, index) {
  lbMedia = media;
  lbIndex = index;
  updateLightbox();
  photoLightbox.setAttribute('aria-hidden', 'false');
  photoLightbox.classList.add('open');
}

function closeLightbox() {
  photoLightbox.classList.remove('open');
  photoLightbox.setAttribute('aria-hidden', 'true');
  // Pause video if playing
  const vid = photoLightbox.querySelector('.photo-lb__video');
  if (vid) { vid.pause(); vid.remove(); }
}

function updateLightbox() {
  const src = lbMedia[lbIndex];
  lbCounter.textContent = `${lbIndex + 1} / ${lbMedia.length}`;

  // Remove any existing video
  const oldVid = photoLightbox.querySelector('.photo-lb__video');
  if (oldVid) oldVid.remove();

  if (isVideo(src)) {
    lbImg.style.display = 'none';
    const vid = document.createElement('video');
    vid.src = src;
    vid.className = 'photo-lb__video';
    vid.controls = true;
    vid.autoplay = true;
    vid.playsinline = true;
    photoLightbox.querySelector('.photo-lb__backdrop').insertAdjacentElement('afterend', vid);
  } else {
    lbImg.style.display = '';
    lbImg.style.opacity = '0';
    setTimeout(() => {
      lbImg.src = src;
      lbImg.alt = `Foto ${lbIndex + 1}`;
      lbImg.style.opacity = '1';
    }, 100);
  }
}

function lbNav(dir) {
  // Pause video before navigating
  const vid = photoLightbox.querySelector('.photo-lb__video');
  if (vid) { vid.pause(); vid.remove(); }
  lbImg.style.display = '';
  lbIndex = (lbIndex + dir + lbMedia.length) % lbMedia.length;
  updateLightbox();
}

modalClose.addEventListener('click', closePhotoModal);
modalBackdrop.addEventListener('click', closePhotoModal);
lbClose.addEventListener('click', closeLightbox);
lbBackdrop.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', () => lbNav(-1));
lbNext.addEventListener('click', () => lbNav(1));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape')      { closeLightbox(); closePhotoModal(); }
  if (e.key === 'ArrowLeft')   lbNav(-1);
  if (e.key === 'ArrowRight')  lbNav(1);
});

// Expose for config-loader (cards are built dynamically)
window.__openPhotoModal = openPhotoModal;
window.__openLightbox   = openLightbox;

// ============================
// GALLERY CAROUSEL 3D
// ============================
(function () {
  const track    = document.getElementById('carouselTrack');
  const dotsEl   = document.getElementById('carouselDots');
  const btnPrev  = document.getElementById('carouselPrev');
  const btnNext  = document.getElementById('carouselNext');
  if (!track) return;

  const photos = [
    'photos/barranquismo-guara/IMG_6022.JPG',
    'photos/barranquismo-guara/IMG_6025.JPG',
    'photos/barranquismo/IMG_3984.JPG',
    'photos/escalada/IMG_5334.JPG',
    'photos/escalada/IMG_4564.JPG',
    'photos/grupos/IMG_6027.JPG',
    'photos/viaferrata/IMG_9891.JPG',
    'photos/barranquismo-guara/IMG_3847.JPG',
    'photos/escalada/IMG_9056.JPG',
    'photos/senderismo/IMG_4098.JPG',
    'photos/raquetas/IMG_1444.JPG',
    'photos/raquetas/IMG_1463.JPG',
  ];

  const alts = [
    'Barranquismo Sierra de Guara','Barranco del Mascún',
    'Cascada barranquismo','Escalada en roca',
    'Escalada pared','Trekking en grupo',
    'Vía Ferrata','Rápel en cañón',
    'Escalada técnica','Senderismo montaña',
    'Raquetas de nieve','Nieve y cielo azul',
  ];

  let current = 0;
  const total  = photos.length;

  // Build items
  photos.forEach((src, i) => {
    const item = document.createElement('div');
    item.className = 'gallery-carousel__item';
    const img = document.createElement('img');
    img.src = src; img.alt = alts[i]; img.loading = 'lazy';
    item.appendChild(img);
    track.appendChild(item);
  });

  // Build dots
  photos.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Foto ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });

  function getPos(i) {
    let pos = ((i - current) % total + total) % total;
    if (pos > total / 2) pos -= total;
    return pos;
  }

  function update() {
    const items = Array.from(track.children);
    items.forEach((item, i) => {
      const pos = getPos(i);
      item.className = 'gallery-carousel__item';
      if      (pos ===  0) item.classList.add('is-active');
      else if (pos === -1) item.classList.add('is-prev');
      else if (pos ===  1) item.classList.add('is-next');
      else if (pos === -2) item.classList.add('is-far-prev');
      else if (pos ===  2) item.classList.add('is-far-next');
      else                 item.classList.add('is-hidden');
    });
    Array.from(dotsEl.children).forEach((d, i) =>
      d.classList.toggle('active', i === current));
  }

  function goTo(i) {
    current = ((i % total) + total) % total;
    update();
  }
  function prev() { goTo(current - 1); }
  function next() { goTo(current + 1); }

  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);

  // Click: sides navigate, center opens lightbox
  track.addEventListener('click', e => {
    const item = e.target.closest('.gallery-carousel__item');
    if (!item) return;
    if (item.classList.contains('is-active')) {
      openLightbox(photos, current);
    } else if (item.classList.contains('is-prev') || item.classList.contains('is-far-prev')) {
      prev();
    } else if (item.classList.contains('is-next') || item.classList.contains('is-far-next')) {
      next();
    }
  });

  // Touch swipe
  let touchX = 0;
  track.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
  });

  // Keyboard (solo si lightbox cerrado)
  document.addEventListener('keydown', e => {
    if (photoLightbox.classList.contains('open')) return;
    if (e.key === 'ArrowLeft')  prev();
    if (e.key === 'ArrowRight') next();
  });

  // Auto-avance pausado al hacer hover
  let timer = setInterval(next, 4500);
  track.addEventListener('mouseenter', () => clearInterval(timer));
  track.addEventListener('mouseleave', () => { timer = setInterval(next, 4500); });

  update();
})();

// ============================
// SMOOTH ANCHOR SCROLL
// ============================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 64;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  });
});
