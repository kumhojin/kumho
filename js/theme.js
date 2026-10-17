/* 금호정공 사내 업무 시스템 · 테마(자동·라이트·다크) 버튼
   일반 <script>로 순서대로 불러옴 (모든 파일이 같은 전역 범위를 씀). 순서는 index.html 참고. */
(function(){const order=['auto','light','dark'], lbl={auto:'자동',light:'라이트',dark:'다크'};
  function cur(){try{return localStorage.getItem('kumhoTheme')||'auto'}catch(e){return 'auto'}}
  function apply(t){const r=document.documentElement; if(t==='auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme',t);
    document.querySelectorAll('[data-theme-btn]').forEach(b=>{b.innerHTML='<span class="tl">테마: </span>'+lbl[t]; b.setAttribute('aria-label','테마: '+lbl[t]); b.title='눌러서 바꾸기 (자동 → 라이트 → 다크)'})}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-theme-btn]'); if(!b) return;
    const t=order[(order.indexOf(cur())+1)%3]; try{localStorage.setItem('kumhoTheme',t)}catch(x){} apply(t)});
  apply(cur());
  function hh(){const h=document.querySelector('header.top'); if(h) document.documentElement.style.setProperty('--hh',h.offsetHeight+'px')}
  addEventListener('resize',hh); addEventListener('load',hh); document.addEventListener('DOMContentLoaded',()=>{hh(); const h=document.querySelector('header.top'); if(h&&window.ResizeObserver) new ResizeObserver(hh).observe(h)});
})();
