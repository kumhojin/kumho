/* 금호정공 사내 업무 시스템 · 거래 내역(이카운트 기록 찾기·집계) · 자료 가져오기(이카운트 엑셀) · 변경 기록
   큰 자료는 서버(Supabase)에서 찾고 합계를 내며, 화면에는 한 쪽(100줄)씩만 불러옴.
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
(function(){
  const $=id=>document.getElementById(id);
  const SB=()=>window.kumhoSB&&window.kumhoSB();
  const N=v=>v==null||v===''?'':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2});
  const td=(tr,t,cls)=>{const c=document.createElement('td'); c.textContent=t==null?'':String(t); if(cls) c.className=cls; tr.append(c); return c};
  const th=(tr,t,cls)=>{const c=document.createElement('th'); c.textContent=t; if(cls) c.className=cls; tr.append(c); return c};
  const errMsg=e=>{const m=String(e&&e.message||e||''); return /permission|권한|policy/i.test(m)?'권한이 없습니다.':/fetch|network/i.test(m)?'인터넷 연결을 확인해 주세요.':m};
  const PAGE=100;
  const priceOK=()=>typeof canSeePrice==='function'&&canSeePrice();
  const isoD=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // ================= 거래 내역 =================
  let hsView='list', hsPage=0, hsBusy=0, hsInit=false;
  function hsFilters(){const v=id=>$(id).value.trim()||null;
    return {kind:v('hs-kind'),from:v('hs-from'),to:v('hs-to'),partner:v('hs-partner'),item:v('hs-item')}}
  const clean=s=>s.replace(/[,()*%\\]/g,' ').trim();
  async function hsLoad(){const sb=SB(); if(!sb) return; const my=++hsBusy, f=hsFilters(), st=$('hs-status');
    st.textContent='찾는 중…'; const head=$('hs-head'), body=$('hs-body');
    try{
      const sum=await sb.rpc('ec_group',{p_by:'all',p_kind:f.kind,p_from:f.from,p_to:f.to,p_partner:f.partner,p_item:f.item,p_limit:1});
      if(sum.error) throw sum.error; if(my!==hsBusy) return;
      const s=(sum.data&&sum.data[0])||{n:0,qty:0,amount:null}, total=Number(s.n)||0;
      const amt=priceOK()&&s.amount!=null?` · 금액 ${N(s.amount)}원`:'';
      head.replaceChildren(); body.replaceChildren(); const hr=document.createElement('tr'); head.append(hr);
      if(hsView==='list'){
        ['일자','전표','종류','거래처','품목코드','품목명','규격'].forEach(t=>th(hr,t)); th(hr,'수량','num'); th(hr,'단가','num pricecell'); th(hr,'공급가액','num pricecell'); th(hr,'합계','num pricecell'); th(hr,'창고');
        let q=sb.from('ec_lines').select('id,kind,doc_date,doc_no,line_no,partner_code,partner_name,item_code,item_name,spec,qty,wh,ec_line_prices(price,supply,total)');
        if(f.kind) q=q.eq('kind',f.kind); if(f.from) q=q.gte('doc_date',f.from); if(f.to) q=q.lte('doc_date',f.to);
        if(f.partner){const p=clean(f.partner); if(p) q=q.or(`partner_code.eq.${p},partner_name.ilike.*${p}*`)}
        if(f.item){const p=clean(f.item); if(p) q=q.or(`item_code.ilike.${p}*,item_name.ilike.*${p}*`)}
        q=q.order('doc_date',{ascending:false}).order('doc_no').order('line_no').range(hsPage*PAGE,hsPage*PAGE+PAGE-1);
        const r=await q; if(r.error) throw r.error; if(my!==hsBusy) return;
        r.data.forEach(x=>{const tr=document.createElement('tr'), p=Array.isArray(x.ec_line_prices)?x.ec_line_prices[0]:x.ec_line_prices;
          td(tr,x.doc_date); td(tr,`${x.doc_no}-${x.line_no}`); td(tr,x.kind); td(tr,x.partner_name||x.partner_code||''); td(tr,x.item_code||''); td(tr,x.item_name||''); td(tr,x.spec||'');
          td(tr,N(x.qty),'num'); td(tr,p?N(p.price):'','num pricecell'); td(tr,p?N(p.supply):'','num pricecell'); td(tr,p?N(p.total):'','num pricecell'); td(tr,x.wh||''); body.append(tr)});
        const pages=Math.max(1,Math.ceil(total/PAGE)); $('hs-pager').hidden=total<=PAGE;
        $('hs-page').textContent=`${hsPage+1} / ${pages.toLocaleString('ko-KR')} 쪽`; $('hs-prev').disabled=hsPage<=0; $('hs-next').disabled=hsPage>=pages-1;
      } else {
        const lbl={month:'월',year:'연도',item:'품목',partner:'거래처'}[hsView];
        th(hr,lbl); if(hsView==='item'||hsView==='partner') th(hr,'이름'); th(hr,'줄 수','num'); th(hr,'수량 합계','num'); th(hr,'금액 합계','num pricecell');
        const r=await sb.rpc('ec_group',{p_by:hsView,p_kind:f.kind,p_from:f.from,p_to:f.to,p_partner:f.partner,p_item:f.item,p_limit:500});
        if(r.error) throw r.error; if(my!==hsBusy) return;
        r.data.forEach(x=>{const tr=document.createElement('tr'); td(tr,x.k||'(없음)'); if(hsView==='item'||hsView==='partner') td(tr,x.label||'');
          td(tr,N(x.n),'num'); td(tr,N(x.qty),'num'); td(tr,N(x.amount),'num pricecell');
          {tr.style.cursor='pointer'; tr.title='이 조건으로 내역 보기';
            tr.onclick=()=>{if(hsView==='item') $('hs-item').value=x.k; else if(hsView==='partner') $('hs-partner').value=x.k;
              else if(hsView==='month'){$('hs-from').value=x.k+'-01'; const d=new Date(+x.k.slice(0,4),+x.k.slice(5,7),0); $('hs-to').value=isoD(d)}
              else if(hsView==='year'){$('hs-from').value=x.k+'-01-01'; $('hs-to').value=x.k+'-12-31'}
              setView('list')}}
          body.append(tr)});
        $('hs-pager').hidden=true;
        if(r.data.length>=500) s.more=true;
      }
      st.textContent=total?`${N(total)}줄 · 수량 ${N(s.qty)}${amt}${s.more?' · 많이 나온 순 500개까지만 보여 줍니다':''}`:'맞는 기록이 없습니다. 이카운트 자료를 아직 안 가져왔다면 ‘자료 가져오기’에서 먼저 넣어 주세요.';
    }catch(e){if(my===hsBusy) st.textContent='불러오지 못했습니다: '+errMsg(e)}}
  function setView(v){hsView=v; hsPage=0; $('hs-tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',b.dataset.v===v)); hsLoad()}
  function hsSetup(){if(hsInit) return; hsInit=true;
    const t=new Date(); $('hs-to').value=isoD(t); const f=new Date(t); f.setMonth(f.getMonth()-1); $('hs-from').value=isoD(f);
    $('hs-form').addEventListener('submit',e=>{e.preventDefault(); hsPage=0; hsLoad()});
    $('hs-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>setView(b.dataset.v));
    $('hs-prev').onclick=()=>{if(hsPage>0){hsPage--; hsLoad()}}; $('hs-next').onclick=()=>{hsPage++; hsLoad()}}

  // ================= 자료 가져오기 =================
  const FIELDS=[
    ['dateno','일자-No.',[/^일자\s*-?\s*no\.?$/i,/^일자\s*-\s*번호$/]],
    ['date','일자',[/^(전표|판매|구매|입고|출고|생산)?\s*일자$/,/^날짜$/]],
    ['no','전표 번호',[/^(전표)?\s*번호$/,/^no\.?$/i,/^전표\s*no\.?$/i]],
    ['pc','거래처코드',[/^거래처\s*코드$/]],
    ['pn','거래처명',[/^거래처\s*명?$/,/^거래처명$/]],
    ['ic','품목코드',[/^(생산)?\s*품목\s*코드$/,/^품번$/]],
    ['iname','품목명',[/^(생산)?\s*품목\s*명/,/^품명$/]],
    ['spec','규격',[/^규격(명)?$/]],
    ['qty','수량',[/^수량$/,/^(판매|구매|입고|출고|생산)\s*수량$/]],
    ['unit','단위',[/^단위$/]],
    ['wh','창고',[/창고\s*명?$/]],
    ['memo','적요',[/^적요$/,/^비고$/]],
    ['price','단가',[/^단가$/]],
    ['supply','공급가액',[/^공급가액$/,/^금액$/]],
    ['vat','부가세',[/^부가세$/,/^부가가치세$/]],
    ['total','합계',[/^합계(금액)?$/,/^총?\s*금액\s*합계$/]]];
  const MONEY_RE=/단가|금액|공급가|부가세|합계|원가|가액|이익/;
  let imp=null; // {name, header[], rows[][], map{}, hdrRow}
  const norm=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
  function excelDate(v){if(v instanceof Date&&!isNaN(v)) return isoD(v);
    if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5)); return d.toISOString().slice(0,10)}
    const s=norm(v), m=/^(\d{4})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})/.exec(s)||/^(\d{4})(\d{2})(\d{2})$/.exec(s);
    if(!m) return null; const y=+m[1],mo=+m[2],d=+m[3]; if(y<1970||y>2100||mo<1||mo>12||d<1||d>31) return null;
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
  function num(v){if(v==null||v==='') return null; if(typeof v==='number') return isFinite(v)?v:null;
    const s=String(v).replace(/[,\s원]/g,''); if(!/^-?\d+(\.\d+)?$/.test(s)) return null; return Number(s)}
  function guessMap(header){const map={}, used=new Set();
    FIELDS.forEach(([f,,res])=>{const i=header.findIndex((h,ix)=>!used.has(ix)&&res.some(re=>re.test(norm(h)))); if(i>=0){map[f]=i; used.add(i)}});
    // 품목명(규격) 처럼 한 칸에 같이 있는 경우: 규격 칸이 없으면 품목명에서 괄호를 나눔
    return map}
  function findHeader(rows){let best=-1,score=0;
    for(let r=0;r<Math.min(rows.length,20);r++){const m=guessMap(rows[r]||[]); const s=Object.keys(m).length; if(s>score){score=s;best=r}}
    return score>=3?best:-1}
  function buildRows(){const {rows,hdrRow,map,header}=imp, out=[], skipped=[]; const seq=new Map();
    const g=(r,f)=>map[f]!=null?r[map[f]]:undefined;
    const extraCols=header.map((h,i)=>i).filter(i=>!Object.values(map).includes(i)&&norm(header[i])&&!MONEY_RE.test(norm(header[i])));
    for(let i=hdrRow+1;i<rows.length;i++){const r=rows[i]||[]; if(!r.some(v=>norm(v))) continue;
      let date=null, no=null;
      if(map.dateno!=null){const s=g(r,'dateno'); if(s instanceof Date||typeof s==='number') date=excelDate(s); else {const t=norm(s), m=/^(.+?)\s*-\s*(\d+)\s*$/.exec(t); date=excelDate(m?m[1]:t); no=m?m[2]:null}}
      if(!date&&map.date!=null) date=excelDate(g(r,'date'));
      if(map.no!=null&&norm(g(r,'no'))) no=norm(g(r,'no'));
      if(!date){skipped.push(i+1); continue}
      if(!no) no='-';
      const key=date+'|'+no, ln=(seq.get(key)||0)+1; seq.set(key,ln);
      let iname=norm(g(r,'iname')), spec=norm(g(r,'spec'));
      if(map.spec==null){const m=/^(.*)\[(.+)\]$/.exec(iname)||/^(.*)\((.+)\)$/.exec(iname); if(m&&map.iname!=null&&/규격/.test(norm(header[map.iname]))){iname=m[1].trim(); spec=m[2].trim()}}
      const o={date,no,line:ln,pc:norm(g(r,'pc')),pn:norm(g(r,'pn')),ic:norm(g(r,'ic')),iname,spec,qty:num(g(r,'qty')),unit:norm(g(r,'unit')),wh:norm(g(r,'wh')),memo:norm(g(r,'memo')),
        price:num(g(r,'price')),supply:num(g(r,'supply')),vat:num(g(r,'vat')),total:num(g(r,'total'))};
      const ex={}; extraCols.forEach(c=>{const v=norm(r[c]); if(v) ex[norm(header[c])]=v}); if(Object.keys(ex).length) o.extra=ex;
      ['price','supply','vat','total'].forEach(k=>{if(o[k]==null) delete o[k]});
      out.push(o)}
    return {out,skipped}}
  function sums(list){let qty=0,amt=0,from=null,to=null; list.forEach(o=>{qty+=o.qty||0; amt+=(o.supply!=null?o.supply:o.total)||0; if(!from||o.date<from) from=o.date; if(!to||o.date>to) to=o.date}); return {qty,amt,from,to}}
  function drawMap(){const grid=$('im-mapgrid'); grid.replaceChildren();
    FIELDS.forEach(([f,label])=>{if(!priceOK()&&['price','supply','vat','total'].includes(f)&&imp.map[f]==null) return;
      const sp=document.createElement('span'); sp.textContent=label; const sel=document.createElement('select'); sel.dataset.f=f;
      const o0=document.createElement('option'); o0.value=''; o0.textContent='(없음)'; sel.append(o0);
      imp.header.forEach((h,i)=>{if(!norm(h)) return; const o=document.createElement('option'); o.value=i; o.textContent=norm(h); sel.append(o)});
      sel.value=imp.map[f]!=null?String(imp.map[f]):''; sel.onchange=()=>{if(sel.value==='') delete imp.map[f]; else imp.map[f]=+sel.value; drawPreview()};
      grid.append(sp,sel)});
    drawPreview()}
  function drawPreview(){const {out,skipped}=buildRows(); imp.list=out; const s=sums(out), ck=$('im-check');
    const miss=[]; if(imp.map.dateno==null&&imp.map.date==null) miss.push('일자'); if(imp.map.ic==null&&imp.map.iname==null) miss.push('품목'); if(imp.map.qty==null) miss.push('수량');
    const noNo=imp.map.dateno==null&&imp.map.no==null;
    ck.textContent=(miss.length?`꼭 필요한 칸이 없습니다: ${miss.join(', ')} · `:'')+`넣을 줄 ${N(out.length)}개 · 기간 ${s.from||'-'} ~ ${s.to||'-'} · 수량 합계 ${N(s.qty)}`+(priceOK()?` · 금액 합계 ${N(s.amt)}원`:'')
      +(skipped.length?` · 일자가 없어 건너뛰는 줄 ${skipped.length}개 (합계·소계 줄 등)`:'')+(noNo?' · 전표 번호 칸이 없어 같은 날짜 안의 순서로 구분합니다':'');
    ck.className='status'+(miss.length?' bad':'');
    $('im-go').disabled=!!miss.length||!out.length;
    const hh=$('im-phead'), pb=$('im-pbody'); hh.replaceChildren(); pb.replaceChildren(); const hr=document.createElement('tr'); hh.append(hr);
    ['일자','전표','거래처','품목코드','품목명','규격'].forEach(t=>th(hr,t)); th(hr,'수량','num'); th(hr,'단가','num pricecell'); th(hr,'공급가액','num pricecell'); th(hr,'창고');
    out.slice(0,20).forEach(o=>{const tr=document.createElement('tr'); td(tr,o.date); td(tr,`${o.no}-${o.line}`); td(tr,o.pn||o.pc); td(tr,o.ic); td(tr,o.iname); td(tr,o.spec); td(tr,N(o.qty),'num'); td(tr,N(o.price),'num pricecell'); td(tr,N(o.supply),'num pricecell'); td(tr,o.wh); pb.append(tr)});
    $('im-mapinfo').textContent=`${imp.name} · 머리글 ${imp.hdrRow+1}번째 줄 · 미리 보기 20줄`}
  async function readFile(file){const st=$('im-status'); st.textContent='엑셀 읽는 중…'; st.className='status';
    try{const buf=await file.arrayBuffer(); const wb=XLSX.read(buf,{type:'array',cellDates:true});
      let pick=null; for(const n of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}); const h=findHeader(rows); if(h>=0){pick={rows,h};break}}
      if(!pick){st.textContent='머리글(일자 · 품목코드 · 수량 …)을 찾지 못했습니다. 이카운트에서 내려받은 원래 엑셀인지 확인해 주세요.'; st.className='status bad'; return}
      const header=(pick.rows[pick.h]||[]).map(norm);
      imp={name:file.name,rows:pick.rows,hdrRow:pick.h,header,map:guessMap(header)};
      $('im-map').hidden=false; st.textContent=''; drawMap()}
    catch(e){st.textContent='엑셀을 읽지 못했습니다: '+errMsg(e); st.className='status bad'}}
  let importing=false;
  async function runImport(){if(!imp||!imp.list||importing) return; const sb=SB(), st=$('im-status'), kind=$('im-kind').value, list=imp.list, s=sums(list);
    if(!confirm(`${kind} 기록 ${list.length.toLocaleString('ko-KR')}줄 (${s.from} ~ ${s.to})을 가져올까요?\n같은 전표·줄이 이미 있으면 건너뜁니다.`)) return;
    importing=true; $('im-go').disabled=true; st.className='status';
    try{const r0=await sb.rpc('ec_import_start',{p_kind:kind,p_file:imp.name,p_rows:list.length,p_qty:s.qty,p_amount:null,p_from:s.from,p_to:s.to}); if(r0.error) throw r0.error;
      const id=r0.data; let done=0, added=0; const B=500;
      for(let i=0;i<list.length;i+=B){const part=list.slice(i,i+B); let r, tries=0;
        do{r=await sb.rpc('ec_import_rows',{imp:id,p_rows:part}); tries++} while(r.error&&tries<3&&/fetch|network|timeout/i.test(String(r.error.message)));
        if(r.error) throw r.error; added+=r.data||0; done+=part.length;
        st.textContent=`가져오는 중… ${N(done)} / ${N(list.length)}줄 (새로 넣음 ${N(added)})`}
      await sb.rpc('ec_import_finish',{imp:id});
      // 맞춰 보기: 같은 종류·기간의 서버 합계
      const chk=await sb.rpc('ec_group',{p_by:'all',p_kind:kind,p_from:s.from,p_to:s.to,p_limit:1}); const g=(chk.data&&chk.data[0])||{};
      const same=Number(g.n)===list.length&&Math.abs((Number(g.qty)||0)-s.qty)<0.001;
      st.textContent=`다 가져왔습니다. 새로 넣음 ${N(added)}줄 · 이미 있어 건너뜀 ${N(list.length-added)}줄. 서버의 같은 기간 ${kind} 합계: ${N(g.n)}줄 · 수량 ${N(g.qty)}`+(priceOK()&&g.amount!=null?` · 금액 ${N(g.amount)}원`:'')
        +(same?' — 엑셀과 맞습니다.':' — 엑셀과 다릅니다. 같은 기간에 다른 파일로 넣은 기록이 있거나, 엑셀이 기간 전체가 아닐 수 있습니다.');
      st.className='status '+(same?'ok':'bad'); imp=null; $('im-map').hidden=true; $('im-file').value=''}
    catch(e){st.textContent='가져오다 멈췄습니다: '+errMsg(e)+' · 넣은 줄까지는 저장됐고, 같은 파일을 다시 넣으면 남은 줄만 들어갑니다.'; st.className='status bad'; $('im-go').disabled=false}
    importing=false; impList()}
  async function impList(){const sb=SB(), body=$('im-list'); if(!sb) return;
    const r=await sb.from('ec_imports').select('*').order('id',{ascending:false}).limit(50); body.replaceChildren();
    if(r.error){const tr=document.createElement('tr'); td(tr,'불러오지 못했습니다: '+errMsg(r.error)).colSpan=11; body.append(tr); return}
    if(!r.data.length){const tr=document.createElement('tr'); td(tr,'아직 가져온 기록이 없습니다.').colSpan=11; body.append(tr); return}
    r.data.forEach(x=>{const tr=document.createElement('tr'); td(tr,x.id); td(tr,String(x.at||'').slice(0,16).replace('T',' ')); td(tr,x.kind); td(tr,x.file_name||'');
      td(tr,`${x.date_from||''} ~ ${x.date_to||''}`); td(tr,N(x.rows),'num'); td(tr,N(x.inserted),'num'); td(tr,N(x.qty_total),'num'); td(tr,x.by_name||'');
      td(tr,x.status==='undone'?`되돌림 (${x.undone_by||''})`:x.status==='open'?'중간에 멈춤':'완료');
      const a=td(tr,''); if(x.status!=='undone'&&x.inserted>0&&can('import')){const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent='되돌리기';
        b.onclick=async()=>{if(!confirm(`${x.id}번 가져오기로 들어간 ${N(x.inserted)}줄을 지웁니다. 다른 가져오기로 들어간 줄은 그대로입니다. 계속할까요?`)) return;
          b.disabled=true; const u=await sb.rpc('ec_import_undo',{imp:x.id}); $('im-status').textContent=u.error?'되돌리지 못했습니다: '+errMsg(u.error):`${N(u.data)}줄을 지웠습니다.`; impList()};
        a.append(b)}
      body.append(tr)})}
  let impInit=false;
  function impSetup(){if(impInit) return; impInit=true;
    $('im-file').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0]; if(f) readFile(f)});
    const drop=document.querySelector('label[for="im-file"]');
    drop.addEventListener('dragover',e=>{e.preventDefault(); drop.classList.add('over')}); drop.addEventListener('dragleave',()=>drop.classList.remove('over'));
    drop.addEventListener('drop',e=>{e.preventDefault(); drop.classList.remove('over'); const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(f) readFile(f)});
    $('im-cancel').onclick=()=>{imp=null; $('im-map').hidden=true; $('im-file').value=''; $('im-status').textContent=''};
    $('im-go').onclick=runImport}

  // ================= 변경 기록 =================
  let auPage=0, auInit=false, auBusy=0;
  const OPL={INSERT:'넣기',UPDATE:'고치기',DELETE:'지우기'}, TBL={docs:'포털 자료',profiles:'계정',staff:'직원',staff_private:'직원 개인정보'};
  const short=v=>{let s=typeof v==='string'?v:JSON.stringify(v); if(s==null) s=''; return s.length>80?s.slice(0,80)+'…':s};
  function diffText(x){const o=x.old_data, n=x.new_data;
    if(x.tbl==='staff_private') return '바뀐 칸: '+((n&&n.changed)||[]).join(', ');
    const a=x.tbl==='docs'?(o&&o.data)||{}:(o||{}), b=x.tbl==='docs'?(n&&n.data)||{}:(n||{});
    if(x.op==='INSERT') return Object.keys(b).slice(0,6).map(k=>`${k}: ${short(b[k])}`).join(' · ');
    if(x.op==='DELETE') return Object.keys(a).slice(0,6).map(k=>`${k}: ${short(a[k])}`).join(' · ');
    const ks=[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>k!=='updated_at'&&JSON.stringify(a[k])!==JSON.stringify(b[k]));
    return ks.slice(0,6).map(k=>`${k}: ${short(a[k])} → ${short(b[k])}`).join(' · ')+(ks.length>6?` 외 ${ks.length-6}칸`:'')}
  async function auLoad(){const sb=SB(); if(!sb) return; const my=++auBusy, st=$('au-status'), body=$('au-body'); st.textContent='불러오는 중…';
    try{let q=sb.from('audit_log').select('id,at,actor_name,tbl,op,key,old_data,new_data');
      const t=$('au-tbl').value, op=$('au-op').value, k=clean($('au-key').value), u=clean($('au-user').value);
      if(t) q=q.eq('tbl',t); if(op) q=q.eq('op',op); if(k) q=q.ilike('key',k+'%'); if(u) q=q.eq('actor_name',u.toLowerCase());
      const r=await q.order('id',{ascending:false}).range(auPage*50,auPage*50+50); if(r.error) throw r.error; if(my!==auBusy) return;
      const more=r.data.length>50, rows=r.data.slice(0,50); body.replaceChildren();
      rows.forEach(x=>{const tr=document.createElement('tr'); td(tr,new Date(x.at).toLocaleString('ko-KR',{hour12:false})); td(tr,x.actor_name||'(서버)'); td(tr,OPL[x.op]||x.op);
        td(tr,`${TBL[x.tbl]||x.tbl} · ${x.key||''}`); const dc=td(tr,diffText(x)); dc.style.maxWidth='520px'; dc.style.wordBreak='break-all';
        const a=td(tr,''); a.style.whiteSpace='nowrap';
        if(x.tbl==='docs'){const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent='되돌리기';
          b.onclick=async()=>{if(!confirm(x.op==='INSERT'?'이 자료를 넣기 전 상태로 돌립니다 (자료가 지워집니다). 그 뒤에 바뀐 내용도 사라집니다. 계속할까요?':'이 변경 바로 전 상태로 돌립니다. 그 뒤에 바뀐 내용은 사라집니다. 계속할까요?')) return;
            b.disabled=true; const rr=await sb.rpc('audit_restore',{aid:x.id}); st.textContent=rr.error?'되돌리지 못했습니다: '+errMsg(rr.error):'되돌렸습니다. 이 되돌리기도 기록에 남습니다.'; if(!rr.error) auLoad()};
          a.append(b)}
        body.append(tr)});
      if(!rows.length){const tr=document.createElement('tr'); td(tr,'기록이 없습니다.').colSpan=6; body.append(tr)}
      $('au-pager').hidden=!more&&auPage===0; $('au-page').textContent=`${auPage+1}쪽`; $('au-prev').disabled=auPage<=0; $('au-next').disabled=!more;
      st.textContent=''}
    catch(e){if(my===auBusy) st.textContent='불러오지 못했습니다: '+errMsg(e)}}
  function auSetup(){if(auInit) return; auInit=true;
    $('au-form').addEventListener('submit',e=>{e.preventDefault(); auPage=0; auLoad()});
    $('au-prev').onclick=()=>{if(auPage>0){auPage--; auLoad()}}; $('au-next').onclick=()=>{auPage++; auLoad()}}

  window.histOpen=function(id){if(!me) return;
    if(id==='hist'){hsSetup(); hsLoad()}
    else if(id==='imp'){impSetup(); impList()}
    else if(id==='audit'){auSetup(); auLoad()}};
})();
