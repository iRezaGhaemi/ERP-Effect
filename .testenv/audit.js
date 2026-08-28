const {chromium}=require('playwright-core');
const fs=require('fs');
const {APP_URL}=require('./paths');
const {browserLaunchOptions}=require('./browser');
(async()=>{
  const b=await chromium.launch(browserLaunchOptions({args:['--no-sandbox']}));
  const results=[];const errs=[];
  for(const vp of [{w:1500,h:950},{w:1280,h:850},{w:390,h:844}]){
    const pg=await b.newPage({viewport:{width:vp.w,height:vp.h}});
    pg.on('pageerror',e=>errs.push(vp.w+': '+e.message));
    await pg.goto(APP_URL);
    await pg.waitForTimeout(400);
    if(vp.w===1500){
      const dir=await pg.evaluate(()=>document.dir);
      const fontLoaded=await pg.evaluate(()=>document.fonts.check('14px Ravi')&&document.fonts.check('700 14px Ravi'));
      results.push(`dir=${dir} | Ravi 400/700 loaded=${fontLoaded}`);
      // login visuals
      const bg=await pg.evaluate(()=>getComputedStyle(document.body).backgroundColor);
      results.push('login bg='+bg+' (light expected: rgb(246, 246, 248))');
      await pg.fill('#ph','09121234567');await pg.click('#btn-ph');await pg.waitForTimeout(1400);
      const otp=await pg.$$eval('.otp-box',els=>els.length);
      results.push('otp boxes='+otp);
      await pg.$$eval('.otp-box',(els)=>els.forEach((el,i)=>{el.value='۱۲۳۴۵۶'[i];el.dispatchEvent(new Event('input',{bubbles:true}));}));
      await pg.waitForTimeout(2600);
      await pg.waitForSelector('.shell',{timeout:5000});
    }else{
      await pg.evaluate(()=>{S.authed=true;S.missionSeen=true;location.hash='#/dashboard';render();});
      await pg.waitForTimeout(500);
    }
    const routes=['dashboard','tasks','crm','customers/c1','finance','finance/invoices','finance/payroll','leaves','calendar','social/posts','social/report','team','permissions','integrations','reports','settings'];
    let overflows=0;
    for(const r of routes){
      await pg.evaluate(rr=>{location.hash='#/'+rr;},r);
      await pg.waitForTimeout(160);
      const ov=await pg.evaluate(()=>{
        window.scrollTo(80,0);const sx1=window.scrollX;window.scrollTo(-80,0);const sx2=window.scrollX;window.scrollTo(0,0);
        return (Math.abs(sx1)>1||Math.abs(sx2)>1)?{sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}:null;
      });
      if(ov){overflows++;errs.push(`viewport ${vp.w} route ${r}: scrollWidth ${ov.sw} > client ${ov.cw}`);}
    }
    results.push(`viewport ${vp.w}×${vp.h}: ${routes.length} routes audited, horizontal overflow in ${overflows}`);
    // sidebar position check (desktop only)
    if(vp.w===1500){
      const sb=await pg.evaluate(()=>{const s=document.querySelector('.sb');if(!s)return null;const r=s.getBoundingClientRect();return{right:Math.round(r.right),w:Math.round(r.width),left:Math.round(r.left)};});
      results.push('sidebar rect: '+JSON.stringify(sb)+' (right edge should equal viewport width '+vp.w+')');
      // collapsed mode
      await pg.evaluate(()=>{S.sbMini=true;render();});await pg.waitForTimeout(350);
      const sb2=await pg.evaluate(()=>document.querySelector('.sb').getBoundingClientRect().width);
      results.push('collapsed sidebar width='+sb2);
      await pg.evaluate(()=>{S.sbMini=false;render();});
      // dashboard date check
      await pg.evaluate(()=>{location.hash='#/dashboard';render();});await pg.waitForTimeout(300);
      const dateTxt=await pg.evaluate(()=>document.querySelector('.pg-head .t-bs').textContent);
      results.push('dashboard date line = «'+dateTxt+'» (expect پنجشنبه، ۵ شهریور ۱۴۰۵)');
      // light theme audit
      const lb=await pg.evaluate(()=>getComputedStyle(document.body).backgroundColor);
      results.push('default body bg='+lb+' (light expected)');
      await pg.evaluate(()=>{S.theme='dark';render();});await pg.waitForTimeout(300);
      const db=await pg.evaluate(()=>getComputedStyle(document.body).backgroundColor);
      results.push('dark-mode body bg='+db);
      await pg.evaluate(()=>{S.theme='light';render();});
      // command palette
      await pg.evaluate(()=>togglePalette(true));await pg.waitForTimeout(250);
      const hits=await pg.$$eval('.cmd-i',els=>els.length);
      results.push('palette default items='+hits);
      await pg.fill('#cmd-q','فاکتور');await pg.waitForTimeout(200);
      const hits2=await pg.$$eval('.cmd-i',els=>els.length);
      results.push('palette «فاکتور» hits='+hits2);
      await pg.keyboard.press('Escape');
    }
    await pg.close();
  }
  await b.close();
  results.forEach(r=>console.log('  '+r));
  if(errs.length){console.log('✗ PROBLEMS:');errs.forEach(e=>console.log('  '+e));process.exit(1);}
  console.log('✅ layout/RTL/font audit passed');
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
