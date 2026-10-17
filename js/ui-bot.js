/* 금호정공 사내 업무 시스템 · 포털 도우미 (AI 검색)
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // 포털 도우미
  const chat=document.getElementById('chat'), cform=document.getElementById('cform'),
        cin=document.getElementById('c-in'), csend=document.getElementById('c-send');
  const history=[];
  function bubble(cls,txt){const m=document.createElement('div');m.className='msg '+cls;m.textContent=txt;chat.append(m);chat.scrollTop=chat.scrollHeight;return m}
  const rulesText=[...document.querySelectorAll('#rules tbody tr')].map(tr=>[...tr.cells].map(c=>c.textContent.trim()).join(': ')).join('\n');
  const teamsText=[...document.querySelectorAll('.team')].map(t=>[...t.children].map(c=>c.textContent.trim()).join(': ')).join('\n');
  const SYS=`너는 사출 회사 금호정공의 사내 포털 도우미다. 항상 한국어로 짧고 정확하게 답한다.
아래 정보와 도구 결과에만 근거해 답하고, 모르면 모른다고 말하며 담당 부서를 안내한다. 지어내지 않는다.
[판매입력 규칙]\n${rulesText}\n[부서]\n${teamsText}\n[파렛트] 1파렛트=28박스, 박스 수=올림(수량/박스당 입수).
LOT NO는 제조년도+제조월+제조일 세 글자다. 년도: 2026=V, 2027=W, 2028=X, 2029=Y, 2030=Z, 2031=A…(26년 주기). 월: 1~12월=A~L. 일: 1~26일=A~Z, 27~31일=1~5. 예: 2026-10-15=VJO. 날짜로 물으면 LOT 코드로 바꿔 찾는다. 오늘 LOT는 ${TODAYLOT}이다.\n보관 위치는 창고, 사상반, 현장, 품질이다. 창고에는 재료(원자재)와 완제품, 사상반에는 반제품이 있다. 사상반에서 반제품을 검사해 완제품과 불량으로 나누고, 완제품은 창고로 간다. 불량은 따로 보관하지 않고 LOT별 수량만 기록하므로 불량 수량은 같은 LOT의 불량 기록을 합해서 답한다. query를 빈 문자열로 주면 조건에 맞는 전체를 본다.
LOT·원자재·초물·불량 기록 질문은 search_records 도구로, 공지 질문은 list_notices 도구로, 포털에 직접 입력한 완제품 재고는 get_stock, 이카운트 재고현황은 get_ecount_inventory 도구로 찾는다.`;
  const tools=[
    {name:'search_records',description:'자재·제품 LOT 기록 검색. query는 LOT 번호, 품번, 메모의 일부. kind는 원자재/반제품/완제품/초물/불량/전체. loc는 보관 위치 창고/사상반/현장/품질/전체. 불량은 위치 없이 LOT별 불량 수량만 기록된다.',
     inputSchema:{type:'object',properties:{query:{type:'string'},kind:{type:'string'},loc:{type:'string'}},required:['query']},
     execute:({query,kind,loc})=>{const q=String(query||'').toLowerCase();
       return recs.map(s=>s.data()).filter(r=>(!kind||kind==='전체'||r.kind===kind)&&(!loc||loc==='전체'||r.loc===loc)&&
         [r.lot,r.item,r.memo,r.date].some(v=>String(v||'').toLowerCase().includes(q)))
         .slice(0,30).map(({kind,loc,date,item,lot,qty,unit,memo})=>({kind,loc,date,item,lot,qty,unit,memo}))}},
    {name:'get_stock',description:'창고 완제품 현재 재고. query는 품번이나 LOT 일부(빈 문자열이면 전체).',
     inputSchema:{type:'object',properties:{query:{type:'string'}}},
     execute:({query})=>{const q=String(query||'').toLowerCase();
       return [...stockMap().values()].filter(e=>e.qty!==0&&(!q||(lotHit(e.lot,q)||String(e.item||'').toLowerCase().includes(q))))
         .slice(0,50).map(({item,lot,qty})=>({item,lot,qty}))}},
    {name:'get_ecount_inventory',description:'이카운트에서 올린 재고현황 검색. query는 품목코드, 품목명, LOT 일부.',
     inputSchema:{type:'object',properties:{query:{type:'string'}},required:['query']},
     execute:({query})=>{const q=String(query||'').toLowerCase(); if(!ecInv) return {error:'아직 올린 재고현황이 없음'};
       return {기준:ecInv.file+' '+new Date(ecInv.uploadedAt).toLocaleString('ko-KR'),열:ecInv.headers,
         행:invRows().filter(r=>!q||r.some(c=>c.toLowerCase().includes(q))).slice(0,40)}}},
    {name:'compare_transfers',description:'사상반이 창고로 보낸 수량과 창고 입고 수량 비교(품번·LOT별). query는 품번/LOT 일부(빈 문자열이면 전체).',
     inputSchema:{type:'object',properties:{query:{type:'string'}}},
     execute:({query})=>{const q=String(query||'').toLowerCase(), m=new Map(), k=(i,l)=>i+'|'+l;
       xfers.forEach(s=>{const x=s.data(),e=m.get(k(x.item,x.lot))||{item:x.item,lot:x.lot,사상반:0,창고:0}; e.사상반+=Number(x.qty)||0; m.set(k(x.item,x.lot),e)});
       moves.forEach(s=>{const x=s.data(),n=Number(x.qty)||0; if(n<=0) return; const e=m.get(k(x.item,x.lot))||{item:x.item,lot:x.lot,사상반:0,창고:0}; e.창고+=n; m.set(k(x.item,x.lot),e)});
       return [...m.values()].filter(e=>!q||[e.item,e.lot].some(v=>String(v).toLowerCase().includes(q))).map(e=>({...e,차이:e.창고-e.사상반})).slice(0,50)}},
    {name:'list_complaints',description:'고객 클레임 목록. month는 YYYY-MM (비우면 최근 전체).',inputSchema:{type:'object',properties:{month:{type:'string'}}},
     execute:({month})=>calComplaints().map(c=>c.data()).filter(x=>!month||String(x.date).startsWith(month)).slice(0,50).map(({date,partner,item,lot,qty,body})=>({date,partner,item,lot,qty,body}))},
    {name:'list_plans',description:'저장된 출하 계획표 목록(CAN/CAC). query는 파일명·품번·납품일 일부.',inputSchema:{type:'object',properties:{query:{type:'string'}}},
     execute:({query})=>{const q=String(query||'').toLowerCase(); return plans.map(p=>p.data()).filter(x=>!q||[x.file,...(x.items||[]),...(x.dates||[])].some(v=>String(v).toLowerCase().includes(q))).slice(0,20)
       .map(x=>{let out=[]; try{out=JSON.parse(x.data).out.map(o=>({납품일:o.date,파렛트:o.pallets.length,혼적:o.pallets.filter(p=>p.type==='혼적').length}))}catch(e){} return {파일:x.file,구분:x.dest,작성:new Date(x.createdAt).toLocaleString('ko-KR'),날짜별:out}})}},
    {name:'machine_history',description:'품번별로 어느 호기(사출기, 예: 80-2)에서 며칠 생산했는지. 생산 계획표 기준. query는 품번 일부, month는 YYYY-MM(비우면 전체).',inputSchema:{type:'object',properties:{query:{type:'string'},month:{type:'string'}}},
     execute:({query,month})=>{const q=nItem(query), out={}; for(const [date,p] of pplanMap){if(month&&!date.startsWith(month)) continue; for(const r of (p.rows||[])){if(q&&!nItem(r.item).includes(q)) continue; const o=out[r.item]=out[r.item]||{}; const mc=normMachine(r.machine); (o[mc]=o[mc]||[]).push(date)}} return Object.entries(out).slice(0,30).map(([item,ms])=>({품번:item,호기:Object.fromEntries(Object.entries(ms).map(([m,ds])=>[m,{생산일수:ds.length,최근:ds.sort().pop()}]))}))}},
    {name:'list_notices',description:'최근 공지사항 목록',inputSchema:{type:'object',properties:{}},
     execute:()=>docs.slice(0,15).map(s=>{const n=s.data();return {team:n.team,title:n.title,body:n.body,date:new Date(n.createdAt).toLocaleDateString('ko-KR')}})}
  ];
  cform.addEventListener('submit',async e=>{
    e.preventDefault(); const q=cin.value.trim(); if(!q) return;
    bubble('me',q); cin.value='';
    await getSample();
    if(!sample){bubble('bot','AI에 연결할 수 없습니다. 상단 「AI 설정」을 확인하세요.');return}
    history.push({role:'user',content:q});
    const out=bubble('bot','생각 중…'); csend.disabled=true;
    try{
      const msgs=[{role:'user',content:SYS+'\n\n(이해했으면 다음 질문에 답하라)'},{role:'assistant',content:'네.'},...history.slice(-8)];
      const r=await sample(msgs,{tools,cache:false,modelTier:'quick',onText:({text})=>{out.textContent=text||'생각 중…'}});
      out.textContent=r.text; history.push({role:'assistant',content:r.text});
    }catch(err){
      history.pop();
      out.textContent=err&&err.code==='not_granted'?'LM Studio에 연결할 수 없습니다. LM Studio 서버(CORS 켜기)와 상단 AI 설정을 확인하세요.'
        :err&&err.code==='rate_limited'?'요청이 많습니다. 잠시 후 다시 물어봐 주세요.':'답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }
    csend.disabled=false;
  });
