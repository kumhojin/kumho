/* 금호정공 사내 업무 시스템 · Supabase 연결 · 로그인 API(kumhoAuth) · 데이터 저장소 · LM Studio AI 연결
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
/* ===== 금호정공 포털: Supabase 저장소 + LM Studio AI 연결 =====
   기존 화면 코드는 window.claude.use('db'|'user'|'sample'|'downloads') 를 그대로 부르고,
   여기서 그 부름을 Supabase(public.docs 표)와 LM Studio(OpenAI 호환 API)로 연결합니다. */
(function(){
  const SUPABASE_URL='https://qnkugmphzkfkrsgewutl.supabase.co';
  const SUPABASE_KEY='sb_publishable_1vGSYU1p8uVUpbPB4_nWRw_g_maxDia';
  const TABLE='docs';
  let sb=null; try{sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'kumho-auth'}})}catch(e){console.error('Supabase 연결 실패',e)}
  // ---------- 로그인 (Supabase Auth) ----------
  const EMAIL=u=>String(u||'').trim().toLowerCase()+'@portal.khpi.co.kr';
  const profDoc=p=>({id:p.id,exists:true,data:()=>({user:p.username,name:p.name,team:p.team,role:p.role,station:p.station||'',perm:p.perm||{},createdAt:Date.parse(p.created_at)||0})});
  async function myProfile(){const {data:{session}}=await sb.auth.getSession(); if(!session) return null;
    const {data,error}=await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle(); if(error) throw error; return data}
  function tmpClient(){return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'kumho-tmp'}})}
  window.kumhoSB=()=>sb;
  window.kumhoAuth={
    async signIn(u,pw){const {error}=await sb.auth.signInWithPassword({email:EMAIL(u),password:pw}); if(error) throw error; return await myProfile()},
    async signOut(){try{await sb.auth.signOut()}catch(e){}},
    current:myProfile,
    async hasAdmin(){const {data,error}=await sb.rpc('portal_has_admin'); if(error) return true; return !!data},
    async register(u,name,pw){const c=tmpClient(); const {data,error}=await c.auth.signUp({email:EMAIL(u),password:pw,options:{data:{username:String(u).trim().toLowerCase(),name}}}); if(error) throw error; return data.user&&data.user.id},
    async saveAccount(rec,pw){const {data:ex}=await sb.from('profiles').select('id').eq('username',rec.user).maybeSingle();
      let id=ex&&ex.id;
      if(!id){if(!pw||pw.length<6) throw new Error('새 계정은 비밀번호(6자 이상)가 필요합니다.'); id=await this.register(rec.user,rec.name,pw); if(!id) throw new Error('계정을 만들지 못했습니다.')}
      const {error}=await sb.from('profiles').update({name:rec.name,team:rec.team,role:rec.role,station:rec.station||'',perm:rec.perm||{},updated_at:new Date().toISOString()}).eq('id',id); if(error) throw error;
      if(ex&&pw){const r=await sb.rpc('admin_set_password',{uid:id,pw}); if(r.error) throw r.error}
      return id},
    async deleteAccount(id){const {error}=await sb.rpc('admin_delete_user',{uid:id}); if(error) throw error},
    async changeMyPassword(oldPw,pw){const {data:{session}}=await sb.auth.getSession(); if(!session) throw new Error('로그인이 필요합니다.');
      const chk=await sb.auth.signInWithPassword({email:session.user.email,password:oldPw}); if(chk.error) throw new Error('현재 비밀번호가 맞지 않습니다.');
      const {error}=await sb.auth.updateUser({password:pw}); if(error) throw error}
  };

  // ---------- 문서 저장소 (Firestore 비슷한 모양) ----------
  const rid=()=>{const a='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',r=crypto.getRandomValues(new Uint8Array(20));return [...r].map(x=>a[x%62]).join('')};
  const snapDoc=(id,data)=>({id,exists:data!=null,data:()=>data==null?undefined:data});
  const chk=({data,error})=>{if(error) throw error; return data};
  // 실시간: 표 전체를 한 채널로 듣고 col별로 나눔.
  // 바뀐 줄만 화면 데이터에 바로 반영 (전체를 다시 불러오지 않음 → 데이터가 많아도 빠름)
  // 바뀐 내용을 알 수 없을 때(null)만 전체 다시 불러옴
  const subs=new Map(); let chan=null;
  function fire(col,ch){const s=subs.get(col); if(!s) return; clearTimeout(s.timer);
    if(ch===undefined||ch===null) s.full=true; else s.batch.push(ch);
    s.timer=setTimeout(()=>{const b=s.full?null:s.batch; s.batch=[]; s.full=false; s.listeners.forEach(f=>f(b))},150)}
  function chOf(p){const n=p.new&&Object.keys(p.new).length?p.new:null, o=p.old&&Object.keys(p.old).length?p.old:null;
    const t=p.eventType, id=(n&&n.id)||(o&&o.id); if(!id) return null;
    if(t==='DELETE') return {t,id};
    if(!n||n.data==null||typeof n.data!=='object') return null; // 너무 커서 잘린 경우 등
    return {t,id,data:n.data}}
  function watch(col,fn){
    if(!chan){chan=sb.channel('kumho-docs').on('postgres_changes',{event:'*',schema:'public',table:TABLE},p=>{
      const c=(p.new&&p.new.col)||(p.old&&p.old.col); if(c) fire(c,chOf(p)); else subs.forEach((_,k)=>fire(k,null))})
      .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>fire('accounts')).subscribe()}
    let s=subs.get(col); if(!s){s={listeners:new Set(),timer:null,batch:[],full:false}; subs.set(col,s)}
    s.listeners.add(fn);
    return ()=>s.listeners.delete(fn);
  }
  // 창이 다시 보이면 최신으로 (실시간이 끊겼을 때 대비)
  let hiddenAt=0; document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=Date.now();return} if(Date.now()-hiddenAt>30000) subs.forEach((_,k)=>fire(k,null))});
  function docRef(col,id){return {
    id, path:col+'/'+id,
    async get(){const r=chk(await sb.from(TABLE).select('data').eq('col',col).eq('id',id).maybeSingle()); return snapDoc(id,r?r.data:null)},
    async set(data){chk(await sb.from(TABLE).upsert({col,id,data,updated_at:new Date().toISOString()})); return this},
    async update(patch){const cur=chk(await sb.from(TABLE).select('data').eq('col',col).eq('id',id).maybeSingle());
      if(!cur) throw new Error('문서가 없습니다: '+col+'/'+id);
      chk(await sb.from(TABLE).update({data:{...cur.data,...patch},updated_at:new Date().toISOString()}).eq('col',col).eq('id',id)); return this},
    async delete(){chk(await sb.from(TABLE).delete().eq('col',col).eq('id',id))},
    onSnapshot(cb,err){let alive=true; const load=()=>this.get().then(s=>{if(alive) cb(s)},e=>{console.error(e); err&&err(e)});
      load(); const off=watch(col,b=>{if(!b) return load(); const c=b.filter(x=>x.id===id); if(!c.length) return;
        const last=c[c.length-1]; cb(snapDoc(id,last.t==='DELETE'?null:last.data))}); return ()=>{alive=false; off()}}
  }}
  function profQuery(){return {orderBy(){return this},limit(){return this},
    async get(){const {data,error}=await sb.from('profiles').select('*').order('username'); if(error) throw error; const docs=(data||[]).map(profDoc); return {docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f)}},
    onSnapshot(cb,err){let alive=true; const load=()=>this.get().then(s=>{if(alive) cb(s)},e=>{console.error(e); err&&err(e)}); load(); const off=watch('accounts',load); return ()=>{alive=false; off()}},
    doc(id){return {id,async delete(){await window.kumhoAuth.deleteAccount(id)}}}}}
  function query(col,o={}){if(col==='accounts') return profQuery(); return {
    orderBy(field,dir='asc'){return query(col,{...o,order:{field,dir}})},
    limit(n){return query(col,{...o,limit:n})},
    where(field,op,value){if(op!=='=='&&op!=='eq') throw new Error('지원하지 않는 조건: '+op); return query(col,{...o,where:[...(o.where||[]),[field,value]]})},
    doc(id){return docRef(col,id==null?rid():String(id))},
    async add(data){const id=rid(); chk(await sb.from(TABLE).insert({col,id,data})); return docRef(col,id)},
    // Supabase는 한 번에 최대 1000줄만 돌려줌 → 1000줄씩 나눠서 끝까지 받음
    async get(){const lim=o.limit||5000, rows=[];
      for(let from=0; from<lim; from+=1000){const to=Math.min(from+1000,lim)-1;
        let q=sb.from(TABLE).select('id,data').eq('col',col);
        (o.where||[]).forEach(([f,v])=>{q=q.eq('data->>'+f,String(v))});
        if(o.order) q=q.order('data->'+o.order.field,{ascending:o.order.dir!=='desc',nullsFirst:false});
        q=q.order('id').range(from,to);
        const part=chk(await q); rows.push(...part); if(part.length<to-from+1) break}
      const docs=rows.map(r=>snapDoc(r.id,r.data));
      return {docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f)}},
    onSnapshot(cb,err){let alive=true, rows=null, busy=null, again=false; const lim=o.limit||5000;
      const out=()=>{const docs=rows.map(r=>snapDoc(r.id,r.data)); cb({docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f)})};
      const load=()=>{if(busy){again=true; return busy}
        busy=this.get().then(s=>{rows=s.docs.map(d=>({id:d.id,data:d.data()})); if(alive) out()},e=>{console.error(e); err&&err(e)})
          .finally(()=>{busy=null; if(again){again=false; load()}}); return busy};
      const ok=d=>(o.where||[]).every(([f,v])=>d&&d[f]!=null&&String(d[f])===String(v));
      const val=d=>{const x=d&&d[o.order.field]; return x==null?null:x};
      const cmp=(a,b)=>{const x=val(a.data), y=val(b.data); if(x===y) return 0; if(x==null) return 1; if(y==null) return -1;
        const r=x<y?-1:1; return o.order.dir==='desc'?-r:r};
      load();
      const off=watch(col,b=>{if(!alive) return; if(!b||!rows||busy) return load();
        const full=rows.length>=lim; let shrank=false;
        for(const c of b){const i=rows.findIndex(r=>r.id===c.id);
          if(c.t==='DELETE'||!ok(c.data)){if(i>=0){rows.splice(i,1); shrank=true}}
          else if(i>=0) rows[i]={id:c.id,data:c.data}; else rows.push({id:c.id,data:c.data})}
        if(shrank&&full) return load(); // 한도에 꽉 찬 목록에서 빠지면 다음 줄을 채우려고 다시 불러옴
        if(o.order) rows.sort(cmp); if(rows.length>lim) rows.length=lim; out()});
      return ()=>{alive=false; off()}}
  }}
  const db={collection:c=>query(c), doc:p=>{const i=p.lastIndexOf('/'); return docRef(p.slice(0,i),p.slice(i+1))}};

  // ---------- 사용자: 포털 로그인 아이디를 그대로 씀 ----------
  const user={
    async id(){try{const v=JSON.parse(localStorage.getItem('kumhoLogin')||'null'); return v&&v.user||null}catch(e){return null}},
    async profiles(ids){const out={}; ids=[...new Set(ids)].filter(Boolean); if(!ids.length) return out;
      // 이름 캐시 (5분): 화면이 다시 그려질 때마다 같은 이름을 다시 묻지 않음
      const now=Date.now(), C=user._pc||(user._pc=new Map()), miss=[];
      ids.forEach(u=>{if(u==='adminkumho'){out[u]={name:'관리자'};return} const c=C.get(u); if(c&&now-c.t<300000) out[u]=c.v; else miss.push(u)});
      if(miss.length){try{const rows=chk(await sb.from('profiles').select('username,name').in('username',miss));
        rows.forEach(r=>{const v={name:r.name||r.username}; out[r.username]=v; C.set(r.username,{v,t:now})})}catch(e){}}
      return out}
  };

  // ---------- AI: LM Studio (OpenAI 호환 서버) ----------
  const AIKEY='kumhoAI';
  function aiCfg(){let c={}; try{c=JSON.parse(localStorage.getItem(AIKEY)||'{}')}catch(e){}
    return {url:(c.url||'http://localhost:1234/v1').replace(/\/+$/,''), model:c.model||''}}
  window.kumhoAISettings=async function(){const c=aiCfg();
    const url=prompt('LM Studio 서버 주소 (예: http://localhost:1234/v1)',c.url); if(url==null) return;
    let models=[]; try{const r=await fetch(url.replace(/\/+$/,'')+'/models'); models=((await r.json()).data||[]).map(m=>m.id)}catch(e){}
    const model=prompt((models.length?'사용할 모델 이름\n불러온 모델: '+models.join(', '):'모델 목록을 불러오지 못했습니다. LM Studio 서버가 켜져 있고 CORS가 켜져 있는지 확인하세요.\n모델 이름')+'\n(비우면 첫 번째 모델 사용)',c.model||models[0]||'');
    if(model==null) return;
    try{localStorage.setItem(AIKEY,JSON.stringify({url:url.trim(),model:model.trim()}))}catch(e){}
    alert('AI 설정을 저장했습니다.\n주소: '+url+'\n모델: '+(model||'(첫 번째 모델)'))};
  const aiErr=(m,code)=>{const e=new Error(m); e.code=code; return e};
  async function pickModel(c){if(c.model) return c.model;
    try{const r=await fetch(c.url+'/models'); const m=((await r.json()).data||[])[0]; if(m) return m.id}catch(e){}
    throw aiErr('LM Studio 모델을 찾지 못했습니다.','not_granted')}
  const strip=t=>String(t||'').replace(/<think>[\s\S]*?<\/think>/g,'').trim();
  async function fileToDataURL(f){return await new Promise((res,rej)=>{const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f)})}
  async function toMsg(m,images){if(!images||!images.length) return m;
    const parts=[{type:'text',text:String(m.content)}]; for(const f of images) parts.push({type:'image_url',image_url:{url:await fileToDataURL(f)}});
    return {...m,content:parts}}
  async function chat(messages,extra){const c=aiCfg(); const model=await pickModel(c); let r;
    try{r=await fetch(c.url+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages,temperature:0.2,stream:false,...extra})})}
    catch(e){throw aiErr('LM Studio에 연결할 수 없습니다.','not_granted')}
    if(r.status===429) throw aiErr('요청이 많습니다.','rate_limited');
    if(!r.ok) throw aiErr('LM Studio 오류 '+r.status+': '+(await r.text()).slice(0,200),'server');
    const j=await r.json(); return j.choices&&j.choices[0]&&j.choices[0].message||{content:''}}
  async function sample(messages,opts={}){
    const tools=opts.tools||[]; const msgs=[...messages];
    if(opts.images&&msgs.length){msgs[msgs.length-1]=await toMsg(msgs[msgs.length-1],opts.images)}
    const extra=tools.length?{tools:tools.map(t=>({type:'function',function:{name:t.name,description:t.description,parameters:t.inputSchema||{type:'object',properties:{}}}}))}:{};
    for(let i=0;i<6;i++){
      const m=await chat(msgs,extra);
      if(m.tool_calls&&m.tool_calls.length&&tools.length){
        msgs.push({role:'assistant',content:m.content||'',tool_calls:m.tool_calls});
        for(const tc of m.tool_calls){const t=tools.find(x=>x.name===tc.function.name); let out;
          try{out=t?await t.execute(JSON.parse(tc.function.arguments||'{}')):{error:'없는 도구'}}catch(e){out={error:String(e&&e.message||e)}}
          msgs.push({role:'tool',tool_call_id:tc.id,content:JSON.stringify(out).slice(0,20000)})}
        continue}
      const text=strip(m.content); opts.onText&&opts.onText({text}); return {text}}
    const text='도구를 너무 많이 불렀습니다. 질문을 좁혀 주세요.'; opts.onText&&opts.onText({text}); return {text}}
  sample.json=async function(prompt,opts={}){
    const r=await sample([{role:'system',content:'너는 데이터 정리 도우미다. 설명 없이 유효한 JSON 하나로만 답한다.'},{role:'user',content:prompt}],{images:opts.images});
    let t=r.text.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
    try{return JSON.parse(t)}catch(e){}
    const a=t.indexOf('{'),b=t.lastIndexOf('}'); if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch(e){}}
    throw aiErr('AI 답을 JSON으로 읽지 못했습니다.','invalid_json')};
  sample.limits=async()=>({images:true});

  // ---------- 파일 내려받기 ----------
  const downloads={async save({filename,data}){const blob=data instanceof Blob?data:new Blob([data]);
    const u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=filename||'download';
    document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),5000)}};

  const caps={db:sb?db:null,user,sample,downloads};
  window.claude={use:async name=>{if(name==='db'){if(!sb) return null; try{const {data:{session}}=await sb.auth.getSession(); return session?db:null}catch(e){return null}} return caps[name]||null}};
})();
