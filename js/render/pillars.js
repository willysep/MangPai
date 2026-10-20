/**
 * 盲派八字 - 四柱及外来柱节点渲染引擎
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    factory(MP);
    module.exports = MP.render.pillars;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const pillarsRender = {};

  /**
   * 渲染四柱与大运/流年节点
   * @param {HTMLElement} container 柱容器DOM
   * @param {object} chart 解析后的八字
   * @param {object} luckPillars 大运与流年对象
   * @param {object} tiYongMap 体用字典
   * @param {Function} onTiYongToggle 用户切换体用回调
   * @param {Function} onNodeClick 点击字根卡片查看关系弹窗回调
   * @returns {object} 节点坐标映射表
   */
  pillarsRender.render = function (container, chart, luckPillars, tiYongMap, onTiYongToggle, onNodeClick) {
    container.innerHTML = '';

    const pillarList = [
      { key: 'year', data: chart.pillars.year, isLuck: false },
      { key: 'month', data: chart.pillars.month, isLuck: false },
      { key: 'day', data: chart.pillars.day, isLuck: false },
      { key: 'hour', data: chart.pillars.hour, isLuck: false }
    ];

    if (luckPillars && luckPillars.dayun) {
      pillarList.push({
        key: 'dayun',
        data: {
          role: '大运',
          name: '大运',
          domain: '宾位(外来)',
          nayin: luckPillars.dayun.nayin || '',
          stem: {
            char: luckPillars.dayun.stem,
            wx: MP.data.STEM_WX[luckPillars.dayun.stem],
            tenGod: luckPillars.dayun.stemTenGod || MP.engine.core.getTenGod(chart.dayStem, luckPillars.dayun.stem)
          },
          branch: {
            char: luckPillars.dayun.branch,
            wx: MP.data.BRANCH_WX[luckPillars.dayun.branch],
            hidden: MP.engine.core.getHiddenStemsInfo(chart.dayStem, luckPillars.dayun.branch)
          }
        },
        isLuck: true
      });
    }

    if (luckPillars && luckPillars.liunian) {
      pillarList.push({
        key: 'liunian',
        data: {
          role: '流年',
          name: '流年',
          domain: '宾位(外来)',
          nayin: luckPillars.liunian.nayin || '',
          stem: {
            char: luckPillars.liunian.stem,
            wx: MP.data.STEM_WX[luckPillars.liunian.stem],
            tenGod: luckPillars.liunian.stemTenGod || MP.engine.core.getTenGod(chart.dayStem, luckPillars.liunian.stem)
          },
          branch: {
            char: luckPillars.liunian.branch,
            wx: MP.data.BRANCH_WX[luckPillars.liunian.branch],
            hidden: MP.engine.core.getHiddenStemsInfo(chart.dayStem, luckPillars.liunian.branch)
          }
        },
        isLuck: true
      });
    }

    // 渲染列
    pillarList.forEach((item, colIdx) => {
      if (item.isLuck && colIdx === 4) {
        // 在原局与运岁之间插入虚线分隔符
        const divider = document.createElement('div');
        divider.className = 'pillar-divider';
        container.appendChild(divider);
      }

      const pKey = item.key;
      const p = item.data;
      const isDayMaster = (pKey === 'day');

      const col = document.createElement('div');
      col.className = 'pillar-col';
      const speed = (MP.animator && MP.animator.speedMultiplier) ? MP.animator.speedMultiplier : 1.0;
      col.style.animationDelay = `${(colIdx * 0.14) / speed}s`;
      col.setAttribute('data-pillar', pKey);

      // 宾主徽章
      const domainTag = document.createElement('div');
      domainTag.className = 'pillar-domain-tag ' + (p.domain.indexOf('主位') !== -1 ? 'badge-host' : 'badge-guest');
      domainTag.textContent = p.domain;
      col.appendChild(domainTag);

      // 柱名
      const roleTitle = document.createElement('div');
      roleTitle.className = 'pillar-role-title';
      roleTitle.textContent = p.name;
      col.appendChild(roleTitle);

      // 天干卡片
      const stemNode = document.createElement('div');
      stemNode.className = `char-node bg-wx-${p.stem.wx} ${isDayMaster ? 'day-master-node' : ''}`;
      stemNode.setAttribute('data-pillar', pKey);
      stemNode.setAttribute('data-layer', '干');
      stemNode.setAttribute('data-char', p.stem.char);

      const stemTenGod = document.createElement('span');
      stemTenGod.className = 'char-tengod';
      stemTenGod.textContent = p.stem.tenGod || '日主';
      stemNode.appendChild(stemTenGod);

      const stemText = document.createElement('span');
      stemText.className = `char-text wx-${p.stem.wx}`;
      stemText.textContent = p.stem.char;
      stemNode.appendChild(stemText);

      // 点击天干卡片弹出关系动效解析
      stemNode.title = `点击查看【${p.role}天干 · ${p.stem.char}】与其它干支的全部作用关系`;
      stemNode.onclick = () => {
        if (onNodeClick) onNodeClick(pKey, '干', p.stem.char);
      };

      // 体用标签
      const stemTyKey = `${pKey}_stem`;
      const stemTyVal = (tiYongMap && tiYongMap[stemTyKey]) ? tiYongMap[stemTyKey].tiYong : '体/用';
      const stemTyTag = document.createElement('span');
      stemTyTag.className = 'tiyong-tag';
      stemTyTag.textContent = stemTyVal;
      stemTyTag.title = '点击切换 体/用/待定';
      stemTyTag.onclick = (e) => {
        e.stopPropagation();
        if (onTiYongToggle) onTiYongToggle(stemTyKey);
      };
      stemNode.appendChild(stemTyTag);

      col.appendChild(stemNode);

      // 地支卡片
      const branchNode = document.createElement('div');
      branchNode.className = `char-node bg-wx-${p.branch.wx}`;
      branchNode.setAttribute('data-pillar', pKey);
      branchNode.setAttribute('data-layer', '支');
      branchNode.setAttribute('data-char', p.branch.char);
      branchNode.title = `点击查看【${p.role}地支 · ${p.branch.char}】与其它干支的全部作用关系`;
      branchNode.onclick = () => {
        if (onNodeClick) onNodeClick(pKey, '支', p.branch.char);
      };

      const branchText = document.createElement('span');
      branchText.className = `char-text wx-${p.branch.wx}`;
      branchText.textContent = p.branch.char;
      branchNode.appendChild(branchText);

      const nayinText = document.createElement('span');
      nayinText.className = 'char-nayin';
      nayinText.textContent = p.nayin ? p.nayin.slice(-1) + '音' : '';
      branchNode.appendChild(nayinText);

      // 地支体用标签
      const branchTyKey = `${pKey}_branch`;
      const branchTyVal = (tiYongMap && tiYongMap[branchTyKey]) ? tiYongMap[branchTyKey].tiYong : '体/用';
      const branchTyTag = document.createElement('span');
      branchTyTag.className = 'tiyong-tag';
      branchTyTag.textContent = branchTyVal;
      branchTyTag.title = '点击切换 体/用/待定';
      branchTyTag.onclick = (e) => {
        e.stopPropagation();
        if (onTiYongToggle) onTiYongToggle(branchTyKey);
      };
      branchNode.appendChild(branchTyTag);

      col.appendChild(branchNode);

      // 藏干托盘
      const hiddenTray = document.createElement('div');
      hiddenTray.className = 'hidden-stems-tray';
      (p.branch.hidden || []).forEach((h, hIdx) => {
        const item = document.createElement('div');
        item.className = 'hidden-item';
        const itemDelay = ((colIdx * 0.14) + 0.28 + (hIdx * 0.06)) / speed;
        item.style.animationDelay = `${itemDelay}s`;
        item.innerHTML = `
          <span class="h-char wx-${h.wx}">${h.stem}</span>
          <span class="h-tg">${h.tenGod}</span>
          <span style="color:var(--text-muted);font-size:0.65rem;">${h.type[0]}</span>
        `;
        hiddenTray.appendChild(item);
      });
      col.appendChild(hiddenTray);

      container.appendChild(col);
    });

    // 获取并返回每个节点的几何锚点坐标 (在没有 CSS transform 位移的静止状态下测量，100% 精确)
    const anchors = pillarsRender.getNodeAnchors(container);

    // 测量锚点完毕后，再为各列激活动态入场动画
    const cols = container.querySelectorAll('.pillar-col');
    cols.forEach(c => {
      c.classList.add('card-animate-in');
    });

    return anchors;
  };

  /**
   * 计算所有字符节点的锚点相对坐标
   */
  pillarsRender.getNodeAnchors = function (container) {
    const anchors = {};
    const containerRect = container.getBoundingClientRect();
    const nodes = container.querySelectorAll('.char-node');

    nodes.forEach(node => {
      const pKey = node.getAttribute('data-pillar');
      const layer = node.getAttribute('data-layer');
      const rect = node.getBoundingClientRect();
      const col = node.closest('.pillar-col');

      // 提取列的 transform translateY 偏移 (若处于动画飞行中，自动扣除保证坐标稳定)
      let transY = 0;
      if (col && typeof window !== 'undefined' && window.getComputedStyle) {
        try {
          const tr = window.getComputedStyle(col).transform;
          if (tr && tr !== 'none') {
            if (typeof DOMMatrix === 'function') {
              transY = (new DOMMatrix(tr)).m42 || 0;
            } else if (typeof WebKitCSSMatrix === 'function') {
              transY = (new WebKitCSSMatrix(tr)).m42 || 0;
            } else {
              const m = tr.match(/matrix.*\((.+)\)/);
              if (m && m[1]) {
                const parts = m[1].split(',').map(s => parseFloat(s.trim()));
                transY = parts.length === 6 ? parts[5] : (parts.length === 16 ? parts[13] : 0);
              }
            }
          }
        } catch (e) {
          transY = 0;
        }
      }

      const cx = (rect.left + rect.width / 2) - containerRect.left;
      const topY = (rect.top - transY) - containerRect.top;
      const bottomY = (rect.bottom - transY) - containerRect.top;
      const cy = (topY + bottomY) / 2;

      // 计算所属整列的底端 (避开下方藏干托盘)
      let trayBottomY = bottomY;
      if (col) {
        const colRect = col.getBoundingClientRect();
        trayBottomY = (colRect.bottom - transY) - containerRect.top;
      }

      anchors[`${pKey}_${layer}`] = {
        cx: cx,
        cy: cy,
        topY: topY,
        bottomY: bottomY,
        trayBottomY: trayBottomY,
        element: node
      };
    });

    return anchors;
  };

  MP.render.pillars = pillarsRender;
  return pillarsRender;
}));
