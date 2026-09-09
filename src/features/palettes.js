// Unified responsive color palette gallery for Class Task Scheduler Pro.
(function () {
  'use strict';

  const PALETTES = [
    [
      'default',
      '',
      'Campus',
      'Light',
      'Navy, clear blue, and crisp white',
      ['#0f172a', '#1e3a5f', '#2563eb', '#3b82f6'],
      [
        '#0f172a',
        '#1e3a5f',
        '#2563eb',
        '#3b82f6',
        '#ffffff',
        '#172033',
        '#526078',
        '#dfe5ee',
        '#f4f7fb',
      ],
    ],
    [
      'dark-mode',
      'dark-mode',
      'Dark',
      'Dark',
      'Deep navy workspace',
      ['#1a1a2e', '#16213e', '#4facfe', '#00f2fe'],
      [
        '#1a1a2e',
        '#16213e',
        '#4facfe',
        '#00f2fe',
        '#0f3460',
        '#e1e1e1',
        '#b0b0b0',
        '#2a4a6a',
        '#1a3a5a',
      ],
    ],
    [
      'ocean-theme',
      'ocean-theme',
      'Ocean',
      'Light',
      'Blue and cyan',
      ['#0575e6', '#021b79', '#00d2ff', '#3a7bd5'],
      [
        '#0575e6',
        '#021b79',
        '#00d2ff',
        '#3a7bd5',
        '#ffffff',
        '#1a1a1a',
        '#555555',
        '#d0e7ff',
        '#e6f3ff',
      ],
    ],
    [
      'forest-theme',
      'forest-theme',
      'Forest',
      'Light',
      'Emerald and green',
      ['#11998e', '#38ef7d', '#06d6a0', '#7de890'],
      [
        '#11998e',
        '#38ef7d',
        '#06d6a0',
        '#7de890',
        '#ffffff',
        '#2d3436',
        '#636e72',
        '#dfe6e9',
        '#f0f9f5',
      ],
    ],
    [
      'sunset-theme',
      'sunset-theme',
      'Sunset',
      'Light',
      'Coral and gold',
      ['#ff6b6b', '#feca57', '#ee5a6f', '#ff9ff3'],
      [
        '#ff6b6b',
        '#feca57',
        '#ee5a6f',
        '#ff9ff3',
        '#ffffff',
        '#2d3436',
        '#636e72',
        '#ffe5e5',
        '#fff5f5',
      ],
    ],
    [
      'purple-theme',
      'purple-theme',
      'Purple Dream',
      'Light',
      'Lavender and peach',
      ['#a770ef', '#cf8bf3', '#fdb99b', '#c471ed'],
      [
        '#a770ef',
        '#cf8bf3',
        '#fdb99b',
        '#c471ed',
        '#ffffff',
        '#2d3436',
        '#636e72',
        '#f3e5ff',
        '#faf5ff',
      ],
    ],
    [
      'midnight-theme',
      'midnight-theme',
      'Midnight',
      'Dark',
      'Charcoal and electric blue',
      ['#232526', '#414345', '#4facfe', '#00f2fe'],
      [
        '#232526',
        '#414345',
        '#4facfe',
        '#00f2fe',
        '#2c2f33',
        '#e8e8e8',
        '#b9bbbe',
        '#40444b',
        '#36393f',
      ],
    ],
    [
      'rosegold-theme',
      'rosegold-theme',
      'Rose Gold',
      'Light',
      'Rose and blush',
      ['#eb3349', '#f45c43', '#ff758c', '#ff7eb3'],
      [
        '#eb3349',
        '#f45c43',
        '#ff758c',
        '#ff7eb3',
        '#ffffff',
        '#2d3436',
        '#636e72',
        '#ffe5eb',
        '#fff0f3',
      ],
    ],
    [
      'mint-theme',
      'mint-theme',
      'Mint',
      'Light',
      'Fresh green and aqua',
      ['#56ab2f', '#a8e063', '#72efdd', '#64dfdf'],
      [
        '#56ab2f',
        '#a8e063',
        '#72efdd',
        '#64dfdf',
        '#ffffff',
        '#2d3436',
        '#636e72',
        '#e8f8e8',
        '#f0fff0',
      ],
    ],
    [
      'dragon-theme',
      'dragon-theme',
      'Dragon Navy & Gold',
      'Light',
      'Academic navy with gold accents',
      ['#071a3d', '#143d73', '#f6c344', '#ffd86b'],
      [
        '#071a3d',
        '#143d73',
        '#d99b16',
        '#f6c344',
        '#f8fafc',
        '#14213d',
        '#5d6778',
        '#d9e1ec',
        '#eef3f9',
      ],
    ],
    [
      'cobalt-theme',
      'cobalt-theme',
      'Cobalt',
      'Dark',
      'Navy, cobalt, and sky blue',
      ['#0f172a', '#1e3a8a', '#38bdf8', '#60a5fa'],
      [
        '#0f172a',
        '#1e3a8a',
        '#38bdf8',
        '#60a5fa',
        '#111827',
        '#f8fafc',
        '#cbd5e1',
        '#334155',
        '#1f2937',
      ],
    ],
    [
      'aurora-theme',
      'aurora-theme',
      'Aurora',
      'Dark',
      'Teal, indigo, and violet glow',
      ['#0f766e', '#4338ca', '#22d3ee', '#a78bfa'],
      [
        '#0f766e',
        '#4338ca',
        '#22d3ee',
        '#a78bfa',
        '#111827',
        '#f8fafc',
        '#cbd5e1',
        '#334155',
        '#1f2937',
      ],
    ],
    [
      'sakura-theme',
      'sakura-theme',
      'Sakura',
      'Light',
      'Soft cherry blossom pink',
      ['#b76e79', '#f3a6b6', '#e75480', '#ffd1dc'],
      [
        '#b76e79',
        '#f3a6b6',
        '#d94675',
        '#f9a8d4',
        '#fffafb',
        '#3f2933',
        '#75545f',
        '#f1d5df',
        '#fff1f5',
      ],
    ],
    [
      'lavender-theme',
      'lavender-theme',
      'Lavender',
      'Light',
      'Violet with soft lilac',
      ['#6d5dfc', '#b084f5', '#8b5cf6', '#c4b5fd'],
      [
        '#6d5dfc',
        '#b084f5',
        '#7c3aed',
        '#a78bfa',
        '#fdfcff',
        '#2e2250',
        '#6b5c86',
        '#e4ddf7',
        '#f5f1ff',
      ],
    ],
    [
      'mocha-theme',
      'mocha-theme',
      'Mocha',
      'Light',
      'Coffee brown and warm cream',
      ['#4b2e2a', '#8b5e3c', '#d4a373', '#faedcd'],
      [
        '#4b2e2a',
        '#8b5e3c',
        '#b77945',
        '#d4a373',
        '#fffaf2',
        '#3a2923',
        '#725b50',
        '#e7d8c8',
        '#f8efe4',
      ],
    ],
    [
      'arctic-theme',
      'arctic-theme',
      'Arctic',
      'Light',
      'Ice blue and clean cyan',
      ['#dbeafe', '#bae6fd', '#0284c7', '#38bdf8'],
      [
        '#93c5fd',
        '#67e8f9',
        '#0284c7',
        '#38bdf8',
        '#ffffff',
        '#0f2740',
        '#526b7f',
        '#cfe8f4',
        '#eefaff',
      ],
    ],
    [
      'ember-theme',
      'ember-theme',
      'Ember',
      'Light',
      'Deep red, orange, and amber',
      ['#7f1d1d', '#ea580c', '#f97316', '#fbbf24'],
      [
        '#7f1d1d',
        '#ea580c',
        '#ea580c',
        '#f59e0b',
        '#fffaf7',
        '#3d1f18',
        '#79584d',
        '#f0d5c9',
        '#fff1e8',
      ],
    ],
    [
      'graphite-theme',
      'graphite-theme',
      'Graphite Lime',
      'Dark',
      'Graphite with sharp lime',
      ['#111827', '#374151', '#a3e635', '#bef264'],
      [
        '#111827',
        '#374151',
        '#a3e635',
        '#bef264',
        '#171f2d',
        '#f8fafc',
        '#cbd5e1',
        '#3f4b5d',
        '#242f3f',
      ],
    ],
    [
      'neon-theme',
      'neon-theme',
      'Neon Night',
      'Dark',
      'Black, violet, cyan, and magenta',
      ['#09090b', '#3b0764', '#22d3ee', '#f0abfc'],
      [
        '#09090b',
        '#3b0764',
        '#22d3ee',
        '#f0abfc',
        '#18111f',
        '#fafafa',
        '#d8cbe1',
        '#4a3058',
        '#281b31',
      ],
    ],
    [
      'sandstone-theme',
      'sandstone-theme',
      'Sandstone',
      'Light',
      'Warm tan and desert brown',
      ['#d6b98c', '#a67c52', '#8b5e34', '#d4a373'],
      [
        '#c7a875',
        '#9c7048',
        '#8b5e34',
        '#d4a373',
        '#fffdf8',
        '#3a2d22',
        '#746353',
        '#e4d8c8',
        '#f7f0e6',
      ],
    ],
    [
      'berry-theme',
      'berry-theme',
      'Berry',
      'Light',
      'Plum, raspberry, and blush',
      ['#701a75', '#be185d', '#db2777', '#f9a8d4'],
      [
        '#701a75',
        '#be185d',
        '#db2777',
        '#f472b6',
        '#fffafd',
        '#3f1637',
        '#7f5a76',
        '#f0d5e7',
        '#fff0f8',
      ],
    ],
  ].map((p, i) => ({
    id: p[0],
    className: p[1],
    name: p[2],
    mode: p[3],
    description: p[4],
    colors: p[5],
    expanded: i >= 9,
    vars: {
      primary: p[6][0],
      secondary: p[6][1],
      accent: p[6][2],
      accentLight: p[6][3],
      card: p[6][4],
      text: p[6][5],
      textSecondary: p[6][6],
      border: p[6][7],
      hover: p[6][8],
    },
  }));

  const ALL_CLASSES = PALETTES.map((p) => p.className).filter(Boolean);
  const MOBILE_BREAKPOINT = 680;
  const THEME_TOKENS = {
    primary: '--primary-bg',
    secondary: '--secondary-bg',
    accent: '--accent',
    accentLight: '--accent-light',
    card: '--card-bg',
    text: '--text-primary',
    textSecondary: '--text-secondary',
    border: '--border-color',
    hover: '--hover-bg',
  };

  function savedPalette() {
    try {
      return localStorage.getItem('selectedTheme') || 'default';
    } catch {
      return 'default';
    }
  }

  const { escapeHtml } = window.SchedulerUtils;

  function injectStyles() {
    if (document.getElementById('v9PaletteStyles')) return;
    const style = document.createElement('style');
    style.id = 'v9PaletteStyles';
    const themeCss = PALETTES.filter((p) => p.expanded)
      .map(
        (p) =>
          `body.${p.className}{--primary-bg:${p.vars.primary};--secondary-bg:${p.vars.secondary};--accent:${p.vars.accent};--accent-light:${p.vars.accentLight};--card-bg:${p.vars.card};--text-primary:${p.vars.text};--text-secondary:${p.vars.textSecondary};--border-color:${p.vars.border};--hover-bg:${p.vars.hover};}`,
      )
      .join('');
    style.textContent = `${themeCss}
            body[data-palette-managed="true"] .container{background:color-mix(in srgb,var(--card-bg) 96%,transparent)!important}
            .theme-menu.v9-palette-gallery{position:fixed!important;z-index:100000!important;right:auto!important;bottom:auto!important;width:min(1040px,calc(100vw - 24px));min-width:0!important;max-height:var(--palette-available-height,calc(100dvh - 24px))!important;padding:14px!important;border:1px solid var(--border-color)!important;border-radius:16px!important;background:var(--card-bg)!important;box-shadow:0 24px 70px rgba(0,0,0,.34)!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;isolation:isolate}
            .theme-menu.v9-palette-gallery.show{display:block!important}
            .v9-palette-header{position:sticky;top:-14px;z-index:3;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin:-14px -14px 12px;padding:14px 14px 10px;border-bottom:1px solid var(--border-color);background:var(--card-bg)}
            .v9-palette-heading{min-width:0;flex:1}.v9-palette-header-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}.v9-palette-header h3{margin:0;color:var(--text-primary);font-size:1rem;line-height:1.25}.v9-palette-header p{margin:3px 0 0;color:var(--text-secondary);font-size:.72rem;line-height:1.35}.v9-palette-count{padding:5px 8px;border-radius:999px;background:var(--hover-bg);color:var(--text-secondary);font-size:.68rem;font-weight:800;white-space:nowrap}.v9-palette-close{width:34px;height:34px;min-width:34px;padding:0;border:1px solid var(--border-color);border-radius:10px;background:var(--hover-bg);color:var(--text-primary);font-size:1.15rem;line-height:1;cursor:pointer;touch-action:manipulation}
            .v9-palette-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.v9-palette-card{position:relative;display:grid;grid-template-columns:100px 1fr;gap:9px;align-items:center;width:100%;min-width:0;min-height:68px;padding:9px;border:1px solid var(--border-color);border-radius:12px;background:var(--card-bg);color:var(--text-primary);text-align:left;cursor:pointer;transition:.15s ease;touch-action:manipulation;-webkit-tap-highlight-color:transparent}.v9-palette-card:hover{transform:translateY(-1px);border-color:var(--accent);box-shadow:0 7px 18px rgba(15,23,42,.10)}.v9-palette-card.selected{border:2px solid var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 16%,transparent)}
            .v9-palette-preview{height:48px;border-radius:9px;overflow:hidden;border:1px solid var(--border-color);display:grid;grid-template-rows:1fr 11px}.v9-palette-gradient{background:var(--palette-gradient)}.v9-palette-swatches{display:grid;grid-template-columns:repeat(4,1fr)}.v9-palette-copy{min-width:0}.v9-palette-name-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding-right:20px}.v9-palette-copy strong{font-size:.75rem;line-height:1.2}.v9-palette-copy small{display:block;margin-top:2px;color:var(--text-secondary);font-size:.63rem;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v9-palette-badge{padding:2px 5px;border-radius:999px;background:var(--hover-bg);border:1px solid var(--border-color);font-size:.52rem;font-weight:750}.v9-palette-new{color:var(--accent)}.v9-palette-check{position:absolute;top:6px;right:6px;width:18px;height:18px;border-radius:50%;display:none;align-items:center;justify-content:center;background:var(--accent);color:#fff;font-size:.62rem;font-weight:900}.v9-palette-card.selected .v9-palette-check{display:flex}
            @media(max-width:980px){.v9-palette-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
            @media(max-width:${MOBILE_BREAKPOINT}px){body.v9-palette-open{overflow:hidden!important;}.theme-menu.v9-palette-gallery{left:max(8px,env(safe-area-inset-left))!important;right:max(8px,env(safe-area-inset-right))!important;top:max(8px,env(safe-area-inset-top))!important;bottom:max(8px,env(safe-area-inset-bottom))!important;width:auto!important;height:auto!important;max-height:none!important;padding:10px!important;border-radius:18px!important}.v9-palette-header{top:-10px;margin:-10px -10px 9px;padding:11px 10px 9px;align-items:center}.v9-palette-header p{display:none}.v9-palette-count{font-size:.62rem;padding:4px 7px}.v9-palette-close{width:40px;height:40px;min-width:40px;font-size:1.25rem}.v9-palette-grid{grid-template-columns:1fr;gap:8px}.v9-palette-card{grid-template-columns:86px minmax(0,1fr);min-height:72px;padding:8px;gap:9px;border-radius:12px}.v9-palette-preview{height:50px}.v9-palette-copy strong{font-size:.82rem}.v9-palette-copy small{font-size:.68rem}.v9-palette-badge{font-size:.56rem}.v9-palette-button-label{display:none}}
            @media(max-width:430px){.theme-menu.v9-palette-gallery{left:max(6px,env(safe-area-inset-left))!important;right:max(6px,env(safe-area-inset-right))!important;top:max(6px,env(safe-area-inset-top))!important;bottom:max(6px,env(safe-area-inset-bottom))!important;padding:8px!important;border-radius:15px!important}.v9-palette-header{top:-8px;margin:-8px -8px 7px;padding:10px 8px 8px}.v9-palette-header h3{font-size:.92rem}.v9-palette-count{display:none}.v9-palette-card{grid-template-columns:70px minmax(0,1fr);min-height:64px;padding:7px;gap:8px}.v9-palette-preview{height:44px;border-radius:8px}.v9-palette-copy small{white-space:normal;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical}.v9-palette-new{display:none}}
            @media(max-width:350px){.v9-palette-card{grid-template-columns:58px minmax(0,1fr)}.v9-palette-preview{height:40px}.v9-palette-copy strong{font-size:.76rem}.v9-palette-copy small{display:none}.v9-palette-badge{font-size:.5rem;padding:1px 4px}}
            @media(orientation:landscape) and (max-height:540px) and (max-width:950px){.theme-menu.v9-palette-gallery{left:max(6px,env(safe-area-inset-left))!important;right:max(6px,env(safe-area-inset-right))!important;top:max(6px,env(safe-area-inset-top))!important;bottom:max(6px,env(safe-area-inset-bottom))!important;max-height:none!important}.v9-palette-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.v9-palette-card{grid-template-columns:68px minmax(0,1fr);min-height:58px;padding:6px}.v9-palette-preview{height:40px}.v9-palette-copy small{display:none}.v9-palette-header{padding-top:8px;padding-bottom:7px}}
        `;
    document.head.appendChild(style);
  }

  function card(p, selected) {
    return `<button type="button" class="v9-palette-card ${p.id === selected ? 'selected' : ''}" data-v9-palette="${escapeHtml(p.id)}" aria-pressed="${p.id === selected ? 'true' : 'false'}" style="--palette-gradient:linear-gradient(135deg,${p.colors[0]},${p.colors[1]},${p.colors[2]})"><div class="v9-palette-preview"><div class="v9-palette-gradient"></div><div class="v9-palette-swatches">${p.colors.map((c) => `<span style="background:${c}"></span>`).join('')}</div></div><div class="v9-palette-copy"><div class="v9-palette-name-row"><strong>${escapeHtml(p.name)}</strong><span class="v9-palette-badge">${p.mode}</span>${p.expanded ? '<span class="v9-palette-badge v9-palette-new">NEW</span>' : ''}</div><small>${escapeHtml(p.description)}</small></div><span class="v9-palette-check">✓</span></button>`;
  }

  function render() {
    const menu = document.getElementById('themeMenu');
    if (!menu) return;
    const selected = savedPalette();
    menu.classList.add('v9-palette-gallery');
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Color palette chooser');
    menu.setAttribute('aria-modal', 'true');
    menu.innerHTML = `<div class="v9-palette-header"><div class="v9-palette-heading"><h3>🎨 All Color Palettes</h3><p>All 21 palettes are shown together in one scrollable panel.</p></div><div class="v9-palette-header-actions"><span class="v9-palette-count">${PALETTES.length} palettes</span><button type="button" class="v9-palette-close" aria-label="Close color palette chooser">×</button></div></div><div class="v9-palette-grid">${PALETTES.map((p) => card(p, selected)).join('')}</div>`;
    menu.querySelectorAll('[data-v9-palette]').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        apply(el.dataset.v9Palette);
      }),
    );
    menu.querySelector('.v9-palette-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenu();
    });
    menu.addEventListener('click', (e) => e.stopPropagation());
  }

  function viewportSize() {
    const vv = window.visualViewport;
    return {
      width: vv?.width || window.innerWidth,
      height: vv?.height || window.innerHeight,
      offsetLeft: vv?.offsetLeft || 0,
      offsetTop: vv?.offsetTop || 0,
    };
  }

  function positionMenu() {
    const menu = document.getElementById('themeMenu');
    const button = document.querySelector('.theme-selector .icon-btn');
    if (!menu || !button) return;
    const viewport = viewportSize();
    if (viewport.width <= MOBILE_BREAKPOINT) {
      menu.style.removeProperty('width');
      menu.style.removeProperty('left');
      menu.style.removeProperty('top');
      menu.style.removeProperty('--palette-available-height');
      return;
    }
    const margin = 12;
    const rect = button.getBoundingClientRect();
    const width = Math.min(1040, Math.max(280, viewport.width - margin * 2));
    const viewportRight = viewport.offsetLeft + viewport.width;
    const left = Math.max(
      viewport.offsetLeft + margin,
      Math.min(rect.right - width, viewportRight - width - margin),
    );
    let top = rect.bottom + 8;
    const viewportBottom = viewport.offsetTop + viewport.height;
    if (top > viewportBottom - 280) top = viewport.offsetTop + margin;
    const availableHeight = Math.max(0, viewportBottom - top - margin);
    menu.style.width = `${width}px`;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.setProperty('--palette-available-height', `${availableHeight}px`);
  }

  function setOpenState(open) {
    const menu = document.getElementById('themeMenu');
    if (!menu) return;
    menu.classList.toggle('show', open);
    const button = document.querySelector('.theme-selector .icon-btn');
    button?.setAttribute('aria-expanded', String(open));
    if (!open && menu.contains(document.activeElement)) button?.focus();
    document.body.classList.toggle(
      'v9-palette-open',
      open && viewportSize().width <= MOBILE_BREAKPOINT,
    );
    if (open) {
      menu.querySelector('.v9-palette-close')?.focus();
      requestAnimationFrame(positionMenu);
    }
  }

  function closeMenu() {
    setOpenState(false);
  }

  function apply(id, options = {}) {
    const p = PALETTES.find((x) => x.id === id) || PALETTES[0];
    document.body.classList.remove(...ALL_CLASSES);
    if (p.className) document.body.classList.add(p.className);
    document.body.dataset.paletteManaged = 'true';
    // Root-level derived colors and body-level legacy theme rules must use the same palette.
    for (const [key, property] of Object.entries(THEME_TOKENS)) {
      document.documentElement.style.setProperty(property, p.vars[key]);
      document.body.style.setProperty(property, p.vars[key]);
    }
    document.documentElement.style.colorScheme = p.mode.toLowerCase();
    document.body.dataset.palette = p.id;
    try {
      localStorage.setItem('selectedTheme', p.id);
    } catch {
      // Palette selection still works when browser storage is unavailable.
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.vars.accent);
    document.querySelectorAll('[data-v9-palette]').forEach((el) => {
      const selected = el.dataset.v9Palette === p.id;
      el.classList.toggle('selected', selected);
      el.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    if (!options.keepOpen) closeMenu();
    if (!options.silent)
      try {
        taskScheduler?.showNotification?.(`Palette changed to ${p.name}!`, 'success');
      } catch (_) {}
  }

  function installDropdownBehavior() {
    const menu = document.getElementById('themeMenu');
    const button = document.querySelector('.theme-selector .icon-btn');
    if (!menu || !button) return;
    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && !button.contains(event.target)) closeMenu();
    });
    window.toggleThemeMenu = function () {
      setOpenState(!menu.classList.contains('show'));
    };
    const refit = () => {
      if (!menu.classList.contains('show')) return;
      document.body.classList.toggle('v9-palette-open', viewportSize().width <= MOBILE_BREAKPOINT);
      positionMenu();
    };
    window.addEventListener('resize', refit);
    window.addEventListener('orientationchange', () => setTimeout(refit, 120));
    window.addEventListener('scroll', refit, { passive: true });
    window.visualViewport?.addEventListener('resize', refit);
    window.visualViewport?.addEventListener('scroll', refit);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('show')) closeMenu();
      if (e.key === 'Tab' && menu.classList.contains('show')) {
        const controls = [...menu.querySelectorAll('button')];
        const first = controls[0];
        const last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    });
  }

  function init() {
    injectStyles();
    const button = document.querySelector('.theme-selector .icon-btn');
    if (button) {
      button.innerHTML = '🎨 <span class="v9-palette-button-label">Palettes</span>';
      button.title = 'Open Color Palette Gallery';
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', 'themeMenu');
      button.setAttribute('aria-expanded', 'false');
      button.removeAttribute('onclick');
      button.addEventListener('click', () => window.toggleThemeMenu());
    }
    render();
    installDropdownBehavior();
    apply(savedPalette(), { silent: true, keepOpen: true });
    window.changeTheme = (theme) => apply(theme);
    window.schedulerPalettes = PALETTES.map((p) => ({
      id: p.id,
      name: p.name,
      colors: [...p.colors],
      mode: p.mode,
    }));
  }

  window.SchedulerFeatures.register('palettes', init);
})();
