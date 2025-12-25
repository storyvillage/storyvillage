'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  User, LogOut, Bookmark, BarChart3, ChevronRight, Trophy, Award, CheckCircle2
} from 'lucide-react';

export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<any>(null);
  const [myPicks, setMyPicks] = useState<any[]>([]); 
  const [myVotes, setMyVotes] = useState<any[]>([]); 

  const getLevelTitle = (level: number) => {
    if (level >= 7) return "👑 촌장 (마스터)";
    if (level >= 6) return "🎩 편집자";
    if (level >= 5) return "🧐 큐레이터";
    if (level >= 4) return "🦅 감별자";
    if (level >= 3) return "🔭 분류자";
    if (level >= 2) return "🏠 주민";
    return "🎒 나그네";
  };

  useEffect(() => {
    fetchMyData();
  }, []);

  const fetchMyData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert("로그인이 필요합니다.");
      router.push('/login');
      return;
    }

    const userId = session.user.id;

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(profileData);

    const { data: pickData } = await supabase.from('work_likes').select(`created_at, works (id, title, author, work_type, tags)`).eq('user_id', userId).order('created_at', { ascending: false });
    if (pickData) setMyPicks(pickData.map((item: any) => item.works));

    const { data: voteData } = await supabase.from('work_stats_votes').select(`created_at, works (id, title)`).eq('user_id', userId).order('created_at', { ascending: false });
    if (voteData) setMyVotes(voteData.map((item: any) => item.works));

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center font-bold text-gray-400">내 정보 불러오는 중...</div>;

  // 다음 레벨 계산 (단순화)
  const nextLevel = (profile?.level || 1) + 1;
  const progressPercent = Math.min(100, ((profile?.vote_count || 0) / (nextLevel * 10)) * 100); 

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-3xl mx-auto min-h-screen bg-white border-x border-gray-100">
        
        <header className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-50">
          <h1 className="text-xl font-black text-gray-900">마이 페이지</h1>
          <button onClick={handleLogout} className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-1">
            <LogOut size={14}/> 로그아웃
          </button>
        </header>

        <main className="px-6">
          
          {/* 1. 프로필 카드 */}
          <section className="mt-4 mb-8">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
              <div className="relative z-10 flex items-center gap-5">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                  <User size={32} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-yellow-400 text-indigo-900 text-[10px] font-black px-2 py-0.5 rounded-full">Lv.{profile?.level || 1}</span>
                    <span className="text-sm font-bold text-indigo-200">{getLevelTitle(profile?.level || 1)}</span>
                  </div>
                  <h2 className="text-2xl font-black">{profile?.nickname || '주민'}님</h2>
                </div>
              </div>

              {/* [피드백 반영] 다음 레벨 진행도 */}
              <div className="relative z-10 mt-6 mb-2">
                <div className="flex justify-between text-[10px] font-bold text-indigo-200 mb-1">
                  <span>현재 기여도</span>
                  <span>Lv.{nextLevel} 승급까지 {100 - Math.round(progressPercent)}%</span>
                </div>
                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{width: `${progressPercent}%`}}></div>
                </div>
              </div>

              {/* [피드백 반영] 기여 대시보드 */}
              <div className="relative z-10 mt-6 flex gap-3">
                <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur-sm border border-white/10 text-center">
                  <div className="text-[10px] font-bold text-indigo-200 mb-1">승인된 태그</div>
                  <div className="text-xl font-black flex justify-center items-center gap-1">
                    <CheckCircle2 size={14} className="text-green-400"/> {profile?.approved_tag_count || 0}
                  </div>
                </div>
                <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur-sm border border-white/10 text-center">
                  <div className="text-[10px] font-bold text-indigo-200 mb-1">투표 참여</div>
                  <div className="text-xl font-black flex justify-center items-center gap-1">
                    <BarChart3 size={14} className="text-pink-300"/> {profile?.vote_count || 0}
                  </div>
                </div>
                <div className="flex-1 bg-white/10 rounded-2xl p-3 backdrop-blur-sm border border-white/10 text-center">
                  <div className="text-[10px] font-bold text-indigo-200 mb-1">보유 포인트</div>
                  <div className="text-xl font-black flex justify-center items-center gap-1">
                    <Trophy size={14} className="text-yellow-400"/> {profile?.points || 0}
                  </div>
                </div>
              </div>

              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/50 rounded-full blur-3xl"></div>
            </div>
          </section>

          {/* 2. 내 서재 */}
          <section className="mb-10">
            <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Bookmark className="text-indigo-600" size={20}/> 내 보관함 <span className="text-gray-400 text-sm font-normal">({myPicks.length})</span>
            </h3>
            
            {myPicks.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm font-bold mb-3">아직 찜한 작품이 없어요.</p>
                <button onClick={() => router.push('/')} className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-indigo-600 shadow-sm">작품 구경하러 가기</button>
              </div>
            ) : (
              <div className="space-y-3">
                {myPicks.map((work: any) => (
                  <div key={work.id} onClick={() => router.push(`/work/${work.id}`)} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                         <span className="text-[10px] font-bold text-gray-400">{work.work_type === 'novel' ? '📖 웹소설' : '🖥️ 웹툰'}</span>
                         <span className="text-[10px] font-bold text-gray-300">| {work.author}</span>
                       </div>
                       <h4 className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{work.title}</h4>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-600"/>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. 분석 내역 */}
          <section className="mb-10">
            <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="text-gray-400" size={20}/> 내가 분석한 작품 <span className="text-gray-400 text-sm font-normal">({myVotes.length})</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {myVotes.map((work: any) => (
                <button key={work.id} onClick={() => router.push(`/work/${work.id}`)} className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                  {work.title}
                </button>
              ))}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}