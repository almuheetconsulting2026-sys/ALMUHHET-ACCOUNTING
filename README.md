# 🌊 المحيط للاستشارات الهندسية – نظام مالي متكامل

نظام محاسبي متكامل لإدارة الإيرادات والمصاريف والتقارير المالية مع تخزين سحابي عبر Firebase.

---

## 📁 هيكل المشروع

```
ALMUHHET-ACCOUNTING/
├── index.html      → هيكل الصفحة الرئيسية
├── styles.css      → كل التصميم والوضع الداكن
├── app.js          → كل منطق التطبيق + Firebase
└── README.md       → هذا الملف
```

---

## 🚀 خطوات النشر على GitHub Pages

### 1. رفع الملفات على GitHub
```bash
git init
git add index.html styles.css app.js README.md
git commit -m "🚀 initial commit – Al Muhheet Financial System"
git branch -M main
git remote add origin https://github.com/almuheetconsulting2026-sys/ALMUHHET-ACCOUNTING.git
git push -u origin main
```

### 2. تفعيل GitHub Pages
- اذهب إلى **Settings → Pages**
- اختر **Branch: main / root**
- احفظ، وسيكون الرابط:
  `https://almuheetconsulting2026-sys.github.io/ALMUHHET-ACCOUNTING/`

---

## 🔥 إعدادات Firebase (مُهيّأة مسبقاً)

الإعدادات موجودة في ملف `app.js` وجاهزة للاستخدام:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDUwgRv35xC-Ppai5-urZvNPamKR8E8-CA",
  authDomain:        "almuhhet-accounting.firebaseapp.com",
  projectId:         "almuhhet-accounting",
  storageBucket:     "almuhhet-accounting.firebasestorage.app",
  messagingSenderId: "574319906803",
  appId:             "1:574319906803:web:8c1c4941c11c3959bd4c86",
  measurementId:     "G-XGQWD4NN8Z"
};
```

### قواعد Firestore (للأمان)
في **Firestore → Rules** أدخل:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /almuheet/{document} {
      allow read, write: if true;
    }
  }
}
```

---

## ✨ المميزات

| الميزة | التفاصيل |
|--------|----------|
| 📊 لوحة تحكم | ملخص مالي مع رسوم بيانية تفاعلية |
| 💰 الإيرادات | 5 أنواع: تصميم داخلي، إشراف، جرافيك، بنك، أخرى |
| 💸 المصاريف | تصنيف وتتبع جميع المصاريف |
| 📈 التقارير | تقارير احترافية مع تصدير Excel و PDF |
| 🗂️ الأرشيف | حفظ وعرض وتحميل وطباعة جميع المستندات |
| 🔔 التنبيهات | تنبيهات الدفعات المتأخرة والأقساط القادمة |
| 🔥 Firebase | تخزين سحابي تلقائي مع نسخ احتياطية محلية |
| 📤 التصدير | Excel • PDF • JSON • طباعة مباشرة |
| 🌙 الوضع الداكن | دعم كامل للوضع الداكن |

---

## 🛠️ التقنيات المستخدمة

- **HTML5 + CSS3 + JavaScript** (بدون إطار عمل)
- **Firebase Firestore** – تخزين سحابي
- **Chart.js** – الرسوم البيانية
- **SheetJS (XLSX)** – تصدير Excel
- **jsPDF** – تصدير PDF
- **Google Fonts (Cairo)** – خط عربي احترافي

---

## 📝 ملاحظات

- الملفات المرفقة (عقود، سندات) تُخزَّن محلياً في المتصفح بسبب حجمها
- البيانات المالية تُحفظ في Firebase مع نسخة احتياطية محلية تلقائية
- يعمل بدون إنترنت (يستخدم LocalStorage كاحتياطي)

---

© 2025 المحيط للاستشارات الهندسية
