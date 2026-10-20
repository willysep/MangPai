const fs = require('fs');
const path = require('path');
const MP = require('../js/ns');
require('../js/animator');

console.log('=== [11] 检验 Retouch 需求功能点 ===');

// 1. 验证速度选择保持原选项，但实际动画速率乘以 0.5 系数
console.log('--- 1. 验证动画速度系数 0.5 ---');
MP.animator.setSpeed(1.0);
if (MP.animator.speedMultiplier !== 0.5) {
  throw new Error(`预期 1.0x 对应速度倍率为 0.5，实际: ${MP.animator.speedMultiplier}`);
}
console.log('  ✓ 1.0x 选项实际速度倍率为 0.5 (慢一倍)');

MP.animator.setSpeed(0.5);
if (MP.animator.speedMultiplier !== 0.25) {
  throw new Error(`预期 0.5x 对应速度倍率为 0.25，实际: ${MP.animator.speedMultiplier}`);
}
console.log('  ✓ 0.5x 选项实际速度倍率为 0.25');

MP.animator.setSpeed(2.0);
if (MP.animator.speedMultiplier !== 1.0) {
  throw new Error(`预期 2.0x 对应速度倍率为 1.0，实际: ${MP.animator.speedMultiplier}`);
}
console.log('  ✓ 2.0x 选项实际速度倍率为 1.0');

// 2. 验证已完全移除“经典预设”
console.log('--- 2. 验证已移除经典预设 ---');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const mainJs = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../css/layout.css'), 'utf8');

if (html.includes('经典预设') || html.includes('preset-container') || html.includes('preset-group')) {
  throw new Error('index.html 中仍残留经典预设内容');
}
console.log('  ✓ index.html 中已移除经典预设');

if (mainJs.includes('PRESETS') || mainJs.includes('presetContainer')) {
  throw new Error('main.js 中仍残留 PRESETS 相关代码');
}
console.log('  ✓ main.js 中已清理 PRESETS 数据与事件绑定');

// 3. 验证移动端特性
console.log('--- 3. 验证移动端响应式设计 ---');
// 3a. 速度下拉框
if (!html.includes('id="speed-select-mobile"')) {
  throw new Error('index.html 缺少移动端速度下拉选择器 speed-select-mobile');
}
if (!css.includes('.speed-select-mobile')) {
  throw new Error('layout.css 缺少 .speed-select-mobile 样式定义');
}
console.log('  ✓ 移动端速度选择呈现为下拉框 (speed-select-mobile)');

// 3b. 4 列 2 行紧凑八字输入
if (!css.includes('grid-template-columns: repeat(4, 1fr)')) {
  throw new Error('layout.css 移动端缺少 repeat(4, 1fr) 4 列排布规则');
}
if (!css.includes('.select-pillar') || !css.includes('flex-direction: column')) {
  throw new Error('layout.css 移动端缺少 select-pillar flex-direction: column (干支上下2行) 规则');
}
console.log('  ✓ 移动端八字输入已紧凑化为 4 列 2 行结构 (上干下支)');

// 3c. 隐藏五行力量卡片并提供 toggle 按钮
if (!html.includes('id="btn-toggle-wuxing"') || !html.includes('id="wuxing-card"')) {
  throw new Error('index.html 缺少 btn-toggle-wuxing 或 wuxing-card');
}
if (!css.includes('.btn-toggle-wuxing') || !css.includes('.wuxing-panel-card')) {
  throw new Error('layout.css 缺少五行力量卡片与 toggle 按钮样式');
}
console.log('  ✓ 移动端五行力量卡片默认隐藏并配备交互 toggle 开关');

console.log('\n========================================');
console.log('Retouch 需求测试全数通过！');
console.log('========================================');
