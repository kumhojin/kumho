/* 금호정공 사내 업무 시스템 · 계발: 시험사출
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // ===== 품질 · 시험사출 =====
  let trials=[], trCur=null; const TF=['date','round','item','name','partner','mold','mc','resin','temp','mtemp','pres','speed','hold','cycle','dry','clamp','meter','weight','shot','cav','qty','good','result','owner','issue','fix','next'];
  const tg=id=>document.getElementById(id);
  const DEFECTS=['미성형','버(BURR)','싱크마크','웰드라인','휨·변형','은줄(실버)','기포·보이드','흑점·이물','가스 탄 자국','플로우마크','치수 불량','이형 불량'];
  DEFECTS.forEach(dn=>{const l=document.createElement('label'); const c=document.createElement('input'); c.type='checkbox'; c.value=dn; l.append(c,document.createTextNode(dn)); tg('t-defects').append(l)});
  const getDef=()=>[...tg('t-defects').querySelectorAll('input:checked')].map(c=>c.value);
  const setDef=a=>tg('t-defects').querySelectorAll('input').forEach(c=>c.checked=(a||[]).includes(c.value));
  function renderTrials(){const tb=tg('tr-list'); if(!tb) return; tb.replaceChildren();
    const q=(tg('tr-q').value||'').trim().toLowerCase();
    const all=trials.map(c=>({id:c.id,x:c.data()})).sort((a,b)=>(b.x.date||'').localeCompare(a.x.date||'')||(b.x.createdAt||0)-(a.x.createdAt||0));
    const list=q?all.filter(({x})=>[x.item,x.name,x.mold,x.partner,x.resin,x.owner,(x.defects||[]).join(' ')].join(' ').toLowerCase().includes(q)):all;
    list.forEach(({id,x})=>{const tr=document.createElement('tr'); if(id===trCur) tr.className='cur';
      const td=(t,c)=>{const e=document.createElement('td'); if(c) e.className=c; if(t instanceof Node) e.append(t); else e.textContent=t??''; tr.append(e)};
      td((x.date||'').slice(5).replace('-','/'),'nowrap'); td(x.round||'','nowrap');
      const pn=document.createElement('div'); pn.textContent=x.item||''; if(x.name){const sm=document.createElement('div'); sm.style.cssText='font-size:12px;color:var(--muted)'; sm.textContent=x.name; pn.append(sm)} td(pn);
      td(x.partner||''); td(x.mold||'','nowrap'); td(x.mc||'','nowrap'); td(x.resin||'');
      td([x.temp&&'실린더 '+x.temp+'℃',x.mtemp&&'금형 '+x.mtemp+'℃',x.pres&&'압력 '+x.pres,x.speed&&'속도 '+x.speed,x.hold&&'보압 '+x.hold,x.cycle&&'사이클 '+x.cycle+'초',x.dry&&'건조 '+x.dry,x.clamp&&'형체력 '+x.clamp+'t',x.weight&&'중량 '+x.weight+'g',x.cav&&'캐비티 '+x.cav].filter(Boolean).join(' · '),'note');
      td(x.qty!=null&&x.qty!==''?(x.good!=null&&x.good!==''?`${x.good}/${x.qty}`:String(x.qty)):'','nowrap');
      const rs=document.createElement('span'); rs.className='rs rs-'+(x.result||'진행중'); rs.textContent=x.result||'진행중'; td(rs);
      td([(x.defects||[]).length?'['+x.defects.join(', ')+']':'',x.issue,x.fix&&'→ '+x.fix].filter(Boolean).join('\n'),'note'); td(x.owner||'','nowrap');
      tr.onclick=()=>trEdit(id,x); tb.append(tr)});
    tg('tr-empty').hidden=!!list.length;
    const sum=tg('tr-sum'); sum.replaceChildren(); const cnt=r=>all.filter(({x})=>(x.result||'진행중')===r).length;
    [['전체',all.length],['진행중',cnt('진행중')+cnt('재시험')],['합격',cnt('합격')+cnt('조건부')],['불합격',cnt('불합격')]].forEach(([l,n])=>{const sp=document.createElement('span'); sp.textContent=l+' '; const b=document.createElement('b'); b.textContent=n+'건'; sp.append(b); sum.append(sp)})}
  tg('tr-q').addEventListener('input',renderTrials);
  function trEdit(id,x){trCur=id; x=x||{}; TF.forEach(k=>{const e=tg('t-'+k); e.value=x[k]??(k==='result'?'진행중':'')}); setDef(x.defects);
    if(!id&&!x.date) tg('t-date').value=todayISO;
    tg('tr-ftitle').textContent=id?`${x.item||''} ${x.round||''} 수정`:'새 시험사출 기록'; tg('tr-del').hidden=!id; tg('tr-copy').hidden=!id; tg('tr-del').dataset.c=''; tg('tr-del').textContent='삭제'; tg('tr-status').textContent='';
    renderTrials(); if(id) tg('trform').scrollIntoView({behavior:'smooth',block:'start'})}
  tg('tr-new').onclick=()=>trEdit(null);
  tg('tr-copy').onclick=()=>{const c=trials.find(t=>t.id===trCur); if(!c) return; const x={...c.data()};
    const m=String(x.round||'').match(/(\d+)/); x.round=m?String(x.round).replace(m[1],Number(m[1])+1):''; x.date=x.next||todayISO; x.next=''; x.result='진행중'; x.qty=''; x.good=''; x.issue=''; x.fix=''; x.defects=[];
    trEdit(null,x); tg('tr-status').textContent='조건을 복사했습니다. 바뀐 값만 고치고 저장하세요.'};
  tg('trform').addEventListener('submit',async e=>{e.preventDefault(); const st=tg('tr-status');
    if(!db||!canEditTeam('계발')){st.textContent='계발 수정 권한이 있어야 저장할 수 있습니다.';return}
    const rec={}; TF.forEach(k=>{let v=tg('t-'+k).value.trim(); if((k==='qty'||k==='good')&&v!=='') v=Number(v); rec[k]=v}); rec.item=String(rec.item).toUpperCase(); rec.defects=getDef(); rec.updatedBy=myId; rec.updatedAt=Date.now();
    if(trCur){const old=trials.find(c=>c.id===trCur), ox=old?old.data():{};
      const LB={date:'시험일',round:'차수',item:'품번',name:'품명',partner:'거래처',mold:'금형 번호',mc:'호기',resin:'원료',temp:'실린더 온도',mtemp:'금형 온도',pres:'사출 압력',speed:'사출 속도',hold:'보압 · 시간',cycle:'사이클',dry:'건조',clamp:'형체력',meter:'계량 · 배압',weight:'제품 중량',shot:'런너 포함 중량',cav:'캐비티 수',qty:'시험 수량',good:'양품 수량',result:'결과',owner:'담당',issue:'문제점',fix:'개선 사항',next:'다음 시험 예정일'};
      const ch=diffOf(TF.map(k=>({k,label:LB[k]||k})),ox,rec); const od=(ox.defects||[]).join(', '), nd=(rec.defects||[]).join(', '); if(od!==nd) ch.push({label:'성형 불량',old:od,new:nd});
      if(!ch.length){st.textContent='바뀐 내용이 없습니다.';return}
      if(!await confirmDiff(`${ox.item||''} ${ox.round||''} 시험사출 수정`,ch)){st.textContent='변경을 취소했습니다.';return}}
    try{if(trCur){const old=trials.find(c=>c.id===trCur); await db.collection('trials').doc(trCur).set({...(old?old.data():{}),...rec})}
      else{rec.createdAt=Date.now(); rec.author=myId; const r=await db.collection('trials').add(rec); trCur=r.id}
      st.textContent='저장했습니다.'; tg('tr-del').hidden=false; tg('tr-copy').hidden=false}catch(err){st.textContent='저장하지 못했습니다. 권한을 확인해 주세요.'}});
  tg('tr-del').onclick=async()=>{const b=tg('tr-del'); if(!trCur) return; if(b.dataset.c!=='1'){b.dataset.c='1'; b.textContent='삭제 확인'; return}
    try{await db.collection('trials').doc(trCur).delete(); trEdit(null); tg('tr-status').textContent='삭제했습니다.'}catch(e){tg('tr-status').textContent='지우지 못했습니다.'}};
