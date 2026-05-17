# 🔒 دليل الأمان - إعادة تعيين مفاتيح Firebase

## ⚠️ تنبيه أمني حرج

تم العثور على **مفاتيح Firebase الحقيقية معرضة على GitHub**. هذا يشكل خطراً أمنياً كبيراً!

---

## 📋 خطوات الإصلاح الفورية

### الخطوة 1️⃣: إعادة تعيين المفاتيح على Firebase Console

1. **اذهب إلى Firebase Console:**
   - https://console.firebase.google.com/project/almuhhet-accounting/settings/general

2. **انتقل إلى `Project Settings` (إعدادات المشروع)**
   
3. **في تبويب "General" اختر "Your Apps"**

4. **اختر تطبيقك (Web App)**
   - انسخ المفاتيح الجديدة

### الخطوة 2️⃣: إنشاء ملف .env آمن

1. أنشئ ملف جديد باسم `.env` في المجلد الرئيسي:

```bash
VITE_FIREBASE_API_KEY=الملفتاح_الجديد_هنا
VITE_FIREBASE_AUTH_DOMAIN=almuhhet-accounting.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=almuhhet-accounting
VITE_FIREBASE_STORAGE_BUCKET=almuhhet-accounting.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=المفتاح_الجديد_هنا
VITE_FIREBASE_APP_ID=المفتاح_الجديد_هنا
```

2. **تأكد من أن `.gitignore` يحتوي على `.env`** (تم إضافته بالفعل)

### الخطوة 3️⃣: تحديث app.js

تم تحديث app.js ليستخدم المتغيرات الآمنة:
```javascript
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "تم حذف المفتاح القديم",
  // ... الباقي
};
```

### الخطوة 4️⃣: مسح سجل Git (خطوة اختيارية لكن مهمة)

إذا كنت تريد إزالة المفاتيح القديمة من سجل Git بالكامل:

```bash
# خيار 1: استخدام BFG Repo-Cleaner (موصى به)
bfg --replace-text passwords.txt https://github.com/almuheetconsulting2026-sys/ALMUHHET-ACCOUNTING.git

# خيار 2: استخدام git filter-branch
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch app.js" \
  --prune-empty --tag-name-filter cat -- --all
  
git push -f origin main
```

### الخطوة 5️⃣: التحقق من الأمان

بعد إعادة تعيين المفاتيح، تحقق من:

1. ✅ لا توجد مفاتيح حقيقية في app.js بعد الآن
2. ✅ ملف .gitignore يحتوي على `.env`
3. ✅ تم الدفع إلى GitHub بنجاح
4. ✅ النظام يعمل مع المفاتيح الجديدة

---

## 🛡️ أفضل الممارسات الأمنية

### ✅ افعل:
- استخدم متغيرات البيئة (`.env`)
- أضف `.env` إلى `.gitignore`
- أعد تعيين المفاتيح بعد التعرض
- استخدم Firebase Security Rules القوية
- فعّل المصادقة الثنائية على حساب Google

### ❌ لا تفعل:
- لا تكشف المفاتيح في الكود المصدري
- لا تدفع ملفات `.env` إلى Git
- لا تستخدم نفس المفاتيح في بيئات مختلفة
- لا تشارك المفاتيح عبر البريد الإلكتروني

---

## 📞 معلومات الدعم

### رابط Firebase Console:
https://console.firebase.google.com/project/almuhhet-accounting/settings/general

### توثيق Firebase الأمان:
https://firebase.google.com/docs/projects/learn-more#securely-manage-api-keys

### أدوات للكشف عن تسرب المفاتيح:
- https://github.com/gitleaks/gitleaks
- https://rtyley.github.io/bfg-repo-cleaner/

---

## ✅ قائمة التحقق

- [ ] تم إعادة تعيين مفاتيح Firebase
- [ ] تم إنشاء ملف .env بالمفاتيح الجديدة
- [ ] تم تحديث app.js
- [ ] تم حذف المفاتيح القديمة من سجل Git
- [ ] تم الدفع إلى GitHub
- [ ] تم اختبار النظام والتأكد من عمله

---

**تم آخر تحديث:** 2026-05-17
**حالة الأمان:** 🔴 يتطلب إجراء فوري
