/**
 * 盲派八字引擎自动化测试套件
 */
const MP = require('../js/ns');
require('../js/data');
require('../js/engine/core');
require('../js/engine/relations');
require('../js/engine/wuxing');
require('../js/engine/mangpai');
require('../js/engine/luck');

function runAllTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${message}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual === expected) {
      passed++;
      console.log(`  ✓ ${message}: ${actual}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${message} -> 预期「${expected}」, 实际「${actual}」`);
    }
  }

  console.log('=== [1] 测试十神算法 (10x10 典型组合验证) ===');
  const core = MP.engine.core;
  assertEqual(core.getTenGod('甲', '甲'), '比肩', '甲见甲');
  assertEqual(core.getTenGod('甲', '乙'), '劫财', '甲见乙');
  assertEqual(core.getTenGod('甲', '丙'), '食神', '甲见丙');
  assertEqual(core.getTenGod('甲', '丁'), '伤官', '甲见丁');
  assertEqual(core.getTenGod('甲', '戊'), '偏财', '甲见戊');
  assertEqual(core.getTenGod('甲', '己'), '正财', '甲见己');
  assertEqual(core.getTenGod('甲', '庚'), '七杀', '甲见庚');
  assertEqual(core.getTenGod('甲', '辛'), '正官', '甲见辛');
  assertEqual(core.getTenGod('甲', '壬'), '偏印', '甲见壬');
  assertEqual(core.getTenGod('甲', '癸'), '正印', '甲见癸');

  assertEqual(core.getTenGod('辛', '丙'), '正官', '辛见丙');
  assertEqual(core.getTenGod('辛', '丁'), '七杀', '辛见丁');
  assertEqual(core.getTenGod('辛', '甲'), '正财', '辛见甲');
  assertEqual(core.getTenGod('辛', '乙'), '偏财', '辛见乙');
  assertEqual(core.getTenGod('辛', '戊'), '正印', '辛见戊');
  assertEqual(core.getTenGod('辛', '己'), '偏印', '辛见己');
  assertEqual(core.getTenGod('辛', '壬'), '伤官', '辛见壬');
  assertEqual(core.getTenGod('辛', '癸'), '食神', '辛见癸');

  console.log('\n=== [2] 六十甲子合法性检验 ===');
  assert(core.isValidJiazi('甲', '子'), '甲子合法');
  assert(!core.isValidJiazi('甲', '丑'), '甲丑非法 (阳干配阴支)');
  assert(core.isValidJiazi('乙', '丑'), '乙丑合法');
  assert(!core.isValidJiazi('乙', '子'), '乙子非法 (阴干配阳支)');
  assert(core.isValidJiazi('癸', '亥'), '癸亥合法');

  console.log('\n=== [3] 地支藏干与暗合分级表验证 ===');
  const hiddenChen = MP.data.HIDDEN['辰'];
  assertEqual(hiddenChen.join(''), '戊乙癸', '辰中藏干戊乙癸');
  const anheList = MP.data.ANHE_LIST;
  assert(anheList.length >= 25, `暗合配对数满足统计要求 (${anheList.length}对)`);
  
  const yinChou = anheList.find(item => (item.b1 === '丑' && item.b2 === '寅') || (item.b1 === '寅' && item.b2 === '丑'));
  assert(yinChou && yinChou.topLevel === 'A', '寅丑暗合判定为 A 级 (本本合 甲己)');
  const maoShen = anheList.find(item => (item.b1 === '卯' && item.b2 === '申') || (item.b1 === '申' && item.b2 === '卯'));
  assert(针 = ( Shen = maoShen && maoShen.topLevel === 'A' ), '卯申暗合判定为 A 级 (本本合 乙庚)');
  const wuHai = anheList.find(item => (item.b1 === '午' && item.b2 === '亥') || (item.b1 === '亥' && item.b2 === '午'));
  assert(wuHai && wuHai.topLevel === 'A', '午亥暗合判定为 A 级 (本本合 丁壬)');

  console.log('\n=== [4] 八字图表解析与关系引擎 (综合例 1: 申子辰全 + 寅申冲) ===');
  const chart1 = core.parseChart('甲子 丙寅 戊辰 庚申');
  assert(chart1.valid, '甲子 丙寅 戊辰 庚申 解析成功');
  assertEqual(chart1.dayStem, '戊', '日元戊土');
  assertEqual(chart1.dayBranch, '辰', '日支辰土');

  const relEngine = MP.engine.relations;
  const rels1 = relEngine.analyzeRelations(chart1);
  assert(rels1.some(r => r.kind === '地支三合局' && r.name.indexOf('申子辰') !== -1), '识别申子辰三合水局');
  assert(rels1.some(r => r.kind === '地支六冲' && r.name.indexOf('寅申') !== -1), '识别寅申相冲');
  assert(rels1.some(r => r.kind === '天干相冲' && r.name.indexOf('甲庚') !== -1), '识别甲庚相冲');

  console.log('\n=== [5] 盲派特色引擎 (综合例 2: 冲穿合破自合全备) ===');
  // 丁亥 癸卯 丁酉 甲辰
  // 年: 丁亥 (天地自合)
  // 月: 癸卯
  // 日: 丁酉 (卯酉六冲, 辰酉六合)
  // 时: 甲辰 (卯辰相穿!)
  const chart2 = core.parseChart('丁亥 癸卯 丁酉 甲辰');
  assert(chart2.valid, '丁亥 癸卯 丁酉 甲辰 解析成功');
  const rels2 = relEngine.analyzeRelations(chart2);

  assert(rels2.some(r => r.kind === '干支自合' && r.name.indexOf('丁亥') !== -1), '识别丁亥天地自合');
  assert(rels2.some(r => r.kind === '天干相冲' && r.name.indexOf('丁癸') !== -1), '识别天干丁癸相冲');
  assert(rels2.some(r => r.kind === '地支六冲' && r.name.indexOf('卯酉') !== -1), '识别地支卯酉相冲');
  assert(rels2.some(r => r.kind === '地支六合' && r.name.indexOf('辰酉') !== -1), '识别地支辰酉六合');
  assert(rels2.some(r => r.kind === '地支六穿' && r.name.indexOf('卯辰') !== -1), '识别盲派关键：卯辰相穿(害)');

  const mpEngine = MP.engine.mangpai;
  const mpRes2 = mpEngine.analyze(chart2, rels2);
  assert(mpRes2.gongCandidates.length > 0, `识别做功候选 (${mpRes2.gongCandidates.length} 条)`);
  assert(mpRes2.tombList.some(t => t.branch === '辰'), '识别辰为水墓库');

  console.log('\n=== [6] 五行引擎计算 ===');
  const wxRes2 = MP.engine.wuxing.calculate(chart2);
  assert(wxRes2.total > 0, `五行总分统计正确: ${wxRes2.total}`);
  assert(wxRes2.dayWx === '火', '日主五行为火');

  console.log('\n=== [7] 大运与流年引擎 ===');
  const luckEngine = MP.engine.luck;
  // 丁亥年为阴干年 (丁为阴火)
  // 男命阴年干 -> 逆排
  // 女命阴年干 -> 顺排
  assertEqual(luckEngine.getDirection('丁', '男'), '逆', '丁年男命逆排大运');
  assertEqual(luckEngine.getDirection('丁', '女'), '顺', '丁年女命顺排大运');
  assertEqual(luckEngine.getDirection('甲', '男'), '顺', '甲年男命顺排大运');

  const dayunRes = luckEngine.generateDayun(chart2, '男', 3);
  assertEqual(dayunRes.list.length, 10, '生成10步大运');
  assertEqual(dayunRes.list[0].ageRange, '3-12岁', '第一步大运起运岁3-12岁');
  // 月柱为癸卯，逆排第一步为壬寅
  assertEqual(dayunRes.list[0].jiazi, '壬寅', '癸卯逆排第一步大运为壬寅');

  assertEqual(luckEngine.getYearGanzhi(1984), '甲子', '1984年干支为甲子');
  assertEqual(luckEngine.getYearGanzhi(2024), '甲辰', '2024年干支为甲辰');
  assertEqual(luckEngine.getYearGanzhi(2026), '丙午', '2026年干支为丙午');

  console.log(`\n========================================`);
  console.log(`测试结果: ${passed} 项通过, ${failed} 项失败`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
