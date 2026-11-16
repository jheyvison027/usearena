/* ARENA | Loja virtual (SPA, Vanilla JS + Firebase compat 10.12.2) */
(function () {
  'use strict';

  /* =====================================================================
     1. CONFIGURAÇÃO
     ===================================================================== */
  const FIREBASE_CONFIG = {
    apiKey: 'SUA_API_KEY',
    authDomain: 'SEU_PROJETO.firebaseapp.com',
    projectId: 'SEU_PROJETO',
    storageBucket: 'SEU_PROJETO.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000'
  };

  const HERO_IMAGE = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&q=80';
  const GENDERS = ['MASCULINO', 'FEMININO', 'UNISSEX'];
  const STATUSES = ['Aguardando Pagamento', 'Pago / Em Separação', 'Enviado', 'Concluído'];
  const TERMS_VERSION = '2026-11';
  const LS_TERMS = 'arena_terms';
  const LS_CART = 'arena_cart';

  if (typeof firebase === 'undefined') {
    document.body.insertAdjacentHTML('afterbegin', '<div style="padding:24px;background:#1E1E1E;color:#fff;font-family:sans-serif;border-bottom:3px solid #B4FF39">Não foi possível carregar o Firebase. Verifique a conexão com a internet e recarregue a página.</div>');
    return;
  }
  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const FV = firebase.firestore.FieldValue;

  /* =====================================================================
     2. UTILITÁRIOS
     ===================================================================== */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '');
  const brl = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const parseBRL = (v) => {
    let s = String(v == null ? '' : v).trim();
    if (!s) return 0;
    s = s.indexOf(',') >= 0 ? s.replace(/\./g, '').replace(',', '.') : s;
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  };
  const fmtInput = (n) => (n ? Number(n).toFixed(2).replace('.', ',') : '');

  const ICONS = {
    cart: '<path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20 8H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    close: '<path d="M5 5l14 14M19 5 5 19"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    truck: '<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>'
  };
  const icon = (n, s) => `<svg class="icon" width="${s || 20}" height="${s || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true">${ICONS[n]}</svg>`;

  let toastTimer;
  function toast(msg, type) {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show ' + (type || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 3400);
  }

  function setMsg(sel, text, type) {
    const el = $(sel);
    if (el) { el.textContent = text || ''; el.className = 'msg ' + (type || ''); }
  }

  /* =====================================================================
     3. ESTADO
     ===================================================================== */
  const state = {
    products: [], categories: [], coupons: [], orders: [],
    productsLoaded: false,
    settings: { freeShippingThreshold: 0, shippingTiers: [], sizePresets: [] },
    user: null, userDoc: null, isAdmin: false, authReady: false,
    cart: loadCart(),
    coupon: null, couponMsg: null, couponInput: '',
    buyNow: null, pending: null,
    filters: { q: '', cat: 'TODOS', gender: 'TODOS' },
    authTab: 'login', authNote: '',
    adminTab: 'produtos', pform: null
  };
  const pdp = { pid: null, img: 0, color: null, size: null };
  const view = () => $('#view');

  function loadCart() {
    try {
      const c = JSON.parse(localStorage.getItem(LS_CART));
      if (c && Array.isArray(c.items)) return { items: c.items.filter((i) => i && i.pid && i.qty > 0), shipIdx: Number.isInteger(c.shipIdx) ? c.shipIdx : -1 };
    } catch (e) { /* storage indisponível */ }
    return { items: [], shipIdx: -1 };
  }
  function saveCart() {
    try { localStorage.setItem(LS_CART, JSON.stringify(state.cart)); } catch (e) { /* ignora */ }
  }

  /* ===== Regras de produto ===== */
  const isPromo = (p) => Number(p.promoPrice) > 0 && Number(p.promoPrice) < Number(p.price);
  const effPrice = (p) => (isPromo(p) ? Number(p.promoPrice) : Number(p.price));
  const discountPct = (p) => Math.round((1 - Number(p.promoPrice) / Number(p.price)) * 100);
  const skey = (c, s) => c + '|' + s;
  const getStock = (p, c, s) => Number((p.stock || {})[skey(c, s)] || 0);
  const totalStock = (p) => Object.values(p.stock || {}).reduce((a, b) => a + Number(b || 0), 0);
  const colorsOf = (p) => (p.colors && p.colors.length ? p.colors : ['ÚNICA']);
  const catName = (id) => { const c = state.categories.find((x) => x.id === id); return c ? c.name : ''; };
  const imagesOf = (p) => (p.images || []).map(safeUrl).filter(Boolean);

  function sortedProducts(list) {
    return list.slice().sort((a, b) => {
      const pa = isPromo(a) ? 1 : 0, pb = isPromo(b) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  /* ===== Carrinho: linhas e totais ===== */
  function normalizeCart() {
    let changed = false;
    state.cart.items = state.cart.items.filter((it) => {
      const p = state.products.find((x) => x.id === it.pid);
      if (!p) { changed = true; return false; }
      const avail = getStock(p, it.color, it.size);
      if (avail <= 0) { changed = true; return false; }
      if (it.qty > avail) { it.qty = avail; changed = true; }
      return true;
    });
    if (changed) saveCart();
  }

  function linesOf(items) {
    return items.map((item) => {
      const product = state.products.find((x) => x.id === item.pid);
      return product ? { item, product, unit: effPrice(product), avail: getStock(product, item.color, item.size) } : null;
    }).filter(Boolean);
  }

  function eligibleBase(lines, coupon) {
    if (!coupon) return 0;
    const list = coupon.scope === 'categoria' ? lines.filter((l) => l.product.categoryId === coupon.categoryId) : lines;
    return list.reduce((a, l) => a + l.unit * l.item.qty, 0);
  }

  function computeTotals(lines, coupon, tier) {
    const subtotal = round2(lines.reduce((a, l) => a + l.unit * l.item.qty, 0));
    const discount = coupon ? round2(eligibleBase(lines, coupon) * Number(coupon.percent) / 100) : 0;
    const threshold = Number(state.settings.freeShippingThreshold) || 0;
    const base = subtotal - discount;
    const free = threshold > 0 && base >= threshold;
    const shipping = free || !tier ? 0 : Number(tier.price) || 0;
    return { subtotal, discount, shipping, free, threshold, base, total: round2(subtotal - discount + shipping) };
  }

  const currentTier = () => state.settings.shippingTiers[state.cart.shipIdx] || null;

  /* =====================================================================
     4. MODAL, DRAWER E EVENTOS GLOBAIS
     ===================================================================== */
  const actions = {};
  const forms = {};
  const inputs = {};

  function syncScrollLock() {
    const open = !$('#modal-root').hidden || $('#cart').classList.contains('open');
    document.body.classList.toggle('no-scroll', open);
  }
  function openModal(html, opts) {
    opts = opts || {};
    const root = $('#modal-root');
    root.innerHTML = `<div class="backdrop" data-act="close-modal"></div><div class="modal ${opts.wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.label || 'Janela')}"><button type="button" class="icon-btn modal-x" data-act="close-modal" aria-label="Fechar">${icon('close')}</button>${html}</div>`;
    root.hidden = false;
    syncScrollLock();
    const f = $('input:not([type=hidden]), select, .btn', root.querySelector('.modal'));
    if (f) f.focus();
    return root.querySelector('.modal');
  }
  function closeModal() {
    const root = $('#modal-root');
    root.hidden = true;
    root.innerHTML = '';
    syncScrollLock();
  }
  actions['close-modal'] = closeModal;

  function openCart() {
    renderCart();
    $('#cart').removeAttribute('inert');
    $('#cart').classList.add('open');
    $('#cart-backdrop').hidden = false;
    syncScrollLock();
  }
  function closeCart() {
    $('#cart').classList.remove('open');
    $('#cart').setAttribute('inert', '');
    $('#cart-backdrop').hidden = true;
    syncScrollLock();
  }
  actions['open-cart'] = openCart;
  actions['close-cart'] = closeCart;

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el, e);
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const fn = forms[f.dataset.form];
    if (fn) fn(f);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-in]');
    if (!el) return;
    const fn = inputs[el.dataset.in];
    if (fn) fn(el, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#gate').hidden) { e.preventDefault(); return; }
    if (!$('#modal-root').hidden) closeModal();
    else if ($('#cart').classList.contains('open')) closeCart();
  });

  /* =====================================================================
     5. BLOQUEIO OBRIGATÓRIO (TERMOS E PRIVACIDADE)
     ===================================================================== */
  let memoryAcceptance = null;
  function getAcceptance() {
    try {
      const v = JSON.parse(localStorage.getItem(LS_TERMS));
      if (v && v.accepted) return v;
    } catch (e) { /* ignora */ }
    return memoryAcceptance;
  }

  let appStarted = false;
  function unlockApp() {
    $('#app').removeAttribute('inert');
    document.body.classList.remove('gated');
    if (!appStarted) { appStarted = true; startApp(); }
  }

  function initGate() {
    if (getAcceptance()) { unlockApp(); return; }
    const gate = $('#gate');
    const box = $('#gate-legal');
    const cb = $('#gate-check');
    const btn = $('#gate-enter');
    box.appendChild($('#tpl-legal').content.cloneNode(true));
    gate.hidden = false;

    const checkEnd = () => {
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 8 && cb.disabled) {
        cb.disabled = false;
        $('#gate-hint').textContent = 'Marque a caixa abaixo para confirmar o aceite.';
      }
    };
    box.addEventListener('scroll', checkEnd);
    checkEnd();
    cb.addEventListener('change', () => { btn.disabled = !cb.checked; });
    btn.addEventListener('click', () => {
      if (!cb.checked) return;
      const acc = { accepted: true, at: new Date().toISOString(), version: TERMS_VERSION };
      memoryAcceptance = acc;
      try { localStorage.setItem(LS_TERMS, JSON.stringify(acc)); } catch (e) { /* ignora */ }
      gate.hidden = true;
      unlockApp();
      syncTermsToUser();
    });
    box.focus();
  }

  async function syncTermsToUser() {
    const u = auth.currentUser;
    const acc = getAcceptance();
    if (!u || !acc) return;
    try {
      const ref = db.collection('users').doc(u.uid);
      const snap = await ref.get();
      if (!snap.exists || !snap.data().acceptedTermsAt) {
        await ref.set({ name: u.displayName || '', email: u.email || '', acceptedTermsAt: acc.at, termsVersion: acc.version }, { merge: true });
      }
    } catch (e) { console.warn('Sincronização dos termos falhou', e); }
  }

  actions.legal = () => {
    const modal = openModal('<div class="legal-box" id="legal-modal-box"></div>', { wide: true, label: 'Termos de Uso e Política de Privacidade' });
    $('#legal-modal-box', modal).appendChild($('#tpl-legal').content.cloneNode(true));
  };

  /* =====================================================================
     6. AUTENTICAÇÃO
     ===================================================================== */
  const AUTH_ERRORS = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/network-request-failed': 'Sem conexão. Verifique sua internet.'
  };
  const authError = (e) => AUTH_ERRORS[e && e.code] || 'Não foi possível concluir. Tente novamente.';

  function openAuth(tab, note) {
    state.authTab = tab || 'login';
    if (note !== undefined) state.authNote = note;
    const login = state.authTab === 'login';
    openModal(`
      <h2 class="modal-title">Minha conta</h2>
      ${state.authNote ? `<p class="note">${esc(state.authNote)}</p>` : ''}
      <div class="tabs">
        <button type="button" class="tab ${login ? 'is-active' : ''}" data-act="auth-tab" data-tab="login">Entrar</button>
        <button type="button" class="tab ${login ? '' : 'is-active'}" data-act="auth-tab" data-tab="cadastro">Cadastrar</button>
      </div>
      <div id="auth-msg" class="msg" role="alert"></div>
      ${login ? `
      <form data-form="login" novalidate>
        <div class="field"><label for="a-email">E-mail</label><input id="a-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="a-pass">Senha</label><input id="a-pass" name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-block" type="submit">Entrar</button>
        <p class="small" style="margin-top:12px"><button type="button" class="link" data-act="reset-pass">Esqueci minha senha</button></p>
      </form>` : `
      <form data-form="register" novalidate>
        <div class="field"><label for="r-name">Nome completo</label><input id="r-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="r-email">E-mail</label><input id="r-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="r-pass">Senha (mínimo 6 caracteres)</label><input id="r-pass" name="password" type="password" autocomplete="new-password" minlength="6" required></div>
        <label class="check"><input type="checkbox" name="terms"><span>Li e aceito os <button type="button" class="link" data-act="legal">Termos de Uso</button> e a <button type="button" class="link" data-act="legal">Política de Privacidade</button>.</span></label>
        <button class="btn btn-block" type="submit">Criar conta</button>
      </form>`}`, { label: 'Login e cadastro' });
  }
  actions['auth-tab'] = (el) => openAuth(el.dataset.tab);

  forms.login = async (f) => {
    const d = new FormData(f);
    const email = String(d.get('email')).trim(), pass = String(d.get('password'));
    if (!email || !pass) return setMsg('#auth-msg', 'Preencha e-mail e senha.', 'error');
    try {
      await auth.signInWithEmailAndPassword(email, pass);
      closeModal();
      toast('Login realizado.');
      runPending();
    } catch (e) { setMsg('#auth-msg', authError(e), 'error'); }
  };

  forms.register = async (f) => {
    const d = new FormData(f);
    const name = String(d.get('name')).trim(), email = String(d.get('email')).trim(), pass = String(d.get('password'));
    if (name.length < 3) return setMsg('#auth-msg', 'Informe o nome completo.', 'error');
    if (!email) return setMsg('#auth-msg', 'Informe o e-mail.', 'error');
    if (pass.length < 6) return setMsg('#auth-msg', AUTH_ERRORS['auth/weak-password'], 'error');
    if (!d.get('terms')) return setMsg('#auth-msg', 'É obrigatório aceitar os Termos de Uso e a Política de Privacidade.', 'error');
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      await cred.user.updateProfile({ displayName: name });
      await db.collection('users').doc(cred.user.uid).set({
        name, email, acceptedTermsAt: new Date().toISOString(), termsVersion: TERMS_VERSION, createdAt: FV.serverTimestamp()
      }, { merge: true });
      closeModal();
      updateHeader();
      toast('Conta criada com sucesso.');
      runPending();
    } catch (e) { setMsg('#auth-msg', authError(e), 'error'); }
  };

  actions['reset-pass'] = async () => {
    const email = String(($('#a-email') || {}).value || '').trim();
    if (!email) return setMsg('#auth-msg', 'Digite seu e-mail e clique novamente.', 'error');
    try {
      await auth.sendPasswordResetEmail(email);
      setMsg('#auth-msg', 'Enviamos um link de redefinição para o seu e-mail.', 'ok');
    } catch (e) { setMsg('#auth-msg', authError(e), 'error'); }
  };

  actions.account = () => {
    if (!state.user) return openAuth('login', '');
    openModal(`
      <h2 class="modal-title">Minha conta</h2>
      <p><strong>${esc(state.user.displayName || 'Cliente')}</strong><br><span class="muted">${esc(state.user.email)}</span></p>
      ${state.isAdmin ? '<a class="btn btn-ghost btn-block" href="#admin" data-act="close-modal" style="margin-bottom:8px">Abrir painel do lojista</a>' : ''}
      <button type="button" class="btn btn-ghost btn-block" data-act="logout">Sair</button>`, { label: 'Minha conta' });
  };
  actions.logout = async () => { await auth.signOut(); closeModal(); toast('Você saiu da conta.'); };

  let unsubUserDoc = null;
  auth.onAuthStateChanged(async (u) => {
    state.user = u;
    state.authReady = true;
    state.isAdmin = false;
    state.userDoc = null;
    if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }
    if (u) {
      unsubUserDoc = db.collection('users').doc(u.uid).onSnapshot((s) => { state.userDoc = s.exists ? s.data() : null; }, () => {});
      try { state.isAdmin = (await db.collection('admins').doc(u.uid).get()).exists; } catch (e) { state.isAdmin = false; }
      syncTermsToUser();
    }
    if (state.isAdmin) startAdminListeners(); else stopAdminListeners();
    updateHeader();
    if (currentRoute() === 'admin') renderAdmin();
    if ($('#cart').classList.contains('open')) renderCart();
  });

  function runPending() {
    const p = state.pending;
    state.pending = null;
    if (p && state.user) openCheckout(p.source);
  }

  /* =====================================================================
     7. FIRESTORE (TEMPO REAL)
     ===================================================================== */
  function listen() {
    const fail = (e) => { console.error(e); toast('Não foi possível carregar os dados da loja.', 'error'); };
    db.collection('products').onSnapshot((snap) => {
      state.products = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      state.productsLoaded = true;
      normalizeCart();
      onDataChange('products');
    }, fail);
    db.collection('categories').onSnapshot((snap) => {
      state.categories = snap.docs.map((d) => Object.assign({ id: d.id }, d.data())).sort((a, b) => (a.order || 0) - (b.order || 0));
      if (state.filters.cat !== 'TODOS' && !state.categories.some((c) => c.id === state.filters.cat)) state.filters.cat = 'TODOS';
      onDataChange('categories');
    }, fail);
    db.collection('settings').doc('store').onSnapshot((s) => {
      const d = s.exists ? s.data() : {};
      state.settings = {
        freeShippingThreshold: Number(d.freeShippingThreshold) || 0,
        shippingTiers: Array.isArray(d.shippingTiers) ? d.shippingTiers : [],
        sizePresets: Array.isArray(d.sizePresets) ? d.sizePresets : []
      };
      if (state.cart.shipIdx >= state.settings.shippingTiers.length) state.cart.shipIdx = -1;
      onDataChange('settings');
    }, fail);
  }

  let adminUnsubs = [];
  function startAdminListeners() {
    if (adminUnsubs.length) return;
    adminUnsubs.push(db.collection('coupons').onSnapshot((snap) => {
      state.coupons = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      onDataChange('coupons');
    }, console.error));
    adminUnsubs.push(db.collection('orders').orderBy('createdAt', 'desc').limit(150).onSnapshot((snap) => {
      state.orders = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      onDataChange('orders');
    }, console.error));
  }
  function stopAdminListeners() {
    adminUnsubs.forEach((u) => u());
    adminUnsubs = [];
  }

  function onDataChange(kind) {
    const r = currentRoute();
    if (r === 'home') {
      if (kind === 'products' || kind === 'categories' || kind === 'settings') renderCatalog();
    } else if (r === 'pdp') {
      if (kind === 'products' || kind === 'settings' || kind === 'categories') renderPDP(routeArg());
    } else if (r === 'admin' && state.isAdmin) {
      refreshAdmin(kind);
    }
    if ($('#cart').classList.contains('open')) renderCart();
    updateHeader();
  }

  /* =====================================================================
     8. ROTEAMENTO E CABEÇALHO
     ===================================================================== */
  function currentRoute() {
    const h = location.hash.replace(/^#/, '');
    if (h.startsWith('produto/')) return 'pdp';
    if (h === 'admin') return 'admin';
    return 'home';
  }
  const routeArg = () => decodeURIComponent(location.hash.replace(/^#produto\//, ''));

  function route() {
    window.scrollTo(0, 0);
    const r = currentRoute();
    if (r === 'pdp') renderPDP(routeArg());
    else if (r === 'admin') renderAdmin();
    else renderHome();
  }
  window.addEventListener('hashchange', () => { if (appStarted) route(); });

  function updateHeader() {
    const count = state.cart.items.reduce((a, i) => a + i.qty, 0);
    const badge = $('#cart-badge');
    badge.textContent = count;
    badge.hidden = count === 0;
    $('#account-label').textContent = state.user ? (state.user.displayName || 'Minha conta').split(' ')[0] : 'Entrar';
    $('#admin-link').hidden = !state.isAdmin;
  }

  /* =====================================================================
     9. VITRINE
     ===================================================================== */
  function cardHtml(p, quick) {
    const img = imagesOf(p)[0];
    const sold = totalStock(p) <= 0;
    return `
    <article class="card">
      <a class="card-media" href="#produto/${esc(p.id)}" aria-label="${esc(p.name)}">
        ${img ? `<img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">` : '<div class="img-empty"></div>'}
        ${isPromo(p) ? `<span class="badge">-${discountPct(p)}%</span>` : ''}
        ${sold ? '<span class="badge badge-muted">Esgotado</span>' : ''}
      </a>
      <div class="card-body">
        <h3>${esc(p.name)}</h3>
        <div class="price">${isPromo(p) ? `<strong>${brl(p.promoPrice)}</strong><s>${brl(p.price)}</s>` : `<strong>${brl(p.price)}</strong>`}</div>
        ${quick
          ? `<button type="button" class="btn btn-sm" data-act="quick" data-id="${esc(p.id)}" ${sold ? 'disabled' : ''}>Adicionar</button>`
          : `<a class="btn btn-sm" href="#produto/${esc(p.id)}">Ver Detalhes</a>`}
      </div>
    </article>`;
  }

  function renderHome() {
    view().innerHTML = `
    <section class="hero">
      <img class="hero-img" src="${esc(HERO_IMAGE)}" alt="" fetchpriority="high">
      <div class="hero-inner">
        <span class="eyebrow">ARENA MODA FITNESS</span>
        <h1>Roupas e calçados de treino para quem leva o resultado a sério</h1>
        <p>Camisas, shorts, calças, tênis e acessórios para treinar com conforto. Escolha o tamanho, monte o carrinho e feche o pedido.</p>
        <p id="hero-ship" class="hero-ship" hidden></p>
        <button type="button" class="btn" data-act="scroll-shop">Ver produtos</button>
      </div>
    </section>
    <section id="shop" class="shop container">
      <div class="search">${icon('search')}<input type="search" id="search" data-in="search" placeholder="Buscar por nome ou descrição" value="${esc(state.filters.q)}" aria-label="Buscar produtos" autocomplete="off"></div>
      <div class="filter-title">Categorias</div>
      <div class="tiles" id="cat-tiles"></div>
      <div class="filter-title">Sexo</div>
      <div class="tiles" id="gender-tiles"></div>
      <div class="result-bar"><h2 style="margin:0">Produtos</h2><span id="result-count" class="muted small"></span></div>
      <div class="grid" id="grid"></div>
    </section>`;
    renderCatalog(true);
  }

  actions['scroll-shop'] = () => { const s = $('#shop'); if (s) s.scrollIntoView(); };
  inputs.search = (el) => { state.filters.q = el.value; renderGrid(false); };
  actions.cat = (el) => { state.filters.cat = el.dataset.id; renderCatalog(true); };
  actions.gender = (el) => { state.filters.gender = el.dataset.id; renderCatalog(true); };
  actions['clear-filters'] = () => { state.filters = { q: '', cat: 'TODOS', gender: 'TODOS' }; const s = $('#search'); if (s) s.value = ''; renderCatalog(true); };

  function renderCatalog(animate) {
    if (!$('#grid')) return;
    const th = state.settings.freeShippingThreshold;
    const hs = $('#hero-ship');
    if (hs) { hs.hidden = !(th > 0); hs.textContent = th > 0 ? `Frete grátis em compras acima de ${brl(th)}` : ''; }
    const tile = (id, label, on, act) => `<button type="button" class="tile ${on ? 'is-active' : ''}" data-act="${act}" data-id="${esc(id)}" aria-pressed="${on}">${esc(label)}</button>`;
    $('#cat-tiles').innerHTML = tile('TODOS', 'TODOS', state.filters.cat === 'TODOS', 'cat') +
      state.categories.map((c) => tile(c.id, c.name, state.filters.cat === c.id, 'cat')).join('');
    $('#gender-tiles').innerHTML = ['TODOS'].concat(GENDERS).map((g) => tile(g, g, state.filters.gender === g, 'gender')).join('');
    renderGrid(animate);
  }

  function renderGrid(animate) {
    const grid = $('#grid');
    if (!grid) return;
    grid.classList.toggle('animate', !!animate);
    if (!state.productsLoaded) { grid.innerHTML = '<div class="state-box" style="grid-column:1/-1">Carregando produtos...</div>'; return; }
    const q = norm(state.filters.q);
    const list = sortedProducts(state.products.filter((p) => {
      if (state.filters.cat !== 'TODOS' && p.categoryId !== state.filters.cat) return false;
      if (state.filters.gender !== 'TODOS' && p.gender !== state.filters.gender) return false;
      if (q && !(norm(p.name).includes(q) || norm(p.description).includes(q))) return false;
      return true;
    }));
    $('#result-count').textContent = list.length + (list.length === 1 ? ' item' : ' itens');
    if (!list.length) {
      const filtered = state.filters.q || state.filters.cat !== 'TODOS' || state.filters.gender !== 'TODOS';
      grid.innerHTML = `<div class="state-box" style="grid-column:1/-1">${filtered
        ? '<p>Nenhum produto encontrado para os filtros selecionados.</p><button type="button" class="btn btn-ghost" data-act="clear-filters">Limpar filtros</button>'
        : '<p>Nenhum produto disponível no momento.</p>'}</div>`;
      return;
    }
    grid.innerHTML = list.map((p) => cardHtml(p, false)).join('');
  }

  /* =====================================================================
     10. PÁGINA DE PRODUTO (PDP)
     ===================================================================== */
  function renderPDP(id) {
    const v = view();
    if (!state.productsLoaded) { v.innerHTML = '<div class="container state-box">Carregando produto...</div>'; return; }
    const p = state.products.find((x) => x.id === id);
    if (!p) { v.innerHTML = '<div class="container state-box"><h1>Produto não encontrado</h1><a class="btn" href="#">Voltar à vitrine</a></div>'; return; }

    const colors = colorsOf(p), sizes = p.sizes || [], imgs = imagesOf(p);
    if (pdp.pid !== id) {
      const first = colors.find((c) => sizes.some((s) => getStock(p, c, s) > 0)) || colors[0];
      Object.assign(pdp, { pid: id, img: 0, color: first, size: null });
    }
    if (!colors.includes(pdp.color)) pdp.color = colors[0];
    if (pdp.size && getStock(p, pdp.color, pdp.size) <= 0) pdp.size = null;
    if (pdp.img >= imgs.length) pdp.img = 0;

    const related = sortedProducts(state.products.filter((x) => x.categoryId === p.categoryId && x.id !== p.id)).slice(0, 4);
    v.innerHTML = `
    <div class="container">
      <a class="crumb" href="#">${icon('back', 16)} Voltar à vitrine</a>
      <div class="pdp">
        <div>
          <div class="gallery-main">${imgs[pdp.img] ? `<img src="${esc(imgs[pdp.img])}" alt="${esc(p.name)}">` : '<div class="img-empty"></div>'}</div>
          ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, i) => `<button type="button" class="thumb ${i === pdp.img ? 'is-active' : ''}" data-act="pdp-img" data-i="${i}" aria-label="Foto ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        </div>
        <div>
          <p class="muted small" style="margin:0">${esc(catName(p.categoryId))}${p.gender ? ' / ' + esc(p.gender) : ''}</p>
          <h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">${esc(p.name)}</h1>
          <div class="pdp-price">
            ${isPromo(p)
              ? `<span class="badge" style="position:static;display:inline-block;margin-bottom:6px">-${discountPct(p)}%</span><div class="old">De ${brl(p.price)} por apenas</div><div class="now">${brl(p.promoPrice)}</div>`
              : `<div class="now" style="color:var(--text)">${brl(p.price)}</div>`}
          </div>
          <div class="opt-label">Cor: ${esc(pdp.color)}</div>
          <div class="opts">${colors.map((c) => {
            const out = !sizes.some((s) => getStock(p, c, s) > 0);
            return `<button type="button" class="opt ${c === pdp.color ? 'is-active' : ''}" data-act="pdp-color" data-v="${esc(c)}" ${out ? 'disabled' : ''}>${esc(c)}</button>`;
          }).join('')}</div>
          <div class="opt-label">Tamanho</div>
          <div class="opts">${sizes.map((s) => {
            const out = getStock(p, pdp.color, s) <= 0;
            return `<button type="button" class="opt ${s === pdp.size ? 'is-active' : ''}" data-act="pdp-size" data-v="${esc(s)}" ${out ? 'disabled' : ''}>${esc(s)}</button>`;
          }).join('')}</div>
          <div id="pdp-msg" class="msg" role="alert" style="margin-top:10px"></div>
          <div class="pdp-actions">
            <button type="button" class="btn btn-ghost" data-act="pdp-add" ${totalStock(p) <= 0 ? 'disabled' : ''}>Adicionar ao Carrinho</button>
            <button type="button" class="btn" data-act="pdp-buy" ${totalStock(p) <= 0 ? 'disabled' : ''}>Comprar Agora</button>
          </div>
          ${totalStock(p) <= 0 ? '<p class="muted small" style="margin-top:10px">Produto esgotado.</p>' : ''}
          <div class="spec"><h3>Descrição técnica</h3><p>${esc(p.description || 'Sem detalhes cadastrados.')}</p></div>
        </div>
      </div>
    </div>
    ${related.length ? `<section class="container related"><h2>Produtos relacionados</h2><div class="grid">${related.map((x) => cardHtml(x, true)).join('')}</div></section>` : ''}`;
  }

  actions['pdp-img'] = (el) => { pdp.img = Number(el.dataset.i); renderPDP(pdp.pid); };
  actions['pdp-color'] = (el) => { pdp.color = el.dataset.v; renderPDP(pdp.pid); };
  actions['pdp-size'] = (el) => { pdp.size = el.dataset.v; renderPDP(pdp.pid); };

  function pdpSelection() {
    const p = state.products.find((x) => x.id === pdp.pid);
    if (!p) return null;
    if (!pdp.size) { setMsg('#pdp-msg', 'Selecione um tamanho para continuar.', 'error'); return null; }
    if (getStock(p, pdp.color, pdp.size) <= 0) { setMsg('#pdp-msg', 'Esta combinação está esgotada.', 'error'); return null; }
    return { p, color: pdp.color, size: pdp.size };
  }

  function bumpCart() {
    const b = $('.header-btn[data-act="open-cart"]');
    if (!b) return;
    b.classList.remove('bump');
    void b.offsetWidth;
    b.classList.add('bump');
  }

  function addToCart(pid, color, size, qty) {
    const p = state.products.find((x) => x.id === pid);
    if (!p) return false;
    const avail = getStock(p, color, size);
    const ex = state.cart.items.find((i) => i.pid === pid && i.color === color && i.size === size);
    const next = (ex ? ex.qty : 0) + (qty || 1);
    if (next > avail) { toast(`Estoque disponível: ${avail} unidade(s).`, 'error'); return false; }
    if (ex) ex.qty = next; else state.cart.items.push({ pid, color, size, qty: qty || 1 });
    saveCart();
    updateHeader();
    bumpCart();
    return true;
  }

  actions['pdp-add'] = () => {
    const s = pdpSelection();
    if (!s) return;
    if (addToCart(s.p.id, s.color, s.size, 1)) { setMsg('#pdp-msg', ''); toast('Produto adicionado ao carrinho.'); openCart(); }
  };
  actions['pdp-buy'] = () => {
    const s = pdpSelection();
    if (!s) return;
    state.buyNow = { pid: s.p.id, color: s.color, size: s.size, qty: 1 };
    startCheckout('buynow');
  };
  actions.quick = (el) => {
    const p = state.products.find((x) => x.id === el.dataset.id);
    if (!p) return;
    const variants = [];
    colorsOf(p).forEach((c) => (p.sizes || []).forEach((s) => { if (getStock(p, c, s) > 0) variants.push([c, s]); }));
    if (variants.length === 1) { if (addToCart(p.id, variants[0][0], variants[0][1], 1)) toast('Produto adicionado ao carrinho.'); }
    else if (!variants.length) toast('Produto esgotado.', 'error');
    else { location.hash = '#produto/' + p.id; toast('Escolha cor e tamanho para adicionar.'); }
  };

  /* =====================================================================
     11. CARRINHO, FRETE E CUPONS
     ===================================================================== */
  function renderCart() {
    const body = $('#cart-body'), foot = $('#cart-foot');
    let lines = linesOf(state.cart.items);
    if (state.coupon && state.coupon.scope === 'categoria' && eligibleBase(lines, state.coupon) === 0) {
      state.coupon = null;
      state.couponMsg = { text: 'Não há produtos no carrinho que se apliquem ao cupom', type: 'error' };
    }
    if (!lines.length) {
      body.innerHTML = '<div class="state-box"><p>Seu carrinho está vazio.</p><button type="button" class="btn btn-ghost" data-act="close-cart">Continuar comprando</button></div>';
      foot.innerHTML = '';
      return;
    }
    body.innerHTML = lines.map((l, i) => {
      const img = imagesOf(l.product)[0];
      return `<div class="cart-item">
        ${img ? `<img src="${esc(img)}" alt="${esc(l.product.name)}">` : '<div class="img-empty"></div>'}
        <div>
          <h4>${esc(l.product.name)}</h4>
          <div class="cart-meta">COR: ${esc(l.item.color)} / TAM: ${esc(l.item.size)}</div>
          <div class="cart-line">
            <div class="qty">
              <button type="button" data-act="cart-dec" data-i="${i}" aria-label="Diminuir quantidade">${icon('minus', 16)}</button>
              <span>${l.item.qty}</span>
              <button type="button" data-act="cart-inc" data-i="${i}" aria-label="Aumentar quantidade" ${l.item.qty >= l.avail ? 'disabled' : ''}>${icon('plus', 16)}</button>
            </div>
            <strong>${brl(l.unit * l.item.qty)}</strong>
            <button type="button" class="rm" data-act="cart-rm" data-i="${i}" aria-label="Remover item">${icon('trash', 18)}</button>
          </div>
        </div>
      </div>`;
    }).join('');

    const tiers = state.settings.shippingTiers;
    const t = computeTotals(lines, state.coupon, currentTier());
    const pct = t.threshold > 0 ? Math.min(100, Math.round((t.base / t.threshold) * 100)) : 0;
    const msg = state.couponMsg;
    foot.innerHTML = `
      ${t.threshold > 0 ? `
        <div class="small">${t.free ? 'Você ganhou frete grátis.' : `Faltam ${brl(t.threshold - t.base)} para o frete grátis.`}</div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>` : ''}
      <div class="field" style="margin-bottom:8px">
        <label for="cart-ship">Frete</label>
        ${tiers.length ? `<select id="cart-ship" data-in="ship"><option value="-1">Selecione a região ou faixa de distância</option>${tiers.map((x, i) => `<option value="${i}" ${i === state.cart.shipIdx ? 'selected' : ''}>${esc(x.label)} (${brl(x.price)})</option>`).join('')}</select>` : '<span class="muted small">Frete a combinar com a loja.</span>'}
      </div>
      ${state.coupon
        ? `<div class="coupon-tag"><span>Cupom <strong>${esc(state.coupon.code)}</strong> (-${esc(state.coupon.percent)}%)</span><button type="button" class="link" data-act="coupon-remove">Remover</button></div>`
        : `<form class="coupon-row" data-form="coupon"><input class="inline-input upper" id="coupon-input" data-in="coupon" placeholder="Cupom de desconto" value="${esc(state.couponInput)}" aria-label="Cupom de desconto" autocomplete="off"><button type="submit" class="btn btn-ghost btn-sm">Aplicar</button></form>`}
      <div class="msg ${msg ? msg.type : ''}" role="alert">${msg ? esc(msg.text) : ''}</div>
      <div class="sum-row"><span>Subtotal</span><span>${brl(t.subtotal)}</span></div>
      ${t.discount > 0 ? `<div class="sum-row"><span>Desconto</span><span class="disc">-${brl(t.discount)}</span></div>` : ''}
      <div class="sum-row"><span>Frete</span><span>${t.free ? 'Grátis' : (currentTier() ? brl(t.shipping) : (tiers.length ? 'A calcular' : 'A combinar'))}</span></div>
      <div class="sum-row total"><span>Total</span><span>${brl(t.total)}</span></div>
      <button type="button" class="btn btn-block" style="margin-top:12px" data-act="checkout-cart">Finalizar Compra</button>`;
  }

  inputs.ship = (el) => { state.cart.shipIdx = Number(el.value); saveCart(); renderCart(); };
  inputs.coupon = (el) => { el.value = el.value.toUpperCase(); state.couponInput = el.value; };
  actions['cart-inc'] = (el) => { const l = linesOf(state.cart.items)[Number(el.dataset.i)]; if (l && l.item.qty < l.avail) { l.item.qty++; saveCart(); updateHeader(); renderCart(); } };
  actions['cart-dec'] = (el) => { const l = linesOf(state.cart.items)[Number(el.dataset.i)]; if (l) { l.item.qty--; if (l.item.qty <= 0) state.cart.items = state.cart.items.filter((x) => x !== l.item); saveCart(); updateHeader(); renderCart(); } };
  actions['cart-rm'] = (el) => { const l = linesOf(state.cart.items)[Number(el.dataset.i)]; if (l) { state.cart.items = state.cart.items.filter((x) => x !== l.item); saveCart(); updateHeader(); renderCart(); } };
  actions['coupon-remove'] = () => { state.coupon = null; state.couponMsg = null; state.couponInput = ''; renderCart(); if (!$('#modal-root').hidden && $('#co-summary')) renderCheckoutSummary(); };

  async function applyCoupon(raw, lines) {
    const code = String(raw || '').trim().toUpperCase();
    if (!code) return { text: 'Informe o código do cupom.', type: 'error' };
    if (!/^[A-Z0-9_-]{2,30}$/.test(code)) return { text: 'Cupom inválido ou inativo.', type: 'error' };
    let snap;
    try { snap = await db.collection('coupons').doc(code).get(); } catch (e) { return { text: 'Não foi possível validar o cupom agora.', type: 'error' }; }
    if (!snap.exists || !snap.data().active) return { text: 'Cupom inválido ou inativo.', type: 'error' };
    const c = Object.assign({ code }, snap.data());
    const used = Number(((state.userDoc || {}).couponUses || {})[code] || 0);
    if (state.user && c.maxUsesPerUser > 0 && used >= c.maxUsesPerUser) return { text: 'Você já atingiu o limite de usos deste cupom.', type: 'error' };
    if (c.scope === 'categoria' && eligibleBase(lines, c) === 0) return { text: 'Não há produtos no carrinho que se apliquem ao cupom', type: 'error' };
    state.coupon = c;
    return { text: `Cupom ${code} aplicado.`, type: 'ok' };
  }

  forms.coupon = async (f) => {
    state.couponMsg = await applyCoupon(new FormData(f).get('code') || $('#coupon-input').value, linesOf(state.cart.items));
    if (state.couponMsg.type === 'ok') state.couponInput = '';
    renderCart();
  };

  /* =====================================================================
     12. CHECKOUT E REGISTRO DO PEDIDO
     ===================================================================== */
  const itemsFor = (source) => (source === 'buynow' ? (state.buyNow ? [state.buyNow] : []) : state.cart.items);

  actions['checkout-cart'] = () => startCheckout('cart');

  function startCheckout(source) {
    if (!itemsFor(source).length) return toast('Seu carrinho está vazio.', 'error');
    if (!state.user) {
      state.pending = { source };
      closeCart();
      openAuth('login', 'Entre ou crie sua conta para finalizar a compra. Seus itens continuam salvos.');
      return;
    }
    closeCart();
    openCheckout(source);
  }

  let coSource = 'cart';
  function openCheckout(source) {
    coSource = source;
    const lines = linesOf(itemsFor(source));
    if (!lines.length) return toast('Itens indisponíveis.', 'error');
    const tiers = state.settings.shippingTiers;
    const u = state.user;
    const modal = openModal(`
      <h2 class="modal-title">Fechamento do pedido</h2>
      <div class="co-grid">
        <form data-form="order" id="order-form" novalidate>
          <div class="field"><label for="o-name">Nome completo</label><input id="o-name" name="name" value="${esc(u.displayName || '')}" autocomplete="name" required></div>
          <div class="field-row">
            <div class="field"><label for="o-phone">Telefone (WhatsApp)</label><input id="o-phone" name="phone" inputmode="tel" autocomplete="tel" required></div>
            <div class="field"><label for="o-cep">CEP</label><input id="o-cep" name="cep" inputmode="numeric" maxlength="9" autocomplete="postal-code" required></div>
          </div>
          <div class="field"><label for="o-street">Rua</label><input id="o-street" name="street" autocomplete="address-line1" required></div>
          <div class="field-row">
            <div class="field"><label for="o-number">Número</label><input id="o-number" name="number" required></div>
            <div class="field"><label for="o-comp">Complemento</label><input id="o-comp" name="complement"></div>
          </div>
          <div class="field"><label for="o-district">Bairro</label><input id="o-district" name="district" required></div>
          <div class="field-row">
            <div class="field"><label for="o-city">Cidade</label><input id="o-city" name="city" autocomplete="address-level2" required></div>
            <div class="field"><label for="o-uf">UF</label><input id="o-uf" name="uf" class="upper" maxlength="2" required></div>
          </div>
          <div class="field">
            <label for="o-ship">Frete</label>
            ${tiers.length ? `<select id="o-ship" name="ship" data-in="co-ship"><option value="-1">Selecione a região ou faixa de distância</option>${tiers.map((x, i) => `<option value="${i}" ${i === state.cart.shipIdx ? 'selected' : ''}>${esc(x.label)} (${brl(x.price)})</option>`).join('')}</select>` : '<span class="muted small">Frete a combinar com a loja.</span>'}
          </div>
          <div id="order-msg" class="msg" role="alert"></div>
          <button type="submit" id="order-submit" class="btn btn-block">Confirmar Pedido</button>
        </form>
        <div class="co-box" id="co-summary"></div>
      </div>`, { wide: true, label: 'Fechamento do pedido' });
    renderCheckoutSummary(modal);
  }

  inputs['co-ship'] = (el) => { state.cart.shipIdx = Number(el.value); saveCart(); renderCheckoutSummary(); };
  forms['co-coupon'] = async (f) => {
    state.couponMsg = await applyCoupon($('#co-coupon-input', f).value, linesOf(itemsFor(coSource)));
    if (state.couponMsg.type === 'ok') state.couponInput = '';
    renderCheckoutSummary();
  };

  function renderCheckoutSummary() {
    const box = $('#co-summary');
    if (!box) return;
    const lines = linesOf(itemsFor(coSource));
    if (state.coupon && state.coupon.scope === 'categoria' && eligibleBase(lines, state.coupon) === 0) {
      state.coupon = null;
      state.couponMsg = { text: 'Não há produtos no carrinho que se apliquem ao cupom', type: 'error' };
    }
    const t = computeTotals(lines, state.coupon, currentTier());
    const msg = state.couponMsg;
    box.innerHTML = `
      <h3>Resumo</h3>
      ${lines.map((l) => `<div class="sum-row"><span>${l.item.qty}x ${esc(l.product.name)}<br><span class="muted small">${esc(l.item.color)} / ${esc(l.item.size)}</span></span><span>${brl(l.unit * l.item.qty)}</span></div>`).join('')}
      ${state.coupon
        ? `<div class="coupon-tag"><span>Cupom <strong>${esc(state.coupon.code)}</strong></span><button type="button" class="link" data-act="coupon-remove">Remover</button></div>`
        : `<form class="coupon-row" data-form="co-coupon"><input class="inline-input upper" id="co-coupon-input" data-in="coupon" placeholder="Cupom de desconto" value="${esc(state.couponInput)}" aria-label="Cupom de desconto" autocomplete="off"><button type="submit" class="btn btn-ghost btn-sm">Aplicar</button></form>`}
      <div class="msg ${msg ? msg.type : ''}" role="alert">${msg ? esc(msg.text) : ''}</div>
      <div class="sum-row"><span>Subtotal</span><span>${brl(t.subtotal)}</span></div>
      ${t.discount > 0 ? `<div class="sum-row"><span>Desconto</span><span class="disc">-${brl(t.discount)}</span></div>` : ''}
      <div class="sum-row"><span>Frete</span><span>${t.free ? 'Grátis' : (currentTier() ? brl(t.shipping) : (state.settings.shippingTiers.length ? 'Selecione' : 'A combinar'))}</span></div>
      <div class="sum-row total"><span>Total</span><span>${brl(t.total)}</span></div>
      <p class="muted small" style="margin:10px 0 0">O pagamento é combinado diretamente com a loja após o registro do pedido.</p>`;
  }

  forms.order = async (f) => {
    const d = Object.fromEntries(new FormData(f).entries());
    const required = ['name', 'phone', 'cep', 'street', 'number', 'district', 'city', 'uf'];
    if (required.some((k) => !String(d[k] || '').trim())) return setMsg('#order-msg', 'Preencha todos os campos obrigatórios.', 'error');
    const tiers = state.settings.shippingTiers;
    if (tiers.length && !currentTier()) return setMsg('#order-msg', 'Selecione o frete.', 'error');
    const btn = $('#order-submit');
    btn.disabled = true;
    setMsg('#order-msg', 'Registrando pedido...', '');
    try {
      const orderId = await placeOrder(coSource, d);
      if (coSource === 'buynow') state.buyNow = null; else state.cart.items = [];
      state.coupon = null; state.couponMsg = null; state.couponInput = '';
      saveCart();
      updateHeader();
      openModal(`
        <h2 class="modal-title">Pedido registrado</h2>
        <p>Número do pedido: <strong>${esc(orderId.slice(0, 8).toUpperCase())}</strong></p>
        <p>Status: Aguardando Pagamento. A loja entrará em contato pelo telefone informado para combinar o pagamento e o envio.</p>
        <button type="button" class="btn btn-block" data-act="close-modal">Voltar à loja</button>`, { label: 'Pedido registrado' });
    } catch (e) {
      console.error(e);
      btn.disabled = false;
      setMsg('#order-msg', e.userMessage || 'Não foi possível registrar o pedido. Tente novamente.', 'error');
    }
  };

  class UserError extends Error { constructor(m) { super(m); this.userMessage = m; } }

  async function placeOrder(source, d) {
    const uid = state.user.uid;
    const items = itemsFor(source).map((i) => Object.assign({}, i));
    const tier = currentTier();
    const orderRef = db.collection('orders').doc();
    const userRef = db.collection('users').doc(uid);
    const couponRef = state.coupon ? db.collection('coupons').doc(state.coupon.code) : null;

    await db.runTransaction(async (tx) => {
      const pids = Array.from(new Set(items.map((i) => i.pid)));
      const prodSnaps = await Promise.all(pids.map((id) => tx.get(db.collection('products').doc(id))));
      const userSnap = await tx.get(userRef);
      const couponSnap = couponRef ? await tx.get(couponRef) : null;

      const prods = {};
      prodSnaps.forEach((s) => { if (s.exists) prods[s.id] = s.data(); });

      const stockMaps = {};
      const lines = items.map((it) => {
        const p = prods[it.pid];
        if (!p) throw new UserError('Um dos produtos não está mais disponível.');
        if (!stockMaps[it.pid]) stockMaps[it.pid] = Object.assign({}, p.stock || {});
        const k = skey(it.color, it.size);
        const avail = Number(stockMaps[it.pid][k] || 0);
        if (avail < it.qty) throw new UserError(`Estoque insuficiente para ${p.name} (${it.color} / ${it.size}).`);
        stockMaps[it.pid][k] = avail - it.qty;
        return { item: it, product: Object.assign({ id: it.pid }, p), unit: effPrice(p) };
      });

      let coupon = null;
      if (couponSnap) {
        if (!couponSnap.exists || !couponSnap.data().active) throw new UserError('O cupom informado não está mais ativo.');
        coupon = Object.assign({ code: couponSnap.id }, couponSnap.data());
        const used = Number(((userSnap.exists ? userSnap.data() : {}).couponUses || {})[coupon.code] || 0);
        if (coupon.maxUsesPerUser > 0 && used >= coupon.maxUsesPerUser) throw new UserError('Você já atingiu o limite de usos deste cupom.');
        if (coupon.scope === 'categoria' && eligibleBase(lines, coupon) === 0) throw new UserError('Não há produtos no carrinho que se apliquem ao cupom');
      }

      const t = computeTotals(lines, coupon, tier);
      Object.keys(stockMaps).forEach((pid) => tx.update(db.collection('products').doc(pid), { stock: stockMaps[pid] }));
      tx.set(orderRef, {
        uid,
        customer: { name: d.name.trim(), email: state.user.email, phone: d.phone.trim() },
        address: {
          cep: d.cep.trim(), street: d.street.trim(), number: d.number.trim(), complement: (d.complement || '').trim(),
          district: d.district.trim(), city: d.city.trim(), uf: d.uf.trim().toUpperCase()
        },
        items: lines.map((l) => ({ productId: l.item.pid, name: l.product.name, color: l.item.color, size: l.item.size, qty: l.item.qty, unitPrice: l.unit })),
        subtotal: t.subtotal, discount: t.discount, shipping: t.shipping,
        shippingLabel: t.free ? 'Frete grátis' : (tier ? tier.label : 'A combinar'),
        total: t.total, coupon: coupon ? coupon.code : null,
        status: STATUSES[0], createdAt: FV.serverTimestamp()
      });
      if (coupon) {
        const used = Number(((userSnap.exists ? userSnap.data() : {}).couponUses || {})[coupon.code] || 0);
        const patch = { couponUses: {} };
        patch.couponUses[coupon.code] = used + 1;
        tx.set(userRef, patch, { merge: true });
      }
    });
    return orderRef.id;
  }

  /* =====================================================================
     13. PAINEL DO LOJISTA (#admin)
     ===================================================================== */
  const ADMIN_TABS = [['produtos', 'Produtos'], ['categorias', 'Categorias'], ['cupons', 'Cupons'], ['pedidos', 'Pedidos'], ['frete', 'Frete']];

  function renderAdmin() {
    const v = view();
    if (!state.authReady) { v.innerHTML = '<div class="container state-box">Verificando acesso...</div>'; return; }
    if (!state.user) {
      v.innerHTML = `<div class="container admin" style="max-width:440px">
        <h1>Área do lojista</h1>
        <div class="panel">
          <div id="admin-msg" class="msg" role="alert"></div>
          <form data-form="admin-login" novalidate>
            <div class="field"><label for="ad-email">E-mail</label><input id="ad-email" name="email" type="email" autocomplete="email" required></div>
            <div class="field"><label for="ad-pass">Senha</label><input id="ad-pass" name="password" type="password" autocomplete="current-password" required></div>
            <button class="btn btn-block" type="submit">Entrar</button>
          </form>
        </div></div>`;
      return;
    }
    if (!state.isAdmin) {
      v.innerHTML = '<div class="container state-box"><h1>Acesso restrito</h1><p>Esta conta não tem permissão de lojista.</p><button type="button" class="btn btn-ghost" data-act="logout">Sair</button> <a class="btn" href="#">Voltar à loja</a></div>';
      return;
    }
    v.innerHTML = `<div class="container admin">
      <h1>Painel do lojista</h1>
      <div class="admin-tabs" role="tablist">${ADMIN_TABS.map(([id, label]) => `<button type="button" role="tab" class="tab ${state.adminTab === id ? 'is-active' : ''}" data-act="admin-tab" data-id="${id}">${label}</button>`).join('')}</div>
      <div id="admin-body"></div></div>`;
    renderAdminTab();
  }

  forms['admin-login'] = async (f) => {
    const d = new FormData(f);
    try { await auth.signInWithEmailAndPassword(String(d.get('email')).trim(), String(d.get('password'))); }
    catch (e) { setMsg('#admin-msg', authError(e), 'error'); }
  };
  actions['admin-tab'] = (el) => { state.adminTab = el.dataset.id; state.pform = null; renderAdmin(); };

  function renderAdminTab() {
    const body = $('#admin-body');
    if (!body) return;
    const t = state.adminTab;
    if (t === 'produtos') return renderProductsTab(body);
    if (t === 'categorias') return renderCategoriesTab(body);
    if (t === 'cupons') return renderCouponsTab(body);
    if (t === 'pedidos') return renderOrdersTab(body);
    return renderShippingTab(body);
  }

  function refreshAdmin(kind) {
    const t = state.adminTab;
    if (kind === 'products' && t === 'produtos' && !state.pform) renderProductList();
    else if (kind === 'categories' && t === 'categorias') renderCategoryList();
    else if (kind === 'coupons' && t === 'cupons') renderCouponList();
    else if (kind === 'orders' && t === 'pedidos') renderOrderList();
    else if (kind === 'settings' && t === 'produtos' && state.pform) {
      const sel = $('#preset-pick');
      if (sel) sel.innerHTML = '<option value="">Selecione</option>' + state.settings.sizePresets.map((p, i) => `<option value="${i}">${esc(p.name)}: ${esc((p.sizes || []).join(' '))}</option>`).join('');
    }
  }

  const adminErr = (e) => { console.error(e); toast('Operação não permitida ou falhou. Verifique as regras do Firestore.', 'error'); };

  /* ----- Produtos ----- */
  function blankProduct() {
    return { id: null, name: '', description: '', categoryId: '', gender: 'UNISSEX', price: '', promoPrice: '', images: '', colors: [], sizes: [], stock: {} };
  }

  function renderProductsTab(body) {
    if (state.pform) return renderProductForm(body);
    body.innerHTML = `
      <div class="panel">
        <button type="button" class="btn btn-block" data-act="p-new">Novo produto</button>
      </div>
      <div class="panel"><h3>Catálogo</h3><div id="ap-list"></div></div>`;
    renderProductList();
  }

  function renderProductList() {
    const box = $('#ap-list');
    if (!box) return;
    const list = sortedProducts(state.products);
    box.innerHTML = list.length ? list.map((p) => {
      const img = imagesOf(p)[0];
      return `<div class="row-item">
        ${img ? `<img src="${esc(img)}" alt="">` : '<div class="img-empty"></div>'}
        <div class="row-grow">
          <strong>${esc(p.name)}</strong>
          <span class="muted small">${esc(catName(p.categoryId) || 'Sem categoria')} / ${esc(p.gender || '')}</span><br>
          <span class="small">${isPromo(p) ? `${brl(p.promoPrice)} <s class="muted">${brl(p.price)}</s> <span class="tag on">-${discountPct(p)}%</span>` : brl(p.price)}</span>
          <span class="tag">Estoque: ${totalStock(p)}</span>
        </div>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-act="p-edit" data-id="${esc(p.id)}">Editar</button>
          <button type="button" class="btn btn-danger btn-sm" data-act="p-del" data-id="${esc(p.id)}">Excluir</button>
        </div>
      </div>`;
    }).join('') : '<p class="muted">Nenhum produto cadastrado.</p>';
  }

  actions['p-new'] = () => { state.pform = blankProduct(); renderAdminTab(); };
  actions['p-edit'] = (el) => {
    const p = state.products.find((x) => x.id === el.dataset.id);
    if (!p) return;
    state.pform = {
      id: p.id, name: p.name || '', description: p.description || '', categoryId: p.categoryId || '', gender: p.gender || 'UNISSEX',
      price: fmtInput(p.price), promoPrice: isPromo(p) ? fmtInput(p.promoPrice) : '', images: (p.images || []).join('\n'),
      colors: (p.colors || []).slice(), sizes: (p.sizes || []).slice(), stock: Object.assign({}, p.stock || {})
    };
    renderAdminTab();
    window.scrollTo(0, 0);
  };
  actions['p-del'] = async (el) => {
    const p = state.products.find((x) => x.id === el.dataset.id);
    if (!p || !confirm(`Excluir o produto "${p.name}"? Esta ação não pode ser desfeita.`)) return;
    try { await db.collection('products').doc(p.id).delete(); toast('Produto excluído.'); } catch (e) { adminErr(e); }
  };
  actions['p-cancel'] = () => { state.pform = null; renderAdminTab(); };

  function renderProductForm(body) {
    const f = state.pform;
    const presets = state.settings.sizePresets;
    body.innerHTML = `
    <form data-form="product" class="panel" novalidate>
      <h3>${f.id ? 'Editar produto' : 'Novo produto'}</h3>
      <div class="field"><label for="pf-name">Nome</label><input id="pf-name" data-in="pf" data-k="name" value="${esc(f.name)}" required></div>
      <div class="field"><label for="pf-desc">Descrição técnica (material, malha, especificações)</label><textarea id="pf-desc" data-in="pf" data-k="description">${esc(f.description)}</textarea></div>
      <div class="field-row">
        <div class="field"><label for="pf-cat">Categoria</label>
          <select id="pf-cat" data-in="pf" data-k="categoryId"><option value="">Selecione</option>${state.categories.map((c) => `<option value="${esc(c.id)}" ${c.id === f.categoryId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="pf-gender">Sexo</label>
          <select id="pf-gender" data-in="pf" data-k="gender">${GENDERS.map((g) => `<option ${g === f.gender ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="pf-price">Preço lançado (R$)</label><input id="pf-price" data-in="pf" data-k="price" inputmode="decimal" placeholder="199,00" value="${esc(f.price)}"></div>
        <div class="field"><label for="pf-promo">Preço promocional (R$)</label><input id="pf-promo" data-in="pf" data-k="promoPrice" inputmode="decimal" placeholder="159,00" value="${esc(f.promoPrice)}"></div>
      </div>
      <div class="field"><label for="pf-images">URLs das fotos (uma por linha)</label><textarea id="pf-images" data-in="pf" data-k="images" placeholder="https://...">${esc(f.images)}</textarea></div>
      <div class="field"><label for="pf-colors">Cores (separadas por vírgula)</label><input id="pf-colors" class="upper" data-in="pf-colors" placeholder="PRETO, BRANCO, VERDE" value="${esc(f.colors.join(', '))}"></div>

      <div class="label">Tamanhos</div>
      <div class="add-row">
        <input class="inline-input upper" id="size-new" placeholder="P, M, G, GG ou 39, 40..." maxlength="8" data-in="size-new" aria-label="Novo tamanho">
        <button type="button" class="btn btn-ghost" data-act="size-add">Adicionar</button>
      </div>
      <div class="chips" id="size-chips"></div>
      <div class="field-row" style="align-items:end">
        <div class="field" style="margin:0"><label for="preset-pick">Pré-configurações salvas</label>
          <select id="preset-pick" data-in="preset-pick"><option value="">Selecione</option>${presets.map((p, i) => `<option value="${i}">${esc(p.name)}: ${esc((p.sizes || []).join(' '))}</option>`).join('')}</select></div>
        <button type="button" class="btn btn-ghost btn-sm" data-act="preset-del">Excluir pré-config.</button>
      </div>
      <div class="add-row" style="margin:12px 0 16px">
        <input class="inline-input" id="preset-name" placeholder="Nome da pré-configuração (ex: Roupas)" aria-label="Nome da pré-configuração">
        <button type="button" class="btn btn-ghost" data-act="preset-save">Salvar tamanhos</button>
      </div>

      <div class="label">Estoque por cor e tamanho</div>
      <div id="stock-matrix"></div>
      <div id="pf-msg" class="msg" role="alert" style="margin-top:12px"></div>
      <div class="stack">
        <button type="submit" class="btn btn-block">Salvar produto</button>
        <button type="button" class="btn btn-ghost btn-block" data-act="p-cancel">Cancelar</button>
      </div>
    </form>`;
    renderSizeChips();
    renderMatrix();
  }

  inputs.pf = (el) => { if (state.pform) state.pform[el.dataset.k] = el.value; };
  inputs['pf-colors'] = (el) => {
    el.value = el.value.toUpperCase();
    state.pform.colors = Array.from(new Set(el.value.split(',').map((c) => c.trim()).filter(Boolean)));
    renderMatrix();
  };
  inputs['size-new'] = (el) => { el.value = el.value.toUpperCase(); };
  inputs['preset-pick'] = (el) => {
    const p = state.settings.sizePresets[Number(el.value)];
    if (!p) return;
    state.pform.sizes = (p.sizes || []).slice();
    renderSizeChips();
    renderMatrix();
  };
  inputs.stock = (el) => { state.pform.stock[el.dataset.k] = Math.max(0, parseInt(el.value, 10) || 0); };

  function renderSizeChips() {
    const box = $('#size-chips');
    if (!box) return;
    box.innerHTML = state.pform.sizes.length
      ? state.pform.sizes.map((s) => `<span class="chip">${esc(s)}<button type="button" data-act="size-rm" data-v="${esc(s)}" aria-label="Remover tamanho ${esc(s)}">${icon('close', 14)}</button></span>`).join('')
      : '<span class="muted small">Nenhum tamanho adicionado.</span>';
  }

  function renderMatrix() {
    const box = $('#stock-matrix');
    if (!box) return;
    const f = state.pform;
    const colors = f.colors.length ? f.colors : ['ÚNICA'];
    if (!f.sizes.length) { box.innerHTML = '<p class="muted small">Adicione tamanhos para informar o estoque.</p>'; return; }
    box.innerHTML = `<div class="matrix-wrap"><table class="matrix"><thead><tr><th>Cor</th>${f.sizes.map((s) => `<th>${esc(s)}</th>`).join('')}</tr></thead><tbody>${colors.map((c) => `<tr><td>${esc(c)}</td>${f.sizes.map((s) => {
      const k = skey(c, s);
      return `<td><input type="number" min="0" step="1" inputmode="numeric" data-in="stock" data-k="${esc(k)}" value="${Number(f.stock[k] || 0)}" aria-label="Estoque ${esc(c)} ${esc(s)}"></td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  actions['size-add'] = () => {
    const inp = $('#size-new');
    const parts = inp.value.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    parts.forEach((s) => { if (!state.pform.sizes.includes(s)) state.pform.sizes.push(s); });
    inp.value = '';
    renderSizeChips();
    renderMatrix();
  };
  actions['size-rm'] = (el) => { state.pform.sizes = state.pform.sizes.filter((s) => s !== el.dataset.v); renderSizeChips(); renderMatrix(); };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target && e.target.id === 'size-new') { e.preventDefault(); actions['size-add'](); }
  });

  async function savePresets(list) {
    await db.collection('settings').doc('store').set({ sizePresets: list }, { merge: true });
  }
  actions['preset-save'] = async () => {
    const name = $('#preset-name').value.trim();
    if (!name || !state.pform.sizes.length) return toast('Informe um nome e adicione tamanhos.', 'error');
    const list = state.settings.sizePresets.filter((p) => p.name !== name).concat([{ name, sizes: state.pform.sizes.slice() }]);
    try { await savePresets(list); $('#preset-name').value = ''; toast('Pré-configuração salva.'); } catch (e) { adminErr(e); }
  };
  actions['preset-del'] = async () => {
    const idx = Number($('#preset-pick').value);
    if (!state.settings.sizePresets[idx] || $('#preset-pick').value === '') return toast('Selecione uma pré-configuração.', 'error');
    try { await savePresets(state.settings.sizePresets.filter((_, i) => i !== idx)); toast('Pré-configuração excluída.'); } catch (e) { adminErr(e); }
  };

  forms.product = async (form) => {
    const f = state.pform;
    const price = parseBRL(f.price), promo = parseBRL(f.promoPrice);
    const images = f.images.split('\n').map((s) => s.trim()).filter(Boolean);
    const err = (m) => setMsg('#pf-msg', m, 'error');
    if (f.name.trim().length < 2) return err('Informe o nome do produto.');
    if (!f.categoryId) return err('Selecione uma categoria. Crie uma na aba Categorias, se necessário.');
    if (price <= 0) return err('Informe o preço lançado.');
    if (promo && promo >= price) return err('O preço promocional deve ser menor que o preço lançado.');
    if (!images.length || images.some((u) => !safeUrl(u))) return err('Informe ao menos uma URL de foto válida (começando com http ou https).');
    if (!f.sizes.length) return err('Adicione ao menos um tamanho.');
    const colors = f.colors.length ? f.colors : ['ÚNICA'];
    const stock = {};
    colors.forEach((c) => f.sizes.forEach((s) => { stock[skey(c, s)] = Number(f.stock[skey(c, s)] || 0); }));
    const data = {
      name: f.name.trim(), description: f.description.trim(), categoryId: f.categoryId, gender: f.gender,
      images, colors, sizes: f.sizes.slice(), stock, price, promoPrice: promo || 0, updatedAt: Date.now()
    };
    try {
      if (f.id) await db.collection('products').doc(f.id).update(data);
      else await db.collection('products').add(Object.assign(data, { createdAt: Date.now() }));
      state.pform = null;
      toast('Produto salvo.');
      renderAdminTab();
    } catch (e) { adminErr(e); }
  };

  /* ----- Categorias ----- */
  function renderCategoriesTab(body) {
    body.innerHTML = `
      <div class="panel"><h3>Nova categoria</h3>
        <form data-form="cat-new" class="add-row"><input class="inline-input upper" name="name" placeholder="Ex: CAMISAS" maxlength="30" aria-label="Nome da categoria" required><button class="btn" type="submit">Criar</button></form>
      </div>
      <div class="panel"><h3>Categorias</h3><div id="ac-list"></div></div>`;
    renderCategoryList();
  }
  function renderCategoryList() {
    const box = $('#ac-list');
    if (!box) return;
    box.innerHTML = state.categories.length ? state.categories.map((c) => `
      <div class="row-item">
        <input class="inline-input upper row-grow" id="cat-${esc(c.id)}" value="${esc(c.name)}" aria-label="Nome da categoria" maxlength="30">
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-act="cat-save" data-id="${esc(c.id)}">Salvar</button>
          <button type="button" class="btn btn-danger btn-sm" data-act="cat-del" data-id="${esc(c.id)}">Excluir</button>
        </div>
      </div>`).join('') : '<p class="muted">Nenhuma categoria criada.</p>';
  }
  forms['cat-new'] = async (f) => {
    const name = String(new FormData(f).get('name')).trim().toUpperCase();
    if (!name) return;
    if (state.categories.some((c) => c.name === name)) return toast('Já existe uma categoria com este nome.', 'error');
    try { await db.collection('categories').add({ name, order: Date.now() }); f.reset(); toast('Categoria criada.'); } catch (e) { adminErr(e); }
  };
  actions['cat-save'] = async (el) => {
    const name = ($('#cat-' + el.dataset.id).value || '').trim().toUpperCase();
    if (!name) return toast('Informe o nome.', 'error');
    try { await db.collection('categories').doc(el.dataset.id).update({ name }); toast('Categoria atualizada.'); } catch (e) { adminErr(e); }
  };
  actions['cat-del'] = async (el) => {
    const c = state.categories.find((x) => x.id === el.dataset.id);
    if (!c) return;
    const inUse = state.products.filter((p) => p.categoryId === c.id).length + state.coupons.filter((x) => x.categoryId === c.id).length;
    if (inUse) return toast('Esta categoria está em uso por produtos ou cupons. Reatribua antes de excluir.', 'error');
    if (!confirm(`Excluir a categoria "${c.name}"?`)) return;
    try { await db.collection('categories').doc(c.id).delete(); toast('Categoria excluída.'); } catch (e) { adminErr(e); }
  };

  /* ----- Cupons ----- */
  function renderCouponsTab(body) {
    body.innerHTML = `
      <div class="panel"><h3 id="cp-title">Novo cupom</h3>
        <form data-form="coupon-save" id="cp-form" novalidate>
          <div class="field-row">
            <div class="field"><label for="cp-code">Código</label><input id="cp-code" name="code" class="upper" maxlength="30" placeholder="SITE10" required></div>
            <div class="field"><label for="cp-pct">Desconto (%)</label><input id="cp-pct" name="percent" type="number" min="1" max="100" step="1" inputmode="numeric" required></div>
          </div>
          <div class="field-row">
            <div class="field"><label for="cp-max">Limite de usos por conta (0 = sem limite)</label><input id="cp-max" name="max" type="number" min="0" step="1" inputmode="numeric" value="1"></div>
            <div class="field"><label for="cp-scope">Escopo</label>
              <select id="cp-scope" name="scope" data-in="cp-scope"><option value="carrinho">Desconto de Carrinho</option><option value="categoria">Categoria Específica</option></select></div>
          </div>
          <div class="field" id="cp-cat-wrap" hidden><label for="cp-cat">Categoria</label>
            <select id="cp-cat" name="categoryId"><option value="">Selecione</option>${state.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div>
          <label class="check"><input type="checkbox" name="active" checked><span>Cupom ativo</span></label>
          <div id="cp-msg" class="msg" role="alert"></div>
          <div class="stack">
            <button class="btn btn-block" type="submit">Salvar cupom</button>
            <button class="btn btn-ghost btn-block" type="button" data-act="cp-reset" id="cp-reset" hidden>Cancelar edição</button>
          </div>
        </form>
      </div>
      <div class="panel"><h3>Cupons</h3><div id="cp-list"></div></div>`;
    renderCouponList();
  }
  inputs['cp-scope'] = (el) => { $('#cp-cat-wrap').hidden = el.value !== 'categoria'; };
  function resetCouponForm() {
    const f = $('#cp-form');
    if (!f) return;
    f.reset();
    $('#cp-code').readOnly = false;
    $('#cp-cat-wrap').hidden = true;
    $('#cp-title').textContent = 'Novo cupom';
    $('#cp-reset').hidden = true;
    setMsg('#cp-msg', '');
  }
  actions['cp-reset'] = resetCouponForm;

  function renderCouponList() {
    const box = $('#cp-list');
    if (!box) return;
    box.innerHTML = state.coupons.length ? state.coupons.slice().sort((a, b) => a.code.localeCompare(b.code)).map((c) => `
      <div class="row-item">
        <div class="row-grow">
          <strong>${esc(c.code)} <span class="tag ${c.active ? 'on' : ''}">${c.active ? 'Ativo' : 'Inativo'}</span></strong>
          <span class="small muted">${esc(c.percent)}% / ${c.scope === 'categoria' ? 'Categoria: ' + esc(catName(c.categoryId) || 'removida') : 'Carrinho'} / ${c.maxUsesPerUser > 0 ? 'até ' + esc(c.maxUsesPerUser) + ' uso(s) por conta' : 'sem limite por conta'}</span>
        </div>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-act="cp-toggle" data-id="${esc(c.id)}">${c.active ? 'Desativar' : 'Ativar'}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="cp-edit" data-id="${esc(c.id)}">Editar</button>
          <button type="button" class="btn btn-danger btn-sm" data-act="cp-del" data-id="${esc(c.id)}">Excluir</button>
        </div>
      </div>`).join('') : '<p class="muted">Nenhum cupom criado.</p>';
  }
  actions['cp-edit'] = (el) => {
    const c = state.coupons.find((x) => x.id === el.dataset.id);
    const f = $('#cp-form');
    if (!c || !f) return;
    f.elements.code.value = c.code; f.elements.code.readOnly = true;
    f.elements.percent.value = c.percent;
    f.elements.max.value = c.maxUsesPerUser || 0;
    f.elements.scope.value = c.scope;
    $('#cp-cat-wrap').hidden = c.scope !== 'categoria';
    f.elements.categoryId.value = c.categoryId || '';
    f.elements.active.checked = !!c.active;
    $('#cp-title').textContent = 'Editar cupom';
    $('#cp-reset').hidden = false;
    f.scrollIntoView();
  };
  actions['cp-toggle'] = async (el) => {
    const c = state.coupons.find((x) => x.id === el.dataset.id);
    if (!c) return;
    try { await db.collection('coupons').doc(c.id).update({ active: !c.active }); } catch (e) { adminErr(e); }
  };
  actions['cp-del'] = async (el) => {
    if (!confirm('Excluir este cupom?')) return;
    try { await db.collection('coupons').doc(el.dataset.id).delete(); toast('Cupom excluído.'); } catch (e) { adminErr(e); }
  };
  forms['coupon-save'] = async (f) => {
    const d = new FormData(f);
    const code = String(d.get('code')).trim().toUpperCase();
    const percent = parseInt(d.get('percent'), 10);
    const max = Math.max(0, parseInt(d.get('max'), 10) || 0);
    const scope = d.get('scope');
    const categoryId = scope === 'categoria' ? String(d.get('categoryId') || '') : '';
    const err = (m) => setMsg('#cp-msg', m, 'error');
    if (!/^[A-Z0-9_-]{2,30}$/.test(code)) return err('O código deve ter de 2 a 30 caracteres, apenas letras, números, hífen ou sublinhado.');
    if (!(percent >= 1 && percent <= 100)) return err('O percentual deve ficar entre 1% e 100%.');
    if (scope === 'categoria' && !categoryId) return err('Selecione a categoria do cupom.');
    try {
      await db.collection('coupons').doc(code).set({ code, percent, maxUsesPerUser: max, scope, categoryId, active: !!d.get('active') });
      resetCouponForm();
      toast('Cupom salvo.');
    } catch (e) { adminErr(e); }
  };

  /* ----- Pedidos ----- */
  function renderOrdersTab(body) {
    body.innerHTML = '<div class="panel"><h3>Pedidos recebidos</h3><div id="ao-list"></div></div>';
    renderOrderList();
  }
  function renderOrderList() {
    const box = $('#ao-list');
    if (!box) return;
    if (!state.orders.length) { box.innerHTML = '<p class="muted">Nenhum pedido recebido.</p>'; return; }
    box.innerHTML = state.orders.map((o) => {
      const dt = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleString('pt-BR') : 'Registrando...';
      const a = o.address || {}, c = o.customer || {};
      return `<div class="order">
        <div class="order-head"><strong>Pedido ${esc(o.id.slice(0, 8).toUpperCase())}</strong><span class="muted small">${esc(dt)}</span></div>
        <div class="small">${esc(c.name)} / ${esc(c.email)} / ${esc(c.phone)}</div>
        <ul>${(o.items || []).map((i) => `<li>${esc(i.qty)}x ${esc(i.name)} (COR: ${esc(i.color)}, TAM: ${esc(i.size)}) ${brl(i.unitPrice * i.qty)}</li>`).join('')}</ul>
        <div class="small">Entrega: ${esc(a.street)}, ${esc(a.number)}${a.complement ? ' ' + esc(a.complement) : ''}, ${esc(a.district)}, ${esc(a.city)}/${esc(a.uf)}, CEP ${esc(a.cep)}</div>
        <div class="small">Frete: ${esc(o.shippingLabel)} (${brl(o.shipping)}) / Cupom: ${o.coupon ? esc(o.coupon) + ' (-' + brl(o.discount) + ')' : 'nenhum'}</div>
        <div class="sum-row total"><span>Total</span><span>${brl(o.total)}</span></div>
        <div class="field" style="margin:8px 0 0"><label for="st-${esc(o.id)}">Status</label>
          <select id="st-${esc(o.id)}" data-in="order-status" data-id="${esc(o.id)}">${STATUSES.map((s) => `<option ${s === o.status ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      </div>`;
    }).join('');
  }
  inputs['order-status'] = async (el) => {
    try { await db.collection('orders').doc(el.dataset.id).update({ status: el.value }); toast('Status atualizado.'); } catch (e) { adminErr(e); }
  };

  /* ----- Frete e meta ----- */
  let tiersDraft = [];
  function renderShippingTab(body) {
    tiersDraft = state.settings.shippingTiers.map((t) => ({ label: t.label, price: t.price }));
    body.innerHTML = `
      <form class="panel" data-form="shipping" novalidate>
        <h3>Meta de frete grátis</h3>
        <div class="field"><label for="sh-th">Valor mínimo do pedido, já com desconto (R$). Use 0 para desativar.</label><input id="sh-th" name="threshold" inputmode="decimal" value="${esc(fmtInput(state.settings.freeShippingThreshold))}" placeholder="299,00"></div>
        <h3 style="margin-top:20px">Faixas de envio</h3>
        <p class="muted small">Cada faixa pode representar uma distância em KM ou uma região atendida.</p>
        <div id="tiers"></div>
        <button type="button" class="btn btn-ghost btn-sm" data-act="tier-add">Adicionar faixa</button>
        <div id="sh-msg" class="msg" role="alert" style="margin-top:12px"></div>
        <button type="submit" class="btn btn-block">Salvar configurações</button>
      </form>`;
    renderTiers();
  }
  function renderTiers() {
    const box = $('#tiers');
    if (!box) return;
    box.innerHTML = tiersDraft.length ? tiersDraft.map((t, i) => `
      <div class="row-item">
        <input class="inline-input row-grow" data-in="tier-label" data-i="${i}" value="${esc(t.label)}" placeholder="Ex: Até 5 km" aria-label="Descrição da faixa">
        <input class="inline-input" style="width:110px" data-in="tier-price" data-i="${i}" inputmode="decimal" value="${esc(fmtInput(t.price))}" placeholder="10,00" aria-label="Valor do frete">
        <button type="button" class="icon-btn" data-act="tier-rm" data-i="${i}" aria-label="Remover faixa">${icon('trash', 18)}</button>
      </div>`).join('') : '<p class="muted small">Nenhuma faixa cadastrada.</p>';
  }
  inputs['tier-label'] = (el) => { tiersDraft[Number(el.dataset.i)].label = el.value; };
  inputs['tier-price'] = (el) => { tiersDraft[Number(el.dataset.i)].price = parseBRL(el.value); };
  actions['tier-add'] = () => { tiersDraft.push({ label: '', price: 0 }); renderTiers(); };
  actions['tier-rm'] = (el) => { tiersDraft.splice(Number(el.dataset.i), 1); renderTiers(); };
  forms.shipping = async (f) => {
    const threshold = parseBRL(new FormData(f).get('threshold'));
    const tiers = tiersDraft.map((t) => ({ label: String(t.label).trim(), price: round2(t.price) }));
    if (tiers.some((t) => !t.label)) return setMsg('#sh-msg', 'Preencha a descrição de todas as faixas.', 'error');
    try {
      await db.collection('settings').doc('store').set({ freeShippingThreshold: threshold, shippingTiers: tiers }, { merge: true });
      setMsg('#sh-msg', 'Configurações salvas.', 'ok');
    } catch (e) { adminErr(e); }
  };

  /* =====================================================================
     14. INICIALIZAÇÃO
     ===================================================================== */
  function startApp() {
    $$('[data-bind]').forEach((el) => { el.innerHTML = icon(el.dataset.bind.replace('icon-', ''), 20); });
    updateHeader();
    listen();
    route();
  }

  initGate();
})();