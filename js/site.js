/* =====================================================================
   Bunker Danmark · V12 · page script
   Smooth scroll (Lenis), reveals, the pinned process, parallax, nav,
   the FAQ, the two forms. Vendor: js/vendor/{gsap,ScrollTrigger,lenis}.
   ===================================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- smooth scroll ---------- */
  let lenis = null, tick = null;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.08, smoothWheel: true, wheelMultiplier: 0.9 });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      tick = (t) => { if (lenis) lenis.raf(t * 1000); };
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    window.lenis = lenis;
    window.__lenis = lenis;
  }
  /* QA hook: the walk scripts kill smooth scroll before measuring */
  window.__replicaStopScroll = () => { if (lenis) { lenis.destroy(); lenis = null; window.lenis = null; window.__lenis = null; if (tick && hasGsap) gsap.ticker.remove(tick); } };

  const scrollToEl = (el) => {
    if (!el) return;
    const offset = el.id === 'top' ? 0 : -(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0) * 0;
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 3) });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  /* anchor links */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : document.body;
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToEl(target);
      history.replaceState(null, '', '#' + id);
    });
  });

  /* ---------- nav ---------- */
  const nav = $('#nav');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    nav.classList.toggle('is-scrolled', y > 40);
    lastY = y;
  };
  onScroll();
  if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });

  /* mobile menu */
  const menu = $('#menu');
  const menuBtn = $('.nav__menu');
  const openMenu = () => {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    menuBtn.setAttribute('aria-expanded', 'true');
    nav.classList.add('is-scrolled');
    if (lenis) lenis.stop();
    document.documentElement.style.overflow = 'hidden';
  };
  const closeMenu = () => {
    if (menu.hidden) return;
    menu.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
    document.documentElement.style.overflow = '';
    setTimeout(() => { menu.hidden = true; onScroll(); }, 500);
  };
  menuBtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- hero intro ---------- */
  const hero = $('.hero');
  const startHero = () => { hero.classList.add('is-in'); document.body.classList.add('is-in'); };
  if (reduce) startHero();
  else {
    const img = $('.hero__media img');
    const go = () => setTimeout(startHero, 220);
    if (img && !img.complete) { img.addEventListener('load', go, { once: true }); setTimeout(startHero, 1800); }
    else go();
  }

  /* ---------- reveals ---------- */
  const revealTargets = $$('[data-reveal], [data-lines]');
  /* the order of arrival, by role: headline 0, text 0.15, picture 0.25, small things and the button 0.35.
     Siblings inside a [data-stagger] group follow each other 0.18s apart on top of their role. */
  const role = (el) => {
    if (el.matches('h1, h2, h3')) return 0;
    if (el.matches('figure, img, .fordel')) return 0.25;
    if (el.matches('.btn, .form__note, .room__list li, .hero__facts')) return 0.35;
    return 0.15;
  };
  revealTargets.forEach((el) => { if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', role(el).toFixed(2) + 's'); });
  $$('[data-stagger]').forEach((group) => {
    const step = group.classList.contains('faq__accordion') ? 0.06 : 0.18;
    $$('[data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', (role(el) + i * step).toFixed(2) + 's'));
  });
  /* The FAQ list arrives as one block. Watching each row on its own meant the bottom rows only
     started once they had scrolled into view, so the list was still arriving after the reader
     had gone past it. The group is watched instead, and the rows follow each other from there. */
  const blocks = [{ els: $$('.faq__accordion'), margin: '0px 0px -6% 0px' }];
  const inBlock = new Set();
  blocks.forEach((b) => b.els.forEach((g) => $$('[data-reveal], [data-lines]', g).forEach((el) => inBlock.add(el))));
  const solo = revealTargets.filter((el) => !inBlock.has(el));
  if (reduce || !('IntersectionObserver' in window)) revealTargets.forEach((el) => el.classList.add('is-in'));
  else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
    solo.forEach((el) => io.observe(el));
    blocks.forEach((b) => {
      const bio = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          $$('[data-reveal], [data-lines]', en.target).forEach((el) => el.classList.add('is-in'));
          bio.unobserve(en.target);
        });
      }, { rootMargin: b.margin, threshold: 0.01 });
      b.els.forEach((g) => bio.observe(g));
    });
  }

  /* ---------- smoothing ----------
     Scroll sets a target; the painted value eases toward it every frame, so
     nothing linked to the wheel ever snaps. k is the share closed per frame. */
  const eased = [];
  const smooth = (apply, k = 0.11) => {
    const it = { v: null, t: 0, k, apply };
    eased.push(it);
    return (t) => { it.t = t; if (it.v === null || reduce || !hasGsap) { it.v = t; apply(t); } };
  };
  if (hasGsap && !reduce) gsap.ticker.add(() => {
    eased.forEach((it) => {
      if (it.v === null) return;
      const d = it.t - it.v;
      if (Math.abs(d) < 0.0004) { if (it.v !== it.t) { it.v = it.t; it.apply(it.v); } return; }
      it.v += d * it.k; it.apply(it.v);
    });
  });

  /* ---------- sheets ----------
     Three photographs are pinned (.sheet--pin): they park with their floor on
     the viewport floor (--stick is 100svh minus their height) and the next
     section slides up over them, dimming them through --cover. Everything
     else scrolls as a page. */
  /* the page gutter must not count the scrollbar, or the content grid drifts */
  const setGutter = () => document.documentElement.style.setProperty('--sbw', (window.innerWidth - document.documentElement.clientWidth) + 'px');
  setGutter();
  window.addEventListener('resize', setGutter);

  const pins = $$('.sheet--pin');
  const fitSheets = () => {
    const vh = window.innerHeight;
    pins.forEach((s) => s.style.setProperty('--stick', Math.min(0, vh - s.offsetHeight) + 'px'));
  };
  if (!reduce) {
    fitSheets();
    window.addEventListener('resize', fitSheets);
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(fitSheets); pins.forEach((s) => ro.observe(s)); }
    if (hasGsap) {
      pins.forEach((s) => {
        const over = s.nextElementSibling;
        if (!over) return;
        const setCover = smooth((v) => s.style.setProperty('--cover', (v * 0.5).toFixed(3)), 0.14);
        ScrollTrigger.create({ trigger: over, start: 'top bottom', end: 'top top', onUpdate: (st) => setCover(st.progress) });
      });
    }
  }

  /* ---------- the reading voice ----------
     Every .read paragraph is split into words (kept whole so lines wrap as
     before) and characters. The letters turn from grey to ink as the line
     crosses the reading window, from 82% of the viewport up to the midline. */
  const splitRead = (pEl) => {
    const out = [];
    const split = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            Array.from(tok).forEach((ch) => { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; w.appendChild(c); out.push(c); });
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) split(n);
      });
    };
    split(pEl);
    return out;
  };
  const narrow = window.matchMedia('(max-width: 1100px)');
  /* returns a reader: call it on scroll, it paints every paragraph and hands back each one's progress */
  const makeReader = (ps) => {
    const chars = ps.map(splitRead);
    const lit = ps.map(() => 0);
    const paint = (i, k) => {
      const cs = chars[i]; if (k === lit[i]) return;
      const from = Math.min(k, lit[i]), to = Math.max(k, lit[i]);
      for (let n = from; n < to; n++) cs[n].classList.toggle('on', n < k);
      lit[i] = k;
    };
    const all = () => ps.forEach((_, i) => paint(i, chars[i].length));
    const read = () => {
      const vh = window.innerHeight;
      const start = vh * (narrow.matches ? 0.95 : 0.82), span = vh * (narrow.matches ? 0.3 : 0.32);
      return ps.map((el, i) => {
        const p = Math.max(0, Math.min(1, (start - el.getBoundingClientRect().top) / span));
        paint(i, Math.round(p * chars[i].length));
        return p;
      });
    };
    return { read, all };
  };

  /* ---------- bunkeren: three statements ---------- */
  const intro = $('.intro');
  if (intro) {
    const reader = makeReader($$('.read', intro));
    if (hasGsap && !reduce) {
      ScrollTrigger.create({ trigger: intro, start: 'top bottom', end: 'bottom top', onUpdate: reader.read, onEnter: reader.read, onEnterBack: reader.read, onRefresh: reader.read });
      reader.read();
    } else reader.all();
  }

  /* ---------- sådan foregår det ----------
     The beats fill as they are read; each beat's picture dissolves in over the last one.
     2026-09-14, Patrick: "the paragraph placement is off and the picture switches at the wrong time". Measured on
     the real page (qa/steps-probe.mjs): at 1470x860 the first paragraph sat 229px above the frame's centre when the
     frame pinned, and pictures 3 and 4 came in while the previous paragraph was still at the frame's centre, because
     a picture changed as soon as its paragraph was 15% read near the bottom of the screen. Now:
     - the reading line is the frame's centre on a wide screen, and the middle of the text area under the stuck frame
       when the section is one column;
     - the list is padded from measured heights, so the first paragraph is on that line when the frame pins and the
       last one is on it when the frame lets go;
     - a picture changes when the midpoint between two paragraphs crosses the line, so the picture on screen always
       belongs to the paragraph nearest the line. */
  const steps = $('.steps');
  if (steps) {
    const items = $$('.step', steps), imgs = $$('.steps__img', steps);
    const paras = items.map((li) => $('p', li));
    const reader = makeReader(paras);
    const list = $('.steps__list', steps), grid = $('.steps__grid', steps), media = $('.steps__media', steps);
    const pin = $('.steps__pin', steps), frame = $('.steps__frame', steps);
    let active = -1;
    /* the pictures stack like V11's: every picture up to the current one stays on, the new one settles over them */
    const place = (i) => {
      if (i === active) return;
      active = i;
      items.forEach((el, k) => el.classList.toggle('is-active', k === i));
      imgs.forEach((fig, k) => fig.classList.toggle('is-on', k <= i));
    };
    const centre = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
    const readingLine = () => { const f = frame.getBoundingClientRect(); return narrow.matches ? (f.bottom + window.innerHeight) / 2 : f.top + f.height / 2; };
    const fit = () => {
      list.style.paddingTop = '0px'; list.style.paddingBottom = '0px';
      const vh = window.innerHeight;
      const listOff = list.getBoundingClientRect().top - grid.getBoundingClientRect().top;
      const h0 = paras[0].getBoundingClientRect().height, hN = paras[paras.length - 1].getBoundingClientRect().height;
      const f = frame.getBoundingClientRect();
      let line, top;
      if (narrow.matches) {
        /* one column: the frame sticks under the bar; the line is the middle of what is left below it */
        const stuck = parseFloat(getComputedStyle(media).top) || 0;
        line = (stuck + (f.bottom - media.getBoundingClientRect().top) + vh) / 2;
        top = line - stuck - listOff - h0 / 2;
      } else {
        /* two columns: the frame's centre inside the pinned full-height box is where it sits on screen while pinned */
        line = (f.top - pin.getBoundingClientRect().top) + f.height / 2;
        top = line - listOff - h0 / 2;
      }
      list.style.paddingTop = Math.max(0, Math.round(top)) + 'px';
      list.style.paddingBottom = Math.max(0, Math.round(vh - line - hN / 2)) + 'px';
    };
    /* 2026-09-16, Patrick: the pictures slid down while the text scrolled, and it fought the dissolve.
       The slow drift of the pinned pictures is gone; they hold still and only dissolve into each other. */
    const read = () => {
      reader.read();
      const line = readingLine();
      let o = 0;
      for (let i = 1; i < paras.length; i++) if ((centre(paras[i - 1]) + centre(paras[i])) / 2 <= line) o = i;
      place(o);
    };
    if (hasGsap && !reduce) {
      fit();
      ScrollTrigger.addEventListener('refreshInit', fit);
      ScrollTrigger.create({ trigger: steps, start: 'top bottom', end: 'bottom top', onUpdate: read, onEnter: read, onEnterBack: read, onRefresh: read });
      read();
    } else {
      reader.all();
      imgs.forEach((fig) => fig.classList.add('is-on'));
      place(items.length - 1);
    }
    window.__stepsActive = () => active;
  }

  /* ---------- the room's text rides in on the scroll ----------
     2026-09-16, Patrick: a timed fade was either late (text still missing with the sheet on screen) or, started
     early, invisible. So the scroll itself moves the text: as the sheet climbs from the foot of the screen to its
     place, the two headline lines and the three paragraphs rise 36px and fade in, one after the other, and the
     motion follows the wheel through a short catch-up. Fully in by the time the sheet is two thirds up; complete
     whatever the speed, because it is tied to position, not time. */
  const room = $('.room');
  if (room) {
    const rise = $$('[data-rise]', room);
    if (hasGsap && !reduce) {
      gsap.set(rise, { y: 36, opacity: 0 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: room, start: 'top 92%', end: 'top 30%', scrub: 0.7 } });
      tl.to(rise, { y: 0, opacity: 1, ease: 'power2.out', duration: 1, stagger: 0.16 });
    }
  }

  /* ---------- over og under ---------- */
  const ground = $('.ground');
  if (ground && !reduce && hasGsap) {
    const stage = $('.ground__stage', ground);
    stage.style.setProperty('--open', '0');
    const setOpen = smooth((v) => stage.style.setProperty('--open', (v * 100).toFixed(2)), 0.1);
    ScrollTrigger.create({ trigger: $('.ground__track', ground), start: 'top top', end: 'bottom bottom', onUpdate: (st) => {
      const e = Math.max(0, Math.min(1, (st.progress - 0.15) / 0.55));
      setOpen(e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2);
    } });
  } else if (ground) { $('.ground__stage', ground).style.setProperty('--open', '50'); }

  /* ---------- the hero lets go: copy rises and fades, the photograph sinks ---------- */
  if (hasGsap && !reduce) {
    gsap.to('.hero__content', { yPercent: -14, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 } });
    gsap.to('.hero__media', { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
  }

  /* ---------- the hero photograph leans away from the cursor ----------
     Patrick, 2026-09-13: slow and smooth, but it must clearly follow the cursor, never drift on its own.
     Patrick, 2026-09-16: still too fast and jumpy. Three causes fixed here: the catch-up was a share per
     frame, so a 120Hz screen moved it twice as fast; the cursor crossing the bar or leaving the window
     snapped the target to zero and the picture swung back; the picture reacted to every jitter of the hand.
     Now the target itself is smoothed first (a hand twitch barely registers), then the picture glides after
     it, both by time, not by frame: the picture closes 63% of the remaining distance every 0.8s, whatever
     the screen's refresh rate. At most 12px by 9px, direction still instant, no breathing, no random motion. */
  if (hasGsap && !reduce && window.matchMedia('(pointer: fine)').matches) {
    const media = $('.hero__media');
    const raw = { x: 0, y: 0 }, want = { x: 0, y: 0 }, have = { x: 0, y: 0 };
    const AX = -12, AY = -9, T_WANT = 0.25, T_HAVE = 0.8;
    window.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      if (r.bottom <= 0) return;
      raw.x = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5)) * AX;
      raw.y = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5)) * AY;
    }, { passive: true });
    let last = null;
    gsap.ticker.add((t) => {
      const dt = last === null ? 0.016 : Math.min(0.05, t - last); last = t;
      const kw = 1 - Math.exp(-dt / T_WANT), kh = 1 - Math.exp(-dt / T_HAVE);
      want.x += (raw.x - want.x) * kw; want.y += (raw.y - want.y) * kw;
      const dx = want.x - have.x, dy = want.y - have.y;
      if (Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005) return;
      have.x += dx * kh; have.y += dy * kh;
      gsap.set(media, { x: have.x, y: have.y });
    });
  }

  /* ---------- parallax: a picture moves slower than the text around it ---------- */
  if (hasGsap && !reduce) {
    $$('[data-parallax]').forEach((img) => {
      const section = img.closest('section');
      /* the photograph drifts while its section climbs into frame, then lands
         and holds still. Nothing keeps moving under a section you are reading. */
      gsap.fromTo(img, { yPercent: -6 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: 1 } });
    });
  }

  /* ---------- the three cards: light follows the hand, the pictures sit deep ----------
     2026-09-17, Patrick: more depth and a little micro interaction, quieter than V11, premium.
     The pointer's place on the card is written as --mx / --my and its presence as --lit; the css draws a
     rim light and a faint sheen from them and lifts the card 4px. Every value glides (a share of the
     distance per frame), so the light trails the hand and nothing snaps; it fades out faster than it
     arrives. Fine pointers only. The photographs drift inside their frames, slower than the page, until
     the sheet parks; then they hold still. */
  const usps = $$('.room__usps .fordel');
  if (usps.length && hasGsap && !reduce) {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const st = usps.map((el) => ({ el, x: 50, y: 0, tx: 50, ty: 0, lit: 0, tlit: 0 }));
      usps.forEach((el, i) => {
        const s = st[i];
        const at = (e) => { const r = el.getBoundingClientRect(); s.tx = (e.clientX - r.left) / r.width * 100; s.ty = (e.clientY - r.top) / r.height * 100; };
        el.addEventListener('pointerenter', (e) => { at(e); s.x = s.tx; s.y = s.ty; s.tlit = 1; });
        el.addEventListener('pointermove', at);
        el.addEventListener('pointerleave', () => { s.tlit = 0; });
      });
      gsap.ticker.add(() => {
        st.forEach((s) => {
          if (s.tlit === 0 && s.lit === 0) return;
          s.x += (s.tx - s.x) * 0.07; s.y += (s.ty - s.y) * 0.07;
          s.lit += (s.tlit - s.lit) * (s.tlit > s.lit ? 0.045 : 0.075);
          if (s.tlit === 0 && s.lit < 0.003) s.lit = 0;
          s.el.style.setProperty('--mx', s.x.toFixed(2) + '%');
          s.el.style.setProperty('--my', s.y.toFixed(2) + '%');
          s.el.style.setProperty('--lit', s.lit.toFixed(3));
        });
      });
    }
    const sheet = usps[0].closest('section');
    usps.forEach((el) => {
      const img = $('.fordel__media img', el);
      if (img) gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', endTrigger: sheet, end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true } });
    });
  }

  /* ---------- depth: layers drift at their own speed ----------
     data-depth is a share of the viewport: positive runs ahead of the scroll
     (foreground), negative lags behind it (background). The catch-up makes it
     glide instead of track the wheel one to one. */
  if (hasGsap && !reduce) {
    $$('[data-depth]').forEach((el) => {
      const d = parseFloat(el.dataset.depth) || 0;
      const section = el.closest('section') || el;
      const h = () => window.innerHeight * d * 0.5;
      gsap.fromTo(el, { y: () => h() }, { y: () => -h(), ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.9, invalidateOnRefresh: true } });
    });
  }

  /* ---------- FAQ: <details>, opened and closed with a height tween ---------- */
  $$('.acc').forEach((item) => {
    const summary = $('.acc__summary', item);
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.open) {
        item.classList.remove('is-open');
        setTimeout(() => { if (!item.classList.contains('is-open')) item.open = false; }, 560);
      } else {
        item.open = true;
        requestAnimationFrame(() => item.classList.add('is-open'));
      }
    });
  });

  /* ---------- forms ----------
     Web3Forms. The access key is issued to mst@fineas.io and pasted into
     LEAD_KEY at launch. Until then both forms say, truthfully, that they are
     not connected. Same wiring as V11 (walkthrough D9). */
  const LEAD_ENDPOINT = 'https://api.web3forms.com/submit';
  const LEAD_KEY = ''; // launch blocker: the Web3Forms access key from Magnus's mail
  const leadPayload = (fields) => JSON.stringify({
    access_key: LEAD_KEY,
    subject: 'Ny henvendelse fra Bunker Danmark-siden',
    from_name: 'Bunker Danmark',
    ...fields,
    page: location.href,
  });
  const sendLead = async (fields) => {
    if (!LEAD_KEY) throw new Error('LEAD_KEY is not set');
    const res = await fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: leadPayload(fields) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json().catch(() => ({}));
    if (data.success === false) throw new Error(data.message || 'rejected');
  };
  const DONE_NOTE = 'Tak. Vi ser på din grund og vender tilbage inden for et par dage.';
  const FAIL_NOTE = 'Noget gik galt. Ring til os på +45 71 99 44 21, eller prøv igen om lidt.';
  const DEMO_NOTE = 'Adressetjekket er ikke koblet til endnu. <a href="#kontakt">Skriv til os her</a>, så ser vi på din grund.';
  const FORM_NOTE = 'Formularen er ikke koblet til endnu. Den sender til Bunker Danmark inden lancering.';

  /* the hero check: one field, one button */
  const check = $('.hero__check');
  if (check) {
    const input = $('input', check);
    const button = $('button', check);
    const status = $('.hero__status');
    const idle = button.textContent;
    const say = (state, html) => { status.dataset.state = state || ''; status.innerHTML = html || ''; if (state) button.dataset.state = state; else delete button.dataset.state; };
    check.addEventListener('submit', async (e) => {
      e.preventDefault();
      const adresse = input.value.trim();
      if (adresse.length < 5) { say('error', 'Skriv adressen på grunden først.'); input.focus(); return; }
      say('pending', 'Sender din adresse.'); button.textContent = 'Sender';
      try {
        await sendLead({ adresse, source: 'hero' });
        say('done', DONE_NOTE); button.textContent = 'Modtaget'; input.readOnly = true;
      } catch (err) {
        console.warn('[hero-check] not sent:', err.message);
        say(LEAD_KEY ? 'error' : 'note', LEAD_KEY ? FAIL_NOTE : DEMO_NOTE); button.textContent = idle;
        if (!LEAD_KEY) { delete button.dataset.state; }
      }
    });
    input.addEventListener('input', () => { if (status.dataset.state && status.dataset.state !== 'done') say('', ''); });
    /* the note's own link scrolls smoothly too */
    status.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#"]'); if (!a) return; e.preventDefault(); scrollToEl(document.getElementById(a.getAttribute('href').slice(1))); });
  }

  /* the contact form */
  const contact = $('.contact-form');
  if (contact) {
    const button = $('.cf-send', contact);
    const label = $('span', button);
    const idle = label.textContent;
    const status = $('.cf-status', contact);
    const say = (state, msg) => { if (state) button.dataset.state = state; else delete button.dataset.state; status.textContent = msg || ''; };
    contact.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = (n) => (contact.elements[n] ? contact.elements[n].value.trim() : '');
      if (contact.elements.botcheck && contact.elements.botcheck.checked) return;
      const email = $('input[type="email"]', contact);
      if (f('adresse').length < 5) { say('error', 'Skriv adressen på grunden først.'); $('#cf-adresse').focus(); return; }
      if (f('navn').length < 2) { say('error', 'Skriv dit navn.'); $('#cf-navn').focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f('email'))) { say('error', 'Skriv en e-mail, vi kan svare på.'); email.setAttribute('aria-invalid', 'true'); email.focus(); return; }
      say('pending', 'Sender.'); label.textContent = 'Sender';
      try {
        await sendLead({ adresse: f('adresse'), navn: f('navn'), telefon: f('telefon'), email: f('email'), source: 'kontakt' });
        say('done', DONE_NOTE); label.textContent = 'Modtaget';
        $$('input', contact).forEach((i) => { i.readOnly = true; });
      } catch (err) {
        console.warn('[contact-form] not sent:', err.message);
        say(LEAD_KEY ? 'error' : 'note', LEAD_KEY ? FAIL_NOTE : FORM_NOTE); label.textContent = idle;
        if (!LEAD_KEY) delete button.dataset.state;
      }
    });
    $$('input', contact).forEach((i) => i.addEventListener('input', () => { i.removeAttribute('aria-invalid'); if (button.dataset.state && button.dataset.state !== 'done') say('', ''); }));

    /* the calm light: the band crosses in 2.6s, rests 9s, crosses again (preset b, cta-glint-lab.html).
       It only runs while the button is on screen and the tab is visible, and never with reduced motion. */
    const band = $('.cf-glint', button);
    if (band && !reduce && band.animate) {
      const GLINT = { cross: 2600, gap: 9000 };
      let timer = null, anim = null, seen = false;
      const pass = () => {
        if (!seen || document.hidden || button.dataset.state === 'done') return;
        anim = band.animate(
          [
            { transform: 'translateX(-140%) skewX(-20deg)', opacity: 0, offset: 0 },
            { opacity: 1, offset: 0.06 },
            { opacity: 1, offset: 0.94 },
            { transform: 'translateX(520%) skewX(-20deg)', opacity: 0, offset: 1 }
          ],
          { duration: GLINT.cross, easing: 'cubic-bezier(0.37, 0, 0.25, 1)', fill: 'none' }
        );
        anim.onfinish = () => { timer = setTimeout(pass, GLINT.gap); };
      };
      const stop = () => { clearTimeout(timer); timer = null; if (anim) { anim.cancel(); anim = null; } };
      const start = () => { stop(); timer = setTimeout(pass, 900); };
      new IntersectionObserver((entries) => {
        seen = entries[0].isIntersecting;
        if (seen) start(); else stop();
      }, { threshold: 0.5 }).observe(button);
      document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (seen) start(); });
    }
  }

  /* ScrollTrigger measures after fonts and lazy images settle */
  if (hasGsap) { window.addEventListener('load', () => ScrollTrigger.refresh()); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh()); }
})();
