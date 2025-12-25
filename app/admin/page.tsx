'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert('로그인이 필요합니다.'); router.replace('/login'); return; }

    // 레벨 9 체크
    const { data: profile } = await supabase.from('profiles').select('level').eq('id', session.user.id).single();
    
    if (!profile || profile.level < 9) {
      alert('🚫 접근 권한이 없습니다. (관리자 전용)');
      router.replace('/');
      return;
    }

    setIsAdmin(true);
    fetchPendingWorks();
  };

  const fetchPendingWorks = async () => {
    setLoading(true);
    // status가 'pending'인 것만 가져오기
    const { data, error } = await supabase.from('works')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setWorks(data || []);
    setLoading(false);
  };

  // [승인] status -> 'published'
  const approve = async (id: number, title: string) => {
    if (!confirm(`[${title}] 작품을 승인하시겠습니까?`)) return;
    
    const { error } = await supabase.from('works').update({ status: 'published' }).eq('id', id);
    if (error) alert('승인 실패!');
    else {
      alert('✅ 승인 완료! 메인에 노출됩니다.');
      fetchPendingWorks(); // 리스트 새로고침
    }
  };

  // [거절] 아예 삭제 (또는 status='rejected'로 남겨도 됨)
  const reject = async (id: number) => {
    if (!confirm('정말 삭제(거절)하시겠습니까? 복구 불가!')) return;

    const { error } = await supabase.from('works').delete().eq('id', id);
    if (error) alert('삭제 실패!');
    else {
      fetchPendingWorks();
    }
  };

  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">권한 확인 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-3xl mx-auto min-h-screen bg-white border-x border-gray-100">
        <header className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
          <ShieldCheck className="text-indigo-600" />
          <h1 className="font-black text-xl text-gray-900">촌장 집무실 (관리자)</h1>
        </header>

        <main className="p-6">
          <h2 className="font-bold text-gray-500 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} /> 제보 대기열 ({works.length})
          </h2>

          {loading ? (
            <div className="text-center py-10 text-gray-400">로딩 중...</div>
          ) : works.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 font-bold">
              🎉 처리할 제보가 없습니다!
            </div>
          ) : (
            <div className="space-y-4">
              {works.map((w) => (
                <div key={w.id} className="p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-1.5 py-0.5 rounded">PENDING</span>
                        <span className="text-xs text-gray-400 font-bold">{new Date(w.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-lg font-black text-gray-900">{w.title}</h3>
                      <p className="text-xs font-bold text-gray-500">{w.author} · {w.platform || '플랫폼 미정'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approve(w.id, w.title)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="승인">
                        <CheckCircle size={20} />
                      </button>
                      <button onClick={() => reject(w.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors" title="거절(삭제)">
                        <XCircle size={20} />
                      </button>
                    </div>
                  </div>

                  {/* 태그 및 성분 정보 미리보기 */}
                  <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {w.tags?.map((t: string) => (
                        <span key={t} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-bold">#{t}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-[9px] font-bold text-gray-400 text-center">
                      <div>🍠 {w.stats?.cider ?? 50}</div>
                      <div>⚡ {w.stats?.pace ?? 50}</div>
                      <div>🌑 {w.stats?.mood ?? 50}</div>
                      <div>💖 {w.stats?.romance ?? 50}</div>
                      <div>🧠 {w.stats?.probability ?? 50}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}