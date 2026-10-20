/**
 * 盲派八字 - 主控制器与事件状态绑定
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('./ns');
    factory(MP);
    module.exports = MP.main;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const state = {
    inputStr: '甲子 丙寅 戊辰 庚申',
    gender: '男',
    birthYear: null,
    qiyunAge: 1,
    selectedDayunIdx: -1,
    selectedLiunianYear: null,
    userTiYongOverrides: {},
    filters: {
      '天干五合': true,
      '天干相冲': true,
      '地支六合': true,
      '地支三合局': true,
      '地支六冲': true,
      '地支六穿': true,
      '地支相刑': true,
      '地支六破': true,
      '干支自合': true,
      '通根透干': false, // 默认关闭跨柱透根连线，避免与主干支折线产生视觉混淆；可在下方过滤器随时一键开启
      anheMinLevel: 'B',
      filterPillar: '', // 按柱筛选: '' / 'all' | 'year' | 'month' | 'day' | 'hour' | 'dayun' | 'liunian'
      filterChar: ''    // 按干支字符筛选: '' / 'all' | 具体字符如 '甲', '子' 等
    },
    currentChart: null,
    currentDayunData: null,
    currentLiunianList: []
  };

  // DOM 元素缓存
  let elements = {};

  function initDOMElements() {
    elements = {
      textInput: document.getElementById('quick-input'),
      analyzeBtn: document.getElementById('btn-analyze'),
      replayBtn: document.getElementById('btn-replay'),
      errorBanner: document.getElementById('error-banner'),
      pillarsContainer: document.getElementById('pillars-container'),
      stageSvg: document.getElementById('stage-svg'),
      chartTooltip: document.getElementById('chart-tooltip'),
      wuxingSvgWrap: document.getElementById('wuxing-svg-wrap'),
      wuxingBars: document.getElementById('wuxing-bars'),
      wuxingCard: document.getElementById('wuxing-card'),
      btnToggleWuxing: document.getElementById('btn-toggle-wuxing'),
      mpPanel: document.getElementById('mp-panel-content'),
      detailTable: document.getElementById('detail-table-content'),
      dayunTimeline: document.getElementById('dayun-timeline'),
      liunianTimeline: document.getElementById('liunian-timeline'),
      birthYearSelect: document.getElementById('birth-year-select'),
      qiyunInput: document.getElementById('qiyun-input'),
      genderBtns: document.querySelectorAll('.gender-btn'),
      speedBtns: document.querySelectorAll('.speed-btn'),
      speedSelectMobile: document.getElementById('speed-select-mobile'),
      filterTray: document.getElementById('filter-tray'),
      // 下拉
      yearStem: document.getElementById('s-year-stem'),
      yearBranch: document.getElementById('s-year-branch'),
      monthStem: document.getElementById('s-month-stem'),
      monthBranch: document.getElementById('s-month-branch'),
      dayStem: document.getElementById('s-day-stem'),
      dayBranch: document.getElementById('s-day-branch'),
      hourStem: document.getElementById('s-hour-stem'),
      hourBranch: document.getElementById('s-hour-branch')
    };
  }

  /**
   * 填充 8 个干支下拉框选项
   */
  function populateSelects() {
    const fill = (select, items) => {
      select.innerHTML = '';
      items.forEach(it => {
        const opt = document.createElement('option');
        opt.value = it;
        opt.textContent = it;
        select.appendChild(opt);
      });
    };

    fill(elements.yearStem, MP.data.STEMS);
    fill(elements.monthStem, MP.data.STEMS);
    fill(elements.dayStem, MP.data.STEMS);
    fill(elements.hourStem, MP.data.STEMS);

    fill(elements.yearBranch, MP.data.BRANCHES);
    fill(elements.monthBranch, MP.data.BRANCHES);
    fill(elements.dayBranch, MP.data.BRANCHES);
    fill(elements.hourBranch, MP.data.BRANCHES);
  }

  /**
   * 同步下拉框至文本框
   */
  function syncSelectsToText() {
    const text = `${elements.yearStem.value}${elements.yearBranch.value} ` +
                 `${elements.monthStem.value}${elements.monthBranch.value} ` +
                 `${elements.dayStem.value}${elements.dayBranch.value} ` +
                 `${elements.hourStem.value}${elements.hourBranch.value}`;
    elements.textInput.value = text;
    state.inputStr = text;
  }

  /**
   * 同步文本框至下拉框
   */
  function syncTextToSelects(text) {
    const chars = text.replace(/[^\u4e00-\u9fa5]/g, '');
    if (chars.length >= 8) {
      elements.yearStem.value = chars[0];
      elements.yearBranch.value = chars[1];
      elements.monthStem.value = chars[2];
      elements.monthBranch.value = chars[3];
      elements.dayStem.value = chars[4];
      elements.dayBranch.value = chars[5];
      elements.hourStem.value = chars[6];
      elements.hourBranch.value = chars[7];
    }
  }

  /**
   * 保存当前状态到 URL Hash
   */
  function saveStateToHash() {
    try {
      const payload = {
        b: state.inputStr,
        g: state.gender,
        y: state.birthYear,
        q: state.qiyunAge,
        d: state.selectedDayunIdx,
        l: state.selectedLiunianYear
      };
      window.location.hash = encodeURIComponent(JSON.stringify(payload));
    } catch (e) {}
  }

  /**
   * 从 URL Hash 加载初始状态
   */
  function loadStateFromHash() {
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const payload = JSON.parse(decodeURIComponent(hash));
      if (payload.b) state.inputStr = payload.b;
      if (payload.g) state.gender = payload.g;
      if (payload.y) state.birthYear = payload.y;
      if (payload.q) state.qiyunAge = payload.q;
      if (typeof payload.d === 'number') state.selectedDayunIdx = payload.d;
      if (payload.l) state.selectedLiunianYear = payload.l;
    } catch (e) {}
  }

  /**
   * 执行排盘与全系统分析渲染
   */
  function runAnalyze() {
    const chart = MP.engine.core.parseChart(state.inputStr);
    if (!chart.valid) {
      elements.errorBanner.style.display = 'block';
      elements.errorBanner.innerHTML = `<strong>输入有误：</strong> ${chart.errors.join('；')}`;
      return;
    }

    elements.errorBanner.style.display = 'none';
    state.currentChart = chart;

    // 1. 出生年候选与大运计算
    const candidateYears = MP.engine.luck.getCandidateYears(chart.pillars.year.jiazi);
    if (!state.birthYear || candidateYears.indexOf(state.birthYear) === -1) {
      // 默认选择离当前年份最近且已发生的一个年份
      const now = new Date().getFullYear();
      let best = candidateYears[0] || 1984;
      candidateYears.forEach(y => {
        if (y <= now && y > best) best = y;
      });
      state.birthYear = best;
    }

    MP.render.luck.renderBirthYearOptions(elements.birthYearSelect, candidateYears, state.birthYear);

    // 计算大运
    const dayunData = MP.engine.luck.generateDayun(chart, state.gender, state.qiyunAge);
    state.currentDayunData = dayunData;

    // 选中的大运与流年对象构造
    let luckPillars = null;
    let selectedDayun = null;
    if (state.selectedDayunIdx >= 0 && state.selectedDayunIdx < dayunData.list.length) {
      selectedDayun = dayunData.list[state.selectedDayunIdx];
      luckPillars = luckPillars || {};
      luckPillars.dayun = selectedDayun;
    }

    // 计算流年列表
    let liunianList = [];
    if (selectedDayun && state.birthYear) {
      liunianList = MP.engine.luck.generateLiunian(state.birthYear, selectedDayun, chart.dayStem);
    }
    state.currentLiunianList = liunianList;

    let selectedLiunian = null;
    if (state.selectedLiunianYear && liunianList.length > 0) {
      selectedLiunian = liunianList.find(ln => ln.calendarYear === state.selectedLiunianYear);
      if (selectedLiunian) {
        luckPillars = luckPillars || {};
        luckPillars.liunian = selectedLiunian;
      }
    }

    // 2. 关系判定
    const relations = MP.engine.relations.analyzeRelations(chart, luckPillars, state.filters);

    // 3. 盲派深度分析
    const mpData = MP.engine.mangpai.analyze(chart, relations, luckPillars, state.userTiYongOverrides);

    // 4. 五行得分与生克计算
    const wxData = MP.engine.wuxing.calculate(chart, luckPillars);

    // 弹窗展示字符关系解析
    function showRelationModal(pKey, layer) {
      if (MP.render.modal && typeof MP.render.modal.open === 'function') {
        MP.render.modal.open(
          chart,
          luckPillars,
          relations,
          mpData,
          pKey,
          layer,
          (nextPillar, nextLayer) => {
            showRelationModal(nextPillar, nextLayer);
          }
        );
      }
    }

    // 5. 渲染柱节点
    const anchors = MP.render.pillars.render(
      elements.pillarsContainer,
      chart,
      luckPillars,
      mpData.tiYongMap,
      (tyKey) => {
        // 用户切换体用回调
        const cur = (state.userTiYongOverrides[tyKey] || (mpData.tiYongMap[tyKey] ? mpData.tiYongMap[tyKey].tiYong : '待定'));
        const nextMap = { '体': '用', '用': '待定', '待定': '体' };
        state.userTiYongOverrides[tyKey] = nextMap[cur] || '体';
        runAnalyze(); // 局部刷新
      },
      (pKey, layer, char) => {
        showRelationModal(pKey, layer);
      }
    );

    // 6. 渲染关系 SVG 弧线
    // 延迟一帧确保 DOM 布局与几何锚点就绪
    requestAnimationFrame(() => {
      const refreshedAnchors = MP.render.pillars.getNodeAnchors(elements.pillarsContainer);
      MP.render.relations.render(
        elements.stageSvg,
        relations,
        refreshedAnchors,
        state.filters,
        elements.chartTooltip
      );
    });

    // 7. 渲染五行生克五角星图
    MP.render.wuxing.render(elements.wuxingSvgWrap, elements.wuxingBars, wxData, elements.chartTooltip);

    // 8. 渲染盲派面板
    MP.render.panels.renderMangpaiPanel(elements.mpPanel, mpData);

    // 9. 渲染藏干详表
    MP.render.panels.renderDetailTable(elements.detailTable, chart, luckPillars, mpData.tiYongMap);

    // 10. 渲染大运时间轴
    MP.render.luck.renderDayun(elements.dayunTimeline, dayunData, state.selectedDayunIdx, (newIdx) => {
      state.selectedDayunIdx = newIdx;
      state.selectedLiunianYear = null; // 切换大运重置流年
      runAnalyze();
    });

    // 11. 渲染流年时间轴
    MP.render.luck.renderLiunian(elements.liunianTimeline, liunianList, state.selectedLiunianYear, (newYear) => {
      state.selectedLiunianYear = newYear;
      runAnalyze();
    });

    // 12. 渲染关系过滤器条 (包含目标柱位、目标干支下拉与分类过滤)
    if (elements.filterTray && MP.render.panels && typeof MP.render.panels.renderFilters === 'function') {
      MP.render.panels.renderFilters(
        elements.filterTray,
        state.filters,
        () => { runAnalyze(); },
        chart,
        luckPillars,
        relations
      );
    }

    saveStateToHash();
  }

  /**
   * 初始化应用
   */
  function init() {
    initDOMElements();
    populateSelects();
    loadStateFromHash();

    // 初始化控件值
    elements.textInput.value = state.inputStr;
    syncTextToSelects(state.inputStr);
    elements.qiyunInput.value = state.qiyunAge;

    // 性别按钮
    elements.genderBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-gender') === state.gender);
      btn.onclick = () => {
        elements.genderBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.gender = btn.getAttribute('data-gender');
        runAnalyze();
      };
    });

    // 动画速度控制 (桌面端按钮组与移动端下拉菜单联动)
    const updateSpeedSelection = (speed) => {
      elements.speedBtns.forEach(b => {
        b.classList.toggle('active', parseFloat(b.getAttribute('data-speed')) === speed);
      });
      if (elements.speedSelectMobile) {
        elements.speedSelectMobile.value = speed.toFixed(1);
      }
      MP.animator.setSpeed(speed);
      runAnalyze();
    };

    elements.speedBtns.forEach(btn => {
      btn.onclick = () => {
        const speed = parseFloat(btn.getAttribute('data-speed'));
        updateSpeedSelection(speed);
      };
    });

    if (elements.speedSelectMobile) {
      elements.speedSelectMobile.onchange = () => {
        const speed = parseFloat(elements.speedSelectMobile.value);
        updateSpeedSelection(speed);
      };
    }

    // 初始化默认速度 (1.0x 乘以 0.5 系数)
    MP.animator.setSpeed(1.0);

    // 绑定全局重播接口
    MP.animator.onReplay = runAnalyze;

    // 移动端五行力量卡片折叠/展开
    if (elements.btnToggleWuxing && elements.wuxingCard) {
      elements.btnToggleWuxing.onclick = () => {
        const isVisible = elements.wuxingCard.classList.toggle('mobile-visible');
        elements.btnToggleWuxing.classList.toggle('is-expanded', isVisible);
        elements.btnToggleWuxing.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
        const stateText = elements.btnToggleWuxing.querySelector('.toggle-state-text');
        if (stateText) {
          stateText.textContent = isVisible ? '收起' : '展开';
        }
      };
    }

    // 事件监听
    elements.analyzeBtn.onclick = () => {
      state.inputStr = elements.textInput.value;
      runAnalyze();
    };

    elements.replayBtn.onclick = () => {
      MP.animator.replay();
    };

    elements.textInput.oninput = () => {
      syncTextToSelects(elements.textInput.value);
    };

    elements.textInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        state.inputStr = elements.textInput.value;
        runAnalyze();
      }
    };

    // 8 个下拉联动
    [
      elements.yearStem, elements.yearBranch,
      elements.monthStem, elements.monthBranch,
      elements.dayStem, elements.dayBranch,
      elements.hourStem, elements.hourBranch
    ].forEach(sel => {
      sel.onchange = () => {
        syncSelectsToText();
        runAnalyze();
      };
    });

    // 出生年与起运岁
    elements.birthYearSelect.onchange = () => {
      state.birthYear = parseInt(elements.birthYearSelect.value, 10);
      runAnalyze();
    };

    elements.qiyunInput.onchange = () => {
      const val = parseInt(elements.qiyunInput.value, 10);
      state.qiyunAge = isNaN(val) || val < 1 ? 1 : val;
      elements.qiyunInput.value = state.qiyunAge;
      runAnalyze();
    };

    // 窗口尺寸变化与横竖屏切换自适应重算 (防抖且忽略移动端纯纵向滚屏触发的伪 resize)
    let resizeTimer = null;
    let lastWindowWidth = (typeof window !== 'undefined') ? window.innerWidth : 0;
    const handleScreenResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const currentWidth = (typeof window !== 'undefined') ? window.innerWidth : 0;
        // 移动端滚动时地址栏收起/展开仅改变 height，必须忽略无横向宽度变化的伪 resize，杜绝重绘死循环
        if (Math.abs(currentWidth - lastWindowWidth) > 8) {
          lastWindowWidth = currentWidth;
          if (state.currentChart) {
            runAnalyze();
          }
        }
      }, 150);
    };
    window.addEventListener('resize', handleScreenResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        lastWindowWidth = (typeof window !== 'undefined') ? window.innerWidth : 0;
        if (state.currentChart) runAnalyze();
      }, 200);
    });

    // 弹窗关闭事件绑定
    const modalBackdrop = document.getElementById('relation-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
      modalCloseBtn.onclick = () => {
        if (MP.render.modal) MP.render.modal.close();
      };
    }
    if (modalBackdrop) {
      modalBackdrop.onclick = (e) => {
        if (e.target === modalBackdrop && MP.render.modal) {
          MP.render.modal.close();
        }
      };
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && MP.render.modal) {
        MP.render.modal.close();
      }
    });

    // 运行初始排盘
    runAnalyze();
  }

  // 页面就绪后启动
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  MP.main = { init, runAnalyze, state };
  return MP.main;
}));
