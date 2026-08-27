/* ============================================================
   EFFECT ERP · Authentication — phone + OTP
   ============================================================ */
const AUTH={step:'phone',phone:'',err:'',loading:false,tries:0,lock:0,cool:90,coolTimer:null,okAnim:false};
function authView(){
  if(AUTH.step==='phone')return phoneStep();
  if(AUTH.step==='otp')return otpStep();
  return okStep();
}
const LOGIN_ART='__LOGIN_IMG__';
function authShell(inner,foot){
  return `<div class="auth-bg">
   <div class="auth-art" aria-hidden="true"><img src="${LOGIN_ART}" alt=""></div>
   <div class="auth-side"><div class="auth-card">
    ${inner}
    <div class="row g6 mt16" style="justify-content:center">${ic('shield',12)}<span class="t-cap">اتصال رمزنگاری‌شده · ورود دو مرحله‌ای با پیامک</span></div>
    ${foot||''}
  </div></div></div>`;
}
function phoneStep(){
  return authShell(`
   <div class="auth-brand">${logo('lg')}
     <div><h1 class="t-h2">به Effect ERP خوش آمدید</h1>
       <p class="t-bs mt4" style="text-align:center">برای ورود، شماره موبایل خود را وارد کنید.</p></div></div>
   <div class="fld"><label class="lbl" for="ph">شماره موبایل</label>
     <div class="phone-inp ${AUTH.err?'err':''}">
       <span class="pre">${ic('phone',14)} ۹۸+</span>
       <input id="ph" inputmode="numeric" maxlength="11" placeholder="۰۹۱۲۱۲۳۴۵۶۷" value="${AUTH.phone}" oninput="authPhoneInput(this)" onkeydown="if(event.key==='Enter')authSend()">
     </div>
     ${AUTH.err?`<span class="ferr">${ic('alert',12)}${AUTH.err}</span>`:`<span class="hint">شماره‌ای که با آن در سیستم ثبت نام کرده‌اید</span>`}
   </div>
   <button class="btn btn-pr btn-lg btn-blk mt16" id="btn-ph" onclick="authSend()">
     <span class="grow">${AUTH.loading?'در حال بررسی…':'ادامه'}</span>${AUTH.loading?'<span class="spin"></span>':ic('arrowleft',16)}</button>`,
   `<button class="btn btn-ghost btn-blk mt12" onclick="authDemo()">ورود سریع نسخه دمو</button>
    <p class="t-cap tc mt12">نسخه ۲.۱ · Effect Studio — سیستم عامل کسب‌وکار</p>`);
}
function otpStep(){
  return authShell(`
   <div class="auth-brand">${logo('sm')}
     <div><h1 class="t-h2">کد تایید را وارد کنید</h1>
       <p class="t-bs mt4" style="text-align:center">کد تایید ۶ رقمی به شماره <b class="num" style="color:var(--t1)">${fa(AUTH.phone)}</b> ارسال شد.</p></div></div>
   <div class="otp-row" id="otp-row">${Array.from({length:6},(_,i)=>`<input class="otp-box" data-i="${i}" inputmode="numeric" maxlength="1" autocomplete="one-time-code" aria-label="رقم ${fa(i+1)}">`).join('')}</div>
   <div class="tc mt8" id="otp-msg">${AUTH.err?`<span class="ferr" style="justify-content:center">${ic('alert',12)}${AUTH.err}</span>`:''}</div>
   <button class="btn btn-pr btn-lg btn-blk mt12" onclick="authVerify()"><span class="grow">${AUTH.loading?'در حال بررسی…':'تایید و ورود'}</span>${AUTH.loading?'<span class="spin"></span>':ic('check',16)}</button>
   <div class="row mt12" style="justify-content:space-between">
     <button class="btn btn-ghost btn-sm" onclick="authEdit()">${ic('edit',13)} ویرایش شماره موبایل</button>
     <span class="t-cap num" id="cool" style="font-weight:600"></span>
   </div>`,
   `<p class="t-cap tc mt16">کد نمایشی این نسخه: <b style="color:var(--pr3)">۱۲۳۴۵۶</b></p>`);
}
function okStep(){
  return authShell(`<div class="auth-ok"><div class="ok-ring">${ic('check',34)}</div>
    <h2 class="t-h2">ورود موفق</h2><p class="t-bs">خوش آمدید رضا جان! در حال انتقال به داشبورد…</p>
    <div class="prog mt16" style="width:220px"><i style="width:100%;animation:fade 1s"></i></div></div>`);
}
function authPhoneInput(el){
  el.value=fa(el.value);AUTH.phone=el.value;AUTH.err='';
  const b=$('#btn-ph');if(b&&!AUTH.loading){b.querySelector('.grow').textContent='ادامه';}
}
function authSend(){
  const ph=enDigits(AUTH.phone);
  if(AUTH.loading)return;
  if(!/^09\d{9}$/.test(ph)){AUTH.err='شماره موبایل معتبر نیست. مثال: ۰۹۱۲۱۲۳۴۵۶۷';render();const i=$('#ph');if(i)i.focus();return;}
  AUTH.err='';AUTH.loading=true;render();
  setTimeout(()=>{AUTH.loading=false;AUTH.step='otp';AUTH.cool=90;render();startCool();authOtpBind();},900);
}
function startCool(){
  clearInterval(AUTH.coolTimer);
  AUTH.coolTimer=setInterval(()=>{
    if(AUTH.cool>0){AUTH.cool--;const el=$('#cool');if(el)el.textContent=AUTH.cool>0?`ارسال مجدد کد تا ${fa(AUTH.cool)} ثانیه`:'ارسال مجدد کد فعال شد';}
    else clearInterval(AUTH.coolTimer);
  },1000);
}
function authOtpBind(){
  const boxes=$$('.otp-box');if(!boxes.length)return;
  boxes[0].focus();
  boxes.forEach((b,i)=>{
    b.addEventListener('input',()=>{b.value=fa(enDigits(b.value).replace(/\D/g,'').slice(-1));b.classList.toggle('filled',!!b.value);
      if(b.value&&i<5)boxes[i+1].focus();
      if(boxes.every(x=>x.value))authVerify();});
    b.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!b.value&&i>0)boxes[i-1].focus();});
    b.addEventListener('paste',e=>{e.preventDefault();const d=enDigits((e.clipboardData||window.clipboardData).getData('text')).replace(/\D/g,'').slice(0,6);
      d.split('').forEach((c,j)=>{if(boxes[j]){boxes[j].value=fa(c);boxes[j].classList.add('filled');}});if(d.length===6)authVerify();else boxes[Math.min(d.length,5)].focus();});
  });
}
function authVerify(){
  if(AUTH.loading)return;
  const code=$$('.otp-box').map(b=>enDigits(b.value)).join('');
  if(AUTH.lock>0){AUTH.err=`تلاش‌های ناموفق زیاد بود. ${fa(AUTH.lock)} ثانیه دیگر تلاش کنید.`;render();authOtpBind();return;}
  if(code.length<6){AUTH.err='کد تایید ۶ رقمی را کامل وارد کنید.';render();authOtpBind();return;}
  AUTH.loading=true;AUTH.err='';render();authOtpBind();
  setTimeout(()=>{
    AUTH.loading=false;
    if(code==='123456'){AUTH.step='ok';AUTH.okAnim=true;render();
      setTimeout(()=>{S.authed=true;location.hash='#/dashboard';render();toast('ok','خوش آمدید رضا جان','پنجشنبه، ۵ شهریور ۱۴۰۵ — روز خوبی داشته باشید');},1100);}
    else{AUTH.tries++;$$('.otp-box').forEach(b=>{b.classList.add('err');setTimeout(()=>b.classList.remove('err'),420);});
      if(AUTH.tries>=3){AUTH.lock=60;AUTH.err='تعداد تلاش‌های ناموفق زیاد است. یک دقیقه صبر کنید یا شماره را ویرایش کنید.';
        const t=setInterval(()=>{AUTH.lock--;if(AUTH.lock<=0){clearInterval(t);AUTH.tries=0;}},1000);}
      else AUTH.err=`کد نادرست است. ${fa(3-AUTH.tries)} تلاش دیگر باقی مانده است.`;
      render();authOtpBind();}
  },1000);
}
function authEdit(){clearInterval(AUTH.coolTimer);AUTH.step='phone';AUTH.err='';render();}
function authDemo(){S.authed=true;location.hash='#/dashboard';render();toast('ok','ورود دمو انجام شد','با کاربر رضا قایمی (مدیرعامل) وارد شدید');}
