/**
 * 盲派八字 - 盲派特色分析面板、详表与过滤器渲染
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    factory(MP);
    module.exports = MP.render.panels;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const panelsRender = {};

  /**
   * 渲染盲派做功与特色分析面板
   */
  panelsRender.renderMangpaiPanel = function (container, mpData) {
    container.innerHTML = '';

    // 1. 做功候选模块
    const gongSec = document.createElement('div');
    gongSec.innerHTML = `
      <div class="panel-card-title">
        <span>做功结构候选 <span class="badge-ref">智能参考</span></span>
        <span style="font-size:0.75rem;color:var(--text-secondary);">${mpData.gongCandidates.length} 条识别</span>
      </div>
    `;

    const gongList = document.createElement('div');
    gongList.className = 'mp-item-list';

    if (mpData.gongCandidates.length === 0) {
      gongList.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">原局主位未见明显主流合冲制功结构，多主清静或待运引动。</div>`;
    } else {
      mpData.gongCandidates.forEach(item => {
        const card = document.createElement('div');
        card.className = 'mp-card';
        card.innerHTML = `
          <div class="mp-card-title">
            <span style="color:var(--accent-gold);">${item.title}</span>
            <span class="badge-ref">${item.type}</span>
          </div>
          <div class="mp-card-desc">${item.reason}</div>
        `;
        gongList.appendChild(card);
      });
    }
    gongSec.appendChild(gongList);
    container.appendChild(gongSec);

    // 2. 废功/受损提示
    if (mpData.feiGongCandidates.length > 0) {
      const feiSec = document.createElement('div');
      feiSec.style.marginTop = '14px';
      feiSec.innerHTML = `
        <div class="panel-card-title" style="color:#ff7675;">
          <span>废功 / 损局提示 <span class="badge-ref">重点关注</span></span>
        </div>
      `;
      const feiList = document.createElement('div');
      feiList.className = 'mp-item-list';
      mpData.feiGongCandidates.forEach(item => {
        const card = document.createElement('div');
        card.className = 'mp-card';
        card.style.borderColor = 'rgba(231,76,60,0.4)';
        card.innerHTML = `
          <div class="mp-card-title">
            <span style="color:#ff7675;">${item.title}</span>
          </div>
          <div class="mp-card-desc">${item.reason}</div>
        `;
        feiList.appendChild(card);
      });
      feiSec.appendChild(feiList);
      container.appendChild(feiSec);
    }

    // 3. 墓库状态 (辰戌丑未)
    if (mpData.tombList.length > 0) {
      const tombSec = document.createElement('div');
      tombSec.style.marginTop = '14px';
      tombSec.innerHTML = `<div class="panel-card-title">辰戌丑未 · 墓库状态</div>`;
      const tombList = document.createElement('div');
      tombList.className = 'mp-item-list';

      mpData.tombList.forEach(t => {
        const card = document.createElement('div');
        card.className = 'mp-card';
        card.innerHTML = `
          <div class="mp-card-title">
            <span>${t.role}地支「${t.branch}」(${t.tombDesc})</span>
            <span class="badge ${t.statusBadge === 'open' ? 'badge-host' : 'badge-guest'}">${t.statusBadge === 'open' ? '库门开' : '锁闭'}</span>
          </div>
          <div class="mp-card-desc">${t.status}</div>
        `;
        tombList.appendChild(card);
      });
      tombSec.appendChild(tombList);
      container.appendChild(tombSec);
    }

    // 4. 禄刃与虚实
    const luSec = document.createElement('div');
    luSec.style.marginTop = '14px';
    luSec.innerHTML = `<div class="panel-card-title">禄神 · 羊刃 · 虚实</div>`;
    const luContent = document.createElement('div');
    luContent.className = 'mp-item-list';

    if (mpData.luLocations.length > 0) {
      mpData.luLocations.forEach(l => {
        const card = document.createElement('div');
        card.className = 'mp-card';
        card.innerHTML = `
          <div class="mp-card-title">
            <span style="color:var(--accent-gold);">日禄归于 ${l.role} [${l.char}] (${l.typeName})</span>
            <span class="badge ${l.status.indexOf('破') !== -1 ? 'badge-guest' : 'badge-host'}">${l.status}</span>
          </div>
          <div class="mp-card-desc">盲派视禄为自身形体与俸禄，宜静宜聚，最怕冲穿破败。</div>
        `;
        luContent.appendChild(card);
      });
    }

    if (mpData.xuShiList.length > 0) {
      mpData.xuShiList.forEach(x => {
        const card = document.createElement('div');
        card.className = 'mp-card';
        card.innerHTML = `
          <div class="mp-card-title">
            <span>${x.role}天干 [${x.char}] (${x.tenGod})</span>
            <span class="badge ${x.state.indexOf('虚') !== -1 ? 'badge-guest' : 'badge-host'}">${x.state}</span>
          </div>
          <div class="mp-card-desc">${x.desc}</div>
        `;
        luContent.appendChild(card);
      });
    }

    luSec.appendChild(luContent);
    container.appendChild(luSec);
  };

  /**
   * 渲染藏干与十神详表
   */
  panelsRender.renderDetailTable = function (container, chart, luckPillars, tiYongMap) {
    container.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'styled-table';

    table.innerHTML = `
      <thead>
        <tr>
          <th>柱位</th>
          <th>宫位宾主</th>
          <th>天干</th>
          <th>干十神</th>
          <th>干体用</th>
          <th>地支</th>
          <th>藏干明细 (本/中/余)</th>
          <th>支体用</th>
          <th>纳音</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    const rows = [
      { key: 'year', p: chart.pillars.year },
      { key: 'month', p: chart.pillars.month },
      { key: 'day', p: chart.pillars.day },
      { key: 'hour', p: chart.pillars.hour }
    ];

    if (luckPillars && luckPillars.dayun) {
      rows.push({
        key: 'dayun',
        p: {
          role: '大运',
          domain: '宾位(外来)',
          nayin: luckPillars.dayun.nayin || '',
          stem: {
            char: luckPillars.dayun.stem,
            wx: MP.data.STEM_WX[luckPillars.dayun.stem],
            tenGod: luckPillars.dayun.stemTenGod
          },
          branch: {
            char: luckPillars.dayun.branch,
            wx: MP.data.BRANCH_WX[luckPillars.dayun.branch],
            hidden: MP.engine.core.getHiddenStemsInfo(chart.dayStem, luckPillars.dayun.branch)
          }
        }
      });
    }

    if (luckPillars && luckPillars.liunian) {
      rows.push({
        key: 'liunian',
        p: {
          role: '流年',
          domain: '宾位(外来)',
          nayin: luckPillars.liunian.nayin || '',
          stem: {
            char: luckPillars.liunian.stem,
            wx: MP.data.STEM_WX[luckPillars.liunian.stem],
            tenGod: luckPillars.liunian.stemTenGod
          },
          branch: {
            char: luckPillars.liunian.branch,
            wx: MP.data.BRANCH_WX[luckPillars.liunian.branch],
            hidden: MP.engine.core.getHiddenStemsInfo(chart.dayStem, luckPillars.liunian.branch)
          }
        }
      });
    }

    rows.forEach(r => {
      const p = r.p;
      const stemTy = (tiYongMap && tiYongMap[`${r.key}_stem`]) ? tiYongMap[`${r.key}_stem`].tiYong : '-';
      const branchTy = (tiYongMap && tiYongMap[`${r.key}_branch`]) ? tiYongMap[`${r.key}_branch`].tiYong : '-';

      const hiddenStrs = (p.branch.hidden || []).map(h =>
        `<span class="wx-${h.wx}">${h.stem}</span>(${h.type}:${h.tenGod})`
      ).join('、');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${p.role}</b></td>
        <td><span class="badge ${p.domain.indexOf('主') !== -1 ? 'badge-host' : 'badge-guest'}">${p.domain}</span></td>
        <td class="wx-${p.stem.wx}"><b>${p.stem.char}</b></td>
        <td>${p.stem.tenGod || '日主'}</td>
        <td><span class="badge-ref">${stemTy}</span></td>
        <td class="wx-${p.branch.wx}"><b>${p.branch.char}</b></td>
        <td>${hiddenStrs}</td>
        <td><span class="badge-ref">${branchTy}</span></td>
        <td style="color:var(--text-muted);">${p.nayin || '-'}</td>
      `;
      tbody.appendChild(tr);
    });

    container.appendChild(table);
  };

  /**
   * 渲染关系过滤工具条 (包含柱位下拉、干支下拉、暗合级别与分类标签)
   */
  panelsRender.renderFilters = function (container, currentFilters, onFilterChange, chart, luckPillars, relations) {
    container.innerHTML = '';
    currentFilters = currentFilters || {};

    // 1. 控制行 (柱位下拉、干支下拉、暗合级别、重置与统计)
    const controlsRow = document.createElement('div');
    controlsRow.className = 'filter-controls-row';

    // 标头
    const titleSpan = document.createElement('span');
    titleSpan.className = 'filter-main-title';
    titleSpan.textContent = '✦ 关系过滤:';
    controlsRow.appendChild(titleSpan);

    // --- 柱位筛选下拉框 ---
    const pillarItem = document.createElement('div');
    pillarItem.className = 'filter-select-item';
    const pillarLabel = document.createElement('span');
    pillarLabel.className = 'filter-sublabel';
    pillarLabel.textContent = '目标柱位:';
    pillarItem.appendChild(pillarLabel);

    const pillarSelect = document.createElement('select');
    pillarSelect.id = 'filter-pillar-select';
    pillarSelect.className = 'select-std filter-dropdown';
    pillarSelect.setAttribute('aria-label', '按柱位筛选关系');

    const pillarOptions = [
      { value: '', label: '全部柱位 (不限)' },
      { value: 'year', label: '年柱 (Year)' },
      { value: 'month', label: '月柱 (Month)' },
      { value: 'day', label: '日柱 (Day·日主)' },
      { value: 'hour', label: '时柱 (Hour)' }
    ];
    if (luckPillars && luckPillars.dayun) {
      pillarOptions.push({ value: 'dayun', label: `大运 (${luckPillars.dayun.jiazi || luckPillars.dayun.stepAge})` });
    }
    if (luckPillars && luckPillars.liunian) {
      pillarOptions.push({ value: 'liunian', label: `流年 (${luckPillars.liunian.calendarYear} ${luckPillars.liunian.jiazi})` });
    }

    const curPillar = currentFilters.filterPillar || '';
    pillarOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (curPillar === opt.value) o.selected = true;
      pillarSelect.appendChild(o);
    });

    pillarSelect.onchange = () => {
      currentFilters.filterPillar = pillarSelect.value;
      if (onFilterChange) onFilterChange(currentFilters);
    };
    pillarItem.appendChild(pillarSelect);
    controlsRow.appendChild(pillarItem);

    // --- 干支筛选下拉框 ---
    const charItem = document.createElement('div');
    charItem.className = 'filter-select-item';
    const charLabel = document.createElement('span');
    charLabel.className = 'filter-sublabel';
    charLabel.textContent = '目标干支:';
    charItem.appendChild(charLabel);

    const charSelect = document.createElement('select');
    charSelect.id = 'filter-char-select';
    charSelect.className = 'select-std filter-dropdown';
    charSelect.setAttribute('aria-label', '按干支字符筛选关系');

    const curChar = currentFilters.filterChar || '';
    const allCharOpt = document.createElement('option');
    allCharOpt.value = '';
    allCharOpt.textContent = '全部干支 (不限)';
    if (!curChar) allCharOpt.selected = true;
    charSelect.appendChild(allCharOpt);

    // 收集盘中当前激活的字符
    const chartChars = [];
    if (chart && chart.pillars) {
      ['year', 'month', 'day', 'hour'].forEach(k => {
        const p = chart.pillars[k];
        const role = p.role || k;
        if (p && p.stem && p.stem.char) {
          chartChars.push({ char: p.stem.char, label: `${p.stem.char} (${role}干${k === 'day' ? '/日主' : ''})` });
        }
        if (p && p.branch && p.branch.char) {
          chartChars.push({ char: p.branch.char, label: `${p.branch.char} (${role}支${k === 'day' ? '/配偶宫' : ''})` });
        }
      });
    }
    if (luckPillars && luckPillars.dayun) {
      if (luckPillars.dayun.stem) chartChars.push({ char: luckPillars.dayun.stem, label: `${luckPillars.dayun.stem} (大运干)` });
      if (luckPillars.dayun.branch) chartChars.push({ char: luckPillars.dayun.branch, label: `${luckPillars.dayun.branch} (大运支)` });
    }
    if (luckPillars && luckPillars.liunian) {
      if (luckPillars.liunian.stem) chartChars.push({ char: luckPillars.liunian.stem, label: `${luckPillars.liunian.stem} (流年干)` });
      if (luckPillars.liunian.branch) chartChars.push({ char: luckPillars.liunian.branch, label: `${luckPillars.liunian.branch} (流年支)` });
    }

    if (chartChars.length > 0) {
      const curGroup = document.createElement('optgroup');
      curGroup.label = '── 盘中干支 ──';
      chartChars.forEach(item => {
        const o = document.createElement('option');
        o.value = item.char;
        o.textContent = item.label;
        if (curChar === item.char) o.selected = true;
        curGroup.appendChild(o);
      });
      charSelect.appendChild(curGroup);
    }

    // 10 天干
    const stemGroup = document.createElement('optgroup');
    stemGroup.label = '── 十天干 ──';
    (MP.data.STEMS || ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']).forEach(s => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = `${s} (天干)`;
      if (curChar === s) o.selected = true;
      stemGroup.appendChild(o);
    });
    charSelect.appendChild(stemGroup);

    // 12 地支
    const branchGroup = document.createElement('optgroup');
    branchGroup.label = '── 十二地支 ──';
    (MP.data.BRANCHES || ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']).forEach(b => {
      const o = document.createElement('option');
      o.value = b;
      o.textContent = `${b} (地支)`;
      if (curChar === b) o.selected = true;
      branchGroup.appendChild(o);
    });
    charSelect.appendChild(branchGroup);

    charSelect.onchange = () => {
      currentFilters.filterChar = charSelect.value;
      if (onFilterChange) onFilterChange(currentFilters);
    };
    charItem.appendChild(charSelect);
    controlsRow.appendChild(charItem);

    // --- 暗合等级切换 ---
    const anheWrap = document.createElement('div');
    anheWrap.className = 'filter-select-item';
    const curLevel = currentFilters.anheMinLevel || 'B';
    anheWrap.innerHTML = `
      <span class="filter-sublabel">暗合级别:</span>
      <select class="select-std filter-dropdown" aria-label="暗合级别筛选">
        <option value="A" ${curLevel === 'A' ? 'selected' : ''}>仅主暗合 (A级)</option>
        <option value="B" ${curLevel === 'B' ? 'selected' : ''}>主+次暗合 (A+B级)</option>
        <option value="C" ${curLevel === 'C' ? 'selected' : ''}>全部暗合 (含C弱级)</option>
      </select>
    `;
    const anheSelect = anheWrap.querySelector('select');
    anheSelect.onchange = () => {
      currentFilters.anheMinLevel = anheSelect.value;
      if (onFilterChange) onFilterChange(currentFilters);
    };
    controlsRow.appendChild(anheWrap);

    // --- 重置按钮 ---
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn-sm filter-reset-btn';
    resetBtn.innerHTML = '<span>🔄 重置</span>';
    resetBtn.title = '重置所有柱位、干支与关系分类筛选';
    resetBtn.onclick = () => {
      currentFilters.filterPillar = '';
      currentFilters.filterChar = '';
      currentFilters.anheMinLevel = 'B';
      [
        '天干五合', '天干相冲', '天干相克',
        '地支六合', '地支三合局', '地支三会局', '地支六冲',
        '地支六穿', '地支相刑', '地支六破', '干支自合'
      ].forEach(k => { currentFilters[k] = true; });
      currentFilters['通根透干'] = false;
      if (onFilterChange) onFilterChange(currentFilters);
    };
    controlsRow.appendChild(resetBtn);

    // --- 连线统计徽章 ---
    if (Array.isArray(relations)) {
      const visibleCount = relations.filter(r => {
        if (currentFilters[r.kind] === false) return false;
        if (r.kind === '地支暗合') {
          const minLvl = currentFilters.anheMinLevel || 'B';
          const order = { A: 1, B: 2, C: 3 };
          if (order[r.level] > order[minLvl]) return false;
        }
        if (currentFilters.filterPillar && currentFilters.filterPillar !== 'all' && currentFilters.filterPillar !== '') {
          const targetP = currentFilters.filterPillar;
          if (!r.members || !r.members.some(m => m.pillar === targetP || m.role === targetP)) return false;
        }
        if (currentFilters.filterChar && currentFilters.filterChar !== 'all' && currentFilters.filterChar !== '') {
          const targetC = currentFilters.filterChar;
          if (!r.members || !r.members.some(m => m.char === targetC)) return false;
        }
        return true;
      }).length;

      const badge = document.createElement('span');
      badge.className = 'filter-count-badge';
      badge.textContent = `连线: ${visibleCount} / ${relations.length} 条`;
      controlsRow.appendChild(badge);
    }

    container.appendChild(controlsRow);

    // 2. 关系类型标签行
    const chipsRow = document.createElement('div');
    chipsRow.className = 'filter-chips-row';

    const filterDefs = [
      { key: '天干五合', label: '天干五合' },
      { key: '天干相冲', label: '天干相冲' },
      { key: '天干相克', label: '天干相克' },
      { key: '地支六合', label: '地支六合' },
      { key: '地支三合局', label: '三合/半合' },
      { key: '地支三会局', label: '三会方' },
      { key: '地支六冲', label: '地支六冲' },
      { key: '地支六穿', label: '地支六穿(害)' },
      { key: '地支相刑', label: '地支相刑' },
      { key: '地支六破', label: '地支六破' },
      { key: '干支自合', label: '干支天地自合' },
      { key: '通根透干', label: '通根透干' }
    ];

    filterDefs.forEach(f => {
      const chip = document.createElement('div');
      const isActive = currentFilters[f.key] !== false;
      chip.className = `filter-chip ${isActive ? 'active' : ''}`;
      chip.textContent = f.label;
      chip.onclick = () => {
        currentFilters[f.key] = !isActive;
        chip.classList.toggle('active', currentFilters[f.key]);
        if (onFilterChange) onFilterChange(currentFilters);
      };
      chipsRow.appendChild(chip);
    });

    container.appendChild(chipsRow);
  };

  MP.render.panels = panelsRender;
  return panelsRender;
}));
