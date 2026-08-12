/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchoolApplication } from '../types';

export const getQsRank = (schoolName: string): number => {
  if (!schoolName) return 999;
  const name = schoolName.toLowerCase();

  const directMatch = schoolName.match(/(?:qs|#)\s*(\d+)/i);
  if (directMatch) {
    const parsed = parseInt(directMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 1000) return parsed;
  }

  if (name.includes('麻省理工') || name.includes('mit')) return 1;
  if (name.includes('帝国理工') || name.includes('imperial')) return 2;
  if (name.includes('牛津') || name.includes('oxford')) return 3;
  if (name.includes('哈佛') || name.includes('harvard')) return 4;
  if (name.includes('剑桥') || name.includes('cambridge')) return 5;
  if (name.includes('斯坦福') || name.includes('stanford')) return 6;
  if (name.includes('苏黎世联邦') || name.includes('eth')) return 7;
  if (name.includes('新加坡国立') || name.includes('nus') || name.includes('national university of singapore')) return 8;
  if (name.includes('伦敦大学学院') || name.includes('ucl')) return 9;
  if (name.includes('加州理工') || name.includes('caltech')) return 10;
  if (name.includes('宾夕法尼亚') || name.includes('upenn') || name.includes('penn')) return 11;
  if (name.includes('加州伯克利') || name.includes('berkeley')) return 12;
  if (name.includes('墨尔本') || name.includes('melbourne')) return 13;
  if (name.includes('南洋理工') || name.includes('ntu') || name.includes('nanyang')) return 15;
  if (name.includes('康奈尔') || name.includes('cornell')) return 16;
  if (name.includes('香港大学') || name.includes('hku') || name.includes('university of hong kong')) return 17;
  if (name.includes('悉尼') || name.includes('sydney')) return 18;
  if (name.includes('新南威尔士') || name.includes('unsw')) return 19;
  if (name.includes('普林斯顿') || name.includes('princeton')) return 22;
  if (name.includes('耶鲁') || name.includes('yale')) return 23;
  if (name.includes('爱丁堡') || name.includes('edinburgh')) return 27;
  if (name.includes('卡内基梅隆') || name.includes('cmu') || name.includes('carnegie')) return 28;
  if (name.includes('慕尼黑工业') || name.includes('tum')) return 28;
  if (name.includes('曼彻斯特') || name.includes('manchester')) return 34;
  if (name.includes('香港中文') || name.includes('cuhk')) return 36;
  if (name.includes('国王学院') || name.includes('kcl') || name.includes("king's college")) return 40;
  if (name.includes('香港科技') || name.includes('hkust')) return 47;
  if (name.includes('伦敦政治经济') || name.includes('lse')) return 50;
  if (name.includes('香港理工') || name.includes('polyu')) return 57;
  if (name.includes('米兰理工') || name.includes('politecnico di milano')) return 111;
  if (name.includes('南加州') || name.includes('usc') || name.includes('southern california')) return 116;
  if (name.includes('皇家艺术') || name.includes('rca') || name.includes('royal college of art')) return 1;
  if (name.includes('伦敦艺术') || name.includes('ual') || name.includes('arts london')) return 2;
  if (name.includes('帕森斯') || name.includes('parsons')) return 3;
  if (name.includes('罗德岛') || name.includes('risd')) return 4;
  if (name.includes('澳门大学') || name.includes('macau')) return 245;

  return 999;
};

export const getCountryPriority = (country: string, schoolName: string): number => {
  const c = (country || '').toLowerCase().trim();
  const s = (schoolName || '').toLowerCase().trim();

  // 1. 美国
  if (c.includes('美国') || c === '美' || c === 'us' || c === 'usa' || c.includes('united states') ||
      s.includes('cmu') || s.includes('usc') || s.includes('加州') || s.includes('斯坦福') || s.includes('哈佛') || s.includes('麻省理工') || s.includes('宾夕法尼亚') || s.includes('普林斯顿') || s.includes('耶鲁') || s.includes('康奈尔') || s.includes('帕森斯') || s.includes('罗德岛')) {
    return 1;
  }
  // 2. 加拿大
  if (c.includes('加拿大') || c === '加' || c.includes('canada') || s.includes('多伦多') || s.includes('麦吉尔') || s.includes('滑铁卢')) {
    return 2;
  }
  // 3. 英国
  if (c.includes('英国') || c === '英' || c === 'uk' || c.includes('united kingdom') || s.includes('牛津') || s.includes('剑桥') || s.includes('帝国理工') || s.includes('ucl') || s.includes('爱丁堡') || s.includes('曼彻斯特') || s.includes('kcl') || s.includes('rca') || s.includes('ual')) {
    return 3;
  }
  // 4. 欧洲国家
  if (c.includes('欧洲') || c.includes('瑞士') || c.includes('德国') || c.includes('法国') || c.includes('荷兰') || c.includes('意大利') || c.includes('瑞典') || c.includes('丹麦') || c.includes('芬兰') || c.includes('挪威') || c.includes('比利时') || c.includes('西班牙') || c.includes('爱尔兰') || c.includes('奥地利') || s.includes('eth') || s.includes('米兰理工') || s.includes('tum')) {
    return 4;
  }
  // 5. 新加坡
  if (c.includes('新加坡') || c.includes('singapore') || s.includes('nus') || s.includes('ntu') || s.includes('新加坡国立') || s.includes('南洋理工')) {
    return 5;
  }
  // 6. 香港
  if (c.includes('香港') || c.includes('hong kong') || c === 'hk' || s.includes('hku') || s.includes('cuhk') || s.includes('hkust') || s.includes('polyu') || s.includes('港大')) {
    return 6;
  }
  // 7. 澳门
  if (c.includes('澳门') || c.includes('macau') || s.includes('澳门大学')) {
    return 7;
  }
  // 8. 澳大利亚
  if (c.includes('澳大利亚') || c.includes('澳洲') || c.includes('australia') || s.includes('墨尔本') || s.includes('悉尼') || s.includes('unsw')) {
    return 8;
  }
  // 9. 新西兰
  if (c.includes('新西兰') || c.includes('new zealand') || s.includes('奥克兰')) {
    return 9;
  }

  return 99;
};

export const sortSchoolApplications = (apps: SchoolApplication[]): SchoolApplication[] => {
  if (!apps || apps.length === 0) return [];

  return [...apps].sort((a, b) => {
    const hasOrderA = typeof a.displayOrder === 'number' && !isNaN(a.displayOrder) && a.displayOrder > 0;
    const hasOrderB = typeof b.displayOrder === 'number' && !isNaN(b.displayOrder) && b.displayOrder > 0;

    if (hasOrderA && hasOrderB) {
      if (a.displayOrder !== b.displayOrder) {
        return (a.displayOrder!) - (b.displayOrder!);
      }
    } else if (hasOrderA) {
      return -1;
    } else if (hasOrderB) {
      return 1;
    }

    // 1. Country Priority
    const countryPriorityA = getCountryPriority(a.country, a.schoolName);
    const countryPriorityB = getCountryPriority(b.country, b.schoolName);
    if (countryPriorityA !== countryPriorityB) {
      return countryPriorityA - countryPriorityB;
    }

    // 2. QS Rank
    const rankA = getQsRank(a.schoolName);
    const rankB = getQsRank(b.schoolName);
    return rankA - rankB;
  });
};
