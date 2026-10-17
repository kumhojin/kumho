/* 금호정공 사내 업무 시스템 · 대시보드 달력 · 일정 등록 · 고객 클레임 등록
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // 고객 클레임 달력
  let complaints=[], events=[], calY=d.getFullYear(), calM=d.getMonth(), calSel=null;
  const todayISO=iso(d);
  try{if(!tg('t-date').value) tg('t-date').value=todayISO}catch(e){}
  // 한국 공휴일 (보라색 표시). 새 해가 오면 여기에 추가
  const HOL={};
  const HOLSRC={2025: "01-01 신정|01-27 임시공휴일|01-28 설날 연휴|01-29 설날|01-30 설날 연휴|03-01 삼일절|03-03 대체공휴일|05-01 근로자의 날|05-05 어린이날·부처님오신날|05-06 대체공휴일|06-03 대통령 선거|06-06 현충일|08-15 광복절|10-03 개천절|10-05 추석 연휴|10-06 추석|10-07 추석 연휴|10-08 대체공휴일|10-09 한글날|12-25 크리스마스", 2026: "01-01 신정|02-16 설날 연휴|02-17 설날|02-18 설날 연휴|03-01 삼일절|03-02 대체공휴일|05-01 노동절|05-05 어린이날|05-24 부처님오신날|05-25 대체공휴일|06-03 지방선거|06-06 현충일|07-17 제헌절|08-15 광복절|08-17 대체공휴일|09-24 추석 연휴|09-25 추석|09-26 추석 연휴|10-03 개천절|10-05 대체공휴일|10-09 한글날|12-25 크리스마스", 2027: "01-01 신정|02-06 설날 연휴|02-07 설날|02-08 설날 연휴|02-09 대체공휴일|03-01 삼일절|05-01 노동절|05-03 대체공휴일|05-05 어린이날|05-13 부처님오신날|06-06 현충일|07-17 제헌절|07-19 대체공휴일|08-15 광복절|08-16 대체공휴일|09-14 추석 연휴|09-15 추석|09-16 추석 연휴|10-03 개천절|10-04 대체공휴일|10-09 한글날|10-11 대체공휴일|12-25 크리스마스|12-27 대체공휴일", 2028: "01-01 신정|01-26 설날 연휴|01-27 설날|01-28 설날 연휴|03-01 삼일절|04-12 국회의원 선거|05-01 노동절|05-02 부처님오신날|05-05 어린이날|06-06 현충일|07-17 제헌절|08-15 광복절|10-02 추석 연휴|10-03 추석·개천절|10-04 추석 연휴|10-05 대체공휴일|10-09 한글날|12-25 크리스마스"};
  Object.entries(HOLSRC).forEach(([y,t])=>t.split('|').forEach(x=>{const i=x.indexOf(' '); HOL[y+'-'+x.slice(0,i)]=x.slice(i+1)}));
  let calQ=0; function renderCal(){if(calQ) return; calQ=requestAnimationFrame(()=>{calQ=0; drawCal()})}
  function drawCal(){
    document.getElementById('cal-title').textContent=`${calY}년 ${calM+1}월`;
    const by=new Map(); calComplaints().forEach(c=>{const x=c.data(); const k=x.date; by.set(k,(by.get(k)||[]).concat([c]))});
    const box=document.getElementById('cal-days'); box.replaceChildren();
    const first=new Date(calY,calM,1).getDay(), n=new Date(calY,calM+1,0).getDate();
    for(let i=0;i<first;i++){const e=document.createElement('span');e.className='cempty';box.append(e)}
    const evBy=new Map(); events.forEach(e=>{const x=e.data(); if(x&&x.date) evBy.set(x.date,(evBy.get(x.date)||[]).concat([x]))});
    for(let dd=1;dd<=n;dd++){const k=`${calY}-${String(calM+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
      const b=document.createElement('button'); b.type='button'; b.className='cday'; const dn=document.createElement('span'); dn.className='dn'; dn.textContent=dd; b.append(dn);
      const wd=(first+dd-1)%7; if(wd===0) b.classList.add('sun'); if(wd===6) b.classList.add('sat');
      const list=by.get(k)||[];
      if(k>todayISO) b.classList.add('future'); else b.classList.add(list.length?'bad':'ok');
      if(k===todayISO) b.classList.add('today'); if(k===calSel) b.classList.add('sel');
      const hol=HOL[k]; if(hol){b.classList.add('hol'); b.title=hol; const sm=document.createElement('small'); sm.textContent=hol; b.append(sm)}
      if(list.length){const em=document.createElement('em'); em.textContent=list.length; em.title='고객 클레임 '+list.length+'건'; b.append(em)}
      const evs=(evBy.get(k)||[]).sort((a,c)=>(a.time||'99').localeCompare(c.time||'99'));
      evs.slice(0,2).forEach(x=>{const e=document.createElement('span'); e.className='ev'; e.textContent=x.title; e.title=(x.time?x.time+' ':'')+x.title; b.append(e)});
      if(evs.length>2){const e=document.createElement('span'); e.className='evmore'; e.textContent='+'+(evs.length-2); b.append(e)}
      b.setAttribute('aria-label',`${calM+1}월 ${dd}일, ${hol?hol+', ':''}${evs.length?'일정 '+evs.length+'건, ':''}${k>todayISO?'예정':list.length?'클레임 '+list.length+'건':'클레임 없음'}`);
      b.onclick=()=>{calSel=calSel===k?null:k; renderCal()}; box.append(b)}  // 다시 누르면 선택 해제
    renderCalSide(by); try{renderEvAdmin()}catch(e){} try{renderCpAdmin()}catch(e){}}
  // 달력의 고객 클레임 = 직접 등록한 클레임 + 클레임 현황(신속 대응 추적표, 볼 수 있는 사람만)
  function calComplaints(){const ok=!!me&&me.role!=='worker';
    if(!ok) return complaints;
    return complaints.concat(claims.filter(c=>c.data().opened).map(c=>{const x=c.data(); return {id:'frb-'+c.id,data:()=>({date:x.opened,partner:x.where||'',item:x.partNo||x.part||'',body:`${x.issue||''}${x.action?'\n조치: '+x.action:''}\n(클레임 현황 ${x.no||''})`,frb:true})}}))}
  function canEvent(){try{return !!me&&(me.team==='총무팀'||canEditTeam('총무팀'))}catch(e){return false}}
  async function renderEvSide(k){
    const ok=false, list=events.filter(e=>e.data().date===k).sort((a,c)=>(a.data().time||'99').localeCompare(c.data().time||'99'));
    const h=document.getElementById('ev-sel'); h.textContent=`${k.slice(5).replace('-','월 ').replace(/^0/,'')}일 일정`;
    const cn=document.createElement('span'); cn.className='cnt'; cn.textContent=list.length+'건'; h.append(cn);
    const ul=document.getElementById('ev-list'); ul.replaceChildren();
    let ps={}; const ids=[...new Set(list.map(e=>e.data().author).filter(Boolean))]; if(user&&ids.length){try{ps=await user.profiles(ids)}catch(e){}}
    list.forEach(e=>{const x=e.data(), li=document.createElement('li');
      const tm=document.createElement('span'); tm.className='tm'; tm.textContent=x.time||'종일';
      const tt=document.createElement('span'); tt.className='tt'; tt.textContent=x.title||'';
      const by=document.createElement('span'); by.className='by'; by.textContent=x.authorName||(ps[x.author]&&ps[x.author].name)||'총무팀';
      li.append(tm,tt,by);
      if(x.body){const p=document.createElement('p'); p.textContent=x.body; li.append(p)}
      if(ok){const bw=document.createElement('span'); bw.style.cssText='grid-column:3;justify-self:end;white-space:nowrap';
        bw.append(editBtn(()=>editDoc({col:'events',id:e.id,data:x,title:'일정 수정',fields:[{k:'date',label:'날짜',type:'date',req:true},{k:'time',label:'시간',type:'time'},{k:'title',label:'일정',req:true,wide:true},{k:'body',label:'메모',wide:true}]})));
        const del=document.createElement('button'); del.type='button'; del.className='ghost'; del.textContent='삭제'; bw.append(del);
        del.onclick=async()=>{if(del.dataset.c!=='1'){del.dataset.c='1';del.textContent='삭제 확인';return} try{await db.collection('events').doc(e.id).delete()}catch(err){document.getElementById('ev-status').textContent='지우지 못했습니다. 직접 올린 일정만 지울 수 있을 수 있습니다.'}}; li.append(bw)}
      ul.append(li)});
    if(!list.length){const li=document.createElement('li'); li.className='none'; li.textContent='등록된 일정이 없습니다.'; ul.append(li)}
  }
  async function renderCalSide(by){
    // 날짜를 눌렀을 때만, 그날 일정·클레임이 있을 때만 옆에 보여 줌 (없으면 달력을 넓게)
    const k=calSel, wrap=document.querySelector('.calwrap');
    const list=k?((by||new Map()).get(k)||calComplaints().filter(c=>c.data().date===k)):[];
    const evN=k?events.filter(e=>e.data().date===k).length:0;
    wrap.classList.toggle('solo',!k||(!list.length&&!evN));
    document.getElementById('ev-sec').hidden=!evN; document.getElementById('cl-sec').hidden=!list.length;
    if(!k||(!list.length&&!evN)) return;
    try{renderEvSide(k)}catch(e){}
    {const h=document.getElementById('cal-sel'); h.textContent=`${HOL[k]?HOL[k]+' · ':''}고객 클레임`; const cn=document.createElement('span'); cn.className='cnt'; cn.textContent=list.length+'건'; h.append(cn)}
    const ul=document.getElementById('cal-list'); ul.replaceChildren();
    let ps={}; const ids=[...new Set(list.map(c=>c.data().author).filter(Boolean))]; if(user&&ids.length){try{ps=await user.profiles(ids)}catch(e){}}
    list.forEach(c=>{const x=c.data(), li=document.createElement('li'); const top=document.createElement('div'); top.className='cl-top';
      const t=document.createElement('b'); t.textContent=[x.partner,x.item,x.lot?lotLabel(x.lot):'',x.qty?Number(x.qty).toLocaleString('ko-KR')+' EA':''].filter(Boolean).join(' · ');
      const who=document.createElement('span'); who.textContent=x.frb?'클레임 현황':((ps[x.author]&&ps[x.author].name)||'직원'); top.append(t,who);
      const p=document.createElement('p'); p.textContent=x.body||''; li.append(top,p);
      if(false){const bw=document.createElement('span'); bw.style.cssText='justify-self:end;white-space:nowrap';
        bw.append(editBtn(()=>editDoc({col:'complaints',id:c.id,data:x,title:'고객 클레임 수정',fields:[{k:'date',label:'날짜',type:'date',req:true},{k:'partner',label:'거래처',req:true},{k:'item',label:'품번',upper:true},{k:'lot',label:'LOT',upper:true},{k:'qty',label:'수량',type:'number'},{k:'body',label:'클레임 내용',type:'textarea',req:true}]})));
        const del=document.createElement('button'); del.type='button'; del.className='ghost'; del.textContent='삭제'; bw.append(del);
        del.onclick=async()=>{if(del.dataset.c!=='1'){del.dataset.c='1';del.textContent='삭제 확인';return} try{await db.collection('complaints').doc(c.id).delete()}catch(e){document.getElementById('cp-status').textContent='지우지 못했습니다.'}}; li.append(bw)}
      ul.append(li)});
    if(!list.length){const li=document.createElement('li'); li.className='none'; li.textContent=k>todayISO?'아직 오지 않은 날입니다.':'이 날은 고객 클레임이 없습니다.'; ul.append(li)}
  }
  // 일정 등록(총무팀) · 고객 클레임 등록(품질) 화면의 목록
  document.getElementById('ev-date').value=todayISO; document.getElementById('cp-date').value=todayISO;
  const delBtn=(onOk,stId)=>{const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent='삭제';
    b.onclick=async()=>{if(b.dataset.c!=='1'){b.dataset.c='1';b.textContent='삭제 확인';return} try{await onOk()}catch(e){document.getElementById(stId).textContent='지우지 못했습니다. 권한을 확인해 주세요.'}}; return b};
  async function renderEvAdmin(){const tb=document.getElementById('ev-admin'); if(!tb) return; tb.replaceChildren();
    const ok=canEvent(), from=iso(new Date(Date.now()-7*864e5));
    const list=events.filter(e=>(e.data().date||'')>=from).sort((a,b)=>(a.data().date+(a.data().time||'99')).localeCompare(b.data().date+(b.data().time||'99'))).slice(0,100);
    document.getElementById('ev-aempty').hidden=list.length>0;
    let ps={}; const ids=[...new Set(list.map(e=>e.data().author).filter(Boolean))]; if(user&&ids.length){try{ps=await user.profiles(ids)}catch(e){}}
    list.forEach(e=>{const x=e.data(), tr=document.createElement('tr'); const c=(t,cl)=>{const td=document.createElement('td'); td.textContent=t??''; if(cl) td.className=cl; tr.append(td); return td};
      c(x.date,'num'); c(x.time||'종일'); c(x.title); c(x.body||''); c(x.authorName||(ps[x.author]&&ps[x.author].name)||'총무팀');
      const a=c(''); a.style.whiteSpace='nowrap';
      if(ok){a.append(editBtn(()=>editDoc({col:'events',id:e.id,data:x,title:'일정 수정',fields:[{k:'date',label:'날짜',type:'date',req:true},{k:'time',label:'시간',type:'time'},{k:'title',label:'일정',req:true,wide:true},{k:'body',label:'메모',wide:true}]})),' ',delBtn(()=>db.collection('events').doc(e.id).delete(),'ev-status'))}
      tb.append(tr)})}
  async function renderCpAdmin(){const tb=document.getElementById('cp-admin'); if(!tb) return; tb.replaceChildren();
    const list=[...complaints].sort((a,b)=>String(b.data().date||'').localeCompare(String(a.data().date||''))).slice(0,100);
    document.getElementById('cp-aempty').hidden=list.length>0;
    let ps={}; const ids=[...new Set(list.map(c=>c.data().author).filter(Boolean))]; if(user&&ids.length){try{ps=await user.profiles(ids)}catch(e){}}
    list.forEach(cd=>{const x=cd.data(), tr=document.createElement('tr'); const c=(t,cl)=>{const td=document.createElement('td'); td.textContent=t??''; if(cl) td.className=cl; tr.append(td); return td};
      c(x.date,'num'); c(x.partner); c(x.item||''); c(x.lot?lotLabel(x.lot):''); c(x.qty!=null&&x.qty!==''?Number(x.qty).toLocaleString('ko-KR'):'','num'); c(x.body||''); c((ps[x.author]&&ps[x.author].name)||'직원');
      const a=c(''); a.style.whiteSpace='nowrap';
      if(x.author&&(x.author===myId||isAdm())){a.append(editBtn(()=>editDoc({col:'complaints',id:cd.id,data:x,title:'고객 클레임 수정',fields:[{k:'date',label:'날짜',type:'date',req:true},{k:'partner',label:'거래처',req:true},{k:'item',label:'품번',upper:true},{k:'lot',label:'LOT',upper:true},{k:'qty',label:'수량',type:'number'},{k:'body',label:'클레임 내용',type:'textarea',req:true}]})),' ',delBtn(()=>db.collection('complaints').doc(cd.id).delete(),'cp-status'))}
      tb.append(tr)})}
  document.getElementById('cal-prev').onclick=()=>{calM--; if(calM<0){calM=11;calY--} renderCal()};
  document.getElementById('cal-next').onclick=()=>{calM++; if(calM>11){calM=0;calY++} renderCal()};
  document.getElementById('evform').addEventListener('submit',async e=>{e.preventDefault(); const st=document.getElementById('ev-status');
    if(!db){st.textContent='로그인한 직원만 등록할 수 있습니다.';return}
    if(!canEvent()){st.textContent='일정은 총무팀만 등록할 수 있습니다.';return}
    const k=document.getElementById('ev-date').value, title=document.getElementById('ev-title').value.trim(); if(!title) return;
    const rec={date:k,time:document.getElementById('ev-time').value||'',title,body:document.getElementById('ev-body').value.trim(),author:myId,authorName:(me&&me.name)||'',createdAt:Date.now()};
    const btn=document.getElementById('ev-save'); btn.disabled=true;
    try{await db.collection('events').add(rec); ['ev-time','ev-title','ev-body'].forEach(id=>document.getElementById(id).value=''); st.textContent='일정을 등록했습니다.'}
    catch(err){st.textContent='등록하지 못했습니다. 권한을 확인해 주세요.'}
    btn.disabled=false});
  document.getElementById('cform2').addEventListener('submit',async e=>{e.preventDefault(); const st=document.getElementById('cp-status');
    if(!db){st.textContent='등록은 로그인한 직원만 할 수 있습니다.';return}
    const k=document.getElementById('cp-date').value; if(!k) return; if(k>todayISO){st.textContent='오늘 이후 날짜에는 등록할 수 없습니다.';return}
    const g=id=>document.getElementById(id).value.trim();
    const rec={date:k,partner:g('cp-partner'),item:g('cp-item'),lot:g('cp-lot').toUpperCase(),qty:g('cp-qty')===''?null:Number(g('cp-qty')),body:g('cp-body'),author:myId,createdAt:Date.now()};
    if(!rec.partner||!rec.body) return;
    try{await db.collection('complaints').add(rec); ['cp-partner','cp-item','cp-lot','cp-qty','cp-body'].forEach(id=>document.getElementById(id).value=''); st.textContent='클레임을 등록했습니다.'}
    catch(err){st.textContent='등록하지 못했습니다. 권한을 확인해 주세요.'}});
