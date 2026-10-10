// Public product policy. Provider credentials are server-only.
export const CLOUD_MEDIA_BYTES=500*1024*1024;
export const CLOUD_DAYS=30;
export const CLOUD_FILE_BYTES=150*1024*1024;
export const isExpired=item=>!!item?._expiresAt&&Date.parse(item._expiresAt)<=Date.now();
export function retentionText(item){
  if(!item?._expiresAt)return 'On this device';
  const days=Math.max(0,Math.ceil((Date.parse(item._expiresAt)-Date.now())/86400000));
  return days?'Cloud copy · '+days+' day'+(days===1?'':'s')+' left':'Cloud copy expired';
}
