/* ARENA - SPA. Conectado ao projeto Firebase: usearena */
const firebaseConfig = {
  apiKey: "AIzaSyBZr77j1XGDv-gFzIGMO9chYCs1tIdbuZk",
  authDomain: "usearena.firebaseapp.com",
  projectId: "usearena",
  storageBucket: "usearena.firebasestorage.app",
  messagingSenderId: "447960377158",
  appId: "1:447960377158:web:8b225baa00aaf14d2e6747"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(), db = firebase.firestore(), FV = firebase.firestore.FieldValue;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const money = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = { products: [], cats: [], user: null, isAdmin: false, authReady: false, q: '', cat: '', sex: '', cart: JSON.parse(localStorage.getItem('arena_cart') || '[]'), coupon: null, settings: { freeShipping: 300, shipping: 25 }, pending: null, sel: {} };
const price = p => p.promo && p.promo < p.price ? p.promo : p.price;
const pct = p => p.promo && p.promo < p.price ? Math.round((1 - p.promo / p.price) * 100) : 0;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200) };
const saveCart = () => { localStorage.setItem('arena_cart', JSON.stringify(S.cart)); renderCart() };

/* Porta de entrada */
const gate = $('#gate');
if (localStorage.getItem('arena_terms') !== 'ok') { requestAnimationFrame(() => gate.classList.add('on')); document.body.style.overflow = 'hidden' }
const gt = $('#gateText'); gt.addEventListener('scroll', () => { if (gt.scrollTop + gt.clientHeight >= gt.scrollHeight - 4) $('#gateCheck').disabled = false });
$('#gateCheck').onchange = e => $('#gateBtn').disabled = !e.target.checked;
$('#gateBtn').onclick = () => { localStorage.setItem('arena_terms', 'ok'); gate.classList.remove('on'); document.body.style.overflow = '' };

/* Resiliência */
const mask = e => String(e || '').replace(/(.).+(@.+)/, '$1***$2');
const fail = e => { console.error(e); S.err = 'Não foi possível carregar a loja. Verifique sua conexão e tente novamente.'; route() };
window.addEventListener('offline', () => toast('Você está sem conexão'));
window.addEventListener('online', () => { toast('Conexão restabelecida'); S.err = '' });
window.addEventListener('unhandledrejection', e => toast('Erro: ' + (e.reason && e.reason.message || 'falha na operação')));

/* Dados em tempo real */
db.collection('products').onSnapshot(s => { S.products = s.docs.map(d => ({ id: d.id, ...d.data() })); S.err = ''; route() }, fail);
db.collection('categories').onSnapshot(s => { S.cats = s.docs.map(d => ({ id: d.id, ...d.data() })); route() }, fail);
db.doc('settings/store').onSnapshot(d => { if (d.exists) S.settings = { ...S.settings, ...d.data() }; renderCart() });

/* Auth & Validação de Lojista (Apenas Login) */
auth.onAuthStateChanged(async u => {
  S.user = u;
  S.isAdmin = false;
  S.authReady = false;
  if (u) {
    try {
      S.isAdmin = (await db.doc('admins/' + u.uid).get()).exists;
    } catch { }
  }
  $('#accBtn').textContent = u ? (u.displayName || 'Minha conta') : 'Entrar';
  $('#adminLink').hidden = !S.isAdmin;
  if (u && S.pending) { const f = S.pending; S.pending = null; closeAll(); f() }
  S.authReady = true;
  route();
});

const openAuth = () => { 
  $('#aErr').textContent = ''; 
  $('#auth').classList.add('on'); 
  $('#logoutBtn').hidden = !S.user; 
  $('#authForm').hidden = !!S.user; 
};
$('#accBtn').onclick = openAuth;

/* Somente login: contas são criadas previamente no Firebase Authentication (console) */
$('#authForm').onsubmit = async e => {
  e.preventDefault(); 
  $('#aErr').textContent = ''; 
  const btn = $('#aSubmit'); 
  btn.disabled = true;
  try {
    await auth.signInWithEmailAndPassword($('#aEmail').value.trim(), $('#aPass').value);
    $('#aPass').value = ''; 
    $('#auth').classList.remove('on');
  } catch (x) {
    $('#aErr').textContent = ({
      'auth/network-request-failed': 'Sem conexão. Tente novamente.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.'
    })[x.code] || 'E-mail ou senha incorretos.';
  } finally {
    btn.disabled = false;
  }
};
$('#logoutBtn').onclick = () => { auth.signOut(); $('#auth').classList.remove('on') };

/* Overlay / drawer */
const closeAll = () => { $('#drawer').classList.remove('on'); $('#overlay').classList.remove('on'); $('#auth').classList.remove('on') };
$$('[data-close]').forEach(b => b.onclick = closeAll); $('#overlay').onclick = closeAll;
$('#auth').onclick = e => { if (e.target.id === 'auth') closeAll() };
const openCart = () => { $('#drawer').classList.add('on'); $('#overlay').classList.add('on') };
$('#cartBtn').onclick = openCart;

/* Router com Blindagem Silenciosa */
$('#search').oninput = e => { S.q = e.target.value.toLowerCase(); if (location.hash) location.hash = ''; else route() };
window.onhashchange = route;

function leaveAdmin() {
  history.replaceState(null, '', location.pathname + location.search);
  renderHome($('#app'));
}

function route() {
  const h = location.hash;
  const app = $('#app');
  if (h === '#admin') {
    if (!S.authReady) { app.innerHTML = ''; return; }
    if (!S.isAdmin) return leaveAdmin();
    return renderAdmin(app);
  }
  if (h.startsWith('#produto/')) return renderPDP(app, h.split('/')[1]);
  renderHome(app);
}

function cardHTML(p, i) {
  const d = pct(p);
  return `<article class="card" style="animation-delay:${Math.min(i, 10) * 40}ms">${d ? `<span class="tag">-${d}%</span>` : ''}
<a href="#produto/${p.id}">${p.image ? `<img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}">` : '<div class="ph"></div>'}</a>
<div class="cb"><h3>${esc(p.name)}</h3><div>${d ? `<span class="old">${money(p.price)}</span>` : ''}<span class="now">${money(price(p))}</span></div>
<a class="btn" style="display:block;text-align:center" href="#produto/${p.id}">Ver detalhes</a></div></article>`;
}

function renderHome(app) {
  let list = S.products.filter(p => (!S.cat || p.category === S.cat) && (!S.sex || p.sex === S.sex) && (!S.q || (p.name + ' ' + (p.desc || '')).toLowerCase().includes(S.q)));
  list.sort((a, b) => (pct(b) > 0) - (pct(a) > 0));
  app.innerHTML = `${S.err ? `<div class="alert" role="alert">${esc(S.err)}</div>` : ''}<section class="hero"><h1>Treine com o que veste.</h1><p>Roupas e calçados esportivos para quem leva o treino a sério.</p></section>
 <div class="cats">${S.cats.map(c => `<button class="cat ${S.cat === c.name ? 'on' : ''}" data-cat="${esc(c.name)}">${esc(c.name)}</button>`).join('')}</div>
 <div class="sexes">${['MASCULINO', 'FEMININO', 'UNISSEX'].map(s => `<button class="sx ${S.sex === s ? 'on' : ''}" data-sex="${s}">${s}</button>`).join('')}</div>
 <div class="grid">${list.map(cardHTML).join('') || '<p class="mut">Nenhum produto encontrado. Tente outra busca ou filtro.</p>'}</div>`;
  $$('[data-cat]').forEach(b => b.onclick = () => { S.cat = S.cat === b.dataset.cat ? '' : b.dataset.cat; renderHome(app) });
  $$('[data-sex]').forEach(b => b.onclick = () => { S.sex = S.sex === b.dataset.sex ? '' : b.dataset.sex; renderHome(app) });
}

function renderPDP(app, id) {
  const p = S.products.find(x => x.id === id);
  if (!p) { app.innerHTML = '<p class="mut">Carregando produto…</p>'; return }
  const v = p.variants || [], colors = [...new Set(v.map(x => x.color))], sel = S.sel[id] || (S.sel[id] = { color: colors[0] || '', size: '' });
  const sizes = v.filter(x => x.color === sel.color); const d = pct(p);
  const rel = S.products.filter(x => x.id !== id && x.category === p.category).slice(0, 4);
  app.innerHTML = `<div class="pdp"><div>${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : '<div class="ph"></div>'}</div><div>
 <a class="ghost" href="#">Voltar à vitrine</a><h1>${esc(p.name)}</h1>
 <p>${d ? `<span class="old">De ${money(p.price)}</span> <span class="now" style="font-size:1.6rem">por ${money(p.promo)}</span> <span class="tag" style="position:static">-${d}%</span>` : `<span class="now" style="font-size:1.6rem">${money(p.price)}</span>`}</p>
 <p class="mut">${esc(p.desc)}</p><p class="mut">${esc(p.material)}</p>
 <strong>Cor</strong><div class="opts">${colors.map(c => `<button class="opt ${c === sel.color ? 'on' : ''}" data-color="${esc(c)}">${esc(c)}</button>`).join('')}</div>
 <strong>Tamanho</strong><div class="opts">${sizes.map(x => `<button class="opt ${x.size === sel.size ? 'on' : ''}" data-size="${esc(x.size)}" ${x.stock <= 0 ? 'disabled' : ''}>${esc(x.size)}</button>`).join('')}</div>
 <p id="stockMsg" class="mut"></p><div class="row"><button class="btn alt" id="addBtn">Adicionar ao carrinho</button><button class="btn" id="buyBtn">Comprar agora</button></div></div></div>
 ${rel.length ? `<h2 class="sec">Você também pode gostar</h2><div class="grid">${rel.map(cardHTML).join('')}</div>` : ''}`;
  $$('[data-color]').forEach(b => b.onclick = () => { sel.color = b.dataset.color; sel.size = ''; renderPDP(app, id) });
  $$('[data-size]').forEach(b => b.onclick = () => { sel.size = b.dataset.size; renderPDP(app, id) });
  if (sel.size) { const x = v.find(y => y.color === sel.color && y.size === sel.size); $('#stockMsg').textContent = x ? `${x.stock} em estoque` : '' }
  const add = () => {
    if (!sel.size) { toast('Escolha um tamanho'); return false }
    const x = v.find(y => y.color === sel.color && y.size === sel.size), k = id + '|' + sel.color + '|' + sel.size, it = S.cart.find(c => c.key === k), n = (it?.qty || 0) + 1;
    if (!x || n > x.stock) { toast('Estoque insuficiente'); return false }
    it ? it.qty = n : S.cart.push({ key: k, id, color: sel.color, size: sel.size, qty: 1 }); saveCart(); return true
  };
  $('#addBtn').onclick = () => { if (add()) { const ab = $('#addBtn'); ab.classList.remove('pulse'); void ab.offsetWidth; ab.classList.add('pulse'); const c = $('#cartCount'); c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse'); openCart() } };
  $('#buyBtn').onclick = () => { if (!add()) return; openCart(); checkout() };
}

/* Carrinho */
const line = c => { const p = S.products.find(x => x.id === c.id); return p ? { ...c, p, total: price(p) * c.qty } : null };
function calc() {
  const ls = S.cart.map(line).filter(Boolean); const sub = ls.reduce((a, l) => a + l.total, 0); let disc = 0, warn = '';
  const k = S.coupon; if (k) {
    const base = k.type === 'category' ? ls.filter(l => l.p.category === k.category).reduce((a, l) => a + l.total, 0) : sub;
    if (base > 0) disc = base * k.percent / 100; else warn = 'Não há produtos no carrinho que se apliquem ao cupom'
  }
  const fs = S.settings.freeShipping, ship = !ls.length || sub - disc >= fs ? 0 : (S.shipQuote ? S.shipQuote.value : S.settings.shipping);
  return { ls, sub, disc, warn, ship, total: sub - disc + ship }
}
function renderCart() {
  const c = calc(), n = S.cart.reduce((a, x) => a + x.qty, 0); $('#cartCount').textContent = n;
  const fs = S.settings.freeShipping, left = Math.max(0, fs - (c.sub - c.disc));
  $('#cartBody').innerHTML = !c.ls.length ? '<p class="mut">Seu carrinho está vazio.</p>' : `
 <small>${left ? `Faltam ${money(left)} para frete grátis` : 'Você ganhou frete grátis'}</small><div class="bar"><i style="width:${Math.min(100, (c.sub - c.disc) / fs * 100)}%"></i></div>
 ${c.ls.map(l => `<div class="item">${l.p.image ? `<img src="${esc(l.p.image)}" alt="">` : ''}<div class="i"><strong>${esc(l.p.name)}</strong><br><span class="mut">${esc(l.color)} / ${esc(l.size)}</span><div class="qty"><button data-q="${l.key}|-1" aria-label="Menos">-</button>${l.qty}<button data-q="${l.key}|1" aria-label="Mais">+</button></div></div><strong>${money(l.total)}</strong></div>`).join('')}
 <div class="cpn"><input id="cepIn" placeholder="CEP" inputmode="numeric" maxlength="9" value="${esc(S.shipQuote ? S.shipQuote.cep : '')}"><button class="btn alt" id="cepBtn">Calcular frete</button></div><small class="mut">${S.shipQuote ? esc(S.shipQuote.label) : ''}</small>
 <div class="cpn"><input id="cpnIn" placeholder="Cupom" value="${esc(S.coupon?.code || '')}"><button class="btn alt" id="cpnBtn">Aplicar</button></div>
 <p class="err">${esc(c.warn)}</p>
 <div class="sum"><div><span>Subtotal</span><span>${money(c.sub)}</span></div>${c.disc ? `<div><span>Desconto</span><span>-${money(c.disc)}</span></div>` : ''}<div><span>Frete</span><span>${c.ship ? money(c.ship) : 'Grátis'}</span></div><div class="tot"><span>Total</span><span>${money(c.total)}</span></div></div>
 <button class="btn" style="width:100%;margin-top:12px" id="coBtn">Finalizar compra</button>`;
  $$('[data-q]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.q.split('|'); const it = S.cart.find(x => x.key === k); it.qty += +d; if (it.qty <= 0) S.cart = S.cart.filter(x => x !== it); saveCart() });
  const cb = $('#cpnBtn'); if (cb) cb.onclick = applyCoupon; const eb = $('#cepBtn'); if (eb) eb.onclick = quoteCEP; const co = $('#coBtn'); if (co) co.onclick = checkout;
}
async function quoteCEP() {
  const cep = $('#cepIn').value.replace(/\D/g, ''); if (cep.length !== 8) return toast('Digite um CEP com 8 números');
  try {
    const r = await fetch('https://viacep.com.br/ws/' + cep + '/json/'); const d = await r.json(); if (d.erro) return toast('CEP não encontrado');
    const tbl = {}; (S.settings.shippingUF || '').split(',').forEach(x => { const [u, v] = x.split(':'); if (u && v) tbl[u.trim().toUpperCase()] = +v });
    const value = tbl[d.uf] !== undefined ? tbl[d.uf] : S.settings.shipping;
    S.shipQuote = { cep: cep.replace(/(\d{5})(\d{3})/, '$1-$2'), value, label: `${d.localidade}/${d.uf}: ${value ? money(value) : 'frete grátis'}` }; renderCart()
  } catch (e) { toast('Não foi possível consultar o CEP agora') }
}
async function applyCoupon() {
  const code = $('#cpnIn').value.trim().toUpperCase(); if (!code) { S.coupon = null; return renderCart() }
  try {
    const d = await db.doc('coupons/' + code).get(); if (!d.exists || d.data().active === false) { S.coupon = null; toast('Cupom inválido'); return renderCart() }
    const k = { code, ...d.data() };
    if (S.user && k.maxUsesPerUser) { const u = await db.doc('users/' + S.user.uid).get(); const used = ((u.data() || {}).couponUses || {})[code] || 0; if (used >= k.maxUsesPerUser) { S.coupon = null; toast('Você já usou este cupom o máximo de vezes'); return renderCart() } }
    S.coupon = k; toast('Cupom aplicado'); renderCart()
  } catch (e) { toast('Não foi possível validar o cupom') }
}

/* Checkout: pedido + cupom + baixa de estoque em uma transação */
async function checkout() {
  if (!S.user) { S.pending = checkout; closeAll(); openAuth(); return }
  const c = calc(); if (!c.ls.length) return; const btn = $('#coBtn'); if (btn) btn.disabled = true;
  try {
    await db.runTransaction(async tx => {
      const refs = [...new Set(c.ls.map(l => l.id))].map(id => db.doc('products/' + id)), snaps = await Promise.all(refs.map(r => tx.get(r)));
      const data = {}; snaps.forEach((s, i) => data[refs[i].id] = s.data());
      let used = 0, cref = null; if (S.coupon) { cref = db.doc('users/' + S.user.uid); const cu = await tx.get(cref); used = ((cu.data() || {}).couponUses || {})[S.coupon.code] || 0; if (S.coupon.maxUsesPerUser && used >= S.coupon.maxUsesPerUser) throw new Error('Limite de uso do cupom atingido.') }
      c.ls.forEach(l => { const v = data[l.id].variants.find(x => x.color === l.color && x.size === l.size); if (!v || v.stock < l.qty) throw new Error(`Sem estoque: ${l.p.name} ${l.size}`); v.stock -= l.qty });
      refs.forEach(r => tx.update(r, { variants: data[r.id].variants }));
      if (cref) tx.set(cref, { couponUses: { [S.coupon.code]: used + 1 } }, { merge: true });
      tx.set(db.collection('orders').doc(), {
        uid: S.user.uid, email: S.user.email, name: S.user.displayName || '', status: 'Aguardando Pagamento', coupon: S.coupon?.code || null, subtotal: c.sub, discount: c.disc, shipping: c.ship, total: c.total,
        items: c.ls.map(l => ({ id: l.id, name: l.p.name, color: l.color, size: l.size, qty: l.qty, unit: price(l.p) })), createdAt: FV.serverTimestamp()
      })
    });
    S.cart = []; S.coupon = null; saveCart(); closeAll(); toast('Pedido registrado. Aguardando pagamento.')
  } catch (e) { toast(e.message || 'Erro ao finalizar'); if (btn) btn.disabled = false }
}

/* Admin (Acesso Exclusivo via Firestore admins/{uid}) */
async function renderAdmin(app) {
  if (!S.isAdmin) return leaveAdmin();
  let co, or;
  try {
    [co, or] = await Promise.all([db.collection('coupons').get(), db.collection('orders').orderBy('createdAt', 'desc').limit(30).get()]);
  } catch (e) {
    return leaveAdmin();
  }
  if (!S.isAdmin || location.hash !== '#admin') return;

  app.innerHTML = `<h1>Painel</h1>
 <div class="panel"><h3>Novo produto</h3><form id="pf"><input id="pn" placeholder="Nome" required><textarea id="pd" placeholder="Descrição"></textarea><input id="pm" placeholder="Malha e materiais">
 <div class="two"><input id="pp" type="number" step="0.01" placeholder="Preço" required><input id="ppr" type="number" step="0.01" placeholder="Preço promocional (opcional)"></div>
 <div class="two"><select id="pc" required><option value="">Categoria</option>${S.cats.map(c => `<option>${esc(c.name)}</option>`).join('')}</select><select id="ps"><option>UNISSEX</option><option>MASCULINO</option><option>FEMININO</option></select></div>
 <input id="pi" placeholder="URL da imagem"><input id="pcol" placeholder="Cores (separadas por vírgula)"><input id="psz" placeholder="Tamanhos (ex: P,M,G,GG ou 39,40)"><input id="pst" type="number" placeholder="Estoque por variação"><textarea id="pv" placeholder="Ou uma variação por linha: COR|TAMANHO|ESTOQUE (preenchido, tem prioridade)"></textarea>
 <button class="btn">Salvar produto</button></form></div>
 <div class="panel"><h3>Produtos</h3>${S.products.map(p => `<div class="li"><span>${esc(p.name)} - ${money(price(p))}</span><span><button class="ghost" data-edit="${p.id}">Editar</button><button class="ghost" data-promo="${p.id}">Promoção</button><button class="ghost" data-stock="${p.id}">Estoque</button><button class="ghost" data-del="${p.id}">Excluir</button></span></div>`).join('')}</div>
 <div class="panel"><h3>Categorias</h3><div class="two"><input id="cn" placeholder="Nova categoria"><button class="btn" id="cadd">Adicionar</button></div>${S.cats.map(c => `<div class="li">${esc(c.name)}<button class="ghost" data-delcat="${c.id}">Excluir</button></div>`).join('')}</div>
 <div class="panel"><h3>Cupons</h3><div class="two"><input id="kc" placeholder="Código"><input id="kp" type="number" placeholder="% de desconto"></div><div class="two"><select id="kt"><option value="cart">Desconto de Carrinho</option><option value="category">Categoria</option></select><input id="kcat" placeholder="Categoria (se restrito)"></div><input id="km" type="number" placeholder="Usos por conta"><button class="btn" id="kadd">Criar cupom</button>
 ${co.docs.map(d => `<div class="li">${esc(d.id)} - ${d.data().percent}%<button class="ghost" data-delk="${d.id}">Excluir</button></div>`).join('')}</div>
 <div class="panel"><h3>Frete</h3><div class="two"><input id="sf" type="number" placeholder="Frete grátis acima de" value="${S.settings.freeShipping}"><input id="ss" type="number" placeholder="Valor do frete" value="${S.settings.shipping}"></div><input id="su" placeholder="Frete por UF (ex: SP:15,RJ:20,CE:30)" value="${esc(S.settings.shippingUF || '')}"><button class="btn" id="sadd">Salvar frete</button></div>
 <div class="panel"><h3>Pedidos</h3>${or.docs.map(d => { const o = d.data(); return `<div class="li"><span>${esc(o.name || mask(o.email))} - ${money(o.total)}<br><small class="mut">${(o.items || []).map(i => `${i.qty}x ${esc(i.name)} ${esc(i.color)}/${esc(i.size)}`).join(', ')}</small></span><select data-ord="${d.id}">${['Aguardando Pagamento', 'Pago', 'Enviado', 'Entregue', 'Cancelado'].map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</div>` }).join('') || '<p class="mut">Nenhum pedido ainda.</p>'}</div>`;
 
  $('#pf').onsubmit = async e => {
    e.preventDefault(); const cols = $('#pcol').value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean), szs = $('#psz').value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean), st = +$('#pst').value;
    const pvv = $('#pv').value.trim(); const variants = pvv ? pvv.split('\n').map(l => { const [c, s, t] = l.split('|').map(x => x.trim()); return { color: (c || '').toUpperCase(), size: (s || '').toUpperCase(), stock: +t || 0 } }).filter(v => v.color && v.size) : cols.flatMap(color => szs.map(size => ({ color, size, stock: st }))); const pr = +$('#ppr').value || 0;
    const payload = ({ name: $('#pn').value, desc: $('#pd').value, material: $('#pm').value, price: +$('#pp').value, promo: pr, category: $('#pc').value, sex: $('#ps').value, image: $('#pi').value, variants, createdAt: FV.serverTimestamp() }); if (!variants.length) return toast('Informe cores, tamanhos e estoque'); if (S.editId) { delete payload.createdAt; await db.doc('products/' + S.editId).update(payload) } else await db.collection('products').add(payload); S.editId = null; toast('Produto salvo'); renderAdmin(app)
  };
  $$('[data-edit]').forEach(b => b.onclick = () => {
    const p = S.products.find(x => x.id === b.dataset.edit); S.editId = p.id;
    [['pn', p.name], ['pd', p.desc], ['pm', p.material], ['pp', p.price], ['ppr', p.promo || ''], ['pc', p.category], ['ps', p.sex], ['pi', p.image], ['pv', (p.variants || []).map(v => [v.color, v.size, v.stock].join('|')).join('\n')]].forEach(([i, v]) => { $('#' + i).value = v == null ? '' : v });
    $('#pf button').textContent = 'Atualizar produto'; $('#pf').scrollIntoView({ behavior: 'smooth' })
  });
  $$('[data-del]').forEach(b => b.onclick = async () => { if (confirm('Excluir produto?')) { await db.doc('products/' + b.dataset.del).delete() } });
  $$('[data-promo]').forEach(b => b.onclick = async () => { const v = prompt('Novo preço promocional (0 remove):'); if (v !== null) await db.doc('products/' + b.dataset.promo).update({ promo: +v || 0 }) });
  $$('[data-stock]').forEach(b => b.onclick = async () => { const v = prompt('Estoque de todas as variações:'); if (v !== null) { const p = S.products.find(x => x.id === b.dataset.stock); await db.doc('products/' + p.id).update({ variants: p.variants.map(x => ({ ...x, stock: +v || 0 })) }) } });
  $('#cadd').onclick = async () => { const n = $('#cn').value.trim().toUpperCase(); if (n) { await db.collection('categories').add({ name: n }); renderAdmin(app) } };
  $$('[data-delcat]').forEach(b => b.onclick = async () => { await db.doc('categories/'+b.dataset.delcat).delete(); renderAdmin(app) });
  $('#kadd').onclick = async () => { const code = $('#kc').value.trim().toUpperCase(); if (!code) return; await db.doc('coupons/' + code).set({ percent: +$('#kp').value, type: $('#kt').value, category: $('#kcat').value.trim().toUpperCase(), maxUsesPerUser: +$('#km').value || 0, active: true }); renderAdmin(app) };
  $$('[data-delk]').forEach(b => b.onclick = async () => { await db.doc('coupons/' + b.dataset.delk).delete(); renderAdmin(app) });
  $('#sadd').onclick = async () => { await db.doc('settings/store').set({ freeShipping: +$('#sf').value, shipping: +$('#ss').value, shippingUF: $('#su').value.trim() }); toast('Frete salvo') };
  $$('[data-ord]').forEach(s => s.onchange = () => db.doc('orders/'+s.dataset.ord).update({ status: s.value }).then(() => toast('Status atualizado')));
}
renderCart();