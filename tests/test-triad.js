const MP = require('../js/ns');
require('../js/data');
require('../js/engine/core');
require('../js/engine/relations');
require('../js/engine/wuxing');
require('../js/engine/mangpai');
require('../js/engine/luck');
require('../js/render/svg');
require('../js/render/relations');
require('../js/render/modal');

function createMockElement(tag) {
  return {
    tagName: tag.toUpperCase(),
    attributes: {},
    style: {},
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    },
    children: [],
    innerHTML: '',
    textContent: '',
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    appendChild(child) { this.children.push(child); return child; },
    querySelectorAll() { return []; },
    querySelector() { return createMockElement('div'); },
    addEventListener() {},
    getTotalLength() { return 850; }
  };
}

global.document = {
  createElement: createMockElement,
  createElementNS: (ns, tag) => createMockElement(tag),
  getElementById: (id) => createMockElement('div')
};

console.log('=== [9] 验证天干地支差异化特效与 3 Serangkai 架构 ===');

const chart = MP.engine.core.parseChart('甲子 丙寅 戊辰 庚申');
const relations = MP.engine.relations.analyzeRelations(chart, {});

const anchors = {
  'year_干': { cx: 80, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
  'year_支': { cx: 80, topY: 180, bottomY: 240, trayBottomY: 360, element: createMockElement('div') },
  'month_干': { cx: 180, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
  'month_支': { cx: 180, topY: 180, bottomY: 240, trayBottomY: 360, element: createMockElement('div') },
  'day_干': { cx: 280, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
  'day_支': { cx: 280, topY: 180, bottomY: 240, trayBottomY: 360, element: createMockElement('div') },
  'hour_干': { cx: 380, topY: 100, bottomY: 160, trayBottomY: 360, element: createMockElement('div') },
  'hour_支': { cx: 380, topY: 180, bottomY: 240, trayBottomY: 360, element: createMockElement('div') }
};

const svg = createMockElement('svg');
MP.render.relations.render(svg, relations, anchors, {});

console.log('  总渲染 SVG 节点数:', svg.children.length);

// 1. 检验天干相冲专属类
const tianganChong = svg.children.find(c => c.attributes.class && c.attributes.class.includes('rel-tiangan-chong'));
console.log('  ✓ 识别天干专属动效类 (甲庚冲):', !!tianganChong, tianganChong ? tianganChong.attributes.class : '');
if (!tianganChong) throw new Error('天干相冲未能赋予 rel-tiangan-chong 专属类');

// 2. 检验地支相冲专属类
const dizhiChong = svg.children.find(c => c.attributes.class && c.attributes.class.includes('rel-dizhi-chong'));
console.log('  ✓ 识别地支专属动效类 (寅申冲):', !!dizhiChong, dizhiChong ? dizhiChong.attributes.class : '');
if (!dizhiChong) throw new Error('地支相冲未能赋予 rel-dizhi-chong 专属类');

// 3. 检验 3 Serangkai 三叉连通折线 (申子辰三合水局)
const triadPath = svg.children.find(c => c.attributes.class && c.attributes.class.includes('rel-triad-sanhe'));
console.log('  ✓ 识别三合局专属 3 终端骨干网络 (申子辰):', !!triadPath);
if (!triadPath) throw new Error('三合局未能成功渲染 3 终端骨干网络');
console.log('    三叉连通 Path d:', triadPath.attributes.d);

// 4. 检验 3 Serangkai 核心中枢徽章
const nexusGroup = svg.children.find(c => c.attributes.class && c.attributes.class.includes('triad-nexus-group'));
console.log('  ✓ 识别三合局核心中枢徽章 (Nexus Badge):', !!nexusGroup);
if (!nexusGroup) throw new Error('未能生成三合局核心中枢徽章');
const badgeTextElem = nexusGroup.children.find(c => c.tagName === 'TEXT');
console.log('    中枢徽章标牌文字:', badgeTextElem ? badgeTextElem.textContent : '');
if (!badgeTextElem || badgeTextElem.textContent !== '⟐ 三合水局') {
  throw new Error('中枢徽章文字不符合预期: ' + (badgeTextElem ? badgeTextElem.textContent : 'none'));
}

console.log('\n========================================');
console.log('三合局 3 终端骨干与干支差异化特效测试全数通过！');
console.log('========================================');
