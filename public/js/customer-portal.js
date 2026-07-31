(() => {
  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });

  loadScript('https://raw.githubusercontent.com/maherhato1986/rk-lifts-site/96ce0daae289e33f1150194e7b7f068b27724563/public/js/customer-portal.js')
    .then(() => loadScript('public/js/cabin-catalog.js?v=20260731-1'))
    .catch((error) => {
      console.error('RKL portal loader error:', error);
      const fallback = document.createElement('div');
      fallback.style.cssText = 'margin:20px;padding:16px;border-radius:12px;background:#fff3cd;color:#664d03;font-family:Arial,sans-serif';
      fallback.textContent = 'The client portal could not finish loading. Please refresh the page or contact admin@rkl.sa.';
      document.body.prepend(fallback);
    });
})();
