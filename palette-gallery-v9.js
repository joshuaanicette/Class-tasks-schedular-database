// Expanded color palette gallery for Class Task Scheduler Pro.
(function () {
    'use strict';

    const PALETTES = [
        {
            id: 'default', className: '', name: 'Default', group: 'Original', mode: 'Light',
            description: 'Blue-violet original',
            colors: ['#667eea', '#764ba2', '#4facfe', '#00f2fe'],
            vars: { primary: '#667eea', secondary: '#764ba2', accent: '#4facfe', accentLight: '#00f2fe', card: '#ffffff', text: '#333333', textSecondary: '#666666', border: '#e1e5e9', hover: '#f8f9fa' }
        },
        {
            id: 'dark-mode', className: 'dark-mode', name: 'Dark', group: 'Original', mode: 'Dark',
            description: 'Deep navy workspace',
            colors: ['#1a1a2e', '#16213e', '#4facfe', '#00f2fe'],
            vars: { primary: '#1a1a2e', secondary: '#16213e', accent: '#4facfe', accentLight: '#00f2fe', card: '#0f3460', text: '#e1e1e1', textSecondary: '#b0b0b0', border: '#2a4a6a', hover: '#1a3a5a' }
        },
        {
            id: 'ocean-theme', className: 'ocean-theme', name: 'Ocean', group: 'Original', mode: 'Light',
            description: 'Blue and cyan',
            colors: ['#0575e6', '#021b79', '#00d2ff', '#3a7bd5'],
            vars: { primary: '#0575e6', secondary: '#021b79', accent: '#00d2ff', accentLight: '#3a7bd5', card: '#ffffff', text: '#1a1a1a', textSecondary: '#555555', border: '#d0e7ff', hover: '#e6f3ff' }
        },
        {
            id: 'forest-theme', className: 'forest-theme', name: 'Forest', group: 'Original', mode: 'Light',
            description: 'Emerald and green',
            colors: ['#11998e', '#38ef7d', '#06d6a0', '#7de890'],
            vars: { primary: '#11998e', secondary: '#38ef7d', accent: '#06d6a0', accentLight: '#7de890', card: '#ffffff', text: '#2d3436', textSecondary: '#636e72', border: '#dfe6e9', hover: '#f0f9f5' }
        },
        {
            id: 'sunset-theme', className: 'sunset-theme', name: 'Sunset', group: 'Original', mode: 'Light',
            description: 'Coral and gold',
            colors: ['#ff6b6b', '#feca57', '#ee5a6f', '#ff9ff3'],
            vars: { primary: '#ff6b6b', secondary: '#feca57', accent: '#ee5a6f', accentLight: '#ff9ff3', card: '#ffffff', text: '#2d3436', textSecondary: '#636e72', border: '#ffe5e5', hover: '#fff5f5' }
        },
        {
            id: 'purple-theme', className: 'purple-theme', name: 'Purple Dream', group: 'Original', mode: 'Light',
            description: 'Lavender and peach',
            colors: ['#a770ef', '#cf8bf3', '#fdb99b', '#c471ed'],
            vars: { primary: '#a770ef', secondary: '#cf8bf3', accent: '#fdb99b', accentLight: '#c471ed', card: '#ffffff', text: '#2d3436', textSecondary: '#636e72', border: '#f3e5ff', hover: '#faf5ff' }
        },
        {
            id: 'midnight-theme', className: 'midnight-theme', name: 'Midnight', group: 'Original', mode: 'Dark',
            description: 'Charcoal and electric blue',
            colors: ['#232526', '#414345', '#4facfe', '#00f2fe'],
            vars: { primary: '#232526', secondary: '#414345', accent: '#4facfe', accentLight: '#00f2fe', card: '#2c2f33', text: '#e8e8e8', textSecondary: '#b9bbbe', border: '#40444b', hover: '#36393f' }
        },
        {
            id: 'rosegold-theme', className: 'rosegold-theme', name: 'Rose Gold', group: 'Original', mode: 'Light',
            description: 'Rose and blush',
            colors: ['#eb3349', '#f45c43', '#ff758c', '#ff7eb3'],
            vars: { primary: '#eb3349', secondary: '#f45c43', accent: '#ff758c', accentLight: '#ff7eb3', card: '#ffffff', text: '#2d3436', textSecondary: '#636e72', border: '#ffe5eb', hover: '#fff0f3' }
        },
        {
            id: 'mint-theme', className: 'mint-theme', name: 'Mint', group: 'Original', mode: 'Light',
            description: 'Fresh green and aqua',
            colors: ['#56ab2f', '#a8e063', '#72efdd', '#64dfdf'],
            vars: { primary: '#56ab2f', secondary: '#a8e063', accent: '#72efdd', accentLight: '#64dfdf', card: '#ffffff', text: '#2d3436', textSecondary: '#636e72', border: '#e8f8e8', hover: '#f0fff0' }
        },
        {
            id: 'dragon-theme', className: 'dragon-theme', name: 'Dragon Navy & Gold', group: 'Expanded', mode: 'Light',
            description: 'Academic navy with gold accents',
            colors: ['#071a3d', '#143d73', '#f6c344', '#ffd86b'],
            vars: { primary: '#071a3d', secondary: '#143d73', accent: '#d99b16', accentLight: '#f6c344', card: '#f8fafc', text: '#14213d', textSecondary: '#5d6778', border: '#d9e1ec', hover: '#eef3f9' }
        },
        {
            id: 'cobalt-theme', className: 'cobalt-theme', name: 'Cobalt', group: 'Expanded', mode: 'Dark',
            description: 'Navy, cobalt, and sky blue',
            colors: ['#0f172a', '#1e3a8a', '#38bdf8', '#60a5fa'],
            vars: { primary: '#0f172a', secondary: '#1e3a8a', accent: '#38bdf8', accentLight: '#60a5fa', card: '#111827', text: '#f8fafc', textSecondary: '#cbd5e1', border: '#334155', hover: '#1f2937' }
        },
        {
            id: 'aurora-theme', className: 'aurora-theme', name: 'Aurora', group: 'Expanded', mode: 'Dark',
            description: 'Teal, indigo, and violet glow',
            colors: ['#0f766e', '#4338ca', '#22d3ee', '#a78bfa'],
            vars: { primary: '#0f766e', secondary: '#4338ca', accent: '#22d3ee', accentLight: '#a78bfa', card: '#111827', text: '#f8fafc', textSecondary: '#cbd5e1', border: '#334155', hover: '#1f2937' }
        },
        {
            id: 'sakura-theme', className: 'sakura-theme', name: 'Sakura', group: 'Expanded', mode: 'Light',
            description: 'Soft cherry blossom pink',
            colors: ['#b76e79', '#f3a6b6', '#e75480', '#ffd1dc'],
            vars: { primary: '#b76e79', secondary: '#f3a6b6', accent: '#d94675', accentLight: '#f9a8d4', card: '#fffafb', text: '#3f2933', textSecondary: '#75545f', border: '#f1d5df', hover: '#fff1f5' }
        },
        {
            id: 'lavender-theme', className: 'lavender-theme', name: 'Lavender', group: 'Expanded', mode: 'Light',
            description: 'Violet with soft lilac',
            colors: ['#6d5dfc', '#b084f5', '#8b5cf6', '#c4b5fd'],
            vars: { primary: '#6d5dfc', secondary: '#b084f5', accent: '#7c3aed', accentLight: '#a78bfa', card: '#fdfcff', text: '#2e2250', textSecondary: '#6b5c86', border: '#e4ddf7', hover: '#f5f1ff' }
        },
        {
            id: 'mocha-theme', className: 'mocha-theme', name: 'Mocha', group: 'Expanded', mode: 'Light',
            description: 'Coffee brown and warm cream',
            colors: ['#4b2e2a', '#8b5e3c', '#d4a373', '#faedcd'],
            vars: { primary: '#4b2e2a', secondary: '#8b5e3c', accent: '#b77945', accentLight: '#d4a373', card: '#fffaf2', text: '#3a2923', textSecondary: '#725b50', border: '#e7d8c8', hover: '#f8efe4' }
        },
        {
            id: 'arctic-theme', className: 'arctic-theme', name: 'Arctic', group: 'Expanded', mode: 'Light',
            description: 'Ice blue and clean cyan',
            colors: ['#dbeafe', '#bae6fd', '#0284c7', '#38bdf8'],
            vars: { primary: '#93c5fd', secondary: '#67e8f9', accent: '#0284c7', accentLight: '#38bdf8', card: '#ffffff', text: '#0f2740', textSecondary: '#526b7f', border: '#cfe8f4', hover: '#eefaff' }
        },
        {
            id: 'ember-theme', className: 'ember-theme', name: 'Ember', group: 'Expanded', mode: 'Light',
            description: 'Deep red, orange, and amber',
            colors: ['#7f1d1d', '#ea580c', '#f97316', '#fbbf24'],
            vars: { primary: '#7f1d1d', secondary: '#ea580c', accent: '#ea580c', accentLight: '#f59e0b', card: '#fffaf7', text: '#3d1f18', textSecondary: '#79584d', border: '#f0d5c9', hover: '#fff1e8' }
        },
        {
            id: 'graphite-theme', className: 'graphite-theme', name: 'Graphite Lime', group: 'Expanded', mode: 'Dark',
            description: 'Graphite with sharp lime',
            colors: ['#111827', '#374151', '#a3e635', '#bef264'],
            vars: { primary: '#111827', secondary: '#374151', accent: '#a3e635', accentLight: '#bef264', card: '#171f2d', text: '#f8fafc', textSecondary: '#cbd5e1', border: '#3f4b5d', hover: '#242f3f' }
        },
        {
            id: 'neon-theme', className: 'neon-theme', name: 'Neon Night', group: 'Expanded', mode: 'Dark',
            description: 'Black, violet, cyan, and magenta',
            colors: ['#09090b', '#3b0764', '#22d3ee', '#f0abfc'],
            vars: { primary: '#09090b', secondary: '#3b0764', accent: '#22d3ee', accentLight: '#f0abfc', card: '#18111f', text: '#fafafa', textSecondary: '#d8cbe1', border: '#4a3058', hover: '#281b31' }
        },
        {
            id: 'sandstone-theme', className: 'sandstone-theme', name: 'Sandstone', group: 'Expanded', mode: 'Light',
            description: 'Warm tan and desert brown',
            colors: ['#d6b98c', '#a67c52', '#8b5e34', '#d4a373'],
            vars: { primary: '#c7a875', secondary: '#9c7048', accent: '#8b5e34', accentLight: '#d4a373', card: '#fffdf8', text: '#3a2d22', textSecondary: '#746353', border: '#e4d8c8', hover: '#f7f0e6' }
        },
        {
            id: 'berry-theme', className: 'berry-theme', name: 'Berry', group: 'Expanded', mode: 'Light',
            description: 'Plum, raspberry, and blush',
            colors: ['#701a75', '#be185d', '#db2777', '#f9a8d4'],
            vars: { primary: '#701a75', secondary: '#be185d', accent: '#db2777', accentLight: '#f472b6', card: '#fffafd', text: '#3f1637', textSecondary: '#7f5a76', border: '#f0d5e7', hover: '#fff0f8' }
        }
    ];

    const NEW_PALETTE_IDS = new Set(PALETTES.filter(p => p.group === 'Expanded').map(p => p.id));
    const ALL_THEME_CLASSES = PALETTES.map(p => p.className).filter(Boolean);

    function escapeHtml(value) {
        const el = document.createElement('div');
        el.textContent = value == null ? '' : String(value);
        return el.innerHTML;
    }

    function injectPaletteStyles() {
        if (document.getElementById('v9PaletteStyles')) return;
        const style = document.createElement('style');
        style.id = 'v9PaletteStyles';

        const expandedThemeCss = PALETTES.filter(p => NEW_PALETTE_IDS.has(p.id)).map(p => `
            body.${p.className}{
                --primary-bg:${p.vars.primary};
                --secondary-bg:${p.vars.secondary};
                --accent:${p.vars.accent};
                --accent-light:${p.vars.accentLight};
                --card-bg:${p.vars.card};
                --text-primary:${p.vars.text};
                --text-secondary:${p.vars.textSecondary};
                --border-color:${p.vars.border};
                --hover-bg:${p.vars.hover};
            }
        `).join('');

        style.textContent = `${expandedThemeCss}
            body[data-palette-managed="true"] .container{
                background:color-mix(in srgb,var(--card-bg) 96%,transparent)!important;
            }
            .theme-menu.v9-palette-gallery{
                width:min(760px,calc(100vw - 28px));
                min-width:0!important;
                max-height:min(72vh,720px)!important;
                padding:14px!important;
                border:1px solid var(--border-color)!important;
                border-radius:16px!important;
                background:var(--card-bg)!important;
                box-shadow:0 24px 60px rgba(15,23,42,.24)!important;
                overflow:auto!important;
            }
            .v9-palette-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:13px;padding:2px 2px 10px;border-bottom:1px solid var(--border-color)}
            .v9-palette-header h3{margin:0;color:var(--text-primary);font-size:1rem}.v9-palette-header p{margin:3px 0 0;color:var(--text-secondary);font-size:.72rem}
            .v9-palette-count{padding:5px 8px;border-radius:999px;background:var(--hover-bg);color:var(--text-secondary);font-size:.68rem;font-weight:800;white-space:nowrap}
            .v9-palette-section-title{display:flex;align-items:center;gap:8px;margin:12px 2px 8px;color:var(--text-primary);font-size:.76rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
            .v9-palette-section-title::after{content:'';height:1px;background:var(--border-color);flex:1}
            .v9-palette-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
            .v9-palette-card{position:relative;display:grid;grid-template-columns:112px 1fr;gap:10px;align-items:center;width:100%;padding:9px;border:1px solid var(--border-color);border-radius:12px;background:var(--card-bg);color:var(--text-primary);text-align:left;cursor:pointer;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
            .v9-palette-card:hover{transform:translateY(-1px);border-color:var(--accent);box-shadow:0 7px 18px rgba(15,23,42,.10)}
            .v9-palette-card.selected{border:2px solid var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 16%,transparent)}
            .v9-palette-preview{height:52px;border-radius:9px;overflow:hidden;border:1px solid color-mix(in srgb,var(--border-color) 70%,transparent);display:grid;grid-template-rows:1fr 12px}
            .v9-palette-gradient{background:var(--palette-gradient)}
            .v9-palette-swatches{display:grid;grid-template-columns:repeat(4,1fr)}.v9-palette-swatches span{display:block}
            .v9-palette-copy{min-width:0}.v9-palette-name-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.v9-palette-copy strong{font-size:.78rem;color:var(--text-primary)}
            .v9-palette-copy small{display:block;margin-top:3px;color:var(--text-secondary);font-size:.65rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            .v9-palette-badge{padding:2px 5px;border-radius:999px;background:var(--hover-bg);border:1px solid var(--border-color);color:var(--text-secondary);font-size:.55rem;font-weight:750}
            .v9-palette-new{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,var(--border-color))}
            .v9-palette-check{position:absolute;top:7px;right:7px;width:19px;height:19px;border-radius:50%;display:none;align-items:center;justify-content:center;background:var(--accent);color:white;font-size:.64rem;font-weight:900}.v9-palette-card.selected .v9-palette-check{display:flex}
            .v9-palette-hex{display:flex;gap:5px;margin-top:5px;flex-wrap:wrap}.v9-palette-hex code{font-size:.54rem;color:var(--text-secondary);background:var(--hover-bg);padding:2px 4px;border-radius:4px}
            @media(max-width:760px){.theme-menu.v9-palette-gallery{position:fixed!important;left:12px!important;right:12px!important;top:74px!important;width:auto!important;max-height:calc(100vh - 92px)!important}.v9-palette-grid{grid-template-columns:1fr}.v9-palette-card{grid-template-columns:96px 1fr}}
        `;
        document.head.appendChild(style);
    }

    function paletteCard(palette, selectedId) {
        const swatches = palette.colors.map(color => `<span style="background:${escapeHtml(color)}"></span>`).join('');
        const newBadge = palette.group === 'Expanded' ? '<span class="v9-palette-badge v9-palette-new">NEW</span>' : '';
        return `
            <button type="button" class="v9-palette-card ${palette.id === selectedId ? 'selected' : ''}" data-v9-palette="${escapeHtml(palette.id)}" style="--palette-gradient:linear-gradient(135deg,${palette.colors[0]},${palette.colors[1]},${palette.colors[2]})">
                <div class="v9-palette-preview">
                    <div class="v9-palette-gradient"></div>
                    <div class="v9-palette-swatches">${swatches}</div>
                </div>
                <div class="v9-palette-copy">
                    <div class="v9-palette-name-row"><strong>${escapeHtml(palette.name)}</strong><span class="v9-palette-badge">${escapeHtml(palette.mode)}</span>${newBadge}</div>
                    <small>${escapeHtml(palette.description)}</small>
                    <div class="v9-palette-hex"><code>${palette.colors[0]}</code><code>${palette.colors[2]}</code></div>
                </div>
                <span class="v9-palette-check">✓</span>
            </button>`;
    }

    function renderPaletteGallery() {
        const menu = document.getElementById('themeMenu');
        if (!menu) return;
        const selectedId = localStorage.getItem('selectedTheme') || 'default';
        const originals = PALETTES.filter(p => p.group === 'Original');
        const expanded = PALETTES.filter(p => p.group === 'Expanded');

        menu.classList.add('v9-palette-gallery');
        menu.innerHTML = `
            <div class="v9-palette-header">
                <div><h3>🎨 Color Palette Gallery</h3><p>Preview every palette, then click one to apply it instantly.</p></div>
                <span class="v9-palette-count">${PALETTES.length} palettes</span>
            </div>
            <div class="v9-palette-section-title">Original palettes</div>
            <div class="v9-palette-grid">${originals.map(p => paletteCard(p, selectedId)).join('')}</div>
            <div class="v9-palette-section-title">Expanded palettes</div>
            <div class="v9-palette-grid">${expanded.map(p => paletteCard(p, selectedId)).join('')}</div>`;

        menu.querySelectorAll('[data-v9-palette]').forEach(card => {
            card.addEventListener('click', event => {
                event.stopPropagation();
                applyPalette(card.dataset.v9Palette);
            });
        });
    }

    function updateSelectedCard(selectedId) {
        document.querySelectorAll('[data-v9-palette]').forEach(card => {
            card.classList.toggle('selected', card.dataset.v9Palette === selectedId);
        });
    }

    function applyPalette(id, options = {}) {
        const palette = PALETTES.find(item => item.id === id) || PALETTES[0];
        document.body.classList.remove(...ALL_THEME_CLASSES);
        if (palette.className) document.body.classList.add(palette.className);
        document.body.dataset.paletteManaged = 'true';
        localStorage.setItem('selectedTheme', palette.id);

        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', palette.vars.accent);

        updateSelectedCard(palette.id);
        if (!options.keepOpen) document.getElementById('themeMenu')?.classList.remove('show');

        if (!options.silent) {
            try {
                if (typeof taskScheduler !== 'undefined' && taskScheduler?.showNotification) {
                    taskScheduler.showNotification(`Palette changed to ${palette.name}!`, 'success');
                }
            } catch (_) {}
        }
    }

    function updatePaletteButton() {
        const selector = document.querySelector('.theme-selector');
        const button = selector?.querySelector('.icon-btn');
        if (!button) return;
        button.innerHTML = '🎨 <span class="v9-palette-button-label">Palettes</span>';
        button.title = 'Open Color Palette Gallery';
    }

    function init() {
        injectPaletteStyles();
        updatePaletteButton();
        renderPaletteGallery();

        const selected = localStorage.getItem('selectedTheme') || 'default';
        applyPalette(selected, { silent: true, keepOpen: true });

        // Keep legacy inline theme handlers compatible with the expanded set.
        window.changeTheme = function (theme) {
            applyPalette(theme);
        };
        window.schedulerPalettes = PALETTES.map(p => ({ id: p.id, name: p.name, colors: [...p.colors], mode: p.mode }));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 420));
    else setTimeout(init, 420);
})();