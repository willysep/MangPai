/**
 * 盲派八字 - SVG 绘图辅助与弧线路径计算
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    factory(MP);
    module.exports = MP.render.svg;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const svgHelper = {};
  const SVG_NS = 'http://www.w3.org/2000/svg';

  svgHelper.create = function (tag, attrs) {
    const elem = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(k => {
        elem.setAttribute(k, attrs[k]);
      });
    }
    return elem;
  };

  /**
   * 生成柱与柱之间的拱弧曲线 (贝塞尔二次曲线)
   * @param {number} x1 起点 X
   * @param {number} y1 起点 Y
   * @param {number} x2 终点 X
   * @param {number} y2 终点 Y
   * @param {string} direction 'up' (向上拱, 用于天干) | 'down' (向下拱, 用于地支)
   * @param {number} lane 轨道索引 (避免不同跨度弧线重叠，0, 1, 2...)
   * @returns {string} SVG path data 'd'
   */
  svgHelper.makeArcPath = function (x1, y1, x2, y2, direction, lane) {
    lane = lane || 0;
    const midX = (x1 + x2) / 2;
    const dx = Math.abs(x2 - x1);

    // 跨度越大，拱得越高
    const baseHeight = Math.min(dx * 0.45, 110);
    const laneOffset = lane * 22;
    const totalHeight = baseHeight + laneOffset;

    let controlY;
    if (direction === 'up') {
      controlY = Math.min(y1, y2) - totalHeight;
    } else {
      controlY = Math.max(y1, y2) + totalHeight;
    }

    return `M ${x1} ${y1} Q ${midX} ${controlY} ${x2} ${y2}`;
  };

  /**
   * 生成折角走线 (Garis Menekuk / 具有平滑圆角的直角阶梯折线，保证互不重叠)
   * @param {number} x1 起点 X
   * @param {number} y1 起点 Y
   * @param {number} x2 终点 X
   * @param {number} y2 终点 Y
   * @param {string} direction 'up' (向上折，用于天干) | 'down' (向下折，用于地支)
   * @param {number} trackY 水平走线轨道的绝对 Y 坐标
   * @param {number} r 圆角半径 (默认 8px)
   * @returns {string} SVG path 'd'
   */
  svgHelper.makeBentPath = function (x1, y1, x2, y2, direction, trackY, r) {
    r = r || 8;
    const dx = x2 - x1;
    const isRight = dx >= 0;
    const signX = isRight ? 1 : -1;

    const halfDx = Math.abs(dx) / 2;
    const dy1 = Math.abs(trackY - y1);
    const dy2 = Math.abs(trackY - y2);
    const actualR = Math.max(1, Math.min(r, halfDx, dy1 / 2, dy2 / 2));

    if (direction === 'up') {
      return `M ${x1} ${y1} ` +
             `L ${x1} ${trackY + actualR} ` +
             `Q ${x1} ${trackY} ${x1 + signX * actualR} ${trackY} ` +
             `L ${x2 - signX * actualR} ${trackY} ` +
             `Q ${x2} ${trackY} ${x2} ${trackY + actualR} ` +
             `L ${x2} ${y2}`;
    } else {
      return `M ${x1} ${y1} ` +
             `L ${x1} ${trackY - actualR} ` +
             `Q ${x1} ${trackY} ${x1 + signX * actualR} ${trackY} ` +
             `L ${x2 - signX * actualR} ${trackY} ` +
             `Q ${x2} ${trackY} ${x2} ${trackY - actualR} ` +
             `L ${x2} ${y2}`;
    }
  };

  /**
   * 生成三合局/三会局三端连续连通折线 (3 Serangkai 骨干连线)
   * x1, x2, x3 保证从左到右递增排序
   */
  svgHelper.makeTriadBentPath = function (x1, y1, x2, y2, x3, y3, direction, trackY, r) {
    const mainArch = svgHelper.makeBentPath(x1, y1, x3, y3, direction, trackY, r);
    const middleStem = ` M ${x2} ${y2} L ${x2} ${trackY}`;
    return mainArch + middleStem;
  };

  /**
   * 生成同柱内部或干支垂直连线
   */
  svgHelper.makeVerticalPath = function (x, y1, y2) {
    return `M ${x} ${y1} L ${x} ${y2}`;
  };

  MP.render.svg = svgHelper;
  return svgHelper;
}));
