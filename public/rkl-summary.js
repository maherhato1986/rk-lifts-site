document.addEventListener('DOMContentLoaded', () => {

  if (typeof window.RKL_CITY_DATA === 'undefined') {
    console.error('RKL_CITY_DATA not found (check rkl-map.js)');
    return;
  }

  const tbody = document.getElementById('rkl-cities-summary');
  if (!tbody) {
    console.warn('Table body not found: rkl-cities-summary');
    return;
  }

  tbody.innerHTML = '';

  Object.values(window.RKL_CITY_DATA).forEach(city => {
    const totalLifts = city.projects.reduce(
      (sum, p) => sum + (Number(p.lifts) || 0),
      0
    );

    if (totalLifts === 0) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${city.name}</td>
      <td>${city.name}</td>
      <td style="text-align:center;font-weight:700;">
        ${totalLifts}
      </td>
    `;
    tbody.appendChild(tr);
  });

});
