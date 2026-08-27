const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('/home/user/effect-erp.html','utf8');
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://erp.local/',
  beforeParse(w){
    w.scrollTo=()=>{};w.print=()=>{};
    w.Element.prototype.scrollIntoView=function(){};
    w.addEventListener('error',e=>errors.push('window: '+e.message));
  }});
const w=dom.window,d=w.document;
function click(sel){const el=d.querySelector(sel);if(el){el.dispatchEvent(new w.Event('click',{bubbles:true}));return true}return false}
const routes=['#/dashboard','#/mytasks','#/calendar','#/workspaces','#/tasks','#/crm','#/crm/pipeline','#/crm/companies','#/crm/contacts','#/crm/opps','#/crm/acts','#/customers','#/customers/c1','#/leaves','#/finance','#/finance/in','#/finance/pay','#/finance/exp','#/finance/invoices','#/finance/proforma','#/finance/payroll','#/finance/acc','#/finance/tx','#/finance/rpt','#/reports','#/social','#/social/posts','#/social/report','#/team','#/team/e2','#/integrations','#/permissions','#/activity','#/notifications','#/settings'];
(async()=>{
  try{
    // login → OTP → success
    if(!d.querySelector('.auth-card'))throw new Error('login card missing');
    d.getElementById('ph').value='۰۹۱۲۱۲۳۴۵۶۷';
    d.getElementById('ph').dispatchEvent(new w.Event('input',{bubbles:true}));
    w.authSend();
    await new Promise(r=>setTimeout(r,1200));
    if(!d.querySelector('.otp-box'))throw new Error('otp step missing');
    d.querySelectorAll('.otp-box').forEach((b,i)=>b.value='۱۲۳۴۵۶'.split('')[i]);
    w.authVerify();
    await new Promise(r=>setTimeout(r,2500));
    if(!d.querySelector('.shell'))throw new Error('shell missing after auth');
    console.log('✓ auth flow OK — dashboard rendered, title:',d.getElementById('tb-title').textContent);
    for(const r of routes){
      w.location.hash=r;
      w.dispatchEvent(new w.Event('hashchange'));
      await new Promise(res=>setTimeout(res,30));
      const ok=d.querySelector('.shell');
      const size=d.getElementById('app').innerHTML.length;
      if(!ok||size<2000)errors.push('route '+r+' → render too small ('+size+')');
      else console.log('✓',r,'('+size+' chars)');
    }
    // interactions
    w.location.hash='#/tasks';w.dispatchEvent(new w.Event('hashchange'));
    await new Promise(r=>setTimeout(r,50));
    w.setTaskView('list');await new Promise(r=>setTimeout(r,30));
    w.setTaskView('cal');await new Promise(r=>setTimeout(r,30));
    w.setTaskView('tl');await new Promise(r=>setTimeout(r,30));
    console.log('✓ task views OK');
    w.taskDrawer('t1');await new Promise(r=>setTimeout(r,30));
    if(!d.querySelector('.drawer'))errors.push('task drawer failed');else console.log('✓ task drawer OK');
    d.querySelector('.drawer .ibtn').dispatchEvent(new w.Event('click',{bubbles:true}));w.closeDrawer();
    w.invPreview('EF-1405-0142');await new Promise(r=>setTimeout(r,30));
    if(!d.querySelector('.paper'))errors.push('invoice paper failed');else console.log('✓ invoice preview OK');
    w.closeDrawer();
    w.togglePalette(true);await new Promise(r=>setTimeout(r,30));
    const inp=d.getElementById('cmd-q');inp.value='تاج';inp.dispatchEvent(new w.Event('input',{bubbles:true}));
    if(!d.querySelectorAll('.cmd-i').length)errors.push('palette results empty');else console.log('✓ command palette OK ('+d.querySelectorAll('.cmd-i').length+' hits for «تاج»)');
    w.togglePalette(false);
    w.taskModal(null);await new Promise(r=>setTimeout(r,30));
    d.getElementById('tk-t').value='تسک تستی';w.taskSave();
    if(!w.TASKS.some(t=>t.title==='تسک تستی'))errors.push('task create failed');else console.log('✓ task create OK');
    w.meetModal();await new Promise(r=>setTimeout(r,30));w.meetCreate();console.log('✓ meeting create OK');
    w.leaveModal();await new Promise(r=>setTimeout(r,30));w.leaveCreate();console.log('✓ leave create OK');
    w.leadModal();await new Promise(r=>setTimeout(r,30));
    d.getElementById('ld-co').value='شرکت تست';w.leadCreate();console.log('✓ lead create OK');
    w.invModal(false);await new Promise(r=>setTimeout(r,30));
    d.getElementById('iv-d0').value='خدمت تستی';
    const q0=d.getElementById('iv-q0');q0.value='۲';q0.dataset.v='2';
    const u0=d.getElementById('iv-u0');u0.value='۱۰٬۰۰۰٬۰۰۰';
    w.invCreate(false,'draft');console.log('✓ invoice create OK');
    w.missionPopup();await new Promise(r=>setTimeout(r,30));
    if(!d.querySelector('.mission-pop'))errors.push('mission popup failed');else console.log('✓ mission popup OK');
    w.closeModal();
    w.intDrawer('i1');await new Promise(r=>setTimeout(r,30));console.log('✓ integration drawer OK');w.closeDrawer();
    w.payHist('e2');await new Promise(r=>setTimeout(r,30));console.log('✓ payroll history OK');w.closeDrawer();
    // theme: default light, toggle dark
    if(d.documentElement.getAttribute('data-theme')!=='light')errors.push('default theme not light');
    w.S.theme='dark';w.render();await new Promise(r=>setTimeout(r,30));
    if(d.documentElement.getAttribute('data-theme')!=='dark')errors.push('dark toggle failed');
    w.S.theme='light';w.render();await new Promise(r=>setTimeout(r,30));
    console.log('✓ theme: light default + dark toggle OK');
  }catch(e){errors.push('EXCEPTION: '+e.message+'\n'+e.stack.split('\n')[1]);}
  console.log('\n——————');
  if(errors.length){console.log('✗ ERRORS:\n'+errors.join('\n'));process.exit(1);}
  console.log('✅ ALL SMOKE TESTS PASSED');
})();
