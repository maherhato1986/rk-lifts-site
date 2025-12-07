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
