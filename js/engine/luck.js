/**
 * 盲派八字 - 大运与流年计算引擎
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    require('../data');
    require('./core');
    factory(MP);
    module.exports = MP.engine.luck;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const data = MP.data;
  const core = MP.engine.core;
  const luckEngine = {};

  /**
   * 判断大运顺排还是逆排
   * @param {string} yearStem 年干
   * @param {string} gender 性别 ('男' | '女')
   * @returns {string} '顺' 或 '逆'
   */
  luckEngine.getDirection = function (yearStem, gender) {
    const isYang = (data.STEM_YY[yearStem] === '阳');
    const isMale = (gender === '男');
    if ((isYang && isMale) || (!isYang && !isMale)) {
      return '顺';
    } else {
      return '逆';
    }
  };

  /**
   * 根据年份计算天干地支
   * @param {number} year 公元年份 (例如 2026)
   * @returns {string} 干支 (例如 '丙午')
   */
  luckEngine.getYearGanzhi = function (year) {
    const offset = (year - 4) % 60;
    const idx = (offset + 60) % 60;
    return data.JIAZI[idx];
  };

  /**
   * 根据年柱列出 1900 - 2059 范围内的候选出生年份
   * @param {string} yearJiazi 年柱干支 (例如 '甲子')
   * @returns {Array} 候选年份列表
   */
  luckEngine.getCandidateYears = function (yearJiazi) {
    const targetIdx = data.JIAZI.indexOf(yearJiazi);
    if (targetIdx === -1) return [];

    const years = [];
    for (let y = 1900; y <= 2060; y++) {
      if (((y - 4) % 60 + 60) % 60 === targetIdx) {
        years.push(y);
      }
    }
    return years;
  };

  /**
   * 排出十步大运
   * @param {object} chart 解析后的八字图表对象
   * @param {string} gender '男' 或 '女'
   * @param {number} startAge 起运岁数 (默认1)
   * @returns {object} 大运排盘详情
   */
  luckEngine.generateDayun = function (chart, gender, startAge) {
    startAge = parseInt(startAge, 10);
    if (isNaN(startAge) || startAge < 1) startAge = 1;

    const yearStem = chart.pillars.year.stem.char;
    const monthJiazi = chart.pillars.month.jiazi;
    const monthIdx = data.JIAZI.indexOf(monthJiazi);
    const direction = luckEngine.getDirection(yearStem, gender);
    const dayStem = chart.dayStem;

    const step = (direction === '顺') ? 1 : -1;
    const dayunList = [];

    for (let i = 1; i <= 10; i++) {
      const idx = (monthIdx + i * step + 600) % 60;
      const jz = data.JIAZI[idx];
      const sChar = jz[0];
      const bChar = jz[1];
      const fromAge = startAge + (i - 1) * 10;
      const toAge = fromAge + 9;

      dayunList.push({
        stepIndex: i - 1,
        jiazi: jz,
        stem: sChar,
        branch: bChar,
        nayin: data.NAYIN[jz] || '',
        stemWx: data.STEM_WX[sChar],
        stemYy: data.STEM_YY[sChar],
        stemTenGod: core.getTenGod(dayStem, sChar),
        branchWx: data.BRANCH_WX[bChar],
        branchYy: data.BRANCH_YY[bChar],
        branchHidden: core.getHiddenStemsInfo(dayStem, bChar),
        ageRange: `${fromAge}-${toAge}岁`,
        fromAge: fromAge,
        toAge: toAge
      });
    }

    return {
      direction: direction,
      startAge: startAge,
      gender: gender,
      list: dayunList
    };
  };

  /**
   * 根据选中的大运与出生年生成对应 10 个流年
   * @param {number} birthYear 出生年份
   * @param {object} dayunStep 单步大运对象
   * @param {string} dayStem 日主天干
   * @returns {Array} 10个流年数据
   */
  luckEngine.generateLiunian = function (birthYear, dayunStep, dayStem) {
    const list = [];
    if (!birthYear || !dayunStep) return list;

    for (let age = dayunStep.fromAge; age <= dayunStep.toAge; age++) {
      // 传统虚岁：出生当年为1岁，故 calendarYear = birthYear + age - 1
      const calYear = birthYear + age - 1;
      const jz = luckEngine.getYearGanzhi(calYear);
      const sChar = jz[0];
      const bChar = jz[1];

      list.push({
        calendarYear: calYear,
        age: age,
        jiazi: jz,
        stem: sChar,
        branch: bChar,
        nayin: data.NAYIN[jz] || '',
        stemWx: data.STEM_WX[sChar],
        stemTenGod: core.getTenGod(dayStem, sChar),
        branchWx: data.BRANCH_WX[bChar],
        branchHidden: core.getHiddenStemsInfo(dayStem, bChar)
      });
    }

    return list;
  };

  MP.engine.luck = luckEngine;
  return luckEngine;
}));
