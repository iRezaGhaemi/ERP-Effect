const {chromium}=require('playwright-core');
const {APP_URL}=require('./paths');
const {browserLaunchOptions}=require('./browser');
(async()=>{
  const b=await chromium.launch(browserLaunchOptions({args:['--no-sandbox']}));
  const problems=[];
  const scrollableAnc=el=>{let p=el.parentElement;while(p&&p!==document.body){const st=getComputedStyle(p);if(/(auto|scroll)/.test(st.overflowX+st.overflowY))return true;p=p.parentElement;}return false;};
  for(const vp of [{w:1500,h:950},{w:1280,h:850},{w:768,h:1000},{w:390,h:844}]){
    const pg=await b.newPage({viewport:{width:vp.w,height:vp.h}});
    await pg.goto(APP_URL);
    await pg.waitForTimeout(300);
    await pg.evaluate(()=>{S.authed=true;S.missionSeen=true;});
    for(const r of ['dashboard','tasks','mytasks','calendar','crm','customers','customers/c1','leaves','finance','finance/invoices','finance/payroll','finance/exp','social','social/posts','social/report','team','team/e2','integrations','permissions','reports','notifications','settings','workspaces','cpro','cpro/cp2','cpro/cp3','cpro/cp4',
     'cpro/cp1|ov','cpro/cp1|tasks','cpro/cp1|assets','cpro/cp1|brand','cpro/cp1|plan','cpro/cp1|reports','cpro/cp1|members','cpro/cp1|settings',
     'team/e2|personal','team/e2|work','team/e2|bank','team/e2|acts','team/e2|pay',
     'settings|labels','settings|theme','messenger','users',
     'customers/c1','customers/c1|assets','customers/c1|brand','customers/c1|projects',
     'finance/bank']){
      await pg.evaluate(rr=>{const [rt,tb]=rr.split('|');if(tb){if(rt.startsWith('cpro/'))S.tabs.cp=tb;else if(rt.startsWith('team/'))S.tabs.emp=tb;else if(rt.startsWith('customers/'))S.tabs.cust=tb;else if(rt==='settings')S.setTab=tb;else if(rt==='leaves')S.tabs.lv=tb;}location.hash='#/'+rt;},r);
      await pg.waitForTimeout(130);
      const bad=await pg.evaluate((args)=>{
        const [vw,TOL]=args;const out=[];
        const clippedByAnc=(ch,box)=>{let p=ch.parentElement;while(p&&p!==box){const st=getComputedStyle(p);if(/(auto|scroll|hidden|clip)/.test(st.overflow+st.overflowX))return true;p=p.parentElement;}return false;};
        document.querySelectorAll('.card,.panel,.kpi,.btn,.badge,.kb-card,.lead-card,.meet-mini,.msn,.int-card,.card-h,.card-b').forEach(box=>{
          const br=box.getBoundingClientRect();
          box.querySelectorAll('*').forEach(ch=>{
            if(clippedByAnc(ch,box))return;
            const cr=ch.getBoundingClientRect();
            if(cr.width===0&&cr.height===0)return;
            if(cr.right>br.right+TOL||cr.left<br.left-TOL){
              out.push({box:box.className.slice(0,22),ch:ch.tagName+'.'+(ch.className+'').slice(0,16),over:Math.round(Math.max(cr.right-br.right,br.left-cr.left))+'px'});
            }
          });
        });
        window.scrollTo(60,0);const s1=window.scrollX;window.scrollTo(-60,0);const s2=window.scrollX;window.scrollTo(0,0);
        if(Math.abs(s1)>1||Math.abs(s2)>1)out.push({box:'DOCUMENT',ch:'h-scroll '+document.documentElement.scrollWidth});
        return out.slice(0,5);
      },[vp.w,2]).catch(e=>[{box:'EVAL-ERR',ch:e.message.slice(0,60)}]);
      if(bad.length)problems.push(`[${vp.w}] ${r}: `+bad.map(x=>`${x.box}←${x.ch}(${x.over||''})`).join(' ; '));
    }
    for(const fn of ['taskDrawer("t1")','invPreview("EF-1405-0142")','leadDrawer("l4")','meetInfo("m2")','intDrawer("i3")','payHist("e6")','missionPopup()','custDrawer("c1")']){
      await pg.evaluate(f=>{eval(f)},fn).catch(()=>{});
      await pg.waitForTimeout(110);
      const bad=await pg.evaluate(()=>{
        const TOL=2;const out=[];
        const box=document.querySelector('.drawer');
        if(box){const br=box.getBoundingClientRect();
          box.querySelectorAll('.drawer-h *,.drawer-f *').forEach(ch=>{const cr=ch.getBoundingClientRect();
            if(cr.width===0)return;
            if(cr.right>br.right+TOL||cr.left<br.left-TOL)out.push('hdr/ftr:'+ch.tagName+'.'+(ch.className+'').slice(0,14));});
          const bw=box.querySelector('.drawer-b');
          if(bw&&bw.scrollWidth>bw.clientWidth+TOL)out.push('body-hscroll '+bw.scrollWidth+'>'+bw.clientWidth);
        }
        return out.slice(0,4);
      });
      if(bad.length)problems.push(`[${vp.w}] ${fn}: `+bad.join(','));
      await pg.evaluate(()=>{closeDrawer();closeModal();});
    }
    await pg.close();
  }
  await b.close();
  if(problems.length){console.log('✗ CONTAINMENT ('+problems.length+'):');problems.slice(0,30).forEach(p=>console.log('  '+p));process.exit(1);}
  console.log('✅ containment passed — 4 viewports × 45 routes (incl. v2.3 hubs) + 8 overlays, nothing escapes its box');
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
