const {chromium}=require('playwright-core');
const {APP_URL}=require('./paths');
const {browserLaunchOptions}=require('./browser');
(async()=>{
  const b=await chromium.launch(browserLaunchOptions({args:['--no-sandbox']}));
  const pg=await b.newPage({viewport:{width:1360,height:900}});
  pg.on('pageerror',e=>console.log('PAGEERROR:',e.message));
  await pg.goto(APP_URL);await pg.waitForTimeout(300);
  await pg.evaluate(()=>{S.authed=true;S.missionSeen=true;location.hash='#/dashboard';render();});
  await pg.waitForTimeout(400);
  const r=await pg.evaluate(()=>{
    const mm=document.querySelector('.meet-mini');
    return {avatars:mm?mm.querySelectorAll('.av.photo').length:0,names:mm?mm.textContent.includes('رضا'):false};
  });
  console.log('today-meet avatar photos:',r.avatars,'| names kept:',r.names);
  // فوکوس با رنگ اصلی
  const focus=await pg.evaluate(()=>{
    const i=document.querySelector('.inp');i.focus();
    return getComputedStyle(i).outlineColor;
  });
  console.log('input focus outline color:',focus);
  await b.close();
})();
