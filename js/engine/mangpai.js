/**
 * 盲派八字 - 盲派特色分析引擎 (宾主、体用、做功候选、墓库、禄刃、虚实)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    require('../data');
    require('./core');
    require('./relations');
    factory(MP);
    module.exports = MP.engine.mangpai;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const data = MP.data;
  const mpEngine = {};

  /**
   * 盲派深度分析
   * @param {object} chart 解析后的八字图表对象
   * @param {Array} relations 关系列表
   * @param {object} luckPillars 大运流年
   * @param {object} userTiYongOverrides 用户手动覆盖的体用字典 (例如 { 'hour_stem': '体' })
   * @returns {object} 盲派分析结果
   */
  mpEngine.analyze = function (chart, relations, luckPillars, userTiYongOverrides) {
    userTiYongOverrides = userTiYongOverrides || {};
    const dayStem = chart.dayStem;
    const pillars = chart.pillars;

    // ==========================================
    // 1. 体用划分
    // ==========================================
    const tiYongMap = {};
    const defaultTiYong = (role, layer, char, tenGod) => {
      const key = `${role}_${layer}`;
      if (userTiYongOverrides[key]) {
        return userTiYongOverrides[key];
      }
      if (role === '日柱' && layer === '干') return '体(日主)';

      // 检查日禄 (日支为禄神自动归为体)
      if (layer === '支' && data.LU[dayStem] === char) {
        return '体(禄)';
      }

      const xiang = data.TEN_GOD_XIANG[tenGod];
      if (xiang) {
        if (xiang.type === '体') return '体';
        if (xiang.type === '用') return '用';
        return '待定'; // 食神、伤官
      }
      return '待定';
    };

    ['year', 'month', 'day', 'hour'].forEach(pKey => {
      const p = pillars[pKey];
      // 天干
      tiYongMap[`${pKey}_stem`] = {
        char: p.stem.char,
        tenGod: p.stem.tenGod,
        tiYong: defaultTiYong(p.role, '干', p.stem.char, p.stem.tenGod),
        domain: p.domain
      };
      // 地支
      tiYongMap[`${pKey}_branch`] = {
        char: p.branch.char,
        tenGod: p.branch.hidden[0] ? p.branch.hidden[0].tenGod : '',
        tiYong: defaultTiYong(p.role, '支', p.branch.char, p.branch.hidden[0] ? p.branch.hidden[0].tenGod : ''),
        domain: p.domain
      };
    });

    // ==========================================
    // 2. 禄神与羊刃定位及状态
    // ==========================================
    const luChar = data.LU[dayStem];
    const renChar = data.REN[dayStem];
    const luLocations = [];
    const renLocations = [];

    ['year', 'month', 'day', 'hour'].forEach(pKey => {
      const p = pillars[pKey];
      if (p.branch.char === luChar) {
        let typeName = '岁禄';
        if (pKey === 'month') typeName = '建禄';
        if (pKey === 'day') typeName = '专禄(坐禄)';
        if (pKey === 'hour') typeName = '归禄(时禄)';

        // 检查该禄神是否逢冲逢穿
        const clashes = relations.filter(r =>
          (r.kind === '地支六冲' || r.kind === '地支六穿') &&
          r.members.some(m => m.pillar === pKey && m.layer === '支')
        );

        luLocations.push({
          pillar: pKey,
          role: p.role,
          char: luChar,
          typeName: typeName,
          status: clashes.length > 0 ? '逢破损(冲穿)' : '清纯完好',
          damageRelations: clashes
        });
      }

      if (p.branch.char === renChar) {
        const clashes = relations.filter(r =>
          (r.kind === '地支六冲' || r.kind === '地支六穿') &&
          r.members.some(m => m.pillar === pKey && m.layer === '支')
        );

        renLocations.push({
          pillar: pKey,
          role: p.role,
          char: renChar,
          typeName: '羊刃',
          status: clashes.length > 0 ? '刃星逢冲战' : '刃聚势盛',
          damageRelations: clashes
        });
      }
    });

    // ==========================================
    // 3. 墓库开闭分析 (辰戌丑未)
    // ==========================================
    const tombList = [];
    ['year', 'month', 'day', 'hour'].forEach(pKey => {
      const p = pillars[pKey];
      const bChar = p.branch.char;
      if (data.TOMB[bChar]) {
        const tInfo = data.TOMB[bChar];

        // 检查是否有冲 (辰戌冲, 丑未冲)
        const openChong = relations.filter(r =>
          r.kind === '地支六冲' &&
          r.members.some(m => m.pillar === pKey && m.layer === '支')
        );

        // 检查是否有合 (合闭或闭气)
        const closeHe = relations.filter(r =>
          (r.kind === '地支六合' || r.kind === '地支三合局') &&
          r.members.some(m => m.pillar === pKey && m.layer === '支')
        );

        // 检查是否有刑
        const xingRel = relations.filter(r =>
          r.kind === '地支相刑' &&
          r.members.some(m => m.pillar === pKey && m.layer === '支')
        );

        let status = '闭库 (待岁运冲刑开门)';
        let statusBadge = 'closed';
        if (openChong.length > 0) {
          status = '冲开墓库 (门户大开，库物尽出)';
          statusBadge = 'open';
        } else if (xingRel.length > 0) {
          status = '刑开/破库 (刑破开门)';
          statusBadge = 'open';
        } else if (closeHe.length > 0) {
          status = '合绊闭气 (因合紧锁)';
          statusBadge = 'locked';
        }

        tombList.push({
          pillar: pKey,
          role: p.role,
          branch: bChar,
          tombWx: tInfo.wx,
          tombDesc: tInfo.name,
          status: status,
          statusBadge: statusBadge,
          openRelations: openChong.concat(xingRel),
          closeRelations: closeHe
        });
      }
    });

    // ==========================================
    // 4. 做功与废功候选评定 (智能启发式，标注「参考」)
    // ==========================================
    const gongCandidates = [];
    const feiGongCandidates = [];

    // 过滤出涉及主位 (日柱或时柱) 的做功关系
    relations.forEach(r => {
      const hasMain = r.members.some(m => m.pillar === 'day' || m.pillar === 'hour');
      const isPureGuest = r.members.every(m => m.pillar === 'year' || m.pillar === 'month');

      if (isPureGuest) {
        if (r.kind === '地支六冲' || r.kind === '地支六穿' || r.kind === '天干相冲') {
          feiGongCandidates.push({
            relation: r,
            title: `宾位自战 (${r.name})`,
            reason: `年月宾位自相冲克破坏，气势内耗，非为主位所制，主祖业消磨或长辈动荡。`,
            level: '参考'
          });
        }
        return;
      }

      if (hasMain) {
        // 主位参与关系，分析是否成做功结构
        if (r.kind === '地支六合') {
          gongCandidates.push({
            type: '合做功 (合制/合得)',
            title: `六合做功：${r.name}`,
            relation: r,
            reason: r.domainRelation === '主-宾'
              ? '主位与宾位六合，日主或家内之支紧紧合取外部之神，主聚敛、掌控、合作谋财。'
              : '主位内部相合，主家庭团结、心神凝聚。',
            level: '参考'
          });
        } else if (r.kind === '地支六冲') {
          gongCandidates.push({
            type: '冲制做功 (冲动/冲制)',
            title: `六冲做功：${r.name}`,
            relation: r,
            reason: '主位参与六冲，若主旺宾衰则为制服得财官；若宾旺冲坏主位之体(禄印)则反成凶灾。',
            level: '参考'
          });
        } else if (r.kind === '地支六穿') {
          // 检查穿的是否是自身的禄印
          const hitsLu = luLocations.some(l => r.members.some(m => m.pillar === l.pillar && m.layer === '支'));
          if (hitsLu) {
            feiGongCandidates.push({
              relation: r,
              title: `穿坏禄神 (${r.name})`,
              reason: '【盲派重忌】主位之禄神被穿坏，禄为身体与福禄，被穿主身体多疾、耗财受损或劳苦。',
              level: '参考'
            });
          } else {
            gongCandidates.push({
              type: '穿制做功',
              title: `六穿制功：${r.name}`,
              relation: r,
              reason: '盲派以穿为速决之制，若体穿用神、制去忌神，主效率极高、巧取速获。',
              level: '参考'
            });
          }
        } else if (r.kind === '地支相刑') {
          gongCandidates.push({
            type: '刑做功',
            title: `相刑做功：${r.name}`,
            relation: r,
            reason: '主位参与刑制，以刑制物，多主技术手艺、司法纪律、外科、精密操作或威慑做功。',
            level: '参考'
          });
        } else if (r.kind === '地支暗合') {
          gongCandidates.push({
            type: '暗合做功',
            title: `暗合做功：${r.name}`,
            relation: r,
            reason: '暗中合拢牵系，主隐秘收入、私下合作、不公开之机缘或感情纠葛。',
            level: '参考'
          });
        } else if (r.kind === '天干五合') {
          gongCandidates.push({
            type: '天干合制/合用',
            title: `天干合功：${r.name}`,
            relation: r,
            reason: '天干化合，日主或主干直接合化宾位天干，主目标明确、专注掌控所得之象。',
            level: '参考'
          });
        } else if (r.kind === '地支三合局' || r.kind === '地支半合') {
          gongCandidates.push({
            type: '合局成势做功',
            title: `合局聚气：${r.name}`,
            relation: r,
            reason: '三合或半合聚气成大势，气势浩大，成党做功。',
            level: '参考'
          });
        }
      }
    });

    // ==========================================
    // 5. 虚透与实透判定
    // ==========================================
    const xuShiList = [];
    ['year', 'month', 'day', 'hour'].forEach(pKey => {
      const p = pillars[pKey];
      const sChar = p.stem.char;
      if (pKey === 'day') return; // 日主不以虚透论

      // 检查地支是否有根 (包括本柱及其他柱)
      const rootBranches = [];
      ['year', 'month', 'day', 'hour'].forEach(bKey => {
        const b = pillars[bKey];
        const hiddenList = data.HIDDEN[b.branch.char] || [];
        hiddenList.forEach((h, idx) => {
          if (h === sChar) {
            rootBranches.push({ role: b.role, type: data.HIDDEN_TYPE[idx] });
          }
        });
      });

      if (rootBranches.length === 0) {
        xuShiList.push({
          pillar: pKey,
          role: p.role,
          char: sChar,
          tenGod: p.stem.tenGod,
          state: '虚透',
          desc: '天干在地支无根为虚透。虚透之字不以实利看，主名气、才思、意愿、流动浮华。'
        });
      } else {
        const rootDesc = rootBranches.map(rb => `${rb.role}(${rb.type})`).join('、');
        xuShiList.push({
          pillar: pKey,
          role: p.role,
          char: sChar,
          tenGod: p.stem.tenGod,
          state: '实透(得根)',
          desc: `天干得根于${rootDesc}，有实质支撑，多主实业、物质财富、实权执掌。`
        });
      }
    });

    return {
      tiYongMap: tiYongMap,
      luLocations: luLocations,
      renLocations: renLocations,
      tombList: tombList,
      gongCandidates: gongCandidates,
      feiGongCandidates: feiGongCandidates,
      xuShiList: xuShiList
    };
  };

  MP.engine.mangpai = mpEngine;
  return mpEngine;
}));
