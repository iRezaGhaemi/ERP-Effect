const {chromium}=require('playwright-core');
const {APP_URL,artifactPath}=require('./paths');
const {browserLaunchOptions}=require('./browser');
(async()=>{
  const b=await chromium.launch(browserLaunchOptions({args:['--no-sandbox','--font-render-hinting=none']}));
  const pg=await b.newPage({viewport:{width:1500,height:950},deviceScaleFactor:1});
  pg.on('pageerror',e=>console.log('PAGEERROR:',e.message));
  pg.on('console',m=>{if(m.type()==='error')console.log('CONSOLE:',m.text().slice(0,140));});
  await pg.goto(APP_URL);
  await pg.waitForTimeout(600);
  await pg.screenshot({path:artifactPath('shot-login.png')});
  // demo username/password login
  await pg.fill('#auth-username','demo.admin');
  await pg.fill('#auth-password','DemoOnly-123!');
  await pg.click('#btn-auth');
  await pg.waitForSelector('.shell');
  await pg.waitForTimeout(900); // mission popup
  await pg.screenshot({path:artifactPath('shot-mission.png')});
  await pg.click('.mission-pop .btn-pr');
  await pg.waitForTimeout(700);
  await pg.screenshot({path:artifactPath('shot-dashboard.png')});
  for(const [route,shot] of [['tasks','board'],['finance/invoices','invoices'],['social/posts','social'],['crm','crm'],['permissions','rbac']]){
    await pg.evaluate(r=>{location.hash=r;},`#/${route}`);
    await pg.waitForTimeout(800);
    await pg.screenshot({path:artifactPath(`shot-${shot}.png`)});
  }
  await b.close();
  console.log('✓ screenshots done');
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
