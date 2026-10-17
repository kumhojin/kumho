/* 금호정공 사내 업무 시스템 · 로그인 · 권한 확인 · 계정 관리
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // 로그인 (아이디·비밀번호, 비밀번호는 PBKDF2 해시로만 비교)
  const ADMIN={user:'__none__'};
  const ITER=150000; let accounts=[], me=null;
  const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
  const unhex=h=>new Uint8Array(h.match(/../g).map(x=>parseInt(x,16)));
  async function pbk(pw,saltHex){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
    return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(saltHex),iterations:ITER},k,256))}
  const ALLTEAMS=['생산관리팀','생산','품질','계발','총무팀','고객대응'];
  // 작업자: 작업장별로 쓸 수 있는 화면
  const WORK={'생산':{team:'생산',items:['reqnew']},'사상반':{team:'생산',items:['xfer']},'자재':{team:'생산관리팀',items:['recv']}};
  function isWorker(){return !!me&&me.role==='worker'}
  function workItems(){const w=WORK[me&&me.station]||WORK['사상반']; return w.items}
  const EXECS=['사장','전무','상무'];
  function permOf(a){const p={teams:{},notice:false,price:false,complaint:true};
    if(a&&a.role==='worker'){const w=WORK[a.station]||WORK['사상반']; ALLTEAMS.forEach(t=>p.teams[t]=t===w.team?'edit':'none'); p.complaint=false; return p}
    if(!a) return p; if(a.role==='admin'){p.lead=false; p.title=''; p.complaint=false;
      // 관리자도 자동으로 주는 권한 없음: 계정 관리에서 체크한 것만
      ALLTEAMS.forEach(t=>p.teams[t]=(a.perm&&a.perm.teams&&a.perm.teams[t])||'none'); const k=a.perm||{};
      p.notice=!!k.notice; p.complaint=!!k.complaint; p.item=!!k.item; p.priceEdit=!!k.priceEdit; p.itemToggle=!!k.itemToggle; p.history=!!k.history; p.import=!!k.import; p.hr=!!k.hr; p.price=p.priceEdit;
      return p}
    if(a.perm&&a.perm.teams){ALLTEAMS.forEach(t=>p.teams[t]=a.perm.teams[t]||'none'); p.notice=!!a.perm.notice; p.complaint=a.perm.complaint!==false; p.lead=!!a.perm.lead; p.manager=!!a.perm.manager; p.title=EXECS.includes(a.perm.title)?a.perm.title:''; p.item=!!a.perm.item; p.priceEdit=!!a.perm.priceEdit; p.itemToggle=!!a.perm.itemToggle; p.history=!!a.perm.history; p.import=!!a.perm.import; p.hr=!!a.perm.hr; p.price=p.lead||!!p.title||p.priceEdit; return p}
    const acc=Array.isArray(a.access)?a.access:ALLTEAMS; ALLTEAMS.forEach(t=>p.teams[t]=acc.includes(t)?'edit':'none'); return p}
  // 팀장: DB에는 role 'user' + perm.lead=true 로 저장 (기존 부서 권한 규칙을 그대로 씀)
  const EXEC=['사장','전무','상무'];
  const isExecAcct=a=>!!a&&a.role==='user'&&!!(a.perm&&EXEC.includes(a.perm.title));
  // 시스템 관리자(admin): 계정 관리 전용 · 관리자(manager): 일반 직원처럼 권한을 받는 역할 (DB에는 role 'user' + perm.manager)
  const isMgrAcct=a=>!!a&&a.role==='user'&&!!(a.perm&&a.perm.manager);
  const roleVal=a=>a.role==='admin'?'admin':a.role==='worker'?'worker':isExecAcct(a)?'exec:'+a.perm.title:isMgrAcct(a)?'manager':isLeadAcct(a)?'lead':'user';
  const roleLabel=a=>a.role==='admin'?'시스템 관리자':isMgrAcct(a)?'관리자':a.role==='worker'?(a.station==='생산'?'생산 작업자':a.station==='사상반'?'생산 사상반':'자재 작업자'):isExecAcct(a)?a.perm.title:isLeadAcct(a)?'팀장':'일반';
  function canSeePrice(){return !!me&&can('price')}
  const isLeadAcct=a=>!!a&&a.role!=='admin'&&a.role!=='worker'&&!!(a.perm&&a.perm.lead);
  const ITEM_TEAMS=['생산관리팀','자재','품질','생산'];
  function canToggleItems(){return !!me&&can('itemToggle')}
  function accessOf(a){const p=permOf(a); return ALLTEAMS.filter(t=>p.teams[t]!=='none')}
  // 고객대응(클레임): 계정 관리의 '고객대응' 권한 (보기+수정 / 보기만 / 숨김)
  function claimOK(){return !!me&&me.role!=='worker'&&permOf(me).teams['고객대응']==='edit'}
  // 메뉴 보이기: 부서 권한이 '숨김'이 아닌 것
  function canSee(t){return t==='홈'||!me||accessOf(me).includes(t)}
  function canEditTeam(t){if(!me) return false; if(t==='홈') return true; return permOf(me).teams[t]==='edit'}
  function can(k){return !!me&&permOf(me)[k]}
  // 공통 메뉴 중 권한이 필요한 것: 계정 관리 · 변경 기록 = 시스템 관리자, 거래 내역 · 자료 가져오기 = 계정 관리에서 체크한 사람
  function menuOK(id){if(!me) return true; if(id==='acct'||id==='audit') return me.role==='admin'; if(id==='hist') return !!(can('history')||can('import')); if(id==='imp') return !!can('import'); return true}
  const LBL={edit:'수정',view:'보기',none:'숨김'};
  function findAcct(u){u=String(u||'').trim().toLowerCase(); const a=accounts.find(x=>x.data().user===u); return a?a.data():null}
  // 로그인은 하루 한 번: 같은 날(이 기기) 동안 유지, 날짜가 바뀌면 다시 로그인
  const dayKey=()=>{const t=new Date();return `${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()}`};
  function saveLogin(m){try{localStorage.setItem('kumhoLogin',JSON.stringify({...m,day:dayKey()}))}catch(x){}}
  function clearLogin(){try{localStorage.removeItem('kumhoLogin');sessionStorage.removeItem('kumhoLogin')}catch(x){} try{window.kumhoAuth&&kumhoAuth.signOut()}catch(x){}}
  let loginExpired=false;
  function loadLogin(){try{const v=JSON.parse(localStorage.getItem('kumhoLogin')||'null'); if(v&&v.user&&v.day===dayKey()){const {day,...m}=v; return m} if(v){loginExpired=true; clearLogin()}}catch(x){} return null}
  // 오후 5:30 퇴근 시간 알림 (하루 한 번)
  const endBox=document.getElementById('endday');
  function endCheck(){if(!me){endBox.hidden=true;return} const t=new Date();
    if(t.getHours()*60+t.getMinutes()<17*60+30) return;
    let asked=null; try{asked=localStorage.getItem('kumhoEndAsked')}catch(x){}
    if(asked===dayKey()||!endBox.hidden) return; endBox.hidden=false; document.getElementById('endday-out').focus()}
  function endDone(){try{localStorage.setItem('kumhoEndAsked',dayKey())}catch(x){} endBox.hidden=true}
  document.getElementById('endday-stay').onclick=endDone;
  document.getElementById('endday-out').onclick=()=>{endDone(); me=null; clearLogin(); applyLogin()};
  setInterval(()=>{if(me&&!loadLogin()){me=null; applyLogin()} endCheck()},30000);
  setTimeout(endCheck,1500);
  function applyLogin(){const L=document.getElementById('login'); myId=me?me.user:null; if(!me){document.body.classList.remove('worker'); try{document.getElementById('bell').hidden=true;document.getElementById('bellpanel').hidden=true}catch(e){}}
    if(me){L.hidden=true; document.body.classList.remove('locked'); applyPerm();
      document.getElementById('who-name').textContent=`${me.name} · ${me.role==='worker'?(me.station==='생산'?'생산 작업자':me.station==='사상반'?'생산 사상반':'자재 작업자'):(me.team||'')}${me.role==='admin'?' · 시스템 관리자':isMgrAcct(me)?' · 관리자':isExecAcct(me)?' · '+me.perm.title:isLeadAcct(me)?' · 팀장':''}`;
      side.querySelectorAll('.sg').forEach(w=>{const g=MENU.find(m=>m.g===w.dataset.g), t=g&&g.items[0]&&g.items[0][2]; w.hidden=!!t&&!canSee(t)});
      side.querySelectorAll('.sitem').forEach(b=>{if(!menuOK(b.dataset.m)){b.hidden=true;return} b.hidden=isWorker()&&!workItems().includes(b.dataset.m)});
      if(isWorker()) side.querySelectorAll('.sg').forEach(w=>{w.hidden=![...w.querySelectorAll('.sitem'),...((w._box&&w._box.querySelectorAll('.sitem'))||[])].some(b=>!b.hidden)});
      document.body.classList.toggle('worker',isWorker());
      try{renderRcAlert(); renderBell(); renderReqBadges(); renderReqs(); renderXfers(); renderRecv()}catch(e){}
      try{renderCal()}catch(e){}
      const cur=ITEM[curItem]; if(!menuOK(curItem)||(cur&&!canSee(cur.t))||(isWorker()&&!workItems().includes(curItem))) go(isWorker()?workItems()[0]:'dash',false)}
    else{L.hidden=false; document.body.classList.add('locked'); setTimeout(()=>document.getElementById('lg-user').focus(),0)}}
  const profToMe=pr=>({user:pr.username,name:pr.name,team:pr.team,role:pr.role,station:pr.station||'',perm:permOf({role:pr.role,station:pr.station,perm:pr.perm})});
  document.getElementById('lgform').addEventListener('submit',async e=>{e.preventDefault();
    const st=document.getElementById('lg-status'), btn=document.getElementById('lg-btn'); st.textContent=''; st.className='status';
    const u=document.getElementById('lg-user').value.trim().toLowerCase(), p=document.getElementById('lg-pass').value;
    btn.disabled=true; btn.textContent='확인 중…';
    try{const pr=await kumhoAuth.signIn(u,p);
      if(!pr||pr.role==='none'){await kumhoAuth.signOut(); st.className='status bad'; st.textContent='아직 권한이 없는 계정입니다. 관리자에게 권한을 요청하세요.'}
      else{me=profToMe(pr); saveLogin(me); document.getElementById('lg-pass').value=''; st.className='status ok'; st.textContent='로그인했습니다. 불러오는 중…'; location.reload(); return}}
    catch(x){const m=String(x&&x.message||''); st.className='status bad'; st.textContent=/invalid login|credentials/i.test(m)?'아이디 또는 비밀번호가 맞지 않습니다.':/rate|too many/i.test(m)?'시도가 너무 많습니다. 잠시 후 다시 해 주세요.':'로그인하지 못했습니다. 인터넷 연결을 확인해 주세요.'}
    btn.disabled=false; btn.textContent='로그인'});
  // 처음 관리자 계정 만들기 (관리자가 아무도 없을 때만 보임)
  document.getElementById('bootform').addEventListener('submit',async e=>{e.preventDefault(); const st=document.getElementById('bt-status'), btn=document.getElementById('bt-btn');
    const u=document.getElementById('bt-user').value.trim().toLowerCase(), n=document.getElementById('bt-name').value.trim(), p1=document.getElementById('bt-pass').value, p2=document.getElementById('bt-pass2').value;
    if(p1!==p2){st.textContent='비밀번호가 서로 다릅니다.';return} if(p1.length<8){st.textContent='비밀번호는 8자 이상으로 해 주세요.';return}
    btn.disabled=true; st.textContent='만드는 중…';
    try{await kumhoAuth.register(u,n,p1); document.getElementById('bootform').reset(); st.textContent=`${u} 계정을 만들었습니다. 관리자 권한이 켜지면 위에서 로그인하세요.`}
    catch(x){st.textContent=/registered|exists/i.test(String(x&&x.message))?'이미 있는 아이디입니다.':'만들지 못했습니다: '+String(x&&x.message||'')}
    btn.disabled=false});
  const pwBox=document.getElementById('pwbox');
  document.getElementById('pw-open').onclick=()=>{document.getElementById('pwform').reset(); document.getElementById('pw-status').textContent=''; pwBox.hidden=false; document.getElementById('pw-old').focus()};
  document.getElementById('pw-cancel').onclick=()=>{pwBox.hidden=true};
  document.getElementById('pwform').addEventListener('submit',async e=>{e.preventDefault(); const st=document.getElementById('pw-status'), btn=document.getElementById('pw-save');
    const o=document.getElementById('pw-old').value, a=document.getElementById('pw-new').value, b=document.getElementById('pw-new2').value;
    if(a!==b){st.textContent='새 비밀번호가 서로 다릅니다.';return} if(a.length<8){st.textContent='새 비밀번호는 8자 이상으로 해 주세요.';return} if(a===o){st.textContent='지금 비밀번호와 다르게 해 주세요.';return}
    btn.disabled=true; st.textContent='바꾸는 중…';
    try{await kumhoAuth.changeMyPassword(o,a); document.getElementById('pwform').reset(); st.textContent='비밀번호를 바꿨습니다. 다음 로그인부터 새 비밀번호를 쓰세요.'}
    catch(x){st.textContent=String(x&&x.message||'바꾸지 못했습니다.')}
    btn.disabled=false});
  document.getElementById('logout').onclick=()=>{me=null; clearLogin(); applyLogin()};
  me=loadLogin();
  function renderAccts(){const tb=document.getElementById('ac-list'); tb.replaceChildren();
    // 부서별로 묶고, 부서 안에서는 팀장이 맨 위 → 관리자 → 일반 → 작업자, 같으면 이름 순
    const TORD=['본사','총무팀','생산관리팀','생산','품질','계발'], TLBL={'생산관리팀':'자재 · 생산관리팀'};
    const rank=x=>x.role==='admin'?0:isExecAcct(x)?({사장:1,전무:2,상무:3}[x.perm.title]||3):isLeadAcct(x)?4:isMgrAcct(x)?5:x.role==='worker'?7:6;
    const tk=x=>{const i=TORD.indexOf(x.team||''); return i<0?TORD.length:i};
    const rows=[...accounts].sort((a,b)=>{const x=a.data(), y=b.data(); return tk(x)-tk(y)||String(x.team||'').localeCompare(String(y.team||''))||rank(x)-rank(y)||String(x.name||x.user).localeCompare(String(y.name||y.user))});
    let lastTeam=null;
    rows.forEach(s=>{const x=s.data(), tr=document.createElement('tr');
      if((x.team||'')!==lastTeam){lastTeam=x.team||''; const n=rows.filter(r=>(r.data().team||'')===lastTeam).length;
        const h=document.createElement('tr'); h.className='acgrp'; const td=document.createElement('td'); td.colSpan=7; td.textContent=`${TLBL[lastTeam]||lastTeam||'부서 없음'} · ${n}명`; h.append(td); tb.append(h)} const c=t=>{const td=document.createElement('td');td.textContent=t;tr.append(td);return td};
      c(x.user); c(x.name); c(x.team||''); c(roleLabel(x)); c(x.role==='worker'?(x.station==='자재'?'생산에서 받은 내역 입력':x.station==='생산'?'재료 요청':'자재로 보낸 내역·불량 입력'):ALLTEAMS.map(t=>`${t==='생산관리팀'?'자재':t} ${LBL[permOf(x).teams[t]]}`).join(' · '));
      {const p=permOf(x); c(x.role==='worker'?'입력만':[p.notice&&'공지',p.price&&(p.priceEdit?'단가 수정':'단가'),p.item&&'품목 수정',p.itemToggle&&'사용·미사용',p.history&&'거래 내역',p.import&&'가져오기'].filter(Boolean).join(', ')||'없음')}
      const a=c(''); a.style.whiteSpace='nowrap'; const self=!!(me&&me.user===x.user); if(!x.fixed){const ed=document.createElement('button'); ed.type='button'; ed.className='ghost'; ed.textContent='수정';
        ed.onclick=()=>{document.getElementById('ac-user').value=x.user; document.getElementById('ac-name').value=x.name||''; document.getElementById('ac-team').value=x.team||'생산';
          setRoleOptions(x.team||'생산',x.role==='admin'); document.getElementById('ac-role').value=roleVal(x); document.getElementById('ac-station').value=x.station||'사상반'; acRoleUI(); document.getElementById('ac-pass').value='';
          const p=permOf(x); document.querySelectorAll('#ac-perm select').forEach(sel=>sel.value=p.teams[sel.dataset.t]||'none');
          document.querySelectorAll('#ac-keys input').forEach(i=>i.checked=!!p[i.value]);
          document.getElementById('ac-role').disabled=self;
          document.getElementById('ac-status').textContent=self?'내 계정을 고치는 중입니다. 내 권한(시스템 관리자)은 바꿀 수 없고, 부서 권한과 주요 정보 권한만 바꿀 수 있습니다.':`${x.user} 계정을 고치는 중입니다. 비밀번호 칸을 비우면 그대로 둡니다.`; document.getElementById('ac-user').focus()};
        a.append(ed,' '); if(self) return void tb.append(tr); const del=document.createElement('button'); del.type='button'; del.className='ghost'; del.textContent='삭제';
        del.onclick=async()=>{if(del.dataset.c!=='1'){del.dataset.c='1';del.textContent='삭제 확인';return}
          try{await db.collection('accounts').doc(s.id).delete(); document.getElementById('ac-status').textContent=`${x.user} 계정을 지웠습니다.`}catch(e){document.getElementById('ac-status').textContent='지우지 못했습니다. 이 페이지의 편집 권한이 필요합니다.'}};
        a.append(del)}
      tb.append(tr)});
    if(me&&me.user!==ADMIN.user){const a=findAcct(me.user); if(a){me={user:a.user,name:a.name,team:a.team,role:a.role,station:a.station||'',perm:permOf(a)}; saveLogin(me); applyLogin()}}
    // 지워진 계정이면 로그아웃
    if(me&&me.user!==ADMIN.user&&accounts.length&&!findAcct(me.user)){me=null;clearLogin(); applyLogin()}}
  document.getElementById('acform').addEventListener('submit',async e=>{e.preventDefault(); const st=document.getElementById('ac-status');
    if(!me||me.role!=='admin'){st.textContent='관리자만 계정을 만들 수 있습니다.';return}
    if(!db){st.textContent='계정 저장소에 연결되지 않았습니다.';return}
    const u=document.getElementById('ac-user').value.trim().toLowerCase();
    const pw=document.getElementById('ac-pass').value, old=accounts.find(x=>x.data().user===u);
    if(!old&&pw.length<6){st.textContent='새 계정은 비밀번호(6자 이상)가 필요합니다.';return}
    if(pw&&pw.length<6){st.textContent='비밀번호는 6자 이상이어야 합니다.';return}
    const perm={teams:{}}; document.querySelectorAll('#ac-perm select').forEach(sel=>perm.teams[sel.dataset.t]=sel.value);
    document.querySelectorAll('#ac-keys input').forEach(i=>perm[i.value]=i.checked);
    if(old&&me&&old.data().user===me.user&&document.getElementById('ac-role').value!==roleVal(old.data())){st.textContent='내 권한(시스템 관리자)은 직접 바꿀 수 없습니다.';return}
    const rlSel=document.getElementById('ac-role').value, rl=(rlSel==='lead'||rlSel==='manager'||rlSel.startsWith('exec:'))?'user':rlSel, stn=document.getElementById('ac-station').value;
    perm.lead=rlSel==='lead'; perm.manager=rlSel==='manager'; perm.title=rlSel.startsWith('exec:')?rlSel.slice(5):''; perm.price=perm.lead||!!perm.title||!!perm.priceEdit;
    if(document.getElementById('ac-team').value==='본사'&&rl!=='admin'&&!perm.title){st.textContent='본사는 사장 · 전무 · 상무 중에서 골라 주세요.';return}
    const rec={user:u,name:document.getElementById('ac-name').value.trim(),team:rl==='worker'?WORK[stn].team:document.getElementById('ac-team').value,role:rl,station:rl==='worker'?stn:'',perm,
      createdAt:old?old.data().createdAt:Date.now(),updatedAt:Date.now()};
    st.textContent='저장 중…';
    try{await kumhoAuth.saveAccount(rec,pw); document.getElementById('ac-pass').value=''; st.textContent=`${u} 계정을 저장했습니다.`}
    catch(err){const m=String(err&&err.message||''); st.textContent=/registered|exists|duplicate/i.test(m)?'이미 있는 아이디입니다.':'저장하지 못했습니다: '+m}});
  function acRoleUI(){const w=document.getElementById('ac-role').value==='worker';
    document.getElementById('ac-wwrap').hidden=!w; document.getElementById('ac-perm').hidden=w; document.getElementById('ac-keys').hidden=w;
    if(w) document.getElementById('ac-team').value=WORK[document.getElementById('ac-station').value].team;
    acRoleUI._last=document.getElementById('ac-role').value}
  // 부서가 본사면 권한은 사장 · 전무 · 상무만 (원래 시스템 관리자인 계정은 유지 가능)
  function setRoleOptions(team,keepAdmin){const sel=document.getElementById('ac-role'), cur=sel.value;
    const opts=team==='본사'?[...EXECS.map(t=>['exec:'+t,t]),...(keepAdmin?[['admin','시스템 관리자']]:[])]
      :[['user','일반'],['lead','팀장'],['manager','관리자'],['worker','작업자'],['admin','시스템 관리자']];
    sel.replaceChildren(...opts.map(([v,l])=>{const o=document.createElement('option'); o.value=v; o.textContent=l; return o}));
    if(opts.some(o=>o[0]===cur)) sel.value=cur}
  document.getElementById('ac-team').addEventListener('change',()=>{setRoleOptions(document.getElementById('ac-team').value,document.getElementById('ac-role').value==='admin'); acRoleUI()});
  document.getElementById('ac-role').addEventListener('change',acRoleUI); document.getElementById('ac-station').addEventListener('change',acRoleUI);
  document.getElementById('ac-new').onclick=()=>{document.getElementById('acform').reset(); document.getElementById('ac-role').disabled=false; document.getElementById('ac-team').value='생산'; setRoleOptions('생산'); acRoleUI._last=''; setTimeout(acRoleUI,0); document.querySelectorAll('#ac-perm select').forEach(sel=>sel.value='view'); document.querySelectorAll('#ac-keys input').forEach(i=>i.checked=i.value==='complaint'); document.getElementById('ac-status').textContent=''};

  // 권한 적용: 현재 메뉴 부서가 '보기만'이면 쓰기 막기, 공지·단가·클레임 개별 권한
  function applyPerm(){
    const it=ITEM[curItem]||ITEM.dash;
    SECTIONS.forEach(x=>{const el=document.getElementById(x); if(!el) return;
      let ro=!me||!canEditTeam(it.t);
      if(x==='notice') ro=!can('notice');
      if(x==='dash') ro=false;
      el.classList.toggle('ro',ro);
      let bar=el.querySelector(':scope > .robar');
      const hasWrite=el.querySelector('[data-write]');
      if(ro&&hasWrite&&x!=='dash'){if(!bar){bar=document.createElement('div'); bar.className='robar'; el.insertBefore(bar,el.children[1]||null)} bar.textContent=x==='notice'?'공지는 볼 수만 있습니다. 공지 올리기는 관리자가 허락한 사람만 할 수 있습니다.':'보기 전용입니다. 이 부서 자료를 고치려면 관리자에게 수정 권한을 요청하세요.'; bar.hidden=false}
      else if(bar) bar.hidden=true});
    document.body.classList.toggle('noprice',!can('price'));
  }
  // 저장·삭제를 권한 없이 누르면 막기 (화면 밖 단축키나 남은 버튼 대비)
  function blockedFor(el){const sec=el.closest('section.panel'); if(!sec) return false;
    if(sec.id==='dash') return el.closest('#cform2')?!can('complaint'):false;
    return sec.classList.contains('ro')}
  document.addEventListener('submit',e=>{const f=e.target; if(f.hasAttribute('data-write')&&blockedFor(f)){e.preventDefault();e.stopImmediatePropagation()}},true);
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button'); if(!b) return;
    if(/^(삭제|수정)/.test(b.textContent.trim())&&blockedFor(b)){e.preventDefault();e.stopImmediatePropagation()}},true);
  new MutationObserver(ms=>{for(const m of ms) m.addedNodes.forEach(n=>{if(n.nodeType!==1) return;
    (n.matches&&n.matches('button.ghost')?[n]:[...n.querySelectorAll?n.querySelectorAll('button.ghost'):[]]).forEach(b=>{if(/^(삭제|수정)/.test(b.textContent.trim())) b.classList.add('delbtn')})})})
    .observe(document.body,{childList:true,subtree:true});
