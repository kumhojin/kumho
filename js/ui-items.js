/* 금호정공 사내 업무 시스템 · 품목 관리 · 품목 자동 채우기 · 재료 연결
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // ---------- 품목 사용·미사용 (팀장) ----------
  let offMap=new Map(), itF='all';
  const normItem=v=>String(v||'').trim();
  // 전체 품목 목록 (이카운트 품목 엑셀): 최근 2년 판매 O = 사용, X = 미사용 (품목 관리에서 바꾼 것이 우선)
  let master=new Map(), masterInfo=null;
  function setMaster(d){master=new Map(); masterInfo=d?{file:d.file,uploadedAt:d.uploadedAt,count:d.count}:null;
    try{(d?JSON.parse(d.rows||'[]'):[]).forEach(r=>{const code=normItem(r[0]); if(code) master.set(code,{code,name:String(r[1]||'').trim(),spec:String(r[2]||'').trim(),kind:r[3]||'',group:r[4]||'',sold:!!r[5],last:r[6]||'',qty:r[7]||0})})}catch(e){console.warn(e)}
    prodCache=null; onItemsOff()}
  function isOff(code){code=normItem(code); const d=offMap.get(code); if(d) return !!d.off; const m=master.get(code); return !!m&&!m.sold}
  function markOffRows(){const sale=slipType==='판매';
    [...slBody.children].forEach(tr=>{const inp=tr.querySelector('input[data-k=item]'); const off=sale&&!!inp&&isOff(inp.value);
      tr.classList.toggle('offrow',off); if(inp){if(off) inp.title='미사용 품목 — 납품할 수 없습니다'; else if(inp.title.startsWith('미사용')) inp.title=''}})}
  slBody.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.k==='item') markOffRows()});
  // 종류: 품목구분·품목그룹·이름으로 자동 분류 (품목 정보 수정에서 바꿀 수 있음)
  let infoMap=new Map();
  const CATS=['제품','반제품','재료','포장품','부재료','상품','금형'];
  const PACK_RE=/비닐|지퍼백|박스|BOX|상자|골판지|파렛트|팔레트|PALLET|TRAY|트레이|봉투|PAD|칸막이|덮개|TOILON|리테이너봉/i;
  function autoCat(e){const k=e.kind||'', g=e.group||'';
    if(k==='원재료'||/원재료|분쇄재|스크랩/.test(g)) return '재료';
    if(k==='부재료') return PACK_RE.test(e.name+' '+e.spec)?'포장품':'부재료';
    if(g==='금형') return '금형'; if(k==='제품') return '제품'; if(k==='반제품') return '반제품'; if(k==='상품') return '상품'; return ''}
  function itemPrice(code){const pp=priceMap.get('products'); const v=pp&&pp.map&&pp.map[code]; return v==null||v===''?null:v}
  function canEditInfo(){return !!me&&can('item')}
  function canEditPrice(){return !!me&&can('priceEdit')}
  function allItems(){const m=new Map();
    for(const [k,x] of master) m.set(k,{code:k,name:x.name,spec:x.spec,kind:x.kind,group:x.group,last:x.last});
    const add=(code,name,spec)=>{code=normItem(code); if(!code) return; const e=m.get(code)||{code,name:'',spec:''};
      if(!e.name&&name) e.name=String(name).trim(); if(!e.spec&&spec) e.spec=String(spec).trim(); m.set(code,e)};
    try{if(ecInv&&ecInv.headers){const H=ecInv.headers, f=re=>H.findIndex(h=>re.test(String(h)));
      const ci=f(/품목코드|품번/), ni=f(/품목명|품명/), si=f(/규격/);
      if(ci>=0) invRows().forEach(r=>add(r[ci],ni>=0?r[ni]:'',si>=0?r[si]:''))}}catch(e){}
    try{for(const e of stockMap().values()) add(e.item)}catch(e){}
    try{for(const d of slipsRaw){const x=d.data(); if(x.type!=='구매') (x.rows||[]).forEach(o=>add(o.item,o.name,o.spec))}}catch(e){}
    for(const [k,d] of offMap) add(k,d.name,d.spec);
    for(const [k,d] of infoMap){const e=m.get(k)||{code:k,name:'',spec:''}; ['name','spec','kind','group'].forEach(f=>{if(d[f]!=null) e[f]=d[f]}); if(d.cat) e.cat=d.cat; if(Array.isArray(d.mats)) e.mats=d.mats; m.set(k,e)}
    for(const e of m.values()){e.name=e.name||''; e.spec=e.spec||''; if(!e.cat) e.cat=autoCat(e)}
    return [...m.values()]}
  // 현재 재고 (이카운트에서 가져온 것) — '안전재고 보기' 또는 '현재 재고 고치기' 권한이 있을 때만
  let stockNow=null, stockLoading=false;
  const canSeeStock=()=>!!me&&(can('safety')||can('stockEdit'));
  async function loadStockNow(){if(stockLoading||!canSeeStock()||!window.kumhoSB) return; stockLoading=true;
    try{const sb=kumhoSB(), m=new Map(); for(let f=0;f<50000;f+=1000){const r=await sb.from('stock_now').select('item_code,qty,updated_by,file_name').order('item_code').range(f,f+999); if(r.error) throw r.error; r.data.forEach(x=>m.set(x.item_code,x)); if(r.data.length<1000) break}
      stockNow=m; renderItems()}catch(e){console.warn(e)} stockLoading=false}
  function stockCell(td,e){if(!canSeeStock()) return; if(!stockNow){td.textContent='…'; return}
    const x=stockNow.get(e.code), v=x?Number(x.qty):null; const sp=document.createElement('span'); sp.textContent=v==null?'—':v.toLocaleString('ko-KR'); if(v!=null&&v<0) sp.style.color='var(--bad)';
    if(x&&x.file_name==='직접 수정') sp.title=`직접 고침 · ${x.updated_by||''}`; td.append(sp);
    if(can('stockEdit')){const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent='고치기'; b.style.marginLeft='6px'; b.style.padding='2px 8px';
      b.onclick=()=>{td.replaceChildren(); const i=document.createElement('input'); i.type='number'; i.value=v==null?'':v; i.style.width='100px'; const s=document.createElement('button'); s.type='button'; s.textContent='저장'; s.style.padding='2px 8px';
        const cx=document.createElement('button'); cx.type='button'; cx.className='ghost'; cx.textContent='취소'; cx.style.padding='2px 8px'; cx.onclick=()=>renderItems();
        const go=async()=>{if(i.value===''||!isFinite(Number(i.value))){i.focus(); return} s.disabled=true; const r=await kumhoSB().rpc('stock_set',{p_code:e.code,p_qty:Number(i.value)});
          const st=document.getElementById('it-status'); if(r.error){st.textContent='재고를 고치지 못했습니다: '+(/권한/.test(r.error.message)?'권한이 없습니다.':r.error.message); s.disabled=false; return}
          stockNow.set(e.code,{item_code:e.code,qty:Number(i.value),updated_by:me.user,file_name:'직접 수정'}); const msg=`${e.code}${e.name?' ('+e.name+')':''} 현재 재고를 ${Number(i.value).toLocaleString('ko-KR')}(으)로 고쳤습니다.`; renderItems(); st.textContent=msg; try{safetyRefresh()}catch(x){}};
        s.onclick=go; i.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault(); go()} if(ev.key==='Escape') renderItems()}); td.append(i,' ',s,' ',cx); i.focus(); i.select()};
      td.append(b)}}
  function renderItems(){const tb=document.getElementById('it-body'); if(!tb) return; if(typeof curItem!=='undefined'&&curItem!=='items'){if(tb.firstChild) tb.replaceChildren(); return} tb.replaceChildren(); if(stockNow==null&&canSeeStock()) loadStockNow();
    const items=allItems(), byName=new Map();
    // 같은 이름 문제: 둘 이상이 동시에 '사용'일 때만 (미사용 품목은 세지 않음)
    items.forEach(e=>{const k=e.name.replace(/\s+/g,'').toLowerCase(); if(k&&!isOff(e.code)) byName.set(k,(byName.get(k)||0)+1)});
    const dupN=e=>{if(isOff(e.code)) return 1; const k=e.name.replace(/\s+/g,'').toLowerCase(); return k?byName.get(k)||1:1};
    const q=document.getElementById('it-search').value.trim().toLowerCase();
    const cat=document.getElementById('it-cat').value;
    // 재료가 어떤 제품에 쓰이는지 (uses:재료코드 로 검색)
    const usedBy=new Map(); items.forEach(e=>(e.mats||[]).forEach(m=>usedBy.set(m,(usedBy.get(m)||0)+1)));
    const usesQ=q.startsWith('uses:')?q.slice(5).trim():null;
    let rows=items.filter(e=>(!cat||e.cat===cat)&&(usesQ!=null?(e.mats||[]).some(m=>m.toLowerCase()===usesQ):(!q||[e.code,e.name,e.spec,e.kind||'',e.group||'',e.cat||''].some(v=>String(v).toLowerCase().includes(q))))
      &&(itF==='all'||(itF==='on'&&!isOff(e.code))||(itF==='off'&&isOff(e.code))||(itF==='dup'&&dupN(e)>1)))
      .sort((a,b)=>(a.name||'￿').localeCompare(b.name||'￿')||a.code.localeCompare(b.code));
    const total=rows.length; rows=rows.slice(0,500); const edit=canToggleItems(); document.getElementById('it-drop').hidden=!edit;
    for(const e of rows){const off=isOff(e.code), d=offMap.get(e.code), tr=document.createElement('tr'); tr.className=off?'off':'on';
      const c=(t,cl)=>{const td=document.createElement('td'); td.textContent=t; if(cl) td.className=cl; tr.append(td); return td};
      c(e.code,'code'); const nt=c(e.name||'—'); if(dupN(e)>1){const sp=document.createElement('span'); sp.className='pill dup'; sp.textContent=`같은 이름 ${dupN(e)}개 사용 중`; nt.append(sp)}
      c(e.spec||''); c(e.cat||'');
      {const td=c(''); const goUses=code=>{const s=document.getElementById('it-search'); s.value='uses:'+code; document.getElementById('it-cat').value=''; renderItems(); s.focus()};
        if(e.mats&&e.mats.length) e.mats.forEach(m=>{const p=prodOf(m), b=document.createElement('button'); b.type='button'; b.className='matchip'; b.textContent=p.name||m; b.title=`${m}${p.spec?' · '+p.spec:''} — 이 재료를 쓰는 제품 보기`; b.onclick=()=>goUses(m); td.append(b)});
        else if(usedBy.get(e.code)){const b=document.createElement('button'); b.type='button'; b.className='matchip'; b.textContent=`제품 ${usedBy.get(e.code)}개`; b.title='이 재료를 쓰는 제품 보기'; b.onclick=()=>goUses(e.code); td.append(b)}}
      c([e.kind,e.group].filter(Boolean).join(' · ')); c(e.last||''); {const pv=itemPrice(e.code); c(pv==null?'':Number(pv).toLocaleString('ko-KR'),'num pricecell')} stockCell(c('','num stockcell nowrap'),e); const st=c('','st'); const b=document.createElement('b'); b.textContent=off?'미사용':'사용'; st.append(b);
      c(d&&d.by?`${d.by} · ${fmt(d.createdAt)}`:master.has(e.code)?(master.get(e.code).sold?'2년 내 판매':'2년간 판매 없음'):'');
      const a=c(''); a.style.whiteSpace='nowrap';
      if(canEditInfo()||canEditPrice()){const eb=document.createElement('button'); eb.type='button'; eb.className='ghost'; eb.textContent='정보 수정'; eb.onclick=()=>editItemRow(tr,e); a.append(eb,' ')}
      if(edit){const btn=document.createElement('button'); btn.type='button'; btn.className='ghost'; btn.textContent=off?'사용으로':'미사용으로';
        btn.onclick=async()=>{if(btn.dataset.c!=='1'){btn.dataset.c='1'; btn.textContent=off?'사용 확인':'미사용 확인'; return}
          btn.disabled=true; const stEl=document.getElementById('it-status');
          try{await db.collection('itemoff').doc(e.code).set({item:e.code,name:e.name||'',spec:e.spec||'',off:!off,by:me.name||me.user,author:myId,createdAt:Date.now()});
            stEl.textContent=`${e.code}${e.name?' ('+e.name+')':''} → ${off?'사용':'미사용'}으로 바꿨습니다.`}
          catch(err){stEl.textContent='바꾸지 못했습니다. 팀장 권한(DB 설정)을 확인해 주세요.'; btn.disabled=false}};
        a.append(btn)}
      tb.append(tr)}
    document.getElementById('it-empty').hidden=total>0;
    const offN=items.filter(e=>isOff(e.code)).length;
    if(usesQ!=null){const p=prodOf(usesQ.toUpperCase())||{}; const mm=items.find(x=>x.code.toLowerCase()===usesQ); document.getElementById('it-status').textContent=`‘${(mm&&mm.name)||usesQ}’ 재료를 쓰는 제품 ${total}개 · 검색칸을 비우면 전체 목록`; return}
    document.getElementById('it-status').textContent=`${masterInfo?`${masterInfo.file} (${fmt(masterInfo.uploadedAt)}) · `:''}품목 ${items.length}개 · 미사용 ${offN}개${total>500?` · 앞 500개만 표시 (검색으로 좁혀 주세요)`:''}${edit?'':' · 보기 전용'}`}
  // ---------- 품목 자동 채우기: 품번이나 품목명을 넣으면 나머지(품목코드·품목명·규격·단가)를 채움 ----------
  let prodCache=null;
  const nName=v=>String(v||'').replace(/\s+/g,'').toLowerCase();
  function prodIdx(){if(prodCache) return prodCache; const items=allItems(), code=new Map(), codeL=new Map(), name=new Map();
    items.forEach(e=>{code.set(e.code,e); codeL.set(e.code.toLowerCase(),e); const k=nName(e.name); if(k){if(!name.has(k)) name.set(k,[]); name.get(k).push(e)}});
    return prodCache={items,code,codeL,name}}
  function prodOf(code){return prodIdx().code.get(normItem(code))||{}}
  function resolveProd(v){v=normItem(v); if(!v) return {}; const I=prodIdx();
    const c=I.code.get(v)||I.codeL.get(v.toLowerCase()); if(c) return {p:c};
    const all=I.name.get(nName(v))||[], on=all.filter(e=>!isOff(e.code));
    if(on.length===1) return {p:on[0]}; if(on.length>1) return {many:on}; return {}}
  // 재료 고르기 목록 (원재료·부재료·포장품, 미사용이어도 포함)
  const MAT_CATS=['재료','부재료','포장품'];
  function buildMatList(){const dl=document.getElementById('mat-items'); if(!dl) return; dl.replaceChildren();
    prodIdx().items.filter(e=>MAT_CATS.includes(e.cat)).slice(0,4000).forEach(e=>{const o=document.createElement('option'); o.value=e.code; const l=[e.name,e.spec].filter(Boolean).join(' · '); if(l) o.label=l; dl.append(o)})}
  function buildItemList(){try{buildMatList()}catch(e){} const dl=document.getElementById('s-items'); if(!dl) return; dl.replaceChildren();
    prodIdx().items.filter(e=>!isOff(e.code)).slice(0,4000).forEach(e=>{const o=document.createElement('option'); o.value=e.code;
      const l=[e.name,e.spec].filter(Boolean).join(' · '); if(l) o.label=l; dl.append(o)})}
  // 단가: 같은 거래처의 최근 전표 → 아무 거래처 최근 전표 → 이카운트 재고현황 단가 칸
  function lastPrice(code,type,partner){if(!canSeePrice()) return null; let any=null;
    for(const d of slips){const x=d.data(); if(x.type!==type) continue;
      const r=(x.rows||[]).find(o=>normItem(o.item)===code&&o.price!=null&&o.price!==''); if(!r) continue;
      if(partner&&x.partner===partner) return r.price; if(any==null) any=r.price}
    if(any!=null) return any;
    if(type==='판매'){const pp=priceMap.get('products'); const v=pp&&pp.map&&pp.map[code]; if(v!=null&&v!=='') return v}
    try{if(ecInv&&ecInv.headers){const H=ecInv.headers, ci=H.findIndex(h=>/품목코드|품번/.test(h));
      const pi=H.findIndex(h=>type==='구매'?/구매단가|입고단가|매입가/.test(h):/판매단가|출고단가|판매가/.test(h)), pj=pi>=0?pi:H.findIndex(h=>/단가/.test(h));
      if(ci>=0&&pj>=0){const r=invRows().find(r=>normItem(r[ci])===code); const n=r&&Number(String(r[pj]).replace(/,/g,'')); if(n) return n}}}catch(e){}
    return null}
  const setAuto=(inp,v)=>{if(!inp||v==null||v==='') return; if(inp.value.trim()===''||inp.dataset.auto==='1'){inp.value=v; inp.dataset.auto='1'}};
  // 표가 아닌 입력칸: 품번 칸 ↔ 품명 칸 짝
  const CODE_TO_NAME={'t-item':'t-name','f-partno':'f-part'}, NAME_TO_CODE={'t-name':'t-item','f-part':'f-partno'};
  const CODE_IDS=['s-item','t-item','f-partno','cp-item','l-item','p-gitem'];
  function pinfo(inp,text,warn){let el=inp.parentElement&&inp.parentElement.querySelector(':scope > .pinfo');
    if(inp.closest('td')){inp.title=text||''; return}
    if(!text){if(el) el.remove(); return} if(!el){el=document.createElement('span'); el.className='pinfo'; inp.after(el)} el.textContent=text; el.classList.toggle('warn',!!warn)}
  function fillFrom(inp,p){const tr=inp.closest('tr');
    const label=[p.name,p.spec].filter(Boolean).join(' · ');
    if(tr&&inp.closest('#sl-body')){const q=k=>tr.querySelector(`input[data-k=${k}]`);
      if(q('item')) q('item').value=p.code; setAuto(q('name'),p.name); setAuto(q('spec'),p.spec);
      if(q('price')&&canSeePrice()) setAuto(q('price'),lastPrice(p.code,slipType,document.getElementById('sl-partner').value.trim()));
      if(q('item')) q('item').title=label; try{markOffRows()}catch(e){} return}
    if(tr){const it=tr.querySelector('input[data-k=item]'); if(it){it.value=p.code; it.title=label} return}
    const codeInp=NAME_TO_CODE[inp.id]?document.getElementById(NAME_TO_CODE[inp.id]):inp;
    codeInp.value=p.code; const nm=CODE_TO_NAME[codeInp.id]; if(nm) setAuto(document.getElementById(nm),p.name);
    pinfo(codeInp,label?`${label}${isOff(p.code)?' · 미사용 품목':''}`:'',isOff(p.code))}
  function onProdChange(inp){const nameField=inp.dataset.k==='name'||!!NAME_TO_CODE[inp.id];
    if(!inp.value.trim()){if(!nameField) pinfo(inp,''); return}
    const r=resolveProd(inp.value);
    if(r.p){if(nameField&&nName(r.p.name)!==nName(inp.value)) return; fillFrom(inp,r.p); return}
    const target=nameField&&NAME_TO_CODE[inp.id]?document.getElementById(NAME_TO_CODE[inp.id]):inp;
    if(r.many){const msg=`같은 이름 ${r.many.length}개: ${r.many.map(e=>e.code+(e.spec?' ('+e.spec+')':'')).join(', ')} — 품번을 골라 주세요`;
      pinfo(target,msg,true); if(inp.closest('#sl-body')) slStatus.textContent=`‘${inp.value.trim()}’ `+msg}
    else if(!nameField) pinfo(inp,'')}
  function isProdInput(t){if(!t||t.tagName!=='INPUT') return false;
    if(CODE_IDS.includes(t.id)||NAME_TO_CODE[t.id]) return true;
    if(t.closest('#rq-body')) return false;
    return (t.dataset.k==='item'||(t.dataset.k==='name'&&!!t.closest('#sl-body')))&&!!t.closest('table')}
  document.addEventListener('focusin',e=>{const t=e.target; if(isProdInput(t)&&!t.hasAttribute('list')&&!(t.dataset.k==='name'||NAME_TO_CODE[t.id])) t.setAttribute('list','s-items')});
  document.addEventListener('input',e=>{const t=e.target; if(t&&t.dataset&&t.dataset.auto) delete t.dataset.auto});
  document.addEventListener('change',e=>{if(isProdInput(e.target)) try{onProdChange(e.target)}catch(err){console.warn(err)}});
  function autoRows(body){[...body.querySelectorAll('input[data-k=item]')].forEach(i=>{if(i.value.trim()) try{onProdChange(i)}catch(e){}})}
  document.getElementById('sl-partner').addEventListener('change',()=>{if(!canSeePrice()) return;
    [...slBody.querySelectorAll('input[data-k=price]')].forEach(pr=>{if(pr.dataset.auto==='1'){pr.value=''; const it=pr.closest('tr').querySelector('input[data-k=item]'); const p=it&&prodOf(it.value); if(p&&p.code) setAuto(pr,lastPrice(p.code,slipType,document.getElementById('sl-partner').value.trim()))}})});
  // 품목 정보·단가 수정 (계정 관리에서 허락한 사람만)
  function editItemRow(tr,e){const info=canEditInfo(), price=canEditPrice(); tr.replaceChildren();
    const td=document.createElement('td'); td.colSpan=12; tr.append(td);
    const f=document.createElement('form'); f.className='sform'; f.style.margin='4px 0';
    const field=(label,val,opt={})=>{const l=document.createElement('label'); l.textContent=label; let i;
      if(opt.options){i=document.createElement('select'); opt.options.forEach(o=>{const op=document.createElement('option'); op.value=o; op.textContent=o||'자동'; i.append(op)})}
      else {i=document.createElement('input'); if(opt.num){i.type='number'; i.min='0'; i.step='any'}}
      i.value=val??''; i.disabled=!!opt.dis; l.append(i); f.append(l); return i};
    const code=document.createElement('b'); code.textContent=e.code; f.append(code);
    const iName=field('품목명',e.name,{dis:!info}), iSpec=field('규격',e.spec,{dis:!info}), iCat=field('종류',(infoMap.get(e.code)||{}).cat||'',{dis:!info,options:['',...CATS]});
    const iPrice=price?field('단가',itemPrice(e.code),{num:true}):null;
    // 이 품목에 쓰는 재료 (원재료·부재료·포장품)
    const oldMats=[...(e.mats||[])]; let mats=[...oldMats]; let matBox=null;
    if(info){matBox=document.createElement('div'); matBox.className='matedit'; f.append(matBox);
      const drawMats=()=>{matBox.replaceChildren(); const lb=document.createElement('span'); lb.className='hint'; lb.textContent='사용 재료:'; matBox.append(lb);
        mats.forEach(m=>{const p=prodOf(m), b=document.createElement('button'); b.type='button'; b.className='matchip'; b.textContent=`${p.name||m}${p.spec?' ('+p.spec+')':''}`; const x=document.createElement('span'); x.className='x'; x.textContent='×'; b.append(x); b.title=m+' 빼기'; b.onclick=()=>{mats=mats.filter(z=>z!==m); drawMats()}; matBox.append(b)});
        const inp=document.createElement('input'); inp.setAttribute('list','mat-items'); inp.placeholder='재료 품목코드 또는 이름'; inp.style.maxWidth='240px';
        const add=document.createElement('button'); add.type='button'; add.className='ghost'; add.textContent='재료 추가';
        const msg=document.createElement('span'); msg.className='status';
        add.onclick=()=>{const v=inp.value.trim(); if(!v) return; const r=resolveProd(v); let code=r.p&&r.p.code;
          if(!code){const all=prodIdx().items.filter(x=>MAT_CATS.includes(x.cat)&&nName(x.name)===nName(v)); if(all.length===1) code=all[0].code; else{msg.textContent=all.length>1?`같은 이름 ${all.length}개 — 품목코드로 골라 주세요`:'그런 품목이 없습니다'; return}}
          if(code===e.code){msg.textContent='자기 자신은 넣을 수 없습니다'; return} if(!mats.includes(code)) mats.push(code); drawMats()};
        inp.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault(); add.click()}});
        matBox.append(inp,add,msg)};
      drawMats()}
    const sb=document.createElement('div'); sb.className='sbtns';
    const cancel=document.createElement('button'); cancel.type='button'; cancel.className='ghost'; cancel.textContent='취소'; cancel.onclick=()=>renderItems();
    const save=document.createElement('button'); save.type='submit'; save.textContent='저장'; sb.append(cancel,save); f.append(sb); td.append(f);
    f.onsubmit=async ev=>{ev.preventDefault(); const st=document.getElementById('it-status'); save.disabled=true;
      try{if(info&&(iName.value.trim()!==e.name||iSpec.value.trim()!==e.spec||iCat.value!==((infoMap.get(e.code)||{}).cat||'')||mats.join('|')!==oldMats.join('|')))
          await db.collection('iteminfo').doc(e.code).set({...(infoMap.get(e.code)||{}),item:e.code,...(()=>{const b=master.get(e.code)||{}, n=iName.value.trim(), sp=iSpec.value.trim(); return {name:b.name===n?null:n, spec:b.spec===sp?null:sp}})(),cat:iCat.value,mats,by:me.name||me.user,author:myId,createdAt:Date.now()});
        if(iPrice){const nv=iPrice.value===''?null:Number(iPrice.value), ov=itemPrice(e.code);
          if(nv!==ov&&!(nv==null&&ov==null)){const cur=priceMap.get('products'); const map={...((cur&&cur.map)||{})}; if(nv==null) delete map[e.code]; else map[e.code]=nv;
            await db.doc('prices/products').set({...(cur||{}),map,author:(cur&&cur.author)||myId,editedBy:me.name||me.user,updatedAt:Date.now(),createdAt:(cur&&cur.createdAt)||Date.now()})}}
        st.textContent=`${e.code} 정보를 저장했습니다.`; prodCache=null; renderItems()}
      catch(err){console.error(err); st.textContent='저장하지 못했습니다. 계정 관리에서 품목 정보·단가 수정 권한을 확인해 주세요.'; save.disabled=false}};
    iName.focus()}
  document.getElementById('it-cat').addEventListener('change',renderItems);
  async function itemsUpload(file){const st=document.getElementById('it-status');
    if(!db||!canToggleItems()){st.textContent='전체 품목 올리기는 자재·품질·생산 팀장과 관리자만 할 수 있습니다.';return}
    if(!window.XLSX){st.textContent='엑셀 읽기 도구를 불러오지 못했습니다. 새로고침해 주세요.';return}
    try{st.textContent='엑셀 읽는 중…';
      const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
      const find=(H,re)=>H.findIndex(h=>re.test(String(h).replace(/\s/g,'')));
      let best=null;
      for(const n of [...wb.SheetNames].sort((a,b)=>(b.includes('전체')?1:0)-(a.includes('전체')?1:0))){
        const aoa=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:'',dateNF:'yyyy-mm-dd'});
        const hr=aoa.slice(0,15).findIndex(r=>r.some(c=>/품목코드|품번/.test(String(c)))); if(hr<0) continue;
        best={n,aoa,hr}; break}
      if(!best){st.textContent='품목코드(생산품목코드) 칸을 찾지 못했습니다.';return}
      const H=best.aoa[best.hr], ix={code:find(H,/품목코드|품번/),name:find(H,/품목명|품명/),spec:find(H,/규격/),kind:find(H,/품목구분/),group:find(H,/품목그룹/),
        sold:find(H,/^최근2년판매$|판매여부|사용여부|^O\/X$/),price:find(H,/판매단가/),last:find(H,/판매일/),qty:find(H,/판매수량/)};
      if(ix.sold<0){st.textContent='‘최근 2년 판매’(O/X) 칸을 찾지 못했습니다.';return}
      const g=(r,k)=>ix[k]>=0?String(r[ix[k]]??'').trim():'';
      const rows=[], prices={}; const seen=new Set();
      best.aoa.slice(best.hr+1).forEach(r=>{const code=g(r,'code'); if(!code||seen.has(code)) return; seen.add(code);
        const o=/^[O○◯o]$/.test(g(r,'sold'));
        rows.push([code,g(r,'name'),g(r,'spec'),g(r,'kind'),g(r,'group'),o?1:0,g(r,'last').slice(0,10),Number(g(r,'qty').replace(/,/g,''))||0]);
        const pr=Number(g(r,'price').replace(/,/g,'')); if(pr) prices[code]=pr});
      if(!rows.length){st.textContent='품목이 없습니다.';return}
      st.textContent=`${rows.length}개 품목 저장 중…`; const at=Date.now();
      await db.doc('products/master').set({rows:JSON.stringify(rows),count:rows.length,file:file.name,sheet:best.n,uploadedAt:at,author:myId,createdAt:at});
      let pmsg=''; if(canSeePrice()&&Object.keys(prices).length){try{await db.doc('prices/products').set({map:prices,file:file.name,uploadedAt:at,author:myId,createdAt:at}); pmsg=` · 판매단가 ${Object.keys(prices).length}개`}catch(e){pmsg=' · 판매단가는 저장하지 못했습니다'}}
      const on=rows.filter(r=>r[5]).length;
      st.textContent=`${file.name}: ${rows.length}개 품목을 저장했습니다 (사용 ${on} · 미사용 ${rows.length-on})${pmsg}.`}
    catch(err){console.error(err); st.textContent='저장하지 못했습니다: '+(err&&err.message||err)}}
  wireDrop('it-drop','it-file',itemsUpload);
  function onItemsOff(){prodCache=null; try{buildItemList()}catch(e){} try{renderItems()}catch(e){} try{markOffRows()}catch(e){} try{renderStock()}catch(e){} try{safetyRefresh()}catch(e){}}
  document.getElementById('it-search').addEventListener('input',renderItems);
  document.querySelectorAll('#it-tabs button').forEach(b=>b.onclick=()=>{itF=b.dataset.f;
    document.querySelectorAll('#it-tabs button').forEach(x=>x.setAttribute('aria-selected',x===b)); renderItems()});
  function renderSlips(){const list=document.getElementById('sl-list'); list.replaceChildren();
    const mine=slips.filter(s=>s.data().type===slipType).slice(0,30); document.getElementById('sl-empty').hidden=mine.length>0;
    const dl=document.getElementById('sl-partners'); dl.replaceChildren();
    [...new Set(slips.map(s=>s.data().partner).filter(Boolean))].forEach(p=>{const o=document.createElement('option');o.value=p;dl.append(o)});
    (async()=>{let ps={}; const ids=[...new Set(mine.map(s=>s.data().author).filter(Boolean))]; if(user&&ids.length){try{ps=await user.profiles(ids)}catch(e){}}
      for(const s of mine){const x=s.data(), tr=document.createElement('tr');
        const c=(t,cl)=>{const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td);return td};
        c(x.date,'num'); c((x.partner||(x.type==='입고'?'250 → 300':'—'))+(x.driver?` · ${x.driver}`:''));
        c(x.rows.map(o=>o.item).slice(0,3).join(', ')+(x.rows.length>3?` 외 ${x.rows.length-3}`:''));
        c(x.rows.reduce((a,o)=>a+o.qty,0).toLocaleString('ko-KR'),'num'); c((ps[x.author]&&ps[x.author].name)||'직원');
        const act=c(''); act.style.whiteSpace='nowrap';
        const ex=document.createElement('button'); ex.type='button'; ex.className='ghost'; ex.textContent='이카운트 엑셀'; ex.onclick=()=>slipExcel(x); act.append(ex);
        if(x.author&&(x.author===myId||isAdm())){
          act.append(' ',editBtn(()=>editDoc({col:'slips',id:s.id,data:x,title:`${x.type} 전표 수정`,note:'품목·수량을 바꾸려면 전표를 지우고 다시 저장해 주세요. (재고 반영 때문)',
            fields:[{k:'date',label:'일자',type:'date',req:true},...(x.type==='입고'?[]:[{k:'partner',label:'거래처'}]),...(x.type==='판매'?[{k:'driver',label:'운송 기사'}]:[])],
            after:async(n,o)=>{if(x.type==='구매'){const q=await db.collection('records').where('slip','==',s.id).get(); for(const r of q.docs){const d=r.data(); await db.collection('records').doc(r.id).set({...d,date:n.date,memo:String(d.memo||'').replace('구매 · '+(o.partner||''),'구매 · '+(n.partner||''))})}}
              if(x.type==='판매'&&n.partner!==o.partner){const q=await db.collection('stock').where('slip','==',s.id).get(); for(const r of q.docs) await db.collection('stock').doc(r.id).set({...r.data(),memo:'판매 · '+n.partner})}}})));
          const del=document.createElement('button'); del.type='button'; del.className='ghost'; del.textContent='삭제';
          del.onclick=async()=>{if(del.dataset.c!=='1'){del.dataset.c='1';del.textContent='삭제 확인';return}
            try{const col=x.type==='구매'?'records':'stock'; const q=await db.collection(col).where('slip','==',s.id).get();
              for(const dd of q.docs) await db.collection(col).doc(dd.id).delete();
              await db.collection('slips').doc(s.id).delete(); try{await db.collection('prices').doc(s.id).delete()}catch(e){} slStatus.textContent='전표와 재고 반영을 지웠습니다.'}
            catch(e){slStatus.textContent='지우지 못했습니다. 권한을 확인해 주세요.'}};
          act.append(' ',del)}
        list.append(tr)}})()}
  async function slipExcel(x){
    const S=SLIP[x.type], t=ecT[S.ec];
    if(!t||!t.headers){slStatus.textContent=`이카운트 ${S.ec} 양식이 아직 없습니다. ‘이카운트 업로드’ 메뉴에서 양식을 먼저 넣어 주세요.`;return}
    if(!dlTried){dlTried=true; downloads=window.claude&&claude.use?await claude.use('downloads'):null}
    if(!downloads||!window.XLSX){slStatus.textContent='이 화면에서는 파일을 내려받을 수 없습니다.';return}
    const ymd=String(x.date||'').replace(/-/g,'');
    const val=(h,o)=>{const k=h.replace(/\s/g,'');
      if(/일자|날짜/.test(k)) return ymd;
      if(/거래처/.test(k)) return x.partner||'';
      if(/공장/.test(k)) return x.type==='입고'?'250':'';
      if(/창고/.test(k)) return x.type==='입고'?'300':'';
      if(/lot|로트/i.test(k)) return o.lot||'';
      if(/규격/.test(k)) return o.spec||prodOf(o.item).spec||'';
      if(/품목명|품명/.test(k)) return o.name||prodOf(o.item).name||'';
      if(/품목코드|품번|품목/.test(k)) return o.item;
      if(/수량|입고량/.test(k)) return o.qty;
      if(/단가/.test(k)) return o.price??'';
      if(/공급가|금액/.test(k)) return o.price!=null?o.price*o.qty:'';
      if(/적요|비고/.test(k)) return o.memo||'';
      return ''};
    const aoa=[t.headers,...x.rows.map(o=>t.headers.map(h=>val(h,o)))];
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),'Sheet1');
    try{await downloads.save({filename:`이카운트_${S.ec}_${ymd}.xlsx`,data:new Blob([XLSX.write(wb,{type:'array',bookType:'xlsx'})])}); slStatus.textContent='업로드용 엑셀을 저장했습니다. 품목코드처럼 양식에만 있는 칸은 올리기 전에 확인해 주세요.'}
    catch(e){slStatus.textContent=e&&e.code==='declined'?'저장을 취소했습니다.':'파일을 저장하지 못했습니다.'}
  }
  addRows(5);
