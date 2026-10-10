export function GET(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 return Response.json({enabled:!!(url&&key),url:url||null,publishableKey:key||null,bucket:'convertshorts-private',retentionDays:30,mediaLimitBytes:524288000,customerMode:'managed',googleEnabled:process.env.CONVERTSHORTS_GOOGLE_AUTH==='true'},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
