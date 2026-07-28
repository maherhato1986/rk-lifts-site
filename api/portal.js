import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

const reply=(res,status,body)=>res.status(status).json(body);
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const route=req=>`/${(Array.isArray(req.query.route)?req.query.route:[req.query.route]).filter(Boolean).join('/')}`;
const supportedPhoneTypes=new Set(['MOBILE','FIXED_LINE','FIXED_LINE_OR_MOBILE']);
const parseContactPhone=(value,country)=>{
  const raw=String(value||'').trim(),region=String(country||'').trim().toUpperCase()||undefined;
  const parsed=parsePhoneNumberFromString(raw,region);
  if(!parsed?.isValid()||!supportedPhoneTypes.has(parsed.getType()))return null;
  return {e164:parsed.number,digits:parsed.number.slice(1),type:parsed.getType(),isMobile:parsed.getType()==='MOBILE'};
};
const parseStoredPhone=value=>parseContactPhone(String(value||'').startsWith('+')?String(value):`+${value}`)||parseContactPhone(value,'SA');
const code=()=>String(crypto.randomInt(100000,1000000));
const hash=value=>crypto.createHash('sha256').update(`${value}:${process.env.OTP_PEPPER}`).digest('hex');
const equal=(value,stored)=>{const a=Buffer.from(hash(value)),b=Buffer.from(stored||'');return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const ref=()=>`RKL-SR-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomInt(1000,10000)}`;

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
async function sendBrandedEmail({to,subject,heading,intro,details='',footer=''}){
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({
    from:process.env.OTP_FROM_EMAIL||'RKL Portal <no-reply@rkl.sa>',to:Array.isArray(to)?to:[to],subject,
    html:`<div style="background:#f2f6f4;padding:30px 12px;font-family:Arial,sans-serif;color:#17352e"><div style="max-width:650px;margin:auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #dce8e3"><div style="background:#07382e;padding:24px;text-align:center"><img src="https://rkl.sa/public/images/logo.png" width="76" alt="RKL"></div><div style="padding:30px"><h2 style="margin-top:0">${heading}</h2><p style="line-height:1.7;color:#52655f">${intro}</p>${details}<p style="margin-top:28px;line-height:1.7;color:#52655f">${footer}</p></div><div style="padding:16px 30px;background:#f5f8f7;color:#71817c;font-size:12px">RKL Elevators & Escalators · admin@rkl.sa · +966 11 477 4021</div></div></div>`
  })});if(!response.ok){const body=await response.text();throw new Error(`email delivery failed: ${response.status} ${body.slice(0,200)}`)}
}
async function sendEmail(to,otp,purpose='register'){
  const signingIn=purpose==='login';
  return sendBrandedEmail({to,subject:signingIn?'Your RKL sign-in code':'Your RKL verification code',heading:signingIn?'Sign in to the RKL Client Portal':'Verify your RKL account',intro:signingIn?'Use the code below to sign in securely.':'Use the code below to finish creating your account.',details:`<p style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center">${escapeHtml(otp)}</p>`,footer:'This code expires shortly. If you did not request it, you can ignore this email.'})
}
const requestLabels={maintenance:'Maintenance contract',inspection:'Technical visit and condition report',modernization:'Elevator modernization',repair:'Repair or spare parts','new-elevator':'New elevator supply and installation',escalator:'Escalators','job-application':'Employment application','supplier-partnership':'Supplier / manufacturer introduction','product-localization':'Product localization or distribution proposal'};
const requestDetails=(request,actor,organization)=>`<table style="width:100%;border-collapse:collapse;margin-top:22px">${[
  ['Reference',request.reference],['Request type',requestLabels[request.kind]||request.kind],['Name',actor.profile.full_name],['Company / Organization',organization?.name||'—'],['Email',actor.profile.email],['Phone',`+${actor.profile.phone}`],['City / Country',request.city],['Project / Position / Brand',request.project_name],['Units',request.units||'—'],['Submitted',new Date(request.created_at).toLocaleString('en-GB',{timeZone:'Asia/Riyadh'})]
].map(([label,value])=>`<tr><td style="padding:9px;border-bottom:1px solid #e5ece9;color:#71817c;width:38%">${escapeHtml(label)}</td><td style="padding:9px;border-bottom:1px solid #e5ece9;font-weight:bold">${escapeHtml(value)}</td></tr>`).join('')}</table><div style="margin-top:20px;padding:16px;background:#f5f8f7;border-radius:10px;white-space:pre-wrap;line-height:1.7">${escapeHtml(request.description)}</div>`;
async function sendSms(to,otp){
  const response=await fetch('https://el.cloud.unifonic.com/rest/SMS/messages',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({
    AppSid:process.env.UNIFONIC_APP_SID,SenderID:process.env.UNIFONIC_SENDER_ID||'RKL',Recipient:String(to).replace(/^\+/,''),Body:`RKL verification code: ${otp}. Valid for 10 minutes.`
  })});if(!response.ok)throw new Error('sms delivery failed')
}
async function user(req,database){
  const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!token)return null;
  const {data}=await database.auth.getUser(token);if(!data?.user)return null;
  const {data:profile}=await database.from('profiles').select('*').eq('id',data.user.id).single();
  return profile?{profile,token}:null
}
async function secured(req,res,database,roles){
  const found=await user(req,database);if(!found){reply(res,401,{message:'Your session has expired. Please sign in again.'});return null}
  if(roles&&!roles.includes(found.profile.role)){reply(res,403,{message:'You do not have permission to perform this action.'});return null}
  return found
}
async function audit(database,actor,action,type,id,metadata={}){
  await database.from('audit_log').insert({organization_id:actor?.profile?.organization_id,actor_id:actor?.profile?.id,action,entity_type:type,entity_id:String(id||''),metadata})
}

export default async function handler(req,res){
  const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OTP_PEPPER'];
  if(required.some(key=>!process.env[key]))return reply(res,503,{message:'The client portal is still being configured.'});
  const database=db(),path=route(req),smsEnabled=Boolean(process.env.UNIFONIC_APP_SID);
  try{
    if(req.method==='POST'&&path==='/auth/register/start'){
      const {name,company,email,consent}=req.body||{},contact=parseContactPhone(req.body?.phone,req.body?.phoneCountry);
      if(!name||!company||!email||!consent||!contact)return reply(res,400,{message:'Enter a valid mobile or landline number for the selected country. / أدخل رقم جوال أو هاتف أرضي صحيحًا للدولة المختارة.'});
      const mobile=contact.digits,phoneVerificationRequired=smsEnabled&&contact.isMobile;
      const normalizedEmail=String(email).trim().toLowerCase();
      const [{data:emailProfile},{data:phoneProfile}]=await Promise.all([
        database.from('profiles').select('id').ilike('email',normalizedEmail).maybeSingle(),
        database.from('profiles').select('id').eq('phone',mobile).maybeSingle()
      ]);
      if(emailProfile)return reply(res,409,{code:'EMAIL_ALREADY_REGISTERED',message:'This email address is already registered. Please sign in to your existing account. / هذا البريد الإلكتروني مسجل مسبقًا، يرجى تسجيل الدخول إلى حسابك الحالي.'});
      if(phoneProfile)return reply(res,409,{code:'PHONE_ALREADY_REGISTERED',message:'This phone number is already registered. Please sign in to your existing account or use another number. / رقم الهاتف مسجل مسبقًا، يرجى تسجيل الدخول إلى حسابك الحالي أو استخدام رقم آخر.'});
      const emailOtp=code(),phoneOtp=code();
      const {data,error}=await database.from('pending_registrations').insert({full_name:name.trim(),company_name:company.trim(),email:normalizedEmail,phone:mobile,email_code_hash:hash(emailOtp),phone_code_hash:hash(phoneOtp),expires_at:new Date(Date.now()+600000).toISOString()}).select('id').single();
      if(error)throw error;
      try{
        await sendEmail(email,emailOtp);
        if(phoneVerificationRequired)await sendSms(mobile,phoneOtp);
      }catch(deliveryError){
        await database.from('pending_registrations').delete().eq('id',data.id);
        throw deliveryError;
      }
      return reply(res,200,{registrationId:data.id,smsRequired:phoneVerificationRequired})
    }
    if(req.method==='POST'&&path==='/auth/register/resend'){
      const {registrationId}=req.body||{};
      const {data:p}=await database.from('pending_registrations').select('*').eq('id',registrationId).single();
      if(!p)return reply(res,404,{message:'Registration session not found. Please enter your details again.'});
      const emailOtp=code(),phoneOtp=code();
      const {error}=await database.from('pending_registrations').update({email_code_hash:hash(emailOtp),phone_code_hash:hash(phoneOtp),expires_at:new Date(Date.now()+600000).toISOString(),attempts:0}).eq('id',p.id);
      if(error)throw error;
      const storedPhone=parseStoredPhone(p.phone),phoneVerificationRequired=smsEnabled&&storedPhone?.isMobile;
      await sendEmail(p.email,emailOtp);
      if(phoneVerificationRequired)await sendSms(p.phone,phoneOtp);
      return reply(res,200,{message:'A new verification code has been sent.',smsRequired:phoneVerificationRequired})
    }
    if(req.method==='POST'&&path==='/auth/register/verify'){
      const {registrationId,emailCode,phoneCode}=req.body||{};
      const {data:p}=await database.from('pending_registrations').select('*').eq('id',registrationId).single();
      if(!p||new Date(p.expires_at)<new Date()||p.attempts>=5)return reply(res,400,{message:'The verification code has expired. Please request a new one.'});
      const storedPhone=parseStoredPhone(p.phone),phoneVerificationRequired=smsEnabled&&storedPhone?.isMobile;
      if(!storedPhone)return reply(res,400,{message:'The saved phone number is invalid. Please enter your details again.'});
      if(!equal(emailCode,p.email_code_hash)||(phoneVerificationRequired&&!equal(phoneCode,p.phone_code_hash))){await database.from('pending_registrations').update({attempts:p.attempts+1}).eq('id',p.id);return reply(res,400,{message:'The verification code is incorrect.'})}
      const authPhone=phoneVerificationRequired?{phone:storedPhone.e164,phone_confirm:true}:{};
      const {data:auth,error:authError}=await database.auth.admin.createUser({email:p.email,email_confirm:true,...authPhone});if(authError)throw authError;
      const {data:org,error:orgError}=await database.from('organizations').insert({name:p.company_name}).select().single();if(orgError)throw orgError;
      const portalRole=p.email.toLowerCase()===(process.env.ADMIN_EMAIL||'admin@rkl.sa').toLowerCase()?'admin':'client_approver';
      const {data:profile,error:profileError}=await database.from('profiles').insert({id:auth.user.id,organization_id:org.id,full_name:p.full_name,email:p.email,phone:p.phone,role:portalRole,email_verified_at:new Date().toISOString(),phone_verified_at:phoneVerificationRequired?new Date().toISOString():null}).select().single();if(profileError)throw profileError;
      const {data:link,error:linkError}=await database.auth.admin.generateLink({type:'magiclink',email:p.email});if(linkError)throw linkError;
      const {data:verified,error:verifyError}=await database.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'email'});if(verifyError)throw verifyError;
      await database.from('pending_registrations').delete().eq('id',p.id);await audit(database,{profile},'account_created','organization',org.id);
      return reply(res,201,{user:{name:profile.full_name,company:org.name,email:profile.email,phone:profile.phone,role:profile.role},session:{accessToken:verified.session.access_token,refreshToken:verified.session.refresh_token,expiresAt:verified.session.expires_at}})
    }
    if(req.method==='POST'&&path==='/auth/login/start'){
      const identity=String(req.body?.identity||'').trim().toLowerCase();
      if(!identity.includes('@'))return reply(res,400,{message:'Mobile sign-in is not available yet. Please use your registered email address.'});
      const {data:profile}=await database.from('profiles').select('id,email').ilike('email',identity).maybeSingle();
      if(!profile)return reply(res,404,{message:'No client account was found for this email. Please create an account first.'});
      const {data:link,error}=await database.auth.admin.generateLink({type:'magiclink',email:profile.email});if(error)throw error;
      await sendEmail(profile.email,link.properties.email_otp,'login');
      return reply(res,200,{email:profile.email,message:'Your sign-in code has been sent.'})
    }
    if(req.method==='POST'&&path==='/auth/login/verify'){
      const email=String(req.body?.email||'').trim().toLowerCase(),loginCode=String(req.body?.code||'').replace(/\D/g,'');
      if(!email||loginCode.length<6||loginCode.length>8)return reply(res,400,{message:'Enter the complete sign-in code sent to your email.'});
      const {data:verified,error}=await database.auth.verifyOtp({email,token:loginCode,type:'email'});if(error||!verified?.session)return reply(res,400,{message:'The sign-in code is incorrect or has expired.'});
      const {data:profile}=await database.from('profiles').select('*').eq('id',verified.user.id).single();
      if(!profile)return reply(res,403,{message:'This account is not connected to an RKL client profile.'});
      const {data:org}=await database.from('organizations').select('name').eq('id',profile.organization_id).single();
      return reply(res,200,{user:{name:profile.full_name,company:org?.name,email:profile.email,phone:profile.phone,role:profile.role},session:{accessToken:verified.session.access_token,refreshToken:verified.session.refresh_token,expiresAt:verified.session.expires_at}})
    }
    if(req.method==='POST'&&path==='/auth/refresh'){
      const refreshToken=String(req.body?.refreshToken||'');
      if(!refreshToken)return reply(res,401,{message:'No saved session was found.'});
      const {data,error}=await database.auth.refreshSession({refresh_token:refreshToken});if(error||!data?.session)return reply(res,401,{message:'Your session has expired. Please sign in again.'});
      return reply(res,200,{session:{accessToken:data.session.access_token,refreshToken:data.session.refresh_token,expiresAt:data.session.expires_at}})
    }
    if(req.method==='POST'&&path==='/auth/logout'){
      return reply(res,200,{message:'Signed out.'})
    }
    if(path==='/me'){
      const actor=await secured(req,res,database);if(!actor)return;
      if(req.method==='GET'){const {data:org}=await database.from('organizations').select('name').eq('id',actor.profile.organization_id).single();return reply(res,200,{user:{name:actor.profile.full_name,company:org?.name,email:actor.profile.email,phone:actor.profile.phone,role:actor.profile.role}})}
      if(req.method==='PATCH'){const {name,company}=req.body||{};await Promise.all([database.from('profiles').update({full_name:name}).eq('id',actor.profile.id),database.from('organizations').update({name:company}).eq('id',actor.profile.organization_id)]);return reply(res,200,{user:{name,company,email:actor.profile.email,phone:actor.profile.phone}})}
    }
    if(path==='/requests'){
      const actor=await secured(req,res,database);if(!actor)return;
      if(req.method==='GET'){const {data}=await database.from('service_requests').select('*').eq('organization_id',actor.profile.organization_id).order('created_at',{ascending:false});return reply(res,200,{requests:data||[]})}
      if(req.method==='POST'){
        const b=req.body||{};
        if(!b.service||!b.project||!b.city||!b.description)return reply(res,400,{message:'Please complete all required request fields.'});
        const {data,error}=await database.from('service_requests').insert({organization_id:actor.profile.organization_id,created_by:actor.profile.id,kind:b.service,reference:ref(),city:b.city,project_name:b.project,units:b.units||null,description:b.description,priority:b.service==='emergency'?'emergency':'normal',response_due_at:new Date(Date.now()+(b.service==='emergency'?2:24)*3600000).toISOString()}).select().single();
        if(error)throw error;
        await audit(database,actor,'request_created','service_request',data.id);
        const {data:organization}=await database.from('organizations').select('name').eq('id',actor.profile.organization_id).single();
        const details=requestDetails(data,actor,organization);
        const notificationResults=await Promise.allSettled([
          sendBrandedEmail({to:actor.profile.email,subject:`RKL request received · ${data.reference}`,heading:'We received your request',intro:`Thank you, ${escapeHtml(actor.profile.full_name)}. Your request has been registered successfully and our team will review it.`,details,footer:'Please keep the reference number for follow-up. We will contact you if additional information is required.'}),
          sendBrandedEmail({to:process.env.PORTAL_NOTIFICATION_EMAIL||'admin@rkl.sa',subject:`New RKL portal request · ${data.reference} · ${requestLabels[data.kind]||data.kind}`,heading:'New portal request',intro:'A new request has been submitted through the RKL Client Portal.',details,footer:'Sign in to the portal administration queue to review and assign this request.'})
        ]);
        const emailNotification=notificationResults.every(result=>result.status==='fulfilled');
        if(!emailNotification)console.error('Request email notification failed',notificationResults.filter(result=>result.status==='rejected').map(result=>result.reason?.message));
        return reply(res,201,{request:data,emailNotification})
      }
    }
    if(path==='/files'&&req.method==='GET'){const actor=await secured(req,res,database);if(!actor)return;const {data}=await database.from('documents').select('*').eq('organization_id',actor.profile.organization_id).order('created_at',{ascending:false});return reply(res,200,{files:(data||[]).map(x=>({...x,name:x.title}))})}
    if(path==='/files/upload-ticket'&&req.method==='POST'){
      const actor=await secured(req,res,database);if(!actor)return;const {name,type,size,requestId}=req.body||{};
      if(!name||!size||size>52428800)return reply(res,400,{message:'The file is invalid or exceeds 50 MB.'});
      const id=crypto.randomUUID(),safe=name.replace(/[^\p{L}\p{N}._-]/gu,'_'),storagePath=`${actor.profile.organization_id}/${new Date().getFullYear()}/${id}-${safe}`;
      const {data,error}=await database.storage.from('client-files').createSignedUploadUrl(storagePath);if(error)throw error;
      await database.from('documents').insert({id,organization_id:actor.profile.organization_id,request_id:requestId||null,uploaded_by:actor.profile.id,title:name,storage_path:storagePath,mime_type:type,size_bytes:size});
      return reply(res,200,{fileId:id,uploadUrl:data.signedUrl,headers:{}})
    }
    if(path==='/files/complete'&&req.method==='POST'){const actor=await secured(req,res,database);if(!actor)return;const {data}=await database.from('documents').select('*').eq('id',req.body.fileId).eq('organization_id',actor.profile.organization_id).single();await audit(database,actor,'file_uploaded','document',data.id);return reply(res,200,{file:{...data,name:data.title,status:'Uploaded'}})}
    if(path.match(/^\/documents\/[^/]+\/action$/)&&req.method==='POST'){
      const actor=await secured(req,res,database,['client_approver','supervisor','admin']);if(!actor)return;const id=path.split('/')[2],{action,note}=req.body||{},statuses={approve:'approved',reject:'rejected',request_changes:'changes_requested',client_accept:'approved',client_reject:'rejected'};
      if(!statuses[action])return reply(res,400,{message:'Invalid action.'});const {data:doc}=await database.from('documents').select('*').eq('id',id).single();if(!doc)return reply(res,404,{message:'Document not found.'});
      if(action.startsWith('client_')&&doc.organization_id!==actor.profile.organization_id)return reply(res,403,{message:'You do not have access to this document.'});
      await database.from('documents').update({status:statuses[action],approved_by:statuses[action]==='approved'?actor.profile.id:null,approved_at:statuses[action]==='approved'?new Date().toISOString():null}).eq('id',id);
      await database.from('document_actions').insert({document_id:id,actor_id:actor.profile.id,action,note});await audit(database,actor,`document_${action}`,'document',id);return reply(res,200,{status:statuses[action]})
    }
    if(path.startsWith('/assets/qr/')&&req.method==='GET'){const token=path.split('/').pop(),{data}=await database.from('assets').select('id,asset_code,kind,status,buildings(name,projects(name,city))').eq('qr_token',token).single();return data?reply(res,200,{asset:data}):reply(res,404,{message:'Invalid elevator QR code.'})}
    if(path==='/admin/queue'&&req.method==='GET'){
      const actor=await secured(req,res,database,['supervisor','admin']);if(!actor)return;
      const [{data:requests,error:requestError},{data:documents,error:documentError}]=await Promise.all([
        database.from('service_requests').select('*').order('created_at',{ascending:false}),
        database.from('documents').select('id,request_id,title,mime_type,size_bytes,status,created_at').not('request_id','is',null).order('created_at',{ascending:false})
      ]);
      if(requestError)throw requestError;if(documentError)throw documentError;
      const creatorIds=[...new Set((requests||[]).map(item=>item.created_by).filter(Boolean))],organizationIds=[...new Set((requests||[]).map(item=>item.organization_id).filter(Boolean))],requestIds=(requests||[]).map(item=>String(item.id));
      const [{data:profiles},{data:organizations},{data:history}]=await Promise.all([
        creatorIds.length?database.from('profiles').select('id,full_name,email,phone').in('id',creatorIds):Promise.resolve({data:[]}),
        organizationIds.length?database.from('organizations').select('id,name,cr_number,vat_number').in('id',organizationIds):Promise.resolve({data:[]}),
        requestIds.length?database.from('audit_log').select('id,actor_id,entity_id,action,metadata,created_at').eq('entity_type','service_request').in('entity_id',requestIds).order('created_at',{ascending:false}):Promise.resolve({data:[]})
      ]);
      const profileMap=Object.fromEntries((profiles||[]).map(item=>[item.id,item])),organizationMap=Object.fromEntries((organizations||[]).map(item=>[item.id,item]));
      const documentMap=(documents||[]).reduce((map,item)=>((map[item.request_id]??=[]).push(item),map),{}),historyMap=(history||[]).reduce((map,item)=>((map[item.entity_id]??=[]).push(item),map),{});
      return reply(res,200,{requests:(requests||[]).map(item=>({...item,client:profileMap[item.created_by]||null,organization:organizationMap[item.organization_id]||null,documents:documentMap[item.id]||[],history:historyMap[String(item.id)]||[]}))})
    }
    if(path.match(/^\/admin\/documents\/[^/]+\/download$/)&&req.method==='GET'){
      const actor=await secured(req,res,database,['supervisor','admin']);if(!actor)return;
      const id=path.split('/')[3],{data:document,error}=await database.from('documents').select('id,title,storage_path').eq('id',id).single();
      if(error||!document)return reply(res,404,{message:'Attachment not found.'});
      const {data:signed,error:signedError}=await database.storage.from('client-files').createSignedUrl(document.storage_path,300,{download:document.title});
      if(signedError)throw signedError;
      await audit(database,actor,'admin_document_downloaded','document',document.id);
      return reply(res,200,{url:signed.signedUrl,expiresIn:300})
    }
    if(path.match(/^\/admin\/requests\/[^/]+\/action$/)&&req.method==='POST'){
      const actor=await secured(req,res,database,['supervisor','admin']);if(!actor)return;
      const id=path.split('/')[3],body=req.body||{},allowedStatuses=['under_review','changes_requested','approved','rejected','closed'];
      if(!allowedStatuses.includes(body.status))return reply(res,400,{message:'Select a valid request status.'});
      const {data:request,error}=await database.from('service_requests').select('*').eq('id',id).single();
      if(error||!request)return reply(res,404,{message:'Request not found.'});
      const {data:client}=await database.from('profiles').select('id,full_name,email,phone').eq('id',request.created_by).single();
      const {data:organization}=await database.from('organizations').select('name').eq('id',request.organization_id).single();
      const previousStatus=request.status,closedAt=body.status==='closed'?new Date().toISOString():null;
      const {data:updated,error:updateError}=await database.from('service_requests').update({status:body.status,closed_at:closedAt,updated_at:new Date().toISOString()}).eq('id',id).select().single();
      if(updateError)throw updateError;
      let emailSent=false;
      if(client?.email){
        try{
          const details=requestDetails(updated,{profile:client},organization),safeMessage=escapeHtml(body.message||'Your request status has been updated.').replaceAll('\n','<br>');
          await sendBrandedEmail({to:client.email,subject:`RKL request update · ${updated.reference}`,heading:'Update on your RKL request',intro:`Your request status is now: ${escapeHtml(body.status.replaceAll('_',' '))}.`,details:`${details}<div style="margin-top:20px;padding:16px;border-left:4px solid #0eaa72;background:#eef8f4;line-height:1.7">${safeMessage}</div>`,footer:'Reply to this email or sign in to the RKL Client Portal if you need further assistance.'});
          emailSent=true
        }catch(emailError){console.error('Admin response email failed',emailError.message)}
      }
      await audit(database,actor,'admin_request_response','service_request',id,{fromStatus:previousStatus,toStatus:body.status,message:String(body.message||''),emailSent});
      return reply(res,200,{request:updated,emailSent})
    }
    return reply(res,404,{message:'API route not found.'})
  }catch(error){
    console.error('RKL portal API error:',error);
    if(error?.message?.startsWith('email delivery failed:')){
      const status=error.message.match(/email delivery failed:\s*(\d+)/)?.[1]||'unknown';
      let reason='Email delivery configuration was rejected by the provider.';
      if(error.message.includes('domain is not verified')||error.message.includes('verify a domain'))reason='The sending domain is not verified in Resend.';
      else if(status==='401')reason='The Resend API key is invalid or inactive.';
      else if(status==='403')reason='Resend rejected the sender address or domain.';
      return reply(res,502,{message:`Unable to send the verification email. ${reason} (Resend ${status})`});
    }
    return reply(res,500,{message:'Unable to process the request. Please try again.'})
  }
}
