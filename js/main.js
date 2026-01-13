/* Dr. Smartphone 48 — main.js (Amber + Animations + Mega Menu) */
(() => {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* -------------------------
     Preloader (Battery)
     ------------------------- */
  function ensurePreloader() {
    if (prefersReduced) return null;

    let pre = $('.preloader');
    if (pre) return pre;

    pre = document.createElement('div');
    pre.className = 'preloader';
    pre.setAttribute('aria-hidden', 'true');
    pre.innerHTML = `
      <div class="preloader-inner shimmer">
        <div class="preloader-title">Systemcheck läuft…</div>
        <div class="preloader-subtitle">Einen Moment – wir laden die Seite sauber hoch.</div>
        <div class="battery" aria-hidden="true">
          <div class="battery-fill"></div>
          <svg class="battery-bolt" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"></path>
          </svg>
        </div>
        <div class="text-muted text-sm">Optimiert für schnelle Buchung und klare Infos.</div>
      </div>
    `;
    document.body.insertAdjacentElement('afterbegin', pre);
    return pre;
  }

  function hidePreloader(pre, startedAt) {
    if (!pre) return;
    const minMs = 700;
    const elapsed = Date.now() - startedAt;
    const wait = Math.max(0, minMs - elapsed);
    window.setTimeout(() => pre.classList.add('is-done'), wait);
  }

  /* -------------------------
     Mega Menu
     ------------------------- */
  function initMegaMenu() {
    const btn = $('.menu-btn');
    const panel = $('#mega-menu');
    const closeBtn = $('.mega-close', panel || document);

    if (!btn || !panel) return;

    const open = () => {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
      document.documentElement.style.overflow = 'hidden';
      // Focus first link for accessibility
      const firstLink = $('.mega-link', panel);
      if (firstLink) firstLink.focus({ preventScroll: true });
    };

    const close = () => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      document.documentElement.style.overflow = '';
      btn.focus({ preventScroll: true });
    };

    btn.addEventListener('click', () => {
      panel.classList.contains('is-open') ? close() : open();
    });

    if (closeBtn) closeBtn.addEventListener('click', close);

    panel.addEventListener('click', (e) => {
      // Click outside the card closes
      if (e.target === panel) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
    });
  }

  /* -------------------------
     Reveal Animations (Scroll)
     ------------------------- */
  function initReveal() {
    if (prefersReduced) {
      // Make sure content is visible without animations
      $$('.reveal').forEach(el => el.classList.add('is-visible'));
      return;
    }

    // Auto-tag typical elements if not already tagged
    const auto = [
      '.section-header', '.service-card', '.testimonial-card', '.google-reviews-card',
      '.gallery-tile', '.faq-item', '.cta-card', '.card', '.tracking-form', '.tracking-result',
      '.legal-card', '.contact-card', '.order-card', '.stat-card', '.footer-grid'
    ];
    auto.forEach(sel => {
      $$(sel).forEach(el => {
        if (!el.classList.contains('reveal')) el.classList.add('reveal');
      });
    });

    // Hero specific
    const heroLogo = $('.hero-logo');
    if (heroLogo) {
      heroLogo.classList.add('reveal', 'float');
      heroLogo.style.setProperty('--delay', '180ms');
    }
    const heroContent = $('.hero-content');
    if (heroContent) {
      heroContent.classList.add('reveal');
      heroContent.style.setProperty('--delay', '80ms');
    }

    // Stagger within groups
    const groups = [
      { root: '.services-grid', item: '.service-card', base: 0 },
      { root: '.google-gallery', item: '.gallery-tile', base: 0 },
      { root: '.faq-list', item: '.faq-item', base: 0 },
      { root: '.footer-grid', item: 'a, p, div', base: 0 }
    ];
    groups.forEach(g => {
      const root = $(g.root);
      if (!root) return;
      const items = $$(g.item, root).slice(0, 18);
      items.forEach((el, i) => {
        if (!el.classList.contains('reveal')) el.classList.add('reveal');
        el.style.setProperty('--delay', `${g.base + i * 60}ms`);
      });
    });

    const items = $$('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach(el => io.observe(el));
  }

  /* -------------------------
     FAQ Accordion (optional)
     ------------------------- */
  function initFaq() {
    const buttons = $$('.faq-question');
    if (!buttons.length) return;

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        if (!item) return;
        const open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* -------------------------
     Boot
     ------------------------- */
  const startedAt = Date.now();
  const pre = ensurePreloader();

  document.addEventListener('DOMContentLoaded', () => {
    initMegaMenu();
    initFaq();
    initReveal();
  });

  window.addEventListener('load', () => {
    hidePreloader(pre, startedAt);
  });
})();
