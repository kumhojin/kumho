/* 금호정공 사내 업무 시스템 · 생산: 보낸 내역 · 생산 계획표 · 재료 요청 · 받은 내역 · 알림
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // 사상반 → 창고 보낸 내역 / 오차 확인
  let xfers=[];
  const xBody=document.getElementById('x-body'), xStatus=document.getElementById('x-status');
  document.getElementById('x-date').value=iso(d);
  const rcMonth=document.getElementById('rc-month'); rcMonth.value=iso(d).slice(0,7);
  function xRow(){const tr=document.createElement('tr'); const n=document.createElement('td'); n.className='rn'; tr.append(n);
    [['item','품번'],['lot','LOT'],['qty','보낸 수량'],['bad','불량'],['memo','메모']].forEach(([k,l],ci)=>{const td=document.createElement('td'),inp=document.createElement('input');
      inp.dataset.k=k; inp.setAttribute('aria-label',l); inp.placeholder=k==='bad'?'불량 (0)':k==='qty'?'보낸 수량':l; if(k==='qty'||k==='bad'){inp.type='number';inp.min='0';inp.inputMode='numeric';td.className='num'} if(k==='item') inp.setAttribute('list','s-items');
      inp.addEventListener('paste',e=>{const t=(e.clipboardData||window.clipboardData).getData('text'); if(!/[\t\n]/.test(t)) return; e.preventDefault();
        let row=tr; t.replace(/\r/g,'').split('\n').filter(l=>l.trim()).forEach(line=>{if(!row){row=xRow();xBody.append(row)} const ins=row.querySelectorAll('input');
          line.split('\t').forEach((c,j)=>{const x=ins[ci+j]; if(x) x.value=String(c).trim().replace(/,/g,x.type==='number'?'':',')}); row=row.nextElementSibling}); xNum()});
      inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault(); if(ci===4){let nx=tr.nextElementSibling; if(!nx){nx=xRow();xBody.append(nx);xNum()} nx.querySelector('input').focus()} else tr.querySelectorAll('input')[ci+1].focus()}});
      td.append(inp); tr.append(td)});
    const x=document.createElement('td'); x.className='x'; const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent='×'; b.setAttribute('aria-label','이 줄 지우기');
    b.onclick=()=>{tr.remove(); if(!xBody.children.length) xBody.append(xRow()); xNum()}; x.append(b); tr.append(x); return tr}
  function xNum(){[...xBody.children].forEach((tr,i)=>tr.firstChild.textContent=i+1)}
  function xAdd(n){for(let i=0;i<n;i++) xBody.append(xRow()); xNum()}
  xAdd(5); document.getElementById('x-add').onclick=()=>xAdd(5);
  document.getElementById('xform').addEventListener('submit',async e=>{e.preventDefault();
    if(!db){xStatus.textContent='저장은 로그인한 직원만 할 수 있습니다.';return}
    const date=document.getElementById('x-date').value, rows=[], bad=[];
    [...xBody.children].forEach((tr,i)=>{tr.classList.remove('err'); const o={}; tr.querySelectorAll('input').forEach(x=>o[x.dataset.k]=x.value.trim());
      if(!Object.values(o).some(v=>v)) return; o.qty=Math.floor(Number(o.qty)); o.bad=Math.max(0,Math.floor(Number(o.bad)||0));
      if(!o.item||!o.lot||!(o.qty>0||o.bad>0)){bad.push(i+1);tr.classList.add('err');return} rows.push(o)});
    if(bad.length){xStatus.textContent=`${bad.join(', ')}번 줄에 품번, LOT, 수량을 넣어 주세요.`;return}
    if(!rows.length){xStatus.textContent='입력한 줄이 없습니다.';return}
    const btn=document.getElementById('x-save'); btn.disabled=true; xStatus.textContent='저장 중…';
    try{const now=Date.now(); for(const o of rows){const ref=await db.collection('transfers').add({date,item:o.item,lot:o.lot,qty:o.qty>0?o.qty:0,bad:o.bad,memo:o.memo||'',author:myId,createdAt:now,addedAt:now});
        if(o.bad>0) await db.collection('records').add({kind:'불량',loc:'',date,item:o.item,lot:o.lot,qty:o.bad,unit:'EA',memo:'사상반 입력',xfer:ref.id,author:myId,createdAt:now})}
      xBody.replaceChildren(); xAdd(5); xStatus.textContent=`${rows.length}개 품목을 저장했습니다. 자재가 받은 수량과 자동으로 비교됩니다.`}
    catch(err){xStatus.textContent='저장하지 못했습니다. 보기 전용 권한이면 관리자에게 편집 권한을 요청하세요.'}
    btn.disabled=false});

  // ===== 내가 입력한 내역 (날짜별) — 작업자가 그날 한 일을 한눈에 =====
  const wDay={};
  function wToday(boxId,label,rows,cols,sums){const box=document.getElementById(boxId); if(!box) return;
    let wk=false; try{wk=isWorker()}catch(e){} const day=wk?todayISO:(wDay[boxId]||todayISO); box.replaceChildren();
    const h=document.createElement('div'); h.className='wh'; const t=document.createElement('b'); t.textContent=(day===todayISO?'오늘 ':`${Number(day.slice(5,7))}월 ${Number(day.slice(8))}일 `)+label;
    const di=document.createElement('input'); di.type='date'; di.value=day; di.max=todayISO; di.setAttribute('aria-label','날짜 선택'); di.onchange=()=>{wDay[boxId]=di.value||todayISO; wRender()};
    h.append(t); if(!wk) h.append(di); box.append(h);
    const list=rows(day);
    if(!list.length){const p=document.createElement('div'); p.className='none'; p.textContent='이 날 입력한 내역이 없습니다.'; box.append(p); return}
    const sm=document.createElement('div'); sm.className='wsum'; sums(list).forEach(([l,v])=>{const sp=document.createElement('span'); sp.textContent=l+' '; const b=document.createElement('b'); b.textContent=v; sp.append(b); sm.append(sp)}); box.append(sm);
    const tb=document.createElement('table'); list.forEach(x=>{const tr=document.createElement('tr'); cols(x).forEach(([v,cl])=>{const td=document.createElement('td'); td.textContent=v??''; if(cl) td.className=cl; tr.append(td)}); tb.append(tr)}); box.append(tb)}
  const nf=n=>Number(n||0).toLocaleString('ko-KR');
  function wRender(){try{
    const mineBy=(arr,f)=>arr.map(s=>s.data()).filter(x=>x.author===myId&&f(x));
    wToday('x-today','내가 보낸 내역',d=>mineBy(xfers,x=>x.date===d),x=>[[x.item],[lotLabel(x.lot)],[nf(x.qty)+' EA','num'],[Number(x.bad)?'불량 '+nf(x.bad):'','num']],
      l=>[['품목',l.length+'건'],['보낸 수량',nf(l.reduce((a,x)=>a+Number(x.qty||0),0))+' EA'],['불량',nf(l.reduce((a,x)=>a+Number(x.bad||0),0))+' EA']]);
    wToday('rv-today','내가 받은 내역',d=>mineBy(moves,x=>x.src==='recv'&&(x.date||iso(new Date(x.createdAt)))===d),x=>[[x.item],[lotLabel(x.lot)],[nf(x.qty)+' EA','num']],
      l=>[['품목',l.length+'건'],['받은 수량',nf(l.reduce((a,x)=>a+Number(x.qty||0),0))+' EA']]);
    wToday('rq-today','내가 한 재료 요청',d=>mineBy(reqs,x=>iso(new Date(x.createdAt))===d),x=>[[x.item],[nf(x.qty)+' '+(x.unit||''),'num'],[x.status||'요청']],
      l=>[['요청',l.length+'건'],['처리 완료',l.filter(x=>x.status==='완료').length+'건']]);
  }catch(e){}}
  async function renderXfers(){wRender(); const list=document.getElementById('x-list'); list.replaceChildren(); const mine=xfers.filter(s=>wOnlyToday(s.data())).slice(0,50);
    document.getElementById('x-empty').hidden=mine.length>0;
    let ps={}; const ids=[...new Set(mine.map(s=>s.data().author).filter(Boolean))]; if(user&&ids.length){try{ps=await user.profiles(ids)}catch(e){}}
    for(const s of mine){const x=s.data(), tr=document.createElement('tr'); const c=(t,cl)=>{const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td);return td};
      c(x.date,'num'); c(x.item); c(lotLabel(x.lot)); c(Number(x.qty).toLocaleString('ko-KR'),'num'); c(Number(x.bad||0)?Number(x.bad).toLocaleString('ko-KR'):'—','num'); c(x.memo); c((ps[x.author]&&ps[x.author].name)||'직원');
      const a=c(''); if(!canTouch(x)&&x.author===myId){a.textContent='지난 기록'; a.style.cssText='font-size:12px;color:var(--muted);white-space:nowrap'; a.title='작업자는 오늘 입력한 내역만 고칠 수 있습니다. 지난 기록은 관리자에게 요청하세요.'} if(canTouch(x)){a.style.whiteSpace='nowrap';
        a.append(editBtn(()=>editDoc({col:'transfers',id:s.id,data:x,title:'자재로 보낸 내역 수정',note:'불량 수량을 바꾸면 불량 LOT 기록도 함께 바뀝니다.',
          fields:[{k:'date',label:'일자',type:'date',req:true},{k:'item',label:'품번',req:true,upper:true},{k:'lot',label:'LOT',upper:true},{k:'qty',label:'수량',type:'number',req:true},{k:'bad',label:'불량 수량',type:'number'},{k:'memo',label:'메모',wide:true}],
          after:async(n)=>{const q=await db.collection('records').where('xfer','==',s.id).get(); const bad=Number(n.bad)||0;
            if(bad>0){if(q.docs.length){for(const r of q.docs) await db.collection('records').doc(r.id).set({...r.data(),date:n.date,item:n.item,lot:n.lot,qty:bad})}
              else await db.collection('records').add({kind:'불량',loc:'',date:n.date,item:n.item,lot:n.lot,qty:bad,unit:'EA',memo:'사상반 입력',xfer:s.id,author:myId,createdAt:Date.now()})}
            else for(const r of q.docs) await db.collection('records').doc(r.id).delete()}})));
        const del=document.createElement('button'); del.type='button'; del.className='ghost'; del.textContent='삭제';
        del.onclick=async()=>{if(del.dataset.c!=='1'){del.dataset.c='1';del.textContent='삭제 확인';return} try{await db.collection('transfers').doc(s.id).delete();
          if(Number(x.bad)>0){try{const q=await db.collection('records').where('xfer','==',s.id).get(); for(const r of q.docs) await db.collection('records').doc(r.id).delete()}catch(e){}}}catch(e){xStatus.textContent='지우지 못했습니다.'}}; a.append(del)}
      list.append(tr)}}
  function renderRecon(){
    const ym=rcMonth.value, q=document.getElementById('rc-search').value.trim().toLowerCase(), only=document.getElementById('rc-only').checked;
    const m=new Map(), key=(i,l)=>String(i||'').trim()+'\u0000'+String(l||'').trim();
    const inMonth=dt=>!ym||String(dt||'').slice(0,7)===ym;
    for(const s of xfers){const x=s.data(); if(!inMonth(x.date)) continue; const k=key(x.item,x.lot); const e=m.get(k)||{item:x.item,lot:x.lot,sent:0,got:0,bad:0}; e.sent+=Number(x.qty)||0; e.bad=(e.bad||0)+(Number(x.bad)||0); m.set(k,e)}
    for(const s of moves){const x=s.data(), n=Number(x.qty)||0; if(n<=0) continue; if(!inMonth(iso(new Date(x.createdAt)))) continue;
      const k=key(x.item,x.lot); const e=m.get(k)||{item:x.item,lot:x.lot,sent:0,got:0,bad:0}; e.got+=n; m.set(k,e)}
    let rows=[...m.values()].filter(e=>!q||(lotHit(e.lot,q)||String(e.item||'').toLowerCase().includes(q)));
    rows=rows.filter(e=>e.sent||e.got);
    rows.forEach(e=>{e.diff=e.got-e.sent; e.st=e.diff===0?['일치','ok']:e.got===0?['자재 미입고','bad']:e.sent===0?['사상반 기록 없음','warn']:e.diff<0?['자재 부족','bad']:['자재 초과','warn']});
    const cnt={ok:0,bad:0,warn:0}; rows.forEach(e=>cnt[e.st[1]]++);
    if(only) rows=rows.filter(e=>e.diff!==0);
    rows.sort((a,b)=>(a.diff===0)-(b.diff===0)||Math.abs(b.diff)-Math.abs(a.diff)||String(a.item).localeCompare(String(b.item)));
    const sum=document.getElementById('rc-sum'); sum.replaceChildren();
    [['일치',cnt.ok],['부족·미입고',cnt.bad],['초과·기록 없음',cnt.warn]].forEach(([l,n])=>{const sp=document.createElement('span'); sp.append(l+' '); const b=document.createElement('b'); b.textContent=n; sp.append(b); sum.append(sp)});
    const body=document.getElementById('rc-body'); body.replaceChildren(); document.getElementById('rc-empty').hidden=rows.length>0;
    for(const e of rows){const tr=document.createElement('tr'); if(e.diff) tr.className='diff'; const c=(t,cl)=>{const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td);return td};
      c(e.item); c(lotLabel(e.lot)); mcell(c(''),e.item,e.lot); c(e.sent.toLocaleString('ko-KR'),'num'); c(e.got.toLocaleString('ko-KR'),'num'); c((e.diff>0?'+':'')+e.diff.toLocaleString('ko-KR'),'num'); c(e.bad?e.bad.toLocaleString('ko-KR'):'—','num');
      const st=c(''); const p=document.createElement('span'); p.className='st '+e.st[1]; p.textContent=e.st[0]; st.append(p); body.append(tr)}
    renderRcAlert(); try{renderBell()}catch(e){}
  }
  // 관리자 대시보드: 이번 달 사상반↔자재 오차 자동 확인
  function reconMismatch(ym){const m=new Map(), key=(i,l)=>String(i||'').trim()+'\u0000'+String(l||'').trim(), inM=dt=>String(dt||'').slice(0,7)===ym;
    for(const s of xfers){const x=s.data(); if(!inM(x.date)) continue; const k=key(x.item,x.lot); m.set(k,(m.get(k)||0)-(Number(x.qty)||0))}
    for(const s of moves){const x=s.data(), n=Number(x.qty)||0; if(n<=0||!inM(iso(new Date(x.createdAt)))) continue; const k=key(x.item,x.lot); m.set(k,(m.get(k)||0)+n)}
    let n=0; m.forEach(v=>{if(v!==0) n++}); return {n,total:m.size}}
  function renderRcAlert(){const el=document.getElementById('rc-alert'); if(!el) return; const isAdm=!!me&&(me.role==='admin'||isMgrAcct(me));
    if(!isAdm){el.hidden=true;return} const r=reconMismatch(iso(d).slice(0,7)); el.hidden=!r.total;
    el.classList.toggle('ok',r.n===0); el.querySelector('span').textContent=r.n?`이번 달 사상반 ↔ 자재 수량 오차 ${r.n}건 (전체 ${r.total}개 품번·LOT)`:`이번 달 사상반 ↔ 자재 수량이 모두 일치합니다 (${r.total}개 품번·LOT)`}
  [rcMonth,document.getElementById('rc-search'),document.getElementById('rc-only')].forEach(el=>el.addEventListener('input',renderRecon));
  // ===== 생산 계획표 (날짜별 호기·품번) → 제품별 생산 호기 자동 추적 =====
  let pplanMap=new Map();
  const nItem=x=>String(x||'').replace(/\s+/g,'').toUpperCase();
  const MACH=/^\s*(\d{2,4})\s*[-–]\s*(\d{1,2})\s*(호기)?\s*$/;
  const normMachine=x=>{const m=MACH.exec(String(x||'')); return m?`${m[1]}-${m[2]}`:String(x||'').trim()};
  function machinesOn(item,date){const p=pplanMap.get(date); if(!p||!Array.isArray(p.rows)) return []; const n=nItem(item); return [...new Set(p.rows.filter(r=>nItem(r.item)===n&&r.machine).map(r=>normMachine(r.machine)))]}
  function machinesFor(item,lot,date){const d=lotDate(lot); let m=d?machinesOn(item,d):[]; if(!m.length&&date) m=machinesOn(item,String(date).slice(0,10)); return m}
  function mcell(td,item,lot,date){td.replaceChildren(); const m=machinesFor(item,lot,date);
    if(!m.length){const sp=document.createElement('span'); sp.className='mtag none'; sp.textContent=pplanMap.size?'계획 없음':'—'; sp.title='그날 생산 계획표에 이 품번이 없습니다'; td.append(sp); return}
    m.forEach(x=>{const sp=document.createElement('span'); sp.className='mtag'; sp.textContent=x; td.append(sp)})}
  // 입력표
  const ppBody=document.getElementById('pp-body'), ppDate=document.getElementById('pp-date'), ppStatus=document.getElementById('pp-status');
  ppDate.value=iso(d);
  function ppRow(o={}){const tr=document.createElement('tr'); const n=document.createElement('td'); n.className='rn'; tr.append(n);
    [['machine','호기 (예: 80-2)'],['item','품번'],['qty','계획 수량'],['memo','메모']].forEach(([k,l],ci)=>{const td=document.createElement('td'),inp=document.createElement('input');
      inp.dataset.k=k; inp.placeholder=l; inp.setAttribute('aria-label',l); inp.value=o[k]??'';
      if(k==='qty'){inp.type='number';inp.min='0';inp.inputMode='numeric';td.className='num'} if(k==='machine'){inp.setAttribute('list','pp-machines'); inp.maxLength=12; inp.addEventListener('change',()=>inp.value=normMachine(inp.value))} if(k==='item') inp.setAttribute('list','s-items');
      inp.addEventListener('paste',e=>{const t=(e.clipboardData||window.clipboardData).getData('text'); if(!/[\t\n]/.test(t)) return; e.preventDefault();
        let row=tr; t.replace(/\r/g,'').split('\n').filter(l=>l.trim()).forEach(line=>{if(!row){row=ppRow();ppBody.append(row)} const ins=row.querySelectorAll('input');
          line.split('\t').forEach((c,j)=>{const x=ins[ci+j]; if(x) x.value=x.dataset.k==='machine'?normMachine(c):String(c).trim().replace(/,/g,x.type==='number'?'':',')}); row=row.nextElementSibling}); ppNum()});
      inp.addEventListener('keydown',e=>{if(e.key!=='Enter') return; e.preventDefault(); if(ci===3){let nx=tr.nextElementSibling; if(!nx){nx=ppRow();ppBody.append(nx);ppNum()} nx.querySelector('input').focus()} else tr.querySelectorAll('input')[ci+1].focus()});
      td.append(inp); tr.append(td)});
    const x=document.createElement('td'); x.className='x'; const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent='×'; b.setAttribute('aria-label','이 줄 지우기');
    b.onclick=()=>{tr.remove(); if(!ppBody.children.length) ppBody.append(ppRow()); ppNum()}; x.append(b); tr.append(x); return tr}
  function ppNum(){[...ppBody.children].forEach((tr,i)=>tr.firstChild.textContent=i+1)}
  function ppFill(rows){ppBody.replaceChildren(); (rows&&rows.length?rows:[]).forEach(o=>ppBody.append(ppRow(o))); const extra=Math.max(3,8-ppBody.children.length); for(let i=0;i<extra;i++) ppBody.append(ppRow()); ppNum()}
  function ppLoad(){const p=pplanMap.get(ppDate.value); ppFill(p&&p.rows);
    ppStatus.textContent=p?`${ppDate.value} 계획표 (${p.rows.length}줄${p.file?' · '+p.file:''})를 불러왔습니다.`:`${ppDate.value} 계획표가 아직 없습니다.`}
  const shiftDay=(ds,n)=>{const t=new Date(ds+'T12:00:00'); t.setDate(t.getDate()+n); return iso(t)};
  ppDate.addEventListener('change',ppLoad);
  document.getElementById('pp-prev').onclick=()=>{ppDate.value=shiftDay(ppDate.value,-1); ppLoad()};
  document.getElementById('pp-next').onclick=()=>{ppDate.value=shiftDay(ppDate.value,1); ppLoad()};
  document.getElementById('pp-add').onclick=()=>{for(let i=0;i<3;i++) ppBody.append(ppRow()); ppNum()};
  document.getElementById('pp-copy').onclick=()=>{const keys=[...pplanMap.keys()].filter(k=>k<ppDate.value).sort(); const k=keys[keys.length-1];
    if(!k){ppStatus.textContent='이전 날짜의 계획표가 없습니다.';return} ppFill(pplanMap.get(k).rows.map(r=>({...r}))); ppStatus.textContent=`${k} 계획을 복사했습니다. 확인 후 저장하세요.`};
  function ppCollect(){const rows=[], bad=[]; [...ppBody.children].forEach((tr,i)=>{tr.classList.remove('err'); const o={}; tr.querySelectorAll('input').forEach(x=>o[x.dataset.k]=x.value.trim());
      if(!o.machine&&!o.item) return; o.machine=normMachine(o.machine); if(!o.machine||!o.item){bad.push(i+1);tr.classList.add('err');return}
      o.qty=o.qty===''?null:Math.floor(Number(o.qty)); rows.push(o)}); return {rows,bad}}
  async function ppSave(date,rows,file){await db.doc('pplans/'+date).set({date,rows,file:file||'',author:myId,createdAt:new Date(date+'T08:00:00').getTime(),updatedAt:Date.now()})}
  document.getElementById('ppform').addEventListener('submit',async e=>{e.preventDefault();
    if(!db){ppStatus.textContent='저장은 로그인한 직원만 할 수 있습니다.';return}
    const {rows,bad}=ppCollect(); if(bad.length){ppStatus.textContent=`${bad.join(', ')}번 줄에 호기와 품번을 넣어 주세요.`;return}
    const btn=document.getElementById('pp-save'); btn.disabled=true; ppStatus.textContent='저장 중…';
    try{if(!rows.length){await db.collection('pplans').doc(ppDate.value).delete(); ppStatus.textContent=`${ppDate.value} 계획표를 비웠습니다.`}
      else{await ppSave(ppDate.value,rows); ppStatus.textContent=`${ppDate.value} 계획표 ${rows.length}줄을 저장했습니다.`}}
    catch(err){ppStatus.textContent='저장하지 못했습니다. 권한을 확인해 주세요.'}
    btn.disabled=false});
  // 엑셀·CSV 올리기: 호기(80-2 같은 값)가 있는 줄을 찾아 품번·수량을 읽음. 날짜 칸이 있으면 날짜별로 나눔
  document.getElementById('pp-file').addEventListener('change',async e=>{const f=e.target.files[0]; e.target.value=''; if(!f) return;
    if(!db){ppStatus.textContent='저장은 로그인한 직원만 할 수 있습니다.';return}
    ppStatus.textContent=`${f.name} 읽는 중…`;
    try{const aoa=await sheetAoa(f); const byDate=new Map(); let curDate=null;
      const toDate=v=>{if(v instanceof Date&&!isNaN(v)) return iso(v); const t=String(v||'').trim(); let m=/^(20\d{2})[-./년 ]\s*(\d{1,2})[-./월 ]\s*(\d{1,2})/.exec(t); if(m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
        m=/^(\d{1,2})[./월]\s*(\d{1,2})일?$/.exec(t); if(m) return `${d.getFullYear()}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`; return null};
      for(const row of aoa){const cells=row.map(c=>c instanceof Date?c:String(c??'').trim());
        const dc=cells.map(toDate).find(Boolean); const mi=cells.findIndex(c=>MACH.test(String(c)));
        if(dc&&mi<0){curDate=dc; continue}
        if(mi<0) continue; const date=dc||curDate||ppDate.value;
        const rest=cells.slice(mi+1).map(String).filter(c=>c&&!toDate(c));
        const item=rest.find(c=>!/^[\d,.\s]+$/.test(c)); if(!item) continue;
        const qs=rest.slice(rest.indexOf(item)+1).find(c=>/^[\d,]+$/.test(c));
        const arr=byDate.get(date)||[]; arr.push({machine:normMachine(cells[mi]),item,qty:qs?Number(qs.replace(/,/g,'')):null,memo:''}); byDate.set(date,arr)}
      if(!byDate.size){ppStatus.textContent='파일에서 "80-2" 같은 호기 칸을 찾지 못했습니다. 호기 · 품번 · 수량 열이 있는지 확인해 주세요.';return}
      if(byDate.size===1){const [dt,rows]=[...byDate][0]; ppDate.value=dt; ppFill(rows); ppStatus.textContent=`${f.name}에서 ${dt} 계획 ${rows.length}줄을 읽었습니다. 확인 후 ‘계획표 저장’을 누르세요.`; return}
      for(const [dt,rows] of byDate) await ppSave(dt,rows,f.name);
      ppStatus.textContent=`${f.name}에서 ${byDate.size}일치 계획표(${[...byDate.keys()].sort()[0]} ~ ${[...byDate.keys()].sort().pop()})를 저장했습니다.`}
    catch(err){ppStatus.textContent='파일을 읽지 못했습니다: '+(err&&err.message||'')}});
  // 품번별 호기 이력
  const mhSearch=document.getElementById('mh-search'), mhMonth=document.getElementById('mh-month');
  function renderMhist(){const q=nItem(mhSearch.value), ym=mhMonth.value, m=new Map();
    for(const [date,p] of pplanMap){if(ym&&!date.startsWith(ym)) continue;
      for(const r of (p.rows||[])){if(!r.item||!r.machine) continue; const k=nItem(r.item); if(q&&!k.includes(q)) continue;
        const e=m.get(k)||{item:r.item,mach:new Map(),dates:new Set()}; const mc=normMachine(r.machine); const ds=e.mach.get(mc)||new Set(); ds.add(date); e.mach.set(mc,ds); e.dates.add(date); m.set(k,e)}}
    const body=document.getElementById('mh-body'); body.replaceChildren(); const rows=[...m.values()].sort((a,b)=>String(a.item).localeCompare(String(b.item)));
    document.getElementById('mh-empty').hidden=rows.length>0; document.getElementById('mh-empty').textContent=pplanMap.size?'조건에 맞는 품번이 없습니다.':'저장된 생산 계획표가 없습니다.';
    for(const e of rows){const tr=document.createElement('tr'); const c=(t,cl)=>{const td=document.createElement('td'); if(t!=null) td.textContent=t; if(cl) td.className=cl; tr.append(td); return td};
      c(e.item); const mt=c(null); [...e.mach.entries()].sort((a,b)=>b[1].size-a[1].size).forEach(([mc,ds])=>{const sp=document.createElement('span'); sp.className='mtag'; sp.textContent=mc; const b=document.createElement('b'); b.textContent=ds.size+'일'; sp.append(b); sp.title=[...ds].sort().join(', '); mt.append(sp)});
      const all=[...e.dates].sort(); c(all.length,'num'); c(all[0],'num'); c(all[all.length-1],'num'); body.append(tr)}}
  [mhSearch,mhMonth].forEach(el=>el.addEventListener('input',renderMhist));
  function onPplans(){const dl=document.getElementById('pp-machines'); dl.replaceChildren();
    [...new Set([...pplanMap.values()].flatMap(p=>(p.rows||[]).map(r=>normMachine(r.machine))).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).forEach(v=>{const o=document.createElement('option');o.value=v;dl.append(o)});
    if(!ppBody.querySelector('input')||![...ppBody.querySelectorAll('input')].some(i=>i.value)) ppLoad();
    renderMhist(); try{renderRecs()}catch(e){} try{renderStock()}catch(e){} try{renderRecon()}catch(e){}}
  ppFill([]);

  // ===== 재료 요청 (생산 → 자재) + 알림 =====
  let reqs=[], reqLoaded=false, riF='open';
  const RQS={'요청':['요청','req'],'처리중':['처리 중','doing'],'완료':['완료','ok'],'취소':['취소','warn']};
  const fmtT=ts=>{const t=new Date(ts);return `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`};
  document.getElementById('rq-need').value=iso(d);
  const rqStatus=document.getElementById('rq-status');
  const rqBody=document.getElementById('rq-body'), UNITS=['kg','포대','EA','박스','롤'];
  function rqRow(){const tr=document.createElement('tr'); const n=document.createElement('td'); n.className='rn'; tr.append(n);
    const mk=(k,l)=>{const td=document.createElement('td'); let el;
      if(k==='unit'){el=document.createElement('select'); UNITS.forEach(u=>{const o=document.createElement('option');o.textContent=u;el.append(o)})}
      else{el=document.createElement('input'); el.placeholder=l; if(k==='qty'){el.type='number';el.min='0';el.step='any';el.inputMode='decimal';td.className='num'} else {el.maxLength=60; el.setAttribute('list','rq-items')}}
      el.dataset.k=k; el.setAttribute('aria-label',l); td.append(el); tr.append(td); return el};
    const it=mk('item','재료 (예: PP 수지 HJ500)'), q=mk('qty','수량'), u=mk('unit','단위');
    it.addEventListener('paste',e=>{const t=(e.clipboardData||window.clipboardData).getData('text'); if(!/[\t\n]/.test(t)) return; e.preventDefault();
      let row=tr; t.replace(/\r/g,'').split('\n').filter(l=>l.trim()).forEach(line=>{if(!row){row=rqRow();rqBody.append(row)} const c=line.split('\t').map(x=>x.trim());
        const f=row.querySelectorAll('[data-k]'); f[0].value=c[0]||''; if(c[1]) f[1].value=c[1].replace(/,/g,''); if(c[2]&&UNITS.includes(c[2])) f[2].value=c[2]; row=row.nextElementSibling}); rqNum()});
    [it,q].forEach((el,ci)=>el.addEventListener('keydown',e=>{if(e.key!=='Enter') return; e.preventDefault(); if(ci===0){q.focus();return}
      let nx=tr.nextElementSibling; if(!nx){nx=rqRow();rqBody.append(nx);rqNum()} nx.querySelector('input').focus()}));
    // 이전 줄 단위 따라가기
    const prev=rqBody.lastElementChild; if(prev){const pu=prev.querySelector('[data-k="unit"]'); if(pu) u.value=pu.value}
    const x=document.createElement('td'); x.className='x'; const bt=document.createElement('button'); bt.type='button'; bt.className='ghost'; bt.textContent='×'; bt.setAttribute('aria-label','이 줄 지우기');
    bt.onclick=()=>{tr.remove(); if(!rqBody.children.length) rqBody.append(rqRow()); rqNum()}; x.append(bt); tr.append(x); return tr}
  function rqNum(){[...rqBody.children].forEach((tr,i)=>tr.firstChild.textContent=i+1)}
  function rqAdd(n){for(let i=0;i<n;i++) rqBody.append(rqRow()); rqNum()}
  rqAdd(3); document.getElementById('rq-add').onclick=()=>rqAdd(3);
  document.getElementById('rqform').addEventListener('submit',async e=>{e.preventDefault();
    if(!db){rqStatus.textContent='요청은 로그인한 직원만 할 수 있습니다.';return}
    if(!canEditTeam('생산')){rqStatus.textContent='재료 요청 권한이 없습니다.';return}
    const rows=[], bad=[];
    [...rqBody.children].forEach((tr,i)=>{tr.classList.remove('err'); const o={}; tr.querySelectorAll('[data-k]').forEach(x=>o[x.dataset.k]=x.value.trim());
      if(!o.item&&!o.qty) return; o.qty=Number(o.qty); if(!o.item||!(o.qty>0)){bad.push(i+1);tr.classList.add('err');return} rows.push(o)});
    if(bad.length){rqStatus.textContent=`${bad.join(', ')}번 줄에 재료와 수량을 넣어 주세요.`;return}
    if(!rows.length){rqStatus.textContent='요청할 재료를 한 줄 이상 넣어 주세요.';return}
    const btn=document.getElementById('rq-save'); btn.disabled=true; rqStatus.textContent='요청 보내는 중…';
    const need=document.getElementById('rq-need').value, memo=document.getElementById('rq-memo').value.trim(), now=Date.now(), batch='b'+now.toString(36);
    try{for(const o of rows) await db.collection('requests').add({item:o.item,qty:o.qty,unit:o.unit,need,memo,batch,status:'요청',author:myId,authorName:me?me.name:'',createdAt:now});
      rqBody.replaceChildren(); rqAdd(3); document.getElementById('rq-memo').value='';
      rqStatus.textContent=`재료 ${rows.length}건을 요청했습니다. 자재 화면과 관리자에게 알림이 갔습니다.`}
    catch(err){rqStatus.textContent='요청하지 못했습니다. 다시 시도해 주세요.'}
    btn.disabled=false});
  function reqWho(x){return x.authorName||x.author||'직원'}
  function stPill(td,stt){const p=document.createElement('span'); const v=RQS[stt]||RQS['요청']; p.className='st '+v[1]; p.textContent=v[0]; td.append(p)}
  function renderReqs(){
    wRender();
    // 생산: 최근 요청
    const rl=document.getElementById('rq-list'); rl.replaceChildren(); const mine=reqs.filter(r=>wOnlyToday(r.data())).slice(0,40);
    document.getElementById('rq-empty').hidden=mine.length>0;
    const dl=document.getElementById('rq-items'); dl.replaceChildren(); [...new Set(reqs.map(r=>r.data().item).filter(Boolean))].slice(0,60).forEach(v=>{const o=document.createElement('option');o.value=v;dl.append(o)});
    for(const s of mine){const x=s.data(), tr=document.createElement('tr'); const c=(t,cl)=>{const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td);return td};
      c(fmtT(x.createdAt),'num'); c(x.item); c(`${Number(x.qty).toLocaleString('ko-KR')} ${x.unit||''}`,'num'); c(x.need||''); c(reqWho(x)); stPill(c(''),x.status);
      const a=c(''); if(x.author===myId&&x.status==='요청'&&canTouch(x)){const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent='취소';
        b.onclick=async()=>{if(b.dataset.c!=='1'){b.dataset.c='1';b.textContent='취소 확인';return} try{await db.collection('requests').doc(s.id).update({status:'취소',doneAt:Date.now()})}catch(e){rqStatus.textContent='취소하지 못했습니다.'}}; a.append(b)}
      rl.append(tr)}
    // 자재: 요청 확인
    const il=document.getElementById('ri-list'); il.replaceChildren();
    const list=reqs.filter(s=>{const t=s.data().status; return riF==='all'?true:riF==='done'?(t==='완료'||t==='취소'):(t==='요청'||t==='처리중')});
    document.getElementById('ri-empty').hidden=list.length>0;
    document.getElementById('ri-empty').textContent=riF==='open'?'처리할 요청이 없습니다.':'요청이 없습니다.';
    const canAct=canEditTeam('생산관리팀');
    for(const s of list){const x=s.data(), tr=document.createElement('tr'); if(x.status==='요청') tr.className='reqnew'; const c=(t,cl)=>{const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td);return td};
      c(fmtT(x.createdAt),'num'); c(x.item); c(`${Number(x.qty).toLocaleString('ko-KR')} ${x.unit||''}`,'num'); c(x.need||''); c(reqWho(x)); c(x.memo||''); stPill(c(''),x.status);
      const a=c(''); const box=document.createElement('div'); box.className='reqacts'; a.append(box);
      const act=(label,stt,cls)=>{const b=document.createElement('button'); b.type='button'; b.className=cls||'ghost'; b.textContent=label;
        b.onclick=async()=>{b.disabled=true; try{await db.collection('requests').doc(s.id).update({status:stt,doneBy:myId,doneByName:me?me.name:'',doneAt:Date.now()})}catch(e){document.getElementById('ri-status').textContent='바꾸지 못했습니다. 권한을 확인해 주세요.'} b.disabled=false}; box.append(b)};
      if(canAct&&x.status==='요청'){act('처리 중','처리중'); act('완료','완료','okbtn')}
      else if(canAct&&x.status==='처리중') act('완료','완료','okbtn');
      else if(x.doneAt&&(x.status==='완료'||x.status==='취소')){const sp=document.createElement('span'); sp.className='hint'; sp.textContent=`${x.doneByName||''} ${fmtT(x.doneAt)}`.trim(); box.append(sp)}
      il.append(tr)}
  }
  document.querySelectorAll('#ri-tabs button').forEach(b=>b.onclick=()=>{riF=b.dataset.f; document.querySelectorAll('#ri-tabs button').forEach(x=>x.setAttribute('aria-selected',x===b)); renderReqs()});
  // 메뉴 배지: 자재 쪽에 처리 전 요청 수
  function setBadge(host,n){if(!host) return; let bd=host.querySelector('.nbadge'); if(!bd){bd=document.createElement('span'); bd.className='nbadge'; const ar=host.querySelector('i'); ar?host.insertBefore(bd,ar):host.append(bd)} bd.textContent=n>99?'99+':n; bd.hidden=!n}
  function renderReqBadges(){const open=reqs.filter(s=>s.data().status==='요청').length;
    setBadge(document.querySelector('.sitem[data-m="reqlist"]'),open);
    const g=[...document.querySelectorAll('.sg')].find(w=>w.dataset.g&&w.dataset.g.startsWith('자재')); if(g) setBadge(g.querySelector('.sgroup'),open)}
  // 알림벨 (관리자): 재료 요청, 요청 처리, 수량 오차
  const bellBtn=document.getElementById('bell'), bellPanel=document.getElementById('bellpanel');
  const seenKey=()=>'kumhoBellSeen_'+(me&&me.user||'');
  function bellSeen(){try{return Number(localStorage.getItem(seenKey()))||0}catch(e){return 0}}
  function bellEvents(){const ev=[];
    for(const s of reqs){const x=s.data();
      ev.push({ts:x.createdAt,ic:'req',sym:'요',t:`재료 요청: ${x.item} ${Number(x.qty).toLocaleString('ko-KR')}${x.unit||''}`,m:`${reqWho(x)} · 필요 ${x.need||'-'} · ${fmtT(x.createdAt)}`,go:'reqlist'});
      if(x.doneAt&&x.status==='완료') ev.push({ts:x.doneAt,ic:'done',sym:'✓',t:`요청 완료: ${x.item}`,m:`${x.doneByName||'자재'} 처리 · ${fmtT(x.doneAt)}`,go:'reqlist'})}
    try{const r=reconMismatch(iso(d).slice(0,7)); if(r.n) ev.push({ts:0,sticky:true,ic:'bad',sym:'!',t:`이번 달 사상반 ↔ 자재 수량 오차 ${r.n}건`,m:'눌러서 오차 확인',go:'recon2'})}catch(e){}
    return ev.sort((a,b)=>(b.sticky-a.sticky)||(b.ts-a.ts)).slice(0,40)}
  function renderBell(){const isAdm=!!me&&(me.role==='admin'||isMgrAcct(me)); bellBtn.hidden=!isAdm; if(!isAdm){bellPanel.hidden=true;return}
    const seen=bellSeen(), ev=bellEvents(), n=ev.filter(e=>e.ts>seen||e.sticky).length;
    const bn=document.getElementById('bell-n'); bn.textContent=n>99?'99+':n; bn.hidden=!n;
    const ul=document.getElementById('bell-list'); ul.replaceChildren();
    if(!ev.length){const li=document.createElement('li'); li.className='none'; li.textContent='새 알림이 없습니다.'; ul.append(li); return}
    for(const e of ev){const li=document.createElement('li'); if(e.ts>seen||e.sticky) li.className='new'; const b=document.createElement('button'); b.type='button';
      const ic=document.createElement('span'); ic.className='ic '+e.ic; ic.textContent=e.sym; const t=document.createElement('span'); t.className='t'; t.textContent=e.t; const m=document.createElement('span'); m.className='m'; m.textContent=e.m;
      b.append(ic,t,m); b.onclick=()=>{bellPanel.hidden=true; bellBtn.setAttribute('aria-expanded','false'); go(e.go,true); try{history.replaceState(null,'','#'+e.go)}catch(x){}}; li.append(b); ul.append(li)}}
  function markRead(){try{localStorage.setItem(seenKey(),String(Date.now()))}catch(e){} renderBell()}
  bellBtn.onclick=e=>{e.stopPropagation(); const o=bellPanel.hidden; bellPanel.hidden=!o; bellBtn.setAttribute('aria-expanded',String(o)); if(o) renderBell()};
  document.getElementById('bell-read').onclick=markRead;
  document.addEventListener('click',e=>{if(!bellPanel.hidden&&!bellPanel.contains(e.target)&&e.target!==bellBtn){bellPanel.hidden=true; bellBtn.setAttribute('aria-expanded','false')}});
  // 새 요청 토스트 (자재 담당·관리자)
  const toastEl=document.getElementById('toast'); let toastT=null;
  function toast(msg,goId){toastEl.textContent=msg; toastEl.hidden=false; toastEl.onclick=()=>{toastEl.hidden=true; if(goId){go(goId,true)}}; clearTimeout(toastT); toastT=setTimeout(()=>toastEl.hidden=true,8000)}
  function seesMat(){return !!me&&!isWorker()&&(canEditTeam('생산관리팀')||accessOf(me).includes('생산관리팀'))}
  function onReqs(first,prev){renderReqs(); renderReqBadges(); renderBell();
    if(first) return;
    const fresh=reqs.map(r=>r.data()).filter((x,i)=>prev.get(reqs[i].id)===undefined&&x.status==='요청'&&x.author!==myId);
    if(fresh.length&&seesMat()){const f=fresh[0]; toast(fresh.length>1?`🔔 새 재료 요청 ${fresh.length}건: ${f.item} 외 ${fresh.length-1}건 (${reqWho(f)})`:`🔔 새 재료 요청: ${f.item} ${Number(f.qty).toLocaleString('ko-KR')}${f.unit||''} (${reqWho(f)})`,'reqlist'); return}
    for(const s of reqs){const x=s.data(); const was=prev.get(s.id);
      if(was&&was!=='완료'&&x.status==='완료'&&x.author===myId){toast(`✓ 요청한 ${x.item}이(가) 완료 처리되었습니다.`,'reqnew'); break}}}

  // 생산 → 자재 받은 내역 (재고 추가로 저장, src:'recv')
  const rvBody=document.getElementById('rv-body'), rvStatus=document.getElementById('rv-status');
  document.getElementById('rv-date').value=iso(d);
  function rvRow(){const tr=document.createElement('tr'); const n=document.createElement('td'); n.className='rn'; tr.append(n);
    [['item','품번'],['lot','LOT'],['qty','받은 수량'],['memo','메모']].forEach(([k,l],ci)=>{const td=document.createElement('td'),inp=document.createElement('input');
      inp.dataset.k=k; inp.setAttribute('aria-label',l); inp.placeholder=l; if(k==='qty'){inp.type='number';inp.min='0';inp.inputMode='numeric';td.className='num'} if(k==='item') inp.setAttribute('list','s-items');
      inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault(); if(ci===3){let nx=tr.nextElementSibling; if(!nx){nx=rvRow();rvBody.append(nx);rvNum()} nx.querySelector('input').focus()} else tr.querySelectorAll('input')[ci+1].focus()}});
      td.append(inp); tr.append(td)});
    const x=document.createElement('td'); x.className='x'; const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent='×'; b.setAttribute('aria-label','이 줄 지우기');
    b.onclick=()=>{tr.remove(); if(!rvBody.children.length) rvBody.append(rvRow()); rvNum()}; x.append(b); tr.append(x); return tr}
  function rvNum(){[...rvBody.children].forEach((tr,i)=>tr.firstChild.textContent=i+1)}
  function rvAdd(n){for(let i=0;i<n;i++) rvBody.append(rvRow()); rvNum()}
  rvAdd(5); document.getElementById('rv-add').onclick=()=>rvAdd(5);
  document.getElementById('rvform').addEventListener('submit',()=>fillLots('rv-body','rv-date'),true);
  document.getElementById('rvform').addEventListener('submit',async e=>{e.preventDefault();
    if(!db){rvStatus.textContent='저장은 로그인한 직원만 할 수 있습니다.';return}
    const date=document.getElementById('rv-date').value, rows=[], bad=[];
    [...rvBody.children].forEach((tr,i)=>{tr.classList.remove('err'); const o={}; tr.querySelectorAll('input').forEach(x=>o[x.dataset.k]=x.value.trim());
      if(!Object.values(o).some(v=>v)) return; o.qty=Math.floor(Number(o.qty));
      if(!o.item||!o.lot||!(o.qty>0)){bad.push(i+1);tr.classList.add('err');return} rows.push(o)});
    if(bad.length){rvStatus.textContent=`${bad.join(', ')}번 줄에 품번, LOT, 수량을 넣어 주세요.`;return}
    if(!rows.length){rvStatus.textContent='입력한 줄이 없습니다.';return}
    const btn=document.getElementById('rv-save'); btn.disabled=true; rvStatus.textContent='저장 중…';
    try{const t=new Date(date+'T12:00:00').getTime(), at=isNaN(t)?Date.now():t;
      for(const o of rows) await db.collection('stock').add({item:o.item,lot:o.lot,qty:o.qty,memo:'생산에서 받음'+(o.memo?' · '+o.memo:''),src:'recv',date,author:myId,createdAt:at,addedAt:Date.now()});
      rvBody.replaceChildren(); rvAdd(5); rvStatus.textContent=`${rows.length}개 품목을 저장했습니다. 사상반이 보낸 수량과 자동으로 비교됩니다.`}
    catch(err){rvStatus.textContent='저장하지 못했습니다. 권한을 확인해 주세요.'}
    btn.disabled=false});
  async function renderRecv(){wRender(); const list=document.getElementById('rv-list'); if(!list) return; list.replaceChildren();
    const mine=moves.filter(s=>{const x=s.data(); return x.src==='recv'&&wOnlyToday(x)}).slice(0,50);
    document.getElementById('rv-empty').hidden=mine.length>0;
    let ps={}; const ids=[...new Set(mine.map(s=>s.data().author).filter(Boolean))]; if(user&&ids.length){try{ps=await user.profiles(ids)}catch(e){}}
    for(const s of mine){const x=s.data(), tr=document.createElement('tr'); const c=(t,cl)=>{const td=document.createElement('td');td.textContent=t;if(cl)td.className=cl;tr.append(td);return td};
      c(x.date||iso(new Date(x.createdAt)),'num'); c(x.item); c(lotLabel(x.lot)); c(Number(x.qty).toLocaleString('ko-KR'),'num'); c(String(x.memo||'').replace(/^생산에서 받음( · )?/,'')); c((ps[x.author]&&ps[x.author].name)||'직원');
      const a=c(''); if(!canTouch(x)&&x.author===myId){a.textContent='지난 기록'; a.style.cssText='font-size:12px;color:var(--muted);white-space:nowrap'; a.title='작업자는 오늘 입력한 내역만 고칠 수 있습니다. 지난 기록은 관리자에게 요청하세요.'} if(canTouch(x)){a.style.whiteSpace='nowrap';
        a.append(editBtn(()=>editDoc({col:'stock',id:s.id,data:x,title:'생산에서 받은 내역 수정',
          view:v=>({...v,date:v.date||iso(new Date(v.createdAt)),memo:String(v.memo||'').replace(/^생산에서 받음( · )?/,'')}),
          save:v=>({...v,memo:'생산에서 받음'+(v.memo?' · '+v.memo:'')}),
          fields:[{k:'date',label:'일자',type:'date',req:true},{k:'item',label:'품번',req:true,upper:true},{k:'lot',label:'LOT',upper:true},{k:'qty',label:'수량',type:'number',req:true},{k:'memo',label:'메모',wide:true}]})));
        const del=document.createElement('button'); del.type='button'; del.className='ghost'; del.textContent='삭제';
        del.onclick=async()=>{if(del.dataset.c!=='1'){del.dataset.c='1';del.textContent='삭제 확인';return} try{await db.collection('stock').doc(s.id).delete()}catch(e){rvStatus.textContent='지우지 못했습니다.'}}; a.append(del)}
      list.append(tr)}}
  document.getElementById('rc-only').addEventListener('change',renderRecon);

  // LOT 입력 도우미: 대문자로, 비어 있으면 날짜로 채우기
  document.addEventListener('change',e=>{const t=e.target; if(t&&t.tagName==='INPUT'&&(t.dataset.k==='lot'||/-lot$/.test(t.id))) t.value=t.value.trim().toUpperCase()},true);
  function hintLot(inputId,dateId){const inp=document.getElementById(inputId), dt=document.getElementById(dateId); if(!inp||!dt) return;
    const up=()=>{const c=lotOf(dt.value); inp.placeholder=c?`${c} (${dt.value.slice(2).replace(/-/g,'.')} LOT)`:'예: VJO'}; dt.addEventListener('input',up); up()}
  hintLot('l-lot','l-date');
  document.getElementById('s-lot').placeholder=`예: ${TODAYLOT} (오늘)`;
  function fillLots(bodyId,dateId){const c=lotOf(document.getElementById(dateId).value); let n=0;
    document.querySelectorAll(`#${bodyId} tr`).forEach(tr=>{const ins=[...tr.querySelectorAll('input')], lot=ins.find(x=>x.dataset.k==='lot');
      if(lot&&!lot.value.trim()&&ins.some(x=>x!==lot&&x.value.trim())){lot.value=c;n++}}); return n}
  // 입고·보낸 내역: 저장 전에 빈 LOT를 일자 코드로 채움
  document.getElementById('slipform').addEventListener('submit',()=>{if(slipType==='입고') fillLots('sl-body','sl-date')},true);
  document.getElementById('xform').addEventListener('submit',()=>fillLots('x-body','x-date'),true);
  // LOT 칸 옆에 날짜 풀이 표시
  document.addEventListener('input',e=>{const t=e.target; if(!(t&&t.tagName==='INPUT'&&(t.dataset.k==='lot'||/-lot$/.test(t.id)))) return;
    const dt=lotDate(t.value); t.title=dt?`제조일 ${dt}`:''});
