// ═══════════════════════════════════════════
// AUTHENTICATION & USERS SYSTEM
// ═══════════════════════════════════════════
const AUTH_KEY   = 'ALMUHHET_SESSION';
const USERS_KEY  = 'ALMUHHET_USERS';
const FB_USERS_DOC = 'almuheet/users';
const FB_ACTIVITY_COL = 'almuheet_activity';

// ── قراءة المستخدمين من localStorage أو defaults ──
function getUsers(){
  try{
    const s=localStorage.getItem(USERS_KEY);
    if(s)return JSON.parse(s);
  }catch(e){}
  return getDefaultUsers();
}
function getDefaultUsers(){
  return {
    admin:{password:'Admin@2025',role:'admin',name:'مدير النظام'},
    user1:{password:'User@2025', role:'user', name:'المستخدم'}
  };
}

// ── حفظ المستخدمين محلياً وسحابياً ──
function saveUsers(u){
  localStorage.setItem(USERS_KEY,JSON.stringify(u));
  // حفظ سحابي
  if(typeof fbDB!=='undefined'&&fbDB&&typeof fbReady!=='undefined'&&fbReady){
    fbDB.doc(FB_USERS_DOC).set({users:JSON.stringify(u),updated:Date.now()}).catch(e=>console.warn('Users save error:',e));
  }
}

// ── تحميل المستخدمين من Firebase ──
async function loadUsersFromCloud(){
  if(!fbReady||!fbDB)return;
  try{
    const snap=await fbDB.doc(FB_USERS_DOC).get();
    if(snap.exists){
      const users=JSON.parse(snap.data().users||'{}');
      if(Object.keys(users).length>0){
        localStorage.setItem(USERS_KEY,JSON.stringify(users));
      }
    }
  }catch(e){ console.warn('Users load error:',e); }
}

let currentUser=null;

function getSession(){
  try{const s=localStorage.getItem(AUTH_KEY);return s?JSON.parse(s):null;}catch(e){return null;}
}
function setSession(u){
  localStorage.setItem(AUTH_KEY,JSON.stringify(u));
  currentUser=u;
}
function clearSession(){
  localStorage.removeItem(AUTH_KEY);
  currentUser=null;
}
function doLogin(){
  const uname=(document.getElementById('loginUsername').value||'').trim();
  const pw=document.getElementById('loginPassword').value||'';
  const users=getUsers();
  const user=users[uname];
  if(!user||user.password!==pw){
    const err=document.getElementById('loginError');
    if(err){err.style.display='block';setTimeout(()=>{err.style.display='none';},3000);}
    return;
  }
  setSession({username:uname,role:user.role,name:user.name});
  showApp();
  init();
}
function loginKeyPress(e){if(e.key==='Enter')doLogin();}
function logout(){clearSession();location.reload();}
function isAdmin(){return currentUser&&currentUser.role==='admin';}
function canDeleteArchive(){return isAdmin();}

function showLogin(){
  const ls=document.getElementById('loginScreen');
  const ar=document.getElementById('appRoot');
  if(ls)ls.style.display='flex';
  if(ar)ar.style.display='none';
}
function showApp(){
  const ls=document.getElementById('loginScreen');
  const ar=document.getElementById('appRoot');
  if(ls)ls.style.display='none';
  if(ar)ar.style.display='flex';
  const un=document.getElementById('userNameDisplay');
  const ur=document.getElementById('userRoleDisplay');
  if(un&&currentUser)un.textContent=currentUser.name;
  if(ur&&currentUser)ur.textContent=currentUser.role==='admin'?'👑 مدير':'👤 مستخدم';
  const udn=document.getElementById('udName');
  const udr=document.getElementById('udRole');
  if(udn&&currentUser)udn.textContent=currentUser.name;
  if(udr&&currentUser)udr.textContent=currentUser.role==='admin'?'👑 مدير النظام':'👤 مستخدم';
  const sn=document.getElementById('settingsNavItem');
  if(sn)sn.style.display=isAdmin()?'flex':'none';
}
function initAuth(){
  const session=getSession();
  // Attach login event listeners (works when app.js is loaded as module)
  try{
    const lu=document.getElementById('loginUsername');
    const lp=document.getElementById('loginPassword');
    const lb=document.querySelector('.login-btn');
    if(lu) lu.addEventListener('keypress', loginKeyPress);
    if(lp) lp.addEventListener('keypress', loginKeyPress);
    if(lb) lb.addEventListener('click', doLogin);
  }catch(e){}
  if(session){
    currentUser=session;
    showApp();
    init();
  }else{
    showLogin();
  }
}
function toggleUserDropdown(){
  const d=document.getElementById('userDropdown');
  if(d)d.classList.toggle('show');
}
document.addEventListener('click',function(e){
  const wrap=document.getElementById('userDropdownWrap');
  if(wrap&&!wrap.contains(e.target)){
    const d=document.getElementById('userDropdown');
    if(d)d.classList.remove('show');
  }
});

// ═══════════════════════════════════════════
// PASSWORD CHANGE
// ═══════════════════════════════════════════
function showChangePwModal(username){
  const users=getUsers();
  const lbl=document.getElementById('changePwUserLabel');
  const uInp=document.getElementById('changePwUsername');
  if(lbl)lbl.textContent=users[username]?.name||username;
  if(uInp)uInp.value=username;
  const pn=document.getElementById('changePwNew');
  const pc=document.getElementById('changePwConfirm');
  if(pn)pn.value='';if(pc)pc.value='';
  openModal('changePwModal');
}
function showMyPwModal(){
  if(!currentUser)return;
  toggleUserDropdown();
  showChangePwModal(currentUser.username);
}
function doChangePassword(){
  const username=document.getElementById('changePwUsername')?.value;
  const newPw=document.getElementById('changePwNew')?.value||'';
  const confirm=document.getElementById('changePwConfirm')?.value||'';
  if(newPw.length<6){showToast('⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل','warning');return;}
  if(newPw!==confirm){showToast('⚠️ كلمات المرور غير متطابقة','warning');return;}
  const users=getUsers();
  if(!users[username]){showToast('⚠️ المستخدم غير موجود','warning');return;}
  users[username].password=newPw;
  saveUsers(users);
  closeModal('changePwModal');
  showToast(`✅ تم تغيير كلمة مرور ${users[username].name} بنجاح`,'success');
}

function showUserModal(username){
  const users=getUsers();
  const title=g('manageUserModalTitle');
  const oldInp=g('manageUserOldUsername');
  const userInp=g('manageUserUsername');
  const nameInp=g('manageUserName');
  const roleSel=g('manageUserRole');
  const pwInp=g('manageUserPassword');
  const pwConf=g('manageUserPasswordConfirm');
  const isEdit=!!username && !!users[username];
  if(isEdit){
    const usr=users[username];
    if(title)title.textContent='✏️ تعديل المستخدم';
    if(oldInp)oldInp.value=username;
    if(userInp)userInp.value=username;
    if(nameInp)nameInp.value=usr.name||'';
    if(roleSel)roleSel.value=usr.role||'user';
  }else{
    if(title)title.textContent='➕ إنشاء مستخدم جديد';
    if(oldInp)oldInp.value='';
    if(userInp)userInp.value='';
    if(nameInp)nameInp.value='';
    if(roleSel)roleSel.value='user';
  }
  if(pwInp)pwInp.value='';
  if(pwConf)pwConf.value='';
  openModal('manageUserModal');
}

function doSaveUser(){
  const oldUsername=g('manageUserOldUsername')?.value.trim();
  const username=g('manageUserUsername')?.value.trim();
  const name=g('manageUserName')?.value.trim();
  const role=g('manageUserRole')?.value||'user';
  const newPw=g('manageUserPassword')?.value||'';
  const confirm=g('manageUserPasswordConfirm')?.value||'';
  if(!username){showToast('⚠️ أدخل اسم المستخدم','warning');return;}
  if(!name){showToast('⚠️ أدخل اسم العرض','warning');return;}
  const users=getUsers();
  const editing=!!oldUsername;
  if(editing && !users[oldUsername]){showToast('⚠️ المستخدم غير موجود','warning');return;}
  if(oldUsername!==username && users[username]){showToast('⚠️ اسم المستخدم موجود بالفعل','warning');return;}
  if(newPw){
    if(newPw.length<6){showToast('⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل','warning');return;}
    if(newPw!==confirm){showToast('⚠️ كلمات المرور غير متطابقة','warning');return;}
  }
  let updated;
  if(editing){
    updated={...users[oldUsername],name,role};
    if(newPw)updated.password=newPw;
    if(oldUsername!==username){delete users[oldUsername];}
    users[username]=updated;
  }else{
    if(newPw.length<6){showToast('⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل','warning');return;}
    if(newPw!==confirm){showToast('⚠️ كلمات المرور غير متطابقة','warning');return;}
    users[username]={password:newPw,role,name};
  }
  saveUsers(users);
  if(currentUser && currentUser.username===oldUsername){
    currentUser.username=username;
    currentUser.name=name;
    currentUser.role=role;
    setSession(currentUser);
    const un=g('userNameDisplay');
    const ur=g('userRoleDisplay');
    if(un)un.textContent=currentUser.name;
    if(ur)ur.textContent=currentUser.role==='admin'?'👑 مدير':'👤 مستخدم';
  }
  closeModal('manageUserModal');
  renderSettings();
  showToast(editing ? '✅ تم تحديث المستخدم بنجاح' : '✅ تم إنشاء المستخدم بنجاح','success');
  logActivity(editing ? 'تعديل مستخدم' : 'إضافة مستخدم', `@${username} (${role})`);
}

// ═══════════════════════════════════════════
// ACTIVITY LOG SYSTEM – سجل النشاط
// ═══════════════════════════════════════════
async function logActivity(action, details){
  if(!fbReady||!fbDB||!currentUser)return;
  try{
    const entry={
      user: currentUser.username,
      userName: currentUser.name,
      role: currentUser.role,
      action,
      details,
      timestamp: Date.now(),
      date: new Date().toLocaleString('en-US',{timeZone:'Asia/Riyadh'})
    };
    await fbDB.collection(FB_ACTIVITY_COL).add(entry);
  }catch(e){ console.warn('Activity log error:',e); }
}

async function loadActivityLog(limit=100){
  if(!fbReady||!fbDB)return[];
  try{
    const snap=await fbDB.collection(FB_ACTIVITY_COL)
      .orderBy('timestamp','desc')
      .limit(limit)
      .get();
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){ console.warn('Activity load error:',e); return[]; }
}

async function clearActivityLog(){
  if(!fbReady||!fbDB)return;
  try{
    const snap=await fbDB.collection(FB_ACTIVITY_COL).get();
    const batch=fbDB.batch();
    snap.docs.forEach(d=>batch.delete(d.ref));
    await batch.commit();
  }catch(e){ console.warn('Clear activity error:',e); }
}

function actionIcon(action){
  if(action.includes('إضافة'))return'➕';
  if(action.includes('تعديل'))return'✏️';
  if(action.includes('حذف'))return'🗑️';
  if(action.includes('دخول'))return'🔐';
  if(action.includes('خروج'))return'🚪';
  if(action.includes('مستخدم'))return'👤';
  if(action.includes('كلمة مرور'))return'🔑';
  return'📋';
}
function actionColor(action){
  if(action.includes('إضافة'))return'#10b981';
  if(action.includes('تعديل'))return'#3b82f6';
  if(action.includes('حذف'))return'#ef4444';
  if(action.includes('دخول'))return'#8b5cf6';
  return'#6b7280';
}

async function renderActivityLog(){
  const container=document.getElementById('activityLogContainer');
  if(!container)return;
  container.innerHTML='<div style="padding:20px;text-align:center;color:var(--muted);">⏳ جاري التحميل...</div>';
  const logs=await loadActivityLog(200);
  if(!logs.length){
    container.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted);">📭 لا توجد سجلات نشاط بعد</div>';
    return;
  }
  const filterUser=document.getElementById('activityFilterUser')?.value||'';
  const filterAction=document.getElementById('activityFilterAction')?.value||'';
  const filtered=logs.filter(l=>{
    if(filterUser&&l.user!==filterUser)return false;
    if(filterAction&&!l.action.includes(filterAction))return false;
    return true;
  });
  // Count badge
  const badge=document.getElementById('activityCountBadge');
  if(badge)badge.textContent=filtered.length+' سجل';

  container.innerHTML=filtered.map(l=>`
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:var(--surface2);border-radius:12px;margin-bottom:8px;border-right:3px solid ${actionColor(l.action)};">
      <div style="font-size:1.3rem;margin-top:2px;">${actionIcon(l.action)}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-weight:700;font-size:.85rem;color:var(--navy);">${l.userName||l.user}</span>
          <span style="font-size:.7rem;background:${actionColor(l.action)}22;color:${actionColor(l.action)};padding:2px 8px;border-radius:20px;font-weight:600;">${l.action}</span>
          <span style="font-size:.7rem;color:var(--muted);margin-right:auto;">${l.date}</span>
        </div>
        <div style="font-size:.78rem;color:var(--text);margin-top:4px;opacity:.85;">${l.details||''}</div>
      </div>
    </div>`).join('');
}

// ── بناء قائمة المستخدمين لفلتر سجل النشاط ──
function buildActivityUserFilter(){
  const sel=document.getElementById('activityFilterUser');
  if(!sel)return;
  const users=getUsers();
  sel.innerHTML='<option value="">👥 كل المستخدمين</option>'+
    Object.entries(users).map(([u,d])=>`<option value="${u}">${d.name} (@${u})</option>`).join('');
}

// ═══════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════
function renderSettings(){
  if(!isAdmin()){showToast('⛔ ليس لديك صلاحية','danger');goPage('dashboard');return;}
  const users=getUsers();
  const usersHtml=Object.entries(users).map(([uname,udata])=>`
    <div class="settings-user-card">
      <div class="suc-info">
        <div class="suc-name">${udata.name}</div>
        <div class="suc-role">${udata.role==='admin'?'👑 مدير النظام':'👤 مستخدم'} — @${uname}</div>
      </div>
      <div class="suc-actions">
        <button class="btn btn-outline btn-sm" onclick="showUserModal('${uname}')">✏️ تعديل</button>
        <button class="btn btn-outline btn-sm" onclick="showChangePwModal('${uname}')">🔑 تغيير كلمة المرور</button>
      </div>
    </div>`).join('');
  const sc=document.getElementById('settingsUsersContainer');
  if(sc)sc.innerHTML=usersHtml;
  const fb=document.getElementById('settingsFbStatus');
  if(fb)fb.innerHTML=fbReady?'<span class="sir-val green">🟢 متصل بـ Firebase</span>':'<span class="sir-val red">🔴 غير متصل – تخزين محلي</span>';
  const isDark=document.body.classList.contains('dark-mode');
  const dt=document.getElementById('settingsDarkBtn');
  if(dt)dt.textContent=isDark?'☀️ تفعيل الوضع الفاتح':'🌙 تفعيل الوضع الداكن';
  const totalRows=sheetNames.reduce((a,n)=>a+(SD[n]?.rows?.length||0),0);
  const si=document.getElementById('settingsTotalRows');
  if(si)si.textContent=totalRows+' سجل';
  const su=document.getElementById('settingsUsersCount');
  if(su)su.textContent=Object.keys(users).length+' مستخدم';
  const sv=document.getElementById('settingsVersion');
  if(sv)sv.textContent='v2.0 – 2026';
  const scu=document.getElementById('settingsCurrentUser');
  if(scu&&currentUser)scu.textContent=currentUser.name+' (@'+currentUser.username+')';
  const su2=document.getElementById('settingsUsersCount2');
  if(su2)su2.textContent=Object.keys(users).length+' مستخدم';
}

function settingsToggleDark(){toggleDark();renderSettings();}

function settingsBackup(){
  const data={SD,users:getUsers(),exportDate:new Date().toISOString(),version:'2.0'};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`almuhhet_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  showToast('✅ تم تنزيل النسخة الاحتياطية','success');
}

function settingsRestore(){
  const inp=document.createElement('input');
  inp.type='file';inp.accept='.json';
  inp.onchange=async(e)=>{
    const file=e.target.files[0];if(!file)return;
    try{
      const text=await file.text();
      const data=JSON.parse(text);
      if(data.SD){
        Object.assign(SD,data.SD);
        if(data.users)saveUsers(data.users);
        await saveToStorage();
        showToast('✅ تم استعادة البيانات بنجاح','success');
        renderDash();renderSettings();
      }else{showToast('⚠️ ملف النسخة الاحتياطية غير صالح','warning');}
    }catch(err){showToast('⚠️ خطأ في قراءة الملف','warning');}
  };
  inp.click();
}

function settingsClearAllData(){
  if(!confirm('⚠️ هل أنت متأكد؟ سيتم حذف جميع البيانات نهائياً من السحابة والجهاز ولا يمكن التراجع!'))return;
  if(!confirm('تأكيد نهائي: حذف كل البيانات من Firebase وكل الأجهزة؟'))return;
  sheetNames.forEach(n=>{SD[n]={columns:SD[n]?.columns||[],rows:[]};});
  FILE_STORE={};
  // مسح السحابة
  saveToStorage();
  // مسح محلي شامل
  try{
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FILE_STORE_KEY);
  }catch(e){}
  renderDash();
  showToast('🗑️ تم مسح جميع البيانات من السحابة والجهاز','danger');
}

// Archive file delete (admin only)
function deleteArchiveFile(fileId,sub){
  if(!canDeleteArchive()){showToast('⛔ لا تملك صلاحية حذف ملفات الأرشيف','danger');return;}
  if(!confirm('حذف هذا الملف من الأرشيف نهائياً؟'))return;
  if(fileStore[fileId])delete fileStore[fileId];
  // Remove from row references
  sheetNames.forEach(sn=>{
    SD[sn]?.rows?.forEach(r=>{
      Object.keys(r).forEach(k=>{if(r[k]===fileId)r[k]='';});
    });
  });
  saveFileStore();
  saveToStorage();
  showToast('🗑️ تم حذف الملف','success');
  if(sub==='contracts')renderArchContracts();
  else if(sub==='receipts')renderArchReceipts();
  else if(sub==='payments')renderArchPayments();
}

// ═══════════════════════════════════════════
// DATA DEFINITIONS
// ═══════════════════════════════════════════
function instCols(n){let c=[];for(let i=1;i<=n;i++)c.push(`تاريخ قسط ${i}`,`مبلغ قسط ${i}`);return c;}
const INST=12;
const masterCols=[
  "م","اسم العميل","رقم الجوال","رقم العقار","اسم المهندس المشرف","البيان",
  "مبلغ المشروع","مبلغ الدفعة الاولى","تاريخ الدفعة الاولى",
  ...instCols(INST),
  "طريقة الدفع (إيرادات)","رقم سند الصرف (مصاريف)","مبلغ المصروف","طريقة الصرف (مصاريف)","تصنيف المصروف"
];
const revBaseCols=[
  "م","اسم العميل","رقم الجوال","رقم العقار","اسم المهندس المشرف","البيان",
  "مبلغ المشروع","مبلغ الدفعة الاولى","تاريخ الدفعة الاولى",
  ...instCols(3),"طريقة الدفع","حالة المشروع"
];
const supCols=[
  "م","اسم العميل","رقم الجوال","رقم العقار","اسم المهندس المشرف","البيان",
  "مبلغ المشروع","مبلغ الدفعة الاولى","تاريخ الدفعة الاولى",
  ...instCols(INST),"طريقة الدفع","حالة المشروع"
];
const expCols=["م","التاريخ","البيان","تصنيف المصروف","رقم سند الصرف","المبلغ","طريقة الصرف","المستفيد","رقم الجوال","الرقم الشخصي"];
const sheetNames=["ترحيل البيانات","الايرادات التصميم الداخلي","الايرادات اخرى بنك التنمية","الايرادات اخرى","الايرادات التصميم","الايرادات الاشراف","المصاريف"];
const revSheets=sheetNames.filter(n=>n!=="ترحيل البيانات"&&n!=="المصاريف");
const pageNames={dashboard:"لوحة التحكم",data:"إدارة البيانات",reports:"التقارير الشاملة",alerts:"التنبيهات",export:"تصدير البيانات",archive:"الأرشيف",settings:"⚙️ الإعدادات"};

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let SD={},activeSheet="ترحيل البيانات",recType="revenue";
let editSheet=null,editIdx=null;
let filters={};
let barInst=null,donutInst=null;
let sortState={col:null,dir:1}; // 1=asc, -1=desc
let expSortState={col:null,dir:1};
let FILE_STORE={}; // {fileId:{name,type,data,uploaded}}
let _tempRevFiles={contractFileId:'',receiptFileId:''};
let _tempExpFileId='';
const FILE_STORE_KEY='almuheet_files_v1';

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
const g=id=>document.getElementById(id);
const gv=id=>g(id)?.value||"";
function getSheetCols(n){if(n==="ترحيل البيانات")return masterCols;if(n==="الايرادات الاشراف")return supCols;if(n==="المصاريف")return expCols;return revBaseCols;}
function renumber(n){SD[n]?.rows.forEach((r,i)=>r["م"]=i+1);}
function fmt(n){return parseFloat(n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});}
function genInst(start,total,first){
  if(!start||!total||total<=0)return[];
  const rem=total-first;if(rem<=0)return[];
  const mo=rem/12,sd=new Date(start);
  return Array.from({length:12},(_,i)=>{let d=new Date(sd);d.setMonth(d.getMonth()+i+1);
    return{date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,amount:mo};});
}
function today(){return new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});}
function getRecordDate(r){
  if(!r||typeof r!=='object')return '';
  if(r["تاريخ الدفعة الاولى"])return r["تاريخ الدفعة الاولى"];
  if(r["تاريخ السند"])return r["تاريخ السند"];
  for(let i=1;i<=12;i++){if(r[`تاريخ قسط ${i}`])return r[`تاريخ قسط ${i}`];}
  return '';
}

// ═══════════════════════════════════════════
// FILE STORE HELPERS
// ═══════════════════════════════════════════
async function saveFileStore(){
  try{localStorage.setItem(FILE_STORE_KEY,JSON.stringify(FILE_STORE));}catch(e){console.warn('File store save failed:',e);}
  if(typeof fbDB!=='undefined'&&fbDB&&fbReady){
    try{await fbDB.doc(FB_FILES_DOC).set({files:JSON.stringify(FILE_STORE),updated:Date.now()});}catch(e){console.warn('FB file store save error:',e);}
  }
}
async function loadFileStore(){
  FILE_STORE={};
  try{const raw=localStorage.getItem(FILE_STORE_KEY);if(raw)FILE_STORE=JSON.parse(raw);}catch(e){FILE_STORE={};}
  if(typeof fbDB!=='undefined'&&fbDB&&fbReady){
    try{
      const snap = await fbDB.doc(FB_FILES_DOC).get();
      if(snap.exists){
        try{FILE_STORE=JSON.parse(snap.data().files||'{}');localStorage.setItem(FILE_STORE_KEY, JSON.stringify(FILE_STORE));}catch(e){}
      }
    }catch(e){console.warn('FB file store load error:',e);}
  }
}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
function getFileIcon(name){const ext=(name||'').split('.').pop().toLowerCase();if(ext==='pdf')return'📕';if(['doc','docx'].includes(ext))return'📘';if(['jpg','jpeg','png','gif'].includes(ext))return'🖼️';return'📎';}
function getFileTypeBadge(name){const ext=(name||'').split('.').pop().toUpperCase();return ext||'ملف';}

async function handleRevFileUpload(inputId,previewId){
  const input=g(inputId);const file=input.files[0];if(!file)return;
  try{
    const base64=await fileToBase64(file);
    const fileId=`f_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    FILE_STORE[fileId]={name:file.name,type:file.type,data:base64,uploaded:new Date().toISOString(),size:file.size};
    saveFileStore();
    if(inputId==='m_contract_file')_tempRevFiles.contractFileId=fileId;
    else if(inputId==='m_receipt_file')_tempRevFiles.receiptFileId=fileId;
    const prev=g(previewId);if(!prev)return;
    const icon=getFileIcon(file.name);
    const kb=(file.size/1024).toFixed(0);
    prev.innerHTML=`<div class="file-pill"><span>${icon}</span><span class="fp-name">${file.name}</span><span style="color:var(--muted);font-size:.68rem;">${kb} KB</span><span class="fp-rm" onclick="clearRevFile('${inputId}','${previewId}','${inputId==='m_contract_file'?'contract':'receipt'}')">✕</span></div>`;
  }catch(e){showToast('❌ فشل رفع الملف','error');}
}
function clearRevFile(inputId,previewId,type){
  const input=g(inputId);if(input){input.value='';}
  const prev=g(previewId);if(prev)prev.innerHTML='';
  if(type==='contract')_tempRevFiles.contractFileId='';
  else _tempRevFiles.receiptFileId='';
}

async function handleExpFileUpload(inputId,previewId){
  const input=g(inputId);const file=input.files[0];if(!file)return;
  try{
    const base64=await fileToBase64(file);
    const fileId=`f_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    FILE_STORE[fileId]={name:file.name,type:file.type,data:base64,uploaded:new Date().toISOString(),size:file.size};
    saveFileStore();
    _tempExpFileId=fileId;
    const prev=g(previewId);if(!prev)return;
    const icon=getFileIcon(file.name);
    const kb=(file.size/1024).toFixed(0);
    prev.innerHTML=`<div class="file-pill"><span>${icon}</span><span class="fp-name">${file.name}</span><span style="color:var(--muted);font-size:.68rem;">${kb} KB</span><span class="fp-rm" onclick="clearExpFile()">✕</span></div>`;
  }catch(e){showToast('❌ فشل رفع الملف','error');}
}
function clearExpFile(){
  const input=g('e_payment_file');if(input)input.value='';
  const prev=g('e_payment_preview');if(prev)prev.innerHTML='';
  _tempExpFileId='';
}

async function handleInstFileUpload(inputId,previewId,wrapEl){
  const input=g(inputId);const file=input?.files[0];if(!file)return;
  try{
    const base64=await fileToBase64(file);
    const fileId=`f_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    FILE_STORE[fileId]={name:file.name,type:file.type,data:base64,uploaded:new Date().toISOString(),size:file.size};
    saveFileStore();
    // Store fileId on the wrap element via data attribute
    if(wrapEl)wrapEl.dataset.instFileId=fileId;
    const prev=g(previewId);if(!prev)return;
    const icon=getFileIcon(file.name);
    const kb=(file.size/1024).toFixed(0);
    prev.innerHTML=`<div class="file-pill" style="margin-top:0;"><span>${icon}</span><span class="fp-name">${file.name}</span><span style="color:var(--muted);font-size:.68rem;">${kb} KB</span><span class="fp-rm" onclick="clearInstFile('${inputId}','${previewId}')">✕</span></div>`;
  }catch(e){showToast('❌ فشل رفع الملف','error');}
}
function clearInstFile(inputId,previewId){
  const input=g(inputId);
  if(input){
    input.value='';
    const wrap=input.closest('.inst-row-wrap');
    if(wrap)delete wrap.dataset.instFileId;
  }
  const prev=g(previewId);if(prev)prev.innerHTML='';
}

function viewFile(fileId){
  const f=FILE_STORE[fileId];if(!f)return showToast('❌ الملف غير موجود','error');
  const w=window.open('','_blank');
  if(f.type==='application/pdf'||f.name.endsWith('.pdf')){
    w.document.write(`<html><body style="margin:0"><embed src="${f.data}" type="application/pdf" width="100%" height="100%"></body></html>`);
  } else if(f.type.startsWith('image/')){
    w.document.write(`<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${f.data}" style="max-width:100%;max-height:100vh;object-fit:contain"></body></html>`);
  } else {
    // For DOCX/DOC, trigger download
    const a=w.document.createElement('a');a.href=f.data;a.download=f.name;w.document.body.appendChild(a);a.click();w.close();
  }
}
function downloadFile(fileId){
  const f=FILE_STORE[fileId];if(!f)return showToast('❌ الملف غير موجود','error');
  const a=document.createElement('a');a.href=f.data;a.download=f.name;a.click();
}

// ═══════════════════════════════════════════
// ARCHIVE
// ═══════════════════════════════════════════
let currentArchSub=null;
function toggleArchiveMenu(e){
  e.stopPropagation();
  const menu=g('archiveSubMenu'),arrow=g('archiveArrow');
  const isOpen=menu.style.display!=='none';
  menu.style.display=isOpen?'none':'block';
  arrow.style.transform=isOpen?'':'rotate(180deg)';
  goPage('archive');
}
function goArchiveSub(sub){
  currentArchSub=sub;
  ['landing','contracts','receipts','payments'].forEach(s=>{const el=g(`archsub-${s}`);if(el)el.style.display='none';});
  const el=g(`archsub-${sub}`);if(el)el.style.display='block';
  document.querySelectorAll('.nav-sub[data-archsub]').forEach(n=>n.classList.remove('active'));
  const nav=document.querySelector(`.nav-sub[data-archsub="${sub}"]`);if(nav)nav.classList.add('active');
  const titles={contracts:'📄 أرشيف العقود',receipts:'🧾 أرشيف سندات القبض',payments:'💸 أرشيف سندات الصرف'};
  const subs={contracts:'جميع العقود المرفوعة من الإيرادات',receipts:'جميع سندات القبض المرفوعة من الإيرادات',payments:'جميع سندات الصرف المرفوعة من المصاريف'};
  if(g('archPageTitle'))g('archPageTitle').textContent=titles[sub]||'🗂️ الأرشيف';
  if(g('archPageSub'))g('archPageSub').textContent=subs[sub]||'';
  renderArchiveSub(sub);
  goPage('archive');
}

function renderArchiveSub(sub){
  if(sub==='contracts')renderArchiveContracts();
  else if(sub==='receipts')renderArchiveReceipts();
  else if(sub==='payments')renderArchivePayments();
}

/* ── جمع ملفات الأرشيف حسب النوع ── */
function getArchiveFiles(sub){
  const files=[];
  if(sub==='contracts'){
    const allSrc=[...revSheets,"ترحيل البيانات"];
    allSrc.forEach(s=>SD[s]?.rows.forEach(r=>{
      if(r["ملف_العقد"]&&FILE_STORE[r["ملف_العقد"]]){
        files.push({fileId:r["ملف_العقد"],label:'عقد',client:r["اسم العميل"]||'',proj:r["رقم العقار"]||'',date:getRecordDate(r)||''});
      }
    }));
  } else if(sub==='receipts'){
    const allSrc=[...revSheets,"ترحيل البيانات"];
    allSrc.forEach(s=>SD[s]?.rows.forEach(r=>{
      if(r["ملف_سند_القبض"]&&FILE_STORE[r["ملف_سند_القبض"]])
        files.push({fileId:r["ملف_سند_القبض"],label:'سند قبض – الدفعة الأولى',client:r["اسم العميل"]||'',proj:r["رقم العقار"]||'',date:getRecordDate(r)||''});
      for(let i=1;i<=12;i++){
        const fKey=`ملف_قبض_قسط_${i}`;
        if(r[fKey]&&FILE_STORE[r[fKey]])
          files.push({fileId:r[fKey],label:`سند قبض – القسط ${i}`,client:r["اسم العميل"]||'',proj:r["رقم العقار"]||'',date:r[`تاريخ قسط ${i}`]||''});
      }
    }));
  } else if(sub==='payments'){
    SD["المصاريف"]?.rows.forEach(r=>{
      if(r["ملف_سند_الصرف"]&&FILE_STORE[r["ملف_سند_الصرف"]])
        files.push({fileId:r["ملف_سند_الصرف"],label:'سند صرف',client:r["البيان"]||'',proj:r["رقم سند الصرف"]||'',date:r["التاريخ"]||''});
    });
  }
  return files;
}

/* ── طباعة الأرشيف ── */
function printArchiveSub(sub){
  const files=getArchiveFiles(sub);
  const titles={contracts:'📄 أرشيف العقود',receipts:'🧾 أرشيف سندات القبض',payments:'💸 أرشيف سندات الصرف'};
  const w=window.open('','_blank');
  let rows=files.map((f,i)=>{
    const fi=FILE_STORE[f.fileId];
    const isImg=fi?.type?.startsWith('image/');
    const thumb=isImg?`<img src="${fi.data}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e2ecf5;">`:
      `<div style="width:80px;height:60px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:1.8rem;">${getFileIcon(fi?.name||'')}</div>`;
    return`<tr>
      <td style="text-align:center">${i+1}</td>
      <td>${thumb}</td>
      <td>${fi?.name||'—'}</td>
      <td>${f.label}</td>
      <td>${f.client}</td>
      <td>${f.proj}</td>
      <td>${f.date}</td>
    </tr>`;
  }).join('');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${titles[sub]||'الأرشيف'}</title>
  <style>body{font-family:Tahoma,Arial;font-size:11px;padding:18px;direction:rtl;}
  h1{color:#0d2137;font-size:16px;border-bottom:2px solid #0d2137;padding-bottom:6px;margin-bottom:14px;}
  table{width:100%;border-collapse:collapse;}
  th{background:#0d2137;color:#fff;padding:8px;text-align:right;font-size:10px;}
  td{padding:7px 8px;border-bottom:1px solid #e2ecf5;vertical-align:middle;}
  .footer{text-align:center;margin-top:20px;color:#94a3b8;font-size:10px;}
  @media print{body{padding:6px;}}</style></head><body>
  <h1>${titles[sub]||'الأرشيف'} – المحيط للاستشارات الهندسية</h1>
  <p style="color:#64748b;font-size:10px;margin-bottom:12px;">تاريخ الطباعة: ${new Date().toLocaleDateString('en-US')} | عدد الملفات: ${files.length}</p>
  ${files.length===0?'<p style="text-align:center;padding:30px;color:#94a3b8;">لا توجد ملفات في هذا الأرشيف</p>':`
  <table><thead><tr><th>#</th><th>معاينة</th><th>اسم الملف</th><th>النوع</th><th>العميل / البيان</th><th>رقم العقار</th><th>التاريخ</th></tr></thead>
  <tbody>${rows}</tbody></table>`}
  <div class="footer">© 2026 المحيط للاستشارات الهندسية – جميع الحقوق محفوظة</div>
  <script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

/* ── تحميل جميع ملفات الأرشيف ── */
async function downloadAllArchive(sub){
  const files=getArchiveFiles(sub);
  if(!files.length){showToast('⚠️ لا توجد ملفات لتحميلها','warning');return;}
  showToast(`⏳ جاري تحميل ${files.length} ملف...`,'info');
  for(let i=0;i<files.length;i++){
    const fi=FILE_STORE[files[i].fileId];
    if(!fi)continue;
    await new Promise(res=>{
      const a=document.createElement('a');
      a.href=fi.data;
      a.download=`${files[i].label}_${files[i].client}_${fi.name}`.replace(/[\\/:*?"<>|]/g,'_');
      a.click();
      setTimeout(res,300); // تأخير بسيط بين التحميلات
    });
  }
  showToast(`✅ تم تحميل ${files.length} ملف`,'success');
}

function makeArchCard(fileId,fname,label,client,proj,date,sheet){
  const f=FILE_STORE[fileId];if(!f)return'';
  const icon=getFileIcon(f.name);const kb=f.size?(f.size/1024).toFixed(0)+' KB':'';
  const dStr=new Date(f.uploaded).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
  return`<div class="arch-card">
    <div class="arch-card-hdr">
      <div class="arch-file-icon">${icon}</div>
      <div class="arch-card-info">
        <div class="arch-card-name" title="${f.name}">${f.name}</div>
        <div class="arch-card-sub">${label}</div>
      </div>
    </div>
    <div class="arch-card-meta">
      ${client?`<span class="arch-meta-tag">👤 ${client}</span>`:''}
      ${proj?`<span class="arch-meta-tag">📁 ${proj}</span>`:''}
      ${date?`<span class="arch-meta-tag">📅 ${date}</span>`:''}
      ${kb?`<span class="arch-meta-tag">📦 ${kb}</span>`:''}
    </div>
    <div class="arch-actions">
      <button class="arch-btn arch-btn-view" onclick="viewFile('${fileId}')">👁️ عرض</button>
      <button class="arch-btn arch-btn-dl" onclick="downloadFile('${fileId}')">⬇️ تحميل</button>
      ${canDeleteArchive()?`<button class="arch-btn arch-btn-del" onclick="deleteArchiveFile('${fileId}','${sub}')">🗑️ حذف</button>`:''}
    </div>
  </div>`;
}

function renderArchiveContracts(){
  const body=g('archContractBody');const count=g('archContractCount');if(!body)return;
  const cards=[];
  revSheets.forEach(s=>SD[s]?.rows.forEach(r=>{
    if(r["ملف_العقد"]){
      cards.push(makeArchCard(r["ملف_العقد"],'عقد',s,r["اسم العميل"]||'',r["رقم العقار"]||'',getRecordDate(r)||'',s));
    }
  }));
  // Also check ترحيل البيانات
  SD["ترحيل البيانات"]?.rows.forEach(r=>{
    if(r["ملف_العقد"]){
      cards.push(makeArchCard(r["ملف_العقد"],'عقد – ترحيل البيانات',r["اسم العميل"]||'',r["رقم العقار"]||'',getRecordDate(r)||'','ترحيل البيانات',''));
    }
  });
  if(count)count.textContent=`${cards.length} ملف`;
  body.innerHTML=cards.length===0?`<div class="arch-empty"><div class="ae-ico">📁</div><p>لا توجد عقود مرفوعة بعد<br><small style="font-size:.75rem;">ارفع ملفات العقود عند إضافة الإيرادات</small></p></div>`:`<div class="archive-grid">${cards.join('')}</div>`;
}

function renderArchiveReceipts(){
  const body=g('archReceiptBody');const count=g('archReceiptCount');if(!body)return;
  const cards=[];
  const allRevSources=[...revSheets,"ترحيل البيانات"];
  allRevSources.forEach(s=>SD[s]?.rows.forEach(r=>{
    // Main receipt file
    if(r["ملف_سند_القبض"]){
      cards.push(makeArchCard(r["ملف_سند_القبض"],'سند قبض – الدفعة الأولى',s,r["اسم العميل"]||'',r["رقم العقار"]||'',getRecordDate(r)||'',s));
    }
    // Installment receipt files
    for(let i=1;i<=12;i++){
      const fKey=`ملف_قبض_قسط_${i}`;
      if(r[fKey]){
        const instDate=r[`تاريخ قسط ${i}`]||'';
        cards.push(makeArchCard(r[fKey],`سند قبض – القسط ${i}`,s,r["اسم العميل"]||'',r["رقم العقار"]||'',instDate,s));
      }
    }
  }));
  if(count)count.textContent=`${cards.length} ملف`;
  body.innerHTML=cards.length===0?`<div class="arch-empty"><div class="ae-ico">📁</div><p>لا توجد سندات قبض مرفوعة بعد<br><small style="font-size:.75rem;">ارفع سندات القبض عند إضافة الإيرادات والأقساط</small></p></div>`:`<div class="archive-grid">${cards.join('')}</div>`;
}

function renderArchivePayments(){
  const body=g('archPaymentBody');const count=g('archPaymentCount');if(!body)return;
  const cards=[];
  SD["المصاريف"]?.rows.forEach(r=>{
    if(r["ملف_سند_الصرف"]){
      cards.push(makeArchCard(r["ملف_سند_الصرف"],'سند صرف','المصاريف',r["البيان"]||'',r["رقم سند الصرف"]||'',r["التاريخ"]||'','المصاريف'));
    }
  });
  if(count)count.textContent=`${cards.length} ملف`;
  body.innerHTML=cards.length===0?`<div class="arch-empty"><div class="ae-ico">📁</div><p>لا توجد سندات صرف مرفوعة بعد<br><small style="font-size:.75rem;">ارفع سندات الصرف عند إضافة المصاريف</small></p></div>`:`<div class="archive-grid">${cards.join('')}</div>`;
}

// ═══════════════════════════════════════════
// INITIAL DATA (empty – no sample records)
// ═══════════════════════════════════════════
function initData(){
  // تهيئة الأوراق بدون بيانات تجريبية – النظام يبدأ فارغاً
  SD["ترحيل البيانات"]={columns:masterCols,rows:[]};
  sheetNames.slice(1).forEach(n=>SD[n]={columns:getSheetCols(n),rows:[]});
  // لا توجد بيانات مسبقة – كل البيانات تُدخل من المستخدم وتُحفظ سحابياً في Firebase
}

// ═══════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════
function getDashFilters(){return{status:gv('dashStatusFilter'),client:gv('dashClientFilter')};}
function filterRevRow(r){const f=getDashFilters();if(f.status&&r["حالة المشروع"]&&r["حالة المشروع"]!==f.status)return false;if(f.client&&r["اسم العميل"]!==f.client)return false;return true;}
function totalRev(){return revSheets.reduce((a,s)=>a+SD[s]?.rows.filter(filterRevRow).reduce((b,r)=>b+parseFloat(r["مبلغ المشروع"]||0),0),0);}
function totalExp(){return SD["المصاريف"]?.rows.reduce((a,r)=>a+parseFloat(r["المبلغ"]||0),0)||0;}
function topClients(n=5){
  const f=getDashFilters();
  const m={};
  revSheets.forEach(s=>SD[s]?.rows.filter(filterRevRow).forEach(r=>{const c=r["اسم العميل"]||"غير محدد";if(c)m[c]=(m[c]||0)+parseFloat(r["مبلغ المشروع"]||0);}));
  return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n);
}
function updateClientDropdown(){
  const sel=g('dashClientFilter');if(!sel)return;
  const clients=new Set();
  revSheets.forEach(s=>SD[s]?.rows.forEach(r=>{if(r["اسم العميل"])clients.add(r["اسم العميل"]);}));
  const prev=sel.value;
  sel.innerHTML='<option value="">👥 كل العملاء</option>'+[...clients].sort().map(c=>`<option value="${c}">${c}</option>`).join('');
  if(prev)sel.value=prev;
}
function getOverdue(){
  const t=new Date();t.setHours(0,0,0,0);const res=[];
  [...revSheets,"ترحيل البيانات"].forEach(s=>SD[s]?.rows.forEach(r=>{
    for(let i=1;i<=12;i++){const ds=r[`تاريخ قسط ${i}`],am=r[`مبلغ قسط ${i}`];
      if(ds&&am&&parseFloat(am)>0&&new Date(ds)<t)res.push({client:r["اسم العميل"]||"غير محدد",proj:r["رقم العقار"]||"",n:i,date:ds,amt:parseFloat(am),sheet:s});}
  }));
  return res;
}
function getUpcoming(){
  const t=new Date();t.setHours(0,0,0,0);const nm=new Date(t);nm.setMonth(nm.getMonth()+1);const res=[];
  [...revSheets,"ترحيل البيانات"].forEach(s=>SD[s]?.rows.forEach(r=>{
    for(let i=1;i<=12;i++){const ds=r[`تاريخ قسط ${i}`],am=r[`مبلغ قسط ${i}`];
      if(ds&&am&&parseFloat(am)>0){const d=new Date(ds);if(d>=t&&d<=nm)res.push({client:r["اسم العميل"]||"غير محدد",proj:r["رقم العقار"]||"",n:i,date:ds,amt:parseFloat(am),sheet:s});}}
  }));
  return res.sort((a,b)=>new Date(a.date)-new Date(b.date));
}
function monthlyData(){
  const today=new Date(),mons=[];
  for(let i=5;i>=0;i--){const d=new Date(today);d.setMonth(d.getMonth()-i);
    mons.push({y:d.getFullYear(),m:d.getMonth()+1,lbl:d.toLocaleDateString('en-US',{month:'short',year:'2-digit'})});}
  const rv={},ex={};
  mons.forEach(m=>{const k=`${m.y}-${m.m}`;rv[k]=0;ex[k]=0;});
  revSheets.forEach(s=>SD[s]?.rows.forEach(r=>{const ds=getRecordDate(r);if(ds){const d=new Date(ds),k=`${d.getFullYear()}-${d.getMonth()+1}`;if(rv[k]!==undefined)rv[k]+=parseFloat(r["مبلغ المشروع"]||0);}}));
  SD["المصاريف"]?.rows.forEach(r=>{const ds=r["التاريخ"];if(ds){const d=new Date(ds),k=`${d.getFullYear()}-${d.getMonth()+1}`;if(ex[k]!==undefined)ex[k]+=parseFloat(r["المبلغ"]||0);}});
  return{labels:mons.map(m=>m.lbl),rev:mons.map(m=>rv[`${m.y}-${m.m}`]||0),exp:mons.map(m=>ex[`${m.y}-${m.m}`]||0)};
}
function revByCategory(){
  const map={"التصميم الداخلي":"الايرادات التصميم الداخلي","بنك التنمية":"الايرادات اخرى بنك التنمية","أخرى":"الايرادات اخرى","التصميم الجرافيك":"الايرادات التصميم","الإشراف":"الايرادات الاشراف"};
  const res={};
  Object.entries(map).forEach(([label,sh])=>{const t=SD[sh]?.rows.reduce((a,r)=>a+parseFloat(r["مبلغ المشروع"]||0),0)||0;if(t>0)res[label]=t;});
  return res;
}
function monthlyRevReport(){
  const m={};
  revSheets.forEach(s=>SD[s]?.rows.forEach(r=>{const ds=getRecordDate(r);if(ds){const d=new Date(ds),k=`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}`;m[k]=(m[k]||0)+parseFloat(r["مبلغ المشروع"]||0);}}));
  return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));
}
function expByCat(){
  const m={};
  SD["المصاريف"]?.rows.forEach(r=>{const c=r["تصنيف المصروف"]||"أخرى";m[c]=(m[c]||0)+parseFloat(r["المبلغ"]||0);});
  return m;
}

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
let currentDataSub=null;
function toggleDataMenu(e){
  e.stopPropagation();
  const menu=g('dataSubMenu'),arrow=g('dataArrow');
  const isOpen=menu.style.display!=='none';
  menu.style.display=isOpen?'none':'block';
  arrow.style.transform=isOpen?'':'rotate(180deg)';
  // Also navigate to data page
  goPage('data');
}
function goDataSub(sub){
  currentDataSub=sub;
  // hide all sub-pages
  ['revenues','expenses','landing'].forEach(s=>{
    const el=g(`subpage-${s}`);if(el)el.style.display='none';
  });
  const el=g(`subpage-${sub}`);if(el)el.style.display='block';
  // update sub-nav active state
  document.querySelectorAll('.nav-sub').forEach(n=>n.classList.remove('active'));
  const nav=document.querySelector(`.nav-sub[data-subpage="${sub}"]`);
  if(nav)nav.classList.add('active');
  // update page title
  const titles={revenues:'💰 قائمة الإيرادات',expenses:'💸 قائمة المصاريف'};
  const subs={revenues:'عرض وإضافة وترحيل جميع الإيرادات',expenses:'عرض وإضافة جميع مصاريف المكتب'};
  if(g('dataPageTitle'))g('dataPageTitle').textContent=titles[sub]||'📋 إدارة البيانات';
  if(g('dataPageSub'))g('dataPageSub').textContent=subs[sub]||'';
  if(sub==='revenues'){filters={};buildTabs();renderTable();}
  if(sub==='expenses')renderExpTable();
  goPage('data');
}
function goPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const pg=g(`page-${id}`);
  if(pg){pg.classList.add('active');pg.style.display='block';}
  // hide all pages except active
  document.querySelectorAll('.page:not(.active)').forEach(p=>p.style.display='none');
  document.querySelector(`.nav-item[data-page="${id}"]`)?.classList.add('active');
  g('topTitle').textContent=pageNames[id]||'';
  if(id==='dashboard')renderDash();
  else if(id==='data'){
    if(!currentDataSub){
      ['revenues','expenses'].forEach(s=>{const el=g(`subpage-${s}`);if(el)el.style.display='none';});
      if(g('subpage-landing'))g('subpage-landing').style.display='block';
    }
  }
  else if(id==='reports')renderReports();
  else if(id==='alerts')renderAlerts();
  else if(id==='export')renderExport();
  else if(id==='settings')renderSettings();
  else if(id==='archive'){
    if(!currentArchSub){
      ['contracts','receipts','payments'].forEach(s=>{const el=g(`archsub-${s}`);if(el)el.style.display='none';});
      if(g('archsub-landing'))g('archsub-landing').style.display='block';
    } else {
      renderArchiveSub(currentArchSub);
    }
  }
}
document.querySelectorAll('.nav-item[data-page]').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.page&&el.dataset.page!=='data'&&el.dataset.page!=='archive')goPage(el.dataset.page);}));

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
function renderDash(){
  updateClientDropdown();
  const rev=totalRev(),exp=totalExp(),prf=rev-exp,rat=rev>0?((prf/rev)*100).toFixed(1):0;
  const ratEn=String(rat).replace(/[\u0660-\u0669]/g,d=>String.fromCharCode(d.charCodeAt(0)-0x0660+48));
  g('kpiGrid').innerHTML=`
    <div class="kpi rev"><div class="kpi-ico">💰</div><div class="kpi-lbl">إجمالي الإيرادات</div><div class="kpi-val">${fmt(rev)} ر.ق</div><div class="kpi-sub">${revSheets.reduce((a,s)=>a+(SD[s]?.rows.length||0),0)} مشروع</div></div>
    <div class="kpi exp"><div class="kpi-ico">💸</div><div class="kpi-lbl">إجمالي المصروفات</div><div class="kpi-val">${fmt(exp)} ر.ق</div><div class="kpi-sub">${SD["المصاريف"]?.rows.length||0} بند صرف</div></div>
    <div class="kpi prf"><div class="kpi-ico">${prf>=0?'📈':'📉'}</div><div class="kpi-lbl">صافي الربح</div><div class="kpi-val" style="color:${prf>=0?'var(--green)':'var(--red)'}">${fmt(Math.abs(prf))} ر.ق</div><div class="kpi-sub">${prf>=0?'✅ ربح':'⚠️ خسارة'}</div></div>
    <div class="kpi rat"><div class="kpi-ico">📊</div><div class="kpi-lbl">نسبة الربح</div><div class="kpi-val" style="color:${parseFloat(rat)>=0?'var(--gold)':'var(--red)'}">${ratEn}%</div><div class="kpi-sub">من إجمالي الإيرادات</div></div>
  `;
  renderBarChart();renderDonutChart();
  const tc=topClients();
  const rc=['gold','silver','bronze','',''];
  g('topClients').innerHTML=tc.length===0?`<div class="empty"><div class="ei">👥</div><p>لا توجد بيانات عملاء بعد</p></div>`:
    tc.map(([n,a],i)=>`<div class="client-row">
      <div class="client-rank ${rc[i]||''}">${i+1}</div>
      <div class="client-info"><div class="client-name">${n}</div><div class="prog"><div class="prog-fill" style="width:${((a/tc[0][1])*100).toFixed(0)}%"></div></div></div>
      <div class="client-amt">${fmt(a)} ر.ق</div>
    </div>`).join('');
  const ov=getOverdue().slice(0,3),up=getUpcoming().slice(0,3);
  g('dashAlerts').innerHTML=[
    ...ov.map(o=>`<div class="alert-item danger"><div class="alert-icon">🚨</div><div class="alert-body"><div class="alert-title">دفعة متأخرة – ${o.client}</div><div class="alert-desc">القسط ${o.n} | ${o.date}</div></div><div class="alert-amt">${fmt(o.amt)} ر.ق</div></div>`),
    ...up.map(u=>`<div class="alert-item warning"><div class="alert-icon">⏰</div><div class="alert-body"><div class="alert-title">قسط قادم – ${u.client}</div><div class="alert-desc">القسط ${u.n} | ${u.date}</div></div><div class="alert-amt">${fmt(u.amt)} ر.ق</div></div>`)
  ].join('')||`<div class="empty"><div class="ei">✅</div><p>لا توجد تنبيهات الآن</p></div>`;
}

function renderBarChart(){
  const {labels,rev,exp}=monthlyData(),ctx=g('barChart');
  if(!ctx)return;if(barInst){barInst.destroy();barInst=null;}
  barInst=new Chart(ctx,{type:'bar',data:{labels,datasets:[
    {label:'الإيرادات',data:rev,backgroundColor:'rgba(16,185,129,.85)',borderRadius:8,borderSkipped:false},
    {label:'المصروفات',data:exp,backgroundColor:'rgba(239,68,68,.85)',borderRadius:8,borderSkipped:false}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{family:'Cairo',size:11},padding:14}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,.05)'},ticks:{callback:v=>fmt(v)}},x:{grid:{display:false}}}}});
}
function renderDonutChart(){
  const data=revByCategory(),ctx=g('donutChart');
  if(!ctx)return;if(donutInst){donutInst.destroy();donutInst=null;}
  const labels=Object.keys(data),vals=Object.values(data);
  const colors=['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444'];
  donutInst=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data:vals,backgroundColor:colors,borderWidth:3,borderColor:'#fff',hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{font:{family:'Cairo',size:10},padding:12}},tooltip:{callbacks:{label:c=>` ${c.label}: ${fmt(c.parsed)} ر.ق`}}}}});
}

// ═══════════════════════════════════════════
// DATA PAGE
// ═══════════════════════════════════════════
const revOnlySheets=["ترحيل البيانات","الايرادات التصميم الداخلي","الايرادات اخرى بنك التنمية","الايرادات اخرى","الايرادات التصميم","الايرادات الاشراف"];
function renderDataPage(){buildTabs();renderTable();}
function buildTabs(){
  const tabs=revOnlySheets;
  g('sheetTabs').innerHTML=tabs.map(n=>`<button class="sheet-tab ${activeSheet===n?'active':''}" onclick="setSheet('${n}')">${n}</button>`).join('');
  const isM=activeSheet==="ترحيل البيانات";
  const tgt=sheetNames.filter(n=>n!=="ترحيل البيانات").map(n=>`<option value="${n}">${n}</option>`).join('');
  g('tblActions').innerHTML=`
    ${isM?`<button class="btn btn-green btn-sm" onclick="openAddModal()">➕ إضافة إيراد</button>
    <select id="migrTarget" style="padding:7px 11px;border:1.5px solid var(--border);border-radius:40px;font-family:'Cairo',sans-serif;font-size:.76rem;">${tgt}</select>
    <button class="btn btn-navy btn-sm" onclick="bulkMigrate()">🚀 ترحيل</button>`:''}
    <button class="btn btn-outline btn-sm" onclick="exportSheetExcel('${activeSheet}')">📊 Excel</button>
  `;
}
function setSheet(n){activeSheet=n;filters={};clearFilterInputs();buildTabs();renderTable();}

// EXPENSE TABLE
let expFilters={};
function renderExpTable(){
  const sh=SD["المصاريف"];if(!sh)return;
  let rows=[...sh.rows];
  const s=(expFilters.search||'').toLowerCase();
  const df=expFilters.dateFrom,dt=expFilters.dateTo;
  if(s)rows=rows.filter(r=>Object.values(r).join(' ').toLowerCase().includes(s));
  if(df)rows=rows.filter(r=>(r["التاريخ"]||'')>=df);
  if(dt)rows=rows.filter(r=>(r["التاريخ"]||'')<=dt);
  if(g('expRowCountBdg'))g('expRowCountBdg').textContent=`${rows.length} سجل`;
  const expCols=["م","التاريخ","البيان","تصنيف المصروف","رقم سند الصرف","المبلغ","طريقة الصرف","المستفيد","رقم الجوال","الرقم الشخصي"];
  if(expSortState.col){rows.sort((a,b)=>{const av=a[expSortState.col]||'',bv=b[expSortState.col]||'';const an=parseFloat(av),bn=parseFloat(bv);if(!isNaN(an)&&!isNaN(bn))return(an-bn)*expSortState.dir;return String(av).localeCompare(String(bv),'ar')*expSortState.dir;});}
  let html=`<table class="data-table"><thead><tr><th>إجراءات</th>${expCols.map(c=>{const isSorted=expSortState.col===c;const cls=isSorted?(expSortState.dir===1?'sortable sort-asc':'sortable sort-desc'):'sortable';return`<th class="${cls}" onclick="sortExpTable('${c}')">${c}</th>`;}).join('')}</tr></thead><tbody>`;
  if(!rows.length){html+=`<tr><td colspan="${expCols.length+1}"><div class="empty"><div class="ei">📭</div><p>لا توجد مصاريف بعد</p></div></td></tr>`;}
  else rows.forEach(row=>{
    const oi=sh.rows.indexOf(row);
    html+=`<tr>
      <td>
        <button onclick="openEditExp(${oi})" style="background:#f59e0b;color:#fff;border:none;padding:4px 9px;border-radius:8px;cursor:pointer;font-size:.7rem;margin-left:2px;">✏️</button>
        <button onclick="delExpRow(${oi})" style="background:var(--red);color:#fff;border:none;padding:4px 9px;border-radius:8px;cursor:pointer;font-size:.7rem;">🗑️</button>
      </td>
      ${expCols.map(c=>{let v=row[c]!==undefined&&row[c]!==null?row[c]:'—';if(typeof v==='number')v=v.toLocaleString('en-US');return`<td>${v}</td>`;}).join('')}
    </tr>`;
  });
  html+='</tbody></table>';
  if(g('expTblBody'))g('expTblBody').innerHTML=html;
}
function applyExpFilter(){expFilters={search:gv('expSearch'),dateFrom:gv('expDateFrom'),dateTo:gv('expDateTo')};renderExpTable();}
function clearExpFilter(){expFilters={};['expSearch','expDateFrom','expDateTo'].forEach(id=>{if(g(id))g(id).value='';});renderExpTable();}
function delExpRow(i){if(!confirm('حذف هذا المصروف نهائياً؟'))return;SD["المصاريف"].rows.splice(i,1);renumber("المصاريف");renderExpTable();saveToStorage();}
function openEditExp(idx){
  // Re-use generic edit modal for expense rows
  editSheet="المصاريف";editIdx=idx;
  const sh=SD["المصاريف"],row=sh.rows[idx];if(!row)return;
  const cont=g('editFormCont');
  const expCols=["التاريخ","البيان","تصنيف المصروف","رقم سند الصرف","المبلغ","طريقة الصرف","المستفيد","رقم الجوال","الرقم الشخصي"];
  cont.innerHTML=expCols.map(c=>`
    <div class="form-group">
      <label>${c}</label>
      <input type="${c.includes('تاريخ')?'date':'text'}" id="ef_${c.replace(/\s/g,'_')}" value="${row[c]||''}">
    </div>`).join('');
  openModal('editModal');
}

function filteredRows(){
  const sh=SD[activeSheet];if(!sh)return[];
  let rows=[...sh.rows];
  const s=(filters.search||'').toLowerCase();
  const df=filters.dateFrom,dt=filters.dateTo;
  const amn=parseFloat(filters.amtMin)||0,amx=parseFloat(filters.amtMax)||Infinity;
  rows=rows.filter(r=>{
    if(s&&!Object.values(r).join(' ').toLowerCase().includes(s))return false;
    const dv=r["تاريخ السند"]||r["التاريخ"]||'';
    if(df&&dv&&dv<df)return false;
    if(dt&&dv&&dv>dt)return false;
    const av=parseFloat(r["مبلغ المشروع"]||r["المبلغ"]||0);
    if(av<amn||av>amx)return false;
    return true;
  });
  if(sortState.col){
    rows.sort((a,b)=>{
      const av=a[sortState.col]||'',bv=b[sortState.col]||'';
      const an=parseFloat(av),bn=parseFloat(bv);
      if(!isNaN(an)&&!isNaN(bn))return (an-bn)*sortState.dir;
      return String(av).localeCompare(String(bv),'ar')*sortState.dir;
    });
  }
  return rows;
}
function sortRevTable(col){
  if(sortState.col===col)sortState.dir*=-1;else{sortState.col=col;sortState.dir=1;}
  renderTable();
}

function renderTable(){
  const sh=SD[activeSheet];if(!sh)return;
  const allCols=sh.columns,rows=filteredRows();
  g('activeLbl').textContent=activeSheet;
  g('rowCountBdg').textContent=`${rows.length} سجل`;
  const isM=activeSheet==="ترحيل البيانات";
  const isSup=activeSheet==="الايرادات الاشراف";
  const hasInstCols=isSup||isM;

  // Expense-only columns in the migration sheet
  const expOnlyCols=new Set(["طريقة الدفع (إيرادات)","رقم سند الصرف (مصاريف)","مبلغ المصروف","طريقة الصرف (مصاريف)","تصنيف المصروف"]);
  // Check if ANY row in migration has expense data (to decide whether to show those columns at all)
  const anyExpRow=isM&&rows.some(r=>r["مبلغ المصروف"]||r["تصنيف المصروف"]);

  // Build visible column set: hide installments + hide expense cols if no expense rows
  const instColSet=new Set();
  if(hasInstCols){for(let i=1;i<=12;i++){instColSet.add(`تاريخ قسط ${i}`);instColSet.add(`مبلغ قسط ${i}`);}}
  const cols=allCols.filter(c=>{
    if(instColSet.has(c))return false;
    if(isM&&expOnlyCols.has(c)&&!anyExpRow)return false;
    return true;
  });

  let html=`<table class="data-table"><thead><tr>
    <th style="width:80px">إجراءات</th>
    ${isM?'<th style="width:36px"><input type="checkbox" id="selAll" onchange="selectAll(this)"></th>':''}
    ${cols.map(c=>{
      const isSorted=sortState.col===c;
      const cls=isSorted?(sortState.dir===1?'sortable sort-asc':'sortable sort-desc'):'sortable';
      return`<th class="${cls}" onclick="sortRevTable('${c}')">${c}</th>`;
    }).join('')}
    ${hasInstCols?'<th>الأقساط الـ12</th>':''}
  </tr></thead><tbody>`;
  if(!rows.length){html+=`<tr><td colspan="${cols.length+(hasInstCols?3:2)}"><div class="empty"><div class="ei">📭</div><p>لا توجد سجلات مطابقة</p></div></td></tr>`;}
  else rows.forEach(row=>{
    const oi=sh.rows.indexOf(row);
    const isExpRow=isM&&(row["مبلغ المصروف"]||row["تصنيف المصروف"]);
    // Count filled installments for badge
    let filledInst=0,totalInst=0;
    if(hasInstCols){for(let i=1;i<=12;i++){if(row[`مبلغ قسط ${i}`]&&parseFloat(row[`مبلغ قسط ${i}`])>0){filledInst++;totalInst+=parseFloat(row[`مبلغ قسط ${i}`]);}}}
    html+=`<tr${isExpRow?' style="background:#fff5f5;"':''}>
      <td>
        <button onclick="openEdit('${activeSheet}',${oi})" style="background:#f59e0b;color:#fff;border:none;padding:4px 9px;border-radius:8px;cursor:pointer;font-size:.7rem;margin-left:2px;">✏️</button>
        <button onclick="delRow('${activeSheet}',${oi})" style="background:var(--red);color:#fff;border:none;padding:4px 9px;border-radius:8px;cursor:pointer;font-size:.7rem;">🗑️</button>
      </td>
      ${isM?`<td><input type="checkbox" class="rCb" data-i="${oi}"></td>`:''}
      ${cols.map(c=>{
        let v=row[c]!==undefined&&row[c]!==null?row[c]:'';
        if(typeof v==='number')v=v.toLocaleString('en-US');
        if(isM&&expOnlyCols.has(c)&&!isExpRow)v='—';
        if(c==='حالة المشروع'){
          const cls=v==='نشط'?'bdg-active':v==='مكتمل'?'bdg-done':v==='موقوف'?'bdg-paused':'bdg-gray';
          v=v?`<span class="badge ${cls}">${v}</span>`:'—';
        }
        if(c==='اسم العميل'&&v&&v!=='—')v=`<span style="cursor:pointer;color:var(--blue);text-decoration:underline dotted;" onclick="showClientStatementFor('${String(v).replace(/'/g,"\\'")}',event)">${v}</span>`;
        return`<td>${v}</td>`;
      }).join('')}
      ${hasInstCols?`<td>${filledInst>0?`<span class="inst-badge" onclick="showInstModal('${activeSheet}',${oi})">📅 ${filledInst} قسط · ${fmt(totalInst)} ر.ق</span>`:'<span style="color:var(--muted);font-size:.72rem;">—</span>'}</td>`:''}
    </tr>`;
  });
  html+='</tbody></table>';
  g('tblBody').innerHTML=html;
}

function showInstModal(sheetName,rowIdx){
  const row=SD[sheetName]?.rows[rowIdx];if(!row)return;
  const client=row["اسم العميل"]||"";
  const proj=row["رقم العقار"]||"";
  g('instModalTitle').textContent=`📅 أقساط ${client} – ${proj}`;
  let filled=0,total=0,paid=0;
  const today=new Date();today.setHours(0,0,0,0);
  let gridHtml='';
  for(let i=1;i<=12;i++){
    const d=row[`تاريخ قسط ${i}`]||'';
    const a=parseFloat(row[`مبلغ قسط ${i}`]||0);
    const hasData=d||a>0;
    if(hasData){filled++;total+=a;if(d&&new Date(d)<today)paid++;}
    const isEmpty=!hasData;
    gridHtml+=`<div class="inst-cell${isEmpty?' empty':''}">
      <div class="ic-num">القسط ${i}</div>
      <div class="ic-date">${d||'—'}</div>
      <div class="ic-amt">${a>0?fmt(a)+' ر.ق':'—'}</div>
    </div>`;
  }
  const projAmt=parseFloat(row["مبلغ المشروع"]||0);
  const firstAmt=parseFloat(row["مبلغ الدفعة الاولى"]||0);
  g('instSummary').innerHTML=`
    <div class="inst-sum-item"><div class="isv">${filled}</div><div class="isl">أقساط محددة</div></div>
    <div class="inst-sum-item"><div class="isv">${fmt(total)} ر.ق</div><div class="isl">إجمالي الأقساط</div></div>
    <div class="inst-sum-item" style="background:var(--green)"><div class="isv">${fmt(firstAmt+total)} ر.ق</div><div class="isl">إجمالي المشروع</div></div>
  `;
  g('instGrid').innerHTML=gridHtml;
  g('instModal').classList.add('open');
}
function closeInstModal(){g('instModal').classList.remove('open');}
document.addEventListener('click',e=>{const m=g('instModal');if(m&&e.target===m)closeInstModal();});

function delRow(sn,i){if(!confirm('حذف هذا السجل نهائياً؟'))return;SD[sn].rows.splice(i,1);renumber(sn);renderTable();updateBadges();saveToStorage();}
function applyFilter(){filters={search:gv('tblSearch'),dateFrom:gv('fDateFrom'),dateTo:gv('fDateTo'),amtMin:gv('fAmtMin'),amtMax:gv('fAmtMax')};renderTable();}
function clearFilter(){filters={};clearFilterInputs();renderTable();}
function clearFilterInputs(){['tblSearch','fDateFrom','fDateTo','fAmtMin','fAmtMax'].forEach(id=>{if(g(id))g(id).value='';});}
function selectAll(el){document.querySelectorAll('.rCb').forEach(c=>c.checked=el.checked);}
function bulkMigrate(){
  const sel=Array.from(document.querySelectorAll('.rCb:checked')).map(c=>parseInt(c.dataset.i));
  if(!sel.length){alert('اختر سجلاً على الأقل للترحيل');return;}
  const tgt=gv('migrTarget');if(!tgt)return;
  migrate(sel,tgt);renderTable();updateBadges();saveToStorage();
  alert(`✅ تم ترحيل ${sel.length} سجل إلى: ${tgt}`);
}

// ═══════════════════════════════════════════
// MIGRATION
// ═══════════════════════════════════════════
function migrate(idxs,tgt){
  const ms=SD["ترحيل البيانات"],ts=SD[tgt];if(!ms||!ts)return;
  idxs.map(i=>ms.rows[i]).filter(Boolean).forEach(sr=>{
    const nr={};
    ts.columns.forEach(c=>{
      let v="";
      if(c==="م")v="";
      else if(tgt==="المصاريف"){
        if(c==="التاريخ")v=getRecordDate(sr)||"";
        else if(c==="البيان")v=sr["البيان"]||"";
        else if(c==="رقم سند الصرف")v=sr["رقم سند الصرف (مصاريف)"]||"";
        else if(c==="المبلغ")v=sr["مبلغ المصروف"]||"";
        else if(c==="طريقة الصرف")v=sr["طريقة الصرف (مصاريف)"]||"";
        else if(c==="تصنيف المصروف")v=sr["تصنيف المصروف"]||"";
        else v=sr[c]||"";
      } else {
        if(c==="طريقة الدفع")v=sr["طريقة الدفع (إيرادات)"]||"";
        else v=sr[c]||"";
      }
      nr[c]=v;
    });
    ts.rows.push(nr);
  });
  renumber(tgt);renumber("ترحيل البيانات");
}

// ═══════════════════════════════════════════
// ADD / EDIT MODALS
// ═══════════════════════════════════════════
let currentRevType="الايرادات التصميم الداخلي";
let currentContractType="مقطوعية";
let instCounters={maq:0,sh:0,mi:0}; // track how many rows each type has

function openAddModal(){
  ['m_client','m_mobile','m_property_no','m_supervisor','m_desc','m_proj_amt','m_first_amt','m_first_date','m_first_book','m_first_receipt','m_contract_start','m_months_count','m_monthly_amt','m_contract_date_start','m_contract_date_end'].forEach(id=>{if(g(id))g(id).value=id==='m_months_count'?'12':'';});
  // Reset file uploads
  ['m_contract_file','m_receipt_file'].forEach(id=>{const el=g(id);if(el)el.value='';});
  ['m_contract_preview','m_receipt_preview'].forEach(id=>{const el=g(id);if(el)el.innerHTML='';});
  _tempRevFiles={contractFileId:'',receiptFileId:''};
  if(g('m_pay_rev'))g('m_pay_rev').selectedIndex=0;
  document.querySelectorAll('.rev-type-card').forEach(b=>b.classList.remove('active'));
  const firstBtn=document.querySelector('.rev-type-card');if(firstBtn)firstBtn.classList.add('active');
  currentRevType="الايرادات التصميم الداخلي";
  g('supExtra').style.display='none';
  g('manualInst').style.display='block';
  instCounters={maq:0,sh:0,mi:0};
  g('maqInstFields').innerHTML='';g('shahriInstFields').innerHTML='';g('manualInstFields').innerHTML='';
  addInstRow('mi');addInstRow('mi'); // start with 2 manual installments
  setContractType('مقطوعية');
  openModal('addModal');
}
function openAddExpModal(){
  ['e_date','e_desc','e_voucher','e_amt','e_beneficiary','e_ben_mobile','e_ben_id'].forEach(id=>{if(g(id))g(id).value='';});
  if(g('e_cat'))g('e_cat').selectedIndex=0;
  if(g('e_pay'))g('e_pay').selectedIndex=0;
  const ef=g('e_payment_file');if(ef)ef.value='';
  const ep=g('e_payment_preview');if(ep)ep.innerHTML='';
  _tempExpFileId='';
  openModal('addExpModal');
}
function selectRevType(btn){
  document.querySelectorAll('.rev-type-card').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentRevType=btn.dataset.val;
  const isSup=currentRevType==="الايرادات الاشراف";
  g('supExtra').style.display=isSup?'block':'none';
  g('manualInst').style.display=isSup?'none':'block';
}
function setContractType(type){
  currentContractType=type;
  g('ctMaqtooia').classList.toggle('active',type==='مقطوعية');
  g('ctShahri').classList.toggle('active',type==='شهري');
  g('maqtooiaOpts').style.display=type==='مقطوعية'?'block':'none';
  g('shahriOpts').style.display=type==='شهري'?'block':'none';
  if(type==='مقطوعية'&&instCounters.maq===0){addInstRow('maq');addInstRow('maq');addInstRow('maq');}
  if(type==='شهري'&&instCounters.sh===0)buildShahriFields();
}

function makeInstRow(prefix,num,dateVal,amtVal,bookVal,rcptVal){
  const id=`${prefix}_row_${num}`;
  const fInputId=`${prefix}_f${num}`;
  const fPrevId=`${prefix}_fp${num}`;
  return `<div class="inst-row-wrap" id="${id}">
    <div class="inst-row-fields">
      <div class="inst-row-num">${num}</div>
      <div class="form-group"><label>📅 التاريخ</label><input type="date" id="${prefix}_d${num}" value="${dateVal||''}"></div>
      <div class="form-group"><label>💰 المبلغ (ر.ق)</label><input type="number" id="${prefix}_a${num}" value="${amtVal||''}" placeholder="0"></div>
      <div class="form-group"><label>📖 رقم دفتر السند</label><input type="text" id="${prefix}_b${num}" value="${bookVal||''}" placeholder="رقم الدفتر"></div>
      <div class="form-group"><label>🧾 رقم سند القبض</label><input type="text" id="${prefix}_r${num}" value="${rcptVal||''}" placeholder="رقم القبض"></div>
      <button type="button" class="inst-del-btn" onclick="delInstRow('${id}','${prefix}')" title="حذف">✕</button>
    </div>
    <div class="inst-row-attachment">
      <span class="inst-row-attachment-label">📎 مرفق القسط:</span>
      <div class="file-upload-zone-sm" onclick="document.getElementById('${fInputId}').click()">
        <input type="file" id="${fInputId}" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display:none"
          onchange="handleInstFileUpload('${fInputId}','${fPrevId}',this.closest('.inst-row-wrap'))">
        <span class="fuz-sm-icon">📎</span>
        <span>رفع سند القبض للقسط</span>
      </div>
      <div id="${fPrevId}" style="display:inline-flex;align-items:center;"></div>
    </div>
  </div>`;
}
function addInstRow(prefix,dateVal,amtVal,bookVal,rcptVal){
  instCounters[prefix]=(instCounters[prefix]||0)+1;
  const num=instCounters[prefix];
  const containerId=prefix==='maq'?'maqInstFields':prefix==='sh'?'shahriInstFields':'manualInstFields';
  const cont=g(containerId);if(!cont)return;
  cont.insertAdjacentHTML('beforeend',makeInstRow(prefix,num,dateVal,amtVal,bookVal,rcptVal));
  renumberInstRows(prefix);
}
function delInstRow(rowId,prefix){
  const el=g(rowId);if(el)el.remove();
  renumberInstRows(prefix);
}
function renumberInstRows(prefix){
  const containerId=prefix==='maq'?'maqInstFields':prefix==='sh'?'shahriInstFields':'manualInstFields';
  const cont=g(containerId);if(!cont)return;
  cont.querySelectorAll('.inst-row-wrap').forEach((row,i)=>{
    const numEl=row.querySelector('.inst-row-num');if(numEl)numEl.textContent=i+1;
  });
}
function buildShahriFields(){
  const start=gv('m_contract_start'),months=parseInt(gv('m_months_count'))||12,defAmt=parseFloat(gv('m_monthly_amt'))||0;
  g('shahriInstFields').innerHTML='';instCounters.sh=0;
  for(let i=0;i<months;i++){
    let d='';
    if(start){const dt=new Date(start);dt.setMonth(dt.getMonth()+i);d=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-01`;}
    addInstRow('sh',d,defAmt||'','','');
  }
}
function setManualInstCount(n){
  g('manualInstFields').innerHTML='';instCounters.mi=0;
  for(let i=0;i<n;i++)addInstRow('mi');
}
function onAmtChange(){}

function collectInstRows(prefix){
  const containerId=prefix==='maq'?'maqInstFields':prefix==='sh'?'shahriInstFields':'manualInstFields';
  const cont=g(containerId);if(!cont)return[];
  const rows=cont.querySelectorAll('.inst-row-wrap');
  const res=[];
  rows.forEach((row)=>{
    res.push({
      date:row.querySelector(`[id^="${prefix}_d"]`)?.value||'',
      amt:parseFloat(row.querySelector(`[id^="${prefix}_a"]`)?.value)||'',
      book:row.querySelector(`[id^="${prefix}_b"]`)?.value||'',
      rcpt:row.querySelector(`[id^="${prefix}_r"]`)?.value||'',
      fileId:row.dataset.instFileId||''
    });
  });
  return res;
}

function saveRevRecord(){
  const desc=gv('m_desc'),client=gv('m_client');
  if(!desc||!client){alert('يرجى إدخال البيان واسم العميل على الأقل');return;}
  const row={};
  masterCols.forEach(c=>row[c]="");
  row["البيان"]=desc;
  row["اسم العميل"]=client;row["رقم الجوال"]=gv('m_mobile');
  row["رقم العقار"] = gv('m_property_no');
  row["اسم المهندس المشرف"] = gv('m_supervisor');
  row["مبلغ المشروع"]=parseFloat(gv('m_proj_amt'))||"";
  row["مبلغ الدفعة الاولى"]=parseFloat(gv('m_first_amt'))||"";
  row["تاريخ الدفعة الاولى"]=gv('m_first_date');
  row["طريقة الدفع (إيرادات)"]=gv('m_pay_rev');
  row["رقم دفتر السند الدفعة الاولى"]=gv('m_first_book');
  row["رقم سند القبض الدفعة الاولى"]=gv('m_first_receipt');
  row["حالة المشروع"]=gv('m_status')||'نشط';
  // Contract dates
  row["تاريخ بداية العقد"]=gv('m_contract_date_start')||'';
  row["تاريخ نهاية العقد"]=gv('m_contract_date_end')||'';
  // Save file attachments
  row["ملف_العقد"]=_tempRevFiles.contractFileId||'';
  row["ملف_سند_القبض"]=_tempRevFiles.receiptFileId||'';
  _tempRevFiles={contractFileId:'',receiptFileId:''};
  const isSup=currentRevType==="الايرادات الاشراف";
  const prefix=isSup?(currentContractType==='مقطوعية'?'maq':'sh'):'mi';
  const insts=collectInstRows(prefix);
  insts.forEach((x,i)=>{
    row[`تاريخ قسط ${i+1}`]=x.date;
    row[`مبلغ قسط ${i+1}`]=x.amt;
    row[`رقم دفتر قسط ${i+1}`]=x.book;
    row[`رقم قبض قسط ${i+1}`]=x.rcpt;
    if(x.fileId)row[`ملف_قبض_قسط_${i+1}`]=x.fileId;
  });
  SD["ترحيل البيانات"].rows.push(row);
  renumber("ترحيل البيانات");
  saveToStorage();
  closeModal('addModal');renderTable();updateBadges();
  alert('✅ تم حفظ الإيراد في ترحيل البيانات');
}

function saveExpRecord(){
  const date=gv('e_date'),desc=gv('e_desc'),cat=gv('e_cat');
  if(!date||!desc||!cat){alert('يرجى إدخال التاريخ والبيان والتصنيف على الأقل');return;}
  const expSh=SD["المصاريف"];
  const newRow={"م":expSh.rows.length+1,"التاريخ":date,"البيان":desc,"تصنيف المصروف":cat,"رقم سند الصرف":gv('e_voucher'),"المبلغ":parseFloat(gv('e_amt'))||""," طريقة الصرف":gv('e_pay'),"المستفيد":gv('e_beneficiary'),"رقم الجوال":gv('e_ben_mobile'),"الرقم الشخصي":gv('e_ben_id'),"ملف_سند_الصرف":_tempExpFileId||''};
  expSh.rows.push(newRow);
  _tempExpFileId='';
  renumber("المصاريف");closeModal('addExpModal');renderExpTable();updateBadges();saveToStorage();
  alert('✅ تم حفظ المصروف');
}

// Keep old aliases
function saveRecord(){saveRevRecord();}
function setType(t){recType=t;}
function onRevTargetChange(){}
function previewInst(){}
function setMaqInst(n){g('maqInstFields').innerHTML='';instCounters.maq=0;for(let i=0;i<n;i++)addInstRow('maq');}
 
function openEdit(sn,idx){
  editSheet=sn;editIdx=idx;
  const sh=SD[sn];if(!sh)return;
  const row=sh.rows[idx];if(!row)return;
  const cont=g('editFormCont');
  cont.innerHTML=sh.columns.filter(c=>c!=="م").map(c=>`
    <div class="form-group">
      <label>${c}</label>
      <input type="${c.includes('تاريخ')?'date':'text'}" id="ef_${c.replace(/\s/g,'_')}" value="${row[c]!==undefined&&row[c]!==null?row[c]:''}">
    </div>`).join('');
  openModal('editModal');
}
function saveEdit(){
  if(editSheet===null||editIdx===null)return;
  const sh=SD[editSheet];if(!sh)return;
  const row=sh.rows[editIdx];if(!row)return;
  sh.columns.filter(c=>c!=="م").forEach(c=>{
    const inp=g(`ef_${c.replace(/\s/g,'_')}`);
    if(inp)row[c]=inp.value;
  });
  closeModal('editModal');renderTable();saveToStorage();
  if(document.getElementById('page-dashboard').classList.contains('active'))renderDash();
}

function openModal(id){g(id).classList.add('open');}
function closeModal(id){g(id).classList.remove('open');}
window.addEventListener('click',e=>{if(e.target.classList.contains('modal'))e.target.classList.remove('open');});

// ═══════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════

/* ── مساعدات التقارير الاحترافية ── */
function getRevenueRows(){
  let rows=[];
  revSheets.forEach(sheet=>{
    (SD[sheet]?.rows||[]).forEach(r=>{rows.push({...r,sheet});});
  });
  return rows;
}
function getExpenseRows(){
  return SD["المصاريف"]?.rows||[];
}

function renderReports(){
  const rev=totalRev(),exp=totalExp(),prf=rev-exp,ov=getOverdue();
  g('reportStats').innerHTML=`
    <div class="mini-stat"><div class="mini-stat-ico">💰</div><div class="mini-stat-body"><div class="msv">${fmt(rev)} ر.ق</div><div class="msl">إجمالي الإيرادات</div></div></div>
    <div class="mini-stat"><div class="mini-stat-ico">💸</div><div class="mini-stat-body"><div class="msv">${fmt(exp)} ر.ق</div><div class="msl">إجمالي المصروفات</div></div></div>
    <div class="mini-stat"><div class="mini-stat-ico">${prf>=0?'📈':'📉'}</div><div class="mini-stat-body"><div class="msv" style="color:${prf>=0?'var(--green)':'var(--red)'}">${fmt(Math.abs(prf))} ر.ق</div><div class="msl">صافي الربح / الخسارة</div></div></div>
  `;
  const mr=monthlyRevReport(),tRev=mr.reduce((a,[,v])=>a+v,0);
  g('rptMonthly').innerHTML=`<table class="rpt-table"><thead><tr><th>الشهر</th><th>الإيرادات</th><th>النسبة</th></tr></thead><tbody>
    ${mr.map(([m,a])=>`<tr><td>${m}</td><td>${fmt(a)} ر.ق</td><td>${tRev>0?((a/tRev)*100).toFixed(1):0}%</td></tr>`).join('')}
    <tr class="rpt-total"><td>الإجمالي</td><td>${fmt(tRev)} ر.ق</td><td>100%</td></tr>
  </tbody></table>`;
  const ec=expByCat(),tExp=Object.values(ec).reduce((a,b)=>a+b,0);
  g('rptExpCat').innerHTML=`<table class="rpt-table"><thead><tr><th>التصنيف</th><th>المبلغ</th><th>النسبة</th></tr></thead><tbody>
    ${Object.entries(ec).sort((a,b)=>b[1]-a[1]).map(([c,a])=>`<tr><td>${c}</td><td>${fmt(a)} ر.ق</td><td>${tExp>0?((a/tExp)*100).toFixed(1):0}%</td></tr>`).join('')}
    <tr class="rpt-total"><td>الإجمالي</td><td>${fmt(tExp)} ر.ق</td><td>100%</td></tr>
  </tbody></table>`;
  g('rptLate').innerHTML=ov.length===0?`<div class="empty"><div class="ei">✅</div><p>لا توجد دفعات متأخرة</p></div>`:
    `<table class="rpt-table"><thead><tr><th>العميل</th><th>المشروع</th><th>القسط</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>الحالة</th></tr></thead><tbody>
    ${ov.map(o=>`<tr><td>${o.client}</td><td>${o.proj}</td><td>القسط ${o.n}</td><td>${o.date}</td><td>${fmt(o.amt)} ر.ق</td><td><span class="badge bdg-red">⚠️ متأخر</span></td></tr>`).join('')}
    </tbody></table>`;
  // clients full report
  const allClients=topClients(100);
  g('rptClients').innerHTML=allClients.length===0?`<div class="empty"><div class="ei">👥</div><p>لا توجد بيانات</p></div>`:
    `<table class="rpt-table"><thead><tr><th>#</th><th>اسم العميل</th><th>إجمالي المشاريع</th><th>الإيرادات</th></tr></thead><tbody>
    ${allClients.map(([name,amt],i)=>{
      let projCount=0;
      revSheets.forEach(s=>SD[s]?.rows.forEach(r=>{if(r["اسم العميل"]===name)projCount++;}));
      return`<tr><td>${i+1}</td><td><strong>${name}</strong></td><td>${projCount} مشروع</td><td><span style="color:var(--green);font-weight:700;">${fmt(amt)} ر.ق</span></td></tr>`;
    }).join('')}
    </tbody></table>`;
  // ── التقارير الاحترافية الإضافية ──
  renderProReportKPIs();
  renderClientProjectsReport();
  renderRevenueDetailsReport();
  renderExpenseDetailsReport();
  renderProfitReport();
}

/* ── KPI احترافية ── */
function renderProReportKPIs(){
  const revenues=getRevenueRows();
  const expenses=getExpenseRows();
  let totalRevenue=0,totalExpenses=0;
  revenues.forEach(r=>{totalRevenue+=parseFloat(r["مبلغ المشروع"]||r.amount||0);});
  expenses.forEach(e=>{totalExpenses+=parseFloat(e["المبلغ"]||e.amount||0);});
  const netProfit=totalRevenue-totalExpenses;
  const clients=[...new Set(revenues.map(r=>r["اسم العميل"]||r.client||'-').filter(c=>c!=='-'))];
  const el=g('proReportKPIs');
  if(!el)return;
  el.innerHTML=`
    <div class="kpi rev"><div class="kpi-ico">💰</div><div class="kpi-lbl">إجمالي الإيرادات</div><div class="kpi-val">${fmt(totalRevenue)} ر.ق</div></div>
    <div class="kpi exp"><div class="kpi-ico">💸</div><div class="kpi-lbl">إجمالي المصروفات</div><div class="kpi-val">${fmt(totalExpenses)} ر.ق</div></div>
    <div class="kpi prf"><div class="kpi-ico">📈</div><div class="kpi-lbl">صافي الربح</div><div class="kpi-val" style="color:${netProfit>=0?'var(--green)':'var(--red)'}">${fmt(Math.abs(netProfit))} ر.ق</div></div>
    <div class="kpi rat"><div class="kpi-ico">👥</div><div class="kpi-lbl">عدد العملاء</div><div class="kpi-val">${clients.length}</div></div>
  `;
}

/* ── تقرير العملاء والمشاريع ── */
function renderClientProjectsReport(){
  const rows=getRevenueRows();
  const el=g('clientProjectsReport');if(!el)return;
  if(!rows.length){el.innerHTML=`<div class="empty"><div class="ei">📭</div><p>لا توجد بيانات</p></div>`;return;}
  let html=`<div class="tbl-scroll"><table class="rpt-table"><thead><tr>
    <th>العميل</th><th>المشروع</th><th>رقم العقار</th><th>قيمة المشروع</th><th>الدفعة الأولى</th><th>الحالة</th>
  </tr></thead><tbody>`;
  rows.forEach(r=>{
    const stCls=r["حالة المشروع"]==='نشط'?'bdg-green':r["حالة المشروع"]==='مكتمل'?'bdg-blue':r["حالة المشروع"]==='موقوف'?'bdg-amber':'bdg-gray';
    html+=`<tr>
      <td>${r["اسم العميل"]||'-'}</td>
      <td>${r["البيان"]||'-'}</td>
      <td>${r["رقم العقار"]||'-'}</td>
      <td style="color:var(--green);font-weight:700;">${fmt(parseFloat(r["مبلغ المشروع"]||0))} ر.ق</td>
      <td>${fmt(parseFloat(r["مبلغ الدفعة الاولى"]||r["مبلغ الدفعة الأولى"]||0))} ر.ق</td>
      <td><span class="badge ${stCls}">${r["حالة المشروع"]||'نشط'}</span></td>
    </tr>`;
  });
  html+=`</tbody></table></div>`;
  el.innerHTML=html;
}

/* ── تقرير الإيرادات التفصيلي ── */
function renderRevenueDetailsReport(){
  const rows=getRevenueRows();
  const el=g('revenuesDetailedReport');if(!el)return;
  if(!rows.length){el.innerHTML=`<div class="empty"><div class="ei">📭</div><p>لا توجد إيرادات</p></div>`;return;}
  let total=0;
  let html=`<div class="tbl-scroll"><table class="rpt-table"><thead><tr>
    <th>التاريخ</th><th>العميل</th><th>البيان</th><th>نوع الإيراد</th><th>المبلغ</th>
  </tr></thead><tbody>`;
  rows.forEach(r=>{
    const amount=parseFloat(r["مبلغ المشروع"]||0);
    total+=amount;
    html+=`<tr>
      <td>${getRecordDate(r)||'-'}</td>
      <td>${r["اسم العميل"]||'-'}</td>
      <td>${r["البيان"]||'-'}</td>
      <td>${r.sheet||'-'}</td>
      <td style="font-weight:700;color:var(--green);">${fmt(amount)} ر.ق</td>
    </tr>`;
  });
  html+=`<tr class="rpt-total"><td colspan="4">إجمالي الإيرادات</td><td>${fmt(total)} ر.ق</td></tr>
  </tbody></table></div>`;
  el.innerHTML=html;
}

/* ── تقرير المصروفات التفصيلي ── */
function renderExpenseDetailsReport(){
  const rows=getExpenseRows();
  const el=g('expensesDetailedReport');if(!el)return;
  if(!rows.length){el.innerHTML=`<div class="empty"><div class="ei">📭</div><p>لا توجد مصروفات</p></div>`;return;}
  let total=0;
  let html=`<div class="tbl-scroll"><table class="rpt-table"><thead><tr>
    <th>التاريخ</th><th>التصنيف</th><th>البيان</th><th>طريقة الدفع</th><th>المبلغ</th>
  </tr></thead><tbody>`;
  rows.forEach(r=>{
    const amount=parseFloat(r["المبلغ"]||0);
    total+=amount;
    html+=`<tr>
      <td>${r["التاريخ"]||'-'}</td>
      <td>${r["تصنيف المصروف"]||r["التصنيف"]||'-'}</td>
      <td>${r["البيان"]||'-'}</td>
      <td>${r["طريقة الصرف"]||r["طريقة الدفع"]||'-'}</td>
      <td style="font-weight:700;color:var(--red);">${fmt(amount)} ر.ق</td>
    </tr>`;
  });
  html+=`<tr class="rpt-total"><td colspan="4">إجمالي المصروفات</td><td>${fmt(total)} ر.ق</td></tr>
  </tbody></table></div>`;
  el.innerHTML=html;
}

/* ── تقرير صافي الربح ── */
function renderProfitReport(){
  const el=g('profitReport');if(!el)return;
  const totalRevenue=getRevenueRows().reduce((s,r)=>s+parseFloat(r["مبلغ المشروع"]||0),0);
  const totalExpenses=getExpenseRows().reduce((s,e)=>s+parseFloat(e["المبلغ"]||0),0);
  const profit=totalRevenue-totalExpenses;
  const ratioText=totalRevenue>0?((profit/totalRevenue)*100).toFixed(1)+'%':'—';
  el.innerHTML=`<table class="rpt-table"><tbody>
    <tr><td>إجمالي الإيرادات</td><td><strong style="color:var(--green);">${fmt(totalRevenue)} ر.ق</strong></td></tr>
    <tr><td>إجمالي المصروفات</td><td><strong style="color:var(--red);">${fmt(totalExpenses)} ر.ق</strong></td></tr>
    <tr><td>نسبة الربح</td><td><strong style="color:var(--blue);">${ratioText}</strong></td></tr>
    <tr class="rpt-total"><td>صافي الربح</td><td><strong style="color:${profit>=0?'#d1fae5':'#fee2e2'}">${profit>=0?'▲':'▼'} ${fmt(Math.abs(profit))} ر.ق</strong></td></tr>
  </tbody></table>`;
}

function exportRptExcel(type){
  const wb=XLSX.utils.book_new();
  if(type==='monthly'){
    const mr=monthlyRevReport();
    const data=[['الشهر','الإيرادات (ر.ق)'],...mr.map(([m,a])=>[m,a])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),'الإيرادات الشهرية');
  } else if(type==='expenses'){
    const ec=expByCat();
    const data=[['التصنيف','المبلغ (ر.ق)'],...Object.entries(ec).map(([c,a])=>[c,a])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),'المصروفات بالتصنيف');
  } else if(type==='late'){
    const ov=getOverdue();
    const data=[['العميل','المشروع','القسط','تاريخ الاستحقاق','المبلغ'],...ov.map(o=>[o.client,o.proj,`القسط ${o.n}`,o.date,o.amt])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),'الدفعات المتأخرة');
  }
  XLSX.writeFile(wb,`تقرير_${type}.xlsx`);
}

/* ── تصدير Excel الاحترافي الشامل ── */
function exportFullExcelReport(){
  const wb=XLSX.utils.book_new();
  // ورقة العملاء
  const clientData=getRevenueRows().map(r=>({
    "العميل":r["اسم العميل"]||'-',
    "المشروع":r["البيان"]||'-',
    "رقم العقار":r["رقم العقار"]||'-',
    "قيمة المشروع":parseFloat(r["مبلغ المشروع"]||0),
    "الدفعة الأولى":parseFloat(r["مبلغ الدفعة الاولى"]||r["مبلغ الدفعة الأولى"]||0),
    "الحالة":r["حالة المشروع"]||'نشط',
    "نوع الإيراد":r.sheet||'-'
  }));
  if(clientData.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clientData),'العملاء والمشاريع');
  // ورقة الإيرادات
  const revenueData=getRevenueRows().map(r=>({
    "التاريخ":getRecordDate(r)||'-',
    "العميل":r["اسم العميل"]||'-',
    "البيان":r["البيان"]||'-',
    "نوع الإيراد":r.sheet||'-',
    "المبلغ":parseFloat(r["مبلغ المشروع"]||0)
  }));
  if(revenueData.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(revenueData),'الإيرادات التفصيلية');
  // ورقة المصروفات
  const expData=getExpenseRows().map(r=>({
    "التاريخ":r["التاريخ"]||'-',
    "التصنيف":r["تصنيف المصروف"]||r["التصنيف"]||'-',
    "البيان":r["البيان"]||'-',
    "طريقة الدفع":r["طريقة الصرف"]||'-',
    "المبلغ":parseFloat(r["المبلغ"]||0)
  }));
  if(expData.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(expData),'المصروفات');
  // ورقة ملخص الربح
  const totalRevenue=getRevenueRows().reduce((s,r)=>s+parseFloat(r["مبلغ المشروع"]||0),0);
  const totalExpenses=getExpenseRows().reduce((s,e)=>s+parseFloat(e["المبلغ"]||0),0);
  const summaryData=[
    {"البيان":"إجمالي الإيرادات","المبلغ (ر.ق)":totalRevenue},
    {"البيان":"إجمالي المصروفات","المبلغ (ر.ق)":totalExpenses},
    {"البيان":"صافي الربح","المبلغ (ر.ق)":totalRevenue-totalExpenses}
  ];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(summaryData),'ملخص الربح');
  XLSX.writeFile(wb,'التقرير_الاحترافي_الشامل.xlsx');
}

/* ── تصدير PDF الاحترافي ── */
function exportFullPDFReport(){
  const totalRevenue=getRevenueRows().reduce((s,r)=>s+parseFloat(r["مبلغ المشروع"]||0),0);
  const totalExpenses=getExpenseRows().reduce((s,e)=>s+parseFloat(e["المبلغ"]||0),0);
  const profit=totalRevenue-totalExpenses;
  const ratio=totalRevenue>0?((profit/totalRevenue)*100).toFixed(1):0;
  const ov=getOverdue();
  const allClients=topClients(100);
  const mr=monthlyRevReport();
  const ec=expByCat();
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
  <title>التقرير الاحترافي الشامل – المحيط للحسابات</title>
  <style>
    body{font-family:Tahoma,Arial,sans-serif;padding:28px;font-size:12px;color:#1e293b;direction:rtl;}
    h1{color:#0d2137;font-size:20px;margin-bottom:4px;}
    .sub{color:#64748b;font-size:11px;margin-bottom:20px;}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0;}
    .kpi{border:2px solid #e2ecf5;border-radius:12px;padding:14px;text-align:center;}
    .kpi .lbl{font-size:10px;color:#64748b;font-weight:700;margin-bottom:5px;}
    .kpi .val{font-size:16px;font-weight:900;}
    .kpi.rev .val{color:#10b981;} .kpi.exp .val{color:#ef4444;}
    .kpi.prf .val{color:#3b82f6;} .kpi.rat .val{color:#f59e0b;}
    h2{color:#0d2137;font-size:14px;border-bottom:2px solid #0d2137;padding-bottom:5px;margin:22px 0 10px;}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:18px;}
    th{background:#0d2137;color:#fff;padding:8px 10px;text-align:right;font-weight:700;}
    td{padding:7px 10px;border-bottom:1px solid #e2ecf5;text-align:right;}
    .ttl td{background:#0d2137!important;color:#fff!important;font-weight:700;}
    .bdg-red{background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:20px;font-size:10px;}
    .footer{text-align:center;margin-top:30px;color:#94a3b8;font-size:10px;}
    @media print{body{padding:10px;}}
  </style></head><body>
  <h1>🌊 المحيط للحسابات – التقرير الاحترافي الشامل</h1>
  <div class="sub">تاريخ الإصدار: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
  <div class="kpis">
    <div class="kpi rev"><div class="lbl">إجمالي الإيرادات</div><div class="val">${fmt(totalRevenue)} ر.ق</div></div>
    <div class="kpi exp"><div class="lbl">إجمالي المصروفات</div><div class="val">${fmt(totalExpenses)} ر.ق</div></div>
    <div class="kpi prf"><div class="lbl">صافي الربح</div><div class="val">${fmt(Math.abs(profit))} ر.ق</div></div>
    <div class="kpi rat"><div class="lbl">نسبة الربح</div><div class="val">${ratio}%</div></div>
  </div>
  <h2>📊 ملخص الإيرادات والمصروفات</h2>
  <table><thead><tr><th>البيان</th><th>المبلغ (ر.ق)</th></tr></thead><tbody>
    <tr><td>إجمالي الإيرادات</td><td style="color:#10b981;font-weight:700;">${fmt(totalRevenue)}</td></tr>
    <tr><td>إجمالي المصروفات</td><td style="color:#ef4444;font-weight:700;">${fmt(totalExpenses)}</td></tr>
    <tr class="ttl"><td>صافي الربح</td><td>${fmt(Math.abs(profit))}</td></tr>
  </tbody></table>
  <h2>👥 العملاء والمشاريع</h2>
  <table><thead><tr><th>#</th><th>العميل</th><th>المشاريع</th><th>الإيرادات (ر.ق)</th></tr></thead><tbody>
    ${allClients.map(([name,amt],i)=>{
      let p=0;revSheets.forEach(s=>SD[s]?.rows.forEach(r=>{if(r["اسم العميل"]===name)p++;}));
      return`<tr><td>${i+1}</td><td>${name}</td><td>${p} مشروع</td><td style="color:#10b981;font-weight:700;">${fmt(amt)}</td></tr>`;
    }).join('')}
  </tbody></table>
  <h2>📅 الإيرادات الشهرية</h2>
  <table><thead><tr><th>الشهر</th><th>الإيرادات (ر.ق)</th><th>النسبة</th></tr></thead><tbody>
    ${mr.map(([m,a])=>`<tr><td>${m}</td><td>${fmt(a)}</td><td>${totalRevenue>0?((a/totalRevenue)*100).toFixed(1):0}%</td></tr>`).join('')}
    <tr class="ttl"><td>الإجمالي</td><td>${fmt(totalRevenue)}</td><td>100%</td></tr>
  </tbody></table>
  <h2>🗂️ المصروفات بالتصنيف</h2>
  <table><thead><tr><th>التصنيف</th><th>المبلغ (ر.ق)</th><th>النسبة</th></tr></thead><tbody>
    ${Object.entries(ec).sort((a,b)=>b[1]-a[1]).map(([c,a])=>`<tr><td>${c}</td><td>${fmt(a)}</td><td>${totalExpenses>0?((a/totalExpenses)*100).toFixed(1):0}%</td></tr>`).join('')}
    <tr class="ttl"><td>الإجمالي</td><td>${fmt(totalExpenses)}</td><td>100%</td></tr>
  </tbody></table>
  ${ov.length>0?`<h2>🚨 الدفعات المتأخرة (${ov.length})</h2>
  <table><thead><tr><th>العميل</th><th>المشروع</th><th>القسط</th><th>تاريخ الاستحقاق</th><th>المبلغ</th></tr></thead><tbody>
    ${ov.map(o=>`<tr><td>${o.client}</td><td>${o.proj}</td><td>القسط ${o.n}</td><td>${o.date}</td><td style="color:#ef4444;font-weight:700;">${fmt(o.amt)} ر.ق</td></tr>`).join('')}
  </tbody></table>`:''}
  <div class="footer">© 2026 المحيط للحسابات – تقرير آلي شامل</div>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

// ═══════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════
function renderAlerts(){
  const ov=getOverdue(),up=getUpcoming();
  g('overdueList').innerHTML=ov.length===0?`<div class="empty"><div class="ei">✅</div><p>لا توجد دفعات متأخرة – ممتاز!</p></div>`:
    ov.map(o=>`<div class="alert-item danger"><div class="alert-icon">🚨</div><div class="alert-body"><div class="alert-title">${o.client}</div><div class="alert-desc">القسط ${o.n} | تاريخ الاستحقاق: ${o.date}<br><small style="color:var(--muted)">${o.sheet}</small></div></div><div class="alert-amt">${fmt(o.amt)} ر.ق</div></div>`).join('');
  g('upcomingList').innerHTML=up.length===0?`<div class="empty"><div class="ei">📅</div><p>لا توجد أقساط مستحقة هذا الشهر</p></div>`:
    up.map(u=>`<div class="alert-item warning"><div class="alert-icon">⏰</div><div class="alert-body"><div class="alert-title">${u.client}</div><div class="alert-desc">القسط ${u.n} | الموعد: ${u.date}</div></div><div class="alert-amt">${fmt(u.amt)} ر.ق</div></div>`).join('');
}
function updateBadges(){
  const n=getOverdue().length;
  g('navBadge').textContent=n;g('navBadge').style.display=n>0?'inline-block':'none';
  g('notifDot').style.display=n>0?'block':'none';
}

// ═══════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════
function renderExport(){
  const sel=g('expSheet');if(sel)sel.innerHTML=sheetNames.map(n=>`<option value="${n}">${n}</option>`).join('');
}
function exportAllExcel(){
  const wb=XLSX.utils.book_new();
  sheetNames.forEach(n=>{const sh=SD[n];if(!sh||!sh.rows.length)return;
    const data=[sh.columns,...sh.rows.map(r=>sh.columns.map(c=>r[c]||''))];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),n.substring(0,31));
  });
  XLSX.writeFile(wb,'المحيط_للحسابات_كامل.xlsx');
}
function exportSheetExcel(sn){
  const sh=SD[sn];if(!sh)return;
  const wb=XLSX.utils.book_new();
  const data=[sh.columns,...sh.rows.map(r=>sh.columns.map(c=>r[c]||''))];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),sn.substring(0,31));
  XLSX.writeFile(wb,`${sn}.xlsx`);
}
function exportFiltered(){
  const sn=gv('expSheet');const sh=SD[sn];if(!sh)return;
  const df=gv('expFrom'),dt=gv('expTo');
  let rows=[...sh.rows];
  if(df||dt)rows=rows.filter(r=>{const dv=getRecordDate(r)||r["التاريخ"]||'';if(df&&dv<df)return false;if(dt&&dv>dt)return false;return true;});
  const wb=XLSX.utils.book_new();
  const data=[sh.columns,...rows.map(r=>sh.columns.map(c=>r[c]||''))];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),sn.substring(0,31));
  XLSX.writeFile(wb,`${sn}_مصدَّر.xlsx`);
}

// ═══════════════════════════════════════════
// PDF EXPORT
// ═══════════════════════════════════════════
function exportPDF(){
  const rev=totalRev(),exp=totalExp(),prf=rev-exp,rat=rev>0?((prf/rev)*100).toFixed(1):0;
  const ov=getOverdue(),up=getUpcoming();
  const mr=monthlyRevReport();
  const ec=expByCat();
  const tc=topClients(10);
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
  <title>تقرير المحيط للحسابات</title>
  <style>
    body{font-family:Tahoma,Arial,sans-serif;padding:28px;font-size:12px;color:#1e293b;direction:rtl;}
    h1{color:#0d2137;margin-bottom:4px;font-size:20px;}
    .sub{color:#64748b;font-size:11px;margin-bottom:20px;}
    .kpis{display:flex;gap:14px;margin:18px 0;}
    .kpi{border:2px solid #e2ecf5;border-radius:12px;padding:14px 18px;flex:1;text-align:center;}
    .kpi .lbl{font-size:10px;color:#64748b;font-weight:700;margin-bottom:5px;}
    .kpi .val{font-size:17px;font-weight:900;}
    .kpi.rev .val{color:#10b981;}
    .kpi.exp .val{color:#ef4444;}
    .kpi.prf .val{color:#3b82f6;}
    .kpi.rat .val{color:#f59e0b;}
    h2{color:#0d2137;font-size:14px;border-bottom:2px solid #0d2137;padding-bottom:5px;margin:22px 0 10px;}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:18px;}
    th{background:#0d2137;color:#fff;padding:8px 10px;text-align:right;font-weight:700;}
    td{padding:7px 10px;border-bottom:1px solid #e2ecf5;text-align:right;}
    tr:hover td{background:#f7fafd;}
    .ttl td{background:#0d2137!important;color:#fff!important;font-weight:700;}
    .bdg-red{background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;}
    .footer{text-align:center;margin-top:30px;color:#94a3b8;font-size:10px;}
    @media print{body{padding:10px;}}
  </style></head><body>
  <h1>🌊 المحيط للحسابات</h1>
  <div class="sub">تقرير مالي شامل – تاريخ الإصدار: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
  <div class="kpis">
    <div class="kpi rev"><div class="lbl">إجمالي الإيرادات</div><div class="val">${fmt(rev)} ر.ق</div></div>
    <div class="kpi exp"><div class="lbl">إجمالي المصروفات</div><div class="val">${fmt(exp)} ر.ق</div></div>
    <div class="kpi prf"><div class="lbl">صافي الربح</div><div class="val">${fmt(Math.abs(prf))} ر.ق</div></div>
    <div class="kpi rat"><div class="lbl">نسبة الربح</div><div class="val">${rat}%</div></div>
  </div>
  <h2>📅 الإيرادات الشهرية</h2>
  <table><thead><tr><th>الشهر</th><th>الإيرادات (ر.ق)</th><th>النسبة</th></tr></thead><tbody>
    ${mr.map(([m,a])=>`<tr><td>${m}</td><td>${fmt(a)}</td><td>${rev>0?((a/rev)*100).toFixed(1):0}%</td></tr>`).join('')}
    <tr class="ttl"><td>الإجمالي</td><td>${fmt(mr.reduce((a,[,v])=>a+v,0))}</td><td>100%</td></tr>
  </tbody></table>
  <h2>🗂️ المصروفات بالتصنيف</h2>
  <table><thead><tr><th>التصنيف</th><th>المبلغ (ر.ق)</th><th>النسبة</th></tr></thead><tbody>
    ${Object.entries(ec).sort((a,b)=>b[1]-a[1]).map(([c,a])=>`<tr><td>${c}</td><td>${fmt(a)}</td><td>${exp>0?((a/exp)*100).toFixed(1):0}%</td></tr>`).join('')}
    <tr class="ttl"><td>الإجمالي</td><td>${fmt(exp)}</td><td>100%</td></tr>
  </tbody></table>
  <h2>🏆 أبرز العملاء</h2>
  <table><thead><tr><th>#</th><th>العميل</th><th>الإيرادات (ر.ق)</th></tr></thead><tbody>
    ${tc.map(([n,a],i)=>`<tr><td>${i+1}</td><td>${n}</td><td>${fmt(a)}</td></tr>`).join('')}
  </tbody></table>
  ${ov.length>0?`<h2>🚨 الدفعات المتأخرة (${ov.length})</h2>
  <table><thead><tr><th>العميل</th><th>المشروع</th><th>القسط</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>الحالة</th></tr></thead><tbody>
    ${ov.map(o=>`<tr><td>${o.client}</td><td>${o.proj}</td><td>القسط ${o.n}</td><td>${o.date}</td><td>${fmt(o.amt)} ر.ق</td><td><span class="bdg-red">متأخر</span></td></tr>`).join('')}
  </tbody></table>`:''}
  <div class="footer">© 2026 المحيط للحسابات – تقرير آلي</div>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

// ═══════════════════════════════════════════
// GLOBAL SEARCH
// ═══════════════════════════════════════════
function buildSearchIndex(){
  const idx=[];
  revSheets.forEach(s=>SD[s]?.rows.forEach(r=>{
    const name=r["اسم العميل"]||'';
    const proj=r["رقم العقار"]||'';
    if(name||proj)idx.push({name,sub:`${s} | ${proj} | ${fmt(r["مبلغ المشروع"]||0)} ر.ق`,sheet:s});
  }));
  return idx;
}
function initSearch(){
  const inp=g('gSearch'),drop=g('searchDrop');
  inp.addEventListener('input',()=>{
    const q=inp.value.trim().toLowerCase();
    if(!q){drop.classList.remove('show');return;}
    const idx=buildSearchIndex();
    const res=idx.filter(x=>x.name.toLowerCase().includes(q)||x.sub.toLowerCase().includes(q)).slice(0,8);
    drop.innerHTML=res.length===0?'<div class="search-item"><div><div class="si-name">لا توجد نتائج</div></div></div>':
      res.map(r=>`<div class="search-item" onclick="gSearch_goto('${r.sheet}')"><div><div class="si-name">${r.name}</div><div class="si-sub">${r.sub}</div></div></div>`).join('');
    drop.classList.add('show');
  });
  document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))drop.classList.remove('show');});
}
function gSearch_goto(sheet){
  activeSheet=sheet;goPage('data');
  g('searchDrop').classList.remove('show');g('gSearch').value='';
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// SORT EXPENSE TABLE
// ═══════════════════════════════════════════
function sortExpTable(col){
  if(expSortState.col===col)expSortState.dir*=-1;else{expSortState.col=col;expSortState.dir=1;}
  renderExpTable();
}

// ═══════════════════════════════════════════
// DARK MODE
// ═══════════════════════════════════════════
function toggleDark(){
  const dark=document.body.classList.toggle('dark-mode');
  g('darkToggle').textContent=dark?'☀️':'🌙';
  localStorage.setItem('almuheet_dark',dark?'1':'0');
}
function loadDarkMode(){
  if(localStorage.getItem('almuheet_dark')==='1'){
    document.body.classList.add('dark-mode');
    const t=g('darkToggle');if(t)t.textContent='☀️';
  }
}

const STORAGE_KEY='almuheet_data_v2';

// ═══════════════════════════════════════════
// FIREBASE CONFIG - استخدم متغيرات البيئة
// ═══════════════════════════════════════════
// 🔒 أضف المفاتيح الجديدة في .env بدلاً من هنا
// نسخة احتياطية: الملف .env.example يحتوي على النموذج
const FIREBASE_ENV = window.FIREBASE_ENV || {};

const FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
  apiKey:            FIREBASE_ENV.VITE_FIREBASE_API_KEY || "تم حذف المفتاح القديم",
  authDomain:        FIREBASE_ENV.VITE_FIREBASE_AUTH_DOMAIN || "almuhhet-accounting.firebaseapp.com",
  projectId:         FIREBASE_ENV.VITE_FIREBASE_PROJECT_ID || "almuhhet-accounting",
  storageBucket:     FIREBASE_ENV.VITE_FIREBASE_STORAGE_BUCKET || "almuhhet-accounting.firebasestorage.app",
  messagingSenderId: FIREBASE_ENV.VITE_FIREBASE_MESSAGING_SENDER_ID || "تم حذف المفتاح القديم",
  appId:             FIREBASE_ENV.VITE_FIREBASE_APP_ID || "تم حذف المفتاح القديم"
};
const FB_DOC_PATH = "almuheet/data";      // مسار المستند في Firestore
const FB_FILES_DOC = "almuheet/files";   // مسار ملفات الأرشيف
let   fbReady = false;
let   fbDB    = null;

function isFirebaseConfigIncomplete(config){
  const bad = [config.apiKey, config.authDomain, config.projectId, config.storageBucket, config.messagingSenderId, config.appId];
  return bad.some(v => !v || v.toString().includes('تم حذف') || v.toString().includes('your_'));
}

async function initFirebase(){
  try{
    if(isFirebaseConfigIncomplete(FIREBASE_CONFIG)){
      fbReady=false;
      fbDB=null;
      showSyncBadge('💾 تخزين محلي','#6b7280');
      return false;
    }
    if(!firebase?.apps?.length) firebase.initializeApp(FIREBASE_CONFIG);
    fbDB = firebase.firestore();
    try{
      await fbDB.doc(FB_DOC_PATH).get();
      fbReady=true;
      showSyncBadge('☁️ Firebase متصل','#10b981');
      return true;
    }catch(e){
      fbReady=false;
      fbDB=null;
      if(e.code==='not-found'||e.message?.includes('does not exist')){
        showSyncBadge('💾 تخزين محلي (Firebase غير مهيأ)','#6b7280');
        console.info('Firestore database not found – using localStorage. To enable cloud sync, create a Firestore database at https://console.cloud.google.com/datastore/setup?project=almuhhet-accounting');
      } else {
        showSyncBadge('💾 تخزين محلي (غير متصل)','#6b7280');
        console.info('Firebase unreachable – using localStorage fallback.');
      }
      return false;
    }
  }catch(e){
    fbReady=false;
    fbDB=null;
    showSyncBadge('💾 تخزين محلي','#6b7280');
    return false;
  }
}

function showSyncBadge(msg,color){
  let b=g('fbSyncBadge');
  if(!b){
    b=document.createElement('div');
    b.id='fbSyncBadge';
    b.style.cssText='position:fixed;bottom:18px;left:18px;z-index:9999;padding:6px 14px;border-radius:20px;font-size:.75rem;font-weight:700;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.2);transition:opacity .4s;';
    document.body.appendChild(b);
  }
  b.textContent=msg; b.style.background=color; b.style.opacity='1';
  setTimeout(()=>b.style.opacity='0',3000);
}

/* ── حفظ البيانات (Firebase أولاً – نسخة محلية احتياطية) ── */
async function saveToStorage(){
  // Firebase هو المصدر الأساسي للبيانات السحابية
  if(fbReady && fbDB){
    try{
      const cleanSD = {};
      sheetNames.forEach(n=>{
        cleanSD[n]={
          columns: SD[n]?.columns||[],
          rows: (SD[n]?.rows||[]).map(r=>{
            const clean={...r};
            Object.keys(clean).forEach(k=>{ if(k.startsWith('ملف_'))delete clean[k]; });
            return clean;
          })
        };
      });
      await fbDB.doc(FB_DOC_PATH).set({data: JSON.stringify(cleanSD), updated: Date.now()});
      showSyncBadge('☁️ تم الحفظ في السحابة','#10b981');
      try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(SD)); }catch(e){}
      return;
    }catch(e){
      fbReady=false; fbDB=null;
    }
  }
  // احتياطي: localStorage
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(SD)); }catch(e){}
}

/* ── تحميل البيانات ── */
async function loadFromStorage(){
  // جرّب Firebase أولاً إذا كان متصلاً
  if(fbReady && fbDB){
    try{
      const snap = await fbDB.doc(FB_DOC_PATH).get();
      if(snap.exists){
        const saved = JSON.parse(snap.data().data||'{}');
        sheetNames.forEach(n=>{
          if(saved[n]?.rows){ SD[n].rows=saved[n].rows; renumber(n); }
        });
        await loadFileStore();
        renderDash(); updateBadges();
        showSyncBadge('☁️ تم التحميل من السحابة','#3b82f6');
        return true;
      }
    }catch(e){
      // Firebase فشل – نتحول لـlocalStorage بصمت
      fbReady=false; fbDB=null;
    }
  }
  // احتياطي: localStorage
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const saved=JSON.parse(raw);
    sheetNames.forEach(n=>{
      if(saved[n]?.rows){ SD[n].rows=saved[n].rows; renumber(n); }
    });
    await loadFileStore();
    return true;
  }catch(e){ return false; }
}

// ═══════════════════════════════════════════
// JSON BACKUP / RESTORE
// ═══════════════════════════════════════════
function exportJSON(){
  const blob=new Blob([JSON.stringify({version:2,exported:new Date().toISOString(),data:SD},null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`المحيط_نسخة_احتياطية_${new Date().toISOString().slice(0,10)}.json`;
  a.click();URL.revokeObjectURL(a.href);
  showToast('✅ تم تصدير النسخة الاحتياطية','success');
}
function importJSON(inp){
  const file=inp.files[0];if(!file)return;
  const rd=new FileReader();
  rd.onload=e=>{
    try{
      const obj=JSON.parse(e.target.result);
      const src=obj.data||obj;
      sheetNames.forEach(n=>{
        if(src[n]?.rows){SD[n].rows=src[n].rows;renumber(n);}
      });
      saveToStorage();renderDash();updateBadges();
      showToast('✅ تمت الاستعادة بنجاح – تم تحميل '+sheetNames.reduce((a,n)=>a+(SD[n]?.rows.length||0),0)+' سجل','success');
    }catch(err){showToast('❌ ملف JSON غير صالح','error');}
    inp.value='';
  };
  rd.readAsText(file);
}

// ═══════════════════════════════════════════
// EXCEL IMPORT
// ═══════════════════════════════════════════
function importExcel(inp){
  const file=inp.files[0];if(!file)return;
  const rd=new FileReader();
  rd.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'array'});
      let imported=0;
      wb.SheetNames.forEach(wsName=>{
        // match by sheet name
        const target=sheetNames.find(n=>n===wsName||wsName.includes(n.replace('الايرادات ',''))||n.includes(wsName));
        if(!target)return;
        const ws=wb.Sheets[wsName];
        const data=XLSX.utils.sheet_to_json(ws,{defval:''});
        if(!data.length)return;
        const sh=SD[target];if(!sh)return;
        // Map columns: use existing columns as guide
        data.forEach(srcRow=>{
          const nr={};
          sh.columns.forEach(c=>{nr[c]=srcRow[c]!==undefined?srcRow[c]:'';});
          sh.rows.push(nr);
        });
        renumber(target);
        imported+=data.length;
      });
      saveToStorage();renderDash();updateBadges();
      if(currentDataSub==='revenues')renderTable();
      if(currentDataSub==='expenses')renderExpTable();
      showToast(`✅ تم استيراد ${imported} سجل من Excel`,'success');
    }catch(err){showToast('❌ خطأ في قراءة ملف Excel','error');}
    inp.value='';
  };
  rd.readAsArrayBuffer(file);
}

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
function showToast(msg,type=''){
  const t=g('toastEl');if(!t)return;
  t.textContent=msg;t.className='toast'+(type?' '+type:'');
  requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add('show')));
  setTimeout(()=>t.classList.remove('show'),3500);
}

// ═══════════════════════════════════════════
// BROWSER NOTIFICATIONS
// ═══════════════════════════════════════════
function requestNotifPermission(){
  if(!('Notification' in window))return showToast('❌ المتصفح لا يدعم الإشعارات','error');
  Notification.requestPermission().then(p=>{
    if(p==='granted'){checkNotifications();showToast('✅ تم تفعيل إشعارات الأقساط','success');}
    g('notifPermBtn').style.display='none';
    const b=g('notifBanner');if(b)b.style.display='none';
  });
}
function checkNotifications(){
  if(Notification.permission!=='granted')return;
  const now=new Date();now.setHours(0,0,0,0);
  const in2=new Date(now);in2.setDate(in2.getDate()+2);
  const upcoming=[];
  [...revSheets,"ترحيل البيانات"].forEach(s=>SD[s]?.rows.forEach(r=>{
    for(let i=1;i<=12;i++){
      const ds=r[`تاريخ قسط ${i}`],am=r[`مبلغ قسط ${i}`];
      if(ds&&am&&parseFloat(am)>0){
        const d=new Date(ds);
        if(d>=now&&d<=in2)upcoming.push({client:r["اسم العميل"]||"",amt:parseFloat(am),date:ds,n:i});
      }
    }
  }));
  upcoming.forEach(u=>{
    new Notification('⏰ قسط قادم – المحيط للحسابات',{
      body:`${u.client} – القسط ${u.n} بمبلغ ${fmt(u.amt)} ر.ق بتاريخ ${u.date}`,
      icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌊</text></svg>'
    });
  });
}
function initNotifications(){
  if(!('Notification' in window))return;
  if(Notification.permission==='default'){
    g('notifPermBtn').style.display='flex';
    const b=g('notifBanner');if(b)b.style.display='flex';
  } else if(Notification.permission==='granted'){
    checkNotifications();
  }
}

// ═══════════════════════════════════════════
// CLIENT STATEMENT
// ═══════════════════════════════════════════
function showClientStatement(){
  // populate client dropdown
  const sel=g('stmtClientSel');if(!sel)return;
  const clients=new Set();
  revSheets.forEach(s=>SD[s]?.rows.forEach(r=>{if(r["اسم العميل"])clients.add(r["اسم العميل"]);}));
  sel.innerHTML=[...clients].sort().map(c=>`<option value="${c}">${c}</option>`).join('');
  renderClientStatement();
  openModal('stmtModal');
}
function showClientStatementFor(clientName,evt){
  if(evt)evt.stopPropagation();
  const sel=g('stmtClientSel');
  const clients=new Set();
  revSheets.forEach(s=>SD[s]?.rows.forEach(r=>{if(r["اسم العميل"])clients.add(r["اسم العميل"]);}));
  sel.innerHTML=[...clients].sort().map(c=>`<option value="${c}">${c}</option>`).join('');
  sel.value=clientName;
  renderClientStatement();
  openModal('stmtModal');
}
function renderClientStatement(){
  const client=gv('stmtClientSel');if(!client)return;
  const now=new Date();now.setHours(0,0,0,0);
  let totalAmt=0,totalInst=0,overdueAmt=0;
  let projHtml='';
  revSheets.forEach(s=>{
    SD[s]?.rows.filter(r=>r["اسم العميل"]===client).forEach(r=>{
      const projAmt=parseFloat(r["مبلغ المشروع"]||0);
      const firstAmt=parseFloat(r["مبلغ الدفعة الاولى"]||0);
      totalAmt+=projAmt;
      let instHtml='',instTotal=0,instCount=0;
      for(let i=1;i<=12;i++){
        const d=r[`تاريخ قسط ${i}`]||'',a=parseFloat(r[`مبلغ قسط ${i}`]||0);
        if(!d&&!a)continue;
        const isOv=d&&new Date(d)<now;
        instTotal+=a;instCount++;totalInst+=a;
        if(isOv)overdueAmt+=a;
        instHtml+=`<div class="stmt-inst-item${isOv?' overdue':''}">
          <div class="sii-n">قسط ${i}</div>
          <div class="sii-d">${d||'—'}</div>
          <div class="sii-a">${a>0?fmt(a)+' ر.ق':'—'}</div>
        </div>`;
      }
      const stClsMap={'نشط':'bdg-active','مكتمل':'bdg-done','موقوف':'bdg-paused'};
      const stCls=stClsMap[r["حالة المشروع"]]||'bdg-gray';
      projHtml+=`<div class="stmt-proj">
        <div class="stmt-proj-hdr">
          <div>
            <span class="stmt-proj-title">📁 ${r["رقم العقار"]||'—'} – ${r["البيان"]||'—'}</span>
            <span class="badge ${stCls}" style="margin-right:8px;font-size:.65rem;">${r["حالة المشروع"]||'نشط'}</span>
          </div>
          <div style="font-size:.8rem;color:var(--green);font-weight:700;">${fmt(projAmt)} ر.ق</div>
        </div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:10px;">
          الدفعة الأولى: <strong>${fmt(firstAmt)} ر.ق</strong> – ${r["تاريخ الدفعة الاولى"]||'—'} &nbsp;|&nbsp; طريقة الدفع: ${r["طريقة الدفع"]||r["طريقة الدفع (إيرادات)"]||'—'}
        </div>
        ${instCount>0?`<div class="stmt-inst-grid">${instHtml}</div>`:'<div style="font-size:.75rem;color:var(--muted);">لا توجد أقساط مسجّلة</div>'}
      </div>`;
    });
  });
  const mobile=revSheets.flatMap(s=>SD[s]?.rows.filter(r=>r["اسم العميل"]===client).map(r=>r["رقم الجوال"])||[]).find(Boolean)||'—';
  g('stmtContent').innerHTML=`
    <div class="stmt-header">
      <div class="stmt-avatar">👤</div>
      <div class="stmt-info"><h3>${client}</h3><p>📱 ${mobile}</p></div>
    </div>
    <div class="stmt-kpis">
      <div class="stmt-kpi"><div class="sk-v">${fmt(totalAmt)} ر.ق</div><div class="sk-l">إجمالي المشاريع</div></div>
      <div class="stmt-kpi"><div class="sk-v">${fmt(totalInst)} ر.ق</div><div class="sk-l">إجمالي الأقساط</div></div>
      <div class="stmt-kpi" style="border:1px solid rgba(239,68,68,.3);"><div class="sk-v" style="color:var(--red)">${fmt(overdueAmt)} ر.ق</div><div class="sk-l">متأخرات</div></div>
    </div>
    ${projHtml||'<div class="empty"><div class="ei">📭</div><p>لا توجد مشاريع لهذا العميل</p></div>'}
  `;
}
function printClientStatement(){
  const client=gv('stmtClientSel')||'العميل';
  const content=g('stmtContent').innerHTML;
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>كشف حساب – ${client}</title>
  <style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;font-size:12px;direction:rtl;}
  .stmt-header{display:flex;gap:12px;align-items:center;background:#0d2137;color:#fff;padding:14px;border-radius:10px;margin-bottom:16px;}
  .stmt-avatar{width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:1.4rem;}
  .stmt-info h3{font-size:15px;font-weight:700;margin-bottom:4px;}.stmt-info p{font-size:11px;opacity:.75;}
  .stmt-kpis{display:flex;gap:10px;margin-bottom:16px;}
  .stmt-kpi{border:1px solid #e2ecf5;border-radius:10px;padding:10px;flex:1;text-align:center;}
  .sk-v{font-size:14px;font-weight:700;}.sk-l{font-size:10px;color:#64748b;margin-top:3px;}
  .stmt-proj{border:1px solid #e2ecf5;border-radius:10px;padding:12px;margin-bottom:10px;}
  .stmt-proj-hdr{display:flex;justify-content:space-between;margin-bottom:8px;}
  .stmt-proj-title{font-size:12px;font-weight:700;color:#0d2137;}
  .stmt-inst-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
  .stmt-inst-item{border:1px solid #e2ecf5;border-radius:8px;padding:7px;text-align:center;}
  .stmt-inst-item.overdue{border-color:#f87171;background:#fff5f5;}
  .sii-n{font-size:9px;color:#64748b;font-weight:700;}.sii-d{font-size:10px;margin:2px 0;}.sii-a{font-size:11px;font-weight:700;color:#10b981;}
  .badge{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;}
  .bdg-active{background:#d1fae5;color:#065f46;}.bdg-done{background:#dbeafe;color:#1e40af;}.bdg-paused{background:#fef3c7;color:#92400e;}
  @media print{body{padding:8px;}}</style></head><body>
  ${content}
  <script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

// ═══════════════════════════════════════════
// EXPORT PAGE INIT (notify banner)
// ═══════════════════════════════════════════
const _origRenderExport = renderExport;
renderExport = function(){
  _origRenderExport();
  const b = g('notifBanner');
  if (b && 'Notification' in window && Notification.permission === 'default') b.style.display = 'flex';
  else if (b) b.style.display = 'none';
};

async function init(){
  loadDarkMode();
  initData();
  g('todayDate').textContent=today();
  initSearch();
  await initFirebase();
  await loadFileStore();
  // حفظ تلقائي كل 5 دقائق للتأكد من عدم ضياع البيانات
  setInterval(()=>{ if(fbReady) saveToStorage(); }, 5*60*1000);
  const hadSaved = await loadFromStorage();
  renderDash();
  updateBadges();
  initNotifications();
  if(!hadSaved) saveToStorage();
}
initAuth();

// Expose commonly used functions to `window` for inline HTML handlers
(() => {
  const names = [
    'doLogin','loginKeyPress','logout','toggleDataMenu','goDataSub','toggleArchiveMenu','goArchiveSub','toggleUserDropdown','showMyPwModal','showUserModal','doSaveUser','toggleDark','requestNotifPermission','goPage','showClientStatement','applyFilter','clearFilter','applyExpFilter','clearExpFilter','openAddExpModal','exportSheetExcel','exportFullExcelReport','exportFullPDFReport','exportJSON','g','exportFiltered','addInstRow','closeModal','saveRevRecord','saveExpRecord','closeInstModal','saveEdit','printClientStatement','settingsToggleDark','settingsBackup','settingsRestore','settingsClearAllData','doChangePassword','selectRevType','setContractType','setManualInstCount','setMaqInst','selectRevType'
  ];
  names.forEach(n=>{
    try{
      if(typeof window[n]==='undefined' && typeof eval(n)==='function') window[n]=eval(n);
    }catch(e){}
  });
})();
