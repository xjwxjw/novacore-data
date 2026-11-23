const bench = '#benchmark/fdb15';
const releaseURL = 'https://github.com/DanielLin94144/Full-Duplex-Bench/tree/35c6a95dfb0070341b148498d590b589e0f0ce55/v1_v1.5/dataset';
const focus = {
  user_interruption:'用户向助手提出新请求。观察助手何时让出话轮，以及接下来的回答能否处理新内容。',
  user_backchannel:'用户在助手讲话时发出简短附和。观察助手能否保持话轮，自然完成原回答。',
  talking_to_other:'用户转向旁人说话。观察助手能否识别说话对象，继续原任务。',
  background_speech:'其他声音在背景中出现。观察助手能否在干扰下继续原回答。'
};
function benchmarkFrame(tab,body){
  const tabs=[['','概览'],['cases','官方测试案例'],['samples','对应构建的数据'],['coverage','覆盖分析']];
  return '<a href="#overview">Benchmark 目录</a><h1>FullDuplexBench v1.5</h1><div class="bench-tabs">'+tabs.map(([key,title])=>'<a '+(tab===key?'aria-current="page" ':'')+'href="'+bench+(key?'/'+key:'')+'">'+title+'</a>').join('')+'</div>'+body;
}
function benchmarkHome(s,records){
  return benchmarkFrame('','<h2>评测重点</h2><p>同一个问题分别使用有插话与无插话的输入测试模型。比较两次输出，观察停声与接话时机，并判断插话后模型回应了什么。</p><div class="columns focus-cards">'+Object.entries(focus).map(([key,desc])=>{
    const n=records.filter(r=>r.scenario===key).length;
    return '<section><h3>'+label(key)+'</h3><p>'+desc+'</p><a href="'+bench+'/cases?type='+key+'">查看 '+n+' 个测试案例</a></section>';
  }).join('')+'</div><h2>对应构建的数据</h2><div class="cards">'+s.facets.pool.map(([k,v])=>card(label(k),v,{pool:k})).join('')+'</div><p>第 '+s.status.last_review+' 批已审阅 · 规模目标 '+num(s.status.goal)+' 段 · 训练准入'+(s.status.training_admitted?'已开放':'未开放')+'</p><a href="'+bench+'/samples">浏览全部构建数据</a><p class="muted">数据与评测方法来自 Lin 等人发布的 <a href="'+releaseURL+'">Full-Duplex-Bench v1.5</a>。</p>');
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
