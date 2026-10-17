/* 금호정공 사내 업무 시스템 · 자재: LOT 기록 · 완제품 재고
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // 원자재·초물·불량 LOT 기록
  const lform=document.getElementById('lform'), lbody=document.getElementById('lbody'),
        lempty=document.getElementById('lempty'), lstatus=document.getElementById('l-status'),
        lsearch=document.getElementById('l-search'), lsubmit=document.getElementById('l-submit');
  const ldate=document.getElementById('l-date');
  const iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  ldate.value=iso(d);
  let recs=[], tab='전체';
  try{const t=localStorage.getItem('lotTab'); if(t) tab=t}catch(e){}
  document.querySelectorAll('#ltabs button').forEach(b=>{
    b.setAttribute('aria-selected',b.dataset.k===tab);
    b.onclick=()=>{tab=b.dataset.k;try{localStorage.setItem('lotTab',tab)}catch(e){}
      document.querySelectorAll('#ltabs button').forEach(x=>x.setAttribute('aria-selected',x===b));
      if(tab!=='전체'){document.getElementById('l-kind').value=tab; kindChanged()} showCalc(); renderRecs()};
  });
  lsearch.addEventListener('input',renderRecs);
  function showCalc(){}
  showCalc();
  let loc='전체';
  try{const t=localStorage.getItem('lotLoc'); if(t) loc=t}catch(e){}
  const LOCNAME={'사상반':'사상반 (반제품)'};
  const DEFLOC={'원자재':'창고','완제품':'창고','반제품':'사상반'};
  const lkind=document.getElementById('l-kind'), lloc=document.getElementById('l-loc');
  function kindChanged(){const k=lkind.value; document.getElementById('l-locwrap').hidden=k==='불량'; if(DEFLOC[k]) lloc.value=DEFLOC[k]}
  lkind.addEventListener('change',kindChanged); kindChanged();
  document.querySelectorAll('#llocs button').forEach(b=>{
    b.setAttribute('aria-pressed',b.dataset.l===loc);
    b.onclick=()=>{loc=b.dataset.l;try{localStorage.setItem('lotLoc',loc)}catch(e){}
      document.querySelectorAll('#llocs button').forEach(x=>x.setAttribute('aria-pressed',x===b));
      if(loc!=='전체') document.getElementById('l-loc').value=loc; renderRecs()};
  });
  async function renderRecs(){
    renderDash(); const term=lsearch.value.trim().toLowerCase();
    const inTab=recs.filter(s=>tab==='전체'||s.data().kind===tab);
    const isBad=tab==='불량';
    document.getElementById('llocs').hidden=isBad;
    const stock=inTab.filter(s=>s.data().kind!=='불량');
    const lterm=lsearch.value.trim().toLowerCase();
    document.querySelectorAll('#llocs button').forEach(b=>{const el=b.querySelector('b');
      if(!lterm){el.textContent='';el.hidden=true;return}
      el.hidden=false; el.textContent=stock.filter(s=>{const x=s.data();return (b.dataset.l==='전체'||x.loc===b.dataset.l)&&
        (lotHit(x.lot,lterm)||[x.item,x.memo].some(v=>String(v||'').toLowerCase().includes(lterm)))}).length+'건'});
    // LOT별 불량 합계
    const bad=recs.filter(s=>s.data().kind==='불량'), sum=new Map();
    for(const s of bad){const x=s.data(),k=(x.lot||'')+'\u0000'+(x.item||'');
      const e=sum.get(k)||{lot:x.lot,item:x.item,qty:0,n:0}; e.qty+=Number(x.qty)||0; e.n++; sum.set(k,e)}
    document.getElementById('lsum').hidden=!isBad||sum.size===0;
    const sb=document.getElementById('lsumbody'); sb.replaceChildren();
    [...sum.values()].sort((a,b)=>b.qty-a.qty).forEach(e=>{const tr=document.createElement('tr');
      [[e.lot],[e.item],[e.qty.toLocaleString('ko-KR'),'num'],[e.n,'num']].forEach(([t,c])=>{const td=document.createElement('td');td.textContent=t;if(c){td.className=c;td.style.textAlign='right'}tr.append(td)});sb.append(tr)});
    const rows=inTab.filter(s=>{const r=s.data();return (isBad||loc==='전체'||(r.kind!=='불량'&&r.loc===loc))&&
      (!term||(lotHit(r.lot,term)||[r.item,r.memo].some(v=>String(v||'').toLowerCase().includes(term))))});
    lbody.replaceChildren(); lempty.hidden=rows.length>0;
    if(recs.length&&!rows.length) lempty.textContent='조건에 맞는 기록이 없습니다. 탭이나 검색어를 바꿔 보세요.';
    else lempty.textContent='아직 기록이 없습니다. 구분·날짜·품번·LOT 번호를 넣고 ‘기록 추가’를 누르면 모든 직원이 함께 봅니다.';
    let ps={}; const ids=[...new Set(rows.map(s=>s.data().author).filter(Boolean))];
    if(user&&ids.length){try{ps=await user.profiles(ids)}catch(e){}}
    for(const s of rows){
      const r=s.data(), tr=document.createElement('tr');
      const cell=(txt,cls)=>{const td=document.createElement('td');if(cls)td.className=cls;td.textContent=txt??'';tr.append(td);return td};
      const k=cell(''); const sp=document.createElement('span'); sp.className='kind '+r.kind; sp.textContent=r.kind; k.append(sp);
      cell(LOCNAME[r.loc]||r.loc||'—'); cell(r.date,'num'); cell(r.item); cell(lotLabel(r.lot),'lotc'); mcell(cell(''),r.item,r.lot,r.date);
      cell(r.qty!=null&&r.qty!==''?`${Number(r.qty).toLocaleString('ko-KR')} ${r.unit||''}`:'—','num');
      cell(r.memo); cell((ps[r.author]&&ps[r.author].name)||'직원');
      const act=cell('');
      if(r.author&&(r.author===myId||isAdm())){
        act.style.whiteSpace='nowrap';
        act.append(editBtn(()=>editDoc({col:'records',id:s.id,data:r,title:`${r.kind||''} LOT 기록 수정`,fields:[{k:'date',label:'일자',type:'date',req:true},{k:'item',label:'품번',req:true,upper:true},{k:'lot',label:'LOT',upper:true},{k:'qty',label:'수량',type:'number'},{k:'unit',label:'단위'},{k:'memo',label:'메모',wide:true}]})));
        const del=document.createElement('button'); del.type='button'; del.className='ghost'; del.textContent='삭제';
        del.onclick=async()=>{ if(del.dataset.c!=='1'){del.dataset.c='1';del.textContent='삭제 확인';return}
          try{await db.collection('records').doc(s.id).delete()}catch(e){lstatus.textContent='삭제하지 못했습니다. 권한을 확인해 주세요.'} };
        act.append(del);
      }
      lbody.append(tr);
    }
  }
  lform.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!db){lstatus.textContent='기록 저장은 로그인한 직원만 할 수 있습니다.';return}
    const g=id=>document.getElementById(id).value.trim();
    const rec={kind:g('l-kind'),loc:g('l-kind')==='불량'?'':g('l-loc'),date:g('l-date'),item:g('l-item'),lot:g('l-lot'),
      qty:g('l-qty')===''?null:Number(g('l-qty')),unit:g('l-unit'),memo:g('l-memo'),author:myId,createdAt:Date.now()};
    if(!rec.item||!rec.lot) return;
    lsubmit.disabled=true; lstatus.textContent='저장 중…';
    try{await db.collection('records').add(rec);
      ['l-item','l-lot','l-qty','l-memo'].forEach(id=>document.getElementById(id).value='');
      lstatus.textContent=`${rec.loc?(LOCNAME[rec.loc]||rec.loc)+' ':''}${rec.kind} 기록을 추가했습니다 (LOT ${rec.lot}).`;
    }catch(err){lstatus.textContent='저장하지 못했습니다. 보기 전용 권한이면 관리자에게 편집 권한을 요청하세요.'}
    lsubmit.disabled=false;
  });

  // 완제품 재고 (입출고 이력의 합)
  const sform=document.getElementById('sform'), sstatus=document.getElementById('s-status'), ssearch=document.getElementById('s-search');
  let moves=[];
  function stockMap(){const m=new Map();
    for(const s of moves){const x=s.data(), k=(x.item||'')+'\u0000'+(x.lot||'');
      const e=m.get(k)||{item:x.item,lot:x.lot,qty:0,last:0,lastQ:0}; e.qty+=Number(x.qty)||0;
      if(x.createdAt>e.last){e.last=x.createdAt;e.lastQ=Number(x.qty)||0} m.set(k,e)}
    return m}
  function renderStock(){
    const term=ssearch.value.trim().toLowerCase(), m=stockMap();
    const rows=[...m.values()].filter(e=>e.qty!==0&&(!term||(lotHit(e.lot,term)||String(e.item||'').toLowerCase().includes(term))))
      .sort((a,b)=>String(a.item).localeCompare(String(b.item))||lotSortKey(a.lot).localeCompare(lotSortKey(b.lot)));
    const sb=document.getElementById('sbody'); sb.replaceChildren();
    let total=0;
    for(const e of rows){total+=e.qty; const tr=document.createElement('tr');
      const c=(t,cl)=>{const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td)};
      c(e.item); c(lotLabel(e.lot)); {const td=document.createElement('td'); mcell(td,e.item,e.lot); tr.append(td)} c(e.qty.toLocaleString('ko-KR'),'num');
      c(`${e.lastQ>0?'+':''}${e.lastQ.toLocaleString('ko-KR')} · ${fmt(e.last)}`); sb.append(tr)}
    document.getElementById('s-total').textContent=total.toLocaleString('ko-KR'); if(typeof renderRecon==='function') try{renderRecon()}catch(e){}
    document.querySelector('.stable tfoot').hidden=!term||!rows.length;
    document.querySelector('.stable tfoot th').textContent=term?`‘${ssearch.value.trim()}’ 합계`:'합계'; renderDash();
    document.getElementById('sempty').hidden=rows.length>0;
    prodCache=null; try{buildItemList()}catch(e){}
    const log=document.getElementById('slog'); log.replaceChildren();
    for(const s of moves.slice(0,100)){const x=s.data(), li=document.createElement('li'), q=Number(x.qty)||0;
      li.className=q>0?'in':'out';
      li.textContent=`${fmt(x.createdAt)}  ${q>0?'추가':'빼기'} ${Math.abs(q).toLocaleString('ko-KR')} EA · ${x.item} / LOT ${x.lot}${x.memo?' · '+x.memo:''}`; log.append(li)}
  }
  ssearch.addEventListener('input',renderStock);
  sform.addEventListener('submit',async e=>{
    e.preventDefault();
    const op=(e.submitter&&e.submitter.dataset.op)||'in';
    if(!db){sstatus.textContent='재고 저장은 로그인한 직원만 할 수 있습니다.';return}
    const item=document.getElementById('s-item').value.trim(), lot=document.getElementById('s-lot').value.trim(),
          n=Math.floor(Number(document.getElementById('s-qty').value)), memo=document.getElementById('s-memo').value.trim();
    if(!item||!lot||!(n>0)){sstatus.textContent='품번, LOT, 수량(1 이상)을 넣어 주세요.';return}
    if(op==='out'){const cur=(stockMap().get(item+'\u0000'+lot)||{qty:0}).qty;
      if(n>cur){sstatus.textContent=`${item} / LOT ${lot} 재고는 ${cur.toLocaleString('ko-KR')} EA입니다. 그보다 많이 뺄 수 없습니다.`;return}}
    document.getElementById('s-in').disabled=document.getElementById('s-out').disabled=true; sstatus.textContent='저장 중…';
    try{await db.collection('stock').add({item,lot,qty:op==='in'?n:-n,memo,author:myId,createdAt:Date.now()});
      document.getElementById('s-qty').value=''; document.getElementById('s-memo').value='';
      sstatus.textContent=`${item} / LOT ${lot}: ${n.toLocaleString('ko-KR')} EA ${op==='in'?'추가':'뺐습니다'}${op==='in'?'했습니다':''}.`;
    }catch(err){sstatus.textContent='저장하지 못했습니다. 보기 전용 권한이면 관리자에게 편집 권한을 요청하세요.'}
    document.getElementById('s-in').disabled=document.getElementById('s-out').disabled=false;
  });


  let sample=null, sampleTried=false;
