/* 금호정공 사내 업무 시스템 · 안전재고 (지난 1년 하루 최대 판매 · 최대는 2년 월평균으로 계산 · 계산은 Supabase safety_recalc_core) · 현재 재고 · 자재 현황판 알림
   계정 관리의 '안전재고 · 재고 수량 보기' 권한이 있는 사람만 보고, 그 사람 자재 현황판에 재고가 너무 적거나 많은 품목 알림이 뜸.
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
(function(){
  const $=id=>document.getElementById(id);
  const SB=()=>window.kumhoSB&&window.kumhoSB();
  const N=v=>v==null||v===''?'':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:1});
  const errMsg=e=>{const m=String(e&&e.message||e||''); return /권한|permission|policy/i.test(m)?'권한이 없습니다.':/fetch|network/i.test(m)?'인터넷 연결을 확인해 주세요.':m};
  const td=(tr,t,cls)=>{const c=document.createElement('td'); if(t instanceof Node) c.append(t); else c.textContent=t==null?'':String(t); if(cls) c.className=cls; tr.append(c); return c};
  const ok=()=>typeof can==='function'&&!!can('safety');
  let rows=[], ssF='out', ssInit=false;
  const CLS={'부족':'short','과다':'over','판매 없음':'dead','적정':'','재고 모름':'','재료':''};
  // 재료·부재료·포장품은 팔지 않으므로 '판매 없음'으로 알리지 않음 · 미사용 품목은 안전재고에서 아예 뺌
  const SELL=['제품','반제품','상품',''];
  // 최근 판매일: 제품만 (전체 품목 엑셀 · 이카운트 2년 판매여부의 최근 판매일)
  const lastSold=c=>{try{if(((prodOf(c)||{}).cat||'')!=='제품') return ''; const m=master.get(normItem(c)); return (m&&m.last)||''}catch(e){return ''}};
  const ago=d=>{if(!d) return ''; const n=Math.floor((Date.now()-Date.parse(d+'T00:00:00'))/864e5); return n<=0?'오늘':n<31?n+'일 전':n<365?Math.floor(n/30)+'개월 전':(n/365).toFixed(1).replace('.0','')+'년 전'};
  // 스크랩·분쇄재는 안전재고에서 뺌 (품목 그룹 '스크랩(분쇄재)' 또는 이름에 스크랩·분쇄재)
  const isScrap=x=>{let p={}; try{p=prodOf(x.item_code)||{}}catch(e){} return /스크랩|분쇄재|scrap/i.test([p.group,p.name,x.item_name].join(' '))};
  function adjust(list){list=list.filter(x=>!isScrap(x)); const off=c=>{try{return typeof isOff==='function'&&isOff(c)}catch(e){return false}};
    const cat=c=>{try{return (prodOf(c)||{}).cat||''}catch(e){return ''}};
    return list.filter(x=>!off(x.item_code)).map(x=>x.status==='판매 없음'&&!SELL.includes(cat(x.item_code))?{...x,status:'재료',gap:0}:x)}

  async function loadAll(){const sb=SB(), out=[]; for(let from=0;from<50000;from+=1000){const r=await sb.rpc('safety_status').range(from,from+999); if(r.error) throw r.error; out.push(...r.data); if(r.data.length<1000) break} return out}
  async function ssLoad(){const st=$('ss-status'); st.textContent='불러오는 중…';
    try{const sb=SB(); const [s,list]=await Promise.all([sb.from('safety_settings').select('*').eq('id',1).maybeSingle(),loadAll()]);
      if(s.data){$('ss-service').value=String(Number(s.data.service)); $('ss-lead').value=Number(s.data.lead_days); $('ss-max').value=Number(s.data.max_months); if($('ss-minm')) $('ss-minm').value=Number(s.data.min_months||6);
        $('ss-calcinfo').textContent=s.data.updated_by?`마지막 계산: ${new Date(s.data.updated_at).toLocaleString('ko-KR',{hour12:false})} · ${s.data.updated_by}`:'아직 계산하지 않았습니다.'}
      rows=list; const asof=list.find(x=>x.as_of); $('ss-asof').textContent=asof?`현재 재고 기준: ${asof.as_of}`:'현재 재고를 아직 올리지 않았습니다.';
      ssRender()}
    catch(e){st.textContent='불러오지 못했습니다: '+errMsg(e)}}
  // 종류로 보기 (품목 관리의 종류: 제품·반제품·상품·재료·부재료·포장품·금형)
  const catOf=c=>{try{return (prodOf(c)||{}).cat||''}catch(e){return ''}};
  const CATS={our:['제품','반제품'],mat:['재료','부재료'],none:['']};
  function catOK(x){const v=$('ss-cat')&&$('ss-cat').value; if(!v) return true; return (CATS[v]||[v]).includes(catOf(x.item_code))}
  function ssRender(){const tb=$('ss-body'), q=$('ss-q').value.trim().toLowerCase(); tb.replaceChildren();
    let list=adjust(rows).filter(catOK);
    if(ssF==='out') list=list.filter(x=>['부족','과다','판매 없음'].includes(x.status)); else if(ssF!=='all') list=list.filter(x=>x.status===ssF);
    if(q) list=list.filter(x=>[x.item_code,x.item_name,x.spec].some(v=>String(v||'').toLowerCase().includes(q)));
    const ord={'부족':0,'과다':1,'판매 없음':2,'적정':3,'재료':4,'재고 모름':5};
    list.sort((a,b)=>(ord[a.status]-ord[b.status])||(a.status==='부족'?(a.gap-b.gap):(b.gap||0)-(a.gap||0)));
    list.slice(0,500).forEach(x=>{const tr=document.createElement('tr'); tr.className=CLS[x.status]||'';
      td(tr,x.item_code,'nowrap'); td(tr,x.item_name||''); td(tr,x.spec||''); td(tr,N(x.qty),'num'); td(tr,N(x.safety),'num'); td(tr,N(x.max_qty),'num'); td(tr,N(x.avg_month),'num'); {const ls=lastSold(x.item_code); const c=td(tr,ls?`${ls} (${ago(ls)})`:'—','nowrap'); if(ls) c.title='최근 판매일'}
      const s=document.createElement('b'); s.className='ssst '+(CLS[x.status]||''); s.textContent=x.status; td(tr,s);
      td(tr,x.status==='부족'?N(-x.gap)+' 모자람':x.status==='과다'?N(x.gap)+' 많음':x.status==='판매 없음'?'2년 동안 안 팔림':'','nowrap');
      const a=td(tr,''); a.className='nowrap';
      if(x.safety!=null){const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent=x.manual?'직접 정함 · 고치기':'직접 정하기';
        b.onclick=()=>editRow(x,tr); a.append(b)}
      tb.append(tr)});
    $('ss-empty').hidden=!!list.length;
    const adj=adjust(rows).filter(catOK), c=k=>adj.filter(x=>x.status===k).length;
    $('ss-status').textContent=rows.length?(c('재고 모름')?`안전재고 ${c('재고 모름')}개 계산됨 · 현재 재고 엑셀을 올리면 부족·과다를 알려 줍니다`:`부족 ${c('부족')} · 과다 ${c('과다')} · 판매 없는 재고 ${c('판매 없음')} · 적정 ${c('적정')}`)+(list.length>500?' · 500개까지만 보여 줍니다':''):'아직 자료가 없습니다. 1) 자료 가져오기에서 이카운트 판매현황(일자별, 최근 1년 이상)을 ‘판매’로 넣고 2) ‘다시 계산’ 3) 현재 재고 엑셀을 올리세요.'}
  function editRow(x,tr){const f=document.createElement('tr'), c=document.createElement('td'); c.colSpan=11; f.append(c);
    const mk=(lbl,v)=>{const l=document.createElement('label'); l.className='nowrap'; l.textContent=lbl+' '; const i=document.createElement('input'); i.type='number'; i.min='0'; i.style.width='110px'; i.value=v??''; i.placeholder='계산값'; l.append(i); return [l,i]};
    const [l1,i1]=mk('안전재고',x.manual?x.safety:''), [l2,i2]=mk('최대',x.manual?x.max_qty:'');
    const sv=document.createElement('button'); sv.type='button'; sv.textContent='저장'; const cl=document.createElement('button'); cl.type='button'; cl.className='ghost'; cl.textContent='닫기';
    const msg=document.createElement('span'); msg.className='status'; const h=document.createElement('span'); h.className='hint'; h.textContent=' 비우면 계산값을 씁니다.';
    c.append(l1,' ',l2,' ',sv,' ',cl,h,' ',msg); tr.after(f); cl.onclick=()=>f.remove();
    sv.onclick=async()=>{const v=i=>i.value===''?null:Number(i.value);
      let r=await SB().from('safety_stock').update({manual_safety:v(i1),manual_max:v(i2),updated_by:me&&me.user}).eq('item_code',x.item_code);
      if(r.error){msg.textContent='저장하지 못했습니다: '+errMsg(r.error); return} f.remove(); ssLoad(); ssAlert()}}
  // 이카운트 재고현황 엑셀 → 현재 재고
  const norm=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
  const num=v=>{if(typeof v==='number') return v; const s=String(v||'').replace(/[,\s]/g,''); return /^-?\d+(\.\d+)?$/.test(s)?Number(s):null};
  async function readStock(file){const st=$('ss-upst'); st.textContent='엑셀 읽는 중…';
    try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}); let found=null;
      for(const n of wb.SheetNames){const R=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''});
        for(let r=0;r<Math.min(R.length,20);r++){const h=(R[r]||[]).map(norm); const ic=h.findIndex(x=>/^(생산)?\s*품목\s*코드$|^품번$/.test(x));
          if(ic<0) continue; const pick=re=>h.findIndex(x=>re.test(x));
          let q=pick(/^재고\s*수량$/); if(q<0) q=pick(/^합계$/); if(q<0) q=pick(/^(현)?재고$/); if(q<0) q=pick(/수량/);
          if(q<0) continue; found={R,r,ic,q,nm:pick(/^(생산)?\s*품목\s*명/),sp:pick(/^규격/),qh:h[q]}; break}
        if(found) break}
      if(!found){st.textContent='품목코드와 재고수량 칸을 찾지 못했습니다. 이카운트 재고현황에서 내려받은 엑셀인지 확인해 주세요.'; return}
      const m=new Map(); for(let i=found.r+1;i<found.R.length;i++){const r=found.R[i]||[]; const ic=norm(r[found.ic]).toUpperCase(); const q=num(r[found.q]); if(!ic||q==null||/합계|소계/.test(ic)) continue;
        const e=m.get(ic)||{ic,iname:found.nm>=0?norm(r[found.nm]):'',spec:found.sp>=0?norm(r[found.sp]):'',qty:0}; e.qty+=q; m.set(ic,e)}
      const list=[...m.values()]; if(!list.length){st.textContent='넣을 줄이 없습니다.'; return}
      const asof=$('ss-asofd').value||new Date().toISOString().slice(0,10);
      if(!confirm(`현재 재고를 ${list.length}개 품목 (‘${found.qh}’ 칸, ${asof} 기준)으로 바꿀까요? 예전 재고 자료는 지워집니다.`)){st.textContent='';return}
      const r=await SB().rpc('stock_now_replace',{p_rows:list,p_file:file.name,p_as_of:asof}); if(r.error) throw r.error;
      st.textContent=`현재 재고 ${r.data}개 품목을 넣었습니다.`; $('ss-file').value=''; ssLoad(); ssAlert()}
    catch(e){st.textContent='올리지 못했습니다: '+errMsg(e)}}
  function ssSetup(){if(ssInit) return; ssInit=true; $('ss-asofd').value=new Date().toISOString().slice(0,10);
    $('ss-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{ssF=b.dataset.f; $('ss-tabs').querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected',x===b)); ssRender()});
    let tm; $('ss-q').addEventListener('input',()=>{clearTimeout(tm); tm=setTimeout(ssRender,200)});
    try{const v=localStorage.getItem('ssCat'); if(v!=null&&[...$('ss-cat').options].some(o=>o.value===v)) $('ss-cat').value=v}catch(e){}
    $('ss-cat').addEventListener('change',()=>{try{localStorage.setItem('ssCat',$('ss-cat').value)}catch(e){} ssRender()});
    $('ss-file').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0]; if(f) readStock(f)});
    $('ss-calc').onclick=async()=>{const b=$('ss-calc'), st=$('ss-status'); b.disabled=true; st.textContent='계산하는 중…';
      const u=await SB().from('safety_settings').update({service:Number($('ss-service').value),lead_days:Number($('ss-lead').value)||7,max_months:Number($('ss-max').value)||1,min_months:Number($('ss-minm').value)||6,updated_at:new Date().toISOString()}).eq('id',1);
      const r=u.error?u:await SB().rpc('safety_recalc'); b.disabled=false;
      if(r.error){st.textContent='계산하지 못했습니다: '+errMsg(r.error); return} await ssLoad(); st.textContent=`${r.data}개 품목의 안전재고를 계산했습니다. `+st.textContent; ssAlert()}}

  // 자재 현황판 알림 (권한 있는 사람만)
  async function ssAlert(){const box=$('ss-alert'); if(!box) return; if(!me||!ok()){box.hidden=true; return}
    let list; try{list=adjust(await loadAll())}catch(e){box.hidden=true; return}
    const t=$('ss-atext'), ul=$('ss-alist'); ul.replaceChildren(); if(!list.length){box.hidden=true; return}
    const asof=(list.find(x=>x.as_of)||{}).as_of, n=k=>list.filter(x=>x.status===k).length;
    if(!asof){t.textContent='안전재고는 계산했지만 현재 재고가 없습니다. 안전재고 화면에서 현재 재고를 올려 주세요.'; box.className='rcalert ssalert'; box.hidden=false; return}
    if(!n('부족')&&!n('과다')&&!n('판매 없음')){t.textContent=`재고가 모두 적정 범위 안입니다 (${asof} 기준).`; box.className='rcalert ssalert good'; box.hidden=false; return}
    t.textContent=`재고 확인 필요 (${asof} 기준): 너무 적음 ${n('부족')}개 · 너무 많음 ${n('과다')}개 · 2년 동안 안 팔린 제품 재고 ${n('판매 없음')}개`;
    const top=[...list.filter(x=>x.status==='부족').sort((a,b)=>(a.gap/(a.safety||1))-(b.gap/(b.safety||1))).slice(0,3).map(x=>`너무 적음: ${x.item_name||x.item_code} — 재고 ${N(x.qty)} / 안전재고 ${N(x.safety)}${lastSold(x.item_code)?' · 최근 판매 '+lastSold(x.item_code):''}`),
      ...list.filter(x=>x.status==='과다').sort((a,b)=>(b.gap/(b.max_qty||1))-(a.gap/(a.max_qty||1))).slice(0,2).map(x=>`너무 많음: ${x.item_name||x.item_code} — 재고 ${N(x.qty)} / 최대 ${N(x.max_qty)}${lastSold(x.item_code)?' · 최근 판매 '+lastSold(x.item_code):''}`)];
    top.forEach(s=>{const li=document.createElement('li'); li.textContent=s; ul.append(li)});
    box.className='rcalert ssalert'; box.hidden=false}

  // 품목 사용·미사용이 바뀌거나 품목 목록을 늦게 불러오면 다시 그림
  let rfT=null; window.safetyRefresh=function(){clearTimeout(rfT); rfT=setTimeout(()=>{if(!me||!ok()) return; if(typeof curItem!=='undefined'&&curItem==='safety'&&rows.length) ssRender(); if(typeof curItem!=='undefined'&&curItem==='board') ssAlert()},400)};
  window.safetyOpen=function(id){if(!me) return; if(id==='safety'){ssSetup(); ssLoad()} else if(id==='board') ssAlert()};
})();
