'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ChevronLeft, Map, Zap, Gift, Filter } from 'lucide-react';
import {
  CORE_TAGS, TAG_GROUPS, NEUTRAL_TASTE, Taste,
  cleanTag, buildSearchUrl, // 옛날 이름(tasteFromSearchParams 등)은 뺍니다
  calcTagMatch, calcTasteMatch, calcFreshBoost, trustBoostFromBadge,
  computeBadge, badgeLabel, badgeTone, topTasteSummary
} from '@/lib/storyvillage';

type Work = {
  id: string | number;
  title: string;
  author?: string;
  platform?: string;
  tags: string[];
  adminTaste: Taste;
  nVotes?: number;
  avgDiff?: number;
  badge?: '⚪'|'🟢'|'🟡'|'🔴';
  createdAt?: string;
  updatedAt?: string;
};

function normalizeWork(row: any): Work {
  const rawTags = Array.isArray(row?.tags) ? row.tags : (typeof row?.tags === 'string' ? row.tags.split(',') : []);
  const tags = (rawTags ?? []).map((t: any) => cleanTag(String(t))).filter(Boolean);
  
  const s = row.stats || {};
  
  
  // ✅ 36번 줄 근처의 adminTaste 부분을 이렇게 바꾸세요
const adminTaste: Taste = {
  cider: Number(s.cider ?? row.admin_cider ?? 50),
  pace: Number(s.pace ?? row.admin_pace ?? 50),
  dark: Number(s.mood ?? row.admin_dark ?? 50),
  romance: Number(s.romance ?? row.admin_romance ?? 50),
  probability: Number(s.probability ?? row.admin_probability ?? 50), // 추가
  character: Number(s.character ?? row.admin_character ?? 50), // 추가
  growth: Number(s.growth ?? row.admin_growth ?? 50), // 추가
};
  
  const nVotes = Number(row?.n_votes ?? 0) || 0;
  const avgDiff = Number(row?.avg_diff ?? 0) || 0;
  const badge = (row?.badge as any) ?? computeBadge(nVotes, avgDiff);
  
  return {
    id: row?.id ?? crypto.randomUUID(),
    title: String(row?.title ?? '제목 없음'),
    author: row?.author ?? '',
    platform: row?.platform ?? '',
    tags,
    adminTaste,
    nVotes,
    avgDiff,
    badge,
    createdAt: row?.created_at,
    updatedAt: row?.updated_at,
  };
}

export default function SearchPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const tags = useMemo(() => parseTagsParam(sp.get('tags')), [sp]);
  const taste = useMemo(() => tasteFromSearchParams(new URLSearchParams(sp.toString())), [sp]);

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
      const finalScore = baseScore * 100 + corePenalty;
      return { work: w, meta: { finalScore, overlapped, tasteMatch, tagMatch } };
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
          <div className="flex gap-2">
            <Link href="/dna" className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black"><Map size={12}/> DNA</Link>
            {/* 무료 버튼 삭제됨 */}
          </div>
        </header>

        <main className="px-6 py-6">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-6 bg-gray-50 p-3 rounded-2xl">
            <Filter size={14} className="text-indigo-500"/>
            <span className="truncate">
              {tags.length ? tags.map((t)=>`#${t}`).join(' ') : '태그 없음'} ·
              사이다 {taste.cider}% 전개 {taste.pace}%
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-400 font-bold animate-pulse">데이터 찾는 중...</div>
          ) : scored.length === 0 ? (
            <div className="py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center">
              <p className="text-gray-400 font-bold mb-2">조건에 딱 맞는 작품이 없네요 😢</p>
              <button onClick={() => router.back()} className="text-indigo-600 text-sm font-black underline">조건을 조금 넓혀볼까요?</button>
            </div>
          ) : (
            <div className="grid gap-4">
              {scored.map(({ work, meta }) => {
                const tone = badgeTone(work.badge ?? '⚪');
                const label = badgeLabel(work.badge ?? '⚪');

                return (
                  <div key={String(work.id)} onClick={() => router.push(`/work/${work.id}`)} className="bg-white border border-gray-100 rounded-[24px] p-6 hover:border-indigo-100 hover:shadow-lg transition-all cursor-pointer relative group">
                    <div className={`absolute top-5 right-5 px-2 py-0.5 rounded-full text-[9px] font-black border ${tone}`}>
                      {work.badge} {label}
                    </div>
                    <div className="pr-16 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-gray-400">{work.author || '작가 미상'}</span>
                      </div>
                      <h3 className="text-lg font-black text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">{work.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {topTasteSummary(work.adminTaste).map((t, i) => (
                        <span key={i} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-black">{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-50">
                      <div className="flex gap-1">
                        {work.tags.slice(0, 3).map(t => <span key={t} className="text-[10px] text-gray-400">#{t}</span>)}
                      </div>
                      <div className="text-[11px] font-black text-indigo-500 flex items-center gap-1">
                        <Zap size={12}/> 일치도 {Math.round(meta.finalScore)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}