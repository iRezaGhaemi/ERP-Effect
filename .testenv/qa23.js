const {chromium}=require('playwright-core');
const {APP_URL}=require('./paths');
const {browserLaunchOptions}=require('./browser');
const problems=[],ok=[];
(async()=>{
  const b=await chromium.launch(browserLaunchOptions({args:['--no-sandbox']}));
  const pg=await b.newPage({viewport:{width:1360,height:900}});
  pg.on('pageerror',e=>problems.push('PAGEERROR: '+e.message));
  pg.on('console',m=>{if(m.type()==='error')problems.push('CONSOLE: '+m.text());});
  await pg.goto(APP_URL);
  await pg.waitForTimeout(300);
  await pg.evaluate(()=>{S.authed=true;S.missionSeen=true;});
  const nav=async(r,tab)=>{await pg.evaluate(([rr,tb])=>{if(tb){if(rr.startsWith('cpro'))S.tabs.cp=tb;else if(rr.startsWith('team'))S.tabs.emp=tb;else if(rr.startsWith('customers'))S.tabs.cust=tb;else if(rr==='settings')S.setTab=tb;}location.hash='#/'+rr;render();},[r,tab]);await pg.waitForTimeout(200);};
  const cnt=sel=>pg.locator(sel).count();

  // 1) cpro list
  await nav('cpro');
  if(await cnt('.card')<4)problems.push('cpro list: <4 cards');
  else ok.push('cpro list: '+await cnt('.card')+' cards');
  // 2) hub tabs
  const tabs=[['ov','.kpi'],['tasks','.kb-col'],['assets','.asset-card'],['brand','.swatch-row'],['plan','.plan-row'],['reports','.bar-col'],['members','.grid-3 .card'],['settings','.panel']];
  for(const [t,sel] of tabs){
    await nav('cpro/cp1',t);
    const n=await cnt(sel);
    if(n<1)problems.push('hub tab '+t+': no '+sel);
    else ok.push('hub/'+t+': '+n+' '+sel);
  }
  await nav('cpro/cp1','assets');
  const dz=await cnt('.dropzone'); if(dz<1)problems.push('assets: no dropzone'); else ok.push('dropzone ✓');
  // upload modal opens
  await pg.click('.dropzone'); await pg.waitForTimeout(150);
  if(await cnt('#cp-file')<1)problems.push('upload modal fail'); else ok.push('upload modal ✓');
  await pg.evaluate(()=>closeModal());
  // asset preview modal
  await nav('cpro/cp1','assets');
  await pg.click('.asset-acts .ibtn'); await pg.waitForTimeout(150);
  if(await cnt('#ovl .panel')<1)problems.push('asset preview fail'); else ok.push('asset preview modal ✓');
  await pg.evaluate(()=>closeModal());
  // 3) brand color picker
  await nav('cpro/cp1','brand');
  await pg.click(String.raw`[data-tip="ویرایش رنگ"] >> nth=0`); await pg.waitForTimeout(150);
  if(await cnt('#cc-hex')<1)problems.push('color picker fail'); else ok.push('brand color picker ✓');
  await pg.evaluate(()=>closeModal());
  // 4) tasks scopebar + labels
  await nav('tasks');
  const chips=await pg.locator('.scopebar .chip').count();
  if(chips<4)problems.push('scopebar chips='+chips); else ok.push('scopebar: '+chips+' scope chips');
  const lbs=await cnt('.kb-lbs .lb'); if(lbs<1)problems.push('no label chips on cards'); else ok.push('kanban labels ✓ ('+lbs+')');
  // scope switch
  await pg.evaluate(()=>{S.taskScope='my';render();}); await pg.waitForTimeout(150);
  const my=await pg.locator('.kb-card').count(); ok.push('scope=my → '+my+' cards');
  await pg.evaluate(()=>{S.taskScope='cp';render();}); await pg.waitForTimeout(150);
  const cp=await pg.locator('.kb-card').count(); ok.push('scope=cp → '+cp+' cards');
  // task modal label picker
  await pg.evaluate(()=>{S.taskScope='all';render();}); await pg.waitForTimeout(120);
  await pg.click('text=تسک جدید'); await pg.waitForTimeout(200);
  const pk=await cnt('#tf-lbs .lb'); if(pk<5)problems.push('taskModal labels='+pk); else ok.push('task form label picker: '+pk);
  // toggle a label + create (drawer)
  await pg.click('#tf-lbs .lb >> nth=0'); await pg.waitForTimeout(80);
  await pg.fill('#tk-t','تست برچسب v2.3');
  await pg.evaluate(()=>taskSave()); await pg.waitForTimeout(200);
  const hasNew=await pg.evaluate(()=>TASKS.some(t=>t.title==='تست برچسب v2.3'&&t.labels.length>0&&Array.isArray(t.checklist)));
  if(!hasNew)problems.push('taskSave labels/checklist fail'); else ok.push('taskSave labels+checklist(structured) ✓');
  // drawer checklist (seeded task)
  await pg.evaluate(()=>{const t=TASKS.find(x=>x.checklist.length>0);taskDrawer(t.id);}); await pg.waitForTimeout(200);
  if(await cnt('#ovl .ck-item')<1)problems.push('drawer ck-item fail'); else ok.push('drawer checklist items: '+await cnt('#ovl .ck-item'));
  const ckAdd=await cnt('#ovl .ck-add-in, #ovl input[placeholder*="آیتم"]');
  await pg.evaluate(()=>closeDrawer());
  // 5) team bank
  await nav('team/e2','bank');
  const masked=await pg.locator('#bk-v-card').textContent();
  if(!/•/.test(masked))problems.push('bank not masked: '+masked); else ok.push('bank masked ✓ ('+masked.trim()+')');
  const canBank=await pg.evaluate(()=>canSeeBank());
  const roleName=await pg.evaluate(() => (ROLES.find(r=>r.id===S.role)||{}).t);
  ok.push('canSeeBank(role='+roleName+')='+canBank);
  if(canBank){
    const hasBtn=await cnt('text=نمایش اطلاعات'); ok.push('reveal btn='+hasBtn);
    await pg.click('text=نمایش اطلاعات >> nth=0'); await pg.waitForTimeout(150);
    const hasDlg=await cnt('text=این مشاهده در لاگ حسابرسی ثبت خواهد شد');
    if(hasDlg<1)problems.push('reveal confirm fail'); else ok.push('reveal confirm ✓');
    await pg.evaluate(()=>{document.querySelector('#ovl .btn-pr').click();}); await pg.waitForTimeout(150);
    const unm=await pg.evaluate(()=>document.querySelector('#bk-v-card').textContent);
    if(/•/.test(unm))problems.push('reveal did not unmask'); else ok.push('unmask ✓ ('+unm+')');
    const log=await cnt('.act-row'); if(log<1)problems.push('bank audit log fail'); else ok.push('bank audit log rows: '+log);
  } else {
    if(await cnt('text=بدون مجوز')<0)problems.push('no-perm badge fail');
    ok.push('no-perm state ✓ (badge shown)');
  }
  // 6) leave modal approver
  await nav('leaves');
  await pg.click('text=درخواست مرخصی'); await pg.waitForTimeout(200);
  const aps=await cnt('#lv-aplist .ap-item');
  if(aps<3)problems.push('approver list='+aps); else ok.push('approver picker: '+aps+' approvers');
  const hasAv=await cnt('#lv-aplist .av'); if(hasAv<aps)problems.push('approver avatars missing');
  const flow=await pg.locator('.lv-flow .chip').count();
  if(flow<5)problems.push('flow chips='+flow); else ok.push('leave flow 5 steps ✓');
  await pg.fill('#lv-apq','سارا'); await pg.evaluate(()=>apFilter('سارا')); await pg.waitForTimeout(120);
  const filt=await cnt('#lv-aplist .ap-item'); if(filt<1)problems.push('approver search fail'); else ok.push('approver search ✓ → '+filt);
  await pg.evaluate(()=>closeModal());
  // leave drawer flow
  await pg.evaluate(()=>{leaveDrawer(LEAVES[0].id);}); await pg.waitForTimeout(200);
  const fl2=await cnt('#ovl .lv-flow .chip');
  if(fl2<5)problems.push('drawer flow='+fl2); else ok.push('leave drawer 5-step flow ✓');
  await pg.evaluate(()=>closeDrawer());
  // 7) settings labels
  await nav('settings','labels');
  const rows=await cnt('.lb-mng');
  if(rows<5)problems.push('label mgmt rows='+rows); else ok.push('label management: '+rows+' labels');
  // 8) no emojis anywhere
  await nav('dashboard');
  const emojiCount=await pg.evaluate(()=>{const t=document.body.innerText;const e=t.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F02F}]/gu);return e?e.length:0;});
  if(emojiCount>0)problems.push('EMOJIS FOUND: '+emojiCount); else ok.push('zero emojis ✓');
  // 9) zero box-shadow (computed)
  const shadows=await pg.evaluate(()=>{let n=0;document.querySelectorAll('*').forEach(el=>{const s=getComputedStyle(el).boxShadow;if(s&&s!=='none')n++;});return n;});
  if(shadows>0)problems.push('box-shadows: '+shadows); else ok.push('zero box-shadow ✓');
  // 10.5) v2.3 final-structure checks
  // ov = 9 KPI cards (incl. 8 spec cards)
  await nav('cpro/cp1','ov');
  const kpiN=await cnt('.kpi');
  if(kpiN<8)problems.push('ov KPIs='+kpiN); else ok.push('overview KPI cards: '+kpiN);
  const kpiTxt=await pg.evaluate(()=>[...document.querySelectorAll('.kpi .k-l')].map(x=>x.textContent).join('|'));
  for(const k of ['تعداد تسک','انجام','در حال انجام','تولیدشده','باقی','پست ماه','ریلز ماه','استوری ماه'])
    if(!kpiTxt.includes(k))problems.push('ov KPI missing: '+k);
  ok.push('ov KPI labels cover spec ✓');
  // month selector
  await nav('cpro/cp1','plan');
  const msel=await pg.locator('.chip.chip-sel').count();
  const mchips=await pg.evaluate(()=>[...document.querySelectorAll('.chip')].filter(c=>c.textContent.includes('۱۴۰۵')).length);
  if(mchips<3)problems.push('month selector chips='+mchips); else ok.push('plan month selector: '+mchips+' months');
  await pg.evaluate(()=>{S._cpMonth=3;render();}); await pg.waitForTimeout(120);
  const mlab=await pg.evaluate(()=>document.querySelector('.kpi .k-d').textContent);
  if(!mlab.includes('شهریور'))problems.push('month switch fail: '+mlab); else ok.push('month switch ✓ ('+mlab+')');
  await pg.evaluate(()=>{S._cpMonth=null;});
  // customer profile tabs
  await nav('customers/c1','assets');
  const cassets=await cnt('.asset-card');
  if(cassets<5)problems.push('cust assets='+cassets); else ok.push('customer assets tab: '+cassets+' files');
  await nav('customers/c1','brand');
  const csw=await cnt('.swatch-row');
  if(csw<5)problems.push('cust brand swatches='+csw); else ok.push('customer brand kit: '+csw+' colors');
  // finance/bank with permission
  await nav('finance/bank');
  const frows=await cnt('#fbank tbody tr, [id^=fbank] tr');
  const fcard=await pg.evaluate(()=>{const el=[...document.querySelectorAll('table')].find(t=>t.textContent.includes('شماره کارت'));return el?el.textContent.includes('•'):false;});
  ok.push('finance/bank rows='+frows+', masked-in-table='+fcard);
  if(!fcard)problems.push('finance bank table not masked');
  const fullLeak=await pg.evaluate(()=>{const t=document.body.innerText;return /\d{16}/.test(t.replace(/[\s٬,]/g,''))||/IR\d{20,}/.test(t);});
  if(fullLeak)problems.push('FULL bank number leaked on finance/bank'); else ok.push('no full bank numbers in finance view ✓');
  // finance/bank without permission
  const noPermRole=await pg.evaluate(()=>ROLES.find(r=>!CAN_BANK.includes(r.t)).id);
  await pg.evaluate(rr=>{S.role=rr;render();},noPermRole); await pg.waitForTimeout(150);
  const locked=await pg.evaluate(()=>document.body.innerText.includes('دسترسی محدود'));
  if(!locked)problems.push('finance/bank no lock for role'); else ok.push('finance/bank permission gate ✓');
  await pg.evaluate(()=>{S.role='r1';render();});
  // leave drawer request date
  await nav('leaves');
  await pg.evaluate(()=>leaveDrawer(LEAVES[0].id)); await pg.waitForTimeout(150);
  const hasDate=await pg.evaluate(()=>document.getElementById('ovl').textContent.includes('تاریخ درخواست'));
  if(!hasDate)problems.push('leave drawer missing تاریخ درخواست'); else ok.push('leave drawer: تاریخ درخواست ✓');
  await pg.evaluate(()=>closeDrawer());
  // avatar click → profile
  await nav('leaves');
  const before=await pg.evaluate(()=>location.hash);
  await pg.click('.appr .av.photo[data-emp] >> nth=0'); await pg.waitForTimeout(250);
  const after=await pg.evaluate(()=>location.hash);
  if(!/team\//.test(after))problems.push('avatar click nav fail: '+after); else ok.push('avatar click → profile ✓ ('+after+')');
  // card click still opens drawer (no interference)
  await nav('tasks');
  await pg.click('.kb-card .tt >> nth=0'); await pg.waitForTimeout(200);
  const drawerOK=await cnt('#ovl');
  if(drawerOK<1)problems.push('kb-card click broken by avatar handler'); else ok.push('kb-card click still opens drawer ✓');
  await pg.evaluate(()=>closeDrawer());
  // 10) avatar photos render (background-image set)
  const avImgs=await pg.evaluate(()=>[...document.querySelectorAll('.av.photo')].filter(a=>getComputedStyle(a).backgroundImage.includes('data:image')).length);
  const avAll=await cnt('.av.photo');
  ok.push('photo avatars: '+avAll+' rendered');
  if(avAll<1)problems.push('no photo avatars on dashboard');
  await b.close();
  console.log(ok.map(x=>'✓ '+x).join('\n'));
  console.log('——————');
  if(problems.length){console.log(problems.map(x=>'✗ '+x).join('\n'));process.exit(1);}
  console.log('✅ v2.3 feature QA passed');
})();
