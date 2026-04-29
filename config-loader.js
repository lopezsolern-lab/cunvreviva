// Loads config + applies i18n translations, re-runs on language change
// Written without optional chaining (?.) for maximum Safari compatibility
(function () {
  var config = window.SITE_CONFIG;
  if (!config) { return; }

  function get(obj) {
    var keys = Array.prototype.slice.call(arguments, 1);
    var val = obj;
    for (var i = 0; i < keys.length; i++) {
      if (val == null) return undefined;
      val = val[keys[i]];
    }
    return val;
  }

  function render(lang) {
    var translations = window.TRANSLATIONS || {};
    var tr = translations[lang] || translations['es'] || {};
    var business = config.business;
    var guide    = config.guide;
    var stats    = config.stats;

    // ── html lang attr ───────────────────────────────────────────────────
    document.documentElement.lang = lang;

    // ── Accent color ─────────────────────────────────────────────────────
    if (business.accentColor)
      document.documentElement.style.setProperty('--accent', business.accentColor);

    // ── data-i18n elements ───────────────────────────────────────────────
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var keys = el.dataset.i18n.split('.');
      var val = tr;
      for (var i = 0; i < keys.length; i++) {
        if (val == null) { val = undefined; break; }
        val = val[keys[i]];
      }
      if (val !== undefined) el.textContent = val;
    });

    // ── data-i18n-ph (placeholder) ───────────────────────────────────────
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
      var keys = el.dataset.i18nPh.split('.');
      var val = tr;
      for (var i = 0; i < keys.length; i++) {
        if (val == null) { val = undefined; break; }
        val = val[keys[i]];
      }
      if (val !== undefined) el.placeholder = val;
    });

    // ── stat labels ──────────────────────────────────────────────────────
    document.querySelectorAll('[data-i18n-stat]').forEach(function(el) {
      var i = parseInt(el.dataset.i18nStat);
      if (tr.stats && tr.stats[i]) el.textContent = tr.stats[i];
    });

    // ── Business name ────────────────────────────────────────────────────
    document.querySelectorAll('[data-field="business.name"]').forEach(function(el) {
      el.textContent = business.name;
    });
    var eyebrow = get(tr, 'hero', 'eyebrow') || 'Guía de Aventura';
    document.title = business.name + ' — ' + eyebrow;

    // ── Hero ─────────────────────────────────────────────────────────────
    var heroTitle = document.querySelector('.hero__title');
    var heroTitleText = get(tr, 'hero', 'title');
    if (heroTitle && heroTitleText)
      heroTitle.innerHTML = heroTitleText.replace(/\n/g, '<br/>');

    var heroSub = document.querySelector('.hero__sub');
    var heroSubText = get(tr, 'hero', 'subtitle');
    if (heroSub && heroSubText)
      heroSub.innerHTML = heroSubText.replace(/\n/g, '<br/>');

    // ── Stats numbers ────────────────────────────────────────────────────
    var statNums   = document.querySelectorAll('.stat__num');
    var statPluses = document.querySelectorAll('.stat__plus');
    stats.forEach(function(s, i) {
      if (statNums[i]) {
        statNums[i].dataset.count = s.value;
        statNums[i].textContent = s.value;
        if (window.__animateCounter) window.__animateCounter(statNums[i]);
      }
      if (statPluses[i]) statPluses[i].textContent = s.suffix || '';
    });

    // ── Contact title/sub ────────────────────────────────────────────────
    var ct = document.getElementById('contactTitle');
    var contactTitle = get(tr, 'sections', 'contactTitle');
    if (ct && contactTitle) ct.innerHTML = contactTitle.replace(/\n/g, '<br/>');
    var cs = document.getElementById('contactSub');
    var contactSub = get(tr, 'sections', 'contactSub');
    if (cs && contactSub) cs.textContent = contactSub;

    // ── Services ─────────────────────────────────────────────────────────
    var grid = document.getElementById('services-grid');
    if (grid) {
      var svcTr = tr.services || [];
      grid.innerHTML = config.services.map(function(s) {
        var st = svcTr.filter(function(x) { return x.id === s.id; })[0] || {};
        var title       = st.title       || s.title;
        var description = st.description || s.description;
        var badge       = st.badge       || s.badge;
        var duration    = st.duration    || s.duration;
        var difficulty  = st.difficulty  || s.difficulty;
        var season      = st.season      || s.season;

        var badgeClass = s.badgeColor === 'gold'   ? 'service-card__badge--gold'
                       : s.badgeColor === 'red'    ? 'service-card__badge--red'
                       : s.badgeColor === 'purple' ? 'service-card__badge--purple' : '';

        var formPeople = get(tr, 'form', 'people');
        var personaStr = formPeople ? formPeople.toLowerCase().replace('n.º de ', '') : 'persona';
        var noPriceLabel = get(tr, 'serviceBtn', 'noPrice') || 'Solicitar info';
        var priceLabel   = get(tr, 'serviceBtn', 'price')   || 'Reservar';

        var priceHtml = s.price
          ? 'Desde <strong>' + s.price + '€</strong> / ' + personaStr
          : '<strong>' + noPriceLabel + '</strong>';
        var btnLabel = s.price ? priceLabel : noPriceLabel;
        var btnClass = s.featured ? 'btn--primary' : 'btn--outline';

        return '<div class="service-card ' + (s.featured ? 'service-card--featured' : '') + ' reveal visible">' +
          '<div class="service-card__img">' +
            '<img src="' + s.image + '" alt="' + title + '" loading="lazy" />' +
            '<span class="service-card__badge ' + badgeClass + '">' + badge + '</span>' +
          '</div>' +
          '<div class="service-card__body">' +
            '<h3>' + title + '</h3>' +
            '<p>' + description + '</p>' +
            '<ul class="service-card__details">' +
              '<li>' + iconClock() + ' ' + duration + '</li>' +
              '<li>' + iconStar() + ' ' + difficulty + '</li>' +
              '<li>' + iconCalendar() + ' ' + season + '</li>' +
            '</ul>' +
            '<div class="service-card__price">' + priceHtml + '</div>' +
            '<button class="service-card__photos-btn" data-id="' + s.id + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><circle cx="12" cy="14" r="2"/></svg>' +
              ' Ver fotos' +
            '</button>' +
            '<a href="#contacto" class="btn ' + btnClass + '">' + btnLabel + '</a>' +
          '</div>' +
        '</div>';
      }).join('');

      // Wire up "Ver fotos" buttons
      grid.querySelectorAll('.service-card__photos-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var id  = btn.dataset.id;
          var svc = config.services.filter(function(x) { return x.id === id; })[0];
          var lang2 = window.currentLang || 'es';
          var t2 = window.TRANSLATIONS && window.TRANSLATIONS[lang2] && window.TRANSLATIONS[lang2].services || [];
          var st2 = t2.filter(function(x) { return x.id === id; })[0] || {};
          var title2       = st2.title       || svc.title;
          var description2 = st2.description || svc.description;
          var photos       = svc.photos || [];
          if (window.__openPhotoModal) window.__openPhotoModal(title2, description2, photos);
        });
      });
    }

    // ── Feature banner (handled by data-i18n) ───────────────────────────

    // ── About ────────────────────────────────────────────────────────────
    document.querySelectorAll('[data-field="guide.name"]').forEach(function(el) {
      el.textContent = guide.name;
    });
    var bio1el = document.querySelector('[data-field="guide.bio1"]');
    if (bio1el) bio1el.textContent = tr.bio1 || guide.bio1;
    var bio2el = document.querySelector('[data-field="guide.bio2"]');
    if (bio2el) bio2el.textContent = tr.bio2 || guide.bio2;
    var guidePic = document.querySelector('.about__img > img');
    if (guidePic) guidePic.src = guide.photo;
    var tagsEl = document.querySelector('.about__tags');
    if (tagsEl) {
      var certs = tr.certifications || guide.certifications;
      tagsEl.innerHTML = certs.map(function(c) { return '<span>' + c + '</span>'; }).join('');
    }
    var footerDesc = document.querySelector('[data-field="footer.desc"]');
    var certLabel = tr.certLabel || 'Guía certificado';
    if (footerDesc) footerDesc.innerHTML = certLabel + '.<br/>' + business.location;

    // ── Testimonials ─────────────────────────────────────────────────────
    var testGrid = document.querySelector('.testimonials__grid');
    if (testGrid) {
      var tList = tr.testimonials || config.testimonials;
      testGrid.innerHTML = tList.map(function(t, i) {
        var av = (config.testimonials[i] && config.testimonials[i].avatar) ||
                 ('https://i.pravatar.cc/60?img=' + (10 + i));
        return '<div class="testimonial reveal visible">' +
          '<div class="testimonial__stars">★★★★★</div>' +
          '<p>"' + t.text + '"</p>' +
          '<div class="testimonial__author">' +
            '<img src="' + av + '" alt="' + t.author + '" loading="lazy" />' +
            '<div><strong>' + t.author + '</strong><span>' + t.context + '</span></div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // ── FAQ ──────────────────────────────────────────────────────────────
    var faqList = document.querySelector('.faq__list');
    if (faqList) {
      var fList = tr.faq || config.faq;
      faqList.innerHTML = fList.map(function(f) {
        return '<div class="faq__item reveal visible">' +
          '<button class="faq__question">' +
            f.question +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
          '<div class="faq__answer"><p>' + f.answer + '</p></div>' +
        '</div>';
      }).join('');

      faqList.querySelectorAll('.faq__question').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var item   = btn.parentElement;
          var answer = item.querySelector('.faq__answer');
          var isOpen = item.classList.contains('open');
          faqList.querySelectorAll('.faq__item').forEach(function(i) {
            i.classList.remove('open');
            i.querySelector('.faq__answer').style.maxHeight = '0';
          });
          if (!isOpen) {
            item.classList.add('open');
            answer.style.maxHeight = answer.scrollHeight + 'px';
          }
        });
      });
    }

    // ── Form select options ──────────────────────────────────────────────
    var sel = document.getElementById('servicio');
    if (sel && tr.serviceOptions) {
      var servicePh = get(tr, 'form', 'servicePh') || 'Selecciona una opción…';
      sel.innerHTML = '<option value="">' + servicePh + '</option>' +
        tr.serviceOptions.map(function(o) { return '<option>' + o + '</option>'; }).join('');
    }

    // ── Contact info ─────────────────────────────────────────────────────
    document.querySelectorAll('[data-field="business.email"]').forEach(function(el) {
      el.textContent = business.email;
      if (el.tagName === 'A') el.href = 'mailto:' + business.email;
    });
    document.querySelectorAll('[data-field="business.phone"]').forEach(function(el) {
      el.textContent = business.phone;
      if (el.tagName === 'A') el.href = 'tel:' + business.phone.replace(/\s/g, '');
    });
    document.querySelectorAll('[data-field="business.instagram"]').forEach(function(el) {
      el.textContent = business.instagram;
    });
  }

  // ── Initial render ───────────────────────────────────────────────────────
  render(window.currentLang || 'es');

  // ── Re-render on language change ─────────────────────────────────────────
  document.addEventListener('langChange', function(e) { render(e.detail); });

  // ── SVG helpers ──────────────────────────────────────────────────────────
  function iconClock() {
    return '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3v4l3 2" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>';
  }
  function iconStar() {
    return '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5l3.5-.5z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>';
  }
  function iconCalendar() {
    return '<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>';
  }
})();
