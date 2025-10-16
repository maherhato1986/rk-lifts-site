const YEAR_EL = document.getElementById('year');
if (YEAR_EL) YEAR_EL.textContent = new Date().getFullYear();

// Mobile nav
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
hamburger?.addEventListener('click', () => {
  const hidden = mobileNav.hasAttribute('hidden');
  hidden ? mobileNav.removeAttribute('hidden') : mobileNav.setAttribute('hidden', '');
});

// --- i18n ---
const LANGS = { ar: { dir: 'rtl', label: 'EN' }, en: { dir: 'ltr', label: 'العربية' } };
const DEFAULT_LANG = 'ar';

function getInitialLang(){
  const saved = localStorage.getItem('rkl_lang');
  const urlParam = new URLSearchParams(location.search).get('lang');
  return (urlParam && LANGS[urlParam]) ? urlParam : (saved && LANGS[saved] ? saved : DEFAULT_LANG);
}

async function loadLang(lang){
  const res = await fetch(`/i18n/${lang}.json`);
  const dict = await res.json();

  // html lang/dir
  document.documentElement.lang = lang;
  document.documentElement.dir = LANGS[lang].dir;

  // زر التبديل
  const toggle = document.getElementById('langToggle');
  if (toggle) toggle.textContent = LANGS[lang].label;

  // تطبيق الترجمات
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const value = key.split('.').reduce((o,k)=> (o||{})[k], dict);
    if (typeof value === 'string'){
      if (el.tagName === 'META' && el.hasAttribute('content')) el.setAttribute('content', value);
      else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.setAttribute('placeholder', value);
      else el.textContent = value;
    }
  });

  // SEO: عنوان ووصف
  document.title = dict.meta?.title || document.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && dict.meta?.description) metaDesc.setAttribute('content', dict.meta.description);

  // JSON-LD محدث
  const jsonld = {
    "@context":"https://schema.org",
    "@type":"Organization",
    "name": dict.brand || "RKL Lifts & Escalators",
    "url":"https://www.rk-lifts.com",
    "logo":"https://www.rk-lifts.com/public/images/logo.png",
    "telephone":"+966114774021",
    "email":"admin@rk-lifts.com",
    "address":{"@type":"PostalAddress","addressLocality":"Riyadh","streetAddress":"Al-Sulaymaniyah","addressCountry":"SA"}
  };
  const jsonldEl = document.getElementById('org-jsonld');
  if (jsonldEl) jsonldEl.textContent = JSON.stringify(jsonld);
}

// تفعيل
let currentLang = getInitialLang();
loadLang(currentLang);

// تبديل اللغة
document.getElementById('langToggle')?.addEventListener('click', () => {
  currentLang = (currentLang === 'ar') ? 'en' : 'ar';
  localStorage.setItem('rkl_lang', currentLang);
  // حدّث الاستعلام في العنوان بدون إعادة تحميل
  const url = new URL(location.href);
  url.searchParams.set('lang', currentLang);
  history.replaceState({}, '', url);
  loadLang(currentLang);
});

// نموذج التواصل (مؤقت)
document.forms.contact?.addEventListener('submit', (e)=>{
  e.preventDefault();
  alert(document.documentElement.lang === 'ar'
    ? 'تم استلام طلبك، سنعاود الاتصال بك قريبًا. شكراً لك.'
    : 'Your request has been received. We will contact you shortly. Thank you.');
  e.target.reset();
});
