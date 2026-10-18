/* 금호정공 사내 업무 시스템 · 창고별 재고 (이카운트 창고별재고현황)
   부서마다 자기 창고 탭만 보임. 재고 수량은 '안전재고 · 재고 수량 보기' 또는 '현재 재고 고치기' 권한이 있는 사람만.
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
(function(){
  const $=id=>document.getElementById(id);
  const N=v=>v==null||v===''?'':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:1});
  // 품번 앞자리로 구분: 20 완제품 · 21 반제품 · 30 원재료 · 31 부재료 · 40 상품
  const KIND={'20':'완제품','21':'반제품','30':'원재료','31':'부재료','40':'상품'};
  const kindOf=c=>KIND[String(c||'').slice(0,2)]||'';
  // 부서 메뉴 → 창고 탭 (검사반은 품번으로 나눔: 반제품은 생산, 그 밖은 자재)
  const DEPT={
    wh_mat:{label:'자재 · 생산관리팀',tabs:[['제품창고'],['원재료창고'],['부자재창고'],['불량창고'],['검사반',c=>kindOf(c)!=='반제품','검사반 (완제품 · 상품 · 부재료)']]},
    wh_prod:{label:'생산',tabs:[['사출공정'],['검사반',c=>kindOf(c)==='반제품','검사반 (반제품)']]},
    wh_dev:{label:'계발',tabs:[['개발창고']]}};
  let data=null, loading=null, cur='wh_mat', tab='all';
  const canSeeStock=()=>!!me&&(can('safety')||can('stockEdit'));
  async function load(){if(data) return data; if(loading) return loading; const sb=window.kumhoSB&&kumhoSB();
    loading=(async()=>{const out=[]; for(let f=0;f<50000;f+=1000){const r=await sb.from('stock_wh').select('item_code,wh,qty,item_name,spec,as_of').order('wh').order('item_code').range(f,f+999); if(r.error) throw r.error; out.push(...r.data); if(r.data.length<1000) break}
      data=out; loading=null; return out})(); return loading}
  function tabsOf(id){return DEPT[id].tabs.map(([wh,filt,label])=>({wh,filt,label:label||wh}))}
  function rowsFor(t){return data.filter(x=>x.wh===t.wh&&(!t.filt||t.filt(x.item_code)))}
  function render(){const d=DEPT[cur], T=tabsOf(cur), tb=$('wh-body'), hd=$('wh-head'), q=$('wh-q').value.trim().toLowerCase(), showOff=!$('wh-off').checked;
    const off=c=>{try{return typeof isOff==='function'&&isOff(c)}catch(e){return false}};
    const tabsBox=$('wh-tabs'); tabsBox.replaceChildren();
    [{key:'all',label:'전체'},...T.map((t,i)=>({key:String(i),label:t.label}))].forEach(t=>{const b=document.createElement('button'); b.type='button'; b.setAttribute('role','tab'); b.textContent=t.label;
      if(t.key!=='all'){const n=rowsFor(T[+t.key]).filter(x=>x.qty!==0&&(showOff||!off(x.item_code))).length; const s=document.createElement('small'); s.textContent=' '+n; b.append(s)}
      b.setAttribute('aria-selected',tab===t.key); b.onclick=()=>{tab=t.key; render()}; tabsBox.append(b)});
    const hit=x=>(!q||[x.item_code,x.item_name,x.spec,kindOf(x.item_code)].some(v=>String(v||'').toLowerCase().includes(q)))&&(showOff||!off(x.item_code));
    hd.replaceChildren(); tb.replaceChildren(); const hr=document.createElement('tr'); hd.append(hr);
    const th=(t,c)=>{const e=document.createElement('th'); e.textContent=t; if(c) e.className=c; hr.append(e)};
    const td=(tr,t,c)=>{const e=document.createElement('td'); e.textContent=t==null?'':String(t); if(c) e.className=c; tr.append(e); return e};
    ['품목코드','품목명','규격','구분'].forEach(t=>th(t));
    let list;
    if(tab==='all'){T.forEach(t=>th(t.label,'num')); th('합계','num');
      const m=new Map(); T.forEach((t,i)=>rowsFor(t).forEach(x=>{if(!hit(x)) return; const e=m.get(x.item_code)||{x,q:new Array(T.length).fill(null)}; e.q[i]=(e.q[i]||0)+Number(x.qty); m.set(x.item_code,e)}));
      list=[...m.values()].sort((a,b)=>a.x.item_code.localeCompare(b.x.item_code));
      list.slice(0,800).forEach(({x,q})=>{const tr=document.createElement('tr'); if(off(x.item_code)) tr.className='off';
        td(tr,x.item_code,'nowrap'); td(tr,x.item_name||''); td(tr,x.spec||''); td(tr,kindOf(x.item_code)+(off(x.item_code)?' · 미사용':''));
        q.forEach(v=>{const c=td(tr,v==null?'':N(v),'num'); if(v<0) c.classList.add('neg')}); const s=q.reduce((a,v)=>a+(v||0),0); const c=td(tr,N(s),'num'); c.style.fontWeight='700'; if(s<0) c.classList.add('neg'); tb.append(tr)})}
    else{const t=T[+tab]; th('수량','num');
      list=rowsFor(t).filter(hit).sort((a,b)=>a.item_code.localeCompare(b.item_code));
      list.slice(0,800).forEach(x=>{const tr=document.createElement('tr'); if(off(x.item_code)) tr.className='off';
        td(tr,x.item_code,'nowrap'); td(tr,x.item_name||''); td(tr,x.spec||''); td(tr,kindOf(x.item_code)+(off(x.item_code)?' · 미사용':'')); const c=td(tr,N(x.qty),'num'); if(x.qty<0) c.classList.add('neg'); tb.append(tr)})}
    $('wh-empty').hidden=!!list.length;
    const asof=(data.find(x=>x.as_of)||{}).as_of, neg=tab==='all'?list.filter(e=>e.q.some(v=>v<0)).length:list.filter(x=>x.qty<0).length;
    $('wh-status').textContent=`${d.label} · ${list.length}개 품목${list.length>800?' (앞 800개만 표시 · 찾기로 좁혀 주세요)':''}${neg?` · 마이너스 재고 ${neg}개 (이카운트 재고 확인 필요)`:''} · 이카운트 기준 ${asof||'-'}`}
  window.whOpen=async function(id){if(!DEPT[id]) return; if(cur!==id){cur=id; tab='all'}
    $('wh-title').textContent=`창고별 재고 · ${DEPT[id].label}`;
    if(!canSeeStock()){$('wh-status').textContent='재고 수량은 계정 관리에서 허락받은 사람만 볼 수 있습니다.'; $('wh-body').replaceChildren(); $('wh-head').replaceChildren(); $('wh-tabs').replaceChildren(); return}
    $('wh-status').textContent='불러오는 중…';
    try{await load(); render()}catch(e){$('wh-status').textContent='불러오지 못했습니다: '+(e&&e.message||e)}};
  let tm; $('wh-q').addEventListener('input',()=>{clearTimeout(tm); tm=setTimeout(()=>{if(data) render()},200)});
  $('wh-off').addEventListener('change',()=>{if(data) render()});
})();
