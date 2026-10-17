/* 금호정공 사내 업무 시스템 · 자재: 출하 계획표 보관 · 자재 현황판
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // 계획표 보관 (자재)
  let plans=[], planDocId=null, planSaving=null;
  async function savePlan(){
    if(!db||!lastPlan||!lastExtract||!canEditTeam('생산관리팀')) return;
    const {items,out,D,dest,missing}=lastPlan;
    const data={items:items.map(({item,name,per,ord,ship,pulled})=>({item,name,per,ord,ship,pulled})),out,missing,D,dest};
    const rec={file:lastExtract.file,dest,notes:lastExtract.notes||'',dates:out.map(o=>o.date),pallets:out.reduce((a,o)=>a+o.pallets.length,0),
      items:items.map(i=>i.item),data:JSON.stringify(data),extract:JSON.stringify(lastExtract),author:myId,updatedAt:Date.now()};
    try{if(planDocId) await db.collection('plans').doc(planDocId).update(rec);
      else{rec.createdAt=Date.now(); const ref=await db.collection('plans').add(rec); planDocId=ref.id}
      pstatus.textContent=pstatus.textContent.replace(/ · 저장됨$/,'')+' · 저장됨'}
    catch(e){pstatus.textContent+=' · 저장하지 못했습니다 (계획표가 너무 크거나 권한이 없음)'}}
  function openPlan(snap){const x=snap.data();
    try{const data=JSON.parse(x.data); lastExtract=JSON.parse(x.extract); planDocId=snap.id;
      lastPlan={...data,D:data.D,dest:data.dest}; pdest.value=data.dest; guideInfo();
      selDate=data.out[0]&&data.out[0].date; pwarn.hidden=true; renderPlan();
      pstatus.textContent=`저장된 계획표: ${x.file} · ${x.dest} · ${fmt(x.createdAt)} 작성`;
      document.getElementById('h-plan').scrollIntoView({block:'start'})}
    catch(e){pstatus.textContent='계획표를 열지 못했습니다.'}}
  async function renderPlans(){const tb=document.getElementById('pl-list'); tb.replaceChildren();
    const q=document.getElementById('pl-search').value.trim().toLowerCase(), dv=document.getElementById('pl-dest').value;
    const rows=plans.filter(p=>{const x=p.data(); return (!dv||x.dest===dv)&&(!q||[x.file,...(x.items||[]),...(x.dates||[])].some(v=>String(v).toLowerCase().includes(q)))});
    document.getElementById('pl-empty').hidden=rows.length>0;
    let ps={}; const ids=[...new Set(rows.map(p=>p.data().author).filter(Boolean))]; if(user&&ids.length){try{ps=await user.profiles(ids)}catch(e){}}
    for(const p of rows.slice(0,100)){const x=p.data(), tr=document.createElement('tr'); const c=(t,cl)=>{const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td);return td};
      c(fmt(x.createdAt),'num'); c(x.dest); c(x.file);
      const ds=x.dates||[]; c(ds.length?(ds[0].slice(5)+(ds.length>1?' ~ '+ds[ds.length-1].slice(5):'')+` (${ds.length}일)`):'—');
      c(String(x.pallets||0),'num'); c((ps[x.author]&&ps[x.author].name)||'직원');
      const a=c(''); a.style.whiteSpace='nowrap';
      const op=document.createElement('button'); op.type='button'; op.className='ghost'; op.textContent='열기'; op.onclick=()=>openPlan(p);
      const ex=document.createElement('button'); ex.type='button'; ex.className='ghost'; ex.textContent='엑셀'; ex.onclick=async()=>{openPlan(p); await exportPlan()};
      a.append(op,' ',ex);
      if(x.author&&x.author===myId){const del=document.createElement('button'); del.type='button'; del.className='ghost'; del.textContent='삭제';
        del.onclick=async()=>{if(del.dataset.c!=='1'){del.dataset.c='1';del.textContent='삭제 확인';return}
          try{await db.collection('plans').doc(p.id).delete(); if(planDocId===p.id) planDocId=null}catch(e){pstatus.textContent='지우지 못했습니다.'}};
        a.append(' ',del)}
      tb.append(tr)}}
  document.getElementById('pl-search').addEventListener('input',renderPlans);
  document.getElementById('pl-dest').addEventListener('change',renderPlans);

  // 자재 현황판: 재고 데이터 자동 점검
  function renderBoard(){
    const box=document.getElementById('bd-cards'); if(!box) return;
    const today=iso(new Date()), cards=[];
    const n=v=>Number(v||0).toLocaleString('ko-KR');
    const add=(lv,title,desc,rows,go)=>cards.push({lv,title,desc,rows,go});
    const m=stockMap(), live=[...m.values()];
    // 1. 마이너스 재고
    add('e','마이너스 재고','뺀 수량이 넣은 수량보다 많습니다. 입고 누락이나 잘못된 LOT로 뺀 경우가 많습니다.',
      live.filter(e=>e.qty<0).map(e=>[`${e.item} / ${lotLabel(e.lot)}`,`${n(e.qty)} EA`]),'stock');
    // 2. LOT 형식 확인
    const badLot=[]; const chk=(src,item,lot)=>{const L=String(lot||'').trim(); if(!L) return;
      if(/^\d{6}$/.test(L)) return; // 에스엘 등 숫자 LOT
      const dt=lotDate(L); if(!dt) badLot.push([`${src} · ${item} / ${L}`,'형식 다름']); else if(dt>today) badLot.push([`${src} · ${item} / ${L}`,`미래 ${dt.slice(2)}`])};
    live.filter(e=>e.qty!==0).forEach(e=>chk('재고',e.item,e.lot));
    recs.forEach(x=>{const v=x.data(); if(v.kind!=='원자재') chk(v.kind,v.item,v.lot)});
    xfers.forEach(x=>{const v=x.data(); chk('사상반',v.item,v.lot)});
    const seenL=new Set(); add('w','LOT 코드 확인','LOT 체계표(년·월·일 세 글자)로 풀리지 않거나 오늘 이후 날짜로 풀리는 LOT입니다. 오타일 수 있습니다.',
      badLot.filter(r=>{const k=r[0]; if(seenL.has(k)) return false; seenL.add(k); return true}),'stock');
    // 3. 사상반 ↔ 창고 오차 (전체 기간)
    const rc=new Map(), key=(i,l)=>String(i||'').trim()+'\u0000'+String(l||'').trim();
    xfers.forEach(x=>{const v=x.data(),k=key(v.item,v.lot),e=rc.get(k)||{item:v.item,lot:v.lot,s:0,g:0}; e.s+=Number(v.qty)||0; rc.set(k,e)});
    moves.forEach(x=>{const v=x.data(),q=Number(v.qty)||0; if(q<=0) return; const k=key(v.item,v.lot); const e=rc.get(k); if(e) e.g+=q});
    add('e','사상반 ↔ 창고 오차','사상반이 보냈다고 적은 수량과 창고 입고 수량이 다릅니다.',
      [...rc.values()].filter(e=>e.s!==e.g).sort((a,b)=>Math.abs(b.g-b.s)-Math.abs(a.g-a.s)).map(e=>[`${e.item} / ${lotLabel(e.lot)}`,`${e.g-e.s>0?'+':''}${n(e.g-e.s)}`]),'recon2');
    // 4. 중복 입력 의심 (같은 품번·LOT·수량을 10분 안에 두 번)
    const dup=[]; const mv=moves.map(x=>x.data()).filter(v=>!v.slip).sort((a,b)=>a.createdAt-b.createdAt);
    for(let i=1;i<mv.length;i++){const a=mv[i-1],b=mv[i]; if(a.item===b.item&&a.lot===b.lot&&a.qty===b.qty&&b.createdAt-a.createdAt<600000) dup.push([`${b.item} / ${lotLabel(b.lot)}`,`${n(b.qty)} · ${fmt(b.createdAt)}`])}
    add('w','중복 입력 의심','같은 품번·LOT·수량이 10분 안에 두 번 들어갔습니다. 실제로 두 번 들어온 것인지 확인해 주세요.',dup,'stock');
    // 5. 같은 품번 다른 표기
    const byN=new Map(); [...live.map(e=>e.item),...recs.map(x=>x.data().item),...xfers.map(x=>x.data().item)].filter(Boolean).forEach(it=>{const k=norm(it); const s2=byN.get(k)||new Set(); s2.add(String(it).trim()); byN.set(k,s2)});
    add('w','같은 품번 다른 표기','띄어쓰기나 대소문자만 다른 품번입니다. 재고가 둘로 나뉘어 보일 수 있습니다.',
      [...byN.values()].filter(v=>v.size>1).map(v=>[[...v].join(' / '),`${v.size}가지`]),'stock');
    // 6. 오래된 재고 (LOT 기준 180일 이상)
    const old=live.filter(e=>e.qty>0).map(e=>({e,dt:lotDate(e.lot)})).filter(x=>x.dt&&(Date.now()-new Date(x.dt))/864e5>=180)
      .sort((a,b)=>a.dt.localeCompare(b.dt)).map(x=>[`${x.e.item} / ${lotLabel(x.e.lot)}`,`${n(x.e.qty)} EA`]);
    add('w','오래된 재고','제조일(LOT)로부터 180일이 넘은 창고 재고입니다. 먼저 출하할지 확인해 주세요.',old,'stock');
    // 7. 불량률 높은 LOT (5% 이상)
    const inQ=new Map(); moves.forEach(x=>{const v=x.data(),q=Number(v.qty)||0; if(q>0){const k=String(v.lot||'').trim(); inQ.set(k,(inQ.get(k)||0)+q)}});
    xfers.forEach(x=>{const v=x.data(); const k=String(v.lot||'').trim(); if(!inQ.has(k)) inQ.set(k,Number(v.qty)||0)});
    const badQ=new Map(); recs.forEach(x=>{const v=x.data(); if(v.kind==='불량'){const k=String(v.lot||'').trim(); badQ.set(k,(badQ.get(k)||0)+(Number(v.qty)||0))}});
    add('w','불량률 높은 LOT','LOT별 불량 수량이 양품 입고의 5% 이상입니다.',
      [...badQ].map(([k,b])=>{const g=inQ.get(k)||0; return {k,b,g,rate:g?b/(g+b):1}}).filter(x=>x.b>0&&x.rate>=0.05).sort((a,b)=>b.rate-a.rate)
        .map(x=>[`LOT ${lotLabel(x.k)}`,x.g?`${(x.rate*100).toFixed(1)}% (${n(x.b)}/${n(x.g+x.b)})`:`불량 ${n(x.b)} · 입고 기록 없음`]),'lotqc');
    // 8. 입수표 없는 품번 (저장된 계획표 기준)
    const miss=new Map(); plans.slice(0,20).forEach(p=>{const x=p.data(); try{(JSON.parse(x.data).missing||[]).forEach(it=>{if(!guides[x.dest][it]) miss.set(x.dest+' '+it,[`${it}`,`${x.dest} ${PDEST[x.dest].box}`])})}catch(e){}});
    add('w','입수표 없는 품번','최근 계획표에서 박스당 입수가 없어 계산에서 빠진 품번입니다.',[...miss.values()],'plan');
    // 9. 단가 없는 판매·구매 전표
    if(can('price')) add('w','단가 없는 전표','판매·구매 전표 중 단가를 넣지 않은 품목입니다.',
      slips.flatMap(sp=>{const x=sp.data(); return x.type==='입고'?[]:x.rows.filter(o=>o.price==null||o.price==='').map(o=>[`${x.type} ${x.date} · ${x.partner} · ${o.item}`,`${n(o.qty)} EA`])}),'slipsale');
    // render
    const cnt={e:0,w:0}; cards.forEach(c=>{if(c.rows.length) cnt[c.lv]+=c.rows.length});
    const sum=document.getElementById('bd-sum'); sum.replaceChildren();
    [['e','오류',cnt.e],['w','확인 필요',cnt.w]].forEach(([c,l,v])=>{const sp=document.createElement('span'); sp.className=v?c:'o'; sp.append(l+' '); const b=document.createElement('b'); b.textContent=v; sp.append(b); sum.append(sp)});
    box.replaceChildren();
    cards.sort((a,b)=>(b.rows.length>0)-(a.rows.length>0)||(a.lv==='e'?-1:1)-(b.lv==='e'?-1:1)).forEach(c=>{
      const lv=c.rows.length?c.lv:'o', el=document.createElement('div'); el.className='bdcard '+lv;
      const h=document.createElement('div'); h.className='bh'; const t=document.createElement('b'); t.textContent=c.title; const k=document.createElement('span'); k.textContent=c.rows.length?c.rows.length+'건':'이상 없음'; h.append(t,k);
      const p=document.createElement('p'); p.textContent=c.desc; el.append(h,p);
      if(c.rows.length){const ul=document.createElement('ul'); c.rows.slice(0,6).forEach(([a,b])=>{const li=document.createElement('li'); const x=document.createElement('span'); x.textContent=a; x.title=a; const y=document.createElement('span'); y.textContent=b; li.append(x,y); ul.append(li)}); el.append(ul);
        const row=document.createElement('div'); row.className='row'; row.style.justifyContent='space-between';
        const more=document.createElement('span'); more.className='more'; more.textContent=c.rows.length>6?`외 ${c.rows.length-6}건`:'';
        const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent='확인하러 가기'; b.onclick=()=>go(c.go,true); row.append(more,b); el.append(row)}
      box.append(el)});
    document.getElementById('bd-at').textContent=fmt(Date.now())+' 점검';
  }
