const MP = require('../js/ns');
require('../js/data');
require('../js/engine/core');
require('../js/engine/relations');
require('../js/render/svg');
require('../js/render/relations');

const mockMobileAnchors = {
  'year_干': { cx: 43, topY: 126, bottomY: 184, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'year_支': { cx: 43, topY: 196, bottomY: 254, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'month_干': { cx: 119, topY: 126, bottomY: 184, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'month_支': { cx: 119, topY: 196, bottomY: 254, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'day_干': { cx: 195, topY: 126, bottomY: 184, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'day_支': { cx: 195, topY: 196, bottomY: 254, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'hour_干': { cx: 271, topY: 126, bottomY: 184, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } },
  'hour_支': { cx: 271, topY: 196, bottomY: 254, trayBottomY: 340, element: { classList: { add(){}, remove(){} } } }
};

const chart = MP.engine.core.parseChart('甲子 丙寅 戊辰 庚申');
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
global.window = { innerWidth: 375 };

const svg = createMockElement('svg');
MP.render.relations.render(svg, relations, mockMobileAnchors, {});

console.log('Mobile SVG total children:', svg.children.length);
svg.children.forEach((c, idx) => {
  if (c.tagName === 'PATH') {
    console.log('[' + idx + '] class=' + c.attributes.class + ' d=' + c.attributes.d);
  }
});
