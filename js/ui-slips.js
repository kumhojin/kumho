/* 금호정공 사내 업무 시스템 · 자재: 입고·판매·구매 전표
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // 입고·판매·구매 전표 (여러 품목)
  const SLIP={
    '입고':{title:'입고 등록',ec:'생산입고',partner:false,cols:[['item','품번',''],['lot','LOT','예: VJO (비우면 일자로 채움)'],['qty','수량',''],['memo','적요',''],['name','품목명','자동'],['spec','규격','자동']],
      hint:'저장하면 각 줄이 완제품 재고에 더해집니다.'},
    '판매':{title:'판매 등록',ec:'판매입력',partner:true,cols:[['item','품번',''],['lot','LOT','비우면 오래된 LOT부터'],['qty','수량',''],['price','단가','자동'],['memo','적요',''],['name','품목명','자동'],['spec','규격','자동']],
      hint:'저장하면 완제품 재고에서 빠집니다. LOT를 비우면 그 품번의 오래된 LOT부터 뺍니다.'},
    '구매':{title:'구매 등록',ec:'구매입력',partner:true,cols:[['item','품목',''],['spec','규격',''],['lot','LOT',''],['qty','수량',''],['price','단가',''],['memo','적요','']],
      hint:'저장하면 각 줄이 창고 원자재 LOT 기록으로 들어갑니다.'}};
  let slipType='입고', slips=[], slipsRaw=[], priceMap=new Map(), ecInvBase=null;
  // 단가는 'prices' 기록에 따로 저장 → 서버가 단가 권한 있는 사람에게만 보내 줌. 여기서 합쳐서 보여 줌
  const PRICE_COL=/단가|금액|가액|원가|매입가|판매가|price/i;
  function mergePrices(){
    slips=slipsRaw.map(d=>{const x=d.data(), pr=priceMap.get(d.id);
      if(!pr||!Array.isArray(pr.prices)) return d;
      const rows=(x.rows||[]).map((o,i)=>pr.prices[i]==null?o:{...o,price:pr.prices[i]});
      return {id:d.id,exists:true,data:()=>({...x,rows})}});
    const pi=priceMap.get('inventory');
    if(ecInvBase&&pi&&pi.file===ecInvBase.file&&pi.uploadedAt===ecInvBase.uploadedAt){
      try{const a=JSON.parse(ecInvBase.rows), b=JSON.parse(pi.rows); const map=pi.pos||[];
        const headers=[...ecInvBase.headers]; map.forEach((pos,j)=>headers.splice(pos,0,pi.headers[j]));
        const rows=a.map((r,i)=>{const o=[...r]; map.forEach((pos,j)=>o.splice(pos,0,(b[i]||[])[j]??'')); return o});
        ecInv={...ecInvBase,headers,rows:JSON.stringify(rows)}}catch(e){ecInv=ecInvBase}}
    else ecInv=ecInvBase;
    prodCache=null; try{buildItemList()}catch(e){} try{renderSlips()}catch(e){} try{renderBoard()}catch(e){} try{if(ecf==='재고현황') renderInv()}catch(e){} try{if(curItem==='items') renderItems()}catch(e){}
    autoMovePrices()}
  // 예전에 단가가 전표·재고현황 안에 같이 저장된 경우, 관리자 화면에서 한 번 옮겨 둠
  let movingPrices=false;
  async function autoMovePrices(){if(movingPrices||!db||!me||me.role!=='admin') return; movingPrices=true;
    try{for(const d of slipsRaw){const x=d.data(); if(!(x.rows||[]).some(o=>'price' in o)) continue;
        const prices=x.rows.map(o=>o.price??null);
        if(prices.some(v=>v!=null)&&!priceMap.has(d.id)) await db.doc('prices/'+d.id).set({slip:d.id,prices,author:x.author||myId,createdAt:x.createdAt||Date.now()});
        await db.doc('slips/'+d.id).set({...x,rows:x.rows.map(({price,...o})=>o)})}
      if(ecInvBase&&ecInvBase.headers&&ecInvBase.headers.some(h=>PRICE_COL.test(h))) await saveInventory(ecInvBase.headers,JSON.parse(ecInvBase.rows),ecInvBase.file,ecInvBase.uploadedAt);
    }catch(e){console.warn('단가 옮기기 실패',e)} movingPrices=false}
  async function saveInventory(headers,rows,file,at){
    const pIdx=headers.map((h,i)=>PRICE_COL.test(h)?i:-1).filter(i=>i>=0), keep=headers.map((h,i)=>i).filter(i=>!pIdx.includes(i));
    if(pIdx.length&&me&&can('price')) await db.doc('prices/inventory').set({file,uploadedAt:at,headers:pIdx.map(i=>headers[i]),pos:pIdx,rows:JSON.stringify(rows.map(r=>pIdx.map(i=>r[i]??''))),author:myId,createdAt:at});
    await db.doc('ecount/inventory').set({headers:keep.map(i=>headers[i]),rows:JSON.stringify(rows.map(r=>keep.map(i=>r[i]??''))),file,uploadedAt:at})}
  const slBody=document.getElementById('sl-body'), slStatus=document.getElementById('sl-status');
  document.getElementById('sl-date').value=iso(d);
  function slipRow(vals){const C=SLIP[slipType].cols, tr=document.createElement('tr');
    const n=document.createElement('td'); n.className='rn'; tr.append(n);
    C.forEach(([k,label,ph],ci)=>{const td=document.createElement('td'), inp=document.createElement('input');
      inp.dataset.k=k; inp.setAttribute('aria-label',label); if(ph) inp.placeholder=ph;
      if(k==='qty'||k==='price'){inp.type='number'; inp.min='0'; inp.inputMode='decimal'; td.className='num'} if(k==='price') td.classList.add('pricecell');
      if(k==='item') inp.setAttribute('list','s-items');
      inp.value=vals&&vals[ci]!=null?vals[ci]:'';
      inp.addEventListener('paste',e=>{const t=(e.clipboardData||window.clipboardData).getData('text');
        if(!/[\t\n]/.test(t)) return; e.preventDefault(); pasteGrid(tr,ci,t)});
      inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();
        if(ci===C.length-1){const nx=tr.nextElementSibling||addRows(1); nx.querySelector('input').focus()}
        else tr.querySelectorAll('input')[ci+1].focus()}});
      td.append(inp); tr.append(td)});
    const x=document.createElement('td'); x.className='x'; const del=document.createElement('button'); del.type='button'; del.className='ghost'; del.textContent='×'; del.setAttribute('aria-label','이 줄 지우기');
    del.onclick=()=>{tr.remove(); if(!slBody.children.length) addRows(1); renumber()}; x.append(del); tr.append(x);
    return tr}
  function renumber(){[...slBody.children].forEach((tr,i)=>tr.firstChild.textContent=i+1)}
  function addRows(n,vals){let last; for(let i=0;i<n;i++){last=slipRow(vals&&vals[i]); slBody.append(last)} renumber(); return last}
  function pasteGrid(tr,ci,text){const lines=text.replace(/\r/g,'').split('\n').filter((l,i,a)=>l.trim()||i<a.length-1).filter(l=>l.trim());
    let row=tr; lines.forEach(l=>{const cells=l.split('\t'); if(!row) row=addRows(1);
      const inps=row.querySelectorAll('input'); cells.forEach((c,j)=>{const inp=inps[ci+j]; if(inp) inp.value=String(c).trim().replace(/,/g,inp.type==='number'?'':',')});
      row=row.nextElementSibling}); renumber(); slStatus.textContent=`${lines.length}줄을 붙여 넣었습니다.`; try{autoRows(slBody)}catch(e){}}
  function setSlipType(t){if(!SLIP[t]) return; const changed=t!==slipType; slipType=t; const S=SLIP[t];
    document.getElementById('slip-title').textContent=S.title;
    document.getElementById('sl-pwrap').hidden=!S.partner; document.getElementById('sl-fixed').hidden=t!=='입고'; document.getElementById('sl-dwrap').hidden=t!=='판매';
    const hd=document.getElementById('sl-head'); hd.replaceChildren(); const tr=document.createElement('tr');
    ['#',...S.cols.map(c=>c[1]),''].forEach((h,i)=>{const th=document.createElement('th'); th.textContent=h; if(['수량','단가'].includes(h)) th.className='num'; if(h==='단가') th.classList.add('pricecell'); tr.append(th)}); hd.append(tr);
    if(changed||!slBody.children.length){slBody.replaceChildren(); addRows(5)}
    slStatus.textContent=S.hint; renderSlips(); markOffRows()}
  document.getElementById('sl-add').onclick=()=>{addRows(5).querySelector('input')};
  document.getElementById('sl-clear').onclick=()=>{slBody.replaceChildren(); addRows(5); slStatus.textContent='비웠습니다.'};
  function readRows(){const C=SLIP[slipType].cols, out=[], bad=[];
    [...slBody.children].forEach((tr,i)=>{tr.classList.remove('err'); const o={}; tr.querySelectorAll('input').forEach(inp=>o[inp.dataset.k]=inp.value.trim());
      if(!Object.values(o).some(v=>v)) return;
      o.qty=Math.floor(Number(o.qty)); if(o.price!==undefined) o.price=o.price===''?null:Number(o.price);
      if(!o.item||!(o.qty>0)||(slipType==='입고'&&!o.lot)){bad.push(i+1); tr.classList.add('err'); return}
      out.push(o)});
    return {rows:out,bad}}
  document.getElementById('slipform').addEventListener('submit',async e=>{e.preventDefault();
    if(!db){slStatus.textContent='전표 저장은 로그인한 직원만 할 수 있습니다.';return}
    const S=SLIP[slipType], date=document.getElementById('sl-date').value, partner=document.getElementById('sl-partner').value.trim();
    const {rows,bad}=readRows();
    if(bad.length){slStatus.textContent=`${bad.join(', ')}번 줄을 확인해 주세요. 품번과 수량(1 이상)${slipType==='입고'?', LOT':''}이 필요합니다.`;return}
    if(!rows.length){slStatus.textContent='입력한 줄이 없습니다.';return}
    if(slipType==='판매'){const offs=[...new Set(rows.filter(o=>isOff(o.item)).map(o=>o.item))]; markOffRows();
      if(offs.length){slStatus.textContent=`미사용 품목은 납품할 수 없습니다: ${offs.join(', ')} — 품번을 확인하거나 팀장에게 ‘품목 관리’에서 사용으로 바꿔 달라고 하세요.`;return}}
    if(S.partner&&!partner){slStatus.textContent='거래처를 넣어 주세요.';return}
    if(slipType==='판매'&&!document.getElementById('sl-driver').value){slStatus.textContent='운송 기사를 골라 주세요.';document.getElementById('sl-driver').focus();return}
    // 판매: 재고 확인 후 LOT별로 뺄 수량 정하기
    let outs=[];
    if(slipType==='판매'){const m=stockMap(), left=new Map([...m].map(([k,v])=>[k,v.qty])), short=[];
      rows.forEach((o,i)=>{let need=o.qty;
        const keys=o.lot?[o.item+'\u0000'+o.lot]:[...left.keys()].filter(k=>k.split('\u0000')[0]===o.item&&left.get(k)>0).sort((a,b)=>lotSortKey(a.split('\u0000')[1]).localeCompare(lotSortKey(b.split('\u0000')[1])));
        for(const k of keys){const have=left.get(k)||0; const t=Math.min(have,need); if(t>0){outs.push({item:o.item,lot:k.split('\u0000')[1],qty:t}); left.set(k,have-t); need-=t} if(!need) break}
        if(need>0) short.push(`${o.item}${o.lot?' / '+o.lot:''} ${need.toLocaleString('ko-KR')} EA 부족`)});
      if(short.length){slStatus.textContent='재고가 모자랍니다: '+short.join(', ');return}}
    const btn=document.getElementById('sl-save'); btn.disabled=true; slStatus.textContent='저장 중…';
    try{
      const prices=rows.map(o=>o.price??null), cleanRows=rows.map(({price,...o})=>o);
      const driver=slipType==='판매'?document.getElementById('sl-driver').value:'';
      const ref=await db.collection('slips').add({type:slipType,date,partner:S.partner?partner:'',...(driver?{driver}:{}),rows:cleanRows,author:myId,createdAt:Date.now()});
      if(prices.some(v=>v!=null)&&can('price')) await db.doc('prices/'+ref.id).set({slip:ref.id,prices,author:myId,createdAt:Date.now()});
      const now=Date.now();
      if(slipType==='입고') for(const o of rows) await db.collection('stock').add({item:o.item,lot:o.lot,qty:o.qty,memo:'입고 전표'+(o.memo?' · '+o.memo:''),slip:ref.id,author:myId,createdAt:now});
      if(slipType==='판매') for(const o of outs) await db.collection('stock').add({item:o.item,lot:o.lot,qty:-o.qty,memo:'판매 · '+partner,slip:ref.id,author:myId,createdAt:now});
      if(slipType==='구매') for(const o of rows) await db.collection('records').add({kind:'원자재',loc:'창고',date,item:o.item+(o.spec?' '+o.spec:''),lot:o.lot||'',qty:o.qty,unit:'EA',memo:'구매 · '+partner+(o.memo?' · '+o.memo:''),slip:ref.id,author:myId,createdAt:now});
      slBody.replaceChildren(); addRows(5);
      slStatus.textContent=`${S.title.replace(' 등록','')} 전표를 저장했습니다 (${rows.length}개 품목).`;
    }catch(err){slStatus.textContent='저장하지 못했습니다. 보기 전용 권한이면 관리자에게 편집 권한을 요청하세요.'}
    btn.disabled=false});
