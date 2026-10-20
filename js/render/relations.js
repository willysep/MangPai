/**
 * 盲派八字 - 干支关系折线走线渲染引擎 (Garis Menekuk / 零重叠正交走线)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    factory(MP);
    module.exports = MP.render.relations;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const relRender = {};
  const svgHelper = MP.render.svg;

  /**
   * 关系线条色彩映射
   */
  const KIND_COLORS = {
    '天干五合': '#2ecc71',
    '天干相冲': '#e74c3c',
    '天干相克': '#f39c12',
    '地支六合': '#2ecc71',
    '地支三合局': '#2ecc71',
    '地支半合': '#2ecc71',
    '地支拱合': '#2ecc71',
    '地支三会局': '#2ecc71',
    '地支六冲': '#e74c3c',
    '地支六穿': '#9b59b6',
    '地支六破': '#95a5a6',
    '地支相刑': '#e67e22',
    '地支自刑': '#d35400',
    '地支暗合': '#00bcd4',
    '干支自合': '#e5b558',
    '盖头': '#e67e22',
    '截脚': '#e67e22',
    '通根透干': '#1abc9c'
  };

  /**
   * 区间图轨道贪心分配算法 (保证水平线段零重叠)
   * @param {Array} items 包含 xMin 与 xMax 的线段对象
   * @param {number} margin 间隔安全间距
   */
  function allocateTracks(items, margin) {
    margin = margin || 14;
    // 跨度短的排内侧，跨度长的排外侧，形成规整的同心括号结构
    items.sort((a, b) => (a.xMax - a.xMin) - (b.xMax - b.xMin));

    const tracks = []; // tracks[t] = [ {min, max}, ... ]
    items.forEach(item => {
      let assignedTrack = -1;
      for (let t = 0; t < tracks.length; t++) {
        // 检查当前轨道是否与 item 产生水平重叠
        const overlaps = tracks[t].some(interval => {
          return Math.max(item.xMin - margin, interval.min - margin) <=
                 Math.min(item.xMax + margin, interval.max + margin);
        });
        if (!overlaps) {
          assignedTrack = t;
          tracks[t].push({ min: item.xMin, max: item.xMax });
          break;
        }
      }
      if (assignedTrack === -1) {
        assignedTrack = tracks.length;
        tracks.push([{ min: item.xMin, max: item.xMax }]);
      }
      item.track = assignedTrack;
    });

    return tracks.length;
  }

  /**
   * 计算端口微调偏移 (Port Offsets)，防止同一柱引出的多条折线在垂直段重合
   */
  function getPortOffset(portMap, pillarKey, direction, span) {
    if (!portMap[pillarKey]) portMap[pillarKey] = { leftCount: 0, rightCount: 0 };
    const info = portMap[pillarKey];
    // direction: 'toRight' (从该柱向右去) | 'toLeft' (从右方进入该柱)
    if (direction === 'toRight') {
      info.rightCount++;
      return (info.rightCount - 1) * 7 + 4; // 向右偏 +4, +11, +18...
    } else {
      info.leftCount++;
      return -((info.leftCount - 1) * 7 + 4); // 向左偏 -4, -11, -18...
    }
  }

  /**
   * 渲染所有关系折线 (Garis Menekuk)
   */
  relRender.render = function (svg, relations, anchors, filterOptions, tooltip) {
    svg.innerHTML = '';
    filterOptions = filterOptions || {};

    // 1. 过滤启用的关系 (支持关系类型、暗合等级、目标柱位、目标干支字符过滤)
    const visibleRelations = relations.filter(r => {
      if (filterOptions[r.kind] === false) return false;
      if (r.kind === '地支暗合') {
        const minLvl = filterOptions.anheMinLevel || 'B';
        const order = { A: 1, B: 2, C: 3 };
        if (order[r.level] > order[minLvl]) return false;
      }

      // 柱位筛选 (按柱过滤: year / month / day / hour / dayun / liunian)
      if (filterOptions.filterPillar && filterOptions.filterPillar !== 'all' && filterOptions.filterPillar !== '') {
        const targetP = filterOptions.filterPillar;
        const matchesPillar = r.members && r.members.some(m => m.pillar === targetP || m.role === targetP);
        if (!matchesPillar) return false;
      }

      // 干支筛选 (按字符过滤: 字符匹配如 '甲' / '子' 等)
      if (filterOptions.filterChar && filterOptions.filterChar !== 'all' && filterOptions.filterChar !== '') {
        const targetC = filterOptions.filterChar;
        const matchesChar = r.members && r.members.some(m => m.char === targetC);
        if (!matchesChar) return false;
      }

      return true;
    });

    // 为参与筛选目标焦点的柱节点添加/移除高亮标志
    const hasPillarFilter = !!(filterOptions.filterPillar && filterOptions.filterPillar !== 'all' && filterOptions.filterPillar !== '');
    const hasCharFilter = !!(filterOptions.filterChar && filterOptions.filterChar !== 'all' && filterOptions.filterChar !== '');
    if (anchors) {
      Object.keys(anchors).forEach(k => {
        const a = anchors[k];
        if (!a || !a.element || !a.element.classList) return;
        const [pKey] = k.split('_');
        let matched = false;
        if (hasPillarFilter && pKey === filterOptions.filterPillar) {
          matched = true;
        }
        if (hasCharFilter) {
          const charMatched = visibleRelations.some(r =>
            r.members && r.members.some(m => m.pillar === pKey && m.char === filterOptions.filterChar)
          );
          if (charMatched) matched = true;
        }
        if (matched) {
          a.element.classList.add('node-filter-matched');
        } else {
          a.element.classList.remove('node-filter-matched');
        }
      });
    }

    // 若当前筛选条件无可见连线，且原图存在关系，绘制柔和提示信息
    if (visibleRelations.length === 0 && relations.length > 0) {
      const hint = svgHelper.create('text', {
        x: '50%',
        y: '50%',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        fill: '#5f758f',
        'font-size': '13px',
        class: 'filter-empty-hint'
      });
      hint.textContent = '当前筛选条件下无关系连线 (可调整上方柱位或干支过滤)';
      svg.appendChild(hint);
    }

    // 柱位水平排序参照表
    const PILLAR_ORDER = ['year', 'month', 'day', 'hour', 'dayun', 'liunian'];

    // 收集所有节点的基础 Y 坐标界限
    let minTopY = 9999;
    let maxTrayBottomY = 0;

    Object.keys(anchors).forEach(k => {
      const a = anchors[k];
      if (a.topY < minTopY) minTopY = a.topY;
      if (a.trayBottomY && a.trayBottomY > maxTrayBottomY) maxTrayBottomY = a.trayBottomY;
    });

    if (minTopY === 9999) minTopY = 120;
    if (maxTrayBottomY === 0) maxTrayBottomY = 380;

    // 2. 将关系划分为三类：天干折线 (Upper)、地支折线 (Lower)、同柱垂直线 (Vertical)
    const upperItems = [];
    const lowerItems = [];
    const verticalItems = [];

    // 用于记录各柱节点的连接端口分配，避免垂直引线重叠
    const upperPortMap = {};
    const lowerPortMap = {};

    visibleRelations.forEach(rel => {
      const mems = rel.members;
      if (!mems || mems.length < 2) return;

      // 1. 检查是否为 3 serangkai (三合局, 三会局 等包含 3 个成员的组合)
      if (mems.length === 3 && (rel.kind.indexOf('三合') !== -1 || rel.kind.indexOf('三会') !== -1)) {
        const aList = mems.map(m => ({ mem: m, anchor: anchors[`${m.pillar}_${m.layer}`] }))
                          .filter(item => !!item.anchor);
        if (aList.length === 3) {
          // 按照从左到右 (cx 从小到大) 严格排序
          aList.sort((a, b) => a.anchor.cx - b.anchor.cx);
          const p1 = aList[0].mem;
          const p2 = aList[1].mem;
          const p3 = aList[2].mem;
          const a1 = aList[0].anchor;
          const a2 = aList[1].anchor;
          const a3 = aList[2].anchor;

          lowerItems.push({
            rel,
            isTriad: true,
            p1: p1.pillar,
            p2: p2.pillar,
            p3: p3.pillar,
            pLeft: p1.pillar,
            pRight: p3.pillar,
            xMin: a1.cx,
            xMax: a3.cx,
            a1: a1,
            a2: a2,
            a3: a3,
            aLeft: a1,
            aRight: a3
          });
          return;
        }
      }

      // 普通两两关系
      const p1 = mems[0];
      const p2 = mems[1];
      const a1 = anchors[`${p1.pillar}_${p1.layer}`];
      const a2 = anchors[`${p2.pillar}_${p2.layer}`];

      if (!a1 || !a2) return;

      // 保证从左向右规范化
      const isP1Left = (a1.cx <= a2.cx);
      const leftPillar = isP1Left ? p1.pillar : p2.pillar;
      const rightPillar = isP1Left ? p2.pillar : p1.pillar;
      const leftX = Math.min(a1.cx, a2.cx);
      const rightX = Math.max(a1.cx, a2.cx);

      if (p1.layer === '干' && p2.layer === '干') {
        upperItems.push({
          rel,
          layer: '干',
          pLeft: leftPillar,
          pRight: rightPillar,
          xMin: leftX,
          xMax: rightX,
          aLeft: isP1Left ? a1 : a2,
          aRight: isP1Left ? a2 : a1
        });
      } else if (p1.layer === '支' && p2.layer === '支') {
        lowerItems.push({
          rel,
          layer: '支',
          pLeft: leftPillar,
          pRight: rightPillar,
          xMin: leftX,
          xMax: rightX,
          aLeft: isP1Left ? a1 : a2,
          aRight: isP1Left ? a2 : a1
        });
      } else if (p1.pillar === p2.pillar && p1.layer !== p2.layer) {
        // 同柱垂直自合 / 盖头 / 截脚
        verticalItems.push({
          rel,
          layer: '自合',
          pillar: p1.pillar,
          cx: a1.cx,
          topNode: a1.topY < a2.topY ? a1 : a2,
          bottomNode: a1.topY < a2.topY ? a2 : a1
        });
      }
    });

    // 3. 执行非重叠轨道分配
    const upperTrackCount = allocateTracks(upperItems, 16);
    const lowerTrackCount = allocateTracks(lowerItems, 16);

    // 4. 端口微调偏移使用全局 getPortOffset，防止同一柱引出的多条折线在垂直段重合

    // 动态调整舞台最小高度以容纳所有折线轨道
    const stage = (svg && typeof svg.closest === 'function') ? svg.closest('.bazi-stage') : null;
    const isMobile = (typeof window !== 'undefined' && window.innerWidth <= 768);
    const defaultMinHeight = isMobile ? 540 : 580;
    const neededBottom = maxTrayBottomY + 30 + lowerTrackCount * (isMobile ? 22 : 28) + 30;

    const container = (typeof document !== 'undefined') ? document.getElementById('pillars-container') : null;
    const fullH = Math.max(container ? container.scrollHeight : 0, Math.ceil(neededBottom), defaultMinHeight);

    if (stage) {
      stage.style.minHeight = `${fullH}px`;
    }

    // 动态同步 SVG 与 Track 宽高度，确保移动端多柱横向滚动与纵向轨道无截断
    const stageTrack = stage ? stage.querySelector('.bazi-stage-track') : null;
    const stageW = stage ? stage.clientWidth : 0;
    const fullW = Math.max(container ? (container.scrollWidth || 0) : 0, stageW);

    if (svg && svg.style) {
      if (fullW > 0) {
        svg.style.width = `${fullW}px`;
        svg.setAttribute('width', `${fullW}`);
      }
      svg.style.height = `${fullH}px`;
      svg.setAttribute('height', `${fullH}`);
      if (fullW > 0 && fullH > 0) {
        svg.setAttribute('viewBox', `0 0 ${fullW} ${fullH}`);
      }
    }

    if (stageTrack) {
      if (fullW > 0) stageTrack.style.width = `${fullW}px`;
      stageTrack.style.minHeight = `${fullH}px`;
    }

    // 5. 渲染天干上方折线 (Garis Menekuk · 天干专属灵动极光)
    // 柱头标题和主宾徽章高度避让计算，让水平段在开阔空域延展
    const TRACK_HEIGHT = isMobile ? 22 : 26;
    const BASE_DELAY = 0.55;
    const STEP_DELAY = 0.16;
    const colHeaderOffset = isMobile ? 42 : 52;
    const colTopY = minTopY - colHeaderOffset;

    upperItems.forEach((item, idx) => {
      const rel = item.rel;
      const mems = rel.members;

      // 分配端口 X
      const offsetL = getPortOffset(upperPortMap, item.pLeft, 'toRight', item.xMax - item.xMin);
      const offsetR = getPortOffset(upperPortMap, item.pRight, 'toLeft', item.xMax - item.xMin);
      const x1 = item.aLeft.cx + offsetL;
      const x2 = item.aRight.cx + offsetR;
      const y1 = item.aLeft.topY;
      const y2 = item.aRight.topY;

      // 轨道绝对 Y：在柱头上方开阔区域，按轨道层层向上延伸，绝不穿插柱头文字
      const trackY = Math.max(14, colTopY - 14 - (item.track * TRACK_HEIGHT));

      const pathD = svgHelper.makeBentPath(x1, y1, x2, y2, 'up', trackY, 8);
      createAndAttachPath(svg, pathD, rel, mems, anchors, BASE_DELAY + idx * STEP_DELAY, tooltip, '干');
    });

    // 6. 渲染地支下方折线 (Garis Menekuk · 地支厚重地脉与 3 Serangkai)
    lowerItems.forEach((item, idx) => {
      const rel = item.rel;
      const mems = rel.members;

      if (item.isTriad) {
        createAndAttachTriad(svg, rel, item, anchors, BASE_DELAY + (upperItems.length + idx) * STEP_DELAY, tooltip, lowerPortMap, maxTrayBottomY, TRACK_HEIGHT);
      } else {
        const offsetL = getPortOffset(lowerPortMap, item.pLeft, 'toRight', item.xMax - item.xMin);
        const offsetR = getPortOffset(lowerPortMap, item.pRight, 'toLeft', item.xMax - item.xMin);
        const x1 = item.aLeft.cx + offsetL;
        const x2 = item.aRight.cx + offsetR;
        const y1 = item.aLeft.trayBottomY + 4;
        const y2 = item.aRight.trayBottomY + 4;

        const trackY = maxTrayBottomY + 22 + (item.track * TRACK_HEIGHT);

        const pathD = svgHelper.makeBentPath(x1, y1, x2, y2, 'down', trackY, 8);
        createAndAttachPath(svg, pathD, rel, mems, anchors, BASE_DELAY + (upperItems.length + idx) * STEP_DELAY, tooltip, '支');
      }
    });

    // 7. 渲染同柱垂直连线 (干支自合天地贯通 · 严格保证正向线长与端点间距)
    verticalItems.forEach((item, idx) => {
      const rel = item.rel;
      const mems = rel.members;
      const x = item.cx;
      const y1 = item.topNode.bottomY + 2;
      const y2 = Math.max(y1 + 8, item.bottomNode.topY - 2);

      const pathD = svgHelper.makeVerticalPath(x, y1, y2);
      createAndAttachPath(svg, pathD, rel, mems, anchors, BASE_DELAY + (upperItems.length + lowerItems.length + idx) * STEP_DELAY, tooltip, '自合');
    });
  };

  function createAndAttachPath(svg, pathD, rel, mems, anchors, delaySec, tooltip, layer) {
    let strokeColor = KIND_COLORS[rel.kind] || '#2ecc71';

    let strokeClass = 'rel-type-he';
    if (layer === '干') {
      if (rel.kind.indexOf('冲') !== -1) strokeClass = 'rel-tiangan-chong';
      else if (rel.kind.indexOf('克') !== -1) strokeClass = 'rel-tiangan-ke';
      else strokeClass = 'rel-tiangan-he';
    } else if (layer === '支') {
      if (rel.kind.indexOf('冲') !== -1) strokeClass = 'rel-dizhi-chong';
      else if (rel.kind.indexOf('穿') !== -1) strokeClass = 'rel-dizhi-chuan';
      else if (rel.kind.indexOf('刑') !== -1) strokeClass = 'rel-dizhi-xing';
      else if (rel.kind.indexOf('暗合') !== -1) strokeClass = 'rel-dizhi-anhe';
      else if (rel.kind.indexOf('破') !== -1) strokeClass = 'rel-dizhi-po';
      else strokeClass = 'rel-dizhi-he';
    } else if (layer === '自合') {
      strokeClass = 'rel-type-zihe';
    } else {
      if (rel.kind.indexOf('冲') !== -1) strokeClass = 'rel-type-chong';
      else if (rel.kind.indexOf('穿') !== -1) strokeClass = 'rel-type-chuan';
      else if (rel.kind.indexOf('刑') !== -1) strokeClass = 'rel-type-xing';
      else if (rel.kind.indexOf('破') !== -1) strokeClass = 'rel-type-po';
      else if (rel.kind.indexOf('暗合') !== -1) strokeClass = 'rel-type-anhe';
      else if (rel.kind.indexOf('通根') !== -1) strokeClass = 'rel-type-gen';
      else if (rel.kind.indexOf('克') !== -1) strokeClass = 'rel-type-ke';
    }

    const pathElem = svgHelper.create('path', {
      d: pathD,
      class: `relation-path ${strokeClass}`,
      stroke: strokeColor,
      'data-rel-id': rel.id
    });

    // 优先添加到 DOM 后再测量实际精确长度，杜绝固定长度截断
    svg.appendChild(pathElem);

    let realLen = 600;
    try {
      realLen = Math.max(20, Math.ceil(pathElem.getTotalLength() || 600));
    } catch (e) {
      realLen = 600;
    }

    pathElem.style.strokeDasharray = `${realLen}`;
    pathElem.style.strokeDashoffset = `${realLen}`;

    const speed = (MP.animator && MP.animator.speedMultiplier) ? MP.animator.speedMultiplier : 1.0;
    const animDuration = 650 / speed;
    const animDelay = (delaySec * 1000) / speed;

    let photonGroup = null;

    function activateFlow() {
      pathElem.style.transition = '';
      pathElem.style.strokeDasharray = '';
      pathElem.style.strokeDashoffset = '';
      pathElem.classList.add('rel-flow-active');

      if (!photonGroup) {
        photonGroup = createAndAttachPhoton(svg, pathD, strokeColor, rel, pathElem, speed, layer);
      }
    }

    if (typeof pathElem.animate === 'function') {
      try {
        const anim = pathElem.animate([
          { strokeDashoffset: `${realLen}px` },
          { strokeDashoffset: '0px' }
        ], {
          duration: animDuration,
          delay: animDelay,
          easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
          fill: 'forwards'
        });

        let finished = false;
        const handleFinish = () => {
          if (finished) return;
          finished = true;
          pathElem.style.strokeDashoffset = '0';
          try { anim.cancel(); } catch (e) {}
          activateFlow();
        };

        if (anim && typeof anim.addEventListener === 'function') {
          anim.addEventListener('finish', handleFinish);
        } else if (anim) {
          anim.onfinish = handleFinish;
        }
        // 保险兜底定时器，防止某些移动端浏览器环境未派发 WAAPI finish 事件
        setTimeout(handleFinish, animDelay + animDuration + 50);
      } catch (e) {
        setTimeout(() => {
          pathElem.style.transition = `stroke-dashoffset ${animDuration}ms cubic-bezier(0.2, 0.9, 0.3, 1)`;
          pathElem.style.strokeDashoffset = '0';
          setTimeout(activateFlow, animDuration + 20);
        }, animDelay);
      }
    } else {
      setTimeout(() => {
        pathElem.style.transition = `stroke-dashoffset ${animDuration}ms cubic-bezier(0.2, 0.9, 0.3, 1)`;
        pathElem.style.strokeDashoffset = '0';
        setTimeout(activateFlow, animDuration + 20);
      }, animDelay);
    }

    // 悬停高亮与 Tooltip 交互
    pathElem.addEventListener('mouseenter', (e) => {
      pathElem.classList.add('highlighted');

      // 高亮关联的两端字符卡片
      mems.forEach(m => {
        const anchor = anchors[`${m.pillar}_${m.layer}`];
        if (anchor && anchor.element) {
          anchor.element.classList.add('highlighted');
        }
      });

      if (tooltip) {
        const content = `
          <div style="font-weight:bold;color:${strokeColor};margin-bottom:4px;font-size:0.95rem;">${rel.name}</div>
          <div style="font-size:0.75rem;color:#8892b0;margin-bottom:6px;">
            <span>类别: ${rel.kind}</span>
            ${rel.domainRelation ? `<span style="margin-left:8px;color:#e5b558;">[${rel.domainRelation}]</span>` : ''}
            ${rel.adjacent ? `<span style="margin-left:6px;color:#2ecc71;">(相邻)</span>` : ''}
          </div>
          <div style="font-size:0.82rem;line-height:1.45;color:#e0e6ed;">${rel.desc}</div>
        `;
        tooltip.innerHTML = content;
        tooltip.classList.add('show');
        relRender.positionTooltip(tooltip, e.pageX, e.pageY);
      }
    });

    pathElem.addEventListener('mousemove', (e) => {
      if (tooltip && tooltip.classList.contains('show')) {
        relRender.positionTooltip(tooltip, e.pageX, e.pageY);
      }
    });

    pathElem.addEventListener('mouseleave', () => {
      pathElem.classList.remove('highlighted');
      mems.forEach(m => {
        const anchor = anchors[`${m.pillar}_${m.layer}`];
        if (anchor && anchor.element) {
          anchor.element.classList.remove('highlighted');
        }
      });
      if (tooltip) {
        tooltip.classList.remove('show');
      }
    });
  }

  /**
   * 构造并挂载 3 Serangkai (三合局/三会局) 联动折线网络与中枢徽章
   */
  function createAndAttachTriad(svg, rel, item, anchors, delaySec, tooltip, lowerPortMap, maxTrayBottomY, TRACK_HEIGHT) {
    const strokeColor = KIND_COLORS[rel.kind] || '#2ecc71';
    const isSanhui = (rel.name.indexOf('三会') !== -1 || rel.kind.indexOf('三会') !== -1);
    const strokeClass = isSanhui ? 'rel-triad-sanhui' : 'rel-triad-sanhe';

    // 端口偏移分配：左端右偏，右端左偏，中端居中
    const offset1 = getPortOffset(lowerPortMap, item.p1, 'toRight', item.xMax - item.xMin);
    const offset3 = getPortOffset(lowerPortMap, item.p3, 'toLeft', item.xMax - item.xMin);
    const offset2 = 0;

    const x1 = item.a1.cx + offset1;
    const x2 = item.a2.cx + offset2;
    const x3 = item.a3.cx + offset3;

    const y1 = item.a1.trayBottomY + 4;
    const y2 = item.a2.trayBottomY + 4;
    const y3 = item.a3.trayBottomY + 4;

    const trackY = maxTrayBottomY + 22 + (item.track * TRACK_HEIGHT);

    // 主连通三叉总线 (Main Arch + Middle Stem)
    const triadPathD = svgHelper.makeTriadBentPath(x1, y1, x2, y2, x3, y3, 'down', trackY, 8);

    const pathElem = svgHelper.create('path', {
      d: triadPathD,
      class: `relation-path ${strokeClass}`,
      stroke: strokeColor,
      'data-rel-id': rel.id
    });

    svg.appendChild(pathElem);

    let realLen = 800;
    try {
      realLen = Math.max(40, Math.ceil(pathElem.getTotalLength() || 800));
    } catch (e) {
      realLen = 800;
    }

    pathElem.style.strokeDasharray = `${realLen}`;
    pathElem.style.strokeDashoffset = `${realLen}`;

    const speed = (MP.animator && MP.animator.speedMultiplier) ? MP.animator.speedMultiplier : 1.0;
    const animDuration = 750 / speed;
    const animDelay = (delaySec * 1000) / speed;

    const triadPhotons = [];
    let nexusGroup = null;

    function activateTriadFlow() {
      pathElem.style.transition = '';
      pathElem.style.strokeDasharray = '';
      pathElem.style.strokeDashoffset = '';
      pathElem.classList.add('rel-flow-active');

      if (triadPhotons.length === 0) {
        // 创建 3 个同步巡航光斑，分别在三合局各臂飞驰巡航 (3-Particle Synchronized Orbit)
        // 轨迹 1: 左右主跨 (P1 <-> P3)
        const path1 = svgHelper.makeBentPath(x1, y1, x3, y3, 'down', trackY, 8);
        const p1 = createAndAttachPhoton(svg, path1, strokeColor, rel, pathElem, speed, '支');
        if (p1) triadPhotons.push(p1);

        // 轨迹 2: 左中连结 (P1 <-> P2)
        const path2 = svgHelper.makeBentPath(x1, y1, x2, y2, 'down', trackY, 8);
        const p2 = createAndAttachPhoton(svg, path2, strokeColor, rel, pathElem, speed * 1.15, '支');
        if (p2) triadPhotons.push(p2);

        // 轨迹 3: 中右连结 (P2 <-> P3)
        const path3 = svgHelper.makeBentPath(x2, y2, x3, y3, 'down', trackY, 8);
        const p3 = createAndAttachPhoton(svg, path3, strokeColor, rel, pathElem, speed * 1.15, '支');
        if (p3) triadPhotons.push(p3);
      }
    }

    if (typeof pathElem.animate === 'function') {
      try {
        const anim = pathElem.animate([
          { strokeDashoffset: `${realLen}px` },
          { strokeDashoffset: '0px' }
        ], {
          duration: animDuration,
          delay: animDelay,
          easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
          fill: 'forwards'
        });

        let finished = false;
        const handleFinish = () => {
          if (finished) return;
          finished = true;
          pathElem.style.strokeDashoffset = '0';
          try { anim.cancel(); } catch (e) {}
          activateTriadFlow();
        };

        if (anim && typeof anim.addEventListener === 'function') {
          anim.addEventListener('finish', handleFinish);
        } else if (anim) {
          anim.onfinish = handleFinish;
        }
        setTimeout(handleFinish, animDelay + animDuration + 50);
      } catch (e) {
        setTimeout(() => {
          pathElem.style.transition = `stroke-dashoffset ${animDuration}ms cubic-bezier(0.2, 0.9, 0.3, 1)`;
          pathElem.style.strokeDashoffset = '0';
          setTimeout(activateTriadFlow, animDuration + 20);
        }, animDelay);
      }
    } else {
      setTimeout(() => {
        pathElem.style.transition = `stroke-dashoffset ${animDuration}ms cubic-bezier(0.2, 0.9, 0.3, 1)`;
        pathElem.style.strokeDashoffset = '0';
        setTimeout(activateTriadFlow, animDuration + 20);
      }, animDelay);
    }

    // 构建中枢汇聚徽章 (Central Nexus Badge)
    let badgeText = rel.name;
    if (rel.name.indexOf('三合') !== -1) {
      const match = rel.name.match(/三合([金木水火土])局/);
      badgeText = match ? `⟐ 三合${match[1]}局` : rel.name;
    } else if (rel.name.indexOf('三会') !== -1) {
      const match = rel.name.match(/三会([金木水火土])/);
      badgeText = match ? `⟐ 三会${match[1]}方` : rel.name;
    }

    const badgeW = Math.max(76, badgeText.length * 12 + 16);
    const badgeH = 22;

    nexusGroup = svgHelper.create('g', {
      class: 'triad-nexus-group',
      'data-rel-id': rel.id
    });

    const badgeBg = svgHelper.create('rect', {
      x: `${x2 - badgeW / 2}`,
      y: `${trackY - badgeH / 2}`,
      width: `${badgeW}`,
      height: `${badgeH}`,
      class: 'triad-badge-bg',
      rx: '6',
      ry: '6'
    });
    nexusGroup.appendChild(badgeBg);

    const badgeLabel = svgHelper.create('text', {
      x: `${x2}`,
      y: `${trackY}`,
      class: 'triad-nexus-badge'
    });
    badgeLabel.textContent = badgeText;
    nexusGroup.appendChild(badgeLabel);

    svg.appendChild(nexusGroup);

    // 三端全柱高亮与 Tooltip 处理
    const mems = rel.members;

    function handleEnter(e) {
      pathElem.classList.add('highlighted');
      nexusGroup.classList.add('highlighted');
      triadPhotons.forEach(p => p.classList.add('highlighted'));

      mems.forEach(m => {
        const anchor = anchors[`${m.pillar}_${m.layer}`];
        if (anchor && anchor.element) {
          anchor.element.classList.add('highlighted');
        }
      });

      if (tooltip) {
        const content = `
          <div style="font-weight:bold;color:${strokeColor};margin-bottom:4px;font-size:0.95rem;">${rel.name} (3柱联动)</div>
          <div style="font-size:0.75rem;color:#8892b0;margin-bottom:6px;">
            <span>类别: ${rel.kind}</span>
            ${rel.domainRelation ? `<span style="margin-left:8px;color:#e5b558;">[${rel.domainRelation}]</span>` : ''}
            <span style="margin-left:8px;color:#2ecc71;">★ 三端骨干全通</span>
          </div>
          <div style="font-size:0.82rem;line-height:1.45;color:#e0e6ed;">${rel.desc}</div>
        `;
        tooltip.innerHTML = content;
        tooltip.classList.add('show');
        relRender.positionTooltip(tooltip, e.pageX, e.pageY);
      }
    }

    function handleMove(e) {
      if (tooltip && tooltip.classList.contains('show')) {
        relRender.positionTooltip(tooltip, e.pageX, e.pageY);
      }
    }

    function handleLeave() {
      pathElem.classList.remove('highlighted');
      nexusGroup.classList.remove('highlighted');
      triadPhotons.forEach(p => p.classList.remove('highlighted'));

      mems.forEach(m => {
        const anchor = anchors[`${m.pillar}_${m.layer}`];
        if (anchor && anchor.element) {
          anchor.element.classList.remove('highlighted');
        }
      });
      if (tooltip) {
        tooltip.classList.remove('show');
      }
    }

    pathElem.addEventListener('mouseenter', handleEnter);
    pathElem.addEventListener('mousemove', handleMove);
    pathElem.addEventListener('mouseleave', handleLeave);

    nexusGroup.addEventListener('mouseenter', handleEnter);
    nexusGroup.addEventListener('mousemove', handleMove);
    nexusGroup.addEventListener('mouseleave', handleLeave);
  }

  /**
   * 构造并挂载沿折线巡航飞驰的能量光斑 (Travelling Energy Photons)
   * 区分 天干 (Celestial Comet) vs 地支 (Terrestrial Magma Orb)
   */
  function createAndAttachPhoton(svg, pathD, strokeColor, rel, pathElem, speedMultiplier, layer) {
    if (!svg || typeof document === 'undefined') return null;

    let baseDur = 1.6;
    let rx = 7;
    let ry = 3;
    let coreR = 2;
    const isTiangan = (layer === '干');

    if (rel.kind.indexOf('冲') !== -1) {
      baseDur = isTiangan ? 0.6 : 0.85; // 天干冲更敏锐迅速破空
      rx = isTiangan ? 10 : 8;
      ry = isTiangan ? 2.0 : 3.0;
      coreR = 2.2;
    } else if (rel.kind.indexOf('穿') !== -1) {
      baseDur = 0.8; // 穿: 高速贯穿激光
      rx = 10;
      ry = 2.5;
      coreR = 2;
    } else if (rel.kind.indexOf('刑') !== -1) {
      baseDur = 1.2; // 刑: 摩擦绞断光弹
      rx = 7;
      ry = 3.5;
    } else if (rel.kind.indexOf('克') !== -1) {
      baseDur = isTiangan ? 0.85 : 1.0;
      rx = 8;
      ry = 2.8;
    } else if (rel.kind.indexOf('暗合') !== -1) {
      baseDur = 1.5; // 暗合: 水流暗涌光珠
      rx = 6;
      ry = 4;
      coreR = 2.5;
    } else if (rel.kind.indexOf('破') !== -1) {
      baseDur = 1.7; // 破: 脆裂闪烁火星
      rx = 5;
      ry = 3;
    } else {
      // 合 (He) 与通根
      baseDur = isTiangan ? 1.3 : 1.6;
      rx = isTiangan ? 9 : 7;
      ry = isTiangan ? 2.5 : 4.2;
      coreR = 2.5;
    }

    if (layer === '自合') {
      baseDur = 1.0;
      rx = 4;
      ry = 2.5;
      coreR = 1.5;
    }

    const dur = Math.max(0.3, baseDur / (speedMultiplier || 1.0));

    const photonGroup = svgHelper.create('g', {
      class: `rel-photon ${isTiangan ? 'photon-tiangan' : 'photon-dizhi'}`,
      'data-rel-id': rel.id
    });

    try {
      const animMotion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
      animMotion.setAttribute('path', pathD);
      animMotion.setAttribute('dur', `${dur}s`);
      animMotion.setAttribute('repeatCount', 'indefinite');
      animMotion.setAttribute('rotate', 'auto');
      photonGroup.appendChild(animMotion);

      if (isTiangan) {
        // 天干：流线型极光彗星 (Ethereal Comet)
        const cometBody = svgHelper.create('ellipse', {
          cx: '0',
          cy: '0',
          rx: `${rx}`,
          ry: `${ry}`,
          fill: strokeColor,
          filter: `drop-shadow(0 0 6px ${strokeColor})`
        });
        photonGroup.appendChild(cometBody);

        const starCore = svgHelper.create('circle', {
          cx: '2',
          cy: '0',
          r: `${coreR}`,
          fill: '#ffffff'
        });
        photonGroup.appendChild(starCore);
      } else {
        // 地支：厚重地脉能量晶核 + 震波光晕外环 (Terrestrial Magma Orb + Seismic Aura)
        const shockwaveRing = svgHelper.create('ellipse', {
          cx: '0',
          cy: '0',
          rx: `${rx + 2}`,
          ry: `${ry + 2}`,
          fill: 'none',
          stroke: strokeColor,
          'stroke-width': '1.2px',
          'stroke-dasharray': '2 2',
          opacity: '0.85'
        });
        photonGroup.appendChild(shockwaveRing);

        const orbBody = svgHelper.create('ellipse', {
          cx: '0',
          cy: '0',
          rx: `${rx}`,
          ry: `${ry}`,
          fill: strokeColor,
          filter: `drop-shadow(0 0 8px ${strokeColor})`
        });
        photonGroup.appendChild(orbBody);

        const core = svgHelper.create('circle', {
          cx: '0',
          cy: '0',
          r: `${coreR}`,
          fill: '#ffffff'
        });
        photonGroup.appendChild(core);
      }

      svg.appendChild(photonGroup);

      // 与 pathElem 悬停同步
      pathElem.addEventListener('mouseenter', () => {
        photonGroup.classList.add('highlighted');
      });
      pathElem.addEventListener('mouseleave', () => {
        photonGroup.classList.remove('highlighted');
      });
    } catch (e) {}

    return photonGroup;
  }

  /**
   * 定位浮动提示框
   */
  relRender.positionTooltip = function (tooltip, mouseX, mouseY) {
    const offset = 14;
    let x = mouseX + offset;
    let y = mouseY + offset;

    const tipRect = tooltip.getBoundingClientRect();
    const winW = (typeof window !== 'undefined') ? window.innerWidth : 375;
    const winH = (typeof window !== 'undefined') ? window.innerHeight : 667;

    if (x + tipRect.width > winW - 10) {
      x = mouseX - tipRect.width - offset;
    }
    if (y + tipRect.height > winH - 10) {
      y = mouseY - tipRect.height - offset;
    }

    x = Math.max(10, Math.min(x, winW - (tipRect.width || 200) - 10));
    y = Math.max(10, Math.min(y, winH - (tipRect.height || 100) - 10));

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  };

  MP.render.relations = relRender;
  return relRender;
}));
