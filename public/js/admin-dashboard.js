(() => {
  const API_BASE = window.RKL_PORTAL_API || '/api/portal';
  const SESSION_KEY = 'rklPortalSession';
  const $ = selector => document.querySelector(selector);
  const state = { session: null, user: null, requests: [], filtered: [], technical: [], technicalFiltered: [], selected: null, selectedKind: 'client' };
  const labels = {
    'new-elevator':'New elevator','maintenance':'Maintenance contract','inspection':'Technical visit',
    'modernization':'Modernization','repair':'Repair / spare parts','escalator':'Escalators',
    'job-application':'Employment application','supplier-partnership':'Supplier / manufacturer',
    'product-localization':'Product localization / distribution'
  };
  const statusLabels = {submitted:'New',under_review:'Under review',changes_requested:'Information requested',approved:'Approved',rejected:'Rejected',closed:'Closed'};
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const formatDate = value => value ? new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(value)) : '—';
  const formatBytes = value => !value ? '—' : value < 1048576 ? `${Math.ceil(value/1024)} KB` : `${(value/1048576).toFixed(1)} MB`;

  function loadSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){return null}}
  function saveSession(session){state.session=session;if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY)}
  async function api(path,options={}){
    const response=await fetch(`${API_BASE}${path}`,{headers:{'Content-Type':'application/json',...(state.session?.accessToken?{Authorization:`Bearer ${state.session.accessToken}`}:{}),...(options.headers||{})},...options});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.message||'Unable to complete the request.');
    return payload;
  }
  async function authenticatedApi(path,options={}){
    try{return await api(path,options)}catch(error){
      if(!state.session?.refreshToken)throw error;
      const refreshed=await api('/auth/refresh',{method:'POST',body:JSON.stringify({refreshToken:state.session.refreshToken})});
      saveSession(refreshed.session);
      return api(path,options);
    }
  }

  function updateStats(){
    const all=[...state.requests,...state.technical];
    $('#totalRequests').textContent=all.length;
    $('#newRequests').textContent=all.filter(x=>x.status==='submitted').length;
    $('#reviewRequests').textContent=all.filter(x=>x.status==='under_review').length;
    $('#attachmentCount').textContent=state.requests.reduce((sum,x)=>sum+(x.documents?.length||0),0)+state.technical.reduce((sum,x)=>sum+(x.attachment_count||0),0);
    $('#clientQueueCount').textContent=state.requests.length;
    $('#technicalQueueCount').textContent=state.technical.length;
  }
  function populateTypes(){
    const types=[...new Set(state.requests.map(x=>x.kind))].sort();
    $('#typeFilter').innerHTML='<option value="">All request types</option>'+types.map(type=>`<option value="${escapeHtml(type)}">${escapeHtml(labels[type]||type)}</option>`).join('');
  }
  function applyFilters(){
    const query=$('#searchInput').value.trim().toLowerCase(),type=$('#typeFilter').value,status=$('#statusFilter').value;
    state.filtered=state.requests.filter(item=>{
      const text=[item.reference,item.project_name,item.city,item.client?.full_name,item.client?.email,item.organization?.name].join(' ').toLowerCase();
      return (!query||text.includes(query))&&(!type||item.kind===type)&&(!status||item.status===status);
    });
    renderRows();
  }
  function renderRows(){
    $('#emptyState').classList.toggle('hidden',state.filtered.length>0);
    $('#requestRows').innerHTML=state.filtered.map(item=>`<tr>
      <td><b>${escapeHtml(item.reference)}</b><small>${escapeHtml(item.project_name)}</small></td>
      <td><b>${escapeHtml(item.client?.full_name||'—')}</b><small>${escapeHtml(item.organization?.name||item.client?.email||'—')}</small></td>
      <td>${escapeHtml(labels[item.kind]||item.kind)}</td>
      <td>${escapeHtml(item.city||'—')}</td>
      <td>${escapeHtml(formatDate(item.created_at))}</td>
      <td><b>${item.documents?.length||0}</b><small>attachments</small></td>
      <td><span class="status ${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status]||item.status)}</span></td>
      <td><button class="view-btn" data-request-id="${escapeHtml(item.id)}">Review</button></td>
    </tr>`).join('');
    document.querySelectorAll('[data-request-id]').forEach(button=>button.addEventListener('click',()=>openRequest(button.dataset.requestId)));
  }
  const technicalTypeLabels={technical_report:'Technical report',spare_parts:'Spare parts request',expense:'Expense request',field_note:'Field note'};
  function applyTechnicalFilters(){
    const query=$('#technicalSearchInput').value.trim().toLowerCase(),type=$('#technicalTypeFilter').value,status=$('#technicalStatusFilter').value;
    state.technicalFiltered=state.technical.filter(item=>{
      const text=[item.reference,item.technician_name,item.technician_email,item.project,item.city,item.title].join(' ').toLowerCase();
      return (!query||text.includes(query))&&(!type||item.submission_type===type)&&(!status||item.status===status);
    });
    renderTechnicalRows();
  }
  function renderTechnicalRows(){
    $('#technicalEmptyState').classList.toggle('hidden',state.technicalFiltered.length>0);
    $('#technicalRows').innerHTML=state.technicalFiltered.map(item=>`<tr>
      <td><b>${escapeHtml(item.reference)}</b><small>${escapeHtml(item.title)}</small></td>
      <td><b>${escapeHtml(item.technician_name)}</b><small>${escapeHtml(item.technician_email)}</small></td>
      <td>${escapeHtml(technicalTypeLabels[item.submission_type]||item.submission_type)}</td>
      <td><b>${escapeHtml(item.project||'—')}</b><small>${escapeHtml(item.city||'—')}</small></td>
      <td>${escapeHtml(formatDate(item.submitted_at))}</td>
      <td><b>${item.attachment_count||0}</b><small>attachments</small></td>
      <td><span class="status ${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status]||item.status)}</span></td>
      <td><button class="view-btn" data-technical-id="${escapeHtml(item.id)}">Review</button></td>
    </tr>`).join('');
    document.querySelectorAll('[data-technical-id]').forEach(button=>button.addEventListener('click',()=>openTechnical(button.dataset.technicalId)));
  }
  function showQueue(kind){
    const technical=kind==='technical';
    $('#clientQueuePanel').classList.toggle('hidden',technical);$('#technicalQueuePanel').classList.toggle('hidden',!technical);
    $('#clientQueueTab').classList.toggle('active',!technical);$('#technicalQueueTab').classList.toggle('active',technical);
    $('#clientQueueNav').classList.toggle('active',!technical);$('#technicalQueueNav').classList.toggle('active',technical);
  }

  async function loadQueue(){
    $('#refreshButton').disabled=true;
    try{
      const result=await authenticatedApi('/admin/queue');
      state.requests=result.requests||[];
      state.technical=result.technicalSubmissions||[];
      state.filtered=[...state.requests];
      state.technicalFiltered=[...state.technical];
      updateStats();populateTypes();applyFilters();applyTechnicalFilters();
    }catch(error){alert(error.message)}
    finally{$('#refreshButton').disabled=false}
  }

  function info(label,value){return `<div><small>${escapeHtml(label)}</small><b>${escapeHtml(value||'—')}</b></div>`}
  function renderHistory(history=[]){
    if(!history.length)return '<div class="file-empty">No activity has been recorded yet.</div>';
    return history.map(item=>{
      const meta=item.metadata||{},title=item.action==='admin_request_response'?`Status changed to ${statusLabels[meta.toStatus]||meta.toStatus}`:item.action.replaceAll('_',' ');
      return `<article class="history-item"><div><b>${escapeHtml(title)}</b>${meta.message?`<p>${escapeHtml(meta.message)}</p>`:''}</div><time>${escapeHtml(formatDate(item.created_at))}</time></article>`
    }).join('');
  }
  function openRequest(id){
    const item=state.requests.find(request=>request.id===id);if(!item)return;
    state.selected=item;state.selectedKind='client';
    $('#responseLabel').textContent='Message to client';$('#sendResponse').textContent='Save status & email client';
    $('#dialogReference').textContent=item.reference;
    $('#requestInfo').innerHTML=[
      info('Client',item.client?.full_name),info('Email',item.client?.email),info('Mobile',item.client?.phone?`+${item.client.phone}`:'—'),
      info('Company',item.organization?.name),info('Request type',labels[item.kind]||item.kind),info('City / Country',item.city),
      info('Project / Position / Brand',item.project_name),info('Units',item.units),info('Submitted',formatDate(item.created_at))
    ].join('');
    $('#requestDescription').textContent=item.description;
    $('#fileCount').textContent=`${item.documents?.length||0} files`;
    $('#attachmentList').innerHTML=item.documents?.length?item.documents.map(file=>`<article class="file-item"><div><b>${escapeHtml(file.title)}</b><small>${escapeHtml(formatBytes(file.size_bytes))} · ${escapeHtml(file.mime_type||'File')}</small></div><button data-file-id="${escapeHtml(file.id)}">Open / Download</button></article>`).join(''):'<div class="file-empty">No attachments were submitted with this request.</div>';
    document.querySelectorAll('[data-file-id]').forEach(button=>button.addEventListener('click',()=>downloadFile(button.dataset.fileId,button)));
    $('#historyList').innerHTML=renderHistory(item.history);
    $('#actionStatus').value=item.status==='submitted'?'under_review':(['under_review','changes_requested','approved','rejected','closed'].includes(item.status)?item.status:'under_review');
    $('#responseMessage').value='';
    $('#actionMessage').textContent='';
    $('#requestDialog').showModal();
  }
  function openTechnical(id){
    const item=state.technical.find(submission=>submission.id===id);if(!item)return;
    state.selected=item;state.selectedKind='technical';
    const details=item.details||{};
    $('#dialogReference').textContent=item.reference;
    $('#requestInfo').innerHTML=[
      info('Technician',item.technician_name),info('Email',item.technician_email),info('Submission type',technicalTypeLabels[item.submission_type]||item.submission_type),
      info('Project',item.project),info('City',item.city),info('Submitted',formatDate(item.submitted_at)),
      info('Risk',details.risk),info('Health score',details.healthScore!==undefined?`${details.healthScore}%`:'—'),info('Elevator',details.elevatorCode)
    ].join('');
    $('#requestDescription').textContent=JSON.stringify(details,null,2);
    $('#fileCount').textContent=`${item.attachment_count||0} referenced files`;
    $('#attachmentList').innerHTML='<div class="file-empty">Attachments remain protected in the RKL Field Service system. Open the technician system to review the original report and files.</div>';
    $('#historyList').innerHTML=item.review_message?`<article class="history-item"><div><b>Admin review</b><p>${escapeHtml(item.review_message)}</p></div><time>${escapeHtml(formatDate(item.reviewed_at))}</time></article>`:'<div class="file-empty">No central review activity yet.</div>';
    $('#actionStatus').value=item.status==='submitted'?'under_review':(['under_review','changes_requested','approved','rejected','closed'].includes(item.status)?item.status:'under_review');
    $('#responseLabel').textContent='Review note to technician';
    $('#responseMessage').value=item.review_message||'';$('#actionMessage').textContent='';
    $('#sendResponse').textContent='Save technician review';
    $('#requestDialog').showModal();
  }

  async function downloadFile(id,button){
    button.disabled=true;button.textContent='Preparing…';
    try{const result=await authenticatedApi(`/admin/documents/${id}/download`);window.open(result.url,'_blank','noopener')}
    catch(error){alert(error.message)}
    finally{button.disabled=false;button.textContent='Open / Download'}
  }
  async function sendResponse(){
    if(!state.selected)return;
    const button=$('#sendResponse'),status=$('#actionStatus').value,message=$('#responseMessage').value.trim();
    button.disabled=true;$('#actionMessage').textContent='Saving and sending…';
    try{
      const endpoint=state.selectedKind==='technical'?`/admin/technical/${state.selected.id}/action`:`/admin/requests/${state.selected.id}/action`;
      const result=await authenticatedApi(endpoint,{method:'POST',body:JSON.stringify({status,message})});
      $('#actionMessage').textContent=state.selectedKind==='technical'?'Technician review saved in the central queue.':(result.emailSent?'Status saved and email sent to the client.':'Status saved. Email delivery is temporarily delayed.');
      await loadQueue();
      setTimeout(()=>$('#requestDialog').close(),1200);
    }catch(error){$('#actionMessage').textContent=error.message}
    finally{button.disabled=false}
  }

  async function boot(){
    state.session=loadSession();
    if(!state.session){location.href='customer-portal.html?view=admin';return}
    try{
      const result=await authenticatedApi('/me');
      if(!['admin','supervisor'].includes(result.user?.role)){location.href='customer-portal.html';return}
      state.user=result.user;$('#adminName').textContent=result.user.name;$('#adminEmail').textContent=result.user.email;
      await loadQueue();
    }catch(_){saveSession(null);location.href='customer-portal.html?view=admin'}
  }

  $('#searchInput').addEventListener('input',applyFilters);
  $('#typeFilter').addEventListener('change',applyFilters);
  $('#statusFilter').addEventListener('change',applyFilters);
  $('#technicalSearchInput').addEventListener('input',applyTechnicalFilters);
  $('#technicalTypeFilter').addEventListener('change',applyTechnicalFilters);
  $('#technicalStatusFilter').addEventListener('change',applyTechnicalFilters);
  $('#clientQueueTab').addEventListener('click',()=>showQueue('client'));
  $('#technicalQueueTab').addEventListener('click',()=>showQueue('technical'));
  $('#clientQueueNav').addEventListener('click',()=>showQueue('client'));
  $('#technicalQueueNav').addEventListener('click',()=>showQueue('technical'));
  $('#refreshButton').addEventListener('click',loadQueue);
  $('#sendResponse').addEventListener('click',sendResponse);
  $('#closeDialog').addEventListener('click',()=>$('#requestDialog').close());
  $('#menuToggle').addEventListener('click',()=>$('.sidebar').classList.toggle('open'));
  $('#signOut').addEventListener('click',async()=>{try{await api('/auth/logout',{method:'POST'})}catch(_){}saveSession(null);location.href='customer-portal.html?view=admin'});
  boot();
})();