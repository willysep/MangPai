/**
 * 盲派八字 - 干支点击交互深度作用弹窗 (Animated Relation Modal)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    factory(MP);
    module.exports = MP.render.modal;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const modal = {};
  let currentContext = null;

  /**
   * 打开指定干支的作用弹窗
   * @param {object} chart 解析后的八字图表
   * @param {object} luckPillars 大运流年
   * @param {Array} relations 关系列表
   * @param {object} mpData 盲派分析结果
   * @param {string} targetPillar 目标柱键 ('year' | 'month' | 'day' | 'hour' | 'dayun' | 'liunian')
   * @param {string} targetLayer 目标层 ('干' | '支')
   * @param {Function} onSwitchTarget 弹窗内切换查看其它字的回调
   */
  modal.open = function (chart, luckPillars, relations, mpData, targetPillar, targetLayer, onSwitchTarget) {
    currentContext = { chart, luckPillars, relations, mpData, onSwitchTarget };

    const modalBackdrop = document.getElementById('relation-modal');
    const modalContent = document.getElementById('modal-content');
    if (!modalBackdrop || !modalContent) return;

    // 1. 获取目标字符的完整数据
    let pillarData = chart.pillars[targetPillar];
    let isLuck = false;
    if (!pillarData && luckPillars) {
      if (targetPillar === 'dayun' && luckPillars.dayun) {
        pillarData = {
          role: '大运',
          name: '大运',
          domain: '宾位(外来)',
          nayin: luckPillars.dayun.nayin || '',
          stem: {
            char: luckPillars.dayun.stem,
            wx: MP.data.STEM_WX[luckPillars.dayun.stem],
            yy: MP.data.STEM_YY[luckPillars.dayun.stem],
            tenGod: luckPillars.dayun.stemTenGod
          },
          branch: {
            char: luckPillars.dayun.branch,
            wx: MP.data.BRANCH_WX[luckPillars.dayun.branch],
            yy: MP.data.BRANCH_YY[luckPillars.dayun.branch],
            zodiac: MP.data.BRANCH_ZODIAC[luckPillars.dayun.branch],
            hidden: MP.engine.core.getHiddenStemsInfo(chart.dayStem, luckPillars.dayun.branch)
          }
        };
        isLuck = true;
      } else if (targetPillar === 'liunian' && luckPillars.liunian) {
        pillarData = {
          role: '流年',
          name: '流年',
          domain: '宾位(外来)',
          nayin: luckPillars.liunian.nayin || '',
          stem: {
            char: luckPillars.liunian.stem,
            wx: MP.data.STEM_WX[luckPillars.liunian.stem],
            yy: MP.data.STEM_YY[luckPillars.liunian.stem],
            tenGod: luckPillars.liunian.stemTenGod
          },
          branch: {
            char: luckPillars.liunian.branch,
            wx: MP.data.BRANCH_WX[luckPillars.liunian.branch],
            yy: MP.data.BRANCH_YY[luckPillars.liunian.branch],
            zodiac: MP.data.BRANCH_ZODIAC[luckPillars.liunian.branch],
            hidden: MP.engine.core.getHiddenStemsInfo(chart.dayStem, luckPillars.liunian.branch)
          }
        };
        isLuck = true;
      }
    }

    if (!pillarData) return;

    const isStem = (targetLayer === '干');
    const targetObj = isStem ? pillarData.stem : pillarData.branch;
    const targetChar = targetObj.char;
    const wx = targetObj.wx;
    const yy = targetObj.yy || (isStem ? MP.data.STEM_YY[targetChar] : MP.data.BRANCH_YY[targetChar]);
    const wxColor = MP.data.WUXING_COLORS[wx];

    // 体用标签
    const tyKey = `${targetPillar}_${isStem ? 'stem' : 'branch'}`;
    const tiYong = (mpData.tiYongMap && mpData.tiYongMap[tyKey]) ? mpData.tiYongMap[tyKey].tiYong : '-';

    // 2. 筛选出与此字直接发生关联的所有关系
    const relatedList = relations.filter(r => {
      return r.members.some(m => m.pillar === targetPillar && m.layer === targetLayer);
    });

    // 3. 构建弹窗头部
    let hiddenDescHtml = '';
    if (!isStem && targetObj.hidden) {
      const hiddenPills = targetObj.hidden.map(h => {
        const hColor = MP.data.WUXING_COLORS[h.wx];
        return `<span class="modal-hidden-pill" style="border-left: 3px solid ${hColor};">
          <b style="color:${hColor};">${h.stem}</b> (${h.type}: <span style="color:#e5b558;">${h.tenGod}</span>)
        </span>`;
      }).join(' ');
      hiddenDescHtml = `<div class="modal-hidden-tray"><span style="color:var(--text-muted);font-size:0.8rem;margin-right:6px;">地支藏干:</span>${hiddenPills}</div>`;
    }

    // 宫位意象
    const palaceInfo = MP.data.PALACE[pillarData.name] || MP.data.PALACE[pillarData.role] || { title: pillarData.name, desc: '' };
    // 十神意象
    const tenGodTitle = isStem ? (targetObj.tenGod || '日主') : (targetObj.hidden && targetObj.hidden[0] ? targetObj.hidden[0].tenGod : '');
    const tenGodXiang = MP.data.TEN_GOD_XIANG[tenGodTitle] || { desc: '' };

    // 4. 组装关系卡片 HTML
    let relCardsHtml = '';
    if (relatedList.length === 0) {
      relCardsHtml = `
        <div class="modal-empty-card">
          <div style="font-size:1.1rem;color:var(--text-secondary);margin-bottom:6px;">✦ 气机平稳清纯 ✦</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">此字在八字原局中无直接激烈的冲战、刑穿、破败或五合合绊，清正自守。</div>
        </div>
      `;
    } else {
      relCardsHtml = relatedList.map((rel, idx) => {
        // 找到对方的成员信息 (支持2柱与3柱联动关系)
        const otherMems = rel.members.filter(m => !(m.pillar === targetPillar && m.layer === targetLayer));
        const effectiveOthers = otherMems.length > 0 ? otherMems : [rel.members[0]];

        const jumpButtonsHtml = effectiveOthers.map(m => `
          <button class="btn btn-sm modal-jump-btn" data-pillar="${m.pillar}" data-layer="${m.layer}" title="跳转查看此字">
            查看 [${m.char}]
          </button>
        `).join(' ');

        const targetDescHtml = effectiveOthers.map(m => {
          const mWx = m.layer === '干' ? MP.data.STEM_WX[m.char] : MP.data.BRANCH_WX[m.char];
          const mColor = MP.data.WUXING_COLORS[mWx];
          return `${m.role} ${m.layer}「<b style="color:${mColor};">${m.char}</b>」`;
        }).join(' 与 ');

        // 标签色彩
        let tagBg = 'rgba(229,181,88,0.15)';
        let tagColor = 'var(--accent-gold)';
        if (rel.kind.indexOf('冲') !== -1) { tagBg = 'rgba(231,76,60,0.2)'; tagColor = '#ff7675'; }
        else if (rel.kind.indexOf('穿') !== -1) { tagBg = 'rgba(155,89,182,0.2)'; tagColor = '#d299ff'; }
        else if (rel.kind.indexOf('合') !== -1) { tagBg = 'rgba(46,204,113,0.2)'; tagColor = '#2ecc71'; }
        else if (rel.kind.indexOf('刑') !== -1) { tagBg = 'rgba(230,126,34,0.2)'; tagColor = '#f39c12'; }

        return `
          <div class="modal-rel-card" style="animation-delay: ${idx * 0.05}s;">
            <div class="modal-rel-header">
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="modal-rel-kind" style="background:${tagBg};color:${tagColor};border:1px solid ${tagColor};">${rel.kind}</span>
                <span style="font-size:0.95rem;font-weight:bold;color:#f0f4f8;">${rel.name}</span>
                ${rel.domainRelation ? `<span class="badge ${rel.domainRelation.indexOf('主') !== -1 ? 'badge-host' : 'badge-guest'}">${rel.domainRelation}</span>` : ''}
              </div>
              <div style="display:flex;gap:6px;">
                ${jumpButtonsHtml}
              </div>
            </div>
            <div class="modal-rel-body">
              <div class="modal-rel-desc">${rel.desc}</div>
              <div class="modal-rel-sub">
                <span>对象：${targetDescHtml}</span>
                ${rel.adjacent ? '<span style="color:#2ecc71;margin-left:10px;">★ 相邻紧邻，发力直接</span>' : '<span style="color:#8892b0;margin-left:10px;">• 隔柱遥应</span>'}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 5. 渲染整体 Modal DOM
    modalContent.innerHTML = `
      <!-- 字符核心概览 -->
      <div class="modal-char-header">
        <div class="modal-char-avatar bg-wx-${wx}">
          <span class="char-large wx-${wx}">${targetChar}</span>
          <span class="modal-layer-tag">${targetLayer}</span>
        </div>
        <div class="modal-char-meta">
          <div class="modal-title-row">
            <h2>${pillarData.role} · ${targetLayer === '干' ? '天干' : '地支'}「${targetChar}」</h2>
            <span class="badge ${pillarData.domain.indexOf('主位') !== -1 ? 'badge-host' : 'badge-guest'}">${pillarData.domain}</span>
          </div>
          <div class="modal-meta-chips">
            <span class="chip-item">五行: <b style="color:${wxColor};">${yy}${wx}</b></span>
            <span class="chip-item">十神: <b style="color:var(--accent-gold);">${tenGodTitle || '日主'}</b></span>
            <span class="chip-item">体用: <b style="color:#63b3ed;">${tiYong}</b></span>
            ${pillarData.nayin ? `<span class="chip-item">纳音: ${pillarData.nayin}</span>` : ''}
            ${!isStem && targetObj.zodiac ? `<span class="chip-item">生肖: ${targetObj.zodiac}</span>` : ''}
          </div>
          ${hiddenDescHtml}
        </div>
      </div>

      <!-- 宫位与十神象义 -->
      <div class="modal-section-box">
        <div class="modal-section-title">✦ 宫位定位与十神取象</div>
        <div class="modal-text-grid">
          <div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:2px;">【${palaceInfo.title || pillarData.role}】</div>
            <div style="font-size:0.83rem;color:#cbd5e1;line-height:1.45;">${palaceInfo.desc || '宫位代表八字空间格局与外部关联。'}</div>
          </div>
          ${tenGodXiang.desc ? `
          <div style="margin-top:8px;">
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:2px;">【${tenGodTitle} · 意象】</div>
            <div style="font-size:0.83rem;color:#cbd5e1;line-height:1.45;">${tenGodXiang.desc}</div>
          </div>` : ''}
        </div>
      </div>

      <!-- 与其它干支的作用关系列表 -->
      <div class="modal-section-title" style="margin-top:16px;">
        <span>✦ 与其它干支动态作用关系 (${relatedList.length} 项)</span>
        <span style="font-size:0.75rem;color:var(--text-muted);font-weight:normal;">点击卡片右上角按钮可直接切换查看对方</span>
      </div>
      <div class="modal-rel-list">
        ${relCardsHtml}
      </div>
    `;

    // 绑定弹窗内跳转按钮
    modalContent.querySelectorAll('.modal-jump-btn').forEach(btn => {
      btn.onclick = () => {
        const nextPillar = btn.getAttribute('data-pillar');
        const nextLayer = btn.getAttribute('data-layer');
        if (onSwitchTarget) onSwitchTarget(nextPillar, nextLayer);
      };
    });

    // 6. 激活主图对应连线的高亮，弱化其它连线
    modal.highlightChartFocus(targetPillar, targetLayer);

    // 7. 展示弹窗
    modalBackdrop.style.display = 'flex';
  };

  /**
   * 关闭弹窗
   */
  modal.close = function () {
    const modalBackdrop = document.getElementById('relation-modal');
    if (modalBackdrop) {
      modalBackdrop.style.display = 'none';
    }
    // 恢复主图连线与节点状态
    document.querySelectorAll('.relation-path').forEach(p => {
      p.classList.remove('highlighted', 'dimmed');
    });
    document.querySelectorAll('.char-node').forEach(n => {
      n.classList.remove('highlighted');
    });
  };

  /**
   * 在主图上高亮当前焦点的字符及其连线
   */
  modal.highlightChartFocus = function (pillar, layer) {
    const focusId = `${pillar}_${layer}`;

    // 高亮字符卡片
    document.querySelectorAll('.char-node').forEach(node => {
      const p = node.getAttribute('data-pillar');
      const l = node.getAttribute('data-layer');
      if (p === pillar && l === layer) {
        node.classList.add('highlighted');
      } else {
        node.classList.remove('highlighted');
      }
    });

    // 高亮相关连线，淡化无关连线
    const paths = document.querySelectorAll('.relation-path');
    if (!currentContext || !currentContext.relations) return;

    paths.forEach(pathElem => {
      const relId = pathElem.getAttribute('data-rel-id');
      const rel = currentContext.relations.find(r => r.id === relId);
      if (rel && rel.members.some(m => m.pillar === pillar && m.layer === layer)) {
        pathElem.classList.add('highlighted');
        pathElem.classList.remove('dimmed');
      } else {
        pathElem.classList.remove('highlighted');
        pathElem.classList.add('dimmed');
      }
    });
  };

  MP.render.modal = modal;
  return modal;
}));
