/* ==========================================================
   Arena | Lógica da loja (etapa 1)
   Vitrine, filtros, detalhes, carrinho, cupons, login do cliente,
   checkout e área do lojista (rota oculta #/adminarena). Persistência em LocalStorage.
   ========================================================== */
(() => {
  'use strict';

  /* ----------------------------------------------------------
     Configuração do site (troque antes de publicar)
     ---------------------------------------------------------- */
  const SITE = {
    nome: 'Arena',
    dominio: 'www.usearenapdf.com.br',
    email: 'contato@usearenapdf.com.br'
  };

  /* Acesso do lojista: definido aqui, nunca pela interface.
     Para trocar a senha, gere um novo hash e aumente "v":
     node -e "const c=require('crypto');console.log(c.pbkdf2Sync('NOVA_SENHA','SALT',120000,32,'sha256').toString('hex'))"
     (use o mesmo SALT do objeto abaixo ou troque os dois). */
  const MERCHANT_SEED = {
    v: 1,
    user: 'admin.arena',
    salt: 'arena-2026-s1',
    iterations: 120000,
    hash: 'cd522ad162a06aaf909c50ce9b4d2e611f4ed1bd785d59759e1ced9e8d18d08f'
  };

  const KEYS = {
    products: 'arena:produtos',
    categories: 'arena:categorias',
    coupons: 'arena:cupons',
    cart: 'arena:carrinho',
    users: 'arena:clientes',
    session: 'arena:sessao',
    merchantAuth: 'arena:acesso-lojista',
    merchantLock: 'arena:lojista-bloqueio',
    orders: 'arena:pedidos',
    seeded: 'arena:catalogo-inicial'
  };
  const MERCHANT_SESSION = 'arena:lojista-sessao';
  const MSG_NO_ELIGIBLE = 'Não há produtos no carrinho que se apliquem ao cupom';

  /* ----------------------------------------------------------
     Utilidades
     ---------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const brl = (cents) => fmt.format(cents / 100);
  const toCents = (reais) => Math.round(Number(reais) * 100);
  const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const isUrl = (v) => { try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; } };
  const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  function parsePrice(v) {
    const s = String(v).trim().replace(/\s|R\$/g, '');
    if (!s) return NaN;
    return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  }

  const store = {
    get(key, fallback) {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch {
        toast('Não foi possível salvar no navegador. Verifique o espaço e as permissões.', true);
        return false;
      }
    }
  };

  const unsplash = (id, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#2a2c2f"/>' +
    '<svg x="130" y="170" width="140" height="147" viewBox="150 455 305 320" fill="#b9f566"><circle cx="210" cy="720" r="48"/><polygon points="290,465 441,768 358,768 248,547"/></svg></svg>'
  );
  const img = (src, alt = '', cls = '', lazy = true) =>
    `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" ${lazy ? 'loading="lazy"' : ''} decoding="async">`;

  // Imagem que falha ao carregar vira um placeholder neutro com a marca
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && !t.dataset.failed) {
      t.dataset.failed = '1';
      t.src = PLACEHOLDER;
    }
  }, true);

  /* ----------------------------------------------------------
     Estado
     ---------------------------------------------------------- */
  const state = {
    products: [], categories: [], coupons: [], users: [], orders: [],
    cart: { items: [], coupon: '' },
    session: null,
    filters: { query: '', category: 'all', gender: 'all', onlyPromo: false },
    sel: null,
    couponError: '',
    pendingCheckout: false,
    editing: { product: null, coupon: null, category: null }
  };

  const GENDERS = ['Feminino', 'Masculino', 'Unissex'];

  /* ----------------------------------------------------------
     Catálogo inicial (demonstração, o lojista pode editar ou excluir)
     ---------------------------------------------------------- */
  function seedData() {
    const P = {
      gym1: '1517836357463-d25dfeac3438', gym2: '1534438327276-14e5300c3a48', gym3: '1599058917212-d750089bc07e',
      woman1: '1594381898411-846e7d193883', woman2: '1576678927484-cc907957088c', run1: '1483721310020-03333e577078',
      run2: '1538805060514-97d9cc17730c', klass: '1518611012118-696072aa579a', shoe1: '1556906781-9a412961c28c',
      shoe2: '1595950653106-6c9ebd614d3a', man2: '1541534741688-6078c6bfb5c5', gear: '1571019613454-1cb2f99b2d8b'
    };
    const C = {
      preto: { name: 'Preto', hex: '#111214' }, grafite: { name: 'Grafite', hex: '#3a3d41' },
      branco: { name: 'Branco', hex: '#f4f4f2' }, verde: { name: 'Verde neon', hex: '#b9f566' },
      laranja: { name: 'Laranja', hex: '#ff6a1a' }, cinza: { name: 'Cinza', hex: '#8b9097' }
    };
    const cats = [
      { id: 'cat-camisas', name: 'Camisas', image: unsplash(P.woman1, 700) },
      { id: 'cat-shorts', name: 'Shorts', image: unsplash(P.run1, 700) },
      { id: 'cat-calcas', name: 'Calças', image: unsplash(P.woman2, 700) },
      { id: 'cat-tenis', name: 'Tênis', image: unsplash(P.shoe1, 700) },
      { id: 'cat-acessorios', name: 'Acessórios', image: unsplash(P.gym2, 700) }
    ];
    const vars = (sizes, colors, base) => {
      const out = [];
      colors.forEach((c, ci) => sizes.forEach((s, si) => out.push({ size: s, color: c.name, hex: c.hex, stock: base + ((ci * 3 + si * 2) % 6) })));
      return out;
    };
    const A = ['P', 'M', 'G', 'GG'];
    const S = ['38', '39', '40', '41', '42', '43'];
    const now = Date.now();
    const mk = (i, p) => ({ id: `prd-${i}`, createdAt: now - i * 1000, ...p });
    const products = [
      mk(1, { name: 'Camiseta Dry Treino', categoryId: 'cat-camisas', gender: 'Masculino', price: 89.9, promo: 71.92, photos: [unsplash(P.gym1), unsplash(P.man2)], description: 'Camiseta leve para treinos de musculação e funcional, com caimento reto e boa liberdade de movimento.', material: 'Poliéster com elastano', malha: 'Malha dry de secagem rápida', variations: vars(A, [C.preto, C.grafite, C.verde], 5) }),
      mk(2, { name: 'Regata Performance', categoryId: 'cat-camisas', gender: 'Feminino', price: 79.9, promo: 0, photos: [unsplash(P.woman1), unsplash(P.klass)], description: 'Regata de modelagem ajustada para treino, com costas livres e acabamento macio.', material: 'Poliamida com elastano', malha: 'Malha lisa de toque suave', variations: vars(A, [C.preto, C.laranja], 6) }),
      mk(3, { name: 'Camisa Manga Longa Treino', categoryId: 'cat-camisas', gender: 'Unissex', price: 119.9, promo: 0, photos: [unsplash(P.run2), unsplash(P.run1)], description: 'Manga longa para corrida e treinos ao ar livre, com recortes que acompanham o movimento.', material: 'Poliéster reciclado', malha: 'Malha dry', variations: vars(A, [C.cinza, C.preto], 4) }),
      mk(4, { name: 'Shorts Treino com Bolsos', categoryId: 'cat-shorts', gender: 'Masculino', price: 99.9, promo: 84.9, photos: [unsplash(P.man2), unsplash(P.gym3)], description: 'Shorts com cós elástico, cordão ajustável e bolsos laterais para o treino do dia a dia.', material: 'Poliéster', malha: 'Tactel leve', variations: vars(A, [C.preto, C.grafite], 5) }),
      mk(5, { name: 'Shorts Running Leve', categoryId: 'cat-shorts', gender: 'Feminino', price: 89.9, promo: 0, photos: [unsplash(P.run1), unsplash(P.run2)], description: 'Shorts curto para corrida e treino aeróbico, com forro interno e cós confortável.', material: 'Poliéster com elastano', malha: 'Malha com forro interno', variations: vars(A, [C.preto, C.verde], 4) }),
      mk(6, { name: 'Legging Cintura Alta', categoryId: 'cat-calcas', gender: 'Feminino', price: 149.9, promo: 119.92, photos: [unsplash(P.woman2), unsplash(P.klass)], description: 'Legging de cintura alta com boa sustentação, indicada para musculação e funcional.', material: 'Poliamida com elastano', malha: 'Malha compressiva opaca', variations: vars(A, [C.preto, C.grafite], 6) }),
      mk(7, { name: 'Calça Jogger Treino', categoryId: 'cat-calcas', gender: 'Masculino', price: 169.9, promo: 0, photos: [unsplash(P.gym3), unsplash(P.gym1)], description: 'Jogger com punhos ajustados e bolsos com zíper, pensada para treino e uso casual.', material: 'Poliéster com elastano', malha: 'Malha leve com stretch', variations: vars(A, [C.preto, C.cinza], 4) }),
      mk(8, { name: 'Tênis Treino Estável', categoryId: 'cat-tenis', gender: 'Unissex', price: 349.9, promo: 0, photos: [unsplash(P.shoe1), unsplash(P.shoe2)], description: 'Tênis com solado firme e base estável para levantamento, treino funcional e circuitos.', material: 'Cabedal sintético respirável', malha: 'Cabedal em mesh', variations: vars(S, [C.preto, C.branco], 3) }),
      mk(9, { name: 'Tênis Corrida Leve', categoryId: 'cat-tenis', gender: 'Unissex', price: 399.9, promo: 319.92, photos: [unsplash(P.shoe2), unsplash(P.run2)], description: 'Tênis leve com amortecimento para corridas de rua e treinos de longa duração.', material: 'Cabedal sintético e entressola em EVA', malha: 'Cabedal em mesh', variations: vars(S, [C.grafite, C.laranja], 3) }),
      mk(10, { name: 'Garrafa Térmica 750 ml', categoryId: 'cat-acessorios', gender: 'Unissex', price: 69.9, promo: 0, photos: [unsplash(P.gym2), unsplash(P.gear)], description: 'Garrafa com tampa rosqueável e boca larga para hidratação durante o treino.', material: 'Aço inoxidável', malha: 'Não se aplica', variations: vars(['ÚNICO'], [C.preto, C.branco], 10) }),
      mk(11, { name: 'Luvas de Treino', categoryId: 'cat-acessorios', gender: 'Unissex', price: 59.9, promo: 0, photos: [unsplash(P.gear), unsplash(P.gym2)], description: 'Luvas com palma reforçada para maior aderência na barra e nos halteres.', material: 'Poliéster e silicone', malha: 'Malha com reforço na palma', variations: vars(['P', 'M', 'G'], [C.preto], 6) }),
      mk(12, { name: 'Mochila de Academia', categoryId: 'cat-acessorios', gender: 'Unissex', price: 139.9, promo: 0, photos: [unsplash(P.gym3), unsplash(P.gym1)], description: 'Mochila com compartimento principal amplo e bolso lateral para tênis ou garrafa.', material: 'Poliéster resistente', malha: 'Não se aplica', variations: vars(['ÚNICO'], [C.preto, C.grafite], 8) })
    ];
    const coupons = [{ id: 'cup-site10', code: 'SITE10', percent: 10, scope: 'cart', categoryIds: [] }];
    return { cats, products, coupons };
  }

  /* ----------------------------------------------------------
     Carregamento
     ---------------------------------------------------------- */
  function loadState() {
    ensureMerchantAccess();
    if (!store.get(KEYS.seeded, false)) {
      const d = seedData();
      store.set(KEYS.categories, d.cats);
      store.set(KEYS.products, d.products);
      store.set(KEYS.coupons, d.coupons);
      store.set(KEYS.seeded, true);
    }
    const arr = (k) => { const v = store.get(k, []); return Array.isArray(v) ? v : []; };
    state.categories = arr(KEYS.categories);
    state.products = arr(KEYS.products).filter((p) => p && Array.isArray(p.variations) && Array.isArray(p.photos));
    state.coupons = arr(KEYS.coupons);
    state.users = arr(KEYS.users);
    state.orders = arr(KEYS.orders);
    const cart = store.get(KEYS.cart, null);
    state.cart = cart && Array.isArray(cart.items) ? { items: cart.items, coupon: cart.coupon || '' } : { items: [], coupon: '' };
    state.session = store.get(KEYS.session, null);
  }

  /* ----------------------------------------------------------
     Regras de produto
     ---------------------------------------------------------- */
  const findProduct = (id) => state.products.find((p) => p.id === id);
  const catName = (id) => (state.categories.find((c) => c.id === id) || {}).name || 'Sem categoria';
  const isPromo = (p) => p.promo > 0 && p.promo < p.price;
  const unitCents = (p) => toCents(isPromo(p) ? p.promo : p.price);
  const discountPct = (p) => (isPromo(p) ? Math.max(1, Math.round((1 - p.promo / p.price) * 100)) : 0);
  const totalStock = (p) => p.variations.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  const colorsOf = (p) => {
    const seen = new Map();
    p.variations.forEach((v) => { if (!seen.has(v.color)) seen.set(v.color, { name: v.color, hex: v.hex }); });
    return Array.from(seen.values());
  };

  function visibleProducts() {
    const { query, category, gender, onlyPromo } = state.filters;
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    const list = state.products.filter((p) => {
      if (category !== 'all' && p.categoryId !== category) return false;
      if (gender !== 'all') {
        if (gender === 'Unissex') { if (p.gender !== 'Unissex') return false; }
        else if (p.gender !== gender && p.gender !== 'Unissex') return false;
      }
      if (onlyPromo && !isPromo(p)) return false;
      if (tokens.length) {
        const hay = norm([p.name, p.description, p.material, p.malha, catName(p.categoryId), p.gender].join(' '));
        if (!tokens.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    // Promoção ativa vai para o topo (maior desconto primeiro), depois os mais recentes
    return list.sort((a, b) => (Number(isPromo(b)) - Number(isPromo(a))) || (discountPct(b) - discountPct(a)) || (b.createdAt - a.createdAt));
  }

  /* ----------------------------------------------------------
     Toasts
     ---------------------------------------------------------- */
  function toast(msg, isError = false) {
    const wrap = $('#toasts');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' is-error' : '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 320);
    }, 3200);
  }

  function setError(el, msg) {
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.textContent = msg;
    el.hidden = false;
    el.classList.remove('is-shake');
    void el.offsetWidth;
    el.classList.add('is-shake');
  }

  /* ----------------------------------------------------------
     Modais e gaveta
     ---------------------------------------------------------- */
  const openStack = [];
  const lastFocus = {};
  let confirmResolver = null;

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    clearTimeout(el._t);
    lastFocus[id] = document.activeElement;
    el.hidden = false;
    document.body.classList.add('no-scroll');
    void el.offsetWidth;
    el.classList.add('is-open');
    if (!openStack.includes(id)) openStack.push(id);
    const dlg = el.querySelector('[role="dialog"], [role="alertdialog"]');
    setTimeout(() => dlg && dlg.focus({ preventScroll: true }), 40);
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el || el.hidden) return;
    el.classList.remove('is-open');
    const i = openStack.indexOf(id);
    if (i >= 0) openStack.splice(i, 1);
    if (id === 'modal-confirm' && confirmResolver) { confirmResolver(false); confirmResolver = null; }
    if (id === 'modal-auth' && !currentUser()) state.pendingCheckout = false;
    el._t = setTimeout(() => {
      el.hidden = true;
      if (!openStack.length) document.body.classList.remove('no-scroll');
    }, 300);
    const prev = lastFocus[id];
    if (prev && prev.focus && document.contains(prev)) setTimeout(() => prev.focus({ preventScroll: true }), 60);
  }

  function confirmDialog({ title, text, okLabel = 'Excluir' }) {
    $('#confirm-title').textContent = title;
    $('#confirm-text').textContent = text;
    $('#confirm-ok').textContent = okLabel;
    openModal('modal-confirm');
    return new Promise((resolve) => { confirmResolver = resolve; });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openStack.length) { closeModal(openStack[openStack.length - 1]); return; }
    if (e.key === 'Tab' && openStack.length) {
      const el = document.getElementById(openStack[openStack.length - 1]);
      const f = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]', el).filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement.getAttribute('role') === 'dialog')) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ----------------------------------------------------------
     Abas com indicador deslizante
     ---------------------------------------------------------- */
  function moveInk(wrap) {
    const ink = wrap.querySelector('.tabs__ink');
    if (!ink) return;
    const active = wrap.querySelector('.tab.is-active');
    if (!active || !active.offsetWidth) { ink.style.width = '0px'; return; }
    ink.style.width = active.offsetWidth + 'px';
    ink.style.transform = `translateX(${active.offsetLeft}px)`;
  }
  const refreshInks = () => $$('.tabs').forEach(moveInk);

  /* ----------------------------------------------------------
     Vitrine: categorias, filtros e cards
     ---------------------------------------------------------- */
  function renderCategoryTiles() {
    const section = $('#categorias');
    section.hidden = state.categories.length === 0;
    $('#category-tiles').innerHTML = state.categories.map((c, i) => `
      <button type="button" class="tile reveal ${c.image ? '' : 'is-no-image'}" style="--i:${i}" data-cat-tile="${esc(c.id)}" aria-label="Ver ${esc(c.name)}">
        ${c.image ? img(c.image, '', 'tile__img') : ''}
        <span class="tile__shade"></span>
        <span class="tile__label"><span>${esc(c.name)}</span>${icon('arrow')}</span>
      </button>`).join('');
    observeReveal();
  }

  function renderFilterTabs() {
    const tabs = [{ id: 'all', name: 'Todos' }, ...state.categories];
    $('#category-tabs').innerHTML = tabs.map((t) =>
      `<button type="button" class="tab" role="tab" data-cat="${esc(t.id)}">${esc(t.name)}</button>`).join('') + '<span class="tabs__ink" aria-hidden="true"></span>';
    const g = ['Todos', ...GENDERS];
    $('#gender-tabs').innerHTML = g.map((n) => `<button type="button" data-gender="${n === 'Todos' ? 'all' : n}">${n}</button>`).join('');
    syncFilterUI();
  }

  function filtersActive() {
    const f = state.filters;
    return Boolean(f.query.trim()) || f.category !== 'all' || f.gender !== 'all' || f.onlyPromo;
  }

  function syncFilterUI() {
    const f = state.filters;
    if (f.category !== 'all' && !state.categories.some((c) => c.id === f.category)) f.category = 'all';
    $$('#category-tabs .tab').forEach((b) => {
      const on = b.dataset.cat === f.category;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on);
    });
    $$('#gender-tabs button').forEach((b) => {
      const on = b.dataset.gender === f.gender;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
    const pt = $('#btn-promo-toggle');
    pt.setAttribute('aria-pressed', f.onlyPromo);
    $('#search-clear').hidden = !f.query;
    $('#btn-clear-filters').hidden = !filtersActive();
    const input = $('#search-input');
    if (input.value !== f.query) input.value = f.query;
    moveInk($('#category-tabs'));
  }

  function cardHTML(p, i) {
    const promo = isPromo(p);
    const sold = totalStock(p) === 0;
    const sizes = [...new Set(p.variations.filter((v) => v.stock > 0).map((v) => v.size))];
    return `
    <article class="card" style="--i:${Math.min(i, 10)}">
      <div class="card__media">
        ${img(p.photos[0] || PLACEHOLDER, p.name, 'card__img')}
        ${p.photos[1] ? img(p.photos[1], '', 'card__img card__img--alt') : ''}
        <div class="card__badges">
          ${promo ? `<span class="badge badge--discount">-${discountPct(p)}%</span>` : ''}
          ${sold ? '<span class="badge badge--out">Esgotado</span>' : ''}
        </div>
      </div>
      <div class="card__body">
        <p class="card__meta">${esc(catName(p.categoryId))} / ${esc(p.gender)}</p>
        <h3 class="card__title">${esc(p.name)}</h3>
        <p class="card__sizes">${sizes.length ? sizes.map((s) => `<span>${esc(s)}</span>`).join('') : 'Sem estoque no momento'}</p>
        <div class="card__price">
          <span class="price-now ${promo ? 'is-promo' : ''}">${brl(unitCents(p))}</span>
          ${promo ? `<s class="price-old">${brl(toCents(p.price))}</s>` : ''}
        </div>
        <button type="button" class="btn btn--dark btn--block" data-details="${esc(p.id)}">Ver detalhes ${icon('arrow')}</button>
      </div>
    </article>`;
  }

  function renderGrid() {
    const list = visibleProducts();
    $('#product-grid').innerHTML = list.map(cardHTML).join('');
    const empty = $('#empty-products');
    empty.hidden = list.length > 0;
    if (!list.length) {
      const none = state.products.length === 0;
      $('#empty-title').textContent = none ? 'Vitrine em atualização' : 'Nenhum produto encontrado';
      $('#empty-text').textContent = none
        ? 'Ainda não há produtos cadastrados. Volte em breve.'
        : 'Não encontramos produtos para essa busca ou combinação de filtros. Tente outro termo ou remova os filtros.';
      $('#empty-action').hidden = none;
      empty.style.animation = 'none'; void empty.offsetWidth; empty.style.animation = '';
    }
    const n = list.length;
    $('#result-count').textContent = state.products.length ? `${n} ${n === 1 ? 'produto' : 'produtos'}` : '';
    $('#promo-banner').hidden = !state.products.some(isPromo);
  }

  function applyFilters() { syncFilterUI(); renderGrid(); }
  function scrollToShowcase() { $('#vitrine').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function clearFilters() { state.filters = { query: '', category: 'all', gender: 'all', onlyPromo: false }; applyFilters(); }

  /* ----------------------------------------------------------
     Página de detalhes do produto (rota #/produto/ID)
     Tela cheia, tema claro, com galeria, seletores e relacionados.
     ---------------------------------------------------------- */
  const hiRes = (src) => (/images\.unsplash\.com/.test(src) ? src.replace(/([?&])w=\d+/, '$1w=1400') : src);

  function relatedOf(p) {
    const same = state.products.filter((x) => x.id !== p.id && x.categoryId === p.categoryId);
    const others = state.products.filter((x) => x.id !== p.id && x.categoryId !== p.categoryId && (x.gender === p.gender || x.gender === 'Unissex' || p.gender === 'Unissex'));
    return [...same, ...others].slice(0, 4);
  }

  function prepareProduct(id) {
    const p = findProduct(id);
    if (!p) return null;
    const colors = colorsOf(p);
    const first = colors.find((c) => p.variations.some((v) => v.color === c.name && v.stock > 0)) || colors[0];
    state.sel = { id, color: first ? first.name : '', size: null };
    renderProductPage(p);
    return p;
  }

  function renderProductPage(p) {
    const promo = isPromo(p);
    const sold = totalStock(p) === 0;
    const rel = relatedOf(p);
    const photos = p.photos.length ? p.photos : [PLACEHOLDER];
    const colorNames = colorsOf(p).map((c) => c.name).join(', ');
    const sizeList = [...new Set(p.variations.map((v) => v.size))].join(', ');

    $('#product-page').innerHTML = `
      <div class="pv__bar">
        <a class="pv__back" href="#vitrine">${icon('back')} Voltar à vitrine</a>
        <nav class="pv__crumbs" aria-label="Você está em">
          <a href="#vitrine">Loja</a><span aria-hidden="true">/</span>
          <button type="button" class="link-btn" data-crumb-cat="${esc(p.categoryId)}">${esc(catName(p.categoryId))}</button><span aria-hidden="true">/</span>
          <span aria-current="page">${esc(p.name)}</span>
        </nav>
      </div>

      <section class="pv__main" aria-labelledby="pv-title">
        <div class="pv__gallery ${photos.length > 1 ? '' : 'no-thumbs'}">
          ${photos.length > 1 ? `
          <div class="pv__thumbs" role="group" aria-label="Fotos do produto">
            ${photos.map((src, i) => `
            <button type="button" class="pv__thumb ${i === 0 ? 'is-active' : ''}" data-photo="${i}" aria-label="Ver foto ${i + 1}">${img(src, '', '', false)}</button>`).join('')}
          </div>` : ''}
          <div class="pv__stage">
            <img id="pd-main" src="${esc(hiRes(photos[0]))}" alt="${esc(p.name)}" decoding="async" fetchpriority="high">
            <div class="card__badges">
              ${promo ? `<span class="badge badge--discount">-${discountPct(p)}%</span>` : ''}
              ${sold ? '<span class="badge badge--out">Esgotado</span>' : ''}
            </div>
          </div>
        </div>

        <div class="pv__info">
          <p class="eyebrow">${esc(catName(p.categoryId))} / ${esc(p.gender)}</p>
          <h1 id="pv-title" class="pv__title">${esc(p.name)}</h1>

          <div class="pv__price">
            ${promo ? `
              <div><small>Preço promocional</small><span class="price-now is-promo">${brl(unitCents(p))}</span></div>
              <div><small>Preço lançado</small><s class="price-old">${brl(toCents(p.price))}</s></div>`
            : `<div><small>Preço lançado</small><span class="price-now">${brl(unitCents(p))}</span></div>`}
          </div>

          <div class="pv__block">
            <p class="pv__label">Cor <strong id="pd-color-name"></strong></p>
            <div class="swatches" id="pd-colors"></div>
          </div>
          <div class="pv__block">
            <p class="pv__label">Tamanho <strong id="pd-size-name"></strong></p>
            <div class="sizes" id="pd-sizes"></div>
          </div>

          <p class="form-error" id="pd-error" role="alert" hidden></p>
          <div class="pv__buy">
            <button type="button" class="btn btn--primary btn--lg" id="pd-add" ${sold ? 'disabled' : ''}>${icon('bag')} ${sold ? 'Produto esgotado' : 'Adicionar ao carrinho'}</button>
            <button type="button" class="btn btn--ghost btn--lg" data-open-cart>Ver carrinho</button>
          </div>

          <ul class="pv__notes">
            <li>${icon('tag')}<span>Cupons de desconto são aplicados no carrinho.</span></li>
            <li>${icon('lock')}<span>Para finalizar a compra, entre ou crie sua conta.</span></li>
          </ul>
        </div>
      </section>

      <section class="pv__details" aria-label="Detalhes técnicos">
        <div class="tabs" id="pv-tabs" role="tablist">
          <button type="button" class="tab is-active" role="tab" aria-selected="true" data-pd-tab="desc">Descrição</button>
          <button type="button" class="tab" role="tab" aria-selected="false" data-pd-tab="spec">Material e malha</button>
          <span class="tabs__ink" aria-hidden="true"></span>
        </div>
        <div class="pv__panel" id="pv-panel-desc" role="tabpanel">
          <p>${esc(p.description || 'Sem descrição cadastrada.').replace(/\n/g, '<br>')}</p>
        </div>
        <div class="pv__panel" id="pv-panel-spec" role="tabpanel" hidden>
          <dl class="specs">
            <div><dt>Material</dt><dd>${esc(p.material || 'Não informado')}</dd></div>
            <div><dt>Tipo de malha</dt><dd>${esc(p.malha || 'Não informado')}</dd></div>
            <div><dt>Cores</dt><dd>${esc(colorNames)}</dd></div>
            <div><dt>Tamanhos</dt><dd>${esc(sizeList)}</dd></div>
            <div><dt>Categoria</dt><dd>${esc(catName(p.categoryId))}</dd></div>
            <div><dt>Gênero</dt><dd>${esc(p.gender)}</dd></div>
          </dl>
        </div>
      </section>

      ${rel.length ? `
      <section class="pv__related" aria-labelledby="rel-title">
        <h2 id="rel-title">Produtos relacionados</h2>
        <div class="grid">${rel.map(cardHTML).join('')}</div>
      </section>` : ''}`;

    updateSelectors();
    moveInk($('#pv-tabs'));
  }

  function updateSelectors() {
    const s = state.sel;
    const p = s && findProduct(s.id);
    if (!p || !$('#pd-colors')) return;
    const vs = p.variations.filter((v) => v.color === s.color);
    if (s.size && !vs.some((v) => v.size === s.size && v.stock > 0)) s.size = null;

    $('#pd-colors').innerHTML = colorsOf(p).map((c) => {
      const has = p.variations.some((v) => v.color === c.name && v.stock > 0);
      return `<button type="button" class="swatch ${c.name === s.color ? 'is-selected' : ''} ${has ? '' : 'is-out'}" data-color="${esc(c.name)}" title="${esc(c.name)}${has ? '' : ' (indisponível)'}" aria-label="Cor ${esc(c.name)}${has ? '' : ', indisponível'}" aria-pressed="${c.name === s.color}"><span style="background:${esc(isHex(c.hex) ? c.hex : '#888')}"></span></button>`;
    }).join('');
    $('#pd-color-name').textContent = s.color;

    $('#pd-sizes').innerHTML = vs.map((v) =>
      `<button type="button" class="size ${v.size === s.size ? 'is-selected' : ''}" data-size="${esc(v.size)}" ${v.stock <= 0 ? 'disabled' : ''} aria-pressed="${v.size === s.size}">${esc(v.size)}</button>`).join('');
    $('#pd-size-name').textContent = s.size || '';
    setError($('#pd-error'), '');
  }

  function addFromPage() {
    const s = state.sel;
    const p = s && findProduct(s.id);
    const err = $('#pd-error');
    if (!p) return;
    if (!s.size) { setError(err, 'Selecione um tamanho para continuar.'); return; }
    const v = p.variations.find((x) => x.size === s.size && x.color === s.color);
    if (!v || v.stock <= 0) { setError(err, 'Esta combinação de tamanho e cor está indisponível.'); return; }
    if (cartQty(p.id, s.size, s.color) + 1 > v.stock) { setError(err, 'Você já adicionou ao carrinho todas as unidades disponíveis desta variação.'); return; }
    addToCart(p.id, s.size, s.color, 1);
    setError(err, '');
    toast(`${p.name} (${s.size}, ${s.color}) adicionado ao carrinho.`);
    const btn = $('#pd-add');
    btn.innerHTML = `${icon('check')} Adicionado`;
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { if (btn.isConnected) btn.innerHTML = `${icon('bag')} Adicionar ao carrinho`; }, 1400);
  }

  /* ----------------------------------------------------------
     Carrinho e cupons
     ---------------------------------------------------------- */
  const itemKey = (id, size, color) => `${id}|${size}|${color}`;
  const cartQty = (id, size, color) => (state.cart.items.find((i) => i.key === itemKey(id, size, color)) || { qty: 0 }).qty;
  const findCoupon = (code) => state.coupons.find((c) => c.code === String(code || '').trim().toUpperCase());

  function saveCart() { store.set(KEYS.cart, state.cart); }

  function addToCart(id, size, color, qty) {
    const key = itemKey(id, size, color);
    const it = state.cart.items.find((i) => i.key === key);
    if (it) it.qty += qty; else state.cart.items.push({ key, id, size, color, qty });
    saveCart();
    updateCartUI(true);
  }

  // Remove itens de produtos excluídos e ajusta quantidades acima do estoque
  function sanitizeCart() {
    let changed = false;
    state.cart.items = state.cart.items.filter((it) => {
      const p = findProduct(it.id);
      const v = p && p.variations.find((x) => x.size === it.size && x.color === it.color);
      if (!v || v.stock <= 0) { changed = true; return false; }
      if (it.qty > v.stock) { it.qty = v.stock; changed = true; }
      return true;
    });
    if (changed) saveCart();
    return changed;
  }

  function cartLines() {
    return state.cart.items.map((it) => {
      const p = findProduct(it.id);
      const v = p && p.variations.find((x) => x.size === it.size && x.color === it.color);
      if (!p || !v) return null;
      const unit = unitCents(p);
      return { it, p, v, unit, total: unit * it.qty };
    }).filter(Boolean);
  }

  function eligibleLines(coupon, lines) {
    return coupon.scope === 'cart' ? lines : lines.filter((l) => coupon.categoryIds.includes(l.p.categoryId));
  }

  function cartTotals() {
    const adjusted = sanitizeCart();
    const lines = cartLines();
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    let discount = 0, coupon = null, couponMsg = '';
    if (state.cart.coupon) {
      coupon = findCoupon(state.cart.coupon);
      if (!coupon) { state.cart.coupon = ''; saveCart(); }
      else {
        const elig = eligibleLines(coupon, lines);
        if (!elig.length) couponMsg = MSG_NO_ELIGIBLE;
        else discount = Math.round(elig.reduce((s, l) => s + l.total, 0) * coupon.percent / 100);
      }
    }
    return { lines, subtotal, discount, coupon, couponMsg, total: subtotal - discount, adjusted };
  }

  function applyCoupon(raw) {
    const code = String(raw || '').trim().toUpperCase();
    if (!code) { state.couponError = 'Digite o código do cupom.'; renderCart(); return; }
    const c = findCoupon(code);
    if (!c) { state.couponError = 'Cupom inválido ou inexistente.'; renderCart(); return; }
    const elig = eligibleLines(c, cartLines());
    if (!elig.length) { state.couponError = MSG_NO_ELIGIBLE; renderCart(); return; }
    state.cart.coupon = c.code;
    saveCart();
    renderCart();
    toast(`Cupom ${c.code} aplicado.`);
  }

  function updateCartUI(bump = false) {
    const qty = state.cart.items.reduce((s, i) => s + i.qty, 0);
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = qty;
      el.hidden = qty === 0;
      if (bump && qty) { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); }
    });
    renderCart();
  }

  function renderCart() {
    const t = cartTotals();
    const body = $('#cart-body'), foot = $('#cart-foot');
    const err = state.couponError; state.couponError = '';

    if (!t.lines.length) {
      body.innerHTML = `
        <div class="empty" style="border:0">
          <div class="empty__icon">${icon('bag')}</div>
          <h3>Seu carrinho está vazio</h3>
          <p>Adicione produtos para ver o resumo e aplicar cupons.</p>
          <button type="button" class="btn btn--primary" data-explore>Explorar produtos ${icon('arrow')}</button>
        </div>`;
      foot.hidden = true;
      return;
    }
    foot.hidden = false;
    body.innerHTML = t.lines.map((l) => `
      <div class="cart-line">
        ${img(l.p.photos[0] || PLACEHOLDER, l.p.name, 'cart-line__img')}
        <div>
          <p class="cart-line__name">${esc(l.p.name)}</p>
          <p class="cart-line__opts">Tamanho ${esc(l.it.size)} / ${esc(l.it.color)}</p>
          <div class="cart-line__row">
            <div class="qty">
              <button type="button" data-qty="-1" data-key="${esc(l.it.key)}" aria-label="Diminuir quantidade">${icon('minus')}</button>
              <span aria-live="polite">${l.it.qty}</span>
              <button type="button" data-qty="1" data-key="${esc(l.it.key)}" aria-label="Aumentar quantidade" ${l.it.qty >= l.v.stock ? 'disabled' : ''}>${icon('plus')}</button>
            </div>
            <button type="button" class="icon-btn" data-remove="${esc(l.it.key)}" aria-label="Remover ${esc(l.p.name)}">${icon('trash')}</button>
          </div>
        </div>
        <div class="cart-line__price">${brl(l.total)}${isPromo(l.p) ? `<s>${brl(toCents(l.p.price) * l.it.qty)}</s>` : ''}</div>
      </div>`).join('');

    const applied = t.coupon;
    foot.innerHTML = `
      ${applied ? `
        <div class="coupon-chip"><span>Cupom <strong>${esc(applied.code)}</strong> (${applied.percent}%)</span>
          <button type="button" class="link-btn" data-coupon-remove>Remover</button></div>
        ${t.couponMsg ? `<p class="msg msg--error">${esc(t.couponMsg)}</p>` : ''}`
      : `
        <form class="coupon-form" id="cart-coupon-form" novalidate>
          <input id="cart-coupon-input" placeholder="Código do cupom" autocomplete="off" aria-label="Código do cupom" maxlength="20">
          <button class="btn btn--ghost btn--sm" type="submit">Aplicar</button>
        </form>
        ${err ? `<p class="msg msg--error" role="alert">${esc(err)}</p>` : ''}`}
      <div class="summary">
        <div><span>Subtotal</span><span>${brl(t.subtotal)}</span></div>
        ${t.discount ? `<div class="is-discount"><span>Desconto (${esc(applied.code)})</span><span>-${brl(t.discount)}</span></div>` : ''}
        <div class="is-total"><span>Total</span><span>${brl(t.total)}</span></div>
      </div>
      <button type="button" class="btn btn--primary btn--block btn--lg" data-checkout>Finalizar compra ${icon('arrow')}</button>
      <p class="fineprint">${currentUser() ? `Compra em nome de ${esc(currentUser().name.split(' ')[0])}.` : 'Para concluir a compra é necessário entrar ou criar uma conta.'}</p>`;
    if (t.adjusted) toast('Algumas quantidades foram ajustadas conforme o estoque.');
  }

  function changeQty(key, delta) {
    const it = state.cart.items.find((i) => i.key === key);
    if (!it) return;
    it.qty += delta;
    if (it.qty <= 0) state.cart.items = state.cart.items.filter((i) => i.key !== key);
    saveCart();
    updateCartUI();
  }

  /* ----------------------------------------------------------
     Conta do cliente
     ---------------------------------------------------------- */
  async function sha(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381;
    for (const ch of text) h = ((h << 5) + h + ch.codePointAt(0)) >>> 0;
    return 'f' + h.toString(16);
  }

  const currentUser = () => state.users.find((u) => u.id === state.session) || null;

  function updateAccountUI() {
    const u = currentUser();
    $('#account-label').textContent = u ? u.name.split(' ')[0] : 'Entrar';
  }

  function setAuthTab(tab) {
    $$('[data-auth-tab]').forEach((b) => b.classList.toggle('is-active', b.dataset.authTab === tab));
    $('#form-login').hidden = tab !== 'login';
    $('#form-register').hidden = tab !== 'register';
    ['#log-error', '#reg-error'].forEach((s) => setError($(s), ''));
  }

  function openAuth(tab = 'login', note = '') {
    const u = currentUser();
    const noteEl = $('#auth-note');
    noteEl.textContent = note;
    noteEl.hidden = !note;
    $('#auth-tabs').hidden = Boolean(u);
    $('#auth-account').hidden = !u;
    $('#form-login').hidden = Boolean(u) || tab !== 'login';
    $('#form-register').hidden = Boolean(u) || tab !== 'register';
    if (u) { $('#acc-name').textContent = u.name; $('#acc-email').textContent = u.email; }
    else setAuthTab(tab);
    openModal('modal-auth');
  }

  function loginUser(user) {
    state.session = user.id;
    store.set(KEYS.session, user.id);
    updateAccountUI();
    $('#form-login').reset();
    $('#form-register').reset();
    closeModal('modal-auth');
    toast(`Olá, ${user.name.split(' ')[0]}.`);
    renderCart();
    if (state.pendingCheckout) { state.pendingCheckout = false; setTimeout(startCheckout, 350); }
  }

  /* ----------------------------------------------------------
     Checkout
     ---------------------------------------------------------- */
  function startCheckout() {
    const t = cartTotals();
    if (!t.lines.length) { toast('Seu carrinho está vazio.'); return; }
    if (!currentUser()) {
      state.pendingCheckout = true;
      closeModal('drawer-cart');
      setTimeout(() => openAuth('login', 'Entre ou crie sua conta para concluir a compra. Seu carrinho continua salvo.'), 200);
      return;
    }
    placeOrder(t);
  }

  function placeOrder(t) {
    const user = currentUser();
    const order = {
      id: 'ARN-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).slice(2, 4).toUpperCase(),
      userId: user.id,
      customer: { name: user.name, email: user.email },
      items: t.lines.map((l) => ({ productId: l.p.id, name: l.p.name, size: l.it.size, color: l.it.color, qty: l.it.qty, unit: l.unit })),
      subtotal: t.subtotal,
      discount: t.discount,
      coupon: t.discount > 0 && t.coupon ? t.coupon.code : '',
      total: t.total,
      status: 'Aguardando pagamento',
      createdAt: Date.now()
    };
    t.lines.forEach((l) => { l.v.stock = Math.max(0, l.v.stock - l.it.qty); });
    state.orders.unshift(order);
    store.set(KEYS.orders, state.orders);
    store.set(KEYS.products, state.products);
    state.cart = { items: [], coupon: '' };
    saveCart();
    updateCartUI();
    renderGrid();
    closeModal('drawer-cart');

    $('#order-body').innerHTML = `
      <div class="order-ok">
        <div class="order-ok__icon">${icon('check')}</div>
        <h2 id="order-title">Pedido registrado</h2>
        <p>Obrigado, ${esc(user.name.split(' ')[0])}. Seu pedido foi salvo com o status Aguardando pagamento. A etapa de pagamento online será liberada na próxima fase da loja.</p>
        <span class="order-ok__id">${esc(order.id)}</span>
        <p>Total do pedido: <strong>${brl(order.total)}</strong></p>
        <button type="button" class="btn btn--primary" data-close>Continuar comprando</button>
      </div>`;
    setTimeout(() => openModal('modal-order'), 250);
  }

  /* ----------------------------------------------------------
     Revelar ao rolar
     ---------------------------------------------------------- */
  let io;
  function observeReveal() {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach((e) => e.classList.add('is-visible')); return; }
    io = io || new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    }), { threshold: 0.12 });
    $$('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
  }

  /* ==========================================================
     ÁREA DO LOJISTA
     ========================================================== */
  const merchantAuthed = () => { try { return sessionStorage.getItem(MERCHANT_SESSION) === '1'; } catch { return false; } };
  const setMerchantAuthed = (on) => { try { on ? sessionStorage.setItem(MERCHANT_SESSION, '1') : sessionStorage.removeItem(MERCHANT_SESSION); } catch { /* ignora */ } };

  function renderAdmin() {
    const authed = merchantAuthed() && Boolean(store.get(KEYS.merchantAuth, null));
    $('#admin-gate').hidden = authed;
    $('#admin-panel').hidden = !authed;
    if (!authed) return;
    renderProductFormOptions();
    renderCatalog();
    renderCouponList();
    renderCouponCats();
    renderCategoryList();
    renderOrderList();
    if (!$('#var-rows').children.length) resetProductForm();
    requestAnimationFrame(refreshInks);
  }

  function switchAdminTab(name) {
    $$('#admin-tabs .tab').forEach((b) => {
      const on = b.dataset.adminTab === name;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on);
    });
    $$('.pane').forEach((p) => {
      const on = p.id === `pane-${name}`;
      p.hidden = !on;
      p.classList.toggle('is-active', on);
    });
    moveInk($('#admin-tabs'));
  }

  /* ---------- Produtos ---------- */
  function renderProductFormOptions() {
    const sel = $('#pf-category');
    const cur = sel.value;
    sel.innerHTML = state.categories.length
      ? state.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')
      : '<option value="">Crie uma categoria primeiro</option>';
    if (cur && state.categories.some((c) => c.id === cur)) sel.value = cur;
  }

  function varRowHTML(v = { size: '', color: '', hex: '#111214', stock: 0 }) {
    return `<div class="var-row">
      <input class="var-size" maxlength="8" placeholder="M" value="${esc(v.size)}" aria-label="Tamanho" autocomplete="off">
      <input class="var-color" maxlength="30" placeholder="Preto" value="${esc(v.color)}" aria-label="Nome da cor" autocomplete="off">
      <input class="var-hex" type="color" value="${esc(isHex(v.hex) ? v.hex : '#111214')}" aria-label="Amostra da cor">
      <input class="var-stock" type="number" min="0" step="1" value="${esc(v.stock)}" aria-label="Estoque">
      <button type="button" class="icon-btn" data-var-remove aria-label="Remover variação">${icon('trash')}</button>
    </div>`;
  }

  function resetProductForm() {
    state.editing.product = null;
    $('#product-form').reset();
    $('#var-rows').innerHTML = varRowHTML();
    $('#product-form-title').textContent = 'Novo produto';
    $('#pf-submit').textContent = 'Salvar produto';
    $('#product-cancel').hidden = true;
    setError($('#pf-error'), '');
    renderProductFormOptions();
  }

  function loadProductIntoForm(id) {
    const p = findProduct(id);
    if (!p) return;
    state.editing.product = id;
    renderProductFormOptions();
    $('#pf-name').value = p.name;
    $('#pf-category').value = p.categoryId;
    $('#pf-gender').value = p.gender;
    $('#pf-price').value = String(p.price).replace('.', ',');
    $('#pf-promo').value = p.promo ? String(p.promo).replace('.', ',') : '';
    $('#pf-desc').value = p.description || '';
    $('#pf-material').value = p.material || '';
    $('#pf-malha').value = p.malha || '';
    $('#pf-photos').value = p.photos.join('\n');
    $('#var-rows').innerHTML = p.variations.map(varRowHTML).join('');
    $('#product-form-title').textContent = 'Editando produto';
    $('#pf-submit').textContent = 'Salvar alterações';
    $('#product-cancel').hidden = false;
    setError($('#pf-error'), '');
    $('#product-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function submitProduct(e) {
    e.preventDefault();
    const err = $('#pf-error');
    const name = $('#pf-name').value.trim();
    const categoryId = $('#pf-category').value;
    const gender = $('#pf-gender').value;
    const price = parsePrice($('#pf-price').value);
    const promoRaw = $('#pf-promo').value.trim();
    const promo = promoRaw ? parsePrice(promoRaw) : 0;
    const photos = $('#pf-photos').value.split(/\n+/).map((s) => s.trim()).filter(Boolean);

    if (name.length < 2) return setError(err, 'Informe o nome do produto.');
    if (!categoryId) return setError(err, 'Selecione uma categoria. Se não houver, crie na aba Categorias.');
    if (!(price > 0)) return setError(err, 'Informe o preço lançado (normal) maior que zero.');
    if (promoRaw && !(promo > 0 && promo < price)) return setError(err, 'O preço promocional precisa ser maior que zero e menor que o preço lançado.');
    if (!photos.length) return setError(err, 'Informe pelo menos uma URL de foto.');
    if (photos.some((u) => !isUrl(u))) return setError(err, 'Todas as URLs de foto precisam começar com http:// ou https://.');

    const variations = [];
    const seen = new Set();
    for (const row of $$('#var-rows .var-row')) {
      const size = row.querySelector('.var-size').value.trim().toUpperCase();
      const color = row.querySelector('.var-color').value.trim();
      const hex = row.querySelector('.var-hex').value;
      const stock = Number(row.querySelector('.var-stock').value);
      if (!size && !color && !stock) continue;
      if (!size || !color) return setError(err, 'Cada variação precisa de tamanho e cor.');
      if (!Number.isInteger(stock) || stock < 0) return setError(err, 'O estoque deve ser um número inteiro, zero ou maior.');
      const k = `${size}|${norm(color)}`;
      if (seen.has(k)) return setError(err, `A variação ${size} / ${color} está repetida.`);
      seen.add(k);
      variations.push({ size, color, hex: isHex(hex) ? hex : '#111214', stock });
    }
    if (!variations.length) return setError(err, 'Adicione pelo menos uma variação de tamanho e cor com estoque.');

    const data = {
      name, categoryId, gender, price: Math.round(price * 100) / 100, promo: promo ? Math.round(promo * 100) / 100 : 0,
      description: $('#pf-desc').value.trim(), material: $('#pf-material').value.trim(), malha: $('#pf-malha').value.trim(),
      photos, variations
    };
    if (state.editing.product) {
      const p = findProduct(state.editing.product);
      Object.assign(p, data);
      toast('Produto atualizado.');
    } else {
      state.products.push({ id: uid('prd'), createdAt: Date.now(), ...data });
      toast('Produto cadastrado.');
    }
    store.set(KEYS.products, state.products);
    resetProductForm();
    refreshStoreAndAdmin();
  }

  function renderCatalog() {
    const list = [...state.products].sort((a, b) => b.createdAt - a.createdAt);
    $('#catalog-list').innerHTML = list.length ? list.map((p) => `
      <div class="row">
        ${img(p.photos[0] || PLACEHOLDER, '', 'row__thumb')}
        <div>
          <p class="row__title">${esc(p.name)}</p>
          <p class="row__meta">${esc(catName(p.categoryId))} / ${esc(p.gender)}</p>
          <p class="row__meta">${isPromo(p) ? `<s>${brl(toCents(p.price))}</s><b>${brl(toCents(p.promo))}</b>` : brl(toCents(p.price))} / Estoque total: ${totalStock(p)} / ${p.variations.length} ${p.variations.length === 1 ? 'variação' : 'variações'}</p>
        </div>
        <div class="row__actions">
          <button type="button" class="icon-btn icon-btn--edit" data-edit-product="${esc(p.id)}" aria-label="Editar ${esc(p.name)}">${icon('edit')}</button>
          <button type="button" class="icon-btn" data-delete-product="${esc(p.id)}" aria-label="Excluir ${esc(p.name)}">${icon('trash')}</button>
        </div>
      </div>`).join('') : '<div class="list-empty">Nenhum produto cadastrado. Use o formulário para criar o primeiro.</div>';
  }

  /* ---------- Cupons ---------- */
  const couponScope = () => ($('input[name="cp-scope"]:checked') || {}).value || 'cart';

  function renderCouponCats(selected = []) {
    $('#cp-cats').innerHTML = state.categories.length ? state.categories.map((c) => `
      <label class="check"><input type="checkbox" value="${esc(c.id)}" ${selected.includes(c.id) ? 'checked' : ''}><span>${esc(c.name)}</span></label>`).join('')
      : '<p class="hint">Crie categorias para usar esta regra.</p>';
  }

  function resetCouponForm() {
    state.editing.coupon = null;
    $('#coupon-form').reset();
    $('#cp-cats-wrap').hidden = true;
    renderCouponCats();
    $('#coupon-form-title').textContent = 'Novo cupom';
    $('#coupon-cancel').hidden = true;
    setError($('#cp-error'), '');
  }

  function submitCoupon(e) {
    e.preventDefault();
    const err = $('#cp-error');
    const code = $('#cp-code').value.trim().toUpperCase();
    const percent = Number($('#cp-percent').value);
    const scope = couponScope();
    const categoryIds = scope === 'categories' ? $$('#cp-cats input:checked').map((i) => i.value) : [];
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return setError(err, 'O código deve ter de 3 a 20 caracteres, usando letras, números, hífen ou sublinhado.');
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) return setError(err, 'O desconto deve ser um número inteiro de 1 a 100.');
    if (scope === 'categories' && !categoryIds.length) return setError(err, 'Selecione pelo menos uma categoria para esta regra.');
    if (state.coupons.some((c) => c.code === code && c.id !== state.editing.coupon)) return setError(err, 'Já existe um cupom com este código.');

    if (state.editing.coupon) {
      Object.assign(state.coupons.find((c) => c.id === state.editing.coupon), { code, percent, scope, categoryIds });
      toast('Cupom atualizado.');
    } else {
      state.coupons.push({ id: uid('cup'), code, percent, scope, categoryIds });
      toast('Cupom criado.');
    }
    store.set(KEYS.coupons, state.coupons);
    resetCouponForm();
    renderCouponList();
    renderCart();
  }

  function renderCouponList() {
    $('#coupon-list').innerHTML = state.coupons.length ? state.coupons.map((c) => `
      <div class="row row--text">
        <div>
          <p class="row__title">${esc(c.code)} <span class="row__meta" style="display:inline">${c.percent}%</span></p>
          <p class="row__meta">${c.scope === 'cart' ? 'Aplica ao carrinho inteiro' : 'Categorias: ' + esc(c.categoryIds.map(catName).join(', '))}</p>
        </div>
        <div class="row__actions">
          <button type="button" class="icon-btn icon-btn--edit" data-edit-coupon="${esc(c.id)}" aria-label="Editar cupom ${esc(c.code)}">${icon('edit')}</button>
          <button type="button" class="icon-btn" data-delete-coupon="${esc(c.id)}" aria-label="Excluir cupom ${esc(c.code)}">${icon('trash')}</button>
        </div>
      </div>`).join('') : '<div class="list-empty">Nenhum cupom cadastrado.</div>';
  }

  /* ---------- Categorias ---------- */
  function resetCategoryForm() {
    state.editing.category = null;
    $('#category-form').reset();
    $('#category-form-title').textContent = 'Nova categoria';
    $('#category-cancel').hidden = true;
    setError($('#ct-error'), '');
  }

  function submitCategory(e) {
    e.preventDefault();
    const err = $('#ct-error');
    const name = $('#ct-name').value.trim();
    const image = $('#ct-image').value.trim();
    if (name.length < 2) return setError(err, 'Informe o nome da categoria.');
    if (image && !isUrl(image)) return setError(err, 'A URL da imagem precisa começar com http:// ou https://.');
    if (state.categories.some((c) => norm(c.name) === norm(name) && c.id !== state.editing.category)) return setError(err, 'Já existe uma categoria com este nome.');
    if (state.editing.category) {
      Object.assign(state.categories.find((c) => c.id === state.editing.category), { name, image });
      toast('Categoria atualizada.');
    } else {
      state.categories.push({ id: uid('cat'), name, image });
      toast('Categoria criada.');
    }
    store.set(KEYS.categories, state.categories);
    resetCategoryForm();
    refreshStoreAndAdmin();
  }

  function renderCategoryList() {
    $('#category-list').innerHTML = state.categories.length ? state.categories.map((c) => {
      const n = state.products.filter((p) => p.categoryId === c.id).length;
      return `
      <div class="row">
        ${c.image ? img(c.image, '', 'row__thumb') : `<div class="row__thumb row__thumb--empty">${icon('grid')}</div>`}
        <div>
          <p class="row__title">${esc(c.name)}</p>
          <p class="row__meta">${n} ${n === 1 ? 'produto' : 'produtos'}</p>
        </div>
        <div class="row__actions">
          <button type="button" class="icon-btn icon-btn--edit" data-edit-category="${esc(c.id)}" aria-label="Editar ${esc(c.name)}">${icon('edit')}</button>
          <button type="button" class="icon-btn" data-delete-category="${esc(c.id)}" aria-label="Excluir ${esc(c.name)}">${icon('trash')}</button>
        </div>
      </div>`;
    }).join('') : '<div class="list-empty">Nenhuma categoria. Crie a primeira para cadastrar produtos.</div>';
  }

  /* ---------- Pedidos ---------- */
  function renderOrderList() {
    const dt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    $('#order-list').innerHTML = state.orders.length ? state.orders.map((o) => `
      <div class="row row--order">
        <div class="row__head">
          <div>
            <p class="row__title">${esc(o.id)}</p>
            <p class="row__meta">${esc(o.customer.name)} (${esc(o.customer.email)}) / ${dt.format(o.createdAt)}</p>
          </div>
          <div style="text-align:right"><span class="status">${esc(o.status)}</span><p class="row__title" style="margin-top:.3rem">${brl(o.total)}</p></div>
        </div>
        <ul>${o.items.map((i) => `<li>${i.qty}x ${esc(i.name)} (${esc(i.size)}, ${esc(i.color)}) ${brl(i.unit * i.qty)}</li>`).join('')}</ul>
        ${o.coupon ? `<p class="row__meta">Cupom ${esc(o.coupon)}: -${brl(o.discount)}</p>` : ''}
      </div>`).join('') : '<div class="list-empty">Nenhum pedido recebido ainda.</div>';
  }

  function refreshStoreAndAdmin() {
    renderCategoryTiles();
    renderFilterTabs();
    renderGrid();
    updateCartUI();
    if (merchantAuthed()) {
      renderProductFormOptions(); renderCatalog(); renderCouponList(); renderCouponCats(); renderCategoryList(); renderOrderList();
    }
    refreshInks();
  }

  /* ---------- Acesso do lojista (somente login) ----------
     As credenciais não são criadas na interface. Elas vêm de MERCHANT_SEED
     e são gravadas em LocalStorage (KEYS.merchantAuth) a cada carregamento. */
  function ensureMerchantAccess() {
    try { localStorage.removeItem('arena:lojista'); } catch { /* ignora */ }
    const cur = store.get(KEYS.merchantAuth, null);
    if (JSON.stringify(cur) !== JSON.stringify(MERCHANT_SEED)) store.set(KEYS.merchantAuth, MERCHANT_SEED);
  }

  async function pbkdf2Hex(pass, salt, iterations) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations }, key, 256);
    return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function loginMerchant(e) {
    e.preventDefault();
    const err = $('#ml-error');
    const lock = store.get(KEYS.merchantLock, { count: 0, until: 0 });
    if (lock.until > Date.now()) {
      const min = Math.max(1, Math.ceil((lock.until - Date.now()) / 60000));
      return setError(err, `Muitas tentativas incorretas. Tente novamente em ${min} min.`);
    }
    if (!(window.crypto && crypto.subtle)) {
      return setError(err, 'Este navegador não permite validar o acesso neste endereço. Abra o site por HTTPS.');
    }
    const m = store.get(KEYS.merchantAuth, null);
    const user = $('#ml-user').value.trim();
    const pass = $('#ml-pass').value;
    let ok = false;
    if (m) {
      const h = await pbkdf2Hex(pass, m.salt, m.iterations);
      ok = norm(user) === norm(m.user) && h === m.hash;
    }
    if (!ok) {
      const count = (lock.count || 0) + 1;
      store.set(KEYS.merchantLock, count >= 5 ? { count: 0, until: Date.now() + 5 * 60000 } : { count, until: 0 });
      return setError(err, 'Login ou senha incorretos.');
    }
    store.set(KEYS.merchantLock, { count: 0, until: 0 });
    setMerchantAuthed(true);
    $('#form-merchant-login').reset();
    setError(err, '');
    renderAdmin();
  }

  /* ==========================================================
     Rotas: loja (#/), produto (#/produto/ID) e painel (#/adminarena)
     ========================================================== */
  const DEFAULT_TITLE = document.title;
  let currentView = null;

  function parseRoute() {
    const h = location.hash;
    if (h === '#/adminarena') return { name: 'admin' };
    const m = h.match(/^#\/produto\/([\w-]+)$/);
    if (m) return { name: 'product', id: m[1] };
    return { name: 'store' };
  }
  const onStore = () => parseRoute().name === 'store';
  const jump = (y) => window.scrollTo({ top: y, left: 0, behavior: 'instant' });
  function goShowcase() { if (onStore()) scrollToShowcase(); else location.hash = '#vitrine'; }

  function route() {
    const r = parseRoute();
    const prev = currentView;
    if (r.name === 'product' && !findProduct(r.id)) {
      toast('Produto não encontrado.', true);
      location.hash = '#/';
      return;
    }
    currentView = r.name;
    $('#store-view').hidden = r.name !== 'store';
    $('#admin-view').hidden = r.name !== 'admin';
    $('#product-view').hidden = r.name !== 'product';
    document.body.classList.toggle('is-admin', r.name === 'admin');

    if (r.name === 'admin') {
      document.title = 'Acesso restrito | Arena';
      renderAdmin();
      jump(0);
    } else if (r.name === 'product') {
      const p = prepareProduct(r.id);
      document.title = `${p.name} | Arena`;
      jump(0);
    } else {
      document.title = DEFAULT_TITLE;
      const id = location.hash.slice(1);
      if (id && !id.startsWith('/')) {
        const target = document.getElementById(id);
        if (target) requestAnimationFrame(() => target.scrollIntoView());
      } else if (prev === 'product') jump(state.scrollY || 0);
      else if (prev === 'admin') jump(0);
      observeReveal();
    }
    requestAnimationFrame(refreshInks);
  }

  /* ==========================================================
     Eventos
     ========================================================== */
  function bindEvents() {
    // Cliques delegados
    document.addEventListener('click', async (e) => {
      const t = e.target.closest('button, a, [data-close]');
      if (!t) {
        const ov = e.target.classList && e.target.classList.contains('overlay') ? e.target : null;
        if (ov) closeModal(ov.id);
        return;
      }
      const d = t.dataset;

      if (d.home !== undefined) {
        // Na loja o logo apenas rola ao topo. Em outras telas, volta para a loja no topo.
        if (onStore()) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else state.scrollY = 0;
        return;
      }
      if (d.details) {
        if (onStore()) state.scrollY = window.scrollY;
        location.hash = '#/produto/' + d.details;
        return;
      }
      if (d.crumbCat) {
        state.filters = { query: '', category: d.crumbCat, gender: 'all', onlyPromo: false };
        applyFilters();
        location.hash = '#vitrine';
        return;
      }
      if (d.cat !== undefined && t.closest('#category-tabs')) { state.filters.category = d.cat; applyFilters(); return; }
      if (d.gender !== undefined) { state.filters.gender = d.gender; applyFilters(); return; }
      if (d.catTile) { state.filters.category = d.catTile; applyFilters(); scrollToShowcase(); return; }
      if (d.promoFilter !== undefined) { state.filters.onlyPromo = true; applyFilters(); scrollToShowcase(); return; }
      if (t.id === 'btn-promo-toggle') { state.filters.onlyPromo = !state.filters.onlyPromo; applyFilters(); return; }
      if (d.clearFilters !== undefined) { clearFilters(); return; }
      if (d.openCart !== undefined) { renderCart(); openModal('drawer-cart'); return; }
      if (d.explore !== undefined) { closeModal('drawer-cart'); setTimeout(goShowcase, 250); return; }
      if (d.open) { openModal(d.open); return; }
      if (d.close !== undefined) { const ov = t.closest('.overlay'); if (ov) closeModal(ov.id); return; }

      // Página do produto
      if (d.photo !== undefined) {
        const p = findProduct(state.sel.id);
        const main = $('#pd-main');
        main.classList.add('is-fading');
        setTimeout(() => { main.dataset.failed = ''; main.src = hiRes(p.photos[Number(d.photo)]); main.classList.remove('is-fading'); }, 180);
        $$('.pv__thumb').forEach((b) => b.classList.toggle('is-active', b === t));
        return;
      }
      if (d.color !== undefined) { state.sel.color = d.color; updateSelectors(); return; }
      if (d.size !== undefined) { state.sel.size = state.sel.size === d.size ? null : d.size; updateSelectors(); return; }
      if (d.pdTab) {
        $$('[data-pd-tab]').forEach((b) => { b.classList.toggle('is-active', b === t); b.setAttribute('aria-selected', b === t); });
        $$('.pv__panel').forEach((pn) => { pn.hidden = pn.id !== `pv-panel-${d.pdTab}`; });
        moveInk($('#pv-tabs'));
        return;
      }
      if (t.id === 'pd-add') { addFromPage(); return; }

      // Carrinho
      if (d.qty) { changeQty(d.key, Number(d.qty)); return; }
      if (d.remove) { changeQty(d.remove, -9999); return; }
      if (d.couponRemove !== undefined) { state.cart.coupon = ''; saveCart(); renderCart(); return; }
      if (d.checkout !== undefined) { startCheckout(); return; }

      // Conta
      if (t.id === 'btn-account') { openAuth('login'); return; }
      if (d.authTab) { setAuthTab(d.authTab); return; }
      if (t.id === 'btn-user-logout') {
        state.session = null; store.set(KEYS.session, null); updateAccountUI(); closeModal('modal-auth'); renderCart(); toast('Você saiu da conta.');
        return;
      }

      // Confirmação
      if (t.id === 'confirm-ok') { if (confirmResolver) { const r = confirmResolver; confirmResolver = null; r(true); } closeModal('modal-confirm'); return; }

      // Painel
      if (d.adminTab) { switchAdminTab(d.adminTab); return; }
      if (t.id === 'merchant-logout') { setMerchantAuthed(false); renderAdmin(); toast('Você saiu do painel.'); return; }
      if (t.id === 'var-add') { $('#var-rows').insertAdjacentHTML('beforeend', varRowHTML()); return; }
      if (d.varRemove !== undefined) {
        const rows = $('#var-rows');
        if (rows.children.length > 1) t.closest('.var-row').remove(); else rows.innerHTML = varRowHTML();
        return;
      }
      if (t.id === 'product-cancel') { resetProductForm(); return; }
      if (t.id === 'coupon-cancel') { resetCouponForm(); return; }
      if (t.id === 'category-cancel') { resetCategoryForm(); return; }
      if (d.editProduct) { loadProductIntoForm(d.editProduct); return; }

      if (d.deleteProduct) {
        const p = findProduct(d.deleteProduct);
        if (p && await confirmDialog({ title: 'Excluir produto', text: `Excluir "${p.name}"? Esta ação não pode ser desfeita.` })) {
          state.products = state.products.filter((x) => x.id !== p.id);
          store.set(KEYS.products, state.products);
          if (state.editing.product === p.id) resetProductForm();
          refreshStoreAndAdmin();
          toast('Produto excluído.');
        }
        return;
      }
      if (d.editCoupon) {
        const c = state.coupons.find((x) => x.id === d.editCoupon);
        if (!c) return;
        state.editing.coupon = c.id;
        $('#cp-code').value = c.code;
        $('#cp-percent').value = c.percent;
        $$('input[name="cp-scope"]').forEach((r) => { r.checked = r.value === c.scope; });
        $('#cp-cats-wrap').hidden = c.scope !== 'categories';
        renderCouponCats(c.categoryIds);
        $('#coupon-form-title').textContent = 'Editando cupom';
        $('#coupon-cancel').hidden = false;
        $('#coupon-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (d.deleteCoupon) {
        const c = state.coupons.find((x) => x.id === d.deleteCoupon);
        if (c && await confirmDialog({ title: 'Excluir cupom', text: `Excluir o cupom ${c.code}?` })) {
          state.coupons = state.coupons.filter((x) => x.id !== c.id);
          store.set(KEYS.coupons, state.coupons);
          if (state.editing.coupon === c.id) resetCouponForm();
          renderCouponList(); renderCart();
          toast('Cupom excluído.');
        }
        return;
      }
      if (d.editCategory) {
        const c = state.categories.find((x) => x.id === d.editCategory);
        if (!c) return;
        state.editing.category = c.id;
        $('#ct-name').value = c.name;
        $('#ct-image').value = c.image || '';
        $('#category-form-title').textContent = 'Editando categoria';
        $('#category-cancel').hidden = false;
        $('#category-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (d.deleteCategory) {
        const c = state.categories.find((x) => x.id === d.deleteCategory);
        if (!c) return;
        const used = state.products.filter((p) => p.categoryId === c.id).length;
        const inCoupons = state.coupons.filter((cp) => cp.categoryIds.includes(c.id)).length;
        if (used || inCoupons) {
          toast(`Não é possível excluir "${c.name}": ${used ? used + ' produto(s)' : ''}${used && inCoupons ? ' e ' : ''}${inCoupons ? inCoupons + ' cupom(ns)' : ''} usam esta categoria.`, true);
          return;
        }
        if (await confirmDialog({ title: 'Excluir categoria', text: `Excluir a categoria "${c.name}"?` })) {
          state.categories = state.categories.filter((x) => x.id !== c.id);
          store.set(KEYS.categories, state.categories);
          if (state.editing.category === c.id) resetCategoryForm();
          refreshStoreAndAdmin();
          toast('Categoria excluída.');
        }
      }
    });

    // Formulários
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'cart-coupon-form') { e.preventDefault(); applyCoupon($('#cart-coupon-input').value); }
    });
    $('#search-form').addEventListener('submit', (e) => { e.preventDefault(); goShowcase(); });
    $('#search-input').addEventListener('input', debounce((e) => {
      state.filters.query = e.target.value;
      applyFilters();
      if (!onStore() && e.target.value.trim()) location.hash = '#vitrine';
    }, 120));
    $('#search-input').addEventListener('input', (e) => { $('#search-clear').hidden = !e.target.value; });
    $('#search-clear').addEventListener('click', () => { state.filters.query = ''; $('#search-input').value = ''; applyFilters(); $('#search-input').focus(); });

    $('#form-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#log-error');
      const email = $('#log-email').value.trim().toLowerCase();
      const pass = $('#log-pass').value;
      const u = state.users.find((x) => x.email === email);
      if (!u || (await sha(u.salt + pass)) !== u.hash) return setError(err, 'E-mail ou senha incorretos.');
      setError(err, '');
      loginUser(u);
    });

    $('#form-register').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#reg-error');
      const name = $('#reg-name').value.trim().replace(/\s+/g, ' ');
      const email = $('#reg-email').value.trim().toLowerCase();
      const pass = $('#reg-pass').value;
      if (name.length < 2) return setError(err, 'Informe seu nome.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(err, 'Informe um e-mail válido.');
      if (pass.length < 6) return setError(err, 'A senha precisa ter pelo menos 6 caracteres.');
      if (state.users.some((u) => u.email === email)) return setError(err, 'Já existe uma conta com este e-mail. Use a aba Entrar.');
      const salt = uid('s');
      const user = { id: uid('usr'), name, email, salt, hash: await sha(salt + pass), createdAt: Date.now() };
      state.users.push(user);
      store.set(KEYS.users, state.users);
      setError(err, '');
      loginUser(user);
    });

    $('#form-merchant-login').addEventListener('submit', loginMerchant);
    $('#product-form').addEventListener('submit', submitProduct);
    $('#coupon-form').addEventListener('submit', submitCoupon);
    $('#category-form').addEventListener('submit', submitCategory);

    // Tamanhos e códigos sempre em CAIXA ALTA
    document.addEventListener('input', (e) => {
      const el = e.target;
      if (el.classList && el.classList.contains('var-size')) el.value = el.value.toUpperCase();
      if (el.id === 'cp-code') el.value = el.value.toUpperCase();
    });

    $$('input[name="cp-scope"]').forEach((r) => r.addEventListener('change', () => { $('#cp-cats-wrap').hidden = couponScope() !== 'categories'; }));

    window.addEventListener('hashchange', route);
    window.addEventListener('resize', debounce(refreshInks, 100));
    window.addEventListener('storage', (e) => {
      if (Object.values(KEYS).includes(e.key)) { loadState(); refreshStoreAndAdmin(); updateAccountUI(); }
    });
  }

  /* ----------------------------------------------------------
     Informações do site (domínio, e-mail, ano)
     ---------------------------------------------------------- */
  function applySiteConfig() {
    const url = `https://${SITE.dominio}/`;
    $('#link-canonical').setAttribute('href', url);
    $('#meta-og-url').setAttribute('content', url);
    $$('[data-domain]').forEach((el) => { el.textContent = SITE.dominio; });
    $$('[data-email]').forEach((el) => { el.textContent = SITE.email; });
    $$('[data-email-link]').forEach((el) => { el.textContent = SITE.email; el.setAttribute('href', `mailto:${SITE.email}`); });
    $('#year').textContent = new Date().getFullYear();
  }

  /* ----------------------------------------------------------
     Início
     ---------------------------------------------------------- */
  function init() {
    try { history.scrollRestoration = 'manual'; } catch { /* ignora */ }
    loadState();
    applySiteConfig();
    renderCategoryTiles();
    renderFilterTabs();
    renderGrid();
    updateAccountUI();
    updateCartUI();
    bindEvents();
    route();
    observeReveal();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshInks);
  }

  init();
})();