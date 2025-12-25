'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type WorkRow = {
  id: number;
  title: string;
  author?: string;
  platform?: string;
  tags: string[];
  status: 'pending'|'published'|'hidden';
  is_hidden_gem?: boolean;
};

export default function AdminWorks(){
  const router = useRouter();
  const [tab, setTab] = useState<'pending'|'published'|'hidden'>('pending');
  const [list, setList] = useState<WorkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    setMsg(null);
    const { data, error } = await supabase
      .from('works')
      .select('id,title,author,platform,tags,status,is_hidden_gem')
      .eq('status', tab)
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
      setMsg('불러오기 실패: RLS/권한 확인');
      setList([]);
    } else {
      setList((data ?? []) as any);
    }
    setLoading(false);
  };

  useEffect(()=>{ fetchList(); }, [tab]);

  const setStatus = async (id:number, status:'published'|'hidden') => {
    setMsg(null);
    const { error } = await supabase.from('works').update({ status }).eq('id', id);
    if (error) { console.error(error); setMsg('업데이트 실패'); return; }
    setMsg('업데이트 완료');
    fetchList();
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-3xl mx-auto min-h-screen border-x border-gray-50">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-50 px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-sm font-black text-gray-700">← 뒤로</button>
          <Link href="/admin" className="text-indigo-600 font-black text-lg tracking-tight">Admin</Link>
          <Link href="/" className="text-sm font-black text-gray-700">홈</Link>
        </header>

        <main className="px-6 py-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-gray-900">작품 관리</h1>
              <p className="mt-1 text-xs font-bold text-gray-400">작품 제안 승인/숨김 (간단 버전)</p>
            </div>
            <button onClick={fetchList} className="px-3 py-2 rounded-2xl bg-gray-100 text-gray-800 font-black text-sm">새로고침</button>
          </div>

          <div className="mt-5 flex gap-2">
            <TabButton active={tab==='pending'} onClick={()=>setTab('pending')}>PENDING</TabButton>
            <TabButton active={tab==='published'} onClick={()=>setTab('published')}>PUBLISHED</TabButton>
            <TabButton active={tab==='hidden'} onClick={()=>setTab('hidden')}>HIDDEN</TabButton>
          </div>

          {msg && <div className="mt-4 text-sm font-black text-gray-700">{msg}</div>}

          {loading ? (
            <div className="py-16 text-center text-gray-400 font-bold animate-pulse">로딩중…</div>
          ) : (
            <div className="mt-6 grid gap-3">
              {list.map((w) => (
                <div key={w.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-black text-gray-900 truncate">{w.title}</div>
                      <div className="mt-1 text-[11px] font-bold text-gray-400">{w.author ? `${w.author} · ` : ''}{w.platform ?? ''}{w.is_hidden_gem ? ' · 숨읽명' : ''}</div>
                    </div>
                    <div className="px-2 py-1 rounded-full text-[10px] font-black border bg-gray-50 text-gray-700 border-gray-200">{w.status}</div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(w.tags ?? []).slice(0, 8).map((t) => (
                      <span key={t} className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-700 font-black text-xs">#{t}</span>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/work/${w.id}`} className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-800 font-black text-sm">보기</Link>
                    {tab === 'pending' && (
                      <>
                        <button onClick={()=>setStatus(w.id,'published')} className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-black text-sm">승인</button>
                        <button onClick={()=>setStatus(w.id,'hidden')} className="px-4 py-2 rounded-2xl bg-gray-900 text-white font-black text-sm">숨김</button>
                      </>
                    )}
                    {tab === 'published' && (
                      <button onClick={()=>setStatus(w.id,'hidden')} className="px-4 py-2 rounded-2xl bg-gray-900 text-white font-black text-sm">숨김</button>
                    )}
                    {tab === 'hidden' && (
                      <button onClick={()=>setStatus(w.id,'published')} className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-black text-sm">복구</button>
                    )}
                  </div>
                </div>
              ))}

              {list.length === 0 && (
                <div className="mt-10 bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-8 text-center">
                  <div className="text-lg font-black text-gray-900">비어 있어요</div>
                  <div className="mt-2 text-xs font-bold text-gray-500">현재 탭에 항목이 없습니다.</div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-2xl font-black text-sm ${active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
      {children}
    </button>
  );
}
