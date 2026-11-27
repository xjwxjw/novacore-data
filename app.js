const app = document.querySelector('#app');
const esc = x => String(x ?? '未记录').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = x => Number(x).toLocaleString('zh-CN');
const names = {pool:'数据池',task:'主要交互',topic:'话题',language:'语言',origin:'原始来源',batch:'批次',full_duplex_bench_v15:'Benchmark 专项',duplex:'通用双工',general:'普通对话',user_interruption:'用户打断',user_backchannel:'用户附和',talking_to_other:'对旁人讲话',background_speech:'背景语音',natural_dialogue:'自然对话',zh:'中文',en:'英文',constructed_fdb_content:'围绕评测目标生成',constructed_exact_numeric_GT:'构造精确数值素材'};
const label = k => esc(names[k] || k);
const refs = {topic:'话题','topic+topic_detail':'细分话题','overlap_topic+overlap_topic_detail':'重叠语音话题','scenario+topic+act':'场景 × 话题 × 行为','scenario+relation+overlap_act':'场景 × 关系 × 重叠行为','scenario+topic+topic_detail+act+relation+overlap_topic+overlap_topic_detail+overlap_act':'完整交互组合'};
let version=0;
const link = (params,title) => '<a href="#benchmark/fdb15/samples?'+esc(new URLSearchParams(params))+'">'+title+'</a>';
const card=(title,v,params)=>'<div class="card"><span>'+title+'</span><strong>'+(params?link(params,num(v)):esc(v))+'</strong></div>';
let overviewCollapsed = true;

app.addEventListener('click', event => {
  const toggle = event.target.closest('button[aria-controls="fdb-overview-body"]');
  if (!toggle) return;
  const body = document.getElementById('fdb-overview-body');
  overviewCollapsed = !body.hidden;
  body.hidden = overviewCollapsed;
  toggle.setAttribute('aria-expanded', String(!overviewCollapsed));
  toggle.textContent = overviewCollapsed ? '展开' : '收起';

});

function behaviorResults(results){
  if (!results) return '';
  const metrics = [
    ['overall','总体'], ['user_interruption','明确打断'], ['user_backchannel','用户附和'],
    ['talking_to_other','用户对旁人说话'], ['background_speech','背景语音']
  ];
  const localModels = [
    ['direct25','NovaCore 原始 25% 版','nova'],
    ['qwen3-498','Qwen3-Omni 原始权重','qwen']
  ].map(([id,name,color]) => ({
    name,color,values:metrics.map(([key]) => 100*results[id][key][0]/results[id][key][1])
  }));
  // Four published behavior rates in metric order, excluding overall.
  const published = [
    ['Joy-Duplex','venus',[88,96,72,85]],
    ['Realtime-Venus-Audio','venus',[75,97,88,86]],
    ['Realtime-Venus-Omni','venus',[60,92,90,85]],
    ['Gemini 3.1 Live','venus',[77,95,66,66]],
    ['MiniCPM-o 4.5','venus',[60,95,79,82]],
    ['Covo-Audio-Chat','emnlp',[81,98,40,11]],
    ['Fun-Audio-Chat','emnlp',[71.5,95.9,7,9]]
  ];
  const weights = [200,98,100,100];
  const models = localModels.concat(published.map(([name,color,rates]) => {
    const overall = rates.reduce((sum,rate,i) => sum + rate*weights[i],0)/498;
    return {name,color,estimated:true,values:[overall,...rates]};
  }));
  const ticks = [0,25,50,75,100].map(n =>
    '<div class="score-tick" style="bottom:'+n+'%"><span>'+n+'%</span></div>').join('');
  const charts = metrics.map(([,title],i) => {
    const ranked = models.slice().sort((a,b) => b.values[i] - a.values[i]);
    const bars = ranked.map(model => {
      const value = model.values[i].toFixed(1);
      const label = (model.estimated && i===0 ? '≈' : '')+value+'%';
      return '<div class="score-series" role="img" aria-label="'+model.name+'，'+title+'，'+label+'"><div class="score-column '+model.color+'" style="height:'+value+'%"><b>'+label+'</b></div><span>'+model.name+'</span></div>';
    }).join('');
    return '<section class="score-panel"><h4>'+title+'</h4><div class="score-scroll" tabindex="0" aria-label="'+title+'正确率柱状图"><div class="score-chart">'+ticks+bars+'</div></div></section>';
  }).join('');
  return '<section class="behavior-results"><h3>模型评测结果</h3><p>NovaCore 和 Qwen3-Omni 为本地 Qwen3.8-27B 评审结果。公开基线采用各报告的评测设置。总体标注 ≈ 的数值按 200、98、100、100 个案例加权估算。</p><div class="score-legend"><span><i class="nova"></i>NovaCore · 本地</span><span><i class="qwen"></i>Qwen3-Omni · 本地</span><span><i class="venus"></i><a href="https://arxiv.org/html/2609.13814v3#S7.T6">Realtime-Venus 报告 · 表 6</a></span><span><i class="emnlp"></i><a href="https://aclanthology.org/2026.emnlp-main.1126.pdf#page=7">EMNLP 2026 独立评测 · 表 3</a></span></div>'+charts+'</section>';
}

function overview(s,records,all){
  return '<h1>Benchmark 目录</h1><section class="entry"><div class="entry-heading"><h2>FullDuplexBench v1.5</h2><button type="button" aria-controls="fdb-overview-body" aria-expanded="'+!overviewCollapsed+'">'+(overviewCollapsed?'展开':'收起')+'</button></div><div id="fdb-overview-body"'+(overviewCollapsed?' hidden':'')+'><p>用有插话与无插话的两次测试，对照模型的停声、接话时机与回应内容。第 '+s.status.last_review+' 批已审阅</p><a class="button benchmark-pipeline" href="pipeline.html">查看数据合成流程</a>'+distributionChart(s,records,all,'#overview')+behaviorResults(s.fdb_behavior_results)+coverage(s)+'</div></section>';
}
function coverage(s){
  const {bilingual,whole_review_clear:reviewed}=s.coverage;
  function measure(record,kind,title){
    if(!record || !record.reference)return '<span>暂无统计</span>';
    const percent=100*record.matched/record.reference;
    return '<div class="coverage-measure '+kind+'" aria-label="'+title+'"><span class="coverage-track" aria-hidden="true"><i style="width:'+percent+'%"></i></span><span>'+num(record.matched)+' / '+num(record.reference)+' <b>'+percent.toFixed(1)+'%</b></span></div>';
  }
  const axes=Object.entries(bilingual).sort(([a],[b])=>(reviewed[b]?.reference-reviewed[b]?.matched||0)-(reviewed[a]?.reference-reviewed[a]?.matched||0));
  const rows=axes.map(([key,record])=>{
    const audit=reviewed[key];
    const gap=audit?audit.reference-audit.matched:null;
    const gaps=audit?.missing?.length?'<details class="coverage-gaps"><summary>查看缺少的组合</summary><ul>'+audit.missing.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul></details>':'';
    return '<div class="coverage-axis"><div><strong>'+esc(refs[key]||key)+'</strong><small>'+(gap===null?'暂无审核数据':gap?'审核后缺 '+num(gap)+' 项':'审核后已覆盖全部')+'</small></div><div>'+measure(record,'observed','双语覆盖')+measure(audit,'reviewed','整段审核通过后覆盖')+'</div>'+gaps+'</div>';
  }).join('');
  const cases=s.cases;
  const summary=cases?.total?'<div class="coverage-cases"><div><strong>官方案例匹配</strong><small>第 '+num(cases.batch)+' 批 · 每个案例分别比对中、英文样本</small></div><div>'+measure({matched:cases.matched,reference:cases.total},'matched','已匹配的案例与语言组合')+'<small>尚有 '+num(cases.total-cases.matched)+' 个案例与语言组合未确认匹配</small></div></div>':'';
  return '<section class="coverage-visual"><h2>覆盖分析</h2>'+summary+'<h3>评测维度覆盖</h3><div class="coverage-legend"><span>双语覆盖</span><span>整段审核通过后覆盖</span></div>'+rows+'<p class="coverage-caption">第 '+s.status.last_review+' 批 · 各维度按官方参考组合去重计数。</p></section>';
}
const details=(name,obj)=>'<details><summary>'+esc(name)+'</summary><pre>'+esc(JSON.stringify(obj,null,2))+'</pre></details>';
async function samples(s,q){
  const d=await api('/api/samples?'+q);
  const selects=Object.entries(s.facets).map(([key,items])=>'<select name="'+key+'" aria-label="'+label(key)+'"><option value="">全部'+label(key)+'</option>'+items.map(([k])=>'<option value="'+esc(k)+'" '+(q.get(key)===String(k)?'selected':'')+'>'+label(k)+'</option>').join('')+'</select>').join('');
  const page=Number(q.get('page')||1);
  const pageLink=(p,title)=>{const v=new URLSearchParams(q);v.set('page',p);return link(v,title)};
  return '<h2>对应构建的数据</h2><p class="muted">FullDuplexBench v1.5 · '+num(d.total)+' 条匹配记录</p><form>'+selects+'<select name="audio" aria-label="音频"><option value="">全部音频状态</option><option value="1" '+(q.get('audio')==='1'?'selected':'')+'>已有音频</option></select><input name="q" placeholder="搜索样本 ID" value="'+esc(q.get('q')||'')+'"><button>筛选</button><a class="button" href="#benchmark/fdb15/samples">重置</a></form><div class="panel"><table><tr><th>样本 ID</th><th>批次</th><th>交互</th><th>话题</th><th>语言</th><th>音频</th></tr>'+d.rows.map(r=>'<tr><td class="mono"><a href="#benchmark/fdb15/sample/'+encodeURIComponent(r.slot)+'">'+esc(r.id)+'</a></td><td>'+r.batch+'</td><td>'+label(r.task)+'</td><td>'+label(r.topic)+'</td><td>'+label(r.language)+'</td><td>'+(r.audio?'已合成':'待索引')+'</td></tr>').join('')+'</table></div><p>'+(page>1?pageLink(page-1,'上一页'):'')+'　'+page+' / '+Math.max(1,Math.ceil(d.total/30))+'　'+(page*30<d.total?pageLink(page+1,'下一页'):'')+'</p>';
}
function dialogue(rows){
  return (rows||[]).map(r=>'<div class="turn">'+['user','assistant'].filter(k=>r[k]).map(k=>'<b>'+(k==='user'?'用户':'助手')+'</b><p>'+esc(r[k])+'</p>').join('')+'</div>').join('');
}
function sample(d){
  const src=d.source;
  return '<a href="#benchmark/fdb15/samples">样本库</a><h1>'+label(d.task)+'</h1><div class="mono">'+esc(d.id)+'</div><p class="muted">第 '+d.batch+' 批 · '+label(d.pool)+' · '+label(d.language)+' · '+label(d.topic)+'</p><h2>来源与生成</h2><section><dl><dt>素材来源</dt><dd>'+label(src.source_kind||'未记录')+'</dd><dt>原始记录</dt><dd>'+esc(src.source_conversation_id)+'</dd><dt>生成模型</dt><dd>'+esc(src.generation_model)+'</dd><dt>来源版本</dt><dd>'+esc(src.source_revision)+'</dd></dl>'+dialogue(src.dialogue)+details('来源元数据',src)+'</section><h2>最终对白与音频</h2><section>'+(d.audio?'<audio controls preload="none" src="'+esc(origin)+'/audio/'+encodeURIComponent(d.slot)+'"></audio>':'<p>当前版本尚无已索引音频。</p>')+dialogue(d.turns)+details('交互事件',d.events)+'</section><h2>处理与审核</h2><p>时序方案 '+esc(d.policy)+' · '+(d.revised?'已采用修订文本':'当前采用原索引文本')+'</p>'+details('合成目标',d.target)+(d.steps.length?d.steps.map(x=>details(x.title,x.data)).join(''):'<p>尚无可关联的审核记录。</p>');
}
async function render(){
  const current=++version;
  let [route,query]=location.hash.slice(1).split('?');
  if(route==='benchmark/fdb15/pipeline'){
    location.replace('pipeline.html');
    return;
  }
  if(route==='benchmark/fdb15' || route==='benchmark/fdb15/'){
    route='overview';
    history.replaceState(null,'','#overview'+(query?'?'+query:''));
  }
  try{
    const s=await api('/api/summary');
    let body;
    const prefix='benchmark/fdb15';
    const section=route===prefix?'':route?.startsWith(prefix+'/')?route.slice(prefix.length+1):route;
    const all=new URLSearchParams(query).get('scope')==='all';
    if(!route||route==='overview')body=overview(s,await json('fdb15.json'),all);
    else if(section?.startsWith('sample/'))body=benchmarkFrame('samples',sample(await api('/api/sample/'+encodeURIComponent(section.slice(7)))));
    else if(section==='samples')body=benchmarkFrame('samples',await samples(s,new URLSearchParams(query)));
    else if(section==='coverage')body=benchmarkFrame('coverage',coverage(s));
    else{
      const records=await json('fdb15.json');
      if(section==='cases')body=caseList(records,new URLSearchParams(query));
      else if(section?.startsWith('case/'))body=officialCase(records.find(r=>r.id===section.slice(5)),await api('/api/cases'),origin);
      else body=overview(s,records,all);
    }
    if(current!==version)return;
    app.innerHTML=body+'<footer>索引更新于 '+esc(s.updated)+' · 每 5 分钟同步</footer>';
    document.querySelectorAll('nav a').forEach(a=>a.toggleAttribute('aria-current',a.hash==='#'+(route||'overview')));
  }catch(e){if(current===version){origin='';app.innerHTML='<h1>数据暂时无法读取</h1><p>'+esc(e.message)+'</p><button id="retry">重新加载</button>';document.querySelector('#retry').onclick=render;}}
}
document.addEventListener('submit',e=>{e.preventDefault();const q=new URLSearchParams();for(const [k,v] of new FormData(e.target))if(v)q.set(k,v);location.hash=(e.target.dataset.route||'benchmark/fdb15/samples')+'?'+q;});
window.addEventListener('hashchange',()=>{window.scrollTo(0,0);render()});render();
setInterval(()=>{if(!document.hidden&&['','#overview',bench,bench+'/coverage','#coverage'].includes(location.hash.split('?')[0]))render()},300000);
