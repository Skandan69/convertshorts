// Consume Supabase's implicit callback before the hash router or page title sees
// it. Tokens stay in memory until Auth validates them, never in rendered URLs.
export function consumeAuthCallback(location,history){
 const params=new URLSearchParams(location.hash.slice(1));
 if(!['access_token','refresh_token','error','error_code','error_description'].some(key=>params.has(key)))return null;
 history.replaceState(null,'','/apps/#account');
 if(params.has('error')||params.has('error_code')||params.has('error_description'))return {error:'This email link is invalid or has expired. Request a new email below.'};
 const access_token=params.get('access_token'),refresh_token=params.get('refresh_token');
 if(!access_token||!refresh_token)return {error:'This email link is incomplete. Request a new email below.'};
 const seconds=Number(params.get('expires_in'));
 return {access_token,refresh_token,expires_in:Number.isFinite(seconds)&&seconds>0?seconds:3600,needsPasswordReset:params.get('type')==='recovery'};
}
export const authReturnURL=origin=>new URL('/apps/',origin).href;
