const fs=require('fs');const {JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('/home/user/effect-erp.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.local/',beforeParse(w){w.scrollTo=()=>{};w.print=()=>{};}});
const w=dom.window,d=w.document;
const routes=['#/dashboard','#/mytasks','#/calendar','#/workspaces','#/tasks','#/crm','#/crm/companies','#/crm/contacts','#/crm/opps','#/crm/acts','#/customers','#/customers/c1','#/leaves','#/finance','#/finance/in','#/finance/pay','#/finance/exp','#/finance/invoices','#/finance/proforma','#/finance/payroll','#/finance/acc','#/finance/tx','#/finance/rpt','#/reports','#/social','#/social/posts','#/social/report','#/team','#/team/e2','#/integrations','#/permissions','#/activity','#/notifications','#/settings'];
(async()=>{
  w.eval('S.authed=true;S.missionSeen=true;render()');
  let bad=[];
  for(const r of routes){
    w.location.hash=r;w.dispatchEvent(new w.Event('hashchange'));
    await new Promise(res=>setTimeout(res,25));
    const txt=d.getElementById('app').textContent;
    for(const token of ['undefined','NaN','[object','null،','Error'])
      if(txt.includes(token)){bad.push(r+' → «'+token+'»  در: …'+txt.slice(Math.max(0,txt.indexOf(token)-40),txt.indexOf(token)+20).replace(/\n/g,' ')+'…');break;}
  }
  // drawers & modals too
  for(const fn of ['taskDrawer("t3")','invPreview("EF-1405-0141")','leadDrawer("l9")','intDrawer("i1")','payHist("e2")','meetInfo("m2")','projInfo("p1")','missionPopup()']){
    w.eval(fn);await new Promise(res=>setTimeout(res,25));
    const txt=(d.querySelector('.drawer')||d.querySelector('.modal')).textContent;
    for(const token of ['undefined','NaN','[object'])
      if(txt.includes(token)){bad.push(fn+' → «'+token+'»: …'+txt.slice(Math.max(0,txt.indexOf(token)-50),txt.indexOf(token)+25).replace(/\n/g,' ')+'…');break;}
    w.closeDrawer();w.closeModal();
  }
  if(bad.length){console.log('✗ LEAKS:');bad.forEach(b=>console.log('  '+b));process.exit(1);}
  console.log('✅ no leaked undefined/NaN in '+(routes.length+7)+' views');
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
