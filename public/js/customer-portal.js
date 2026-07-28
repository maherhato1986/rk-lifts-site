(() => {
  const API_BASE = window.RKL_PORTAL_API || '/api/portal';
  const SESSION_KEY = 'rklPortalSession';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { registrationId: null, smsRequired: false, loginEmail: '', user: null, session: null, requests: [], files: [] };

  function saveSession(session) {
    state.session = session || null;
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  function loadSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch (_) { localStorage.removeItem(SESSION_KEY); return null; }
  }

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(state.session?.accessToken ? { Authorization: `Bearer ${state.session.accessToken}` } : {}), ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Unable to complete the request. Please try again.');
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
  const requestedView = new URLSearchParams(location.search).get('view');
  if (requestedView === 'login') showStep('loginStep');
  if (requestedView === 'register') showStep('registerStep');
  $$('input[inputmode="numeric"]').forEach(input => input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, Number(input.maxLength) || 9);
  }));

  $('#registerForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    const status = $('#registerMessage');
    message(status, 'Sending your verification code…');
    try {
      const result = await api('/auth/register/start', { method: 'POST', body: JSON.stringify(data) });
      state.registrationId = result.registrationId;
      state.smsRequired = Boolean(result.smsRequired);
      $('#maskedEmail').textContent = maskEmail(data.email);
      $('#maskedPhone').textContent = maskPhone(data.phone);
      $('#phoneDeliverySummary').classList.toggle('hidden', !state.smsRequired);
      $('#phoneCodeField').classList.toggle('hidden', !state.smsRequired);
      $('[name="phoneCode"]').required = state.smsRequired;
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
    message(status, 'Verifying and creating your account…');
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
      message(status, 'A new verification code has been sent.');
    } catch (error) {
      message(status, error.message, true);
    }
  });

  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const status = $('#loginMessage');
    message(status, 'Sending your sign-in code…');
    try {
      const result = await api('/auth/login/start', { method: 'POST', body: JSON.stringify(data) });
      state.loginEmail = result.email;
      $('#loginMaskedEmail').textContent = maskEmail(result.email);
      showStep('loginVerifyStep');
      message(status, '');
    } catch (error) {
      message(status, error.message, true);
    }
  });

  $('#loginVerifyForm').addEventListener('submit', async event => {
    event.preventDefault();
    const { code } = Object.fromEntries(new FormData(event.currentTarget).entries());
    const status = $('#loginVerifyMessage');
    message(status, 'Verifying your code…');
    try {
      const result = await api('/auth/login/verify', {
        method: 'POST',
        body: JSON.stringify({ email: state.loginEmail, code })
      });
      enterPortal(result.user, result.session);
      await loadPortalData();
    } catch (error) {
      message(status, error.message, true);
    }
  });

  $('#resendLoginCode').addEventListener('click', async () => {
    const status = $('#loginVerifyMessage');
    try {
      await api('/auth/login/start', { method: 'POST', body: JSON.stringify({ identity: state.loginEmail }) });
      message(status, 'A new sign-in code has been sent.');
    } catch (error) {
      message(status, error.message, true);
    }
  });

  function enterPortal(user, session = state.session) {
    state.user = user;
    if (session) saveSession(session);
    $('#authShell').classList.add('hidden');
    $('#portalApp').classList.remove('hidden');
    const name = user?.name || 'RKL Client';
    const company = user?.company || 'Company';
    $('#userName').textContent = name;
    $('#userCompany').textContent = company;
    $('#userInitials').textContent = name.split(' ').slice(0, 2).map(part => part[0]).join('');
    $('#profileName').value = name;
    $('#profileCompany').value = company;
    $('#profileEmail').value = user?.email || '';
    $('#profilePhone').value = user?.phone ? `+966${user.phone}` : '';
  }

  const viewTitles = {
    overview: 'Overview', requests: 'Service Requests', projects: 'Projects & Elevators',
    documents: 'Files & Drawings', quotes: 'Quotations',
    reports: 'Approved Reports', profile: 'Account Details'
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
    saveSession(null);
    location.href = 'customer-portal.html';
  });

  const dialog = $('#requestDialog');
  const requestType = $('#requestType');
  function updateRequestFields() {
    const type = requestType.value;
    const isJob = type === 'job-application';
    const isPartner = ['supplier-partnership', 'product-localization'].includes(type);
    $('#cityFieldLabel').textContent = isPartner ? 'Country / City *' : isJob ? 'Current city *' : 'City *';
    $('#projectFieldLabel').textContent = isJob ? 'Position applied for *' : isPartner ? 'Company / Brand name *' : 'Project name *';
    $('#descriptionFieldLabel').textContent = isJob ? 'Experience, qualifications and message *' : isPartner ? 'Products, capabilities and partnership proposal *' : 'Request details and requirements *';
    $('#attachmentFieldLabel').textContent = isJob ? 'Attach CV, certificates or portfolio' : isPartner ? 'Attach company profile, catalogues or certificates' : 'Attach drawings or images';
    $('#unitsField').classList.toggle('hidden', isJob || isPartner);
    if (isJob || isPartner) $('[name="units"]', dialog).value = '';
  }
  requestType.addEventListener('change', updateRequestFields);
  $$('[data-open-request]').forEach(button => button.addEventListener('click', () => { updateRequestFields(); dialog.showModal(); }));
  $$('[data-service]').forEach(button => button.addEventListener('click', () => {
    requestType.value = button.dataset.service;
    updateRequestFields();
    dialog.showModal();
  }));

  $('#serviceRequestForm').addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const attachments = formData.getAll('attachments').filter(file => file.size);
    const data = Object.fromEntries([...formData.entries()].filter(([key]) => key !== 'attachments'));
    const status = $('#requestMessage');
    message(status, 'Submitting your request…');
    try {
      const result = await api('/requests', { method: 'POST', body: JSON.stringify(data) });
      if (attachments.length) await uploadFiles(attachments, result.request.id);
      message(status, result.emailNotification
        ? `Request submitted successfully. A confirmation email was sent. Reference: ${result.request.reference}`
        : `Request submitted successfully. Reference: ${result.request.reference}. Email confirmation is temporarily delayed.`);
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
      if (!response.ok) throw new Error(`Unable to upload file: ${file.name}`);
      const saved = await api('/files/complete', {
        method: 'POST',
        body: JSON.stringify({ fileId: ticket.fileId, requestId })
      });
      state.files.unshift(saved.file);
      renderFiles();
    }
  }

  function renderFiles() {
    $('#fileGrid').innerHTML = state.files.map(file => `<article class="file-card"><span>▤</span><div><b>${escapeHtml(file.name)}</b><small>${escapeHtml(file.status || 'Uploaded')}</small></div></article>`).join('');
  }

  function renderRequests() {
    $('#openRequests').textContent = state.requests.filter(request => request.status !== 'closed').length;
    if (!state.requests.length) return;
    $('#requestsList').className = 'request-list';
    $('#requestsList').innerHTML = state.requests.map(request => `<article><div><b>${escapeHtml(request.project_name || request.project || '')}</b><small>${escapeHtml(request.reference)}</small></div><span>${escapeHtml(request.statusLabel || request.status || 'New')}</span></article>`).join('');
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
      button.textContent = 'Saved';
    } catch (error) {
      alert(error.message);
    } finally {
      setTimeout(() => { button.disabled = false; button.textContent = 'Save changes'; }, 1300);
    }
  });

  async function loadPortalData() {
    const [requests, files] = await Promise.all([api('/requests'), api('/files')]);
    state.requests = requests.requests || [];
    state.files = files.files || [];
    renderRequests();
    renderFiles();
  }

  async function boot() {
    state.session = loadSession();
    if (!state.session) return;
    try {
      let result;
      try {
        result = await api('/me');
      } catch (error) {
        if (!state.session?.refreshToken) throw error;
        const refreshed = await api('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: state.session.refreshToken })
        });
        saveSession(refreshed.session);
        result = await api('/me');
      }
      if (result.user) {
        enterPortal(result.user);
        await loadPortalData();
      }
    } catch (_) {
      saveSession(null);
      showStep('loginStep');
    }
  }

  boot();
})();
