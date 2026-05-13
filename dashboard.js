function setActive(btn) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function showSection(section) {
  ['dashSection','irSection','mockSection','quickInterviewSection','quickSection','videoInterviewSection','normalSection','basicInterviewSection','basicSection','analysisSection'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById(section + 'Section').style.display =
    (section === 'videoInterview' || section === 'basicInterview') ? 'block' : '';
  if (section === 'analysis' && !window._analysisChartsDrawn) {
    drawModalRadar('an-attitude-radar');
    drawCompetencyRadar('an-competency-radar');
    window._analysisChartsDrawn = true;
  }
  if (section === 'videoInterview') {
    startVoiceDetection();
  } else {
    stopVoiceDetection();
  }
}

let _voiceRaf = null;
let _voiceStream = null;

function startVoiceDetection() {
  const indicator = document.getElementById('vi-voice-indicator');
  if (!indicator) return;
  if (!navigator.mediaDevices?.getUserMedia) { return; }

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
      _voiceStream = stream;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let speaking = false;

      function tick() {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const now = avg > 8;
        if (now !== speaking) {
          speaking = now;
          indicator.style.display = speaking ? 'flex' : 'none';
        }
        _voiceRaf = requestAnimationFrame(tick);
      }
      tick();
    })
    .catch(() => {
      // 마이크 접근 불가 — 인디케이터 숨김 유지
    });
}

function stopVoiceDetection() {
  if (_voiceRaf) { cancelAnimationFrame(_voiceRaf); _voiceRaf = null; }
  if (_voiceStream) { _voiceStream.getTracks().forEach(t => t.stop()); _voiceStream = null; }
  const indicator = document.getElementById('vi-voice-indicator');
  if (indicator) indicator.style.display = 'none';
}


// 파형 초기화
(function() {
  const wfVi = document.getElementById('waveform-vi');
  if (wfVi) {
    for (let i = 0; i < 5; i++) {
      const span = document.createElement('span');
      wfVi.appendChild(span);
    }
  }
})();

function drawRadar(id, labels, values) {
  const svg = document.getElementById(id);
  const C = 60, R = 42, n = labels.length;
  const ns = 'http://www.w3.org/2000/svg';

  const pt = (i, r) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  };

  // 그리드
  [0.3, 0.55, 0.8, 1].forEach(lv => {
    const pts = Array.from({length: n}, (_, i) => pt(i, R * lv));
    const el = document.createElementNS(ns, 'path');
    el.setAttribute('d', pts.map(([x,y], i) => `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + 'Z');
    el.setAttribute('fill', lv < 1 ? 'rgba(248,249,250,0.8)' : 'none');
    el.setAttribute('stroke', '#dee2e6');
    el.setAttribute('stroke-width', '1');
    svg.appendChild(el);
  });

  // 축
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, R);
    const ln = document.createElementNS(ns, 'line');
    ln.setAttribute('x1', C); ln.setAttribute('y1', C);
    ln.setAttribute('x2', x.toFixed(1)); ln.setAttribute('y2', y.toFixed(1));
    ln.setAttribute('stroke', '#dee2e6'); ln.setAttribute('stroke-width', '1');
    svg.appendChild(ln);
  }

  // 데이터
  const dpts = values.map((v, i) => pt(i, (v / 100) * R));
  const dp = document.createElementNS(ns, 'path');
  dp.setAttribute('d', dpts.map(([x,y], i) => `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + 'Z');
  dp.setAttribute('fill', 'rgba(173,181,189,0.45)');
  dp.setAttribute('stroke', '#868e96');
  dp.setAttribute('stroke-width', '2');
  svg.appendChild(dp);

  // 라벨
  labels.forEach((lb, i) => {
    const [x, y] = pt(i, R + 13);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', x.toFixed(1)); t.setAttribute('y', y.toFixed(1));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('font-size', '8'); t.setAttribute('fill', '#868e96');
    t.setAttribute('font-family', 'sans-serif');
    t.textContent = lb;
    svg.appendChild(t);
  });
}

// 면접분석 페이지 데이터
const analysisData = {
  attitude: {
    avg: null,          // 예: 48
    diff: null,         // 예: '▲ 3.2'
    score: null,        // 예: 48
    date: null,         // 예: '2024.03 ~ 2024.05'
    radarLabels: null,  // 예: ['표정','시선','자세 안정성','억양','말하기 속도']
    radarValues: null,  // 예: [10, 9, 8, 10, 10]
    radarScores: null,  // 예: ['10/10','9/10',...]
    lineChart: null,    // 예: { dates:['03.15','03.29',...], upper:[35,42,...], lower:[35,38,...] }
  },
  competency: {
    avg: null,          // 예: 46
    diff: null,         // 예: '▲ 2.1'
    score: null,        // 예: 46
    date: null,         // 예: '2024.03 ~ 2024.05'
    radarLabels: null,  // 예: ['의사소통','직무역량','자신감','논리적사고','문제해결력']
    radarValues: null,  // 예: [9, 9, 9, 9, 9]
    radarScores: null,  // 예: ['9/10','9/10',...]
    lineChart: null,    // 예: { dates:['03.15','03.29',...], upper:[38,41,...], lower:[38,41,...] }
  },
};

function renderAnalysis(data) {
  const { attitude, competency } = data;

  document.getElementById('an-attitude-avg').textContent = attitude.avg ?? '-';
  document.getElementById('an-attitude-diff').textContent = attitude.diff ? `지난 분석 대비 ${attitude.diff}` : '';
  document.getElementById('an-attitude-score').innerHTML = `${attitude.score ?? '-'}<span>/50</span>`;
  document.getElementById('an-attitude-date').textContent = attitude.date ?? '-';

  document.getElementById('an-competency-avg').textContent = competency.avg ?? '-';
  document.getElementById('an-competency-diff').textContent = competency.diff ? `지난 분석 대비 ${competency.diff}` : '';
  document.getElementById('an-competency-score').innerHTML = `${competency.score ?? '-'}<span>/50</span>`;
  document.getElementById('an-competency-date').textContent = competency.date ?? '-';

  drawModalRadar('an-attitude-radar', attitude.radarLabels, attitude.radarValues, attitude.radarScores, 10);
  drawCompetencyRadar('an-competency-radar', competency.radarLabels, competency.radarValues, competency.radarScores, 10);
}

renderAnalysis(analysisData);

// API에서 받아온 데이터를 여기에 채우면 됩니다
const dashboardData = {
  attitude: {
    score: null,
    diff: null,
    radarLabels: ['끌림','망양','자태명성','달가뇨','시선'],
    radarValues: null,
  },
  competency: {
    score: null,
    diff: null,
    radarLabels: ['의사소통','논리적사고','자신감','문제해결력','팀워크'],
    radarValues: null,
  },
  records: null,
};

function renderDashboard(data) {
  const { attitude, competency, records } = data;

  document.getElementById('attitude-score').textContent = attitude.score ?? '-';
  document.getElementById('attitude-diff').textContent = attitude.diff ? `지난 분석 대비 ▲ ${attitude.diff}` : '-';

  document.getElementById('competency-score').textContent = competency.score ?? '-';
  document.getElementById('competency-diff').textContent = competency.diff ? `지난 분석 대비 ▲ ${competency.diff}` : '-';

  const recordList = document.getElementById('record-list');
  if (records && records.length > 0) {
    recordList.innerHTML = records.map(r => `
      <div>
        <div style="font-size:12px;font-weight:600;color:#343a40;margin-bottom:10px;">${r.label}</div>
        <div style="font-size:26px;font-weight:800;color:#212529;line-height:1;">${r.score}</div>
        <div style="font-size:10px;color:#adb5bd;margin-top:4px;">${r.date}</div>
      </div>
    `).join('');
  } else {
    recordList.innerHTML = '<div style="color:#adb5bd;font-size:13px;grid-column:span 4;text-align:center;padding:40px 0;">면접 기록이 없습니다.</div>';
  }

  if (attitude.radarValues) drawRadar('radar1', attitude.radarLabels, attitude.radarValues);
  if (competency.radarValues) drawRadar('radar2', competency.radarLabels, competency.radarValues);
}

renderDashboard(dashboardData);

// 모달
let modalChartsDrawn = false;

function openAttitudeModal() {
  document.getElementById('attitudeModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  if (!modalChartsDrawn) {
    const att = analysisData.attitude;
    drawModalRadar('modalRadar', att.radarLabels, att.radarValues, att.radarScores, 10);
    drawModalLineChart(att.lineChart);
    modalChartsDrawn = true;
  }
}

function closeAttitudeModal() {
  document.getElementById('attitudeModal').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalOutside(e) {
  if (e.target.id === 'attitudeModal') closeAttitudeModal();
}

function drawModalRadar(svgId, labels, values, scores, maxVal) {
  const svg = document.getElementById(svgId);
  svg.innerHTML = '';
  if (!labels || !values) return;
  const cx = 140, cy = 140, maxR = 85;
  maxVal = maxVal || 10;
  const n = labels.length;
  const ns = 'http://www.w3.org/2000/svg';

  function angle(i) { return (Math.PI * 2 * i / n) - Math.PI / 2; }
  function point(r, i) { return { x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) }; }
  function toPoints(pts) { return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '); }

  for (let lv = 1; lv <= 5; lv++) {
    const pts = Array.from({length: n}, (_, i) => point(maxR * lv / 5, i));
    const poly = document.createElementNS(ns, 'polygon');
    poly.setAttribute('points', toPoints(pts));
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', '#e9ecef');
    poly.setAttribute('stroke-width', '1');
    svg.appendChild(poly);
  }

  for (let i = 0; i < n; i++) {
    const p = point(maxR, i);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', cx); line.setAttribute('y1', cy);
    line.setAttribute('x2', p.x.toFixed(1)); line.setAttribute('y2', p.y.toFixed(1));
    line.setAttribute('stroke', '#e9ecef'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  }

  const dataPts = values.map((v, i) => point(maxR * v / maxVal, i));
  const dataPoly = document.createElementNS(ns, 'polygon');
  dataPoly.setAttribute('points', toPoints(dataPts));
  dataPoly.setAttribute('fill', 'rgba(116,192,252,0.25)');
  dataPoly.setAttribute('stroke', '#74c0fc');
  dataPoly.setAttribute('stroke-width', '2');
  svg.appendChild(dataPoly);

  dataPts.forEach(p => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1));
    c.setAttribute('r', '3'); c.setAttribute('fill', '#74c0fc');
    svg.appendChild(c);
  });

  labels.forEach((label, i) => {
    const p = point(maxR + 22, i);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', p.x.toFixed(1)); t.setAttribute('y', p.y.toFixed(1));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '11');
    t.setAttribute('fill', '#495057'); t.setAttribute('font-weight', '600');
    t.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
    t.textContent = label;
    svg.appendChild(t);

    const s = document.createElementNS(ns, 'text');
    s.setAttribute('x', p.x.toFixed(1)); s.setAttribute('y', (p.y + 13).toFixed(1));
    s.setAttribute('text-anchor', 'middle'); s.setAttribute('font-size', '10');
    s.setAttribute('fill', '#868e96');
    s.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
    s.textContent = scores[i];
    svg.appendChild(s);
  });
}

// AI 피드백 모달
// 예: { '2024.05.10': { summary:'...', strengths:[{title,desc},...], weaknesses:[...], recommends:[{title,link},...] }, ... }
const feedbackData = null;

let currentFeedbackDate = null;

function renderFeedback(data) {
  if (!data) return;
  const dates = Object.keys(data);
  if (!dates.length) return;
  const latest = data[dates[0]];
  document.getElementById('feedback-strength').textContent = latest.strengths?.[0]?.title ?? '-';
  document.getElementById('feedback-weakness').textContent = latest.weaknesses?.[0]?.title ?? '-';
  document.getElementById('feedback-recommend').textContent = latest.recommends?.[0]?.title ?? '-';
}

renderFeedback(feedbackData);

function openFeedbackModal() {
  document.getElementById('feedbackModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  if (!feedbackData) return;
  const dates = Object.keys(feedbackData);
  if (!currentFeedbackDate) currentFeedbackDate = dates[0];
  renderFeedbackTabs(dates);
  renderFeedbackContent(currentFeedbackDate);
}

function closeFeedbackModal() {
  document.getElementById('feedbackModal').classList.remove('open');
  document.body.style.overflow = '';
}

function closeFeedbackOutside(e) {
  if (e.target.id === 'feedbackModal') closeFeedbackModal();
}

function renderFeedbackTabs(dates) {
  document.getElementById('fbDateTabs').innerHTML = dates.map(d => `
    <button class="fb-date-tab ${d === currentFeedbackDate ? 'active' : ''}" onclick="selectFeedbackDate('${d}')">${d}</button>
  `).join('');
}

function selectFeedbackDate(date) {
  currentFeedbackDate = date;
  renderFeedbackTabs(Object.keys(feedbackData));
  renderFeedbackContent(date);
}

function renderFeedbackContent(date) {
  const data = feedbackData[date];
  document.getElementById('fbSummary').textContent = data.summary;
  document.getElementById('fbStrengths').innerHTML = data.strengths.map(i => `
    <div class="fb-item">
      <div class="fb-item-dot"></div>
      <div><div class="fb-item-title">${i.title}</div><div class="fb-item-text">${i.desc}</div></div>
    </div>`).join('');
  document.getElementById('fbWeaknesses').innerHTML = data.weaknesses.map(i => `
    <div class="fb-item">
      <div class="fb-item-dot"></div>
      <div><div class="fb-item-title">${i.title}</div><div class="fb-item-text">${i.desc}</div></div>
    </div>`).join('');
  document.getElementById('fbRecommends').innerHTML = data.recommends.map(i => `
    <div class="fb-item">
      <div class="fb-item-dot"></div>
      <div class="fb-item-text">${i.title}</div>
    </div>`).join('');
}

// 역량 분석 모달
let competencyChartsDrawn = false;

function openCompetencyModal() {
  document.getElementById('competencyModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  if (!competencyChartsDrawn) {
    const comp = analysisData.competency;
    drawCompetencyRadar('competencyRadar', comp.radarLabels, comp.radarValues, comp.radarScores, 10);
    drawCompetencyLineChart(comp.lineChart);
    competencyChartsDrawn = true;
  }
}

function closeCompetencyModal() {
  document.getElementById('competencyModal').classList.remove('open');
  document.body.style.overflow = '';
}

function closeCompetencyOutside(e) {
  if (e.target.id === 'competencyModal') closeCompetencyModal();
}

function drawCompetencyRadar(svgId, labels, values, scores, maxVal) {
  const svg = document.getElementById(svgId);
  svg.innerHTML = '';
  if (!labels || !values) return;
  const cx = 140, cy = 140, maxR = 85;
  maxVal = maxVal || 10;
  const n = labels.length;
  const ns = 'http://www.w3.org/2000/svg';

  function angle(i) { return (Math.PI * 2 * i / n) - Math.PI / 2; }
  function point(r, i) { return { x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) }; }
  function toPoints(pts) { return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '); }

  for (let lv = 1; lv <= 5; lv++) {
    const pts = Array.from({length: n}, (_, i) => point(maxR * lv / 5, i));
    const poly = document.createElementNS(ns, 'polygon');
    poly.setAttribute('points', toPoints(pts));
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', '#e9ecef');
    poly.setAttribute('stroke-width', '1');
    svg.appendChild(poly);
  }

  for (let i = 0; i < n; i++) {
    const p = point(maxR, i);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', cx); line.setAttribute('y1', cy);
    line.setAttribute('x2', p.x.toFixed(1)); line.setAttribute('y2', p.y.toFixed(1));
    line.setAttribute('stroke', '#e9ecef'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  }

  const dataPts = values.map((v, i) => point(maxR * v / maxVal, i));
  const dataPoly = document.createElementNS(ns, 'polygon');
  dataPoly.setAttribute('points', toPoints(dataPts));
  dataPoly.setAttribute('fill', 'rgba(116,192,252,0.25)');
  dataPoly.setAttribute('stroke', '#74c0fc');
  dataPoly.setAttribute('stroke-width', '2');
  svg.appendChild(dataPoly);

  dataPts.forEach(p => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1));
    c.setAttribute('r', '3'); c.setAttribute('fill', '#74c0fc');
    svg.appendChild(c);
  });

  labels.forEach((label, i) => {
    const p = point(maxR + 22, i);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', p.x.toFixed(1)); t.setAttribute('y', p.y.toFixed(1));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '11');
    t.setAttribute('fill', '#495057'); t.setAttribute('font-weight', '600');
    t.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
    t.textContent = label;
    svg.appendChild(t);

    const s = document.createElementNS(ns, 'text');
    s.setAttribute('x', p.x.toFixed(1)); s.setAttribute('y', (p.y + 13).toFixed(1));
    s.setAttribute('text-anchor', 'middle'); s.setAttribute('font-size', '10');
    s.setAttribute('fill', '#868e96');
    s.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
    s.textContent = scores[i];
    svg.appendChild(s);
  });
}

function drawCompetencyLineChart(data) {
  const svg = document.getElementById('competencyLineChart');
  svg.innerHTML = '';
  if (!data) return;
  const ns = 'http://www.w3.org/2000/svg';
  const ml = 38, mr = 16, mt = 16, mb = 28;
  const W = 520, H = 150;
  const cw = W - ml - mr, ch = H - mt - mb;

  const { dates, upper, lower } = data;
  const allVals = [...upper, ...lower];
  const yMin = Math.floor(Math.min(...allVals) / 5) * 5 - 5;
  const yMax = Math.ceil(Math.max(...allVals) / 5) * 5 + 2;
  const n = dates.length;

  function X(i) { return ml + (i / (n - 1)) * cw; }
  function Y(v) { return mt + ch - ((v - yMin) / (yMax - yMin)) * ch; }

  [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(yMin + t * (yMax - yMin))).forEach(v => {
    const y = Y(v);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', ml); line.setAttribute('y1', y.toFixed(1));
    line.setAttribute('x2', W - mr); line.setAttribute('y2', y.toFixed(1));
    line.setAttribute('stroke', '#e9ecef'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', ml - 6); t.setAttribute('y', (y + 3).toFixed(1));
    t.setAttribute('text-anchor', 'end'); t.setAttribute('font-size', '9'); t.setAttribute('fill', '#adb5bd');
    t.textContent = v;
    svg.appendChild(t);
  });

  const areaD = [
    ...upper.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`),
    ...[...lower].reverse().map((v, i) => `L${X(n - 1 - i).toFixed(1)},${Y(v).toFixed(1)}`),
    'Z'
  ].join(' ');
  const area = document.createElementNS(ns, 'path');
  area.setAttribute('d', areaD); area.setAttribute('fill', 'rgba(116,192,252,0.15)');
  svg.appendChild(area);

  const upperD = upper.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const uLine = document.createElementNS(ns, 'path');
  uLine.setAttribute('d', upperD); uLine.setAttribute('fill', 'none');
  uLine.setAttribute('stroke', '#74c0fc'); uLine.setAttribute('stroke-width', '2');
  uLine.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(uLine);

  const lowerD = lower.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const lLine = document.createElementNS(ns, 'path');
  lLine.setAttribute('d', lowerD); lLine.setAttribute('fill', 'none');
  lLine.setAttribute('stroke', '#74c0fc'); lLine.setAttribute('stroke-width', '1.5');
  lLine.setAttribute('stroke-dasharray', '4,3'); lLine.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(lLine);

  upper.forEach((v, i) => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', X(i).toFixed(1)); c.setAttribute('cy', Y(v).toFixed(1));
    c.setAttribute('r', '3'); c.setAttribute('fill', '#74c0fc');
    svg.appendChild(c);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', X(i).toFixed(1)); t.setAttribute('y', (Y(v) - 7).toFixed(1));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '9');
    t.setAttribute('fill', '#495057'); t.setAttribute('font-weight', '600');
    t.textContent = v;
    svg.appendChild(t);
  });

  lower.forEach((v, i) => {
    if (i === 0) return;
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', X(i).toFixed(1)); c.setAttribute('cy', Y(v).toFixed(1));
    c.setAttribute('r', '2.5'); c.setAttribute('fill', '#fff');
    c.setAttribute('stroke', '#74c0fc'); c.setAttribute('stroke-width', '1.5');
    svg.appendChild(c);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', X(i).toFixed(1)); t.setAttribute('y', (Y(v) + 14).toFixed(1));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '9'); t.setAttribute('fill', '#868e96');
    t.textContent = v;
    svg.appendChild(t);
  });

  dates.forEach((d, i) => {
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', X(i).toFixed(1)); t.setAttribute('y', H - 6);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '9'); t.setAttribute('fill', '#adb5bd');
    t.textContent = d;
    svg.appendChild(t);
  });
}

function drawModalLineChart(data) {
  const svg = document.getElementById('modalLineChart');
  svg.innerHTML = '';
  if (!data) return;
  const ns = 'http://www.w3.org/2000/svg';
  const ml = 38, mr = 16, mt = 16, mb = 28;
  const W = 520, H = 150;
  const cw = W - ml - mr, ch = H - mt - mb;

  const { dates, upper, lower } = data;
  const allVals = [...upper, ...lower];
  const yMin = Math.floor(Math.min(...allVals) / 5) * 5 - 5;
  const yMax = Math.ceil(Math.max(...allVals) / 5) * 5 + 2;
  const n = dates.length;

  function X(i) { return ml + (i / (n - 1)) * cw; }
  function Y(v) { return mt + ch - ((v - yMin) / (yMax - yMin)) * ch; }

  // 그리드
  [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(yMin + t * (yMax - yMin))).forEach(v => {
    const y = Y(v);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', ml); line.setAttribute('y1', y.toFixed(1));
    line.setAttribute('x2', W - mr); line.setAttribute('y2', y.toFixed(1));
    line.setAttribute('stroke', '#e9ecef'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', ml - 6); t.setAttribute('y', (y + 3).toFixed(1));
    t.setAttribute('text-anchor', 'end'); t.setAttribute('font-size', '9'); t.setAttribute('fill', '#adb5bd');
    t.textContent = v;
    svg.appendChild(t);
  });

  // 채운 영역
  const areaD = [
    ...upper.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`),
    ...[...lower].reverse().map((v, i) => `L${X(n - 1 - i).toFixed(1)},${Y(v).toFixed(1)}`),
    'Z'
  ].join(' ');
  const area = document.createElementNS(ns, 'path');
  area.setAttribute('d', areaD);
  area.setAttribute('fill', 'rgba(116,192,252,0.15)');
  svg.appendChild(area);

  // 상단 선
  const upperD = upper.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const uLine = document.createElementNS(ns, 'path');
  uLine.setAttribute('d', upperD); uLine.setAttribute('fill', 'none');
  uLine.setAttribute('stroke', '#74c0fc'); uLine.setAttribute('stroke-width', '2');
  uLine.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(uLine);

  // 하단 선 (점선)
  const lowerD = lower.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const lLine = document.createElementNS(ns, 'path');
  lLine.setAttribute('d', lowerD); lLine.setAttribute('fill', 'none');
  lLine.setAttribute('stroke', '#74c0fc'); lLine.setAttribute('stroke-width', '1.5');
  lLine.setAttribute('stroke-dasharray', '4,3'); lLine.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(lLine);

  // 데이터 포인트 및 라벨
  upper.forEach((v, i) => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', X(i).toFixed(1)); c.setAttribute('cy', Y(v).toFixed(1));
    c.setAttribute('r', '3'); c.setAttribute('fill', '#74c0fc');
    svg.appendChild(c);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', X(i).toFixed(1)); t.setAttribute('y', (Y(v) - 7).toFixed(1));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '9');
    t.setAttribute('fill', '#495057'); t.setAttribute('font-weight', '600');
    t.textContent = v;
    svg.appendChild(t);
  });

  lower.forEach((v, i) => {
    if (i === 0) return;
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', X(i).toFixed(1)); c.setAttribute('cy', Y(v).toFixed(1));
    c.setAttribute('r', '2.5'); c.setAttribute('fill', '#fff');
    c.setAttribute('stroke', '#74c0fc'); c.setAttribute('stroke-width', '1.5');
    svg.appendChild(c);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', X(i).toFixed(1)); t.setAttribute('y', (Y(v) + 14).toFixed(1));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '9'); t.setAttribute('fill', '#868e96');
    t.textContent = v;
    svg.appendChild(t);
  });

  // X축 라벨
  dates.forEach((d, i) => {
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', X(i).toFixed(1)); t.setAttribute('y', H - 6);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '9'); t.setAttribute('fill', '#adb5bd');
    t.textContent = d;
    svg.appendChild(t);
  });
}
