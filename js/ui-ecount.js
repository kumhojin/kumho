/* 금호정공 사내 업무 시스템 · 자재: 이카운트 업로드 엑셀
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // 이카운트 업로드 엑셀
  const EC={
    '생산입고':{desc:'손으로 쓴 일일 제품 입고현황 사진이나 파일을 넣으면 생산입고 업로드 엑셀로 정리합니다. 입고현황 1장 = 생산입고 1건.',src:'일일 제품 입고현황 놓기',
      rules:`- 입고현황 한 장은 생산입고 한 건이다(모든 행이 같은 일자, 같은 전표).
- 생산된공장은 항상 250 (사상반), 받는창고는 항상 300 (제품창고).
- 품목코드는 항상 200으로 시작한다(210으로 시작하는 코드는 쓰지 않는다).
- "//" 나 " 표시는 윗행과 같다는 뜻.
- 품명 → 품목코드: M3=20010799, JM S/L (A-D)=20010351-2, JM S/L (N-Q)=20010759, W.LWR=20010451-1-1, DN8=20010785, GBB0334 (1)=20010828(2호는 20010828-1), GBB0297=20010807, GBB0285=20010809, GBB0333=20010846, GBB0292=20010805, GBB0261=20010787, GBB0239=20010757, GBB0317=20010813, GBB0335=20010827, 120-9000=20010765, HM UPR (E-H)=20010591-3 (A~D는 -2, 5~8은 -1). GBBO처럼 O가 보이면 숫자 0으로 읽는다.
- 코드를 모르는 품명은 품목코드 칸을 비우고 notes에 적는다. 작업자 칸은 비운다.
- 읽기 애매한 숫자는 notes에 적는다.`},
    '판매입력':{desc:'출하요청서 사진이나 파일을 넣으면 판매입력 규칙(적요·거래처·LOT)을 적용해 업로드 엑셀로 정리합니다.',src:'출하요청서 놓기',
      rules:()=>'- 판매입력 규칙(반드시 지킨다):\n'+[...document.querySelectorAll('#rules tbody tr')].map(tr=>'  · '+[...tr.cells].map(c=>c.textContent.trim()).join(': ')).join('\n')+'\n- 수량은 실출고수량 칸을 쓴다.'},
    '구매입력':{desc:'원자재(재료) 거래명세서나 입고 자료를 넣으면 구매입력 업로드 엑셀로 정리합니다.',src:'거래명세서 놓기',
      rules:`- 원자재(재료) 구매 입고다. 받는 곳은 창고.
- 품목, 규격, 수량, 단가, 공급가액이 있으면 그대로 옮긴다. 계산이 맞지 않으면 notes에 적는다.
- 거래처명과 일자는 문서에 적힌 그대로.`},
    '재고현황':{desc:'이카운트 재고현황 엑셀을 올려 두면 모든 직원이 품목·LOT별 재고를 찾아볼 수 있고, AI 도우미도 이 자료로 답합니다.'}
  };
  let ecf='생산입고', ecT={}, ecRows=[], ecInv=null;
  try{const v=localStorage.getItem('ecTab'); if(EC[v]) ecf=v}catch(e){}
  const ecstatus=document.getElementById('ec-status'), ecwarn=document.getElementById('ec-warn');
  function headerRow(aoa){let best=0,bi=0; aoa.slice(0,15).forEach((r,i)=>{const n=r.filter(c=>String(c).trim()).length; if(n>best){best=n;bi=i}}); return bi}
  async function sheetAoa(file){const buf=await file.arrayBuffer();
    if(!window.XLSX) throw new Error('엑셀 읽기 도구를 불러오지 못했습니다.');
    const wb=XLSX.read(buf,{type:'array',cellDates:true}); const ws=wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,dateNF:'yyyy-mm-dd'})}
  function ecShow(){
    document.querySelectorAll('#ectabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.f===ecf));
    document.getElementById('ec-desc').textContent=EC[ecf].desc;
    const inv=ecf==='재고현황'; document.getElementById('ec-make').hidden=inv; document.getElementById('ec-inv').hidden=!inv;
    if(inv){renderInv();return}
    document.getElementById('ec-slabel').textContent=EC[ecf].src;
    const t=ecT[ecf], ti=document.getElementById('ec-tinfo'); ti.replaceChildren();
    if(t&&t.headers&&t.headers.length){ti.append(`${t.file||'양식'} · 열 ${t.headers.length}개 저장됨`); const c=document.createElement('div'); c.className='chips';
      t.headers.forEach(h=>{const sp=document.createElement('span');sp.textContent=h;c.append(sp)}); ti.append(c)}
    else ti.textContent='아직 양식이 없습니다. 이카운트 '+ecf+' 화면의 엑셀 업로드에서 양식을 내려받아 놓아 주세요.';
    if(!(ecRows.length&&ecRows.fn===ecf)){document.getElementById('ec-out').hidden=true; ecwarn.hidden=true}
  }
  document.querySelectorAll('#ectabs button').forEach(b=>b.onclick=()=>{ecf=b.dataset.f; try{localStorage.setItem('ecTab',ecf)}catch(e){} ecstatus.textContent=''; ecShow()});
  async function ecTemplate(file){
    if(!db){ecstatus.textContent='양식 저장은 로그인한 직원만 할 수 있습니다.';return}
    try{const aoa=await sheetAoa(file); const hr=headerRow(aoa); const headers=aoa[hr].map(c=>String(c).trim()).filter(Boolean);
      if(headers.length<2){ecstatus.textContent='양식에서 열 이름을 찾지 못했습니다. 이카운트에서 받은 양식 파일인지 확인해 주세요.';return}
      await db.doc('ecount/'+ecf).set({headers,file:file.name,updatedAt:Date.now()});
      ecstatus.textContent=`${ecf} 양식을 저장했습니다 (열 ${headers.length}개).`;
    }catch(e){ecstatus.textContent='양식을 저장하지 못했습니다. '+(e&&e.message?e.message:'')}
  }
  async function ecSource(file){
    const t=ecT[ecf]; if(!t||!t.headers){ecstatus.textContent='먼저 1번에 이카운트 '+ecf+' 업로드 양식을 놓아 주세요.';return}
    const sm=await getSample(); if(!sm){ecstatus.textContent='AI에 연결할 수 없습니다. 상단 「AI 설정」에서 LM Studio 주소를 확인하세요.';return}
    const isImg=/^image\//.test(file.type); let opts={modelTier:'complex'}, body='';
    try{
      if(isImg){const lim=await sm.limits().catch(()=>null);
        if(!(lim&&lim.images)){ecstatus.textContent='이 화면에서는 사진을 보낼 수 없습니다. 엑셀이나 CSV로 넣어 주세요.';return}
        opts.images=[file]; body='(원본은 첨부한 사진이다.)'}
      else body='원본 파일 내용(CSV):\n'+await fileToText(file);
      ecstatus.textContent=`${file.name} 읽는 중… AI가 ${ecf} 양식에 맞춰 정리하고 있습니다.`;
      const rules=typeof EC[ecf].rules==='function'?EC[ecf].rules():EC[ecf].rules;
      const extra=document.getElementById('ec-extra').value.trim();
      const res=await sm.json(`너는 사출 회사 금호정공의 이카운트 ${ecf} 입력 담당이다. 원본 자료를 이카운트 엑셀 업로드 양식의 행으로 바꿔라.
양식 열(이 순서, 이 이름 그대로): ${JSON.stringify(t.headers)}
규칙:\n${rules}
- 원본에 없는 값은 지어내지 말고 빈 문자열. 날짜는 YYYYMMDD 또는 양식에 맞는 형식, 연도가 없으면 ${d.getFullYear()}년.
- 숫자에는 쉼표를 넣지 않는다.${extra?'\n- 추가 지시: '+extra:''}
JSON 하나로만 답하라: {"rows":[{"열이름":"값",...}],"notes":["확인이 필요한 점"]}\n\n${body}`,opts);
      if(!res||!Array.isArray(res.rows)||!res.rows.length){ecstatus.textContent='원본에서 입력할 행을 찾지 못했습니다. 다른 파일이나 더 선명한 사진으로 다시 놓아 주세요.';return}
      ecRows=res.rows.map(r=>t.headers.map(h=>r[h]==null?'':String(r[h]))); ecRows.fn=ecf; ecRows.headers=t.headers;
      const notes=(Array.isArray(res.notes)?res.notes:[res.notes]).filter(Boolean).map(String);
      ecwarn.hidden=!notes.length; ecwarn.replaceChildren(...notes.map(x=>{const p=document.createElement('div');p.textContent='확인: '+x;return p}));
      ecstatus.textContent=`${file.name} → ${ecf} ${ecRows.length}행`; renderEc();
    }catch(e){ecstatus.textContent=e&&e.code==='not_granted'?'LM Studio에 연결할 수 없습니다. LM Studio 서버가 켜져 있는지, CORS가 켜져 있는지, 상단 AI 설정 주소를 확인하세요.':e&&e.code==='rate_limited'?'요청이 많습니다. 잠시 후 다시 놓아 주세요.':e&&e.code==='invalid_json'?'정리 결과를 읽지 못했습니다. 다시 놓아 주세요.':'원본을 정리하지 못했습니다. 다시 시도해 주세요.'}
  }
  function renderEc(){
    const hd=document.getElementById('ec-head'), bd=document.getElementById('ec-body'); hd.replaceChildren(); bd.replaceChildren();
    const tr=document.createElement('tr'); ecRows.headers.forEach(h=>{const th=document.createElement('th');th.textContent=h;tr.append(th)}); hd.append(tr);
    ecRows.forEach((row,ri)=>{const r=document.createElement('tr'); row.forEach((v,ci)=>{const td=document.createElement('td'); td.contentEditable='true'; td.textContent=v;
      td.addEventListener('input',()=>{ecRows[ri][ci]=td.textContent}); r.append(td)}); bd.append(r)});
    document.getElementById('ec-count').textContent=`${ecRows.fn} ${ecRows.length}행`; document.getElementById('ec-out').hidden=false;
  }
  document.getElementById('ec-dl').onclick=async()=>{
    if(!dlTried){dlTried=true; downloads=window.claude&&claude.use?await claude.use('downloads'):null}
    if(!downloads||!window.XLSX){ecstatus.textContent='이 화면에서는 파일을 내려받을 수 없습니다.';return}
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([ecRows.headers,...ecRows]),'Sheet1');
    try{await downloads.save({filename:`이카운트_${ecRows.fn}_${iso(new Date()).replace(/-/g,'')}.xlsx`,data:new Blob([XLSX.write(wb,{type:'array',bookType:'xlsx'})])}); ecstatus.textContent='업로드용 엑셀을 저장했습니다. 이카운트 '+ecRows.fn+' 화면의 엑셀 업로드로 올려 주세요.'}
    catch(e){ecstatus.textContent=e&&e.code==='declined'?'저장을 취소했습니다.':'파일을 저장하지 못했습니다.'}
  };
  async function ecInventory(file){
    const st=document.getElementById('ec-istatus');
    if(!db){st.textContent='재고현황 저장은 로그인한 직원만 할 수 있습니다.';return}
    try{const aoa=await sheetAoa(file); const hr=headerRow(aoa); const headers=aoa[hr].map(c=>String(c).trim());
      const keep=headers.map((h,i)=>h?i:-1).filter(i=>i>=0);
      const rows=aoa.slice(hr+1).filter(r=>r.some(c=>String(c).trim())).slice(0,3000).map(r=>keep.map(i=>String(r[i]??'')));
      st.textContent='올리는 중…';
      await saveInventory(keep.map(i=>headers[i]),rows,file.name,Date.now());
      st.textContent=`${file.name} · ${rows.length}행을 올렸습니다.`;
    }catch(e){st.textContent='재고현황을 올리지 못했습니다. 파일이 너무 크면 필요한 열만 남겨 다시 올려 주세요.'}
  }
  function invRows(){if(!ecInv) return []; try{return JSON.parse(ecInv.rows)}catch(e){return []}}
  function renderInv(){
    const hd=document.getElementById('ec-ihead'), bd=document.getElementById('ec-ibody'); hd.replaceChildren(); bd.replaceChildren();
    const rows=invRows(); document.getElementById('ec-iempty').hidden=rows.length>0; if(!rows.length) return;
    const tr=document.createElement('tr'); ecInv.headers.forEach(h=>{const th=document.createElement('th');th.textContent=h;tr.append(th)}); hd.append(tr);
    const q=document.getElementById('ec-isearch').value.trim().toLowerCase();
    const shown=rows.filter(r=>!q||r.some(c=>c.toLowerCase().includes(q))).slice(0,300);
    shown.forEach(r=>{const x=document.createElement('tr'); r.forEach(c=>{const td=document.createElement('td');td.textContent=c;x.append(td)}); bd.append(x)});
    document.getElementById('ec-istatus').textContent=`${ecInv.file} · ${fmt(ecInv.uploadedAt)} 기준 · ${shown.length}/${rows.length}행 표시`;
  }
  document.getElementById('ec-isearch').addEventListener('input',renderInv);
  wireDrop('ec-tdrop','ec-tfile',ecTemplate); wireDrop('ec-sdrop','ec-sfile',ecSource); wireDrop('ec-idrop','ec-ifile',ecInventory);
  ecShow();
