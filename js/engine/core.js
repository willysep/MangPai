/**
 * 盲派八字 - 核心解析与十神计算引擎
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    require('../data');
    factory(MP);
    module.exports = MP.engine.core;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const data = MP.data;
  const core = {};

  /**
   * 检验干支搭配是否合法 (属于六十甲子)
   */
  core.isValidJiazi = function (stem, branch) {
    return data.JIAZI.indexOf(stem + branch) !== -1;
  };

  /**
   * 计算目标天干相对于日干的十神
   * @param {string} dayStem 日元天干
   * @param {string} targetStem 目标天干
   * @returns {string} 十神名称 (如 '正官', '食神')
   */
  core.getTenGod = function (dayStem, targetStem) {
    if (!dayStem || !targetStem) return '';
    const dayWx = data.STEM_WX[dayStem];
    const targetWx = data.STEM_WX[targetStem];
    const dayYy = data.STEM_YY[dayStem];
    const targetYy = data.STEM_YY[targetStem];
    const isSameYy = (dayYy === targetYy);

    const order = data.WUXING_ORDER; // ['木','火','土','金','水']
    const dayIdx = order.indexOf(dayWx);
    const targetIdx = order.indexOf(targetWx);
    const diff = (targetIdx - dayIdx + 5) % 5;

    // diff: 0=同我(比劫), 1=我生(食伤), 2=我克(才财), 3=克我(杀官), 4=生我(枭印)
    switch (diff) {
      case 0:
        return isSameYy ? '比肩' : '劫财';
      case 1:
        return isSameYy ? '食神' : '伤官';
      case 2:
        return isSameYy ? '偏财' : '正财';
      case 3:
        return isSameYy ? '七杀' : '正官';
      case 4:
        return isSameYy ? '偏印' : '正印';
      default:
        return '';
    }
  };

  /**
   * 获取某地支中所有藏干及其详细属性 (包括相对于日干的十神)
   */
  core.getHiddenStemsInfo = function (dayStem, branch) {
    if (!branch || !data.HIDDEN[branch]) return [];
    const list = data.HIDDEN[branch];
    const weights = data.HIDDEN_WEIGHT;
    return list.map((st, idx) => {
      return {
        stem: st,
        type: data.HIDDEN_TYPE[idx] || '余气',
        weight: weights[idx] || 0.3,
        wx: data.STEM_WX[st],
        yy: data.STEM_YY[st],
        tenGod: core.getTenGod(dayStem, st)
      };
    });
  };

  /**
   * 解析并规范化八字输入
   * @param {string|object} input 字符串 (如 "甲子 丙寅 戊辰 庚申") 或 对象 {year, month, day, hour}
   * @returns {object} 解析结果 Chart
   */
  core.parseChart = function (input) {
    let yearStr = '', monthStr = '', dayStr = '', hourStr = '';

    if (typeof input === 'string') {
      // 提取所有中文字符
      const chars = input.replace(/[^\u4e00-\u9fa5]/g, '');
      if (chars.length >= 8) {
        yearStr = chars.slice(0, 2);
        monthStr = chars.slice(2, 4);
        dayStr = chars.slice(4, 6);
        hourStr = chars.slice(6, 8);
      } else {
        const parts = input.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 4) {
          yearStr = parts[0];
          monthStr = parts[1];
          dayStr = parts[2];
          hourStr = parts[3];
        }
      }
    } else if (input && typeof input === 'object') {
      const getPair = (p) => {
        if (!p) return '';
        if (typeof p === 'string') return p;
        if (p.stem && p.branch) return p.stem + p.branch;
        return '';
      };
      yearStr = getPair(input.year);
      monthStr = getPair(input.month);
      dayStr = getPair(input.day);
      hourStr = getPair(input.hour);
    }

    const errors = [];
    const validatePillar = (pair, name) => {
      if (!pair || pair.length < 2) {
        errors.push(`${name}输入不完整`);
        return { stem: '', branch: '', jiazi: '', valid: false };
      }
      const stem = pair[0];
      const branch = pair[1];
      if (data.STEMS.indexOf(stem) === -1) {
        errors.push(`${name}天干「${stem}」不属于十天干`);
      }
      if (data.BRANCHES.indexOf(branch) === -1) {
        errors.push(`${name}地支「${branch}」不属于十二地支`);
      }
      if (!core.isValidJiazi(stem, branch)) {
        errors.push(`${name}组合「${pair}」不符合六十甲子配合（阴阳不调）`);
        return { stem, branch, jiazi: pair, valid: false };
      }
      return { stem, branch, jiazi: pair, valid: true };
    };

    const y = validatePillar(yearStr, '年柱');
    const m = validatePillar(monthStr, '月柱');
    const d = validatePillar(dayStr, '日柱');
    const h = validatePillar(hourStr, '时柱');

    if (errors.length > 0) {
      return {
        valid: false,
        errors: errors,
        raw: { year: yearStr, month: monthStr, day: dayStr, hour: hourStr }
      };
    }

    const dayStem = d.stem;
    const dayBranch = d.branch;

    const buildPillarDetail = (p, role, palaceName, domain) => {
      const stem = p.stem;
      const branch = p.branch;
      const jiazi = stem + branch;
      return {
        role: role,
        name: palaceName,
        domain: domain,
        jiazi: jiazi,
        nayin: data.NAYIN[jiazi] || '',
        stem: {
          char: stem,
          wx: data.STEM_WX[stem],
          yy: data.STEM_YY[stem],
          tenGod: (role === '日柱') ? '日主' : core.getTenGod(dayStem, stem)
        },
        branch: {
          char: branch,
          wx: data.BRANCH_WX[branch],
          yy: data.BRANCH_YY[branch],
          zodiac: data.BRANCH_ZODIAC[branch],
          hidden: core.getHiddenStemsInfo(dayStem, branch)
        }
      };
    };

    const pillars = {
      year: buildPillarDetail(y, '年柱', '年柱', '宾位'),
      month: buildPillarDetail(m, '月柱', '月柱', '宾位'),
      day: buildPillarDetail(d, '日柱', '日柱', '主位'),
      hour: buildPillarDetail(h, '时柱', '时柱', '主位')
    };

    return {
      valid: true,
      dayStem: dayStem,
      dayBranch: dayBranch,
      pillars: pillars,
      order: ['year', 'month', 'day', 'hour'],
      text: `${y.jiazi} ${m.jiazi} ${d.jiazi} ${h.jiazi}`
    };
  };

  MP.engine.core = core;
  return core;
}));
