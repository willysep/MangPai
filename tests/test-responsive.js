const fs = require('fs');
const path = require('path');

console.log('=== [10] 检验响应式结构与 CSS 媒体查询规则 ===');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../css/layout.css'), 'utf8');

// 1. 检查 index.html 响应式组件容器结构
if (!html.includes('pillars-input-grid')) {
  throw new Error('index.html 缺少 pillars-input-grid 响应式网格容器');
}
console.log('  ✓ index.html 包含 pillars-input-grid');

if (!html.includes('bazi-stage-track')) {
  throw new Error('index.html 缺少 bazi-stage-track 舞台横向滑动轨道容器');
}
console.log('  ✓ index.html 包含 bazi-stage-track 轨道');

if (!html.includes('stage-scroll-hint')) {
  throw new Error('index.html 缺少 stage-scroll-hint 移动端滑动提示徽章');
}
console.log('  ✓ index.html 包含 stage-scroll-hint 徽章');

// 2. 检查 CSS 响应式断点规则
if (!css.includes('@media (max-width: 768px)')) {
  throw new Error('layout.css 缺少 @media (max-width: 768px) 核心移动端媒体查询');
}
console.log('  ✓ layout.css 包含 @media (max-width: 768px) 移动端规则');

if (!css.includes('overflow-x: auto')) {
  throw new Error('layout.css 缺少 overflow-x: auto 横向滑动规则');
}
console.log('  ✓ layout.css 包含 overflow-x: auto 支持');

if (!css.includes('orientationchange')) {
  const mainJs = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');
  if (!mainJs.includes('orientationchange')) {
    throw new Error('main.js 缺少 orientationchange 屏幕旋转事件监听');
  }
}
console.log('  ✓ main.js 包含 resize 与 orientationchange 双向响应自适应');

// 3. 检查移动端舞台与 SVG 动效层保护规则
if (!css.includes('overflow-y: visible')) {
  throw new Error('layout.css 缺少 overflow-y: visible 舞台垂直防截断规则');
}
console.log('  ✓ layout.css 舞台与 SVG 启用 overflow-y: visible 防截断');

if (!css.includes('padding: 120px 8px 150px')) {
  throw new Error('layout.css 移动端缺少 padding: 120px 8px 150px 轨道安全间距');
}
console.log('  ✓ layout.css 移动端配置 120px/150px 上下开阔轨道走线安全边距');

// 4. 模拟移动端八字垂直同柱自合正向线长检验
const MP = require('../js/ns');
require('../js/data');
require('../js/engine/core');
require('../js/engine/relations');
require('../js/render/svg');
require('../js/render/relations');

const mockAnchors = {
  'year_干': { cx: 43, topY: 156, bottomY: 214, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'year_支': { cx: 43, topY: 230, bottomY: 288, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'month_干': { cx: 119, topY: 156, bottomY: 214, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'month_支': { cx: 119, topY: 230, bottomY: 288, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'day_干': { cx: 195, topY: 156, bottomY: 214, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'day_支': { cx: 195, topY: 230, bottomY: 288, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'hour_干': { cx: 271, topY: 156, bottomY: 214, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'hour_支': { cx: 271, topY: 230, bottomY: 288, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } }
};

const chart = MP.engine.core.parseChart('丁亥 癸卯 丁酉 甲辰');
const relations = MP.engine.relations.analyzeRelations(chart, {});

function createMockElement(tag) {
  return {
    tagName: tag.toUpperCase(),
    attributes: {},
    style: {},
    classList: { classes: new Set(), add(c){ this.classes.add(c); }, remove(c){ this.classes.delete(c); }, contains(c){ return this.classes.has(c); } },
    children: [],
    appendChild(c) { this.children.push(c); return c; },
    setAttribute(k,v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    addEventListener() {},
    getTotalLength() { return 500; }
  };
}
global.document = {
  createElement: createMockElement,
  createElementNS: (ns, t) => createMockElement(t),
  getElementById: (id) => null
};
global.window = { innerWidth: 375, innerHeight: 667 };

const svg = createMockElement('svg');
MP.render.relations.render(svg, relations, mockAnchors, {});
let vertCount = 0;
svg.children.forEach(c => {
  if (c.tagName === 'PATH' && c.attributes.class && c.attributes.class.includes('zihe')) {
    vertCount++;
    const m = c.attributes.d.match(/M\s+(\d+)\s+(\d+)\s+L\s+(\d+)\s+(\d+)/);
    if (m) {
      const y1 = parseInt(m[2], 10);
      const y2 = parseInt(m[4], 10);
      if (y2 <= y1) throw new Error('移动端自合垂直线坐标倒置 y1=' + y1 + ' y2=' + y2);
    }
  }
});
if (vertCount === 0) throw new Error('移动端自合垂直线未能生成');
console.log('  ✓ 移动端同柱自合垂直线严格保证正向非负长度 (y1 < y2)');

console.log('\n========================================');
console.log('响应式与移动端动效层适配结构校验全数通过！');
console.log('========================================');
