// سنة الحقوق
document.getElementById('year').textContent = new Date().getFullYear();

// فتح/إغلاق قائمة الجوال
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
hamburger?.addEventListener('click', () => {
  const hidden = mobileNav.hasAttribute('hidden');
  if (hidden) mobileNav.removeAttribute('hidden'); else mobileNav.setAttribute('hidden','');
});

// تبديل اللغة (بسيط: RTL/ LTR + نصوص رئيسية)
// يمكن لاحقًا ربطه بملفات ترجمة JSON
const langToggle = document.getElementById('langToggle');
langToggle?.addEventListener('click', () => {
  const html = document.documentElement;
  const ar = html.lang === 'ar';
  if (ar){
    html.lang = 'en'; html.dir = 'ltr';
    langToggle.textContent = 'العربية';
    // مثال: تغيير بعض العناوين الرئيسية فقط (يمكن توسيعه)
    document.querySelector('h1')?.replaceChildren(document.createTextNode('Innovating Safety. Elevating Quality.'));
    document.querySelector('#contact h2')?.replaceChildren(document.createTextNode('Contact Us'));
  } else {
    html.lang = 'ar'; html.dir = 'rtl';
    langToggle.textContent = 'EN';
    document.querySelector('h1')?.replaceChildren(document.createTextNode('نُحدِّث الأمان ونرتقي بالجودة'));
    document.querySelector('#contact h2')?.replaceChildren(document.createTextNode('تواصل معنا'));
  }
});

// معالجة فورية لنموذج التواصل (يمكن استبدالها بإرسال فعلي)
document.forms.contact?.addEventListener('submit', (e)=>{
  e.preventDefault();
  alert('تم استلام طلبك، سنعاود الاتصال بك قريبًا. شكراً لك.');
  e.target.reset();
});
