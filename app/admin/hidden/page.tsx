'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type WorkRow = {
  id: number;
  title: string;
  author?: string;
  platform?: string;
  tags: string[];
  status?: string;
};

type GemRow = {
  id: number;
  one_liner: string;
  curator_note?: string;
  status: 'pending' | 'published' | 'hidden';
  created_at: string;
  work: WorkRow;
};

export default function AdminHidden() {
  const router = useRouter();
  const [tab, setTab] = useState<'pending'|'published'|'hidden'>('pending');
  const [list, setList] = useState<GemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [alsoPublishWork, setAlsoPublishWork] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    setMsg(null);
    const { data, error } = await supabase
      .from('hidden_gems')
      .select('id, one_liner, curator_note, status, created_at, work:works(id,title,author,platform,tags,status)')
      .eq('status', tab)
      .order('created_at', { ascending: false })
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

  useEffect(() => { fetchList(); }, [tab]);

  const approve = async (g: GemRow) => {
    setMsg(null);
    const { error: e1 } = await supabase.from('hidden_gems').update({ status: 'published' }).eq('id', g.id);
    if (e1) { console.error(e1); setMsg('승인 실패'); return; }
    // sync work flag (+ optional publish)
const workPatch: any = { is_hidden_gem: true };
if (alsoPublishWork) workPatch.status = 'published';
const { error: e2 } = await supabase.from('works').update(workPatch).eq('id', g.work.id);
if (e2) console.warn(e2);
setMsg('승인 완료');
    fetchList();
  };

  const hide = async (g: GemRow) => {
    setMsg(null);
    const { error } = await supabase.from('hidden_gems').update({ status: 'hidden' }).eq('id', g.id);
    if (error) { console.error(error); setMsg('숨김 실패'); return; }
    setMsg('숨김 처리 완료');
    fetchList();
  };

  const unhide = async (g: GemRow) => {
    setMsg(null);
    const { error } = await supabase.from('hidden_gems').update({ status: 'published' }).eq('id', g.id);
    if (error) { console.error(error); setMsg('복구 실패'); return; }
    const { error: e2 } = await supabase.from('works').update({ is_hidden_gem: true }).eq('id', g.work.id);
    if (e2) console.warn(e2);
    setMsg('복구 완료');
    fetchList();
  };

  const revoke = async (g: GemRow) => {
    // remove gem flag from work only if no other published gems reference it (normally unique anyway)
    setMsg(null);
    const { error } = await supabase.from('hidden_gems').delete().eq('id', g.id);
    if (error) { console.error(error); setMsg('삭제 실패'); return; }
    // best-effort: unset work flag if there is no published gem for this work
    const { data } = await supabase.from('hidden_gems').select('id').eq('work_id', g.work.id).eq('status','published').limit(1);
    if (!data || data.length === 0) {
      await supabase.from('works').update({ is_hidden_gem: false }).eq('id', g.work.id);
    }
    setMsg('삭제 완료');
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
              <h1 className="text-xl font-black text-gray-900">숨읽명 승인</h1>
              <p className="mt-1 text-xs font-bold text-gray-400">PENDING 제보를 빠르게 게시/숨김</p>
            </div>
            <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-black text-gray-600 select-none">
  <input
    type="checkbox"
    checked={alsoPublishWork}
    onChange={(e) => setAlsoPublishWork(e.target.checked)}
  />
  승인 시 작품도 published로 승격
</label>
            <button onClick={fetchList} className="px-3 py-2 rounded-2xl bg-gray-100 text-gray-800 font-black text-sm">새로고침</button>
          </div>
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
              {list.map((g) => (
                <div key={g.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-black text-gray-900 truncate">{g.work.title}</div>
                      <div className="mt-1 text-[11px] font-bold text-gray-400">{g.work.author ? `${g.work.author} · ` : ''}{g.work.platform ?? ''}</div>
                    </div>
                    <div className="px-2 py-1 rounded-full text-[10px] font-black border bg-gray-50 text-gray-700 border-gray-200">{g.status}</div>
                  </div>

                  <div className="mt-3 text-sm font-bold text-gray-700">{g.one_liner}</div>
                  {g.curator_note && <div className="mt-2 text-xs font-bold text-gray-500 whitespace-pre-line">{g.curator_note}</div>}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(g.work.tags ?? []).slice(0, 6).map((t) => (
                      <span key={t} className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-700 font-black text-xs">#{t}</span>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/hidden/${g.id}`} className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-800 font-black text-sm">보기</Link>
                    <Link href={`/work/${g.work.id}`} className="px-4 py-2 rounded-2xl bg-white border border-gray-200 text-gray-800 font-black text-sm">작품</Link>

                    {tab === 'pending' && (
                      <>
                        <button onClick={() => approve(g)} className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-black text-sm">{alsoPublishWork ? '게시+작품승격' : '게시'}</button>
                        <button onClick={() => hide(g)} className="px-4 py-2 rounded-2xl bg-gray-900 text-white font-black text-sm">숨김</button>
                      </>
                    )}
                    {tab === 'published' && (
                      <>
                        <button onClick={() => hide(g)} className="px-4 py-2 rounded-2xl bg-gray-900 text-white font-black text-sm">숨김</button>
                        <button onClick={() => revoke(g)} className="px-4 py-2 rounded-2xl bg-white border border-red-200 text-red-600 font-black text-sm">삭제</button>
                      </>
                    )}
                    {tab === 'hidden' && (
                      <>
                        <button onClick={() => unhide(g)} className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-black text-sm">복구</button>
                        <button onClick={() => revoke(g)} className="px-4 py-2 rounded-2xl bg-white border border-red-200 text-red-600 font-black text-sm">삭제</button>
                      </>
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
