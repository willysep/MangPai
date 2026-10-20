/**
 * 盲派八字 - 动画编排与时间轴控制引擎
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('./ns');
    factory(MP);
    module.exports = MP.animator;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const SPEED_COEFFICIENT = 0.5;

  const animator = {
    speedMultiplier: 1.0 * SPEED_COEFFICIENT,
    speedCoefficient: SPEED_COEFFICIENT,
    skipAnimation: false
  };

  /**
   * 设置播放速度倍率 (0.5, 1.0, 2.0)
   * 实际动画速率乘以 0.5 系数，使整体节奏更从容舒缓
   */
  animator.setSpeed = function (speed) {
    animator.speedMultiplier = speed * SPEED_COEFFICIENT;
    const root = (typeof document !== 'undefined') ? document.documentElement : null;
    if (root && root.style && typeof root.style.setProperty === 'function') {
      root.style.setProperty('--anim-speed', `${1 / animator.speedMultiplier}s`);
      root.style.setProperty('--anim-speed-factor', `${animator.speedMultiplier}`);
    }
  };

  /**
   * 重播所有入场与关系动画
   */
  animator.replay = function () {
    if (typeof animator.onReplay === 'function') {
      animator.onReplay();
      return;
    }

    // 1. 重置所有卡片动画
    const animatedCards = document.querySelectorAll('.card-animate-in');
    animatedCards.forEach(card => {
      card.classList.remove('card-animate-in');
      void card.offsetWidth; // 触发 reflow
      card.classList.add('card-animate-in');
    });

    // 2. 重置五行进度条
    const barFills = document.querySelectorAll('.bar-fill');
    barFills.forEach(bf => {
      const targetW = bf.style.width;
      bf.style.width = '0%';
      setTimeout(() => {
        bf.style.width = targetW;
      }, 50);
    });
  };

  MP.animator = animator;
  return animator;
}));
