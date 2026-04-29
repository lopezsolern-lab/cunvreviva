// Loads config + applies i18n translations, re-runs on language change
(function () {
  const config = window.SITE_CONFIG;
  if (!config) { console.error('SITE_CONFIG not found'); return; }

  function render(lang) {
    const tr = window.TRANSLATIONS?.[lang] || window.TRANSLATIONS?.es || {};
    const { business, guide, stats } = config;

    // ── html lang attr ────────────────────────────────────────────────────
    document.documentElement.lang = lang;

    // ── Accent color ──────────────────────────────────────────────────────
    if (business.accentColor)
      document.documentElement.style.setProperty('--accent', business.accentColor);

    // ── data-i18n elements ────────────────────────────────────────────────
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const keys = el.dataset.i18n.split('.');
      let val = tr;
      for (const k of keys) val = val?.[k];
      if (val !== undefined) el.textContent = val;
    });

    // ── data-i18n-ph (placeholder) ────────────────────────────────────────
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const keys = el.dataset.i18nPh.split('.');
      let val = tr;
      for (const k of keys) val = val?.[k];
      if (val !== undefined) el.placeholder = val;
    });

    // ── stat labels ───────────────────────────────────────────────────────
    document.querySelectorAll('[data-i18n-stat]').forEach(el => {
      const i = parseInt(el.dataset.i18nStat);
      if (tr.stats?.[i]) el.textContent = tr.stats[i];
    });

    // ── Business name ─────────────────────────────────────────────────────
    document.querySelectorAll('[data-field="business.name"]').forEach(el => el.textContent = business.name);
    document.title = `${business.name} — ${tr.hero?.eyebrow || 'Guía de Aventura'}`;

    // ── Hero ──────────────────────────────────────────────────────────────
    const heroTitle = document.querySelector('.hero__title');
    if (heroTitle && tr.hero?.title)
      heroTitle.innerHTML = tr.hero.title.replace(/\n/g, '<br/>');

    const heroSub = document.querySelector('.hero__sub');
    if (heroSub && tr.hero?.subtitle)
      heroSub.innerHTML = tr.hero.subtitle.replace(/\n/g, '<br/>');

    // ── Stats numbers ─────────────────────────────────────────────────────
    const statNums   = document.querySelectorAll('.stat__num');
    const statPluses = document.querySelectorAll('.stat__plus');
    stats.forEach((s, i) => {
      if (statNums[i]) {
        statNums[i].dataset.count = s.value;
        statNums[i].textContent = s.value;
        // Re-animate in case the counter observer already fired before config loaded
        if (window.__animateCounter) window.__animateCounter(statNums[i]);
      }
      if (statPluses[i]) statPluses[i].textContent = s.suffix || '';
    });

    // ── Contact title/sub ─────────────────────────────────────────────────
    const ct = document.getElementById('contactTitle');
    if (ct && tr.sections?.contactTitle)
      ct.innerHTML = tr.sections.contactTitle.replace(/\n/g, '<br/>');
    const cs = document.getElementById('contactSub');
    if (cs && tr.sections?.contactSub) cs.textContent = tr.sections.contactSub;

    // ── Services ──────────────────────────────────────────────────────────
    const grid = document.getElementById('services-grid');
    if (grid) {
      const svcTr = tr.services || [];
      grid.innerHTML = config.services.map(s => {
        const st = svcTr.find(x => x.id === s.id) || {};
        const title       = st.title       || s.title;
        const description = st.description || s.description;
        const badge       = st.badge       || s.badge;
        const duration    = st.duration    || s.duration;
        const difficulty  = st.difficulty  || s.difficulty;
        const season      = st.season      || s.season;

        const badgeClass = s.badgeColor === 'gold'   ? 'service-card__badge--gold'
                         : s.badgeColor === 'red'    ? 'service-card__badge--red'
                         : s.badgeColor === 'purple' ? 'service-card__badge--purple' : '';
        const priceHtml  = s.price
          ? `Desde <strong>${s.price}€</strong> / ${tr.form?.people ? tr.form.people.toLowerCase().replace('n.º de ','') : 'persona'}`
          : `<strong>${tr.serviceBtn?.noPrice || 'Solicitar info'}</strong>`;
        const btnLabel  = s.price ? (tr.serviceBtn?.price || 'Reservar') : (tr.serviceBtn?.noPrice || 'Solicitar info');
        const btnClass  = s.featured ? 'btn--primary' : 'btn--outline';

        return `
        <div class="service-card ${s.featured ? 'service-card--featured' : ''} reveal visible">
          <div class="service-card__img">
            <img src="${s.image}" alt="${title}" loading="lazy" />
            <span class="service-card__badge ${badgeClass}">${badge}</span>
          </div>
          <div class="service-card__body">
            <h3>${title}</h3>
            <p>${description}</p>
            <ul class="service-card__details">
              <li>${iconClock()} ${duration}</li>
              <li>${iconStar()} ${difficulty}</li>
              <li>${iconCalendar()} ${season}</li>
            </ul>
            <div class="service-card__price">${priceHtml}</div>
            <button class="service-card__photos-btn" data-id="${s.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><circle cx="12" cy="14" r="2"/></svg>
              Ver fotos
            </button>
            <a href="#contacto" class="btn ${btnClass}">${btnLabel}</a>
          </div>
        </div>`;
      }).join('');

      // ── Wire up "Ver fotos" buttons ─────────────────────────────────────
      grid.querySelectorAll('.service-card__photos-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const id  = btn.dataset.id;
          const svc = config.services.find(x => x.id === id);
          const tr  = (window.TRANSLATIONS?.[window.currentLang || 'es']?.services || []).find(x => x.id === id) || {};
          const title       = tr.title       || svc.title;
          const description = tr.description || svc.description;
          const photos      = svc.photos || [];
          if (window.__openPhotoModal) window.__openPhotoModal(title, description, photos);
        });
      });
    }

    // ── Feature banner ────────────────────────────────────────────────────
    const bannerTitle = document.querySelector('[data-field="banner.title"]');
    if (bannerTitle) bannerTitle.textContent = config.featureBanner.title;
    const bannerSub = document.querySelector('[data-field="banner.subtitle"]');
    if (bannerSub) bannerSub.textContent = config.featureBanner.subtitle;

    // ── About ─────────────────────────────────────────────────────────────
    document.querySelectorAll('[data-field="guide.name"]').forEach(el => el.textContent = guide.name);
    const bio1 = document.querySelector('[data-field="guide.bio1"]');
    if (bio1) bio1.textContent = tr.bio1 || guide.bio1;
    const bio2 = document.querySelector('[data-field="guide.bio2"]');
    if (bio2) bio2.textContent = tr.bio2 || guide.bio2;
    const guidePic = document.querySelector('.about__img > img');
    if (guidePic) guidePic.src = guide.photo;
    const tagsEl = document.querySelector('.about__tags');
    if (tagsEl) tagsEl.innerHTML = (tr.certifications || guide.certifications).map(c => `<span>${c}</span>`).join('');
    const footerDesc = document.querySelector('[data-field="footer.desc"]');
    if (footerDesc) footerDesc.innerHTML = `${tr.certLabel || 'Guía certificado'}.<br/>${business.location}`;

    // ── Testimonials ──────────────────────────────────────────────────────
    const testGrid = document.querySelector('.testimonials__grid');
    if (testGrid) {
      const tList = tr.testimonials || config.testimonials;
      testGrid.innerHTML = tList.map((t, i) => {
        const av = config.testimonials[i]?.avatar || `https://i.pravatar.cc/60?img=${10 + i}`;
        return `
        <div class="testimonial reveal visible">
          <div class="testimonial__stars">★★★★★</div>
          <p>"${t.text}"</p>
          <div class="testimonial__author">
            <img src="${av}" alt="${t.author}" loading="lazy" />
            <div><strong>${t.author}</strong><span>${t.context}</span></div>
          </div>
        </div>`;
      }).join('');
    }

    // ── FAQ ───────────────────────────────────────────────────────────────
    const faqList = document.querySelector('.faq__list');
    if (faqList) {
      const fList = tr.faq || config.faq;
      faqList.innerHTML = fList.map(f => `
      <div class="faq__item reveal visible">
        <button class="faq__question">
          ${f.question}
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="faq__answer"><p>${f.answer}</p></div>
      </div>`).join('');

      faqList.querySelectorAll('.faq__question').forEach(btn => {
        btn.addEventListener('click', () => {
          const item   = btn.parentElement;
          const answer = item.querySelector('.faq__answer');
          const isOpen = item.classList.contains('open');
          faqList.querySelectorAll('.faq__item').forEach(i => {
            i.classList.remove('open');
            i.querySelector('.faq__answer').style.maxHeight = '0';
          });
          if (!isOpen) { item.classList.add('open'); answer.style.maxHeight = answer.scrollHeight + 'px'; }
        });
      });
    }

    // ── Form select options ───────────────────────────────────────────────
    const sel = document.getElementById('servicio');
    if (sel && tr.serviceOptions) {
      const placeholder = tr.form?.servicePh || 'Selecciona una opción…';
      sel.innerHTML = `<option value="">${placeholder}</option>` +
        tr.serviceOptions.map(o => `<option>${o}</option>`).join('');
    }

    // ── Contact info ──────────────────────────────────────────────────────
    document.querySelectorAll('[data-field="business.email"]').forEach(el => {
      el.textContent = business.email;
      if (el.tagName === 'A') el.href = `mailto:${business.email}`;
    });
    document.querySelectorAll('[data-field="business.phone"]').forEach(el => {
      el.textContent = business.phone;
      if (el.tagName === 'A') el.href = `tel:${business.phone.replace(/\s/g, '')}`;
    });
    document.querySelectorAll('[data-field="business.instagram"]').forEach(el => el.textContent = business.instagram);

    // ── Gallery video title ───────────────────────────────────────────────
    const videoLabel = document.querySelector('.gallery__video-label');
    if (videoLabel && tr.videoTitle) videoLabel.textContent = tr.videoTitle;

    // ── YouTube video ID from config ──────────────────────────────────────
    const yt = document.getElementById('galleryVideo');
    if (yt && config.gallery?.youtubeId && !config.gallery.youtubeId.includes('PON_AQUI')) {
      yt.src = `https://www.youtube.com/embed/${config.gallery.youtubeId}?rel=0&modestbranding=1`;
    }
  }

  // ── Initial render ────────────────────────────────────────────────────────
  render(window.currentLang || 'es');

  // ── Re-render on language change ──────────────────────────────────────────
  document.addEventListener('langChange', (e) => render(e.detail));

  // ── SVG helpers ───────────────────────────────────────────────────────────
  function iconClock()    { return `<svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3v4l3 2" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>`; }
  function iconStar()     { return `<svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5l3.5-.5z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>`; }
  function iconCalendar() { return `<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>`; }
})();
