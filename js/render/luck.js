/**
 * 盲派八字 - 大运与流年时间轴视图渲染
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    factory(MP);
    module.exports = MP.render.luck;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const luckRender = {};

  /**
   * 渲染大运时间轴
   */
  luckRender.renderDayun = function (container, dayunData, selectedIndex, onSelectDayun) {
    container.innerHTML = '';

    dayunData.list.forEach((step, idx) => {
      const node = document.createElement('div');
      const isSelected = (selectedIndex === idx);
      node.className = `dayun-node ${isSelected ? 'active' : ''}`;
      node.innerHTML = `
        <span class="step-age">${step.ageRange}</span>
        <span class="step-jz">
          <span class="wx-${step.stemWx}" title="天干: ${step.stem} (${step.stemWx})">${step.stem}</span><span class="wx-${step.branchWx}" title="地支: ${step.branch} (${step.branchWx})">${step.branch}</span>
        </span>
        <span class="step-tengod">${step.stemTenGod}</span>
      `;

      node.onclick = () => {
        // 点击切换选中或取消
        const newIdx = (selectedIndex === idx) ? -1 : idx;
        if (onSelectDayun) onSelectDayun(newIdx);
      };

      container.appendChild(node);
    });
  };

  /**
   * 渲染流年时间轴
   */
  luckRender.renderLiunian = function (container, liunianList, selectedYear, onSelectLiunian) {
    container.innerHTML = '';

    if (!liunianList || liunianList.length === 0) {
      container.innerHTML = `<span style="color:var(--text-muted);font-size:0.85rem;padding:8px 4px;">请先点击上方某步「大运」并确保已选择「出生公元年」，即可在此展开对应的10个流年。</span>`;
      return;
    }

    liunianList.forEach(item => {
      const node = document.createElement('div');
      const isSelected = (selectedYear === item.calendarYear);
      node.className = `liunian-node ${isSelected ? 'active' : ''}`;
      node.innerHTML = `
        <span class="step-age">${item.calendarYear}年 (${item.age}岁)</span>
        <span class="step-jz">
          <span class="wx-${item.stemWx}" title="天干: ${item.stem} (${item.stemWx})">${item.stem}</span><span class="wx-${item.branchWx}" title="地支: ${item.branch} (${item.branchWx})">${item.branch}</span>
        </span>
        <span class="step-tengod">${item.stemTenGod}</span>
      `;

      node.onclick = () => {
        const newYear = (selectedYear === item.calendarYear) ? null : item.calendarYear;
        if (onSelectLiunian) onSelectLiunian(newYear);
      };

      container.appendChild(node);
    });
  };

  /**
   * 渲染出生年份候选下拉框
   */
  luckRender.renderBirthYearOptions = function (selectElem, candidateYears, selectedYear) {
    selectElem.innerHTML = '';
    candidateYears.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = `${y}年`;
      if (y === selectedYear) opt.selected = true;
      selectElem.appendChild(opt);
    });
  };

  MP.render.luck = luckRender;
  return luckRender;
}));
