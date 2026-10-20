/**
 * DOM 渲染层运行时回归测试 (Node 模拟环境)
 */
const MP = require('../js/ns');
require('../js/data');
require('../js/engine/core');
require('../js/engine/relations');
require('../js/engine/wuxing');
require('../js/engine/mangpai');
require('../js/engine/luck');
require('../js/render/svg');
require('../js/render/pillars');
require('../js/render/relations');
require('../js/render/wuxing');
require('../js/render/panels');
require('../js/render/luck');
require('../js/render/modal');

// 简单轻量 DOM 模拟器
function createMockElement(tag) {
  const elem = {
    tagName: tag.toUpperCase(),
    attributes: {},
    style: {},
    classList: {
      classes: new Set(),
      add: function(c) { this.classes.add(c); },
      remove: function(c) { this.classes.delete(c); },
      contains: function(c) { return this.classes.has(c); },
      toggle: function(c, force) {
        if (force === undefined) {
          if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c);
        } else if (force) this.classes.add(c); else this.classes.delete(c);
      }
    },
    children: [],
    innerHTML: '',
    textContent: '',
    setAttribute: function(k, v) { this.attributes[k] = v; },
    getAttribute: function(k) { return this.attributes[k]; },
    appendChild: function(child) { this.children.push(child); return child; },
    querySelectorAll: function() { return []; },
    querySelector: function() { return createMockElement('div'); },
    addEventListener: function() {},
    getBoundingClientRect: function() {
      return { left: 50, top: 50, width: 80, height: 80, right: 130, bottom: 130 };
    }
  };
  return elem;
}

global.document = {
  createElement: createMockElement,
  createElementNS: (ns, tag) => createMockElement(tag),
  documentElement: createMockElement('html'),
  getElementById: (id) => createMockElement('div'),
  querySelectorAll: () => []
};

console.log('=== [8] DOM 渲染模块模拟运行测试 ===');

try {
  const chart = MP.engine.core.parseChart('甲子 丙寅 戊辰 庚申');
  const dayunData = MP.engine.luck.generateDayun(chart, '男', 1);
  const luckPillars = { dayun: dayunData.list[0] };
  const relations = MP.engine.relations.analyzeRelations(chart, luckPillars);
  const mpData = MP.engine.mangpai.analyze(chart, relations, luckPillars);
  const wxData = MP.engine.wuxing.calculate(chart, luckPillars);

  // 1. 测试 pillars.render
  const container = createMockElement('div');
  const anchors = MP.render.pillars.render(container, chart, luckPillars, mpData.tiYongMap);
  console.log('  ✓ pillars.render 运行正常');

  // 2. 测试 relations.render
  const svg = createMockElement('svg');
  MP.render.relations.render(svg, relations, anchors, {});
  console.log('  ✓ relations.render 运行正常');

  // 3. 测试 wuxing.render
  const wxSvgWrap = createMockElement('div');
  const wxBars = createMockElement('div');
  MP.render.wuxing.render(wxSvgWrap, wxBars, wxData);
  console.log('  ✓ wuxing.render 运行正常');

  // 4. 测试 mangpaiPanel & detailTable
  const mpPanel = createMockElement('div');
  MP.render.panels.renderMangpaiPanel(mpPanel, mpData);
  console.log('  ✓ panels.renderMangpaiPanel 运行正常');

  const detailTable = createMockElement('div');
  MP.render.panels.renderDetailTable(detailTable, chart, luckPillars, mpData.tiYongMap);
  console.log('  ✓ panels.renderDetailTable 运行正常');

  // 5. 测试 luck.renderDayun
  const dayunTimeline = createMockElement('div');
  MP.render.luck.renderDayun(dayunTimeline, dayunData, 0);
  console.log('  ✓ luck.renderDayun 运行正常');

  // 6. 测试 modal.open & modal.close
  MP.render.modal.open(chart, luckPillars, relations, mpData, 'day', '干');
  console.log('  ✓ modal.open (日干 戊) 运行正常');
  MP.render.modal.open(chart, luckPillars, relations, mpData, 'year', '支');
  console.log('  ✓ modal.open (年支 子) 运行正常');
  MP.render.modal.close();
  console.log('  ✓ modal.close 运行正常');

  // 7. 测试 animator 控制器
  require('../js/animator');
  MP.animator.setSpeed(2.0);
  let replayCalled = false;
  MP.animator.onReplay = () => { replayCalled = true; };
  MP.animator.replay();
  if (!replayCalled) throw new Error('animator.replay failed to trigger onReplay');
  console.log('  ✓ animator.setSpeed & replay 运行正常');

  // 8. 严格校验天干 vs 地支差异化动效与 3 Serangkai 骨干连线
  const testSvg = createMockElement('svg');
  const mockAnchors = {
    'year_干': { cx: 80, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
    'year_支': { cx: 80, topY: 180, bottomY: 240, trayBottomY: 360, element: createMockElement('div') },
    'month_干': { cx: 180, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
    'month_支': { cx: 180, topY: 180, bottomY: 240, trayBottomY: 360, element: createMockElement('div') },
    'day_干': { cx: 280, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
    'day_支': { cx: 280, topY: 180, bottomY: 240, trayBottomY: 360, element: createMockElement('div') },
    'hour_干': { cx: 380, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
    'hour_支': { cx: 380, topY: 180, bottomY: 240, trayBottomY: 360, element: createMockElement('div') }
  };
  MP.render.relations.render(testSvg, relations, mockAnchors, {});
  const tianganChong = testSvg.children.find(c => c.attributes.class && c.attributes.class.includes('rel-tiangan-chong'));
  const dizhiChong = testSvg.children.find(c => c.attributes.class && c.attributes.class.includes('rel-dizhi-chong'));
  const triadPath = testSvg.children.find(c => c.attributes.class && c.attributes.class.includes('rel-triad-sanhe'));
  const nexusBadge = testSvg.children.find(c => c.attributes.class && c.attributes.class.includes('triad-nexus-group'));

  if (!tianganChong) throw new Error('天干冲动效类 rel-tiangan-chong 缺失');
  if (!dizhiChong) throw new Error('地支冲动效类 rel-dizhi-chong 缺失');
  if (!triadPath) throw new Error('三合局三叉折线骨干 rel-triad-sanhe 缺失');
  if (!nexusBadge) throw new Error('三合局中枢徽章 triad-nexus-group 缺失');
  console.log('  ✓ 天干 vs 地支差异化动效与三合局中枢架构校验通过');

  console.log('\n========================================');
  console.log('全部渲染层与引擎逻辑回归测试通过！');
  console.log('========================================');
} catch (e) {
  console.error('✗ 渲染层运行时发生异常:', e);
  process.exit(1);
}
