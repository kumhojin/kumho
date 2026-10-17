/* 금호정공 사내 업무 시스템 · 자재: 출하 계획표 자동 작성
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // 출하 계획표 자동 작성
  const PDEST={CAN:{box:'중박스',P:18,pull:false,name:'CAN 멕시코'},CAC:{box:'소박스',P:28,pull:true,name:'CAC 중국'}};
  const pdest=document.getElementById('p-dest'), pstatus=document.getElementById('p-status'),
        pwarn=document.getElementById('p-warn'), pout=document.getElementById('p-out');
  const guides={CAN:{},CAC:{}}; let lastExtract=null, lastPlan=null, selDate=null;
  const norm=x=>String(x||'').replace(/\s+/g,'').toUpperCase();
  function guideInfo(){const D=PDEST[pdest.value], n=Object.keys(guides[pdest.value]).length;
    document.getElementById('p-gname').textContent=D.box+' · '+pdest.value;
    document.getElementById('p-guideinfo').textContent=n?`${D.box} 입수표 ${n}개 품번 저장됨`:`${D.box} 입수표가 비어 있습니다. 아래 ‘박스당 입수표’에서 먼저 넣어 주세요.`;
    const gb=document.getElementById('p-gbody'); gb.replaceChildren();
    Object.entries(guides[pdest.value]).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([k,v])=>{
      const tr=document.createElement('tr'); const a=document.createElement('td'); a.textContent=k;
      const b=document.createElement('td'); b.textContent=Number(v).toLocaleString('ko-KR'); b.style.textAlign='right'; b.className='num';
      const c=document.createElement('td'); const del=document.createElement('button'); del.type='button'; del.className='ghost'; del.textContent='삭제';
      del.onclick=()=>{const m={...guides[pdest.value]}; delete m[k]; saveGuide(pdest.value,m)}; c.append(del); tr.append(a,b,c); gb.append(tr)});
  }
  async function saveGuide(dest,map){
    if(!db){pstatus.textContent='입수표 저장은 로그인한 직원만 할 수 있습니다.';return false}
    try{await db.doc('boxguide/'+dest).set({map,updatedAt:Date.now()});return true}
    catch(e){pstatus.textContent='입수표를 저장하지 못했습니다. 편집 권한을 확인해 주세요.';return false}
  }
  pdest.addEventListener('change',()=>{guideInfo(); if(lastExtract) runPlan()});
  document.getElementById('p-gform').addEventListener('submit',async e=>{e.preventDefault();
    const k=document.getElementById('p-gitem').value.trim(), v=Math.floor(+document.getElementById('p-gper').value);
    if(!k||!(v>0)) return; const m={...guides[pdest.value],[k]:v};
    if(await saveGuide(pdest.value,m)){document.getElementById('p-gitem').value='';document.getElementById('p-gper').value='';pstatus.textContent=`${k} 입수 ${v} 저장했습니다.`}});
  function fileToText(file){return file.arrayBuffer().then(buf=>{
    if(/\.csv$/i.test(file.name)) return new TextDecoder().decode(buf);
    if(!window.XLSX) throw new Error('엑셀 읽기 도구를 불러오지 못했습니다.');
    const wb=XLSX.read(buf,{type:'array',cellDates:true});
    return wb.SheetNames.map(n=>`### 시트: ${n}\n`+XLSX.utils.sheet_to_csv(wb.Sheets[n],{blankrows:false,dateNF:'yyyy-mm-dd'})).join('\n\n');
  }).then(t=>t.length>90000?t.slice(0,90000)+'\n...(이후 생략)':t)}
  function wireDrop(id,inputId,fn){const z=document.getElementById(id), inp=document.getElementById(inputId);
    ['dragenter','dragover'].forEach(ev=>z.addEventListener(ev,e=>{e.preventDefault();z.classList.add('over')}));
    ['dragleave','drop'].forEach(ev=>z.addEventListener(ev,e=>{e.preventDefault();z.classList.remove('over')}));
    z.addEventListener('drop',e=>{const f=e.dataTransfer.files[0]; if(f) fn(f)});
    inp.addEventListener('change',()=>{const f=inp.files[0]; if(f) fn(f); inp.value=''})}
  async function getSample(){if(!sampleTried){sampleTried=true; sample=window.claude&&claude.use?await claude.use('sample'):null} return sample}
  async function readGuide(file){
    const sm=await getSample(); if(!sm){pstatus.textContent='AI에 연결할 수 없습니다. 상단 「AI 설정」에서 LM Studio 주소를 확인하세요.';return}
    const D=PDEST[pdest.value]; pstatus.textContent=`${file.name} 읽는 중… (${D.box} 입수)`;
    try{const text=await fileToText(file);
      const res=await sm.json(`아래는 사출 회사의 품번별 박스 입수표 파일 내용(CSV)이다. 각 품번의 ${D.box} 1박스당 입수(EA)를 찾아라.
중박스와 소박스 열이 따로 있으면 ${D.box} 열만 쓴다. 열이 하나뿐이면 그 값을 쓴다. 합계·빈 행은 무시한다.
JSON 객체 하나로만 답하라: {"품번": 입수숫자, ...}. 품번은 파일에 적힌 그대로, 입수는 정수.\n\n${text}`,{modelTier:'default'});
      const m={...guides[pdest.value]}; let n=0;
      for(const [k,v] of Object.entries(res||{})){const x=Math.floor(Number(v)); if(k&&x>0){m[String(k).trim()]=x;n++}}
      if(!n){pstatus.textContent='입수표에서 품번과 입수를 찾지 못했습니다. 파일을 확인하거나 직접 입력해 주세요.';return}
      if(await saveGuide(pdest.value,m)) pstatus.textContent=`${D.box} 입수 ${n}개 품번을 저장했습니다. 표에서 맞는지 확인해 주세요.`;
      document.getElementById('p-guide').open=true; if(lastExtract) runPlan();
    }catch(e){pstatus.textContent=e&&e.code==='not_granted'?'LM Studio에 연결할 수 없습니다. LM Studio 서버가 켜져 있는지, CORS가 켜져 있는지, 상단 AI 설정 주소를 확인하세요.':'입수표를 읽지 못했습니다. '+(e&&e.message?e.message:'')}
  }
  async function readOrder(file){
    const sm=await getSample(); if(!sm){pstatus.textContent='AI에 연결할 수 없습니다. 상단 「AI 설정」에서 LM Studio 주소를 확인하세요.';return}
    pstatus.textContent=`${file.name} 읽는 중… AI가 품번과 납품일별 수량을 정리하고 있습니다.`; pout.hidden=true; pwarn.hidden=true;
    try{const text=await fileToText(file);
      const res=await sm.json(`아래는 사출 회사가 받은 출하(발주) 파일 내용(CSV)이다. 출하해야 할 제품을 품번별, 납품일별 수량(EA)으로 정리하라.
- 날짜는 YYYY-MM-DD로. 연도가 없으면 오늘(${iso(new Date())}) 기준으로 가장 가까운 연도.
- 합계, 소계, 누계, 재고, 단가 같은 열/행은 빼고 납품일별 수량만. 0이나 빈 값은 넣지 않는다.
- 확정월과 예시(포캐스트)월이 같이 있으면 둘 다 넣고 notes에 적는다.
JSON 하나로만 답하라: {"products":[{"item":"품번","name":"품명 또는 차종","orders":{"YYYY-MM-DD":수량}}],"notes":"특이사항(없으면 빈 문자열)"}\n\n${text}`,{modelTier:'default'});
      if(!res||!Array.isArray(res.products)||!res.products.length){pstatus.textContent='파일에서 출하 품번과 수량을 찾지 못했습니다. 다른 파일인지 확인해 주세요.';return}
      lastExtract={file:file.name,products:res.products,notes:String(res.notes||'')}; planDocId=null; runPlan();
    }catch(e){pstatus.textContent=e&&e.code==='not_granted'?'LM Studio에 연결할 수 없습니다. LM Studio 서버가 켜져 있는지, CORS가 켜져 있는지, 상단 AI 설정 주소를 확인하세요.':e&&e.code==='rate_limited'?'요청이 많습니다. 잠시 후 다시 놓아 주세요.':'파일을 정리하지 못했습니다. 다시 시도해 주세요.'}
  }
  function plan(products,guide,D){
    const P=D.P, gmap=new Map(Object.entries(guide).map(([k,v])=>[norm(k),v])), missing=[], items=[];
    for(const p of products){const per=gmap.get(norm(p.item)); const ord={};
      for(const [d,q] of Object.entries(p.orders||{})){const n=Number(q); if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&n>0) ord[d]=(ord[d]||0)+n}
      if(!Object.keys(ord).length) continue;
      if(!per){missing.push(p.item); continue}
      const ds=Object.keys(ord).sort(); let cum=0, prevB=0; const need={};
      for(const d of ds){cum+=ord[d]; const b=Math.ceil(cum/per); need[d]=b-prevB; prevB=b}
      items.push({item:String(p.item).trim(),name:p.name||'',per,ord,need,rem:{...need},ship:{},pulled:{}})}
    const dates=[...new Set(items.flatMap(it=>Object.keys(it.ord)))].sort();
    const later=(it,d)=>Object.keys(it.rem).filter(x=>x>d&&x.slice(0,7)===d.slice(0,7)&&it.rem[x]>0).sort();
    const take=(it,d,n)=>{let got=0; for(const x of later(it,d)){const t=Math.min(it.rem[x],n-got); it.rem[x]-=t; got+=t; if(got>=n) break} if(got){it.ship[d]=(it.ship[d]||0)+got; it.pulled[d]=(it.pulled[d]||0)+got} return got};
    const avail=(it,d)=>later(it,d).reduce((a,x)=>a+it.rem[x],0);
    const out=[];
    for(const d of dates){
      for(const it of items){const b=it.rem[d]||0; if(b){it.ship[d]=(it.ship[d]||0)+b; it.rem[d]=0}
        if(D.pull&&it.ship[d]&&it.ship[d]%P){const r=P-it.ship[d]%P; if(avail(it,d)>=r) take(it,d,r)}}
      const pallets=[], left=[];
      for(const it of items){const b=it.ship[d]||0; if(!b) continue;
        for(let i=0;i<Math.floor(b/P);i++) pallets.push({type:'단품',parts:[{item:it.item,boxes:P,ea:P*it.per}]});
        if(b%P) left.push({it,n:b%P})}
      left.sort((a,b)=>b.n-a.n); const mixed=[];
      for(const l of left){let pl=mixed.find(m=>m.free>=l.n); if(!pl){pl={free:P,parts:[]};mixed.push(pl)} pl.parts.push({it:l.it,n:l.n}); pl.free-=l.n}
      if(D.pull) for(const m of mixed){
        for(const pt of m.parts){if(!m.free) break; const g=take(pt.it,d,m.free); pt.n+=g; m.free-=g}
        for(const it of items){if(!m.free) break; if(m.parts.some(pt=>pt.it===it)) continue; const g=take(it,d,m.free); if(g){m.parts.push({it,n:g}); m.free-=g}}}
      let partial=0;
      for(const m of mixed){if(m.free) partial++;
        pallets.push({type:m.parts.length>1?'혼적':'단품',free:m.free,parts:m.parts.map(pt=>({item:pt.it.item,boxes:pt.n,ea:pt.n*pt.it.per}))})}
      out.push({date:d,pallets,partial})}
    return {items,dates,out,missing,P}
  }
  function runPlan(){
    if(!lastExtract) return; const D=PDEST[pdest.value];
    const res=plan(lastExtract.products,guides[pdest.value],D); lastPlan={...res,D,dest:pdest.value};
    const w=[];
    if(res.missing.length) w.push(`${D.box} 입수표에 없는 품번 ${res.missing.length}개는 계산에서 빠졌습니다: ${res.missing.join(', ')}. 아래 ‘박스당 입수표’에 넣으면 바로 다시 계산합니다.`);
    const today=iso(new Date()); const past=res.dates.filter(d=>d<today); if(past.length) w.push(`이미 지난 납품일이 있습니다 (${past.join(', ')}). 실제 출고분으로 다시 확인해 주세요.`);
    const parts=res.out.filter(o=>o.partial).map(o=>o.date); if(parts.length) w.push(`${D.P}박스를 다 못 채운 파렛트가 있는 날: ${parts.join(', ')}. 그대로 보낼지, 박스를 더 넣을지 정해 주세요.`);
    if(!D.pull) w.push('CAN은 박스를 앞날짜로 당기지 않고 납품일 수량 그대로 계산했습니다.');
    if(lastExtract.notes) w.push('파일 참고: '+lastExtract.notes);
    pwarn.hidden=!w.length; pwarn.replaceChildren(...w.map(t=>{const p=document.createElement('div');p.textContent=t;return p}));
    if(!res.items.length){pout.hidden=true; pstatus.textContent='계산할 수 있는 품번이 없습니다. 입수표를 먼저 채워 주세요.'; return}
    pstatus.textContent=`${lastExtract.file} · ${D.name} · ${res.items.length}개 품번, 납품일 ${res.dates.length}일`;
    if(!res.dates.includes(selDate)) selDate=res.dates[0]; renderPlan(); savePlan();
  }
  function renderPlan(){
    const {items,out,D}=lastPlan; pout.hidden=false; pout.replaceChildren();
    const sum=document.createElement('div'); sum.className='psum';
    let tot=0;
    for(const o of out){const n=o.pallets.length, mix=o.pallets.filter(p=>p.type==='혼적').length; tot+=n;
      const c=document.createElement('div'); c.tabIndex=0; c.setAttribute('role','button'); c.setAttribute('aria-pressed',o.date===selDate);
      c.innerHTML='<span></span><b></b><em></em>'; c.children[0].textContent=o.date.slice(5).replace('-','/');
      c.children[1].textContent=n+' P'; c.children[2].textContent=`단품 ${n-mix} · 혼적 ${mix}`;
      const go=()=>{selDate=o.date; renderPlan()}; c.onclick=go; c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}};
      sum.append(c)}
    const head=document.createElement('div'); head.className='row'; head.style.justifyContent='space-between';
    const ht=document.createElement('b'); ht.textContent=`전체 ${tot} 파렛트 · ${D.box} ${D.P}박스/파렛트`;
    const dl=document.createElement('button'); dl.type='button'; dl.textContent='엑셀로 받기'; dl.onclick=exportPlan; head.append(ht,dl);
    pout.append(head,sum);
    const o=out.find(x=>x.date===selDate); if(!o) return;
    const t=document.createElement('div'); t.className='scroll';
    t.innerHTML=`<table class="rules ptable"><thead><tr><th>품번</th><th>품명</th><th class="num">발주 (EA)</th><th class="num">계획 박스</th><th class="num">계획 (EA)</th><th class="num">당긴 박스</th></tr></thead><tbody></tbody></table>`;
    const tb=t.querySelector('tbody');
    for(const it of items){const b=it.ship[o.date]||0, q=it.ord[o.date]||0; if(!b&&!q) continue;
      const tr=document.createElement('tr'); if(it.pulled[o.date]) tr.className='pulled';
      [[it.item],[it.name],[q.toLocaleString('ko-KR'),'num'],[b,'num'],[(b*it.per).toLocaleString('ko-KR'),'num'],[it.pulled[o.date]||'—','num']]
        .forEach(([v,c])=>{const td=document.createElement('td');td.textContent=v;if(c)td.className=c;tr.append(td)}); tb.append(tr)}
    const h=document.createElement('b'); h.textContent=`${o.date} 파렛트 구성`;
    const ul=document.createElement('ul'); ul.className='plist';
    o.pallets.forEach((p,i)=>{const li=document.createElement('li');
      const a=document.createElement('span'); a.className='no'; a.textContent='#'+(i+1);
      const b=document.createElement('span'); b.className=p.type==='혼적'?'mix':'single'; b.textContent=p.type+(p.free?` (${D.P-p.free}/${D.P})`:'');
      const c=document.createElement('span'); c.textContent=p.parts.map(x=>`${x.item} ${x.boxes}박스 (${x.ea.toLocaleString('ko-KR')} EA)`).join(' + ');
      li.append(a,b,c); ul.append(li)});
    const note=document.createElement('p'); note.className='hint'; note.textContent='노란 줄은 뒤 납품일 박스를 앞으로 당겨 실은 품번입니다. 박스는 뒤로 미루지 않습니다.';
    pout.append(t,note,h,ul);
  }
  let downloads=null, dlTried=false;
  async function exportPlan(){
    if(!dlTried){dlTried=true; downloads=window.claude&&claude.use?await claude.use('downloads'):null}
    if(!downloads||!window.XLSX){pstatus.textContent='이 화면에서는 파일을 내려받을 수 없습니다.';return}
    const {items,out,D,dest}=lastPlan, wb=XLSX.utils.book_new();
    const rows=[['납품일','품번','품명','발주(EA)','계획 박스','계획(EA)','당긴 박스']];
    for(const o of out) for(const it of items){const b=it.ship[o.date]||0,q=it.ord[o.date]||0; if(b||q) rows.push([o.date,it.item,it.name,q,b,b*it.per,it.pulled[o.date]||0])}
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'계획표');
    const s2=[['납품일','파렛트','구분','품번','박스','EA']];
    for(const o of out) o.pallets.forEach((p,i)=>p.parts.forEach(x=>s2.push([o.date,i+1,p.type,x.item,x.boxes,x.ea])));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s2),'파렛트 구성');
    const s3=[['납품일','총 파렛트','단품','혼적','미달 파렛트']];
    for(const o of out){const m=o.pallets.filter(p=>p.type==='혼적').length; s3.push([o.date,o.pallets.length,o.pallets.length-m,m,o.partial])}
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s3),'날짜별 요약');
    const buf=XLSX.write(wb,{type:'array',bookType:'xlsx'});
    try{await downloads.save({filename:`파렛트_출하계획_${dest}_${iso(new Date()).replace(/-/g,'')}.xlsx`,data:new Blob([buf])}); pstatus.textContent='엑셀 파일을 저장했습니다.'}
    catch(e){pstatus.textContent=e&&e.code==='declined'?'저장을 취소했습니다.':'파일을 저장하지 못했습니다.'}
  }

  wireDrop('p-drop','p-file',readOrder); wireDrop('p-gdrop','p-gfile',readGuide); guideInfo();
