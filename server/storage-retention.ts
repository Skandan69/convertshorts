// Scheduled, scoped cleanup. A Vault token and server-only RPC authorize it.
const env=(key:string)=>Deno.env.get(key)||'';
const headers=()=>({apikey:env('SUPABASE_SERVICE_ROLE_KEY'),Authorization:'Bearer '+env('SUPABASE_SERVICE_ROLE_KEY'),'Content-Type':'application/json'});
async function rpc(name:string,body:unknown){
 const r=await fetch(env('SUPABASE_URL')+'/rest/v1/rpc/'+name,{method:'POST',headers:headers(),body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Retention authorization or database operation failed');const text=await r.text();return text?JSON.parse(text):null;
}
export async function handleRetention(req:Request){
 if(req.method!=='POST')return new Response('Unsupported method',{status:405});
 const token=req.headers.get('x-retention-token')||'';
 if(!/^[0-9a-f]{64}$/.test(token))return new Response('Unauthorized',{status:401});
 try{
  const claim=await rpc('convertshorts_claim_retention',{token});
  if(!claim.claimed)return Response.json({skipped:true});
  const paths=claim.paths;
  if(!Array.isArray(paths)||paths.length>500||paths.some((p:unknown)=>typeof p!=='string'||! /^[0-9a-f-]{36}\//.test(p)))throw Error('Invalid retention scope');
  if(paths.length){
   const r=await fetch(env('SUPABASE_URL')+'/storage/v1/object/convertshorts-private',{method:'DELETE',headers:headers(),body:JSON.stringify({prefixes:paths}),signal:AbortSignal.timeout(30000)});
   if(!r.ok)throw Error('Storage cleanup failed; expired metadata is retained for retry');
  }
  await rpc('convertshorts_finish_retention',{deleted:paths.length});
  return Response.json({completed:true,deleted:paths.length});
 }catch{return Response.json({error:'Retention cleanup failed; retry is scheduled'},{status:502});}
}
if(import.meta.main)Deno.serve(handleRetention);
