(() => {
  const cabins = Array.from({ length: 14 }, (_, index) => {
    const number = index + 1;
    const groups = ['Modern', 'Luxury', 'Premium'];
    return {
      code: `C-${String(number).padStart(2, '0')}`,
      title: `RKL Cabin Design ${String(number).padStart(2, '0')}`,
      category: groups[index % groups.length],
      image: `public/images/cabin designs${number}.jpeg`,
      description: index % 3 === 0
        ? 'Contemporary stainless-steel concept with coordinated lighting and premium detailing.'
        : index % 3 === 1
          ? 'Luxury decorative concept suitable for residential, hospitality, and executive projects.'
          : 'Balanced premium finish for commercial, public, and mixed-use buildings.'
    };
  });

  function injectStyles() {
    if (document.getElementById('rklCabinCatalogStyles')) return;
    const style = document.createElement('style');
    style.id = 'rklCabinCatalogStyles';
    style.textContent = `
      .cabin-catalog-panel{margin-top:24px;padding:28px!important;overflow:hidden}
      .cabin-catalog-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}
      .cabin-catalog-head h3{margin:4px 0 6px;font-size:clamp(1.45rem,3vw,2rem);color:#0b3a31}
      .cabin-catalog-head p{margin:0;color:#71817b;line-height:1.7}
      .cabin-count{flex:0 0 auto;padding:8px 12px;border-radius:999px;background:#ecf7f2;color:#087a54;font-size:.78rem;font-weight:800}
      .cabin-filters{display:flex;flex-wrap:wrap;gap:9px;margin:0 0 20px}
      .cabin-filter{border:1px solid #d4e4dd;background:#fff;color:#46615a;border-radius:999px;padding:9px 14px;font-weight:800;cursor:pointer}
      .cabin-filter.active{background:#0b493d;color:#fff;border-color:#0b493d}
      .cabin-gallery{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
      .cabin-card-portal{position:relative;border:1px solid #dbe8e3;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 8px 20px rgba(13,61,50,.06);cursor:pointer;transition:.22s ease}
      .cabin-card-portal:hover{transform:translateY(-4px);box-shadow:0 16px 34px rgba(13,61,50,.13)}
      .cabin-card-portal img{width:100%;aspect-ratio:3/4;display:block;object-fit:cover;background:#eef4f1}
      .cabin-card-copy{padding:13px}
      .cabin-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
      .cabin-code-pill{display:inline-flex;padding:5px 8px;border-radius:999px;background:#0b493d;color:#fff;font-size:.7rem;font-weight:800;letter-spacing:.6px}
      .cabin-category{font-size:.7rem;font-weight:800;color:#0a9b6b;text-transform:uppercase;letter-spacing:.7px}
      .cabin-card-copy b{display:block;color:#123d34;font-size:.94rem;line-height:1.35}
      .cabin-card-copy small{display:block;color:#7b8984;margin-top:5px;line-height:1.5}
      .cabin-card-action{display:flex;align-items:center;justify-content:space-between;margin-top:11px;color:#087a54;font-size:.78rem;font-weight:800}
      .cabin-note{margin:17px 0 0;color:#82918c;font-size:.76rem;line-height:1.65}
      .cabin-modal{border:0;padding:0;border-radius:24px;width:min(900px,calc(100% - 28px));box-shadow:0 28px 90px rgba(0,0,0,.28);overflow:hidden}
      .cabin-modal::backdrop{background:rgba(3,24,19,.72);backdrop-filter:blur(4px)}
      .cabin-modal-layout{display:grid;grid-template-columns:1.05fr .95fr;background:#fff}
      .cabin-modal-image{min-height:540px;background:#e8f0ed}
      .cabin-modal-image img{width:100%;height:100%;min-height:540px;object-fit:cover;display:block}
      .cabin-modal-copy{padding:34px;display:flex;flex-direction:column}
      .cabin-modal-close{align-self:flex-end;border:0;width:38px;height:38px;border-radius:50%;background:#edf4f1;color:#133d35;font-size:1.35rem;cursor:pointer}
      .cabin-modal-copy h2{color:#0b3a31;margin:22px 0 10px;font-size:1.75rem}
      .cabin-modal-copy p{color:#6e7f79;line-height:1.75}
      .cabin-specs{display:grid;gap:10px;margin:18px 0 24px;padding:0;list-style:none}
      .cabin-specs li{padding:11px 0;border-bottom:1px solid #e4ece9;color:#435c55;font-size:.88rem}
      .cabin-specs li:before{content:'✓';color:#0aa873;font-weight:900;margin-right:10px}
      .cabin-select-button{margin-top:auto;border:0;border-radius:14px;padding:15px 18px;background:#0b493d;color:#fff;font-weight:800;cursor:pointer}
      @media(max-width:1050px){.cabin-gallery{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:760px){.cabin-catalog-panel{padding:20px!important}.cabin-gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cabin-modal-layout{grid-template-columns:1fr}.cabin-modal-image,.cabin-modal-image img{min-height:350px;max-height:430px}.cabin-modal-copy{padding:24px}.cabin-catalog-head{align-items:flex-start;flex-direction:column}}
      @media(max-width:420px){.cabin-gallery{grid-template-columns:1fr 1fr}.cabin-card-copy{padding:10px}.cabin-card-copy small{display:none}}
    `;
    document.head.appendChild(style);
  }

  function buildModal() {
    let modal = document.getElementById('cabinCatalogModal');
    if (modal) return modal;
    modal = document.createElement('dialog');
    modal.id = 'cabinCatalogModal';
    modal.className = 'cabin-modal';
    modal.innerHTML = `
      <div class="cabin-modal-layout">
        <div class="cabin-modal-image"><img id="cabinModalImage" alt="RKL elevator cabin"></div>
        <div class="cabin-modal-copy">
          <button class="cabin-modal-close" type="button" aria-label="Close">×</button>
          <span class="eyebrow" id="cabinModalCategory">CABIN COLLECTION</span>
          <h2 id="cabinModalTitle"></h2>
          <p id="cabinModalDescription"></p>
          <ul class="cabin-specs">
            <li>Finishes and colors can be coordinated with the project.</li>
            <li>Lighting, flooring, handrails, and fixtures are customizable.</li>
            <li>Final selection is subject to technical and dimensional approval.</li>
          </ul>
          <button class="cabin-select-button" id="selectCabinButton" type="button">Request this cabin design</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.cabin-modal-close').addEventListener('click', () => modal.close());
    modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
    return modal;
  }

  function openCabin(cabin) {
    const modal = buildModal();
    modal.dataset.code = cabin.code;
    modal.dataset.title = cabin.title;
    modal.querySelector('#cabinModalImage').src = cabin.image;
    modal.querySelector('#cabinModalImage').alt = `${cabin.title} — ${cabin.code}`;
    modal.querySelector('#cabinModalCategory').textContent = `${cabin.category.toUpperCase()} · ${cabin.code}`;
    modal.querySelector('#cabinModalTitle').textContent = cabin.title;
    modal.querySelector('#cabinModalDescription').textContent = cabin.description;
    modal.showModal();
  }

  function renderCards(container, filter = 'All') {
    const list = filter === 'All' ? cabins : cabins.filter(cabin => cabin.category === filter);
    container.innerHTML = list.map(cabin => `
      <article class="cabin-card-portal" tabindex="0" role="button" data-code="${cabin.code}" aria-label="View ${cabin.title}">
        <img src="${cabin.image}" alt="${cabin.title}" loading="lazy" decoding="async">
        <div class="cabin-card-copy">
          <div class="cabin-card-top"><span class="cabin-code-pill">${cabin.code}</span><span class="cabin-category">${cabin.category}</span></div>
          <b>${cabin.title}</b>
          <small>Custom finishes available</small>
          <span class="cabin-card-action">View design <span>↗</span></span>
        </div>
      </article>`).join('');
    container.querySelectorAll('[data-code]').forEach(card => {
      const activate = () => openCabin(cabins.find(cabin => cabin.code === card.dataset.code));
      card.addEventListener('click', activate);
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } });
    });
  }

  function init() {
    const overview = document.getElementById('overviewView');
    if (!overview || document.getElementById('cabinCatalogPanel')) return;
    injectStyles();
    const activity = overview.querySelector('.activity-panel');
    const panel = document.createElement('article');
    panel.id = 'cabinCatalogPanel';
    panel.className = 'panel cabin-catalog-panel';
    panel.innerHTML = `
      <div class="cabin-catalog-head">
        <div><span class="eyebrow">ELEVATOR CABIN COLLECTION</span><h3>Choose a cabin style for your project</h3><p>Explore RKL cabin concepts and send the selected design directly with your service request.</p></div>
        <span class="cabin-count">14 DESIGNS</span>
      </div>
      <div class="cabin-filters" aria-label="Cabin design filters">
        <button class="cabin-filter active" type="button" data-filter="All">All</button>
        <button class="cabin-filter" type="button" data-filter="Modern">Modern</button>
        <button class="cabin-filter" type="button" data-filter="Luxury">Luxury</button>
        <button class="cabin-filter" type="button" data-filter="Premium">Premium</button>
      </div>
      <div class="cabin-gallery" id="cabinGallery"></div>
      <p class="cabin-note">Concept images are indicative. Final materials, dimensions, colors, and component selections are subject to the approved project scope and technical coordination.</p>`;
    overview.insertBefore(panel, activity || null);
    const gallery = panel.querySelector('#cabinGallery');
    renderCards(gallery);
    panel.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      panel.querySelectorAll('[data-filter]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      renderCards(gallery, button.dataset.filter);
    }));

    const modal = buildModal();
    modal.querySelector('#selectCabinButton').addEventListener('click', () => {
      const code = modal.dataset.code;
      const title = modal.dataset.title;
      modal.close();
      const requestDialog = document.getElementById('requestDialog');
      const requestType = document.getElementById('requestType');
      if (requestType) requestType.value = 'new-elevator';
      const description = requestDialog?.querySelector('[name="description"]');
      if (description) description.value = `Selected elevator cabin: ${code} — ${title}\n\nPlease provide a technical and commercial proposal for this cabin design, subject to project dimensions and approved finishes.`;
      if (requestDialog?.showModal) requestDialog.showModal();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
