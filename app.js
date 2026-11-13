/* ---------- DADOS ---------- */
const U = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const PRODUTOS = [
 {id:'camisa-performance-pro-dry',nome:'Camisa Performance Pro Dry',preco:129.90,categorias:['Camisas','Masculino'],
  descricao:'Camiseta Dry-Fit em poliéster reciclado de 140 g/m² com acabamento que afasta o suor da pele e seca rápido. Costuras planas contra atrito, painéis de ventilação nas costas e proteção UV50+.',
  tamanhos:['P','M','G','GG'],cores:[{n:'Preto carvão',h:'#1e1e1e'},{n:'Cinza chumbo',h:'#4a4d50'},{n:'Cinza claro',h:'#c4c6c7'}],
  imagens:[U('photo-1571019613454-1cb2f99b2d8b'),U('photo-1541534741688-6078c6bfb5c5')]},
 {id:'camisa-compressao-manga-longa',nome:'Camisa de Compressão Manga Longa',preco:159.90,categorias:['Camisas','Masculino'],
  descricao:'Camisa de compressão graduada em poliamida com elastano, 4 vias de elasticidade e zonas de ventilação sob as axilas. Mantém a musculatura estabilizada em treinos intensos e em dias frios de corrida.',
  tamanhos:['P','M','G','GG'],cores:[{n:'Preto',h:'#1e1e1e'},{n:'Cinza grafite',h:'#3a3d3f'}],
  imagens:[U('photo-1576678927484-cc907957088c'),U('photo-1534438327276-14e5300c3a48')]},
 {id:'camisa-dry-fit-ultra-leve',nome:'Camisa Dry-Fit Ultra Leve',preco:119.90,categorias:['Camisas','Feminino'],
  descricao:'Camiseta feminina em malha microfuro de 120 g/m², caimento levemente solto, gola reforçada e etiqueta termocolada sem coceira. Ideal para corrida de rua, funcional e pilates.',
  tamanhos:['P','M','G','GG'],cores:[{n:'Off-white',h:'#ecebe6'},{n:'Cinza prata',h:'#b9bcbe'},{n:'Preto',h:'#1e1e1e'}],
  imagens:[U('photo-1594381898411-846e7d193883'),U('photo-1518611012118-696072aa579a')]},
 {id:'shorts-running-tech',nome:'Shorts Running Tech',preco:139.90,categorias:['Shorts','Masculino'],
  descricao:'Shorts de corrida em tactel leve com cós elástico e cordão interno, bolso embutido com zíper para chave e cartão, detalhes refletivos e entrepernas de 7 cm para total liberdade de passada.',
  tamanhos:['P','M','G','GG'],cores:[{n:'Preto',h:'#1e1e1e'},{n:'Cinza chumbo',h:'#4a4d50'}],
  imagens:[U('photo-1552674605-db6ffd4facb5'),U('photo-1483721310020-03333e577078')]},
 {id:'shorts-treino-flex',nome:'Shorts Treino Flex',preco:119.90,categorias:['Shorts','Masculino'],
  descricao:'Shorts de treino em malha elástica com secagem rápida, cós largo anatômico e bolsos laterais profundos. Corte até acima do joelho, indicado para musculação, funcional e treinos cruzados.',
  tamanhos:['P','M','G','GG'],cores:[{n:'Cinza concreto',h:'#8a8d8f'},{n:'Preto',h:'#1e1e1e'}],
  imagens:[U('photo-1599058945522-28d584b6f0ff'),U('photo-1581009146145-b5ef050c2e1e')]},
 {id:'shorts-legging-2-em-1-flex',nome:'Shorts Legging 2 em 1 Flex',preco:149.90,categorias:['Shorts','Feminino'],
  descricao:'Shorts com legging interna de compressão leve que evita assadura e desliza. Camada externa em tecido fluido, cós alto com bolso interno e secagem rápida. Dois itens em uma única peça.',
  tamanhos:['P','M','G','GG'],cores:[{n:'Preto',h:'#1e1e1e'},{n:'Cinza chumbo',h:'#4a4d50'}],
  imagens:[U('photo-1434596922112-19c563067271'),U('photo-1517836357463-d25dfeac3438')]},
 {id:'legging-sculpt-high-waist',nome:'Legging Sculpt High-Waist',preco:199.90,categorias:['Leggings','Feminino'],
  descricao:'Legging de alta sustentação em poliamida de 280 g/m² opaca, cintura alta com dupla camada, costura plana e compressão firme sem transparência no agachamento. Bolso lateral para celular.',
  tamanhos:['P','M','G','GG'],cores:[{n:'Preto',h:'#1e1e1e'},{n:'Cinza grafite',h:'#3a3d3f'}],
  imagens:[U('photo-1548690312-e3b507d8c110'),U('photo-1575052814086-f385e2e2ad1b')]},
 {id:'legging-seamless-power',nome:'Legging Seamless Power',preco:189.90,categorias:['Leggings','Feminino'],
  descricao:'Legging sem costura tecida em tecnologia seamless, com zonas de compressão nas coxas e abdômen, cós largo e elasticidade multidirecional. Excelente para treinos de força e aulas de alta intensidade.',
  tamanhos:['P','M','G','GG'],cores:[{n:'Cinza prata',h:'#9ea1a3'},{n:'Preto',h:'#1e1e1e'}],
  imagens:[U('photo-1571731956672-f2b94d7dd0cb'),U('photo-1530822847156-5df684ec5ee1')]},
 {id:'regata-oversized-training',nome:'Regata Oversized Training',preco:109.90,categorias:['Regatas','Masculino'],
  descricao:'Regata cavada de modelagem oversized em algodão com poliéster de 180 g/m², cava profunda que libera o ombro e a lateral, costas levemente alongadas e gola reforçada. Pensada para musculação.',
  tamanhos:['P','M','G','GG'],cores:[{n:'Off-white',h:'#ecebe6'},{n:'Preto',h:'#1e1e1e'},{n:'Cinza mescla',h:'#a5a7a8'}],
  imagens:[U('photo-1538805060514-97d9cc17730c'),U('photo-1593079831268-3381b0db4a77')]},
 {id:'regata-cavada-power-dry',nome:'Regata Cavada Power Dry',preco:99.90,categorias:['Regatas','Masculino'],
  descricao:'Regata cavada em poliéster Dry-Fit de 130 g/m² com malha respirável, acabamento sem etiqueta e recorte nas costas. Leve, seca rápido e acompanha todo o movimento nos treinos de peito e ombros.',
  tamanhos:['P','M','G','GG'],cores:[{n:'Cinza chumbo',h:'#4a4d50'},{n:'Preto',h:'#1e1e1e'}],
  imagens:[U('photo-1530822847156-5df684ec5ee1'),U('photo-1534438327276-14e5300c3a48')]}
];
const FILTROS=['Todos','Camisas','Shorts','Leggings','Regatas'];
const FRETE_GRATIS=399, FRETE=24.9;
const FB="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'%3E%3Crect width='4' height='5' fill='%23d9d9d5'/%3E%3C/svg%3E";

/* ---------- UTIL ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const brl=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const ic={
 search:'<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
 plus:'<svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M12 5v14M5 12h14"/></svg>',
 minus:'<svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M5 12h14"/></svg>',
 truck:'<svg class="i" viewBox="0 0 24 24"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
 swap:'<svg class="i" viewBox="0 0 24 24"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
 lock:'<svg class="i" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
 check:'<svg class="i" viewBox="0 0 24 24" style="width:28px;height:28px"><path d="M20 6 9 17l-5-5"/></svg>'
};
const img=(src,cls='',alt='')=>`<img src="${src}" alt="${alt}" class="${cls}" loading="lazy" onerror="this.onerror=null;this.src='${FB}'">`;
const find=id=>PRODUTOS.find(p=>p.id===id);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2200)}

/* ---------- ESTADO ---------- */
let cart=[];
try{cart=JSON.parse(localStorage.getItem('arena_cart')||'[]').filter(i=>find(i.id))}catch(e){cart=[]}
const view={cat:'Todos',q:''};
const CUPONS={ARENA10:{pct:.10}};
let coupon=null,cupomMsg='';
try{const c=localStorage.getItem('arena_coupon');if(c&&CUPONS[c])coupon={code:c,pct:CUPONS[c].pct}}catch(e){}
function save(){try{localStorage.setItem('arena_cart',JSON.stringify(cart))}catch(e){}}
const count=()=>cart.reduce((a,i)=>a+i.qty,0);
const subtotal=()=>cart.reduce((a,i)=>a+find(i.id).preco*i.qty,0);
const desconto=()=>coupon?+(subtotal()*coupon.pct).toFixed(2):0;
const base=()=>subtotal()-desconto();
const frete=()=>cart.length&&base()<FRETE_GRATIS?FRETE:0;

/* ---------- REVEAL ---------- */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.08});
const observe=()=>$$('.reveal:not(.in)').forEach(el=>io.observe(el));

/* ---------- VITRINE ---------- */
function filtrar(){
  const q=view.q.trim().toLowerCase();
  return PRODUTOS.filter(p=>(view.cat==='Todos'||p.categorias.includes(view.cat))&&(!q||(p.nome+' '+p.descricao+' '+p.categorias.join(' ')).toLowerCase().includes(q)));
}
function gridHTML(){
  const l=filtrar();
  if(!l.length)return `<div class="empty"><p>Nenhuma peça encontrada para esta busca.</p><button class="btn ghost" data-reset>Limpar filtros</button></div>`;
  return l.map((p,i)=>`<a class="card reveal" style="transition-delay:${(i%4)*50}ms" href="#produto/${p.id}">
    <div class="ph">${img(p.imagens[0],'a',p.nome)}${img(p.imagens[1]||p.imagens[0],'b','')}<span class="quick">Ver detalhes</span></div>
    <h3>${p.nome}</h3>
    <div class="meta"><span>${brl(p.preco)}</span><span class="dots">${p.cores.map(c=>`<i class="dot" title="${c.n}" style="background:${c.h}"></i>`).join('')}</span></div></a>`).join('');
}
function renderHome(){
  $('#app').innerHTML=`
  <section class="hero"><div class="wrap">
    <div><h1>Feita para o treino.</h1>
    <p>Camisas Dry-Fit e de compressão, shorts de corrida, leggings de alta sustentação e regatas cavadas. Tecidos técnicos de secagem rápida, linhas masculina e feminina.</p>
    <div class="acts"><a href="#colecao" class="btn lime" data-scroll>Ver coleção</a><a href="#termos" class="btn ghost">Trocas e entregas</a></div></div>
    <div class="img">${img(U('photo-1571019613454-1cb2f99b2d8b'),'','Treino com roupas esportivas Arena')}</div>
  </div></section>
  <section class="perks"><div class="wrap">
    <div class="perk">${ic.truck}<div><b>Frete grátis acima de R$ 399</b><small>Entrega para todo o Brasil</small></div></div>
    <div class="perk">${ic.swap}<div><b>Troca em até 30 dias</b><small>Sem custo na primeira troca</small></div></div>
    <div class="perk">${ic.lock}<div><b>Compra protegida</b><small>Pix, cartão ou boleto</small></div></div>
  </div></section>
  <section class="section" id="colecao"><div class="wrap">
    <div class="head"><h2 class="t">Coleção</h2></div>
    <div class="tools">
      <div class="chips" role="group" aria-label="Filtros">${FILTROS.map(f=>`<button class="chip${f===view.cat?' on':''}" data-f="${f}">${f}</button>`).join('')}</div>
      <label class="search">${ic.search}<input id="q" type="search" placeholder="Buscar peça" value="${view.q}" aria-label="Buscar peça"></label>
    </div>
    <div class="grid" id="grid">${gridHTML()}</div>
  </div></section>`;
  observe();
}
function refreshGrid(){
  $('#grid').innerHTML=gridHTML();
  $$('.chip').forEach(c=>c.classList.toggle('on',c.dataset.f===view.cat));
  observe();
}

/* ---------- PRODUTO ---------- */
function renderProduct(id){
  const p=find(id);
  if(!p){location.hash='#vitrine';return}
  let tam=null,cor=0,foto=0;
  $('#app').innerHTML=`<div class="wrap">
  <div class="crumbs"><a href="#vitrine">Coleção</a> / ${p.nome}</div>
  <div class="pdp">
    <div class="gal"><div class="main" id="main">${img(p.imagens[0],'',p.nome)}</div>
      <div class="thumbs">${p.imagens.map((s,i)=>`<button class="${i?'':'on'}" data-t="${i}" aria-label="Foto ${i+1}">${img(s,'','')}</button>`).join('')}</div></div>
    <div class="info">
      <h1>${p.nome}</h1>
      <div class="price">${brl(p.preco)}</div>
      <div class="parc">ou 3x de ${brl(p.preco/3)} sem juros</div>
      <div class="parc">${demo.stock[p.id]>0?(demo.stock[p.id]<=5?'Restam '+demo.stock[p.id]+' unidades':'Em estoque'):'Esgotado'}</div>
      <p class="desc">${p.descricao}</p>
      <div class="lbl">Cor <span id="corn">${p.cores[0].n}</span></div>
      <div class="opts">${p.cores.map((c,i)=>`<button class="sw${i?'':' on'}" data-c="${i}" style="background:${c.h}" aria-label="${c.n}"></button>`).join('')}</div>
      <div class="lbl">Tamanho</div>
      <div class="opts">${p.tamanhos.map(t=>`<button class="size" data-s="${t}">${t}</button>`).join('')}</div>
      <div class="err" id="err" role="alert"></div>
      <button class="btn full" id="add" style="margin-top:6px">Adicionar ao carrinho</button>
      <div class="det"><div>${ic.truck}Frete grátis acima de R$ 399</div><div>${ic.swap}Troca em até 30 dias</div></div>
    </div></div></div>`;
  const root=$('#app');
  root.onclick=e=>{
    const t=e.target.closest('button');if(!t)return;
    if(t.dataset.s){tam=t.dataset.s;$$('.size').forEach(b=>b.classList.toggle('on',b===t));$('#err').textContent=''}
    if(t.dataset.c!==undefined){cor=+t.dataset.c;$$('.sw').forEach(b=>b.classList.toggle('on',b===t));$('#corn').textContent=p.cores[cor].n}
    if(t.dataset.t!==undefined){foto=+t.dataset.t;$('#main').innerHTML=img(p.imagens[foto],'',p.nome);$$('.thumbs button').forEach(b=>b.classList.toggle('on',b===t))}
    if(t.id==='add'){
      if(!tam){$('#err').textContent='Selecione um tamanho para continuar.';return}
      if(addItem(p.id,tam,p.cores[cor].n))openCart();
    }
  };
}

/* ---------- CARRINHO ---------- */
function addItem(id,size,color){
  if(disponivel(id)<1){toast('Sem estoque suficiente para este produto');return false}
  const it=cart.find(i=>i.id===id&&i.size===size&&i.color===color);
  if(it)it.qty++;else cart.push({id,size,color,qty:1});
  save();updateCart();return true;
}
function updateCart(){
  const n=count(),b=$('#badge');b.textContent=n;b.classList.toggle('on',n>0);
  const db=$('#db'),df=$('#df');
  if(!cart.length){
    db.innerHTML=`<div class="dempty"><p>Seu carrinho está vazio.</p><button class="btn" data-go>Ver coleção</button></div>`;df.innerHTML='';df.style.display='none';return;
  }
  df.style.display='';
  db.innerHTML=cart.map((i,k)=>{const p=find(i.id);return `<div class="line">${img(p.imagens[0],'',p.nome)}
    <div><h4>${p.nome}</h4><small>${i.color} / ${i.size}</small>
    <div class="lr"><div class="qty"><button data-q="${k}" data-d="-1" aria-label="Diminuir">${ic.minus}</button><span>${i.qty}</span><button data-q="${k}" data-d="1" aria-label="Aumentar">${ic.plus}</button></div><b>${brl(p.preco*i.qty)}</b></div>
    <button class="rm" data-r="${k}">Remover</button></div></div>`}).join('');
  const s=subtotal(),d=desconto(),f=frete(),bs=s-d,falta=Math.max(0,FRETE_GRATIS-bs);
  df.innerHTML=`<div class="free">${falta>0?`Faltam ${brl(falta)} para frete grátis`:'Você ganhou frete grátis'}<div class="prog"><i style="width:${Math.min(100,bs/FRETE_GRATIS*100)}%"></i></div></div>
    ${coupon?`<div class="cp-on"><span>Cupom <b>${coupon.code}</b> aplicado (${Math.round(coupon.pct*100)}%)</span><button data-cupom-rm>Remover</button></div>`:`<div class="cupom"><input id="cupom" placeholder="Cupom de desconto" autocomplete="off" aria-label="Cupom de desconto"><button class="btn ghost" data-cupom>Aplicar</button></div><div class="cp-msg" role="alert">${cupomMsg||'Teste o cupom ARENA10'}</div>`}
    <div class="row"><span>Subtotal</span><span>${brl(s)}</span></div>
    ${d?`<div class="row"><span>Desconto</span><span>-${brl(d)}</span></div>`:''}
    <div class="row"><span>Frete</span><span>${f?brl(f):'Grátis'}</span></div>
    <div class="row tot"><span>Total</span><span>${brl(bs+f)}</span></div>
    <button class="btn full" data-checkout style="margin-top:14px">Finalizar compra</button>`;
}
let lastFocus=null;
function openCart(){lastFocus=document.activeElement;updateCart();$('#drawer').classList.add('on');$('#ov').classList.add('on');$('#drawer').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>$('#closeCart').focus(),50)}
function closeCart(){$('#drawer').classList.remove('on');$('#ov').classList.remove('on');$('#drawer').setAttribute('aria-hidden','true');document.body.style.overflow='';if(location.hash==='#carrinho')history.replaceState(null,'','#vitrine');if(lastFocus)lastFocus.focus()}

/* ---------- CHECKOUT ---------- */
function renderCheckout(){
  if(!cart.length){location.hash='#vitrine';return}
  const s=subtotal(),dc=desconto(),f=frete();
  $('#app').innerHTML=`<div class="wrap"><div class="crumbs"><a href="#vitrine">Coleção</a> / Finalizar compra</div>
  <div class="co">
   <form id="form" novalidate>
    <fieldset><legend>Contato</legend><div class="f">
      <label class="fl w">Nome completo<input name="nome" required autocomplete="name" placeholder=" "></label>
      <label class="fl">E-mail<input name="email" type="email" required autocomplete="email" placeholder=" "></label>
      <label class="fl">Telefone<input name="tel" type="tel" required minlength="10" autocomplete="tel" placeholder=" "></label></div></fieldset>
    <fieldset><legend>Entrega</legend><div class="f">
      <label class="fl">CEP<input name="cep" required pattern="\\d{5}-?\\d{3}" inputmode="numeric" autocomplete="postal-code" placeholder=" "></label>
      <label class="fl">Número<input name="num" required placeholder=" "></label>
      <label class="fl w">Endereço<input name="end" required autocomplete="street-address" placeholder=" "></label>
      <label class="fl">Cidade<input name="cid" required autocomplete="address-level2" placeholder=" "></label>
      <label class="fl">Estado<input name="uf" required maxlength="2" autocomplete="address-level1" placeholder=" "></label></div></fieldset>
    <fieldset><legend>Pagamento</legend><div class="pay">
      <label><input type="radio" name="pg" value="pix" checked>Pix, 5% de desconto</label>
      <label><input type="radio" name="pg" value="cartao">Cartão de crédito, até 3x sem juros</label>
      <label><input type="radio" name="pg" value="boleto">Boleto bancário</label></div>
      <div class="f" id="card" style="margin-top:14px;display:none">
        <label class="fl w">Número do cartão<input name="cn" inputmode="numeric" placeholder=" "></label>
        <label class="fl">Validade<input name="cv" placeholder="MM/AA"></label>
        <label class="fl">CVV<input name="cc" inputmode="numeric" maxlength="4" placeholder=" "></label></div>
      <p class="note">Ambiente de demonstração: nenhum pagamento é processado e nenhum dado é enviado.</p></fieldset>
    <div class="err" id="err" role="alert"></div>
    <button class="btn full" type="submit">Confirmar pedido</button>
   </form>
   <aside class="sum"><h3>Resumo do pedido</h3>
    ${cart.map(i=>{const p=find(i.id);return `<div class="sl">${img(p.imagens[0],'',p.nome)}<div>${p.nome}<small>${i.color} / ${i.size} / ${i.qty}x</small></div><b>${brl(p.preco*i.qty)}</b></div>`}).join('')}
    <div class="row" style="margin-top:10px"><span>Subtotal</span><span>${brl(s)}</span></div>
    ${dc?`<div class="row"><span>Cupom ${coupon.code}</span><span>-${brl(dc)}</span></div>`:''}
    <div class="row"><span>Frete</span><span>${f?brl(f):'Grátis'}</span></div>
    <div class="row" id="desc" style="display:none"><span>Desconto Pix</span><span></span></div>
    <div class="row tot"><span>Total</span><span id="tot">${brl(s-dc+f)}</span></div></aside>
  </div></div>`;
  const form=$('#form');
  const calc=()=>{
    const pg=form.pg.value,pix=pg==='pix'?(s-dc)*.05:0;
    $('#card').style.display=pg==='cartao'?'':'none';
    ['cn','cv','cc'].forEach(n=>form[n].required=pg==='cartao');
    $('#desc').style.display=pix?'':'none';$('#desc span:last-child').textContent='-'+brl(pix);
    $('#tot').textContent=brl(s-dc-pix+f);
  };
  form.addEventListener('change',calc);calc();
  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(!form.checkValidity()){
      const bad=form.querySelector(':invalid');$('#err').textContent='Preencha corretamente o campo: '+(bad.closest('label')?.firstChild.textContent||'obrigatório')+'.';bad.focus();return;
    }
    const nome=form.nome.value.trim().split(' ')[0],email=form.email.value.trim();
    const pg=form.pg.value,pix=pg==='pix'?(s-dc)*.05:0;
    const pedido={num:'AR-'+Date.now().toString().slice(-6),nome,email,pg,total:s-dc-pix+f,itens:cart.map(i=>({...i}))};
    if(pg==='pix')renderPix(pedido);else concluirPedido(pedido);
  });
}
function renderSuccess(){
  let d=null;try{d=JSON.parse(sessionStorage.getItem('arena_ok'))}catch(e){}
  if(!d){location.hash='#vitrine';return}
  $('#app').innerHTML=`<div class="wrap"><div class="ok"><div class="mk">${ic.check}</div>
   <h1 class="t" style="font-family:var(--serif);font-weight:800;font-size:2rem">Pedido ${d.num} recebido</h1>
   <p>Obrigado, ${d.nome}. Enviaremos a confirmação e o código de rastreio para ${d.email}.</p>
   <a href="#vitrine" class="btn">Voltar à coleção</a></div></div>`;
}

/* ---------- LEGAL ---------- */
const LEGAL={
 privacidade:['Política de privacidade',[['Dados que coletamos','Coletamos apenas nome, e-mail, telefone e endereço informados no checkout para processar e entregar seu pedido.'],['Como usamos','Usamos os dados para confirmar o pedido, calcular frete, enviar atualizações de entrega e atender solicitações de troca.'],['Armazenamento','O carrinho fica salvo no seu navegador. Nesta versão de demonstração, nenhum dado é enviado a servidores.'],['Seus direitos','Conforme a LGPD, você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo canal de atendimento da loja.']]],
 termos:['Termos, trocas e entregas',[['Frete','Frete grátis em compras acima de R$ 399. Abaixo disso, o frete fixo é de R$ 24,90.'],['Trocas e devoluções','Você pode trocar ou devolver peças sem uso, com etiqueta, em até 30 dias após o recebimento. A primeira troca não tem custo.'],['Pagamento','Aceitamos Pix com 5% de desconto, cartão de crédito em até 3x sem juros e boleto bancário.'],['Loja de demonstração','Este site é uma simulação para apresentação. Produtos, preços e pedidos não são reais.']]]
};
function renderLegal(k){
  const [t,s]=LEGAL[k];
  $('#app').innerHTML=`<div class="wrap"><div class="legal"><h1>${t}</h1>${s.map(([h,p])=>`<h2>${h}</h2><p>${p}</p>`).join('')}</div></div>`;
}

/* ---------- ROTEADOR ---------- */
function route(){
  const [r,p]=(location.hash.slice(1)||'vitrine').split('/');
  const app=$('#app');app.onclick=null;
  if(r==='carrinho'){if(!app.innerHTML)renderHome();openCart();observe();return}
  if(r==='colecao'){renderHome();setTimeout(()=>$('#colecao').scrollIntoView(),0);return}
  if($('#drawer').classList.contains('on'))closeCart();
  if(r==='produto')renderProduct(p);
  else if(r==='checkout')renderCheckout();
  else if(r==='sucesso')renderSuccess();
  else if(LEGAL[r])renderLegal(r);
  else renderHome();
  if(r!=='colecao')window.scrollTo(0,0);
  $$('[data-nav]').forEach(a=>a.classList.toggle('on',r==='vitrine'));
}
addEventListener('hashchange',route);

/* ---------- EVENTOS GLOBAIS ---------- */
document.addEventListener('click',e=>{
  const t=e.target;
  const chip=t.closest('.chip');if(chip){view.cat=chip.dataset.f;refreshGrid();return}
  if(t.closest('[data-reset]')){view.cat='Todos';view.q='';const q=$('#q');if(q)q.value='';refreshGrid();return}
  const nav=t.closest('[data-cat]');if(nav){view.cat=nav.dataset.cat;view.q='';if(location.hash==='#vitrine'||!location.hash){renderHome();$('#colecao').scrollIntoView()}else{location.hash='#vitrine';setTimeout(()=>$('#colecao')&&$('#colecao').scrollIntoView(),30)}e.preventDefault();return}
  const sc=t.closest('[data-scroll]');if(sc){e.preventDefault();$('#colecao').scrollIntoView();return}
  const qb=t.closest('[data-q]');if(qb){const i=cart[+qb.dataset.q];if(+qb.dataset.d>0&&disponivel(i.id)<1){toast('Estoque insuficiente');return}i.qty+=+qb.dataset.d;if(i.qty<1)cart.splice(+qb.dataset.q,1);save();updateCart();return}
  const rm=t.closest('[data-r]');if(rm){cart.splice(+rm.dataset.r,1);save();updateCart();return}
  if(t.closest('[data-go]')){closeCart();location.hash='#vitrine';return}
  if(t.closest('[data-checkout]')){closeCart();location.hash='#checkout';return}
});
document.addEventListener('input',e=>{if(e.target.id==='q'){view.q=e.target.value;refreshGrid()}});
$('#openCart').addEventListener('click',openCart);
$('#closeCart').addEventListener('click',closeCart);
$('#ov').addEventListener('click',closeCart);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#drawer').classList.contains('on'))closeCart()});

/* ---------- MODO DEMONSTRACAO ---------- */
/* Defina como false para desligar prova social simulada e painel do lojista. */
const DEMO_MODE=true;
ic.bolt='<svg class="i" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>';
ic.chart='<svg class="i" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 15v-4M12 15V7M17 15v-6"/></svg>';

const STOCK0={'camisa-performance-pro-dry':24,'camisa-compressao-manga-longa':12,'camisa-dry-fit-ultra-leve':18,'shorts-running-tech':20,'shorts-treino-flex':15,'shorts-legging-2-em-1-flex':16,'legging-sculpt-high-waist':14,'legging-seamless-power':10,'regata-oversized-training':22,'regata-cavada-power-dry':9};
const SEED=[
 {num:'AR-104812',valor:259.8,pg:'pix',status:'aprovado',hora:'09:14'},
 {num:'AR-104813',valor:199.9,pg:'cartao',status:'aprovado',hora:'10:02'},
 {num:'AR-104814',valor:149.9,pg:'boleto',status:'aguardando',hora:'10:41'}
];
const novoDemo=()=>({stock:{...STOCK0},orders:SEED.map(o=>({...o}))});
function carregarDemo(){
  try{const d=JSON.parse(localStorage.getItem('arena_demo'));if(d&&d.stock&&d.orders)return d}catch(e){}
  return novoDemo();
}
let demo=carregarDemo();
const salvarDemo=()=>{try{localStorage.setItem('arena_demo',JSON.stringify(demo))}catch(e){}};
const faturamento=()=>demo.orders.filter(o=>o.status==='aprovado').reduce((a,o)=>a+o.valor,0);
const disponivel=id=>(demo.stock[id]||0)-cart.filter(i=>i.id===id).reduce((a,i)=>a+i.qty,0);

/* ---------- CUPOM ---------- */
function aplicarCupom(){
  const v=(($('#cupom')||{}).value||'').trim().toUpperCase();
  if(!v)cupomMsg='Digite um código de cupom.';
  else if(CUPONS[v]){coupon={code:v,pct:CUPONS[v].pct};cupomMsg='';try{localStorage.setItem('arena_coupon',v)}catch(e){}toast('Cupom '+v+' aplicado')}
  else cupomMsg='Cupom inválido ou expirado.';
  updateCart();
}
function removerCupom(){coupon=null;cupomMsg='';try{localStorage.removeItem('arena_coupon')}catch(e){}updateCart()}

/* ---------- PEDIDO E PIX ---------- */
function concluirPedido(p){
  const status=p.pg==='boleto'?'aguardando':'aprovado';
  p.itens.forEach(i=>{demo.stock[i.id]=Math.max(0,(demo.stock[i.id]||0)-i.qty)});
  demo.orders.unshift({num:p.num,valor:+p.total.toFixed(2),pg:p.pg,status,hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});
  demo.orders=demo.orders.slice(0,12);
  salvarDemo();
  cart=[];coupon=null;cupomMsg='';
  try{localStorage.removeItem('arena_coupon')}catch(e){}
  save();updateCart();
  try{sessionStorage.setItem('arena_ok',JSON.stringify({num:p.num,nome:p.nome,email:p.email}))}catch(e){}
  if($('#modal').classList.contains('on'))renderPanel();
  location.hash='#sucesso';
}
function qrSVG(seed){
  const N=25;let h=0;for(const c of seed)h=(h*31+c.charCodeAt(0))>>>0;
  const rnd=()=>(h=(h*1664525+1013904223)>>>0)/4294967296;
  const fin=(x,y)=>(x<8&&y<8)||(x>=N-8&&y<8)||(x<8&&y>=N-8);
  let r='';
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){if(!fin(x,y)&&rnd()>.52)r+=`<rect x="${x}" y="${y}" width="1" height="1"/>`}
  const f=(x,y)=>`<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x+1}" y="${y+1}" width="5" height="5" fill="#fff"/><rect x="${x+2}" y="${y+2}" width="3" height="3"/>`;
  return `<svg viewBox="-1 -1 ${N+2} ${N+2}" shape-rendering="crispEdges" role="img" aria-label="QR Code ilustrativo" fill="#1e1e1e"><rect x="-1" y="-1" width="${N+2}" height="${N+2}" fill="#fff"/>${r}${f(0,0)}${f(N-7,0)}${f(0,N-7)}</svg>`;
}
function renderPix(p){
  window.scrollTo(0,0);
  const code='ARENA-DEMO-PIX-'+p.num+'-'+Math.round(p.total*100);
  $('#app').innerHTML=`<div class="wrap"><div class="pixv">
    <p class="eyebrow">Pedido ${p.num}</p>
    <h1>Pague com Pix</h1>
    <p class="sub">Escaneie o QR Code no aplicativo do seu banco.</p>
    <div class="qr">${qrSVG(p.num)}</div>
    <div class="pixtot">${brl(p.total)}</div>
    <div class="code"><input readonly id="pixcode" value="${code}" aria-label="Código Pix copia e cola"><button class="btn ghost" data-copy>Copiar</button></div>
    <p class="note">QR Code ilustrativo de demonstração. Nenhuma cobrança real é gerada.</p>
    <div class="hook" id="hook" role="status"></div>
    <button class="btn lime full" id="simular" style="margin-top:14px">Simular Pagamento PIX Aprovado</button>
    <button class="back" data-pix-back>Voltar ao checkout</button></div></div>`;
  $('#simular').onclick=e=>{
    e.currentTarget.disabled=true;
    const h=$('#hook');
    h.innerHTML=ic.check+'<span>Webhook Mercado Pago recebido: Pagamento Aprovado &amp; Estoque Atualizado!</span>';
    h.classList.add('on');
    setTimeout(()=>concluirPedido(p),1900);
  };
}

/* ---------- PAINEL DO LOJISTA ---------- */
const PG={pix:'Pix',cartao:'Cartão',boleto:'Boleto'};
const ST={aprovado:'Aprovado',aguardando:'Aguardando pagamento'};
function renderPanel(){
  const ap=demo.orders.filter(o=>o.status==='aprovado'),fat=faturamento(),tk=ap.length?fat/ap.length:0;
  $('#panelBody').innerHTML=`
   <div class="kpis"><div><small>Faturamento do dia</small><b>${brl(fat)}</b></div><div><small>Pedidos aprovados</small><b>${ap.length}</b></div><div><small>Ticket médio</small><b>${brl(tk)}</b></div></div>
   <h3>Estoque em tempo real</h3>
   <ul class="stk">${PRODUTOS.map(p=>{const n=demo.stock[p.id]||0,m=STOCK0[p.id]||1,low=n<=5?'low':'';return `<li><span>${p.nome}</span><div class="bar2"><i class="${low}" style="width:${Math.min(100,n/m*100)}%"></i></div><b class="${low}">${n}</b></li>`}).join('')}</ul>
   <h3>Pedidos recentes</h3>
   <ul class="ord">${demo.orders.map(o=>`<li><div><b>${o.num}</b><small>${o.hora} / ${PG[o.pg]}</small></div><span class="st ${o.status}">${ST[o.status]}</span><b>${brl(o.valor)}</b></li>`).join('')}</ul>
   <p class="note">Dados de demonstração salvos neste navegador. Finalize um pedido de teste para ver faturamento e estoque mudarem.</p>
   <button class="btn ghost" data-reset-demo>Zerar demonstração</button>`;
}
function abrirPainel(){renderPanel();const m=$('#modal');m.classList.add('on');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>$('[data-panel-close]').focus(),50)}
function fecharPainel(){const m=$('#modal');m.classList.remove('on');m.setAttribute('aria-hidden','true');document.body.style.overflow=''}

/* ---------- PROVA SOCIAL SIMULADA ---------- */
const COMPRADORES=[['Lucas M.','Fortaleza/CE'],['Camila R.','Recife/PE'],['Rafael S.','São Paulo/SP'],['Beatriz A.','Belo Horizonte/MG'],['Thiago L.','Salvador/BA'],['Marina F.','Curitiba/PR'],['Gabriel P.','Brasília/DF'],['Juliana C.','Natal/RN']];
function mostrarProva(){
  const [n,c]=COMPRADORES[Math.floor(Math.random()*COMPRADORES.length)];
  const p=PRODUTOS[Math.floor(Math.random()*PRODUTOS.length)];
  const el=$('#proof');
  el.innerHTML=`<span class="pi">${ic.bolt}</span><div><b>${n} (${c})</b> comprou ${p.nome} via PIX<small>Aprovado agora<i>Simulação</i></small></div>`;
  el.classList.add('on');
  clearTimeout(mostrarProva.t);mostrarProva.t=setTimeout(()=>el.classList.remove('on'),5500);
}

/* ---------- EVENTOS DA DEMONSTRACAO ---------- */
document.addEventListener('click',e=>{
  const t=e.target;
  if(t.closest('[data-cupom]'))aplicarCupom();
  else if(t.closest('[data-cupom-rm]'))removerCupom();
  else if(t.closest('[data-copy]')){const i=$('#pixcode');i.select();try{navigator.clipboard.writeText(i.value)}catch(x){}toast('Código Pix copiado')}
  else if(t.closest('[data-pix-back]'))renderCheckout();
  else if(t.closest('[data-reset-demo]')){demo=novoDemo();salvarDemo();renderPanel();updateCart();toast('Demonstração reiniciada')}
  else if(t.closest('#panelBtn'))abrirPainel();
  else if(t.closest('[data-panel-close]')||t===$('#modal'))fecharPainel();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.id==='cupom'){e.preventDefault();aplicarCupom()}
  if(e.key==='Escape'&&$('#modal').classList.contains('on'))fecharPainel();
});
$('#panelBtn').hidden=!DEMO_MODE;
if(DEMO_MODE){setTimeout(mostrarProva,6000);setInterval(mostrarProva,12000)}

updateCart();route();