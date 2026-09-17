/* ============================================================
   EFFECT ERP · Authentication — demo username + password
   ============================================================ */
const DEMO_AUTH=Object.freeze({username:'demo.admin',password:'DemoOnly-123!'});
const AUTH={username:'',password:'',err:''};
const LOGIN_ART='__LOGIN_IMG__';

function authView(){return loginStep();}
function authShell(inner,foot){
  return `<div class="auth-bg">
   <div class="auth-art" aria-hidden="true"><img src="${LOGIN_ART}" alt=""></div>
   <div class="auth-side"><div class="auth-card">
    ${inner}
    <div class="row g6 mt16" style="justify-content:center">${ic('shield',12)}<span class="t-cap">ورود محلی نسخه نمایشی · بدون اتصال به حساب واقعی</span></div>
    ${foot||''}
  </div></div></div>`;
}
function loginStep(){
  return authShell(`
   <div class="auth-brand">${logo('lg')}
     <div><h1 class="t-h2">به Effect ERP خوش آمدید</h1>
       <p class="t-bs mt4" style="text-align:center">برای مشاهده نمونه محصول وارد شوید.</p></div></div>
   <div class="auth-demo-note" role="note">${ic('alert',14)}
     <span><b>نسخه نمایشی:</b> نام کاربری <code>demo.admin</code> و رمز عبور <code>DemoOnly-123!</code> فقط داده نمونه‌اند.</span>
   </div>
   <div class="fld"><label class="lbl" for="auth-username">نام کاربری</label>
     <input class="inp" id="auth-username" autocomplete="username" autocapitalize="none" spellcheck="false"
       value="${esc(AUTH.username)}" placeholder="demo.admin" oninput="authInput('username',this.value)" onkeydown="if(event.key==='Enter')$('#auth-password').focus()">
   </div>
   <div class="fld mt12"><label class="lbl" for="auth-password">رمز عبور</label>
     <input class="inp" id="auth-password" type="password" autocomplete="current-password"
       placeholder="رمز عبور" oninput="authInput('password',this.value)" onkeydown="if(event.key==='Enter')authSubmit()">
     ${AUTH.err?`<span class="ferr" role="alert">${ic('alert',12)}${esc(AUTH.err)}</span>`:`<span class="hint">این فرم فقط شبیه‌ساز نسخه آفلاین است.</span>`}
   </div>
   <button class="btn btn-pr btn-lg btn-blk mt16" id="btn-auth" onclick="authSubmit()">
     <span class="grow">ورود به نسخه نمایشی</span>${ic('arrowleft',16)}</button>`,
   `<button class="btn btn-ghost btn-blk mt12" onclick="authDemo()">پر کردن و ورود سریع دمو</button>
    <p class="t-cap tc mt12">نسخه ۲.۶ · Effect Studio — سیستم عامل کسب‌وکار</p>`);
}
function authInput(field,value){
  if(field==='username')AUTH.username=String(value);
  if(field==='password')AUTH.password=String(value);
  AUTH.err='';
}
function authSubmit(){
  if(AUTH.username!==DEMO_AUTH.username||AUTH.password!==DEMO_AUTH.password){
    S.authed=false;
    AUTH.password='';
    AUTH.err='نام کاربری یا رمز عبور نمایشی نادرست است.';
    render();
    const input=$('#auth-password');if(input)input.focus();
    return;
  }
  AUTH.username='';AUTH.password='';AUTH.err='';
  S.authed=true;location.hash='#/dashboard';render();
  toast('ok','ورود دمو انجام شد','با کاربر نمونه مدیر سیستم وارد شدید');
}
function authDemo(){
  AUTH.username=DEMO_AUTH.username;
  AUTH.password=DEMO_AUTH.password;
  authSubmit();
}
function authReset(){AUTH.username='';AUTH.password='';AUTH.err='';}
