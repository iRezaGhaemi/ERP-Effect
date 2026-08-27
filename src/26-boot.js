/* ============================================================
   EFFECT ERP · Boot
   ============================================================ */
VIEWS['login']={title:'ورود به Effect ERP',vw:authView};
/* دسترسی آزمایشی برای QA (پروتوتایپ) */
Object.assign(window,{S,TASKS,LEADS,MEETS,LEAVES,INV,PROFORMA,INTS,CUST,EMP,WS,PRJ,NOTIFS});
loadTheme();applyTheme();
/* کلیک روی آواتار عکسی → پروفایل همکار (فاز capture تا با اکشن والد تداخل نکند) */
document.addEventListener('click',e=>{
  const a=e.target.closest&&e.target.closest('.av.photo[data-emp]');
  if(a&&a.dataset.emp&&!a.closest('.ap-item,button,label,a,select,.lb')){
    e.stopPropagation();e.preventDefault();go('#/team/'+a.dataset.emp);
  }
},true);
ckInit();
/* مهاجرت مسئولین چندگانه (v2.5) */
TASKS.forEach(t=>{if(!t.assignees)t.assignees=[t.assignee].filter(Boolean);});
if(TASKS[0]&&TASKS[0].assignees.length<2)TASKS[0].assignees.push('e8');
const _t7=TASKS.find(t=>t.id==='t7');if(_t7&&_t7.assignees.length<2)_t7.assignees.push('e4');
render();
