/**
 * 盲派八字 - 五行生克与力量平衡雷达图渲染
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    factory(MP);
    module.exports = MP.render.wuxing;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const wxRender = {};
  const svgHelper = MP.render.svg;

  /**
   * 渲染五行生克动态图与力量柱状条
   * @param {HTMLElement} svgWrap SVG容器
   * @param {HTMLElement} barsContainer 柱状条容器
   * @param {object} wxData 五行计算结果
   * @param {HTMLElement} tooltip 提示框
   */
  wxRender.render = function (svgWrap, barsContainer, wxData, tooltip) {
    svgWrap.innerHTML = '';
    barsContainer.innerHTML = '';

    const width = 280;
    const height = 280;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 95;

    const svg = svgHelper.create('svg', {
      width: '100%',
      height: '100%',
      viewBox: `0 0 ${width} ${height}`
    });

    // 箭头定义 (生克箭头)
    const defs = svgHelper.create('defs');
    defs.innerHTML = `
      <marker id="arrow-sheng" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#2ecc71" opacity="0.8" />
      </marker>
      <marker id="arrow-ke" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#e74c3c" opacity="0.6" />
      </marker>
    `;
    svg.appendChild(defs);

    // 计算五行五角形顶点坐标 (顺时针: 木 -> 火 -> 土 -> 金 -> 水)
    // 角度: 木(左上 -126°), 火(正上 -90° 或 传统南方), 土(右上 -18°), 金(右下 54°), 水(正下 126°)
    // 顺时针等分 5 个顶点:
    const elements = ['木', '火', '土', '金', '水'];
    const coords = {};
    const startAngle = -Math.PI / 2; // 正上方为火，顺时针排列
    // 为了符合 木生火，顺时针: 木(-162°), 火(-90°), 土(-18°), 金(54°), 水(126°)
    const angleMap = {
      '火': -Math.PI / 2,
      '土': -Math.PI / 2 + (2 * Math.PI / 5),
      '金': -Math.PI / 2 + (4 * Math.PI / 5),
      '水': -Math.PI / 2 + (6 * Math.PI / 5),
      '木': -Math.PI / 2 + (8 * Math.PI / 5)
    };

    elements.forEach(wx => {
      const angle = angleMap[wx];
      coords[wx] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      };
    });

    // 1. 绘制内星克制虚线 (木克土, 土克水, 水克火, 火克金, 金克木)
    const kePairs = [
      ['木', '土'], ['土', '水'], ['水', '火'], ['火', '金'], ['金', '木']
    ];
    kePairs.forEach(([from, to]) => {
      const p1 = coords[from];
      const p2 = coords[to];
      const keLine = svgHelper.create('line', {
        x1: p1.x, y1: p1.y,
        x2: p2.x, y2: p2.y,
        stroke: '#e74c3c',
        'stroke-width': '1.4',
        'stroke-dasharray': '4 4',
        class: 'wuxing-ke-line',
        opacity: '0.6',
        'marker-end': 'url(#arrow-ke)'
      });
      svg.appendChild(keLine);
    });

    // 2. 绘制外环相生流动曲线 (木->火->土->金->水->木)
    const shengPairs = [
      ['木', '火'], ['火', '土'], ['土', '金'], ['金', '水'], ['水', '木']
    ];
    shengPairs.forEach(([from, to]) => {
      const p1 = coords[from];
      const p2 = coords[to];
      // 弧线稍微向外弯曲
      const midAngle = (angleMap[from] + angleMap[to]) / 2 + (to === '木' && from === '水' ? Math.PI : 0);
      const arcR = radius * 1.08;
      const arcPath = svgHelper.create('path', {
        d: `M ${p1.x} ${p1.y} A ${arcR} ${arcR} 0 0 1 ${p2.x} ${p2.y}`,
        fill: 'none',
        stroke: '#2ecc71',
        'stroke-width': '2.2',
        class: 'wuxing-cycle-line',
        opacity: '0.85',
        'marker-end': 'url(#arrow-sheng)'
      });
      svg.appendChild(arcPath);
    });

    // 3. 绘制五行节点圆形与文字
    const maxScore = Math.max(...Object.values(wxData.scores), 1);
    const speed = (MP.animator && MP.animator.speedMultiplier) ? MP.animator.speedMultiplier : 1.0;

    elements.forEach((wx, idx) => {
      const pt = coords[wx];
      const score = wxData.scores[wx] || 0;
      const isDayWx = (wxData.dayWx === wx);
      const color = MP.data.WUXING_COLORS[wx];

      // 动态半径 (最小 18，最大 30)
      const nodeR = 18 + (score / maxScore) * 12;

      // 日主外圈金环
      if (isDayWx) {
        const ring = svgHelper.create('circle', {
          cx: pt.x,
          cy: pt.y,
          r: nodeR + 6,
          fill: 'none',
          stroke: '#e5b558',
          'stroke-width': '2.5',
          'stroke-dasharray': '6 3',
          class: 'wuxing-day-ring'
        });
        svg.appendChild(ring);
      }

      // 主圆
      const circle = svgHelper.create('circle', {
        cx: pt.x,
        cy: pt.y,
        r: nodeR,
        fill: '#131a24',
        stroke: color,
        'stroke-width': isDayWx ? '3' : '2',
        class: 'wuxing-node-circle'
      });

      if (typeof circle.animate === 'function') {
        circle.animate([
          { r: 0, opacity: 0 },
          { r: nodeR, opacity: 1 }
        ], {
          duration: 450 / speed,
          delay: (idx * 80) / speed,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          fill: 'forwards'
        });
      }

      // 文字
      const text = svgHelper.create('text', {
        x: pt.x,
        y: pt.y + 6,
        'text-anchor': 'middle',
        fill: color,
        'font-size': '15',
        'font-weight': 'bold',
        'font-family': 'var(--font-kai), serif'
      });
      text.textContent = wx;

      // 悬浮交互
      circle.addEventListener('mouseenter', (e) => {
        circle.setAttribute('r', nodeR + 4);
        if (tooltip) {
          const detailList = (wxData.details[wx] || []).map(d => `<li>${d.source}: +${d.val}</li>`).join('');
          tooltip.innerHTML = `
            <div style="font-weight:bold;color:${color};font-size:0.95rem;margin-bottom:4px;">五行 · ${wx} ${isDayWx ? '(日主本命)' : ''}</div>
            <div style="font-size:0.8rem;color:#9cb0c6;">综合得分: <b>${score} 分</b> (${wxData.percentages[wx]}%)</div>
            <ul style="font-size:0.75rem;color:#8892b0;margin-top:6px;padding-left:16px;">${detailList}</ul>
          `;
          tooltip.classList.add('show');
          MP.render.relations.positionTooltip(tooltip, e.pageX, e.pageY);
        }
      });

      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('r', nodeR);
        if (tooltip) tooltip.classList.remove('show');
      });

      svg.appendChild(circle);
      svg.appendChild(text);
    });

    svgWrap.appendChild(svg);

    // 4. 渲染下方五行得分柱状条
    elements.forEach(wx => {
      const score = wxData.scores[wx] || 0;
      const pct = wxData.percentages[wx] || 0;
      const color = MP.data.WUXING_COLORS[wx];
      const isDayWx = (wxData.dayWx === wx);

      const row = document.createElement('div');
      row.className = 'wuxing-bar-row';
      row.innerHTML = `
        <span style="font-weight:bold;color:${color};">${wx}${isDayWx ? '★' : ''}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:0%;background-color:${color};"></div>
        </div>
        <span style="color:var(--text-secondary);text-align:right;">${pct}%</span>
      `;
      barsContainer.appendChild(row);

      // 动画宽度展开
      setTimeout(() => {
        const fill = row.querySelector('.bar-fill');
        if (fill) fill.style.width = `${pct}%`;
      }, 50);
    });
  };

  MP.render.wuxing = wxRender;
  return wxRender;
}));
