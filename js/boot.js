/* 금호정공 사내 업무 시스템 · 시작: 로그인 확인 · 데이터 불러오기 · 첫 화면
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  renderAccts(); applyLogin();
  renderCal();
  (async()=>{
    if(!window.claude||!claude.use){status.textContent='저장소(Supabase)에 연결할 수 없습니다.';return}
    [db,user]=await Promise.all([claude.use('db'),claude.use('user')]);
    if(!db){status.textContent='로그인하면 공지를 보고 올릴 수 있습니다.';submit.disabled=true;return}
    if(user){try{myId=await user.id()}catch(e){}}
    db.collection('notices').orderBy('createdAt','desc').limit(30).onSnapshot(s=>{docs=s.docs;render()},
      ()=>{status.textContent='공지를 불러오지 못했습니다. 새로고침해 보세요.'});
    ['CAN','CAC'].forEach(k=>db.doc('boxguide/'+k).onSnapshot(sn=>{guides[k]=(sn.exists&&sn.data().map)||{}; guideInfo(); if(lastExtract&&pdest.value===k) runPlan()},()=>{}));
    ['생산입고','판매입력','구매입력'].forEach(k=>db.doc('ecount/'+k).onSnapshot(sn=>{ecT[k]=sn.exists?sn.data():null; if(ecf===k) ecShow()},()=>{}));
    db.doc('ecount/inventory').onSnapshot(sn=>{ecInvBase=sn.exists?sn.data():null; mergePrices()},()=>{});
    db.collection('pplans').orderBy('createdAt','desc').limit(800).onSnapshot(sn=>{pplanMap=new Map(sn.docs.map(d=>[d.id,d.data()])); onPplans()},()=>{});
    db.collection('requests').orderBy('createdAt','desc').limit(300).onSnapshot(sn=>{const first=!reqLoaded; const prev=new Map(reqs.map(r=>[r.id,r.data().status])); reqs=sn.docs; reqLoaded=true; onReqs(first,prev)},()=>{});
    db.collection('transfers').orderBy('createdAt','desc').limit(2000).onSnapshot(sn=>{xfers=sn.docs;renderXfers();renderRecon();try{renderBoard()}catch(e){}},()=>{xStatus.textContent='보낸 내역을 불러오지 못했습니다.'});
    db.collection('accounts').onSnapshot(sn=>{accounts=sn.docs;renderAccts()},()=>{});
    db.collection('plans').orderBy('createdAt','desc').limit(300).onSnapshot(sn=>{plans=sn.docs;renderPlans();try{renderBoard()}catch(e){}},()=>{});
    db.collection('complaints').orderBy('createdAt','desc').limit(2000).onSnapshot(sn=>{complaints=sn.docs;renderCal()},()=>{});
    db.collection('events').orderBy('createdAt','desc').limit(2000).onSnapshot(sn=>{events=sn.docs;renderCal()},()=>{});
    db.collection('trials').orderBy('createdAt','desc').limit(2000).onSnapshot(sn=>{trials=sn.docs;renderTrials()},()=>{});
    db.collection('claims').orderBy('createdAt','desc').limit(1000).onSnapshot(sn=>{claims=sn.docs;renderClaims();renderCal()},()=>{});
    db.collection('slips').orderBy('createdAt','desc').limit(200).onSnapshot(sn=>{slipsRaw=sn.docs;mergePrices()},()=>{});
    db.collection('iteminfo').onSnapshot(sn=>{infoMap=new Map(sn.docs.map(d=>[d.id,d.data()])); prodCache=null; onItemsOff()},()=>{});
    db.doc('products/master').onSnapshot(sn=>{setMaster(sn.exists?sn.data():null)},()=>{});
    db.collection('itemoff').onSnapshot(sn=>{offMap=new Map(sn.docs.map(d=>[d.id,d.data()])); onItemsOff()},()=>{});
    db.collection('prices').onSnapshot(sn=>{priceMap=new Map(sn.docs.map(d=>[d.id,d.data()]));mergePrices()},()=>{});
    db.collection('stock').orderBy('createdAt','desc').limit(20000).onSnapshot(s=>{moves=s.docs;renderStock();try{renderRecv();renderRecon()}catch(e){}},
      ()=>{sstatus.textContent='재고를 불러오지 못했습니다. 새로고침해 보세요.'});
    db.collection('records').orderBy('createdAt','desc').limit(500).onSnapshot(s=>{recs=s.docs;renderRecs()},
      ()=>{lstatus.textContent='기록을 불러오지 못했습니다. 새로고침해 보세요.'});
  })();
  (async()=>{try{if(await kumhoAuth.hasAdmin()) return}catch(e){return} document.getElementById('bootform').hidden=false})();
  (async()=>{if(loginExpired){await kumhoAuth.signOut(); return} let pr=null; try{pr=await kumhoAuth.current()}catch(e){return}
    if(!pr||pr.role==='none'){if(me||pr){me=null; clearLogin(); applyLogin()} return}
    const was=me; me=profToMe(pr); saveLogin(me); if(!was){location.reload();return} applyLogin()})();

  let start=(location.hash||'').slice(1);
  if(!ITEM[start]){try{start=localStorage.getItem('menu')}catch(e){}}
  go(ITEM[start]?start:'dash',false); renderDash();
