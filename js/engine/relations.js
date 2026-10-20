/**
 * 盲派八字 - 干支关系判定引擎
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const MP = require('../ns');
    require('../data');
    factory(MP);
    module.exports = MP.engine.relations;
  } else {
    factory(root.MP);
  }
}(typeof self !== 'undefined' ? self : this, function (MP) {
  'use strict';

  const data = MP.data;
  const relEngine = {};

  /**
   * 判断两柱是否相邻
   */
  function isAdjacent(pos1, pos2, pillarKeys) {
    const idx1 = pillarKeys.indexOf(pos1);
    const idx2 = pillarKeys.indexOf(pos2);
    return Math.abs(idx1 - idx2) === 1;
  }

  /**
   * 判断关系的宾主性质
   */
  function getDomainRelation(p1, p2) {
    const isMain1 = (p1.key === 'day' || p1.key === 'hour');
    const isMain2 = (p2.key === 'day' || p2.key === 'hour');
    const isLuck1 = (p1.key === 'dayun' || p1.key === 'liunian');
    const isLuck2 = (p2.key === 'dayun' || p2.key === 'liunian');

    if (isLuck1 || isLuck2) {
      if (p1.key === 'liunian' || p2.key === 'liunian') return '岁-局';
      return '运-局';
    }
    if (isMain1 && isMain2) return '主-主';
    if (!isMain1 && !isMain2) return '宾-宾';
    return '主-宾';
  }

  /**
   * 分析图表中所有干支关系
   * @param {object} chart 解析后的八字图表对象
   * @param {object} luckPillars 可选额外柱 { dayun: {stem, branch}, liunian: {stem, branch} }
   * @param {object} options 选项，例如 { anheMinLevel: 'B' } (默认包含 A and B)
   * @returns {Array} 关系列表
   */
  relEngine.analyzeRelations = function (chart, luckPillars, options) {
    options = options || { anheMinLevel: 'B' };
    const relations = [];
    let relCounter = 0;

    // 收集所有参与计算的柱
    const activePillars = [];
    const pillarKeys = ['year', 'month', 'day', 'hour'];

    pillarKeys.forEach(k => {
      const p = chart.pillars[k];
      activePillars.push({
        key: k,
        role: p.role,
        domain: p.domain,
        stem: p.stem.char,
        branch: p.branch.char,
        source: '原局'
      });
    });

    if (luckPillars && luckPillars.dayun) {
      activePillars.push({
        key: 'dayun',
        role: '大运',
        domain: '宾位(外来)',
        stem: luckPillars.dayun.stem,
        branch: luckPillars.dayun.branch,
        source: '大运'
      });
      pillarKeys.push('dayun');
    }

    if (luckPillars && luckPillars.liunian) {
      activePillars.push({
        key: 'liunian',
        role: '流年',
        domain: '宾位(外来)',
        stem: luckPillars.liunian.stem,
        branch: luckPillars.liunian.branch,
        source: '流年'
      });
      pillarKeys.push('liunian');
    }

    const n = activePillars.length;

    // ==========================================
    // 1. 天干关系 (干与干两两比对)
    // ==========================================
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const p1 = activePillars[i];
        const p2 = activePillars[j];
        const s1 = p1.stem;
        const s2 = p2.stem;
        const adj = isAdjacent(p1.key, p2.key, pillarKeys);
        const domRel = getDomainRelation(p1, p2);

        // 天干五合
        for (let k = 0; k < data.STEM_HE.length; k++) {
          const [a, b, wx] = data.STEM_HE[k];
          if ((s1 === a && s2 === b) || (s1 === b && s2 === a)) {
            relations.push({
              id: 'rel_' + (++relCounter),
              category: '天干',
              kind: '天干五合',
              name: `${s1}${s2}合化${wx}`,
              colorWx: wx,
              members: [
                { pillar: p1.key, role: p1.role, layer: '干', char: s1 },
                { pillar: p2.key, role: p2.role, layer: '干', char: s2 }
              ],
              adjacent: adj,
              domainRelation: domRel,
              resultWx: wx,
              desc: `${p1.role}天干「${s1}」与${p2.role}天干「${s2}」五合，合化${wx}。` +
                    (domRel === '主-宾' ? '【盲派要点】主宾合聚，日主或主位得外物。' : '')
            });
          }
        }

        // 天干相冲
        let hasChong = false;
        for (let k = 0; k < data.STEM_CHONG.length; k++) {
          const [a, b] = data.STEM_CHONG[k];
          if ((s1 === a && s2 === b) || (s1 === b && s2 === a)) {
            hasChong = true;
            relations.push({
              id: 'rel_' + (++relCounter),
              category: '天干',
              kind: '天干相冲',
              name: `${s1}${s2}相冲`,
              members: [
                { pillar: p1.key, role: p1.role, layer: '干', char: s1 },
                { pillar: p2.key, role: p2.role, layer: '干', char: s2 }
              ],
              adjacent: adj,
              domainRelation: domRel,
              desc: `${p1.role}天干「${s1}」与${p2.role}天干「${s2}」相冲，方位对克动荡。`
            });
          }
        }

        // 天干相克 (非冲克)
        if (!hasChong) {
          for (let k = 0; k < data.STEM_KE.length; k++) {
            const [a, b] = data.STEM_KE[k];
            if ((s1 === a && s2 === b) || (s1 === b && s2 === a)) {
              const attacker = (s1 === a) ? p1 : p2;
              const defender = (s1 === a) ? p2 : p1;
              relations.push({
                id: 'rel_' + (++relCounter),
                category: '天干',
                kind: '天干相克',
                name: `${attacker.stem}克${defender.stem}`,
                members: [
                  { pillar: attacker.key, role: attacker.role, layer: '干', char: attacker.stem },
                  { pillar: defender.key, role: defender.role, layer: '干', char: defender.stem }
                ],
                adjacent: adj,
                domainRelation: domRel,
                desc: `${attacker.role}「${attacker.stem}」克制${defender.role}「${defender.stem}」。`
              });
            }
          }
        }
      }
    }

    // ==========================================
    // 2. 地支关系 (两两比对: 六合、六冲、六穿、六破、暗合、刑)
    // ==========================================
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const p1 = activePillars[i];
        const p2 = activePillars[j];
        const b1 = p1.branch;
        const b2 = p2.branch;
        const adj = isAdjacent(p1.key, p2.key, pillarKeys);
        const domRel = getDomainRelation(p1, p2);

        // 地支六合
        for (let k = 0; k < data.LIU_HE.length; k++) {
          const [a, b, wx] = data.LIU_HE[k];
          if ((b1 === a && b2 === b) || (b1 === b && b2 === a)) {
            relations.push({
              id: 'rel_' + (++relCounter),
              category: '地支',
              kind: '地支六合',
              name: `${a}${b}六合化${wx}`,
              colorWx: wx,
              members: [
                { pillar: p1.key, role: p1.role, layer: '支', char: b1 },
                { pillar: p2.key, role: p2.role, layer: '支', char: b2 }
              ],
              adjacent: adj,
              domainRelation: domRel,
              resultWx: wx,
              desc: `${p1.role}「${b1}」与${p2.role}「${b2}」六合（${a}${b}合化${wx}）。` +
                    (domRel === '主-宾' ? '【盲派要点】主宾合绊或合制，做功核心结构。' : '')
            });
          }
        }

        // 地支六冲
        for (let k = 0; k < data.LIU_CHONG.length; k++) {
          const [a, b] = data.LIU_CHONG[k];
          if ((b1 === a && b2 === b) || (b1 === b && b2 === a)) {
            relations.push({
              id: 'rel_' + (++relCounter),
              category: '地支',
              kind: '地支六冲',
              name: `${a}${b}相冲`,
              members: [
                { pillar: p1.key, role: p1.role, layer: '支', char: b1 },
                { pillar: p2.key, role: p2.role, layer: '支', char: b2 }
              ],
              adjacent: adj,
              domainRelation: domRel,
              desc: `${p1.role}「${b1}」与${p2.role}「${b2}」六冲（${a}${b}冲），主冲战、破局、变动、冲开墓库。`
            });
          }
        }

        // 地支六穿 (盲派穿破害)
        for (let k = 0; k < data.CHUAN.length; k++) {
          const [a, b] = data.CHUAN[k];
          if ((b1 === a && b2 === b) || (b1 === b && b2 === a)) {
            relations.push({
              id: 'rel_' + (++relCounter),
              category: '地支',
              kind: '地支六穿',
              name: `${a}${b}相穿(害)`,
              members: [
                { pillar: p1.key, role: p1.role, layer: '支', char: b1 },
                { pillar: p2.key, role: p2.role, layer: '支', char: b2 }
              ],
              adjacent: adj,
              domainRelation: domRel,
              desc: `${p1.role}「${b1}」与${p2.role}「${b2}」相穿（${a}${b}穿）。【盲派极重六穿】穿力极速且带仇恨破坏，损禄印尤凶。`
            });
          }
        }

        // 地支六破
        for (let k = 0; k < data.PO.length; k++) {
          const [a, b] = data.PO[k];
          if ((b1 === a && b2 === b) || (b1 === b && b2 === a)) {
            relations.push({
              id: 'rel_' + (++relCounter),
              category: '地支',
              kind: '地支六破',
              name: `${a}${b}相破`,
              members: [
                { pillar: p1.key, role: p1.role, layer: '支', char: b1 },
                { pillar: p2.key, role: p2.role, layer: '支', char: b2 }
              ],
              adjacent: adj,
              domainRelation: domRel,
              desc: `${p1.role}「${b1}」与${p2.role}「${b2}」相破（${a}${b}破），主内部开裂损伤、暗耗。`
            });
          }
        }

        // 无礼之刑 (子卯)
        if ((b1 === '子' && b2 === '卯') || (b1 === '卯' && b2 === '子')) {
          relations.push({
            id: 'rel_' + (++relCounter),
            category: '地支',
            kind: '地支相刑',
            name: `子卯相刑(无礼之刑)`,
            members: [
              { pillar: p1.key, role: p1.role, layer: '支', char: b1 },
              { pillar: p2.key, role: p2.role, layer: '支', char: b2 }
            ],
            adjacent: adj,
            domainRelation: domRel,
            desc: `${p1.role}「${b1}」与${p2.role}「${b2}」相刑，无礼之刑，主道德礼法、情绪纠葛。`
          });
        }

        // 两两相刑 (三刑中的两两配对: 寅巳申，丑戌未)
        const checkPairXing = (bA, bB, group, xingName) => {
          if (group.indexOf(bA) !== -1 && group.indexOf(bB) !== -1 && bA !== bB) {
            relations.push({
              id: 'rel_' + (++relCounter),
              category: '地支',
              kind: '地支相刑',
              name: `${bA}${bB}相刑(${xingName})`,
              members: [
                { pillar: p1.key, role: p1.role, layer: '支', char: bA },
                { pillar: p2.key, role: p2.role, layer: '支', char: bB }
              ],
              adjacent: adj,
              domainRelation: domRel,
              desc: `${p1.role}「${bA}」与${p2.role}「${bB}」构成${xingName}之两两相刑。`
            });
          }
        };

        checkPairXing(b1, b2, ['寅', '巳', '申'], '无恩之刑');
        checkPairXing(b1, b2, ['丑', '戌', '未'], '恃势之刑');

        // 自刑 (两柱地支相同且为自刑之支)
        if (b1 === b2 && data.XING.zi.indexOf(b1) !== -1) {
          relations.push({
            id: 'rel_' + (++relCounter),
            category: '地支',
            kind: '地支自刑',
            name: `${b1}${b2}自刑`,
            members: [
              { pillar: p1.key, role: p1.role, layer: '支', char: b1 },
              { pillar: p2.key, role: p2.role, layer: '支', char: b2 }
            ],
            adjacent: adj,
            domainRelation: domRel,
            desc: `${p1.role}与${p2.role}同见「${b1}」，自刑纠结，自作主张、心神内耗。`
          });
        }

        // 暗合 (藏干五合)
        const anheMatch = data.ANHE_LIST.find(item =>
          (item.b1 === b1 && item.b2 === b2) || (item.b1 === b2 && item.b2 === b1)
        );

        if (anheMatch) {
          const levelRank = { A: 1, B: 2, C: 3 };
          const minRank = levelRank[options.anheMinLevel || 'B'] || 2;
          if (levelRank[anheMatch.topLevel] <= minRank) {
            relations.push({
              id: 'rel_' + (++relCounter),
              category: '地支',
              kind: '地支暗合',
              name: `${b1}${b2}暗合[${anheMatch.topLevel}级]`,
              level: anheMatch.topLevel,
              summary: anheMatch.summary,
              pairs: anheMatch.pairs,
              members: [
                { pillar: p1.key, role: p1.role, layer: '支', char: b1 },
                { pillar: p2.key, role: p2.role, layer: '支', char: b2 }
              ],
              adjacent: adj,
              domainRelation: domRel,
              desc: `${p1.role}「${b1}」与${p2.role}「${b2}」地支藏干暗合：${anheMatch.summary}。` +
                    (domRel === '主-宾' ? '【盲派要点】暗中合拢，主私下往来、暗中得财或暗中合作。' : '')
            });
          }
        }
      }
    }

    // ==========================================
    // 3. 地支三合 / 半合 / 拱合
    // ==========================================
    data.SAN_HE.forEach(([s1, s2, s3, wx]) => {
      // 检查 activePillars 中包含的支
      const matched = activePillars.filter(p => p.branch === s1 || p.branch === s2 || p.branch === s3);
      const uniqueBranches = Array.from(new Set(matched.map(p => p.branch)));

      if (uniqueBranches.length === 3) {
        // 三合全局
        relations.push({
          id: 'rel_' + (++relCounter),
          category: '地支',
          kind: '地支三合局',
          name: `${s1}${s2}${s3}三合${wx}局`,
          colorWx: wx,
          resultWx: wx,
          members: matched.map(p => ({ pillar: p.key, role: p.role, layer: '支', char: p.branch })),
          desc: `地支见${s1}、${s2}、${s3}三合${wx}局，气聚成势，力量雄厚。`
        });
      } else if (uniqueBranches.length === 2) {
        // 判定半合 (含中神 s2) 还是 拱合 (s1+s3，长生与墓库)
        const hasCenter = uniqueBranches.indexOf(s2) !== -1;
        if (hasCenter) {
          const partner = uniqueBranches.find(b => b !== s2);
          relations.push({
            id: 'rel_' + (++relCounter),
            category: '地支',
            kind: '地支半合',
            name: `${partner}${s2}半合${wx}局`,
            colorWx: wx,
            resultWx: wx,
            members: matched.map(p => ({ pillar: p.key, role: p.role, layer: '支', char: p.branch })),
            desc: `地支见「${partner}」与中神「${s2}」半合${wx}局。`
          });
        } else if (uniqueBranches.indexOf(s1) !== -1 && uniqueBranches.indexOf(s3) !== -1) {
          // 拱合
          relations.push({
            id: 'rel_' + (++relCounter),
            category: '地支',
            kind: '地支拱合',
            name: `${s1}${s3}拱${s2}(${wx})`,
            colorWx: wx,
            resultWx: wx,
            members: matched.map(p => ({ pillar: p.key, role: p.role, layer: '支', char: p.branch })),
            desc: `地支见「${s1}」与「${s3}」虚拱中神「${s2}」，暗汇${wx}气。`
          });
        }
      }
    });

    // ==========================================
    // 4. 地支三会方局
    // ==========================================
    data.SAN_HUI.forEach(([bA, bB, bC, wx]) => {
      const matched = activePillars.filter(p => p.branch === bA || p.branch === bB || p.branch === bC);
      const uniqueBranches = Array.from(new Set(matched.map(p => p.branch)));
      if (uniqueBranches.length === 3) {
        relations.push({
          id: 'rel_' + (++relCounter),
          category: '地支',
          kind: '地支三会局',
          name: `${bA}${bB}${bC}三会${wx}方`,
          colorWx: wx,
          resultWx: wx,
          members: matched.map(p => ({ pillar: p.key, role: p.role, layer: '支', char: p.branch })),
          desc: `地支见${bA}、${bB}、${bC}三会一方之气，会成${wx}方局，一方霸气。`
        });
      }
    });

    // ==========================================
    // 5. 干支配合 (同柱: 自合、盖头、截脚; 跨柱: 通根、透干)
    // ==========================================
    activePillars.forEach(p => {
      // 本柱自合
      const zihe = data.GANZHI_ZIHE.find(item => item.stem === p.stem && item.branch === p.branch);
      if (zihe) {
        relations.push({
          id: 'rel_' + (++relCounter),
          category: '干支',
          kind: '干支自合',
          name: `${p.stem}${p.branch}天地自合`,
          members: [
            { pillar: p.key, role: p.role, layer: '干', char: p.stem },
            { pillar: p.key, role: p.role, layer: '支', char: p.branch }
          ],
          desc: `${p.role}「${p.stem}${p.branch}」本柱天地自合：${zihe.detail}。【盲派要点】干支一心，情意专一或互为牵绊。`
        });
      }

      // 盖头 (干克支) / 截脚 (支克干)
      const stemWx = data.STEM_WX[p.stem];
      const branchWx = data.BRANCH_WX[p.branch];
      if (data.WUXING_KE[stemWx] === branchWx) {
        relations.push({
          id: 'rel_' + (++relCounter),
          category: '干支',
          kind: '盖头',
          name: `${p.stem}盖头${p.branch}`,
          members: [
            { pillar: p.key, role: p.role, layer: '干', char: p.stem },
            { pillar: p.key, role: p.role, layer: '支', char: p.branch }
          ],
          desc: `${p.role}干克支为「盖头」，地支${branchWx}气受天干${stemWx}抑制。`
        });
      } else if (data.WUXING_KE[branchWx] === stemWx) {
        relations.push({
          id: 'rel_' + (++relCounter),
          category: '干支',
          kind: '截脚',
          name: `${p.branch}截脚${p.stem}`,
          members: [
            { pillar: p.key, role: p.role, layer: '支', char: p.branch },
            { pillar: p.key, role: p.role, layer: '干', char: p.stem }
          ],
          desc: `${p.role}支克干为「截脚」，天干${stemWx}虚浮无力、受下克伤。`
        });
      }
    });

    // 跨柱通根与透干
    activePillars.forEach(pStem => {
      const sChar = pStem.stem;
      const sWx = data.STEM_WX[sChar];

      activePillars.forEach(pBranch => {
        const bChar = pBranch.branch;
        const hiddenList = data.HIDDEN[bChar] || [];

        hiddenList.forEach((hStem, hIdx) => {
          if (hStem === sChar) {
            const hType = data.HIDDEN_TYPE[hIdx];
            relations.push({
              id: 'rel_' + (++relCounter),
              category: '干支',
              kind: '通根透干',
              name: `${sChar}通根于${bChar}(${hType})`,
              members: [
                { pillar: pStem.key, role: pStem.role, layer: '干', char: sChar },
                { pillar: pBranch.key, role: pBranch.role, layer: '支', char: bChar }
              ],
              desc: `${pStem.role}天干「${sChar}」在${pBranch.role}「${bChar}」中见${hType}藏干「${hStem}」，得根有气。`
            });
          }
        });
      });
    });

    return relations;
  };

  MP.engine.relations = relEngine;
  return relEngine;
}));
