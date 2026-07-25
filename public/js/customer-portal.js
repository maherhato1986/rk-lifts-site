(() => {
  const API_BASE = window.RKL_PORTAL_API || '/api/portal';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { registrationId: null, user: null, session: null, requests: [], files: [] };

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(state.session?.accessToken ? { Authorization: `Bearer ${state.session.accessToken}` } : {}), ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'تعذر إكمال العملية. حاول مرة أخرى.');
    return payload;
  }

  function showStep(id) {
    $$('.auth-card').forEach(card => card.classList.toggle('hidden', card.id !== id));
  }

  function message(element, text, isError = false) {
    element.textContent = text;
    element.classList.toggle('error', isError);
  }

  function maskEmail(email) {
    const [name, domain] = email.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }

  function maskPhone(phone) {
    return `+966 5*****${phone.slice(-3)}`;
  }

  $$('[data-show]').forEach(button => button.addEventListener('click', () => showStep(button.dataset.show)));
  $$('input[inputmode="numeric"]').forEach(input => input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, Number(input.maxLength) || 9);
  }));

  $('#registerForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    const status = $('#registerMessage');
    message(status, 'جاري إرسال رموز التحقق…');
    try {
      const result = await api('/auth/register/start', { method: 'POST', body: JSON.stringify(data) });
      state.registrationId = result.registrationId;
      $('#maskedEmail').textContent = maskEmail(data.email);
      $('#maskedPhone').textContent = maskPhone(data.phone);
      showStep('verifyStep');
      message(status, '');
    } catch (error) {
      message(status, error.message, true);
    }
  });

  $('#verifyForm').addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const status = $('#verifyMessage');
    message(status, 'جاري التحقق وإنشاء الحساب…');
    try {
      const result = await api('/auth/register/verify', {
        method: 'POST',
        body: JSON.stringify({ registrationId: state.registrationId, ...data })
      });
      enterPortal(result.user, result.session);
    } catch (error) {
      message(status, error.message, true);
    }
  });

  $('#resendCodes').addEventListener('click', async () => {
    const status = $('#verifyMessage');
    try {
      await api('/auth/register/resend', { method: 'POST', body: JSON.stringify({ registrationId: state.registrationId }) });
      message(status, 'تمت إعادة إرسال الرموز.');
    } catch (error) {
      message(status, error.message, true);
    }
  });

  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const status = $('#loginMessage');
    message(status, 'جاري إرسال رمز الدخول…');
    try {
      await api('/auth/login/start', { method: 'POST', body: JSON.stringify(data) });
      message(status, 'تم إرسال رمز الدخول. تحقق من وسيلة التواصل المسجلة.');
    } catch (error) {
      message(status, error.message, true);
    }
  });

  function enterPortal(user, session = state.session) {
    state.user = user;
    state.session = session;
    $('#authShell').classList.add('hidden');
    $('#portalApp').classList.remove('hidden');
    const name = user?.name || 'عميل RKL';
    const company = user?.company || 'الشركة';
    $('#userName').textContent = name;
    $('#userCompany').textContent = company;
    $('#userInitials').textContent = name.split(' ').slice(0, 2).map(part => part[0]).join('');
    $('#profileName').value = name;
    $('#profileCompany').value = company;
    $('#profileEmail').value = user?.email || '';
    $('#profilePhone').value = user?.phone ? `+966${user.phone}` : '';
  }

  const viewTitles = {
    overview: 'نظرة عامة', requests: 'طلبات الخدمة', projects: 'المشاريع والمصاعد',
    documents: 'الملفات والمخططات', quotes: 'عروض الأسعار',
    reports: 'التقارير المعتمدة', profile: 'بيانات الحساب'
  };

  $$('.sidebar nav button').forEach(button => button.addEventListener('click', () => {
    $$('.sidebar nav button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    $$('.view').forEach(view => view.classList.remove('active'));
    $(`#${button.dataset.view}View`).classList.add('active');
    $('#pageTitle').textContent = viewTitles[button.dataset.view];
    $('.sidebar').classList.remove('open');
  }));

  $('#menuToggle').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
  $('#logoutButton').addEventListener('click', async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch (_) {}
    location.href = 'customer-portal.html';
  });

  const dialog = $('#requestDialog');
  $$('[data-open-request]').forEach(button => button.addEventListener('click', () => dialog.showModal()));
  $$('[data-service]').forEach(button => button.addEventListener('click', () => {
    $('[name="service"]', dialog).value = button.dataset.service;
    dialog.showModal();
  }));

  $('#serviceRequestForm').addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const attachments = formData.getAll('attachments').filter(file => file.size);
    const data = Object.fromEntries([...formData.entries()].filter(([key]) => key !== 'attachments'));
    const status = $('#requestMessage');
    message(status, 'جاري تسجيل الطلب…');
    try {
      const result = await api('/requests', { method: 'POST', body: JSON.stringify(data) });
      if (attachments.length) await uploadFiles(attachments, result.request.id);
      message(status, `تم إرسال الطلب بنجاح. الرقم المرجعي: ${result.request.reference}`);
      state.requests.unshift(result.request);
      renderRequests();
      setTimeout(() => { dialog.close(); event.currentTarget.reset(); message(status, ''); }, 1800);
    } catch (error) {
      message(status, error.message, true);
    }
  });

  const uploadZone = $('#uploadZone');
  const fileInput = $('#fileInput');
  $('#uploadButton').addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', event => { event.preventDefault(); uploadZone.classList.add('dragging'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragging'));
  uploadZone.addEventListener('drop', event => {
    event.preventDefault();
    uploadZone.classList.remove('dragging');
    uploadFiles([...event.dataTransfer.files]);
  });
  fileInput.addEventListener('change', () => uploadFiles([...fileInput.files]));

  async function uploadFiles(files, requestId = null) {
    for (const file of files) {
      const ticket = await api('/files/upload-ticket', {
        method: 'POST',
        body: JSON.stringify({ name: file.name, type: file.type, size: file.size, requestId })
      });
      const response = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers || {}, body: file });
      if (!response.ok) throw new Error(`تعذر رفع الملف: ${file.name}`);
      const saved = await api('/files/complete', {
        method: 'POST',
        body: JSON.stringify({ fileId: ticket.fileId, requestId })
      });
      state.files.unshift(saved.file);
      renderFiles();
    }
  }

  function renderFiles() {
    $('#fileGrid').innerHTML = state.files.map(file => `<article class="file-card"><span>▤</span><div><b>${escapeHtml(file.name)}</b><small>${escapeHtml(file.status || 'تم الرفع')}</small></div></article>`).join('');
  }

  function renderRequests() {
    $('#openRequests').textContent = state.requests.filter(request => request.status !== 'closed').length;
    if (!state.requests.length) return;
    $('#requestsList').className = 'request-list';
    $('#requestsList').innerHTML = state.requests.map(request => `<article><div><b>${escapeHtml(request.project)}</b><small>${escapeHtml(request.reference)}</small></div><span>${escapeHtml(request.statusLabel || 'جديد')}</span></article>`).join('');
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  $('#saveProfile').addEventListener('click', async () => {
    const button = $('#saveProfile');
    button.disabled = true;
    try {
      const user = await api('/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: $('#profileName').value, company: $('#profileCompany').value })
      });
      enterPortal(user.user);
      button.textContent = 'تم الحفظ';
    } catch (error) {
      alert(error.message);
    } finally {
      setTimeout(() => { button.disabled = false; button.textContent = 'حفظ التعديلات'; }, 1300);
    }
  });

  async function boot() {
    try {
      const result = await api('/me');
      if (result.user) {
        enterPortal(result.user);
        const [requests, files] = await Promise.all([api('/requests'), api('/files')]);
        state.requests = requests.requests || [];
        state.files = files.files || [];
        renderRequests();
        renderFiles();
      }
    } catch (_) {
      // A missing or expired session intentionally leaves the secure sign-in screen visible.
    }
  }

  boot();
})();
