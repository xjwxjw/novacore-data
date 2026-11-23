async function refreshPipelineStatus() {
  try {
    const s = await api('/api/summary');
    const metrics = {
      texts: s.status.reviewed_texts, goal: s.status.goal, batch: s.status.last_review,
      audio: s.audio, admission: s.status.training_admitted ? '已开放训练准入' : '当前尚未开放训练准入'
    };
    for (const element of document.querySelectorAll('[data-metric]')) {
      const value = metrics[element.dataset.metric];
      element.textContent = typeof value === 'number' ? value.toLocaleString('zh-CN') : value;
    }
  } catch {
    origin = '';
  }
}
refreshPipelineStatus();
setInterval(() => { if (!document.hidden) refreshPipelineStatus(); }, 300000);
