const bench = '#benchmark/fdb15';
const releaseURL = 'https://github.com/DanielLin94144/Full-Duplex-Bench/tree/35c6a95dfb0070341b148498d590b589e0f0ce55/v1_v1.5/dataset';
const focus = {
  user_interruption:'用户向助手提出新请求。观察助手何时让出话轮，以及接下来的回答能否处理新内容。',
  user_backchannel:'用户在助手讲话时发出简短附和。观察助手能否保持话轮，自然完成原回答。',
  talking_to_other:'用户转向旁人说话。观察助手能否识别说话对象，继续原任务。',
  background_speech:'其他声音在背景中出现。观察助手能否在干扰下继续原回答。'
};
function benchmarkFrame(tab,body){
  const tabs=[['','概览'],['cases','官方测试案例'],['samples','对应构建的数据']];
  return '<a href="#overview">Benchmark 目录</a><h1>FullDuplexBench v1.5</h1><div class="bench-tabs">'+tabs.map(([key,title])=>'<a '+(tab===key?'aria-current="page" ':'')+'href="'+(key?bench+'/'+key:'#overview')+'">'+title+'</a>').join('')+'</div>'+body;
}
function distributionChart(s, records, all, route) {
  const pool = 'full_duplex_bench_v15';
  const pools = Object.fromEntries(s.facets.pool);
  const specialized = s.fdb_tasks;
  const leftTotal = records.length;
  const rightTotal = all ? s.status.reviewed_texts : pools[pool] || 0;
  const rows = Object.keys(focus).map(key => ({
    title: label(key),
    left: records.filter(r => r.scenario === key).length,
    right: specialized[key] || 0,
    cases: bench+'/cases?type='+key,
    samples: bench+'/samples?'+new URLSearchParams({pool, task:key})
  }));
  if (all) {
    for (const [key,count] of s.facets.pool) {
      if (key !== pool) rows.push({title:label(key), right:count, samples:bench+'/samples?pool='+encodeURIComponent(key)});
    }
  }
  const percent = (count,total) => total ? (100*count/total).toFixed(1)+'%' : '—';
  const root = (side,title,count,unit,url) =>
    '<a class="flow-root '+side+'" href="'+url+'"><span>'+title+'</span><strong>'+num(count)+'</strong><small>'+unit+'</small></a>';
  function branches(side,total) {
    const height = rows.length*64;
    const curves = rows.map((row,i)=>{
      if(!row[side] || !total)return '';
      const y = 32+64*i;
      const weight = 1.5+17*row[side]/total;
      return '<path d="M 0 '+height/2+' C 45 '+height/2+' 55 '+y+' 100 '+y+'" stroke-width="'+weight+'"/>';
    }).join('');
    return '<svg class="flow-branches '+side+'" viewBox="0 0 100 '+height+'" preserveAspectRatio="none" aria-hidden="true"><g '+(side==='right'?'transform="translate(100 0) scale(-1 1)"':'')+'>'+curves+'</g></svg>';
  }
  const metric = (count,total,url,side,title) => '<a class="flow-value '+side+'" href="'+esc(url)+'" aria-label="'+title+'，'+num(count)+'，占 '+percent(count,total)+'"><strong>'+percent(count,total)+'</strong><small>'+num(count)+(side==='left'?' 个案例':' 段文本')+'</small></a>';
  const lines = rows.map(row=>'<div class="flow-row">'+(row.left===undefined?'<span class="flow-na" aria-label="无对应官方类别">—</span>':metric(row.left,leftTotal,row.cases,'left',row.title+'官方案例'))+'<b>'+row.title+'</b>'+metric(row.right,rightTotal,row.samples,'right',row.title+'合成数据')+'</div>').join('');
  const rightUrl = bench+'/samples'+(all?'':'?pool='+pool);
  const toggle = (value,title) => '<a href="'+route+(value?'?scope=all':'')+'" '+(value===all?'aria-current="true"':'')+'>'+title+'</a>';
  return '<figure class="distribution"><div class="flow-heading"><h2>案例类型分布</h2><div class="flow-toggle" aria-label="合成数据范围">'+toggle(false,'FDB 专项')+toggle(true,'全部合成')+'</div></div><p class="flow-note">左侧按官方案例计数，右侧按已审阅文本的主要交互类型计数。各侧占比以各自总数为分母。</p><div class="flow-chart">'+
    root('left','Benchmark',leftTotal,'官方测试案例',bench+'/cases')+branches('left',leftTotal)+'<div class="flow-rows">'+lines+'</div>'+branches('right',rightTotal)+root('right','合成数据',rightTotal,all?'全部已审阅文本':'FDB 专项文本',rightUrl)+
    '</div><figcaption>第 '+s.status.last_review+' 批 · 点击任一侧的数量可查看对应数据。</figcaption></figure>';
}
function caseList(records,q){
  const type=q.get('type')||'',term=(q.get('q')||'').trim().toLowerCase();
  const visible=records.filter(r=>(!type||r.scenario===type)&&(!term||[r.id,r.context,r.incoming].some(t=>t.toLowerCase().includes(term))));
  const form='<form data-route="benchmark/fdb15/cases"><select aria-label="评测类别" name="type"><option value="">全部评测类别</option>'+Object.keys(focus).map(k=>'<option value="'+k+'" '+(type===k?'selected':'')+'>'+label(k)+'</option>').join('')+'</select><input aria-label="搜索官方案例" name="q" value="'+esc(q.get('q')||'')+'" placeholder="案例 ID 或英文原话"><button>筛选</button><a class="button" href="'+bench+'/cases">重置</a></form>';
  const sections=Object.entries(focus).map(([key,desc])=>{
    const rows=visible.filter(r=>r.scenario===key);
    if(!rows.length)return '';
    return '<h2>'+label(key)+' · '+rows.length+'</h2><p>'+desc+'</p><div class="panel"><table><thead><tr><th>案例</th><th>原始请求</th><th>插入语音</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><a href="'+bench+'/case/'+r.id+'">#'+r.id.split('/')[1]+'</a></td><td>'+esc(r.context)+'</td><td>'+esc(r.incoming)+'</td></tr>').join('')+'</tbody></table></div>';
  }).join('');
  return benchmarkFrame('cases','<h2>官方测试案例</h2><p>发布包共 '+records.length+' 个英文案例。中文和英文构建数据按同一个官方案例关联。</p>'+form+sections+(visible.length?'':'<p>没有匹配的案例。</p>')+'<footer>来源：<a href="'+releaseURL+'">FDB v1.5 数据说明</a>。说明表列出 99 个附和案例，官方附和压缩包实际含 98 个带标注的案例。</footer>');
}
function officialCase(r,matches,base){
  if(!r)return benchmarkFrame('cases','<h2>未找到这个案例</h2>');
  const aud=base+'/fdb15/'+r.id+'/';
  const recordings=[['input','含事件的测试输入'],['clean_input','无事件的对照输入']];
  const groups=['zh','en'].map(lang=>{
    const row=matches?.find(([l,id])=>l===lang&&id===r.id);
    const content=!row?'暂无比对记录':row[2].length?row[2].map(id=>link({q:id.split('/')[0]},esc(id))).join('<br>'):'本轮尚无确认匹配';
    return '<h3>'+label(lang)+'构建数据</h3><p>'+content+'</p>';
  }).join('');
  return benchmarkFrame('cases','<a href="'+bench+'/cases?type='+r.scenario+'">'+label(r.scenario)+'案例列表</a><h2>'+label(r.scenario)+' #'+r.id.split('/')[1]+'</h2><p>'+focus[r.scenario]+'</p><section><div class="turn"><b>原始请求</b><p>'+esc(r.context)+'</p></div><div class="turn"><b>插入语音</b><p>'+esc(r.incoming)+'</p></div><p>事件发生在 <strong>'+r.start.toFixed(3)+'–'+r.end.toFixed(3)+' 秒</strong>，持续 '+(r.end-r.start).toFixed(3)+' 秒。</p></section><div class="columns">'+recordings.map(([file,title])=>'<section><h3>'+title+'</h3><audio controls preload="none" src="'+esc(aud+file+'.wav')+'"></audio></section>').join('')+'</div><h2>与此案例匹配的构建数据</h2>'+groups+'<a href="'+bench+'/samples?task='+r.scenario+'">浏览同类合成样本</a>');
}

function synthesisPipeline(s) {
  const stage = (title, summary, output) =>
    '<div class="pipe-stage"><h3>'+title+'</h3><p>'+summary+'</p><small>'+output+'</small></div>';
  const fork = (left,right) => '<div class="pipe-fork">'+left+right+'</div>';
  const group = (title,body) => '<section class="pipe-group"><h2>'+title+'</h2>'+body+'</section>';
  const note = (title,body) => '<details class="pipe-note"><summary>'+title+'</summary><p>'+body+'</p></details>';
  const plan = group('素材与目标',
    fork(stage('已有语料','从中英文数据集选取问答、对话或真实环境声。保留数据集版本、原始记录和可用的来源标识。','例如 SODA、Magpie、COIG-CQIA、AVQA'),
         stage('新构造的素材','按主题生成新的口语内容，或按规则构造有确定答案的数值任务。记录生成模型或构造规则。','例如 DeepSeek V4 Flash 生成的 FDB 素材'))+
    stage('分配本批任务','把素材分配给普通对话、通用双工或 FDB 专项。按语言、话题、时长档和累计覆盖缺口规划样本。','每批 512 段文本')+
    note('FDB 的四类目标如何进入写稿？','把用户打断、用户附和、对旁人讲话和背景语音作为场景条件，同时指定主任务、插入语音与预期话轮行为。官方案例用于设定目标与后续比对。'));
  const author = group('对白生成与批次审核',
    stage('写成可朗读的多轮对白','从来源素材扩写双方台词，安排双工事件插入哪一轮。记录插入前后的话、说话对象和助手接下来如何回应。','产物：对白脚本、交互事件和文本版本')+
    fork(stage('独立文本审核','Qwen3.8-27B 检查整段对白，并审查事件与首个回应的语义。做话题标注、相似度检查和官方案例匹配。','覆盖报告区分已出现与整段审核通过'),
         stage('分层音频抽检','从专项样本中按语言、时长档等条件选取对白，合成并对齐音频。用 Qwen ASR 与 FireRed ASR 回读，核对实际说出的内容。','两套 ASR 的结果仅适用于被检查的录音'))+
    stage('汇总本批与累计覆盖','收集审核记录和抽检结果，更新整段审核结论、场景缺口与批次报告。闭批后调度批量语音生产。','已审阅文本：'+num(s.status.reviewed_texts)+' 段')+
    note('覆盖不足或写稿失败时回到哪里？','写稿失败的任务可以重试或更换候选；可修复的问题进入返修。每批新增证据与此前批次合并，仍缺的场景用于调整后续批次的任务分配。'));
  const audio = group('双轨音频合成',
    fork(stage('普通对话与通用双工','读取当前采用的脚本，用标准语音合成流程渲染用户与助手音轨。','按脚本版本登记音频'),
         stage('FDB 专项','逐句合成中文与英文语音，分别使用 CosyVoice 和 Kokoro。对齐后把插话叠进助手发言，组装双轨音频及事件对照。','记录事件起止采样点、助手停声与再开口位置'))+
    stage('核对波形与时序','核对样本 ID、文本版本和音频哈希；从波形检查声道、时长及实测回复时延。专项事件还检查语音重叠和对照音频。','当前关联音频：'+num(s.audio)+' 段 · 回复时延目标 480 ms')+
    note('音频有问题时怎样返修？','未生成的样本进入待处理清单。可修复的时序问题进入重合成与复核；登记采用的修订版本，再把它关联到对应文本。'));
  const release = group('索引与训练准入',
    stage('按样本关联证据','用同一条样本记录关联原始素材、采用的对白、双轨音频及已有审核结果。管理系统定时扫描批次与音频清单。','可在样本详情页追溯来源和处理过程')+
    stage('核对全量数据，记录准入状态','达到目标数量后还要汇总最终清单、与 benchmark 的对齐结果及待修正的问题。训练准入读取生产端的独立状态。','目标 '+num(s.status.goal)+' 段 · '+(s.status.training_admitted?'已开放训练准入':'当前尚未开放训练准入')));
  return '<a href="#overview">返回概览</a><h1>数据合成流程</h1><p class="muted">FullDuplexBench v1.5 · Stage 2 · 当前已审阅至第 '+num(s.status.last_review)+' 批</p><div class="pipe-map">'+plan+author+audio+release+'</div>';
}
