// Same FFmpeg API as the existing converter, loaded only when an export starts.
// Pin wrapper and core together; the core is downloaded from jsDelivr with CORS.
let loading;
export async function createEngine(onProgress=()=>{}){
 if(!crossOriginIsolated||typeof SharedArrayBuffer==='undefined')throw Error('Video export needs a secure browser session. Reload this page on convertshorts.com in Chrome or Edge.');
 if(!window.FFmpeg){loading??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';script.crossOrigin='anonymous';const timeout=setTimeout(()=>{script.remove();loading=null;reject(Error('The video engine download timed out. Check your connection and retry.'));},45000);script.onload=()=>{clearTimeout(timeout);resolve();};script.onerror=()=>{clearTimeout(timeout);script.remove();loading=null;reject(Error('Could not download the video engine. Check your connection and retry.'));};document.head.append(script);});await loading;}
 const ff=window.FFmpeg.createFFmpeg({log:false,corePath:'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'});
 ff.setProgress(({ratio})=>onProgress(Math.max(0,Math.min(1,ratio||0))));
 return ff;
}
export async function runChecked(ff,args,output){
 const messages=[];
 ff.setLogger(({message})=>{messages.push(message);if(messages.length>20)messages.shift();});
 try{ff.FS('unlink',output);}catch{}
 try{
  await ff.run(...args,output);
  let bytes;
  try{bytes=ff.FS('readFile',output);}catch{console.error('Video encoder:',messages.join('\n'));throw Error('The video engine could not encode this file. Try a shorter clip or a different input format.');}
  if(bytes.byteLength<100){console.error('Video encoder:',messages.join('\n'));throw Error('The export is empty. Try a different input video.');}
  return bytes;
 }finally{ff.setLogger(()=>{});}
}
export async function hasAudio(ff,path){let audio=false;ff.setLogger(({message})=>{if(/Stream.*Audio:/.test(message))audio=true;});try{await ff.run('-i',path);}finally{ff.setLogger(()=>{});}return audio;}
