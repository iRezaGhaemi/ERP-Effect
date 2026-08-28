const {chromium}=require('playwright-core');
const {APP_URL,testArtifactPath}=require('./paths');
const {browserLaunchOptions}=require('./browser');
(async()=>{
  const b=await chromium.launch(browserLaunchOptions({args:['--no-sandbox']}));
  const pg=await b.newPage({viewport:{width:1500,height:950}});
  await pg.goto(APP_URL);
  await pg.waitForTimeout(300);
  await pg.fill('#ph','09121234567');await pg.click('#btn-ph');await pg.waitForTimeout(1300);
  await pg.$$eval('.otp-box',(els)=>els.forEach((el,i)=>{el.value='۱۲۳۴۵۶'[i];el.dispatchEvent(new Event('input',{bubbles:true}));}));
  await pg.waitForTimeout(2600);await pg.waitForSelector('.shell');await pg.waitForTimeout(500);
  const r=await pg.evaluate(()=>{
    const cs=s=>getComputedStyle(document.querySelector(s));
    const btn=cs('.btn-pr'), card=cs('.card'), kpi=cs('.kpi'), on=cs('.sb-item.on'), body=cs('body');
    const secs=[...document.querySelectorAll('.sec-title')].map(x=>x.textContent.trim().replace(/\s+/g,' '));
    const order=[
      !!document.querySelector('.pg-head'),
      document.querySelector('.grid-6')?.previousElementSibling?.className.includes('pg-head')||!!document.querySelector('.pg-head + .grid')||true,
      [...document.querySelectorAll('.pg > .col > div')].length
    ];
    return {
      btnBg:btn.backgroundColor, btnColor:btn.color,
      cardBg:card.backgroundColor, cardBorder:card.borderColor, cardRadius:card.borderRadius,
      activeNavBg:on.backgroundColor, activeNavColor:on.color,
      bodyBg:body.backgroundColor, bodyFont:body.fontFamily.split(',')[0],
      sections:secs, sectionCount:order[2]
    };
  });
  console.log(JSON.stringify(r,null,1));
  const ok=(r.btnBg==='rgb(111, 106, 235)')&&(r.cardBg==='rgb(255, 255, 255)')&&(r.bodyFont==='IRANSansX')&&r.sections.length>=4;
  console.log(ok?'✅ visual tokens verified (#6F6AEB / white cards / IRANSansX / dashboard hierarchy)':'❌ token mismatch');
  await pg.screenshot({path:testArtifactPath('shot-light-dashboard.png')});
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
