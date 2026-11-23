const app = document.querySelector('#app');
const esc = x => String(x ?? '未记录').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = x => Number(x).toLocaleString('zh-CN');
const names = {pool:'数据池',task:'主要交互',topic:'话题',language:'语言',origin:'原始来源',batch:'批次',full_duplex_bench_v15:'Benchmark 专项',duplex:'通用双工',general:'普通对话',user_interruption:'用户打断',user_backchannel:'用户附和',talking_to_other:'对旁人讲话',background_speech:'背景语音',natural_dialogue:'自然对话',zh:'中文',en:'英文',constructed_fdb_content:'围绕评测目标生成',constructed_exact_numeric_GT:'构造精确数值素材'};
const label = k => esc(names[k] || k);
const refs = {topic:'话题','topic+topic_detail':'细分话题','overlap_topic+overlap_topic_detail':'重叠语音话题','scenario+topic+act':'场景 × 话题 × 行为','scenario+relation+overlap_act':'场景 × 关系 × 重叠行为','scenario+topic+topic_detail+act+relation+overlap_topic+overlap_topic_detail+overlap_act':'完整交互组合'};
const locator='https://gist.githubusercontent.com/xjwxjw/7cf810ed0a298f32d029117e2f0842e5/raw/origin.json';
let origin='', version=0;
const local = location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.hostname.endsWith('.trycloudflare.com');
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
async function api(path){
  if(!local && !origin){
    try{origin=(await json(locator)).origin;}catch{origin='https://pork-activists-myspace-robot.trycloudflare.com';}
    if(!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin))throw Error('数据源地址无效');
  }
  return json(origin+path);
}
const link = (params,title) => '<a href="#samples?'+esc(new URLSearchParams(params))+'">'+title+'</a>';
const card=(title,v,params)=>'<div class="card"><span>'+title+'</span><strong>'+(params?link(params,num(v)):esc(v))+'</strong></div>';
function overview(s){
  const t=s.status;
  return '<h1>合成数据概览</h1><p class="muted">按评测目标追踪文本、音频与审核进度</p><div class="cards">'+card('已审阅文本',t.reviewed_texts,{})+card('已索引音频',s.audio,{audio:1})+card('Stage 2 规模目标',num(t.goal))+card('训练准入',t.training_admitted?'已开放':'未开放')+'</div><h2>Benchmark</h2><section><h2 style="margin:0">FullDuplexBench v1.5</h2><p>围绕用户打断、附和、对旁人讲话与背景语音，检查助手能否在重叠语音中适时让出或保持话轮。</p><p>当前重点包括回复时延、旁话的指向、附和音的可懂度，以及不同话题与中英文场景的覆盖。</p><div class="bar"><b style="width:'+Math.min(100,100*t.reviewed_texts/t.goal)+'%"></b></div><p class="muted">已审阅至第 '+t.last_review+' 批 · 每批 512 段</p><a class="button" href="#coverage">查看覆盖分析</a></section><h2>数据构成</h2><div class="cards">'+s.facets.pool.map(([k,v])=>card(label(k),v,{pool:k})).join('')+'</div>';
}
function coverage(s){
  const groups=s.coverage.bilingual,clear=s.coverage.whole_review_clear;
  let rows=Object.entries(groups).map(([k,v])=>'<tr><td>'+esc(refs[k]||k)+'</td><td>'+v.matched+' / '+v.reference+'</td><td>'+esc(clear[k]?.matched)+' / '+esc(clear[k]?.reference)+'</td><td>'+Math.round(v.matched/v.reference*100)+'%</td></tr>').join('');
  return '<h1>FullDuplexBench v1.5</h1><p>累计至第 '+s.status.last_review+' 批。分母为各维度的参考组合数，同一组合出现多次只计一次。</p><h2>覆盖分析</h2><div class="panel"><table><tr><th>评测维度</th><th>双语覆盖</th><th>整段审核通过后覆盖</th><th>双语覆盖率</th></tr>'+rows+'</table></div>'+Object.entries(clear).filter(([,v])=>v.missing?.length).map(([k,v])=>details((refs[k]||k)+' · 审核后仍缺 '+v.missing.length+' 项',v.missing)).join('')+'<h2>按主要交互查看样本</h2><div class="links">'+s.facets.task.map(([k,v])=>link({task:k},label(k)+' · '+num(v))).join('')+'</div>';
}
const details=(name,obj)=>'<details><summary>'+esc(name)+'</summary><pre>'+esc(JSON.stringify(obj,null,2))+'</pre></details>';
async function samples(s,q){
  const d=await api('/api/samples?'+q);
  const selects=Object.entries(s.facets).map(([key,items])=>'<select name="'+key+'" aria-label="'+label(key)+'"><option value="">全部'+label(key)+'</option>'+items.map(([k])=>'<option value="'+esc(k)+'" '+(q.get(key)===String(k)?'selected':'')+'>'+label(k)+'</option>').join('')+'</select>').join('');
  const page=Number(q.get('page')||1);
  const pageLink=(p,title)=>{const v=new URLSearchParams(q);v.set('page',p);return link(v,title)};
  return '<h1>样本库</h1><p class="muted">FullDuplexBench v1.5 · '+num(d.total)+' 条匹配记录</p><form>'+selects+'<select name="audio" aria-label="音频"><option value="">全部音频状态</option><option value="1" '+(q.get('audio')==='1'?'selected':'')+'>已有音频</option></select><input name="q" placeholder="搜索样本 ID" value="'+esc(q.get('q')||'')+'"><button>筛选</button><a class="button" href="#samples">重置</a></form><div class="panel"><table><tr><th>样本 ID</th><th>批次</th><th>交互</th><th>话题</th><th>语言</th><th>音频</th></tr>'+d.rows.map(r=>'<tr><td class="mono"><a href="#sample/'+encodeURIComponent(r.slot)+'">'+esc(r.id)+'</a></td><td>'+r.batch+'</td><td>'+label(r.task)+'</td><td>'+label(r.topic)+'</td><td>'+label(r.language)+'</td><td>'+(r.audio?'已合成':'待索引')+'</td></tr>').join('')+'</table></div><p>'+(page>1?pageLink(page-1,'上一页'):'')+'　'+page+' / '+Math.max(1,Math.ceil(d.total/30))+'　'+(page*30<d.total?pageLink(page+1,'下一页'):'')+'</p>';
}
function dialogue(rows){
  return (rows||[]).map(r=>'<div class="turn">'+['user','assistant'].filter(k=>r[k]).map(k=>'<b>'+(k==='user'?'用户':'助手')+'</b><p>'+esc(r[k])+'</p>').join('')+'</div>').join('');
}
function sample(d){
  const src=d.source;
  return '<a href="#samples">样本库</a><h1>'+label(d.task)+'</h1><div class="mono">'+esc(d.id)+'</div><p class="muted">第 '+d.batch+' 批 · '+label(d.pool)+' · '+label(d.language)+' · '+label(d.topic)+'</p><h2>来源与生成</h2><section><dl><dt>素材来源</dt><dd>'+label(src.source_kind||'未记录')+'</dd><dt>原始记录</dt><dd>'+esc(src.source_conversation_id)+'</dd><dt>生成模型</dt><dd>'+esc(src.generation_model)+'</dd><dt>来源版本</dt><dd>'+esc(src.source_revision)+'</dd></dl>'+dialogue(src.dialogue)+details('来源元数据',src)+'</section><h2>最终对白与音频</h2><section>'+(d.audio?'<audio controls preload="none" src="'+esc(origin)+'/audio/'+encodeURIComponent(d.slot)+'"></audio>':'<p>当前版本尚无已索引音频。</p>')+dialogue(d.turns)+details('交互事件',d.events)+'</section><h2>处理与审核</h2><p>时序方案 '+esc(d.policy)+' · '+(d.revised?'已采用修订文本':'当前采用原索引文本')+'</p>'+details('合成目标',d.target)+(d.steps.length?d.steps.map(x=>details(x.title,x.data)).join(''):'<p>尚无可关联的审核记录。</p>');
}
async function render(){
  const current=++version;
  const [route,query]=location.hash.slice(1).split('?');
  try{
    const s=await api('/api/summary');
    let body;
    if(route?.startsWith('sample/'))body=sample(await api('/api/sample/'+encodeURIComponent(route.slice(7))));
    else if(route==='samples')body=await samples(s,new URLSearchParams(query));
    else body=route==='coverage'?coverage(s):overview(s);
    if(current!==version)return;
    app.innerHTML=body+'<footer>索引更新于 '+esc(s.updated)+' · 每 5 分钟同步</footer>';
    document.querySelectorAll('nav a').forEach(a=>a.toggleAttribute('aria-current',a.hash==='#'+(route||'overview')));
  }catch(e){if(current===version){origin='';app.innerHTML='<h1>数据暂时无法读取</h1><p>'+esc(e.message)+'</p><button id="retry">重新加载</button>';document.querySelector('#retry').onclick=render;}}
}
document.addEventListener('submit',e=>{e.preventDefault();const q=new URLSearchParams();for(const [k,v] of new FormData(e.target))if(v)q.set(k,v);location.hash='samples?'+q;});
window.addEventListener('hashchange',()=>{window.scrollTo(0,0);render()});render();
setInterval(()=>{if(!document.hidden&&['','#overview','#coverage'].includes(location.hash))render()},300000);
