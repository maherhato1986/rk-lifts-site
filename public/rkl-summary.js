document.addEventListener('DOMContentLoaded', () => {

  if (typeof rklProjects === 'undefined') {
    console.error('rklProjects not found');
    return;
  }

  const totals = {};
  const tbody = document.getElementById('rkl-cities-summary');
  if (!tbody) return;

  rklProjects.forEach(p => {
    if (!p.city_en) return;

    if (!totals[p.city_en]) {
      totals[p.city_en] = {
        ar: p.city_ar || p.city_en,
        en: p.city_en,
        elevators: 0
      };
    }

    totals[p.city_en].elevators += Number(p.elevators || 0);
  });

  tbody.innerHTML = '';

  Object.values(totals).forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.ar}</td>
      <td>${c.en}</td>
      <td>${c.elevators}</td>
      <td>${c.elevators}</td>
    `;
    tbody.appendChild(tr);
  });

});
