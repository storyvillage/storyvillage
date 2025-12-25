'use client';

// ✅ 1. Suspense를 불러오도록 추가했습니다.
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ChevronLeft, Map, Zap, Gift, Filter } from 'lucide-react';
import {
  CORE_TAGS, TAG_GROUPS, NEUTRAL_TASTE, Taste,
  cleanTag, buildSearchUrl,
  calcTagMatch, calcTasteMatch, calcFreshBoost, trustBoostFromBadge,
  computeBadge, badgeLabel, badgeTone, topTasteSummary
} from '@/lib/storyvillage';

type Work = {
  id: string | number; title: string; author?: string; platform?: string;
  tags: string[]; adminTaste: Taste; nVotes?: number; avgDiff?: number;
  badge?: '⚪'|'🟢'|'🟡'|'🔴'; createdAt?: string; updatedAt?: string;
};

function normalizeWork(row: any): Work {
  const rawTags = Array.isArray(row?.tags) ? row.tags : (typeof row?.tags === 'string' ? row.tags.split(',') : []);
  const tags = (rawTags ?? []).map((t: any) => cleanTag(String(t))).filter(Boolean);
  const s = row.stats || {};
  
  const adminTaste: Taste = {
    cider: Number(s.cider ?? row.admin_cider ?? 50),
    pace: Number(s.pace ?? row.admin_pace ?? 50),
    dark: Number(s.mood ?? row.admin_dark ?? 50),
    romance: Number(s.romance ?? row.admin_romance ?? 50),
    probability: Number(s.probability ?? row.admin_probability ?? 50),
    character: Number(s.character ?? row.admin_character ?? 50),
    growth: Number(s.growth ?? row.admin_growth ?? 50),
  };
  
  return {
    id: row?.id ?? crypto.randomUUID(),
    title: String(row?.title ?? '제목 없음'),
    author: row?.author ?? '',
    platform: row?.platform ?? '',
    tags, adminTaste,
    nVotes: Number(row?.n_votes ?? 0),
    avgDiff: Number(row?.avg_diff ?? 0),
    badge: (row?.badge as any) ?? computeBadge(Number(row?.n_votes ?? 0), Number(row?.avg_diff ?? 0)),
    createdAt: row?.created_at, updatedAt: row?.updated_at,
  };
}

// ✅ 2. 실제 검색 화면을 그리는 보따리(SearchForm)입니다.
function SearchForm() {
  const router = useRouter();
  const sp = useSearchParams(); // ⬅️ 보호막이 필요한 주범입니다!

  const tags = useMemo(() => {
    const p = sp.get('tags');
    return p ? decodeURIComponent(String(p)).split(',').filter(Boolean) : [];
  }, [sp]);

  const taste = useMemo(() => ({ ...NEUTRAL_TASTE }), []);

  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('works').select('*').in('status',['published','pending']).limit(500);
      if (error) { console.error(error); setWorks([]); setLoading(false); return; }
      setWorks((data ?? []).map(normalizeWork));
      setLoading(false);
    })();
  }, [sp.toString()]);

  const scored = useMemo(() => {
    const list = works.map((w) => {
      const { tagMatch, corePenalty, overlapped } = calcTagMatch(tags, w.tags);
      const tasteMatch = calcTasteMatch(taste, w.adminTaste);
      const trust = trustBoostFromBadge(w.badge ?? '⚪');
      const fresh = calcFreshBoost(w.updatedAt ?? w.createdAt);
      const baseScore = tasteMatch * 0.55 + tagMatch * 0.30 + trust * 0.10 + fresh * 0.05;
      return { work: w, meta: { finalScore: baseScore * 100 + corePenalty, overlapped, tasteMatch, tagMatch } };
    });
    list.sort((a,b)=>b.meta.finalScore-a.meta.finalScore);
    return list;
  }, [works, tags, taste]);

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="max-w-3xl mx-auto min-h-screen bg-white relative">
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur px-6 py-4 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-all"><ChevronLeft size={24}/></button>
            <Link href="/" className="text-indigo-600 font-black text-lg tracking-tight">StoryVillage</Link>
          </div>
        </header>
        <main className="px-6 py-6">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-6 bg-gray-50 p-3 rounded-2xl">
            <Filter size={14} className="text-indigo-500"/>
            <span className="truncate">
              {tags.length ? tags.map((t)=>`#${t}`).join(' ') : '태그 없음'} · 사이다 {taste.cider}% 전개 {taste.pace}%
            </span>
          </div>
          {loading ? (
            <div className="py-20 text-center text-gray-400 font-bold animate-pulse">데이터 찾는 중...</div>
          ) : (
            <div className="grid gap-4">
              {scored.map(({ work, meta }) => (
                <div key={String(work.id)} onClick={() => router.push(`/work/${work.id}`)} className="bg-white border border-gray-100 rounded-[24px] p-6 hover:border-indigo-100 hover:shadow-lg transition-all cursor-pointer relative group">
                  <h3 className="text-lg font-black text-gray-900 group-hover:text-indigo-600 leading-tight">{work.title}</h3>
                  <div className="text-[11px] font-black text-indigo-500 mt-2 flex items-center gap-1"><Zap size={12}/> 일치도 {Math.round(meta.finalScore)}%</div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ✅ 3. 여기가 핵심! 보따리를 보호막(Suspense)으로 감싸서 내보냅니다.
export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-black text-gray-300 animate-pulse">검색 마을 비서가 조립 중... 👷</div>}>
      <SearchForm />
    </Suspense>
  );
}