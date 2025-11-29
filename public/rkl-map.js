// خريطة مشاريع المصاعد RKL داخل المملكة
// هذا الملف يعتمد على Leaflet + OpenStreetMap

const cityData = {
  "ابها": {
    "name": "ابها",
    "coords": [18.2465, 42.5117],
    "projects": [
      { "name": "كلية التقنية للبنين", "lifts": 8 }
    ]
  },
  "الاحساء": {
    "name": "الاحساء",
    "coords": [25.3833, 49.5833],
    "projects": [
      { "name": "مشروع الكلية التقنية للبنين", "lifts": 6 },
      { "name": "معهد البناء والتشييد", "lifts": 19 }
    ]
  },
  "الباحة": {
    "name": "الباحة",
    "coords": [20.0129, 41.4677],
    "projects": [
      { "name": "المعهد الصناعي الثانوي بالباحة", "lifts": 1 }
    ]
  },
  "الجبيل": {
    "name": "الجبيل",
    "coords": [27.0046, 49.646],
    "projects": [
      { "name": "مشروع اسكان البحرية في الجبيل", "lifts": 16 }
    ]
  },
  "الخبر": {
    "name": "الخبر",
    "coords": [26.2172, 50.1971],
    "projects": [
      { "name": "مشروع الكلية التقنية للبنات", "lifts": 9 }
    ]
  },
  "الخفجي": {
    "name": "الخفجي",
    "coords": [28.4392, 48.4913],
    "projects": [
      { "name": "مشؤوع انشاء مكتب العمل", "lifts": 4 }
    ]
  },
  "الرياض": {
    "name": "الرياض",
    "coords": [24.7136, 46.6753],
    "projects": [
      { "name": "الكلية التقنية", "lifts": 5 },
      { "name": "مبنى تجارى ش الاحساء 2", "lifts": 2 },
      { "name": "مبنى مكاتب وقاعات دراسية -جامعة الامير خالد", "lifts": 1 },
      { "name": "مشروع انشاء المعهد الصناعي الثانوي", "lifts": 13 },
      { "name": "مشروع انشاء فيلا خاصة بالرياض", "lifts": 421 },
      { "name": "مشروع فيلا بمخرخ (14)", "lifts": 1 },
      { "name": "معهد اعداد المدربات", "lifts": 9 }
    ]
  },
  "الشملي": {
    "name": "الشملي",
    "coords": [27.25, 40.0],
    "projects": [
      { "name": "مشروع المعهد الصناعي الثانوي", "lifts": 1 }
    ]
  },
  "الطائف": {
    "name": "الطائف",
    "coords": [21.4373, 40.5127],
    "projects": [
      { "name": "مشروع تابع لوزارة التعليم", "lifts": 4 }
    ]
  },
  "القصيم": {
    "name": "القصيم",
    "coords": [26.2, 43.9667],
    "projects": [
      { "name": "فرع الكلية التقنية - بالبدائع", "lifts": 2 },
      { "name": "مشروع اسكان المدربين والمتدربين للمعهد السعودي", "lifts": 6 }
    ]
  },
  "القطيف": {
    "name": "القطيف",
    "coords": [26.5687, 50.0089],
    "projects": [
      { "name": "مشروع مبني التدريب اللالكتروني بالكلية التقنية", "lifts": 2 }
    ]
  },
  "المدينة المنورة": {
    "name": "المدينة المنورة",
    "coords": [24.5247, 39.5692],
    "projects": [
      { "name": "مشروع انشاء دار الفتيات بالمدينة المنورة", "lifts": 5 }
    ]
  },
  "المزاحمية": {
    "name": "المزاحمية",
    "coords": [24.5333, 46.2667],
    "projects": [
      { "name": "كلية التقنية", "lifts": 5 },
      { "name": "مشروع اسكان المدربين بالكلية التقنية للبنين كلية التميز", "lifts": 20 }
    ]
  },
  "الوجه": {
    "name": "الوجه",
    "coords": [26.2455, 36.4525],
    "projects": [
      { "name": "مشروع مبني التدريب اللالكتروني", "lifts": 2 }
    ]
  },
  "بريدة": {
    "name": "بريدة",
    "coords": [26.3596, 43.979],
    "projects": [
      { "name": "كلية الغذاء والبيئة", "lifts": 11 }
    ]
  },
  "بلقران": {
    "name": "بلقران",
    "coords": [19.8, 41.9],
    "projects": [
      { "name": "مبنى فرع وزارة المالية", "lifts": 2 }
    ]
  },
  "تنومه": {
    "name": "تنومه",
    "coords": [19.15, 41.98],
    "projects": [
      { "name": "مشروع استكمال انشاء المعهد الصناعي", "lifts": 17 }
    ]
  },
  "جازان": {
    "name": "جازان",
    "coords": [16.8892, 42.5706],
    "projects": [
      { "name": "اسكان للمدربين والمتدربين وفندق تدريب للمعهد السعودى للفندقة والسياحة", "lifts": 1 },
      { "name": "معهد للبنات", "lifts": 6 }
    ]
  },
  "جدة": {
    "name": "جدة",
    "coords": [21.4858, 39.1925],
    "projects": [
      { "name": "اسكان المدربين والمتدربين-جينرال موتورز", "lifts": 6 },
      { "name": "اسكان معهد اعداد المدربات", "lifts": 3 },
      { "name": "الاكاديمية السعودية للطيران المدنى", "lifts": 7 },
      { "name": "المعهد السعودى للتقنيات الالمانية", "lifts": 1 },
      { "name": "المعهد العالى التقنى الثانى", "lifts": 15 },
      { "name": "مبنى اعادة التأهيل ومركز السكر مدينة الملك عبدالعزيز الطبية", "lifts": 12 },
      { "name": "مركز القلب والاوعية الدموية مدينة الملك عبدالعزيز الطبية", "lifts": 4 },
      { "name": "مشروع انشاء الاكاديمية السعودية للطيران المدني", "lifts": 1 }
    ]
  },
  "خميس مشيط": {
    "name": "خميس مشيط",
    "coords": [18.3, 42.7333],
    "projects": [
      { "name": "مشروع انشاء كلية السياحة والفندقة واسكان المدربين", "lifts": 4 }
    ]
  },
  "سكاكا": {
    "name": "سكاكا",
    "coords": [29.9697, 40.2064],
    "projects": [
      { "name": "مختبر وبنك الدم ومركز السموم التابع للشؤون الصحية", "lifts": 1 }
    ]
  },
  "عرعر": {
    "name": "عرعر",
    "coords": [30.9753, 41.0381],
    "projects": [
      { "name": "مشروع انشاء المدربين للمعهد التقني للتعدين بعرعر", "lifts": 5 }
    ]
  },
  "عسير": {
    "name": "عسير",
    "coords": [19.0, 42.0],
    "projects": [
      { "name": "المعهد الصناعى بالمجاردة", "lifts": 7 },
      { "name": "مشروع المعهد الصناعي نجران وجازان وحبونا ومشيط", "lifts": 5 },
      { "name": "مشروعي متوسطة عبد الرحمن الداخل وثانوية الوفاق", "lifts": 13 }
    ]
  },
  "عفيف": {
    "name": "عفيف",
    "coords": [23.8859, 45.0792],
    "projects": [
      { "name": "انشاء مبني فرع وزارة المالية", "lifts": 2 }
    ]
  },
  "مجمعة": {
    "name": "مجمعة",
    "coords": [25.9, 45.35],
    "projects": [
      { "name": "مبني مكتب العمل بالمجمعة", "lifts": 2 }
    ]
  },
  "محايل": {
    "name": "محايل",
    "coords": [18.55, 41.95],
    "projects": [
      { "name": "مبنى فرع وزارة المالية", "lifts": 3 }
    ]
  },
  "مكة": {
    "name": "مكة",
    "coords": [21.3891, 39.8579],
    "projects": [
      { "name": "مشروع انشاء المدربين والمدربات بالكلية التقنية للبنين", "lifts": 31 },
      { "name": "مشروع مبني التدريب اللالكتروني", "lifts": 2 }
    ]
  },
  "نجران": {
    "name": "نجران",
    "coords": [17.565, 44.2289],
    "projects": [
      { "name": "اسكان المدربات بالكلية التقنية للبنات-كليات التميز", "lifts": 5 },
      { "name": "مشروع انشاء الكلية التقنية للبنات بشروة", "lifts": 15 }
    ]
  },
  "وادى الدواسر": {
    "name": "وادى الدواسر",
    "coords": [20.4607, 44.821],
    "projects": [
      { "name": "مشروع انشاء مبنى البلدية بوادى الدواسر", "lifts": 42 }
    ]
  },
  "ينبع": {
    "name": "ينبع",
    "coords": [24.0895, 38.0618],
    "projects": [
      { "name": "الكلية التقنية للبنات بينبع", "lifts": 3 }
    ]
  }
};

// حساب إجمالي المشاريع والمصاعد لمدينة معيّنة
function rklCalcTotals(cityKey) {
  const city = cityData[cityKey];
  if (!city) return { projects: 0, lifts: 0 };
  const projects = city.projects.length;
  const lifts = city.projects.reduce((sum, p) => sum + (p.lifts || 0), 0);
  return { projects, lifts };
}

function rklInitMap() {
  const mapEl = document.getElementById('leafletMap');
  if (!mapEl || typeof L === 'undefined') {
    console.warn('Leaflet map container or library not found.');
    return;
  }

  const map = L.map('leafletMap', { zoomControl: true }).setView([23.8859, 45.0792], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const rklIcon = L.divIcon({
    html: '<div style="background:#0fb67a;border-radius:999px;padding:6px 8px;color:#fff;font-weight:800;font-size:11px;box-shadow:0 4px 10px rgba(0,0,0,.35);">●</div>',
    className: '',
    iconSize: [26, 26]
  });

  const titleEl = document.getElementById('cityTitle');
  const summaryEl = document.getElementById('citySummary');
  const projectsCountEl = document.getElementById('cityProjectsCount');
  const liftsCountEl = document.getElementById('cityLiftsCount');
  const listEl = document.getElementById('cityProjectsList');

  // دالة واحدة فقط لتحديث بيانات المدينة
  function renderCity(cityKey, pan = true) {
    const city = cityData[cityKey];
    if (!city) return;

    const totals = rklCalcTotals(cityKey);

    if (pan) {
      map.setView(city.coords, 6);
    }

    if (titleEl) {
      titleEl.textContent = `RKL Elevator Installations & Maintenance Projects in Saudi Arabia`;
    }

    if (summaryEl) {
      summaryEl.textContent =
        `تم تنفيذ/صيانة ${totals.lifts} مصعد ضمن ${totals.projects} مشروع في ${city.name} داخل المملكة العربية السعودية.`;
    }

    if (projectsCountEl) projectsCountEl.textContent = totals.projects;
    if (liftsCountEl) liftsCountEl.textContent = totals.lifts;

    if (listEl) {
      listEl.innerHTML = "";
      city.projects.forEach(p => {
        const li = document.createElement("li");
        li.style.padding = "8px 0";
        li.style.borderBottom = "1px dashed #eef2f5";
        li.innerHTML =
          `<strong style="color:#0f766e;font-size:0.85rem;">${p.lifts} مصعد</strong> — ` +
          `<span style="font-size:0.9rem;">${p.name}</span>`;
        listEl.appendChild(li);
      });
    }
  }

  // إنشاء الماركرات وربط النقر
  Object.keys(cityData).forEach(key => {
    const c = cityData[key];
    const marker = L.marker(c.coords, { icon: rklIcon }).addTo(map);
    marker.on('click', () => renderCity(key, true));
  });

  // اختيار افتراضي: الرياض إن وجدت، وإلا أول مدينة
  if (cityData["الرياض"]) {
    renderCity("الرياض", true);
  } else {
    const keys = Object.keys(cityData);
    if (keys.length) renderCity(keys[0], true);
  }
}

// تهيئة الخريطة بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', rklInitMap);
