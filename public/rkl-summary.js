// يعتمد على بيانات rkl-map.js
// structure must contain: city_ar, city_en, elevators

const cityTotals = {};

rklProjects.forEach(p => {
  if(!cityTotals[p.city_en]){
    cityTotals[p.city_en] = {
      ar: p.city_ar,
      en: p.city_en,
      elevators: 0
    };
  }
  cityTotals[p.city_en].elevators += Number(p.elevators || 0);
});
document.addEventListener('DOMContentLoaded', () => {
  const data = [
    { city_en: "Riyadh", city_ar: "الرياض", elevators: 279 },
    { city_en: "Jeddah", city_ar: "جدة", elevators: 61 },
    { city_en: "Dammam", city_ar: "الدمام", elevators: 52 },
    { city_en: "Makkah", city_ar: "مكة المكرمة", elevators: 34 },
    { city_en: "Madinah", city_ar: "المدينة المنورة", elevators: 26 }
  ];

  const tbody = document.getElementById('rkl-cities-summary');
  if (!tbody) return;

  tbody.innerHTML = '';

  data.forEach(row => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${row.city_en}</td>
      <td>${row.city_ar}</td>
      <td style="text-align:center;font-weight:600;">
        ${row.elevators}
      </td>
    `;

    tbody.appendChild(tr);
  });
});

const tbody = document.getElementById("citiesTable");

Object.values(cityTotals).forEach(c => {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${c.ar}</td>
    <td>${c.en}</td>
    <td>${c.elevators}</td>
    <td>${c.elevators}</td>
  `;
  tbody.appendChild(tr);
});

