const fs = require('fs');
const path = require('path');
const MP = require('../js/ns');
require('../js/data');
require('../js/engine/core');
require('../js/engine/relations');
require('../js/render/svg');
require('../js/render/relations');
require('../js/render/panels');

console.log('=== [12] 检验关系过滤器柱位与干支下拉筛选功能 ===');

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
    value: '',
    _className: '',
    set className(val) {
      this._className = val;
      this.classList.classes.clear();
      (val || '').split(/\s+/).forEach(c => { if (c) this.classList.classes.add(c); });
    },
    get className() { return this._className; },
    setAttribute: function(k, v) { this.attributes[k] = v; },
    getAttribute: function(k) { return this.attributes[k]; },
    appendChild: function(child) { this.children.push(child); return child; },
    querySelectorAll: function() { return []; },
    querySelector: function(sel) {
      if (sel === 'select') return this.children.find(c => c.tagName === 'SELECT') || createMockElement('select');
      return createMockElement('div');
    },
    addEventListener: function() {},
    getTotalLength: function() { return 500; }
  };
  return elem;
}

global.document = {
  createElement: createMockElement,
  createElementNS: (ns, tag) => createMockElement(tag),
  getElementById: (id) => null
};
global.window = { innerWidth: 1200 };

const chart = MP.engine.core.parseChart('甲子 丙寅 戊辰 庚申');
const relations = MP.engine.relations.analyzeRelations(chart, {});

const mockAnchors = {
  'year_干': { cx: 80, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
  'year_支': { cx: 80, topY: 200, bottomY: 260, trayBottomY: 360, element: createMockElement('div') },
  'month_干': { cx: 160, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
  'month_支': { cx: 160, topY: 200, bottomY: 260, trayBottomY: 360, element: createMockElement('div') },
  'day_干': { cx: 240, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
  'day_支': { cx: 240, topY: 200, bottomY: 260, trayBottomY: 360, element: createMockElement('div') },
  'hour_干': { cx: 320, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
  'hour_支': { cx: 320, topY: 200, bottomY: 260, trayBottomY: 360, element: createMockElement('div') }
};

// 1. 无筛选时渲染全部
const svgAll = createMockElement('svg');
MP.render.relations.render(svgAll, relations, mockAnchors, {});
const allPaths = svgAll.children.filter(c => c.tagName === 'PATH');
console.log(`  ✓ 全部关系连线数: ${allPaths.length} 条`);

// 2. 按柱筛选: 日柱 (day)
const svgDay = createMockElement('svg');
MP.render.relations.render(svgDay, relations, mockAnchors, { filterPillar: 'day' });
const dayPaths = svgDay.children.filter(c => c.tagName === 'PATH');
if (dayPaths.length === 0 || dayPaths.length >= allPaths.length) {
  throw new Error(`日柱筛选结果异常: 得到 ${dayPaths.length} 条，原总数 ${allPaths.length} 条`);
}
console.log(`  ✓ 筛选「日柱」: 成功过滤出 ${dayPaths.length} 条相关连线 (原 ${allPaths.length} 条)`);

// 3. 按干支筛选: '庚' (时干庚: 甲庚冲、丙克庚、庚通根于申)
const svgGeng = createMockElement('svg');
MP.render.relations.render(svgGeng, relations, mockAnchors, { filterChar: '庚' });
const gengPaths = svgGeng.children.filter(c => c.tagName === 'PATH');
if (gengPaths.length !== 3) {
  throw new Error(`筛选「庚」预期得到 3 条 (甲庚冲、丙克庚、庚通根申)，实际得到: ${gengPaths.length}`);
}
console.log(`  ✓ 筛选「庚」字符: 精确命中包含「庚」的 ${gengPaths.length} 条关系 (甲庚冲、丙克庚、庚通根申)`);

// 4. 双重筛选: 日柱 (day) + 辰 (日支)
const svgDayChen = createMockElement('svg');
MP.render.relations.render(svgDayChen, relations, mockAnchors, { filterPillar: 'day', filterChar: '辰' });
const dayChenPaths = svgDayChen.children.filter(c => c.tagName === 'PATH');
if (dayChenPaths.length === 0) {
  throw new Error(`筛选「日柱 + 辰」未命中任何关系`);
}
console.log(`  ✓ 组合筛选「日柱 + 辰」: 命中 ${dayChenPaths.length} 条关系`);

// 5. 校验 panels.renderFilters DOM 生成
const filterContainer = createMockElement('div');
let changedFilters = null;
const currentFilters = {
  '天干五合': true,
  '天干相冲': true,
  filterPillar: '',
  filterChar: ''
};

MP.render.panels.renderFilters(
  filterContainer,
  currentFilters,
  (f) => { changedFilters = f; },
  chart,
  null,
  relations
);

// 验证包含 controls row 与 chips row
const controlsRow = filterContainer.children.find(c => c.classList.contains('filter-controls-row'));
if (!controlsRow) throw new Error('缺少 .filter-controls-row 控制行');
console.log('  ✓ renderFilters 成功生成 .filter-controls-row 控制面板');

// 验证包含 filter-pillar-select 与 filter-char-select
let foundPillarSelect = false;
let foundCharSelect = false;

function searchSelects(node) {
  if (node.tagName === 'SELECT') {
    if (node.id === 'filter-pillar-select') foundPillarSelect = true;
    if (node.id === 'filter-char-select') foundCharSelect = true;
  }
  if (node.children) node.children.forEach(searchSelects);
}
searchSelects(controlsRow);

if (!foundPillarSelect || !foundCharSelect) {
  throw new Error(`缺少柱位或干支下拉框: foundPillarSelect=${foundPillarSelect}, foundCharSelect=${foundCharSelect}`);
}
console.log('  ✓ renderFilters 包含 #filter-pillar-select (柱位下拉) 与 #filter-char-select (干支下拉)');

console.log('\n========================================');
console.log('关系过滤器柱位与干支下拉筛选测试全数通过！');
console.log('========================================');
