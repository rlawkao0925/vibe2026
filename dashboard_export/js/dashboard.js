function setActive(btn) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

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
  feedback: {
    strength: null,
    weakness: null,
    recommend: null,
  },
  records: null,
};

function renderDashboard(data) {
  const { attitude, competency, feedback, records } = data;

  document.getElementById('attitude-score').textContent = attitude.score ?? '-';
  document.getElementById('attitude-diff').textContent = attitude.diff ? `지난 분석 대비 ▲ ${attitude.diff}` : '-';

  document.getElementById('competency-score').textContent = competency.score ?? '-';
  document.getElementById('competency-diff').textContent = competency.diff ? `지난 분석 대비 ▲ ${competency.diff}` : '-';

  document.getElementById('feedback-strength').textContent = feedback.strength ?? '-';
  document.getElementById('feedback-weakness').textContent = feedback.weakness ?? '-';
  document.getElementById('feedback-recommend').textContent = feedback.recommend ?? '-';

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
