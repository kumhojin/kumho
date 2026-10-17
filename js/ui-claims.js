/* 금호정공 사내 업무 시스템 · 고객대응: 클레임 현황
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
  // ===== 고객대응 · 클레임 현황 (신속 대응 추적표) =====
  const FRB_STEPS=[['d1','D+1','봉쇄조치'],['d2','D+2','원인분석'],['d4','D+4','개선조치'],['ep','D+4','실수방지·검출'],['lpa','D+5','계층적 공정감사'],['d7','D+7','개선조치 검증'],['pfmea','D+8','PFMEA/CP'],['std','D+8','표준작업 훈련'],['ll','D+8','습득 교훈']];
  const FRB_ST={'':'—',R:'R',Y:'Y',G:'G',NA:'N/A'};
  let claims=[], frbCur=null;
  (function(){const box=document.getElementById('frb-steps');
    FRB_STEPS.forEach(([k,d,l])=>{const f=document.createElement('fieldset'); const lg=document.createElement('legend'); lg.textContent=d+' '+l;
      const sel=document.createElement('select'); sel.id='fs-'+k; Object.entries({'':'미정','R':'R 미착수','Y':'Y 진행 중','G':'G 완료','NA':'N/A 해당없음'}).forEach(([v,t])=>{const o=document.createElement('option'); o.value=v; o.textContent=t; sel.append(o)});
      const dt=document.createElement('input'); dt.type='date'; dt.id='fd-'+k; f.append(lg,sel,dt); box.append(f)});
    const th=document.getElementById('frb-sth'); FRB_STEPS.forEach(([k,d,l])=>{const h=document.createElement('th'); h.className='stp'; h.innerHTML='<span></span><small></small>'; h.firstChild.textContent=d; h.lastChild.textContent=l; th.before(h)}); th.remove()})();
  const md=v=>v?String(Number(v.slice(5,7)))+'/'+String(Number(v.slice(8,10))):'';
  function frbOverall(x){const st=FRB_STEPS.map(([k])=>(x.steps&&x.steps[k]&&x.steps[k].s)||'').filter(v=>v!=='NA');
    if(st.length&&st.every(v=>v==='G')) return 'G'; if(st.some(v=>v==='G'||v==='Y')) return 'Y'; return 'R'}
  function renderClaims(){
    const tb=document.getElementById('frb-list'); if(!tb) return; tb.replaceChildren();
    const list=claims.map(c=>({id:c.id,x:c.data()})).sort((a,b)=>String(b.x.no||'').localeCompare(String(a.x.no||''),'ko',{numeric:true}));
    let open=0; list.forEach(({id,x})=>{const ov=frbOverall(x); if(ov!=='G') open++;
      const tr=document.createElement('tr'); if(id===frbCur) tr.className='cur';
      const td=(t,c)=>{const e=document.createElement('td'); if(c) e.className=c; if(t instanceof Node) e.append(t); else e.textContent=t??''; tr.append(e); return e};
      const ch=(s,date)=>{const w=document.createElement('div'); w.className='sx'; const i=document.createElement('i'); i.className='s-'+(s||''); i.textContent=FRB_ST[s||'']; w.append(i); if(date){const e=document.createElement('em'); e.textContent=md(date); w.append(e)} return w};
      td(ch(ov)); td(x.no,'nowrap'); td(md(x.opened),'nowrap'); td(x.model||'');
      const pn=document.createElement('div'); pn.textContent=x.part||''; if(x.partNo){const sm=document.createElement('div'); sm.style.cssText='font-size:12px;color:var(--muted)'; sm.textContent=x.partNo; pn.append(sm)} td(pn);
      td(x.where||''); td(x.issue||'','iss'); td(x.recur?'O':'X'); td([x.dept,x.owner].filter(Boolean).join(' · '),'nowrap'); td(md(x.next),'nowrap');
      FRB_STEPS.forEach(([k])=>{const st=(x.steps&&x.steps[k])||{}; td(ch(st.s,st.date))});
      td(x.action||'','act');
      tr.onclick=()=>frbEdit(id,x); tb.append(tr)});
    document.getElementById('frb-empty').hidden=!!list.length;
    const sum=document.getElementById('frb-sum'); sum.replaceChildren();
    [['전체',list.length],['진행 중',open],['완료',list.length-open]].forEach(([l,n])=>{const sp=document.createElement('span'); sp.textContent=l+' '; const b=document.createElement('b'); b.textContent=n+'건'; sp.append(b); sum.append(sp)});
  }
  const fv=id=>document.getElementById(id);
  function frbEdit(id,x){frbCur=id; x=x||{};
    fv('f-no').value=x.no||''; fv('f-opened').value=x.opened||''; fv('f-model').value=x.model||''; fv('f-where').value=x.where||''; fv('f-part').value=x.part||''; fv('f-partno').value=x.partNo||'';
    fv('f-dept').value=x.dept||'품질'; fv('f-owner').value=x.owner||''; fv('f-issue').value=x.issue||''; fv('f-next').value=x.next||''; fv('f-recur').value=x.recur?'1':''; fv('f-action').value=x.action||'';
    FRB_STEPS.forEach(([k])=>{const st=(x.steps&&x.steps[k])||{}; fv('fs-'+k).value=st.s||''; fv('fd-'+k).value=st.date||''});
    fv('frb-ftitle').textContent=id?`${x.no||''} 수정`:'새 클레임 등록'; fv('frb-del').hidden=!id; fv('frb-del').dataset.c=''; fv('frb-del').textContent='삭제'; fv('frb-status').textContent='';
    renderClaims(); if(id) fv('frbform').scrollIntoView({behavior:'smooth',block:'start'})}
  fv('frb-new').onclick=()=>frbEdit(null);
  fv('frbform').addEventListener('submit',async e=>{e.preventDefault(); const st=fv('frb-status');
    if(!db||!claimOK()){st.textContent='고객대응 수정 권한이 있는 사람만 저장할 수 있습니다.';return}
    const steps={}; FRB_STEPS.forEach(([k])=>{const s=fv('fs-'+k).value, d=fv('fd-'+k).value; if(s||d) steps[k]={s,date:d}});
    const rec={no:fv('f-no').value.trim().toUpperCase(),opened:fv('f-opened').value,model:fv('f-model').value.trim(),where:fv('f-where').value.trim(),part:fv('f-part').value.trim(),partNo:fv('f-partno').value.trim(),
      dept:fv('f-dept').value.trim(),owner:fv('f-owner').value.trim(),issue:fv('f-issue').value.trim(),next:fv('f-next').value,recur:fv('f-recur').value==='1',action:fv('f-action').value.trim(),steps,updatedBy:myId,updatedAt:Date.now()};
    if(frbCur){const old=claims.find(c=>c.id===frbCur), ox=old?old.data():{};
      const F=[['no','순번'],['opened','발견일'],['model','차종'],['where','발견 장소'],['part','품명'],['partNo','품번'],['dept','주관 부서'],['owner','담당'],['issue','문제 내용'],['next','보고 예정일'],['action','조치 사항']].map(([k,label])=>({k,label}));
      const ch=diffOf(F,ox,rec); if(!!ox.recur!==rec.recur) ch.push({label:'재발 여부',old:ox.recur?'O':'X',new:rec.recur?'O':'X'});
      FRB_STEPS.forEach(([k,d,l])=>{const a=(ox.steps&&ox.steps[k])||{}, b=steps[k]||{}; const fmtS=v=>[FRB_ST[v.s||'']==='—'?'':FRB_ST[v.s||''],v.date||''].filter(Boolean).join(' '); if(fmtS(a)!==fmtS(b)) ch.push({label:d+' '+l,old:fmtS(a),new:fmtS(b)})});
      if(!ch.length){st.textContent='바뀐 내용이 없습니다.';return}
      if(!await confirmDiff(`클레임 ${ox.no||''} 수정`,ch)){st.textContent='변경을 취소했습니다.';return}}
    try{if(frbCur){const old=claims.find(c=>c.id===frbCur); await db.collection('claims').doc(frbCur).set({...(old?old.data():{}),...rec})}
      else{rec.createdAt=Date.now(); rec.author=myId; const r=await db.collection('claims').add(rec); frbCur=r.id}
      st.textContent='저장했습니다.'}catch(err){st.textContent='저장하지 못했습니다. 권한을 확인해 주세요.'}});
  fv('frb-del').onclick=async()=>{const b=fv('frb-del'); if(!frbCur) return; if(b.dataset.c!=='1'){b.dataset.c='1'; b.textContent='삭제 확인'; return}
    try{await db.collection('claims').doc(frbCur).delete(); frbEdit(null); fv('frb-status').textContent='삭제했습니다.'}catch(e){fv('frb-status').textContent='지우지 못했습니다.'}};
