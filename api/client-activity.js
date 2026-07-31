import { createClient } from '@supabase/supabase-js';

const reply=(res,status,body)=>res.status(status).json(body);
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ipFrom=req=>String(req.headers['x-forwarded-for']||req.headers['x-real-ip']||'').split(',')[0].trim();
const geoFrom=req=>({
  country:req.headers['x-vercel-ip-country']||'',
  region:req.headers['x-vercel-ip-country-region']||'',
  city:decodeURIComponent(req.headers['x-vercel-ip-city']||''),
  latitude:req.headers['x-vercel-ip-latitude']||'',
  longitude:req.headers['x-vercel-ip-longitude']||''
});

async function actor(req,database){
  const token=String(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!token)return null;
  const {data}=await database.auth.getUser(token);
  if(!data?.user)return null;
  const {data:profile}=await database.from('profiles').select('*').eq('id',data.user.id).single();
  return profile||null;
}

export default async function handler(req,res){
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return reply(res,503,{message:'Audit service is not configured.'});
  const database=db();
  try{
    const profile=await actor(req,database);
    if(!profile)return reply(res,401,{message:'Session expired.'});

    if(req.method==='POST'){
      const {action='activity',entityType='portal',entityId='',metadata={}}=req.body||{};
      const safeMetadata={
        ...metadata,
        ip:ipFrom(req),
        geo:geoFrom(req),
        userAgent:String(req.headers['user-agent']||'').slice(0,500),
        referer:String(req.headers.referer||'').slice(0,500),
        recordedAt:new Date().toISOString()
      };
      const {error}=await database.from('audit_log').insert({
        organization_id:profile.organization_id,
        actor_id:profile.id,
        action:String(action).slice(0,120),
        entity_type:String(entityType).slice(0,80),
        entity_id:String(entityId).slice(0,160),
        metadata:safeMetadata
      });
      if(error)throw error;
      return reply(res,201,{ok:true});
    }

    if(req.method==='GET'){
      if(!['admin','supervisor'].includes(profile.role))return reply(res,403,{message:'Not authorized.'});
      const limit=Math.min(Number(req.query.limit)||300,1000);
      const {data:logs,error}=await database.from('audit_log').select('id,actor_id,organization_id,action,entity_type,entity_id,metadata,created_at').order('created_at',{ascending:false}).limit(limit);
      if(error)throw error;
      const actorIds=[...new Set((logs||[]).map(item=>item.actor_id).filter(Boolean))];
      const orgIds=[...new Set((logs||[]).map(item=>item.organization_id).filter(Boolean))];
      const [{data:profiles},{data:organizations}]=await Promise.all([
        actorIds.length?database.from('profiles').select('id,full_name,email,phone,role,organization_id').in('id',actorIds):Promise.resolve({data:[]}),
        orgIds.length?database.from('organizations').select('id,name').in('id',orgIds):Promise.resolve({data:[]})
      ]);
      const profileMap=Object.fromEntries((profiles||[]).map(item=>[item.id,item]));
      const orgMap=Object.fromEntries((organizations||[]).map(item=>[item.id,item]));
      return reply(res,200,{activities:(logs||[]).map(item=>({
        ...item,
        actor:profileMap[item.actor_id]||null,
        organization:orgMap[item.organization_id]||null
      }))});
    }

    return reply(res,405,{message:'Method not allowed.'});
  }catch(error){
    console.error('client activity error',error);
    return reply(res,500,{message:'Unable to process activity data.'});
  }
}
