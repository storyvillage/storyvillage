'use client';

// ✅ [1] 태그 리스트 (기존 + 가독성 태그 추가)
export const CORE_TAGS = [
  '#사이다', '#고구마', '#빠른전개', '#느린전개', 
  '#먼치킨', '#성장형', '#지능캐', '#힘숨김', '#착각계', '#노맨스',
  '#술술읽힘', '#묵직함' 
] as const;

export const TAG_GROUPS: Record<string, string[]> = {
  '🎭 분위기/감성': ['#개그', '#유머', '#진지함', '#피폐', '#힐링', '#다크', '#통쾌함', '#감동', '#잔잔함', '#광기'],
  '🗺️ 세계관/장르': ['#현판', '#판타지', '#무협', '#선협', '#정통무협', '#퓨전무협', '#헌터물', '#탑등반', '#아카데미', '#게임빙의', '#대체역사', '#전문직', '#연예계', '#재벌', '#스포츠', '#TS', '#아포칼립스'],
  '🧱 핵심 소재': ['#회귀', '#빙의', '#환생', '#착각계', '#영지물', '#성좌물', '#복수', '#요리/먹방', '#육아물'],
  '👤 캐릭터': ['#먼치킨', '#성장형', '#지능캐', '#계략남', '#후회남', '#집착광공', '#햇살여주', '#능력녀', '#악녀', '#힘숨찐'],
  '💖 관계/로맨스': ['#하렘', '#역하렘', '#브로맨스', '#워맨스', '#순애', '#티키타카', '#계약결혼', '#삼각관계'],
  '📌 상태/기타': ['#완결', '#연재중', '#장편', '#단편', '#웹툰화', '#수상작'],
};

// ✅ [2] 8대 성분 정의 (readability 추가)
export type Taste = {
  cider: number;
  pace: number;
  dark: number;
  romance: number;
  probability: number;
  character: number;
  growth: number;
  readability: number; // 신규
  [key: string]: number; 
};

export const NEUTRAL_TASTE: Taste = { 
  cider: 50, pace: 50, dark: 50, romance: 50, 
  probability: 50, character: 50, growth: 50, readability: 50 
};

export type TrustBadge = '⚪' | '🟢' | '🟡' | '🔴';

// ✅ [3] 유틸리티 (export 전부 추가)
export function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }
export function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
export function cleanTag(t: string) { return t.replace(/^#/, '').trim(); }

export const CORE_SET = new Set(CORE_TAGS.map(cleanTag));

// ✅ [수정] 8대 성분 기반 태그 추천
export function recommendCoreTagsFromTaste(t: Taste): string[] {
  const tags: string[] = [];
  if (t.cider >= 70) tags.push('사이다');
  if (t.pace >= 70) tags.push('빠른전개');
  if (t.dark >= 70) tags.push('피폐');
  if (t.romance <= 20) tags.push('노맨스');
  if (t.growth >= 70) tags.push('성장형');
  if (t.probability >= 70) tags.push('지능캐');
  if (t.readability >= 70) tags.push('술술읽힘');
  if (t.readability <= 30) tags.push('묵직함');
  return tags.slice(0, 3);
}

export function recommendPresetFromTags(tags: string[]): { label: string; delta: Partial<Taste> } | null {
  const has = (raw: string) => tags.includes(cleanTag(raw));
  const delta: Partial<Taste> = {};
  const label: string[] = [];
  
  if (has('#사이다')) { delta.cider = (delta.cider ?? 0) + 30; label.push('사이다↑'); }
  if (has('#고구마')) { delta.cider = (delta.cider ?? 0) - 30; label.push('고구마'); }
  if (has('#빠른전개')) { delta.pace = (delta.pace ?? 0) + 30; label.push('속도↑'); }
  if (has('#술술읽힘')) { delta.readability = (delta.readability ?? 0) + 25; label.push('가독성↑'); }
  
  if (!label.length) return null;
  return { label: `⚡ ${label.join(' · ')}`, delta };
}

export function applyDelta(base: Taste, delta: Partial<Taste>): Taste {
  const out: Taste = { ...base };
  (Object.keys(delta) as (keyof Taste)[]).forEach((k) => {
    out[k] = clamp(out[k] + (delta[k] ?? 0));
  });
  return out;
}

// ✅ [에러 해결 1] 메인페이지가 'overlapped.length'를 읽을 수 있게 객체 반환
export function calcTagMatch(selected: string[], workTags: string[]) {
  const selCore = selected.filter((t) => CORE_SET.has(t));
  const selOther = selected.filter((t) => !CORE_SET.has(t));
  
  const denom = selCore.length * 2 + selOther.length * 1;
  if (denom === 0) return { tagMatch: 0, corePenalty: 0, overlapped: [] as string[] };
  
  const coreMatches = selCore.filter((t) => workTags.includes(t)).length;
  const otherMatches = selOther.filter((t) => workTags.includes(t)).length;
  
  const tagMatch = (coreMatches * 2 + otherMatches) / denom;
  const corePenalty = selCore.length > 0 && coreMatches < selCore.length ? -30 : 0;
  const overlapped = selected.filter((t) => workTags.includes(t));
  
  return { tagMatch, corePenalty, overlapped };
}

// ✅ [수정] 8차원 거리 계산
export function calcTasteMatch(userTaste: Taste, adminTaste: Taste) {
  const keys: (keyof Taste)[] = ['cider', 'pace', 'dark', 'romance', 'probability', 'character', 'growth', 'readability'];
  const mad = keys.reduce((acc: number, k) => {
    const u = userTaste[k] ?? 50;
    const a = adminTaste[k] ?? 50;
    return acc + Math.abs(u - a);
  }, 0) / keys.length;
  return clamp01(1 - mad / 100);
}

export function calcFreshBoost(dateStr?: string) {
  if (!dateStr) return 0.4;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return 0.4;
  const days = (Date.now() - t) / (1000 * 60 * 60 * 24);
  return clamp01(1 - days / 60);
}

export function trustBoostFromBadge(badge: TrustBadge) {
  if (badge === '🟢') return 1.0;
  if (badge === '🟡') return 0.6;
  if (badge === '🔴') return 0.3;
  return 0.2;
}

export function computeBadge(nVotes?: number, avgDiff?: number): TrustBadge {
  const n = nVotes ?? 0;
  const d = avgDiff ?? 999;
  if (n < 5) return '⚪';
  if (d < 15) return '🟢';
  if (d < 30) return '🟡';
  return '🔴';
}

export function badgeLabel(b: TrustBadge) {
  if (b === '🟢') return '안정';
  if (b === '🟡') return '조정중';
  if (b === '🔴') return '의견갈림';
  return '데이터부족';
}

export function badgeTone(b: TrustBadge) {
  if (b === '🟢') return 'bg-green-50 text-green-700 border-green-100';
  if (b === '🟡') return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  if (b === '🔴') return 'bg-red-50 text-red-700 border-red-100';
  return 'bg-gray-50 text-gray-500 border-gray-100';
}

// ✅ [원본] 요약 로직 유지 + 8성분 대응
export function topTasteSummary(t: Taste) {
  const traits = [
    { key: 'cider', val: t.cider, high: '🥤 사이다', low: '🍠 고구마' },
    { key: 'pace', val: t.pace, high: '⚡ 전개 빠름', low: '🐢 빌드업' },
    { key: 'dark', val: t.dark, high: '🌑 분위기 딥', low: '☀️ 힐링물' },
    { key: 'romance', val: t.romance, high: '💖 로맨스', low: '🌵 노맨스' },
    { key: 'probability', val: t.probability, high: '🧠 개연성', low: '⚡ 극적허용' },
    { key: 'character', val: t.character, high: '😈 악당형', low: '😇 선함/호구' }, 
    { key: 'growth', val: t.growth, high: '👑 완성형', low: '👶 성장형' },
    { key: 'readability', val: t.readability, high: '📖 술술', low: '📚 묵직' },
  ];
  const sorted = traits.map(item => ({ ...item, dist: Math.abs((item.val ?? 50) - 50) })).sort((a, b) => b.dist - a.dist);
  return sorted.slice(0, 3).map(item => {
    const val = item.val ?? 50;
    const isHigh = val >= 50;
    const label = isHigh ? item.high : item.low;
    const displayScore = isHigh ? val : (100 - val);
    return `${label} ${Math.round(displayScore)}%`;
  });
}