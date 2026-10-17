/* 금호정공 사내 업무 시스템 · 공통: 날짜·LOT 코드, 메뉴, 파렛트 계산기, 공지, 수정 창
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  const d=new Date(), wd=['일','월','화','수','목','금','토'];
  // LOT NO = 제조년도 + 제조월 + 제조일 (예: 2026-10-15 → VJO)
  const LL='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function lotOf(ds){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(ds||'')); if(!m) return '';
    const y=+m[1],mo=+m[2],dd=+m[3]; return LL[((y-2005)%26+26)%26]+LL[mo-1]+(dd<=26?LL[dd-1]:String(dd-26))}
  function lotDate(code){const c=String(code||'').trim().toUpperCase(), m=/^([A-Z])([A-L])([A-Z1-5])/.exec(c); if(!m) return null;
    const yi=LL.indexOf(m[1]), mo=LL.indexOf(m[2])+1, dd=/\d/.test(m[3])?26+Number(m[3]):LL.indexOf(m[3])+1;
    const base=new Date().getFullYear(); let y=2005+yi; while(y+26<=base+1) y+=26;
    if(dd>31) return null; return `${y}-${String(mo).padStart(2,'0')}-${String(dd).padStart(2,'0')}`}
  function lotLabel(code){const t=lotDate(code); return t?`${code} · ${t.slice(2).replace(/-/g,'.')}`:String(code||'')}
  function lotSortKey(code){return lotDate(code)||('~'+String(code||''))}
  function lotHit(code,term){if(!term) return true; const c=String(code||'').toLowerCase(); if(c.includes(term)) return true;
    const t=lotDate(code); if(!t) return false; const digits=term.replace(/\D/g,''); if(digits.length<4) return false;
    return t.replace(/-/g,'').includes(digits)||t.slice(2).replace(/-/g,'').includes(digits)}
  const TODAYLOT=lotOf(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  document.getElementById('today').textContent=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  document.getElementById('weekday').textContent=wd[d.getDay()]+'요일';

  // 부서 탭
  const TEAMS={'홈':'', '생산':'사출 성형 · 일일 제품 입고현황 · 초물 LOT 기록','생산관리팀':'자재 · 완제품 재고 · 출하계획(CAN/CAC) · 이카운트 입고/판매입력',
    '품질':'검사 · 불량 LOT 기록 · 불량 수량 집계','계발':'신규 품번 · 금형 계발','총무팀':'인사 · 총무 · 사내 공지'};
  const DEFKIND={'생산':'초물','생산관리팀':'원자재','품질':'불량'};
  let team='홈';
  const AREA={'현장':'현장 · 사출 성형과 초물 확인. 이 작업장의 LOT 기록만 보입니다.','사상반':'사상반 · 반제품 검사 후 완제품과 불량으로 분류. 완제품은 창고로 보냅니다.'};
  const AREAKIND={'현장':'초물','사상반':'반제품'};
  const areaSel=document.getElementById('prod-area');
  try{const a=localStorage.getItem('prodArea'); if(AREA[a]) areaSel.value=a}catch(e){}
  function applyArea(){const a=areaSel.value;
    document.getElementById('th-desc').textContent=AREA[a];
    const lb=document.querySelector(`#llocs button[data-l="${a}"]`); if(lb) lb.click();
    const tb=document.querySelector('#ltabs button[data-k="전체"]'); if(tb) tb.click();
    document.getElementById('l-kind').value=AREAKIND[a]; document.getElementById('l-kind').dispatchEvent(new Event('change'));
    document.getElementById('l-loc').value=a;
    try{localStorage.setItem('prodArea',a)}catch(e){}}
  areaSel.addEventListener('change',applyArea);
  const MENU=[
    {g:'공통',items:[['dash','대시보드','홈',['dash','links','teams']],['acct','계정 관리','홈',['acctbox']],['notice','공지사항','홈',['notice']],['bot','포털 도우미','홈',['bot']],['items','품목 관리','홈',['itembox']],['safety','안전재고','홈',['ssbox']],['hist','거래 내역','홈',['histbox']],['imp','자료 가져오기','홈',['impbox']],['audit','변경 기록','홈',['auditbox']]]},
    {g:'자재 · 생산관리팀',items:[['board','자재 현황판','생산관리팀',['boardbox']],['wh_mat','창고별 재고','생산관리팀',['whbox']],['order','수주 · 납기','생산관리팀',['ordbox']],['partner','거래처 관리','생산관리팀',['ptbox']],['slipin','입고 등록','생산관리팀',['slipbox'],'입고'],['slipsale','판매 등록','생산관리팀',['slipbox'],'판매'],['slipbuy','구매 등록','생산관리팀',['slipbox'],'구매'],['stock','완제품 재고','생산관리팀',['stockbox']],['plan','출하 계획표','생산관리팀',['planbox']],
      ['ec','이카운트 올릴 엑셀 만들기','생산관리팀',['ecbox']],['lotpm','LOT 기록','생산관리팀',['lot'],'원자재'],['ecards','이카운트 메뉴','생산관리팀',['ecards']],['pplan2','생산 계획표 · 호기 이력','생산관리팀',['pplanbox']],['reqlist','재료 요청 확인','생산관리팀',['reqinbox']],['recv','생산에서 받은 내역','생산관리팀',['recvbox']],['recon2','사상반 대조','생산관리팀',['reconbox']],['npm','부서 공지','생산관리팀',['notice']]]},
    {g:'생산',items:[['lotprod','LOT 기록','생산',['lot']],['wh_prod','창고별 재고','생산',['whbox']],['pplan','생산 계획표','생산',['pplanbox']],['reqnew','재료 요청','생산',['reqbox']],['xfer','자재로 보낸 내역','생산',['xferbox']],['recon','오차 확인','생산',['reconbox']],['nprod','부서 공지','생산',['notice']]]},
    {g:'품질',items:[['lotqc','불량 LOT','품질',['lot'],'불량'],['initqc','초물 LOT','품질',['lot'],'초물'],['nqc','부서 공지','품질',['notice']]]},
    {g:'고객대응',items:[['claim','클레임 현황','고객대응',['claimbox']],['cpreg','고객 클레임 등록','고객대응',['cpbox']]]},
    {g:'계발',items:[['trial','시험사출','계발',['trialbox']],['wh_dev','창고별 재고','계발',['whbox']],['ndev','부서 공지','계발',['notice']]]},
    {g:'총무팀',items:[['evreg','일정 등록','총무팀',['evbox']],['nga','부서 공지','총무팀',['notice']]]}];
  const ITEM={}; MENU.forEach(g=>g.items.forEach(([id,label,t,show,kind])=>ITEM[id]={id,label,t,show,kind,g:g.g}));
  const SECTIONS=['whbox','ssbox','ordbox','ptbox','histbox','impbox','auditbox','evbox','cpbox','itembox','trialbox','claimbox','boardbox','acctbox','pplanbox','reqbox','reqinbox','xferbox','recvbox','reconbox','slipbox','dash','notice','bot','links','stockbox','calcbox','planbox','ecbox','lot','ecards','rules','teams'];
  const side=document.getElementById('side');
  const mq=window.matchMedia('(max-width:860px)');
  let openG=new Set(); try{JSON.parse(localStorage.getItem('openGroups')||'[]').forEach(x=>openG.add(x))}catch(e){}
  function saveOpen(){try{localStorage.setItem('openGroups',JSON.stringify([...openG]))}catch(e){}}
  // 휴대폰에서는 열린 메뉴를 화면 맨 위층(body)으로 옮겨서 아래 내용에 가려지지 않게 함
  const phone=matchMedia('(max-width:600px)');
  const shade=document.createElement('div'); shade.className='mshade'; shade.hidden=true; document.body.append(shade);
  shade.addEventListener('click',()=>side.querySelectorAll('.sg.open').forEach(w=>setOpen(w,false)));
  function setOpen(wrap,open){wrap.classList.toggle('open',open); wrap.querySelector('.sgroup').setAttribute('aria-expanded',open);
    const box=wrap._box||(wrap._box=wrap.querySelector('.sitems')); if(!box) return;
    if(open&&phone.matches){const top=Math.round(side.getBoundingClientRect().bottom)+4;
      document.documentElement.style.setProperty('--mtop',top+'px'); box.style.top=top+'px';
      box.classList.add('msheet'); document.body.append(box); shade.hidden=false}
    else if(box.parentNode!==wrap){box.classList.remove('msheet'); box.style.top=''; wrap.append(box);
      if(!document.querySelector('.msheet')) shade.hidden=true}}
  MENU.forEach((g,gi)=>{
    const wrap=document.createElement('div'); wrap.className='sg'; wrap.dataset.g=g.g;
    const h=document.createElement('button'); h.type='button'; h.className='sgroup'; h.id='sg'+gi;
    h.innerHTML='<span></span><i aria-hidden="true"></i>'; h.firstChild.textContent=g.g;
    const box=document.createElement('div'); box.className='sitems'; box.setAttribute('role','group'); box.setAttribute('aria-labelledby',h.id);
    h.onclick=()=>{const o=!wrap.classList.contains('open');
      if(mq.matches) side.querySelectorAll('.sg.open').forEach(w=>{if(w!==wrap) setOpen(w,false)});
      setOpen(wrap,o); if(!mq.matches){o?openG.add(g.g):openG.delete(g.g); saveOpen()}};
    g.items.forEach(([id,label])=>{const b=document.createElement('button'); b.type='button'; b.className='sitem'; b.dataset.m=id; b.textContent=label;
      b.onclick=()=>{go(id,true); if(mq.matches) setOpen(wrap,false); try{history.replaceState(null,'','#'+id)}catch(e){}}; box.append(b)});
    wrap.append(h,box); side.append(wrap)});
  document.addEventListener('click',e=>{if(mq.matches&&!side.contains(e.target)&&!(e.target.closest&&e.target.closest('.msheet'))) side.querySelectorAll('.sg.open').forEach(w=>setOpen(w,false))});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mq.matches) side.querySelectorAll('.sg.open').forEach(w=>setOpen(w,false))});
  phone.addEventListener&&phone.addEventListener('change',()=>side.querySelectorAll('.sg.open').forEach(w=>{if(mq.matches) setOpen(w,false); else setOpen(w,true)}));
  side.addEventListener('scroll',()=>{if(phone.matches) side.querySelectorAll('.sg.open').forEach(w=>setOpen(w,false))},{passive:true});
  let curItem='dash';
  function go(id,fromUser){let it=ITEM[id]||ITEM.dash; if(typeof canSee==='function'&&me&&(!canSee(it.t)||!menuOK(it.id))) it=ITEM.dash;
    if(typeof isWorker==='function'&&isWorker()&&!workItems().includes(it.id)) it=ITEM[workItems()[0]]; curItem=it.id; team=it.t;
    side.querySelectorAll('.sitem').forEach(b=>b.setAttribute('aria-current',b.dataset.m===it.id?'page':'false'));
    side.querySelectorAll('.sg').forEach(w=>{const cur=w.dataset.g===it.g; w.classList.toggle('has-cur',cur);
      if(!mq.matches){if(cur){openG.add(it.g);saveOpen()} setOpen(w,openG.has(w.dataset.g))}});
    SECTIONS.forEach(x=>{const el=document.getElementById(x); if(el) el.hidden=!it.show.includes(x)});
    document.getElementById('crumb').textContent=it.g==='공통'?it.label:`${it.g} › ${it.label}`;
    const th=document.getElementById('teamhead'); th.hidden=it.t==='홈';
    document.getElementById('th-name').textContent=it.label; document.getElementById('th-desc').textContent=TEAMS[it.t];
    if(typeof isWorker==='function'&&isWorker()) document.getElementById('th-desc').textContent=it.id==='xfer'?'자재(창고)로 보낸 수량과 불량 수량을 품번·LOT별로 적고 저장하세요.':it.id==='recv'?'생산(사상반)에서 받은 수량을 품번·LOT별로 적고 저장하세요.':it.id==='reqnew'?'필요한 재료와 수량을 적고 요청하세요. 자재가 처리하면 상태가 바뀝니다.':'';
    document.getElementById('n-scope').textContent=it.t==='홈'?'전 부서':it.t+' + 전체';
    document.getElementById('n-team').value=it.t==='홈'?'전체':it.t;
    document.getElementById('prod-areawrap').hidden=it.id!=='lotprod';
    if(it.show.includes('slipbox')) setSlipType(it.kind);
    if(it.id==='items') try{renderItems()}catch(e){}
    if(it.id==='hist'||it.id==='imp'||it.id==='audit') try{histOpen(it.id)}catch(e){}
    if(it.id==='order'||it.id==='partner'||it.id==='dash') try{ordersOpen(it.id)}catch(e){}
    if(it.id==='safety'||it.id==='dash') try{safetyOpen(it.id)}catch(e){}
    if(/^wh_/.test(it.id)) try{whOpen(it.id)}catch(e){}
    if(it.id==='lotprod') applyArea();
    else if(it.show.includes('lot')){const lb=document.querySelector('#llocs button[data-l="전체"]'); if(lb) lb.click();
      const b=document.querySelector(`#ltabs button[data-k="${it.kind||'전체'}"]`); if(b) b.click()}
    if(typeof render==='function'&&docs) render();
    try{localStorage.setItem('menu',it.id)}catch(e){}
    if(typeof applyPerm==='function') try{applyPerm()}catch(e){}
    if(fromUser) window.scrollTo({top:0});
  }
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go,true));
  document.getElementById('k-q').addEventListener('input',()=>renderDash());
  document.getElementById('brand').addEventListener('click',e=>{e.preventDefault(); go('dash',true); try{history.replaceState(null,'','#dash')}catch(x){}});
  function renderDash(){
    try{
      const m=stockMap(); const live=[...m.values()].filter(e=>e.qty!==0);
      const kq=document.getElementById('k-q').value.trim().toLowerCase();
      if(kq){const hit=live.filter(e=>(lotHit(e.lot,kq)||String(e.item||'').toLowerCase().includes(kq)));
        document.getElementById('k-stock2').textContent=hit.length?`창고 ${hit.reduce((a,e)=>a+e.qty,0).toLocaleString('ko-KR')} EA · ${hit.length}개 LOT`:'맞는 재고가 없습니다'}
      else document.getElementById('k-stock2').textContent='찾으면 창고 재고 수량이 나옵니다';
      const ym=iso(new Date()).slice(0,7), bad=recs.map(x=>x.data()).filter(x=>x.kind==='불량'&&String(x.date||'').slice(0,7)===ym);
      document.getElementById('k-bad').textContent=bad.reduce((a,x)=>a+(Number(x.qty)||0),0).toLocaleString('ko-KR');
      document.getElementById('k-bad2').textContent=`EA · ${new Set(bad.map(x=>x.lot)).size}개 LOT`;
      document.getElementById('k-rec').textContent=recs.filter(x=>x.data().kind!=='불량').length.toLocaleString('ko-KR');
      const wk=Date.now()-7*864e5; document.getElementById('k-ntc').textContent=docs.filter(x=>x.data().createdAt>wk).length;
      const dn=document.getElementById('d-notices'); dn.replaceChildren();
      docs.slice(0,5).forEach(x=>{const n=x.data(),li=document.createElement('li'); li.textContent=`[${n.team||'전체'}] ${n.title}`; const t=document.createElement('span'); t.textContent=fmt(n.createdAt); li.append(t); dn.append(li)});
      if(!docs.length){const li=document.createElement('li'); li.className='none'; li.textContent='공지가 없습니다'; dn.append(li)}
      const dm=document.getElementById('d-moves'); dm.replaceChildren();
      moves.slice(0,5).forEach(x=>{const v=x.data(),q=Number(v.qty)||0,li=document.createElement('li'); li.textContent=`${q>0?'추가':'빼기'} ${Math.abs(q).toLocaleString('ko-KR')} · ${v.item} / ${v.lot}`; li.className=q>0?'in':'out'; const t=document.createElement('span'); t.textContent=fmt(v.createdAt); li.append(t); dm.append(li)});
      if(!moves.length){const li=document.createElement('li'); li.className='none'; li.textContent='재고 변동이 없습니다'; dm.append(li)}
      document.getElementById('dash-at').textContent=fmt(Date.now())+' 기준';
      renderBoard();
    }catch(e){}
  }



  // 파렛트 계산기
  const q=document.getElementById('c-qty'), p=document.getElementById('c-per'),
        ppl=document.getElementById('c-ppl'), dest=document.getElementById('c-dest');
  const DEST={CAN:'멕시코 출하는 중박스, 파렛트당 18박스가 기준입니다. 혼적 가능.',CAC:'중국 출하는 소박스, 파렛트당 28박스가 기준입니다. 혼적 가능.'};
  const BOX={CAN:'중박스',CAC:'소박스'};
  let cstate={CAN:{qty:12000,per:400,ppl:18},CAC:{qty:12000,per:200,ppl:28}}, cur='CAN';
  try{const v=JSON.parse(localStorage.getItem('calcState2')||'null'); if(v&&v.s){cstate=Object.assign(cstate,v.s); cur=v.cur in cstate?v.cur:'CAN'}}catch(e){}
  function loadDest(){const c=cstate[cur]; dest.value=cur; q.value=c.qty; p.value=c.per; ppl.value=c.ppl;
    document.getElementById('c-perlbl').textContent=BOX[cur]+'당 입수 (EA)';
    document.getElementById('r-boxlbl').textContent=BOX[cur];
    document.getElementById('c-hint').textContent=DEST[cur]+' 같은 품번도 CAN·CAC 입수가 다르니 해당 박스 입수를 넣으세요. 박스는 올림, 처음 값은 예시입니다.'; calc()}
  dest.addEventListener('change',()=>{cur=dest.value; loadDest(); save()});
  function save(){cstate[cur]={qty:q.value,per:p.value,ppl:ppl.value};try{localStorage.setItem('calcState2',JSON.stringify({cur,s:cstate}))}catch(e){}}
  function calc(){
    const qty=Math.max(0,+q.value||0), per=Math.max(1,+p.value||1), P=Math.max(1,Math.floor(+ppl.value||28));
    document.getElementById('c-tag').textContent=`${cur} · ${P} BOX / PLT`;
    const box=Math.ceil(qty/per), plt=Math.ceil(box/P), rem=box%P;
    document.getElementById('r-box').textContent=box.toLocaleString('ko-KR');
    document.getElementById('r-plt').textContent=plt.toLocaleString('ko-KR');
    document.getElementById('r-rem').textContent=box===0?0:(rem===0?P:rem);
  }
  [q,p,ppl].forEach(el=>el.addEventListener('input',()=>{calc();save()})); loadDest();

  // 공지사항 (공유 DB)
  const form=document.getElementById('nform'), list=document.getElementById('nlist'),
        empty=document.getElementById('nempty'), status=document.getElementById('n-status'),
        submit=document.getElementById('n-submit');
  let db=null,user=null,docs=[];

  // ===== 공통: 기록 수정 창 + 변경 확인 =====
  const edm=document.createElement('div'); edm.className='edm'; edm.hidden=true; edm.setAttribute('role','dialog'); edm.setAttribute('aria-modal','true');
  edm.innerHTML='<div class="box"></div>'; document.body.append(edm); const edBox=edm.firstChild;
  const showVal=v=>(v===''||v==null)?'(비어 있음)':String(v);
  // 바뀐 항목 [{label,old,new}]를 보여주고 확인을 받음 → true/false
  function confirmDiff(title,changes,note){return new Promise(res=>{
    edBox.replaceChildren(); const h=document.createElement('h3'); h.textContent='변경 내용을 확인해 주세요';
    const sub=document.createElement('p'); sub.className='sub'; sub.textContent=title; edBox.append(h,sub);
    const t=document.createElement('table'); t.className='difft'; t.innerHTML='<thead><tr><th>항목</th><th>이전</th><th></th><th>변경 후</th></tr></thead>'; const tb=document.createElement('tbody');
    changes.forEach(c=>{const tr=document.createElement('tr'); [[c.label,''],[showVal(c.old),'o'],['→','ar'],[showVal(c.new),'n']].forEach(([v,cl])=>{const td=document.createElement('td'); td.textContent=v; if(cl) td.className=cl; tr.append(td)}); tb.append(tr)});
    t.append(tb); edBox.append(t);
    if(note){const w=document.createElement('div'); w.className='edwarn'; w.textContent=note; edBox.append(w)}
    const a=document.createElement('div'); a.className='acts'; const no=document.createElement('button'); no.type='button'; no.className='ghost'; no.textContent='취소';
    const ok=document.createElement('button'); ok.type='button'; ok.textContent=`${changes.length}개 항목 변경 저장`; a.append(no,ok); edBox.append(a);
    const done=v=>{edm.hidden=true; document.removeEventListener('keydown',esc); res(v)}; const esc=e=>{if(e.key==='Escape') done(false)};
    no.onclick=()=>done(false); ok.onclick=()=>done(true); document.addEventListener('keydown',esc); edm.hidden=false; ok.focus()})}
  // 두 객체를 필드 목록으로 비교
  function diffOf(fields,oldX,newX){return fields.filter(f=>String(oldX[f.k]??'')!==String(newX[f.k]??'')).map(f=>({label:f.label,old:oldX[f.k],new:newX[f.k]}))}
  // 수정 창: o={col,id,data,title,fields:[{k,label,type,opts,wide}],view?(x)→화면값,save?(vals,x)→저장값,after?(newX,oldX)}
  function editDoc(o){const x=o.data||{}, view=o.view?o.view(x):x;
    edBox.replaceChildren(); const h=document.createElement('h3'); h.textContent=o.title||'수정'; edBox.append(h);
    const fg=document.createElement('div'); fg.className='fg'; const inp={};
    o.fields.forEach(f=>{const l=document.createElement('label'); if(f.wide||f.type==='textarea') l.className='wide'; l.append(f.label);
      let e; if(f.type==='textarea'){e=document.createElement('textarea'); e.maxLength=1000}
      else if(f.type==='select'){e=document.createElement('select'); (f.opts||[]).forEach(v=>{const op=document.createElement('option'); op.value=v; op.textContent=v; e.append(op)})}
      else{e=document.createElement('input'); e.type=f.type||'text'; if(f.type==='number'){e.inputMode='numeric'; e.step='any'}}
      e.value=view[f.k]??''; inp[f.k]=e; l.append(e); fg.append(l)});
    edBox.append(fg);
    const a=document.createElement('div'); a.className='acts'; const st=document.createElement('span'); st.className='status';
    const no=document.createElement('button'); no.type='button'; no.className='ghost'; no.textContent='취소';
    const ok=document.createElement('button'); ok.type='button'; ok.textContent='변경 확인'; a.append(st,no,ok); edBox.append(a);
    const close=()=>{edm.hidden=true; document.removeEventListener('keydown',esc)}; const esc=e=>{if(e.key==='Escape'&&!edBox.querySelector('.difft')) close()};
    no.onclick=close; document.addEventListener('keydown',esc);
    ok.onclick=async()=>{if(isWorker()&&!canTouch(x)){st.textContent='작업자는 오늘 입력한 내역만 고칠 수 있습니다.';return} const vals={}; o.fields.forEach(f=>{let v=inp[f.k].value; v=typeof v==='string'?v.trim():v; if(f.type==='number') v=v===''?null:Number(v); if(f.upper) v=String(v||'').toUpperCase(); vals[f.k]=v});
      if(o.fields.some(f=>f.req&&(vals[f.k]===''||vals[f.k]==null))){st.textContent='필수 항목을 채워 주세요.';return}
      const ch=diffOf(o.fields,view,vals); if(!ch.length){st.textContent='바뀐 내용이 없습니다.';return}
      document.removeEventListener('keydown',esc);
      if(!await confirmDiff(o.title||'수정',ch,o.note)){editDoc({...o}); o.fields.forEach(f=>{const el=edBox.querySelectorAll('input,select,textarea')[o.fields.indexOf(f)]; if(el) el.value=vals[f.k]??''}); return}
      const saveX=o.save?o.save(vals,x):vals; const newX={...x,...saveX,editedBy:myId,editedAt:Date.now()};
      try{await db.collection(o.col).doc(o.id).set(newX); if(o.after) await o.after(newX,x); toastMsg('변경 내용을 저장했습니다.')}
      catch(e){toastMsg('저장하지 못했습니다. 권한을 확인해 주세요.')}};
    edm.hidden=false; setTimeout(()=>{const f=edBox.querySelector('input,select,textarea'); if(f) f.focus()},0)}
  function toastMsg(t){const el=document.getElementById('toast'); if(!el) return; el.textContent=t; el.hidden=false; clearTimeout(toastMsg._t); toastMsg._t=setTimeout(()=>el.hidden=true,3000)}
  // 남이 쓴 기록 고치기·지우기: 관리자와 팀장 (그 부서 '보기+수정'일 때)
  const isAdm=()=>{try{return !!me&&(me.role==='admin'||isLeadAcct(me)||isMgrAcct(me))}catch(e){return false}};
  // 작업자는 '오늘 입력한 것'만 고치거나 지울 수 있음
  const dayOf=t=>{const x=new Date(t); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
  // 작업자는 오늘 자기가 입력한 것만 보임
  function wOnlyToday(x){let w=false; try{w=isWorker()}catch(e){} if(!w) return true; const t=x.addedAt||x.createdAt; return x.author===myId&&!!t&&dayOf(t)===dayOf(Date.now())}
  function canTouch(x){if(!x||!x.author) return false; let w=false; try{w=isWorker()}catch(e){}
    if(isAdm()) return true; if(x.author!==myId) return false; if(!w) return true;
    const t=x.addedAt||x.createdAt; return !!t&&dayOf(t)===dayOf(Date.now())}
  function editBtn(fn){const b=document.createElement('button'); b.type='button'; b.className='ghost editbtn'; b.textContent='수정'; b.onclick=e=>{e.stopPropagation(); fn()}; return b}
  function fmt(ts){const t=new Date(ts);return `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`}
  async function render(){
    renderDash(); const shown=docs.filter(s=>{const tm=s.data().team||'전체';return team==='홈'||tm==='전체'||tm===team});
    list.replaceChildren(); empty.hidden=shown.length>0;
    let ps={}; const ids=[...new Set(shown.map(x=>x.data().author).filter(Boolean))];
    if(user&&ids.length){try{ps=await user.profiles(ids)}catch(e){}}
    for(const s of shown){
      const n=s.data(), li=document.createElement('li');
      const pill=document.createElement('span'); pill.className='pill'+(n.team==='전체'?' all':''); pill.textContent=n.team||'전체';
      const t=document.createElement('span'); t.className='n-title'; t.textContent=n.title||'';
      const m=document.createElement('span'); m.className='n-meta';
      m.textContent=`${(ps[n.author]&&ps[n.author].name)||'직원'} · ${fmt(n.createdAt)}`;
      li.append(pill,t,m);
      if(n.body){const b=document.createElement('div');b.className='n-body';b.textContent=n.body;li.append(b)}
      if(user&&n.author&&(n.author===myId||isAdm())){
        const ed=editBtn(()=>editDoc({col:'notices',id:s.id,data:n,title:'공지 수정',fields:[{k:'title',label:'제목',req:true,wide:true},{k:'team',label:'대상 부서',type:'select',opts:['전체','생산','생산관리팀','품질','계발','총무팀']},{k:'body',label:'내용',type:'textarea'}]}));
        const del=document.createElement('button'); del.type='button'; del.className='ghost'; del.textContent='삭제';
        const wrapB=document.createElement('span'); wrapB.style.cssText='grid-column:3;justify-self:end;white-space:nowrap'; wrapB.append(ed,del);
        del.onclick=async()=>{ if(del.dataset.c!=='1'){del.dataset.c='1';del.textContent='삭제 확인';return}
          try{await db.collection('notices').doc(s.id).delete()}catch(e){status.textContent='삭제하지 못했습니다. 권한을 확인해 주세요.'} };
        li.append(wrapB);
      }
      list.append(li);
    }
  }
  let myId=null;
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!can('notice')){status.textContent='공지 올리기 권한이 없습니다.';return}
    if(!db){status.textContent='공지 저장은 로그인한 직원만 할 수 있습니다.';return}
    const title=document.getElementById('n-title').value.trim(); if(!title) return;
    submit.disabled=true; status.textContent='올리는 중…';
    try{
      await db.collection('notices').add({title,body:document.getElementById('n-body').value.trim(),
        team:document.getElementById('n-team').value,author:myId,createdAt:Date.now()});
      form.reset(); status.textContent='공지를 올렸습니다.';
    }catch(err){status.textContent='공지를 올리지 못했습니다. 보기 전용 권한이면 관리자에게 편집 권한을 요청하세요.'}
    submit.disabled=false;
  });
