/* 금호정공 사내 업무 시스템 · 수주·납기 관리 · 거래처 관리 · 대시보드 요약 · AI 도우미 연결 확인
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
(function(){
  const $=id=>document.getElementById(id);
  const SB=()=>window.kumhoSB&&window.kumhoSB();
  const N=v=>v==null||v===''?'':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2});
  const isoD=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today=()=>isoD(new Date()), plusDays=n=>isoD(new Date(Date.now()+n*864e5));
  const errMsg=e=>{const m=String(e&&e.message||e||''); return /permission|policy|row-level/i.test(m)?'권한이 없습니다. 자재 · 생산관리팀 보기+수정 권한이 필요합니다.':/fetch|network/i.test(m)?'인터넷 연결을 확인해 주세요.':m};
  const mkTd=(tr,t,cls)=>{const c=document.createElement('td'); if(t instanceof Node) c.append(t); else c.textContent=t==null?'':String(t); if(cls) c.className=cls; tr.append(c); return c};
  const btn=(t,cls,fn)=>{const b=document.createElement('button'); b.type='button'; b.className=cls||'ghost'; b.textContent=t; b.onclick=fn; return b};
  const canOrd=()=>typeof canEditTeam==='function'&&canEditTeam('생산관리팀');
  const clean=s=>String(s||'').replace(/[,()*%\\]/g,' ').trim();

  // ---------- 거래처 목록 (자동완성용, 한 번만 불러와 같이 씀) ----------
  let partners=null, ptLoading=null;
  async function loadPartners(force){if(partners&&!force) return partners; if(ptLoading&&!force) return ptLoading;
    const sb=SB(); if(!sb) return [];
    ptLoading=(async()=>{const out=[]; for(let from=0;from<20000;from+=1000){const r=await sb.from('partners').select('*').order('name').range(from,from+999); if(r.error) break; out.push(...r.data); if(r.data.length<1000) break}
      partners=out; ptLoading=null; const dl=$('pt-dl'); if(dl){dl.replaceChildren(); out.filter(p=>p.active!==false).forEach(p=>{const o=document.createElement('option'); o.value=p.name; o.label=p.code; dl.append(o)})} return out})();
    return ptLoading}
  const ptByName=n=>(partners||[]).find(p=>p.name===n)||(partners||[]).find(p=>p.code===n);

  // ================= 수주 · 납기 =================
  let ordF='open', ordInit=false, ordBusy=0, ordEdit=null;
  const ST=['접수','생산중','출하완료','취소'];
  function ordFill(o){ordEdit=o&&o.id||null; o=o||{};
    $('od-no').value=o.order_no||''; $('od-date').value=o.ordered||today(); $('od-partner').value=o.partner_name||''; $('od-item').value=o.item_code||'';
    $('od-name').value=o.item_name||''; $('od-spec').value=o.spec||''; $('od-qty').value=o.qty||''; $('od-due').value=o.due||''; $('od-memo').value=o.memo||'';
    $('od-save').textContent=ordEdit?'수주 고치기':'수주 등록'; $('od-cancel').hidden=!ordEdit; $('od-status').textContent=ordEdit?`${o.order_no||'#'+o.id} 고치는 중`:''}
  async function ordLoad(){const sb=SB(); if(!sb) return; const my=++ordBusy, st=$('od-lstatus'), tb=$('od-list'); st.textContent='불러오는 중…';
    let q=sb.from('orders').select('*'); const t=today();
    if(ordF==='open') q=q.in('status',['접수','생산중']);
    else if(ordF==='late') q=q.in('status',['접수','생산중']).lt('due',t);
    else if(ordF==='week') q=q.in('status',['접수','생산중']).gte('due',t).lte('due',plusDays(7));
    else if(ordF==='done') q=q.in('status',['출하완료','취소']);
    const s=clean($('od-q').value); if(s) q=q.or(`partner_name.ilike.*${s}*,item_code.ilike.*${s}*,item_name.ilike.*${s}*,order_no.ilike.*${s}*`);
    q=ordF==='done'?q.order('updated_at',{ascending:false}).limit(300):q.order('due',{ascending:true,nullsFirst:false}).order('id').limit(1000);
    const r=await q; if(my!==ordBusy) return;
    if(r.error){st.textContent='불러오지 못했습니다: '+errMsg(r.error); return}
    tb.replaceChildren(); const ok=canOrd();
    r.data.forEach(o=>{const tr=document.createElement('tr'), open=o.status==='접수'||o.status==='생산중';
      const late=open&&o.due&&o.due<t, soon=open&&o.due&&o.due>=t&&o.due<=plusDays(3); if(late) tr.className='late'; else if(soon) tr.className='soon';
      mkTd(tr,o.due||'—','num nowrap'); mkTd(tr,o.partner_name); mkTd(tr,o.item_code||''); mkTd(tr,[o.item_name,o.spec].filter(Boolean).join(' · '));
      mkTd(tr,N(o.qty),'num'); const sc=mkTd(tr,'','num');
      const rem=Math.max(0,(Number(o.qty)||0)-(Number(o.shipped)||0));
      if(ok&&open){const i=document.createElement('input'); i.type='number'; i.min='0'; i.value=o.shipped||0; i.style.width='90px'; i.setAttribute('aria-label','출하 수량');
        i.onchange=async()=>{const v=Math.max(0,Number(i.value)||0); const patch={shipped:v,updated_at:new Date().toISOString()}; if(v>=Number(o.qty)) patch.status='출하완료';
          const u=await SB().from('orders').update(patch).eq('id',o.id); st.textContent=u.error?'저장하지 못했습니다: '+errMsg(u.error):(patch.status?'다 출하해서 출하완료로 바꿨습니다.':'출하 수량을 저장했습니다.'); ordLoad(); renderSummary()};
        sc.append(i)} else sc.textContent=N(o.shipped);
      mkTd(tr,N(rem),'num');
      const stc=mkTd(tr,''); if(ok){const sel=document.createElement('select'); sel.style.width='auto'; ST.forEach(x=>{const op=document.createElement('option'); op.textContent=x; sel.append(op)}); sel.value=o.status;
        sel.onchange=async()=>{const u=await SB().from('orders').update({status:sel.value,updated_at:new Date().toISOString()}).eq('id',o.id); st.textContent=u.error?'저장하지 못했습니다: '+errMsg(u.error):'상태를 바꿨습니다.'; ordLoad(); renderSummary()}; stc.append(sel)}
        else stc.textContent=o.status;
      mkTd(tr,(late?'납기 지남 · ':soon?'곧 납기 · ':'')+(o.memo||''));
      const a=mkTd(tr,''); a.className='nowrap';
      if(ok){a.append(btn('고치기','ghost',()=>{ordFill(o); $('ordform').scrollIntoView({behavior:'smooth',block:'start'})}),' ');
        const d=btn('지우기','ghost',async()=>{if(d.dataset.c!=='1'){d.dataset.c='1'; d.textContent='지우기 확인'; return}
          const u=await SB().from('orders').delete().eq('id',o.id); st.textContent=u.error?'지우지 못했습니다: '+errMsg(u.error):'지웠습니다.'; ordLoad(); renderSummary()}); a.append(d)}
      tb.append(tr)});
    $('od-empty').hidden=!!r.data.length;
    const tq=r.data.reduce((s,o)=>s+(Number(o.qty)||0),0), rq=r.data.reduce((s,o)=>s+Math.max(0,(Number(o.qty)||0)-(Number(o.shipped)||0)),0);
    st.textContent=`${r.data.length}건 · 주문 ${N(tq)} · 남은 수량 ${N(rq)}`+(r.data.length>=1000?' · 1000건까지만 보여 줍니다 (찾기로 좁혀 주세요)':'')}
  function ordSetup(){if(ordInit) return; ordInit=true; ordFill(null);
    $('od-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{ordF=b.dataset.f; $('od-tabs').querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected',x===b)); ordLoad()});
    let tm; $('od-q').addEventListener('input',()=>{clearTimeout(tm); tm=setTimeout(ordLoad,300)});
    $('od-item').addEventListener('change',()=>{try{const r=resolveProd($('od-item').value); if(r.p){$('od-item').value=r.p.code; if(!$('od-name').value) $('od-name').value=r.p.name||''; if(!$('od-spec').value) $('od-spec').value=r.p.spec||''}}catch(e){}});
    $('od-cancel').onclick=()=>ordFill(null);
    $('ordform').addEventListener('submit',async e=>{e.preventDefault(); const st=$('od-status'); if(!canOrd()){st.textContent='자재 · 생산관리팀 보기+수정 권한이 있어야 등록할 수 있습니다.'; return}
      const pn=$('od-partner').value.trim(), qty=Number($('od-qty').value); if(!pn||!(qty>0)){st.textContent='거래처와 수량을 넣어 주세요.'; return}
      const p=ptByName(pn);
      try{const r0=resolveProd($('od-item').value); if(r0.p&&typeof isOff==='function'&&isOff(r0.p.code)){st.textContent='미사용 품목입니다. 품목 관리에서 사용으로 바꾸거나 다른 품목을 고르세요.'; return}}catch(x){}
      const rec={order_no:$('od-no').value.trim()||null,ordered:$('od-date').value||today(),partner_code:p?p.code:null,partner_name:p?p.name:pn,item_code:$('od-item').value.trim().toUpperCase()||null,
        item_name:$('od-name').value.trim()||null,spec:$('od-spec').value.trim()||null,qty,due:$('od-due').value||null,memo:$('od-memo').value.trim()||null,updated_at:new Date().toISOString()};
      $('od-save').disabled=true;
      const r=ordEdit?await SB().from('orders').update(rec).eq('id',ordEdit):await SB().from('orders').insert({...rec,author:me&&me.user});
      $('od-save').disabled=false;
      if(r.error){st.textContent='저장하지 못했습니다: '+errMsg(r.error); return}
      const msg=ordEdit?'고쳤습니다.':'수주를 등록했습니다.', wasEdit=ordEdit, keep=$('od-partner').value; ordFill(null); if(!wasEdit) $('od-partner').value=keep; st.textContent=msg; ordLoad(); renderSummary()})}

  // ================= 거래처 관리 =================
  let ptInit=false, ptEdit=null;
  const PF=[['pt-code','code'],['pt-name','name'],['pt-kind','kind'],['pt-biz','biz_no'],['pt-contact','contact'],['pt-phone','phone'],['pt-email','email'],['pt-addr','address'],['pt-memo','memo']];
  function ptFill(p){ptEdit=p?p.code:null; p=p||{kind:'매출'}; PF.forEach(([id,k])=>$(id).value=p[k]||''); $('pt-kind').value=p.kind||'매출'; $('pt-active').checked=p.active!==false;
    $('pt-code').readOnly=!!ptEdit; $('pt-save').textContent=ptEdit?'거래처 고치기':'거래처 추가'; $('pt-cancel').hidden=!ptEdit; $('pt-status').textContent=ptEdit?`${p.name} 고치는 중`:''; $('pt-stats').replaceChildren()}
  async function ptStats(p){const box=$('pt-stats'); box.replaceChildren(); const sb=SB(); if(!sb||!(can('history')||can('import'))) return;
    const h=document.createElement('p'); h.className='hint'; h.textContent='연도별 판매 (이카운트 거래 내역)'; box.append(h);
    const r=await sb.rpc('ec_group',{p_by:'year',p_kind:'판매',p_partner:p.code,p_limit:40}); if(r.error||!r.data.length){h.textContent='가져온 판매 기록이 없습니다.'; return}
    const t=document.createElement('table'); t.className='rules sliplist'; const hr=document.createElement('tr'); ['연도','줄 수','수량','금액'].forEach((x,i)=>{const th=document.createElement('th'); th.textContent=x; if(i) th.className='num'+(i===3?' pricecell':''); hr.append(th)}); t.append(hr);
    r.data.forEach(x=>{const tr=document.createElement('tr'); mkTd(tr,x.k); mkTd(tr,N(x.n),'num'); mkTd(tr,N(x.qty),'num'); mkTd(tr,N(x.amount),'num pricecell'); t.append(tr)});
    box.append(t, btn('이 거래처 거래 내역 보기','ghost',()=>{go('hist',true); setTimeout(()=>{$('hs-partner').value=p.code; $('hs-from').value=''; $('hs-form').requestSubmit()},50)}))}
  async function ptRender(){const tb=$('pt-list'), st=$('pt-lstatus'); st.textContent='불러오는 중…'; await loadPartners(true);
    const q=$('pt-q').value.trim().toLowerCase(), showOff=$('pt-off').checked, ok=canOrd();
    const list=(partners||[]).filter(p=>(showOff||p.active!==false)&&(!q||[p.code,p.name,p.contact,p.phone,p.biz_no].some(v=>String(v||'').toLowerCase().includes(q))));
    tb.replaceChildren(); list.slice(0,300).forEach(p=>{const tr=document.createElement('tr'); if(p.active===false) tr.className='off';
      mkTd(tr,p.code,'nowrap'); mkTd(tr,p.name); mkTd(tr,p.kind||''); mkTd(tr,p.biz_no||''); mkTd(tr,p.contact||''); mkTd(tr,p.phone||''); mkTd(tr,p.memo||'');
      const a=mkTd(tr,''); a.className='nowrap'; a.append(btn(ok?'보기 · 고치기':'보기','ghost',()=>{ptFill(p); ptStats(p); $('ptform').scrollIntoView({behavior:'smooth',block:'start'})})); tb.append(tr)});
    $('pt-empty').hidden=!!list.length; st.textContent=`${list.length}곳`+(list.length>300?' · 300곳까지만 보여 줍니다 (찾기로 좁혀 주세요)':'')}
  function ptSetup(){if(ptInit) return; ptInit=true; ptFill(null);
    let tm; $('pt-q').addEventListener('input',()=>{clearTimeout(tm); tm=setTimeout(ptRender,250)}); $('pt-off').onchange=ptRender;
    $('pt-cancel').onclick=()=>ptFill(null);
    $('ptform').addEventListener('submit',async e=>{e.preventDefault(); const st=$('pt-status'); if(!canOrd()){st.textContent='자재 · 생산관리팀 보기+수정 권한이 있어야 고칠 수 있습니다.'; return}
      const rec={}; PF.forEach(([id,k])=>rec[k]=$(id).value.trim()||null); rec.active=$('pt-active').checked; rec.updated_at=new Date().toISOString();
      if(!rec.code||!rec.name){st.textContent='거래처 코드와 이름을 넣어 주세요.'; return}
      if(!ptEdit&&(partners||[]).some(p=>p.code===rec.code)){st.textContent='같은 코드가 이미 있습니다. 목록에서 골라 고쳐 주세요.'; return}
      const r=ptEdit?await SB().from('partners').update(rec).eq('code',ptEdit):await SB().from('partners').insert(rec);
      if(r.error){st.textContent='저장하지 못했습니다: '+errMsg(r.error); return}
      ptFill(null); st.textContent='저장했습니다.'; ptRender()})}

  // ================= 대시보드 요약 =================
  let sumBusy=0;
  async function renderSummary(){const box=$('dsum'); if(!box||!me||me.role==='worker') {if(box) box.hidden=true; return} const sb=SB(); if(!sb) return; const my=++sumBusy;
    const showSales=!!(can('history')||can('import')), showOrd=canSee('생산관리팀'); if(!showSales&&!showOrd){box.hidden=true; return}
    const d=new Date(), m0=isoD(new Date(d.getFullYear(),d.getMonth(),1)), pm0=isoD(new Date(d.getFullYear(),d.getMonth()-1,1)), pm1=isoD(new Date(d.getFullYear(),d.getMonth(),0));
    const pmSame=isoD(new Date(d.getFullYear(),d.getMonth()-1,Math.min(d.getDate(),new Date(d.getFullYear(),d.getMonth(),0).getDate())));
    const jobs=[];
    if(showSales){jobs.push(sb.rpc('ec_group',{p_by:'all',p_kind:'판매',p_from:m0,p_to:today(),p_limit:1}), sb.rpc('ec_group',{p_by:'all',p_kind:'판매',p_from:pm0,p_to:pmSame,p_limit:1}), sb.rpc('ec_group',{p_by:'item',p_kind:'판매',p_from:m0,p_to:today(),p_limit:5}))}
    if(showOrd){const t=today(); jobs.push(sb.from('orders').select('id,due,qty,shipped').in('status',['접수','생산중']).limit(5000))}
    const res=await Promise.all(jobs); if(my!==sumBusy) return;
    let i=0; const cards=$('dsum-cards'), top=$('dsum-top'); cards.replaceChildren(); top.replaceChildren();
    const card=(label,val,sub,goId,cls)=>{const b=document.createElement('button'); b.type='button'; b.className='kpi'+(cls?' '+cls:''); const s=document.createElement('span'); s.textContent=label; const v=document.createElement('b'); v.textContent=val; const e=document.createElement('em'); e.textContent=sub; b.append(s,v,e); if(goId) b.onclick=()=>go(goId,true); cards.append(b)};
    if(showSales){const a=(res[i++].data||[])[0]||{}, b=(res[i++].data||[])[0]||{}, tp=res[i++].data||[];
      const q=Number(a.qty)||0, pq=Number(b.qty)||0, pct=pq?Math.round((q-pq)/pq*100):null;
      card('이번 달 판매 수량',N(q),`지난 달 같은 기간 ${N(pq)}${pct!=null?` (${pct>=0?'+':''}${pct}%)`:''}`,'hist');
      if(canSeePrice()&&a.amount!=null) card('이번 달 판매 금액',N(Math.round(a.amount))+'원',`지난 달 같은 기간 ${N(Math.round(b.amount||0))}원`,'hist');
      if(tp.length){const h=document.createElement('b'); h.textContent='이번 달 많이 판 품목'; top.append(h); const ol=document.createElement('ol');
        tp.forEach(x=>{const li=document.createElement('li'); li.textContent=`${x.label||x.k} — ${N(x.qty)}`; ol.append(li)}); top.append(ol)}}
    if(showOrd){const r=res[i++]; const os=(r&&r.data)||[], t=today(), wk=plusDays(7);
      const late=os.filter(o=>o.due&&o.due<t).length, week=os.filter(o=>o.due&&o.due>=t&&o.due<=wk).length;
      card('진행 중 수주',N(os.length)+'건',`남은 수량 ${N(os.reduce((s,o)=>s+Math.max(0,(Number(o.qty)||0)-(Number(o.shipped)||0)),0))}`,'order');
      card('7일 안 납기',N(week)+'건','오늘부터 일주일','order');
      card('납기 지남',N(late)+'건',late?'바로 확인해 주세요':'없음','order',late?'warn':'')}
    box.hidden=!cards.children.length}

  // ================= AI 도우미: LM Studio가 켜져 있을 때만 메뉴에 보임 =================
  window.kumhoAIOK=false;
  async function aiProbe(){let url=''; try{const c=JSON.parse(localStorage.getItem('kumhoAI')||'null'); url=c&&c.url}catch(e){}
    if(!url){apply(); return}  // 설정한 적 없는 컴퓨터는 확인하지 않음 (다른 직원 컴퓨터에 권한 창이 뜨지 않게)
    try{const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),2500); const r=await fetch(url.replace(/\/+$/,'')+'/models',{signal:ctl.signal}); clearTimeout(tm); window.kumhoAIOK=r.ok}catch(e){window.kumhoAIOK=false}
    apply();
    function apply(){document.querySelectorAll('.sitem[data-m="bot"],[data-go="bot"]').forEach(b=>b.hidden=!window.kumhoAIOK);
      if(typeof curItem!=='undefined'&&curItem==='bot'&&!window.kumhoAIOK) go('dash',false)}}
  setTimeout(aiProbe,0);

  window.ordersOpen=function(id){if(!me) return;
    if(id==='order'){ordSetup(); loadPartners(); ordLoad()}
    else if(id==='partner'){ptSetup(); ptRender()}
    else if(id==='dash') renderSummary()};
})();
