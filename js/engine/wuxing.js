/**
 * 盲派八字 - 五行力量统计与生克引擎
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    require('../data');
    factory(MP);
    module.exports = MP.engine.wuxing;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const data = MP.data;
  const wxEngine = {};

  /**
   * 统计八字五行得分与生克关系
   * @param {object} chart 解析后的八字图表对象
   * @param {object} luckPillars 可选大运流年
   * @returns {object} 五行得分、百分比及活动生克链
   */
  wxEngine.calculate = function (chart, luckPillars) {
    const rawScores = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    const details = { 木: [], 火: [], 土: [], 金: [], 水: [] };

    const activePillars = ['year', 'month', 'day', 'hour'];
    const monthBranch = chart.pillars.month ? chart.pillars.month.branch.char : '';

    // 遍历天干
    activePillars.forEach(k => {
      const p = chart.pillars[k];
      const stemChar = p.stem.char;
      const wx = data.STEM_WX[stemChar];
      rawScores[wx] += 1.0;
      details[wx].push({
        source: `${p.role}天干[${stemChar}]`,
        val: 1.0
      });
    });

    // 遍历地支藏干
    activePillars.forEach(k => {
      const p = chart.pillars[k];
      const bChar = p.branch.char;
      const isMonth = (k === 'month');
      const monthMultiplier = isMonth ? 1.5 : 1.0;

      const hiddenList = data.HIDDEN[bChar] || [];
      const weights = data.HIDDEN_WEIGHT;

      hiddenList.forEach((hStem, idx) => {
        const wx = data.STEM_WX[hStem];
        const baseW = weights[idx] || 0.3;
        const finalW = parseFloat((baseW * monthMultiplier).toFixed(2));
        rawScores[wx] += finalW;
        details[wx].push({
          source: `${p.role}地支[${bChar}]${data.HIDDEN_TYPE[idx]}[${hStem}]${isMonth ? '(月令加权1.5)' : ''}`,
          val: finalW
        });
      });
    });

    // 如果包含大运/流年，加入外来五行
    if (luckPillars && luckPillars.dayun) {
      const ds = luckPillars.dayun.stem;
      const db = luckPillars.dayun.branch;
      if (ds) {
        const wx = data.STEM_WX[ds];
        rawScores[wx] += 0.8;
        details[wx].push({ source: `大运天干[${ds}]`, val: 0.8 });
      }
      if (db) {
        (data.HIDDEN[db] || []).forEach((h, idx) => {
          const wx = data.STEM_WX[h];
          const val = parseFloat(((data.HIDDEN_WEIGHT[idx] || 0.3) * 0.8).toFixed(2));
          rawScores[wx] += val;
          details[wx].push({ source: `大运地支[${db}]${data.HIDDEN_TYPE[idx]}[${h}]`, val });
        });
      }
    }

    if (luckPillars && luckPillars.liunian) {
      const ls = luckPillars.liunian.stem;
      const lb = luckPillars.liunian.branch;
      if (ls) {
        const wx = data.STEM_WX[ls];
        rawScores[wx] += 0.6;
        details[wx].push({ source: `流年天干[${ls}]`, val: 0.6 });
      }
      if (lb) {
        (data.HIDDEN[lb] || []).forEach((h, idx) => {
          const wx = data.STEM_WX[h];
          const val = parseFloat(((data.HIDDEN_WEIGHT[idx] || 0.3) * 0.6).toFixed(2));
          rawScores[wx] += val;
          details[wx].push({ source: `流年地支[${lb}]${data.HIDDEN_TYPE[idx]}[${h}]`, val });
        });
      }
    }

    // 计算总分与百分比
    let total = 0;
    data.WUXING_ORDER.forEach(wx => {
      rawScores[wx] = parseFloat(rawScores[wx].toFixed(1));
      total += rawScores[wx];
    });

    const percentages = {};
    data.WUXING_ORDER.forEach(wx => {
      percentages[wx] = total > 0 ? Math.round((rawScores[wx] / total) * 100) : 0;
    });

    // 日主属性
    const dayWx = data.STEM_WX[chart.dayStem];

    // 生克链关系
    const shengLinks = [];
    const keLinks = [];

    data.WUXING_ORDER.forEach(wx => {
      const targetSheng = data.WUXING_SHENG[wx];
      const targetKe = data.WUXING_KE[wx];

      shengLinks.push({
        from: wx,
        to: targetSheng,
        active: rawScores[wx] > 0 && rawScores[targetSheng] > 0,
        fromScore: rawScores[wx],
        toScore: rawScores[targetSheng]
      });

      keLinks.push({
        from: wx,
        to: targetKe,
        active: rawScores[wx] > 0 && rawScores[targetKe] > 0,
        fromScore: rawScores[wx],
        toScore: rawScores[targetKe]
      });
    });

    // 排序强弱
    const sorted = [...data.WUXING_ORDER].sort((a, b) => rawScores[b] - rawScores[a]);

    return {
      scores: rawScores,
      percentages: percentages,
      details: details,
      total: parseFloat(total.toFixed(1)),
      dayWx: dayWx,
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
      ranking: sorted,
      shengLinks: shengLinks,
      keLinks: keLinks
    };
  };

  MP.engine.wuxing = wxEngine;
  return wxEngine;
}));
