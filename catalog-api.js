const locator='https://gist.githubusercontent.com/xjwxjw/7cf810ed0a298f32d029117e2f0842e5/raw/origin.json';
let origin='';
const local = location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.hostname.endsWith('.trycloudflare.com');
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
async function api(path){
  if(!local && !origin){
    try{origin=(await json(locator)).origin;}catch{origin='https://pork-activists-myspace-robot.trycloudflare.com';}
    if(!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin))throw Error('数据源地址无效');
  }
  return json(origin+path);
}
