'use client';

// 👇 배포 에러 방지
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ChevronLeft, Share2, Heart, BookOpen, 
  BarChart3, Monitor, Send, User, Plus, X, Copy, MessageCircle,
  AlertCircle, CheckCircle2, Tag, PenLine, Search, Sparkles
} from 'lucide-react';

// ✅ 라이브러리 import
import { 
  Taste, cleanTag, computeBadge, badgeLabel, badgeTone, 
  CORE_TAGS, TAG_GROUPS 
} from '@/lib/storyvillage'; 

export default function WorkDetail() {
  const { id } = useParams();
  const router = useRouter();
  
  // --- [상태 관리] ---
  const [work, setWork] = useState<any>(null);
  const [tags, setTags] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  
  // 유저 정보
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // 태그 추가 모드
  const [isAddingTag, setIsAddingTag] = useState(false);
  
  // 공유 모달
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // --- [핵심] 성분 분석 상태 (8개로 확장) ---
  const [userVotes, setUserVotes] = useState<any[]>([]); 
  const [userStats, setUserStats] = useState<any>(null); 
  const [myVote, setMyVote] = useState<any>(null);       
  const [isVoting, setIsVoting] = useState(false);       
  
  // ✅ [수정] readability 추가
  const [inputStats, setInputStats] = useState<Taste>({         
    cider: 50, pace: 50, dark: 50, romance: 50, 
    probability: 50, character: 50, growth: 50, readability: 50 
  });
  const [reviewText, setReviewText] = useState(''); 

  // ✅ [수정] 8대 성분 설정 (가독성 추가)
  const statConfig = [
    { key: 'readability', label: '묵직함 📚', label2: '📖 술술읽힘', color: 'bg-emerald-500', accent: 'accent-emerald-500' },
    { key: 'cider', label: '고구마 🍠', label2: '🥤 사이다', color: 'bg-indigo-500', accent: 'accent-indigo-500' },
    { key: 'pace', label: '전개 느림 🐢', label2: '⚡ 빠름', color: 'bg-blue-500', accent: 'accent-blue-500' },
    { key: 'dark', label: '힐링 ☀️', label2: '🌑 피폐/딥', color: 'bg-gray-500', accent: 'accent-gray-500' },
    { key: 'romance', label: '노맨스 🌵', label2: '💖 로맨스', color: 'bg-pink-500', accent: 'accent-pink-500' },
    { key: 'probability', label: '극적허용 ⚡', label2: '🧠 개연성', color: 'bg-purple-500', accent: 'accent-purple-500' },
    { key: 'character', label: '선함/호구 😇', label2: '😈 악당형', color: 'bg-red-500', accent: 'accent-red-500' },
    { key: 'growth', label: '성장형 👶', label2: '👑 완성형', color: 'bg-yellow-500', accent: 'accent-yellow-500' },
  ];

  // 1. 데이터 가져오기
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);

    // 1-1. 작품 정보
    const { data: workData } = await supabase.from('works').select('*').eq('id', id).single();
    if (workData) {
        // ✅ [수정] 8대 성분 매핑
        const s = workData.stats || {};
        workData.adminTaste = {
            cider: Number(s.cider ?? workData.admin_cider ?? 50),
            pace: Number(s.pace ?? workData.admin_pace ?? 50),
            dark: Number(s.mood ?? workData.admin_dark ?? 50),
            romance: Number(s.romance ?? workData.admin_romance ?? 50),
            probability: Number(s.probability ?? workData.admin_probability ?? 50),
            character: Number(s.character ?? workData.admin_character ?? 50),
            growth: Number(s.growth ?? workData.admin_growth ?? 50),
            readability: Number(s.readability ?? workData.admin_readability ?? 50), // 신규
        };

        // 태그 안전 변환
        if (typeof workData.tags === 'string') {
            try {
                workData.tags = JSON.parse(workData.tags);
            } catch {
                workData.tags = workData.tags.split(',').map((t: string) => t.trim());
            }
        }
        
        setWork(workData);
    }

    // 1-2. 태그 정보
    const { data: tagData } = await supabase.from('work_tags').select('*').eq('work_id', id).order('vote_count', { ascending: false });
    if (tagData) setTags(tagData.map(t => ({ ...t, voted: false })));

    // 1-3. 유저 프로필 & 찜하기
    if (session?.user) {
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (pData) setProfile(pData);
      
      const { data: likeData } = await supabase.from('work_likes').select('*').eq('work_id', id).eq('user_id', session.user.id).single();
      if (likeData) setIsLiked(true);
    }

    // 1-4. 투표 데이터
    const { data: votesData } = await supabase.from('work_stats_votes').select('*').eq('work_id', id);
    if (votesData) {
      setUserVotes(votesData);
      calculateUserStats(votesData);

      if (session?.user) {
        const my = votesData.find(v => v.user_id === session.user.id);
        if (my) {
          setMyVote(my);
          setInputStats({
              cider: my.stats.cider ?? 50,
              pace: my.stats.pace ?? 50,
              dark: my.stats.dark ?? my.stats.mood ?? 50,
              romance: my.stats.romance ?? 50,
              probability: my.stats.probability ?? 50,
              character: my.stats.character ?? 50,
              growth: my.stats.growth ?? 50,
              readability: my.stats.readability ?? 50, // 신규
          }); 
        }
      }
    }

    // 1-5. 댓글
    const { data: commentData } = await supabase.from('comments').select('*').eq('work_id', id).order('created_at', { ascending: false });
    if (commentData) setComments(commentData);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // 2. 유저 평균 계산
  const calculateUserStats = (votes: any[]) => {
    if (!votes || votes.length === 0) {
      setUserStats(null);
      return;
    }
    // ✅ [수정] readability 키 추가
    const keys = ['cider', 'pace', 'dark', 'romance', 'probability', 'character', 'growth', 'readability'];
    const result: any = {};

    keys.forEach(key => {
      const values = votes.map(v => {
          if (key === 'dark') return v.stats?.dark ?? v.stats?.mood ?? 50;
          return v.stats?.[key] ?? 50;
      }); 
      const sum = values.reduce((a, b) => a + b, 0);
      result[key] = Math.round(sum / values.length);
    });
    setUserStats(result);
  };

  // 3. 신뢰도 배지 판정
  const getBadgeStatus = () => {
    const n = userVotes.length;
    if (n < 5) return { label: '데이터 수집중', color: 'text-white/60 bg-white/10', icon: AlertCircle };

    let totalDiff = 0;
    const keys = ['cider', 'pace', 'dark', 'romance', 'probability', 'character', 'growth', 'readability'];
    
    if (!work?.adminTaste) return { label: '분석 대기', color: 'text-white/60 bg-white/10', icon: AlertCircle };

    keys.forEach(key => {
      if (userStats && userStats[key] !== undefined) {
        totalDiff += Math.abs(work.adminTaste[key] - userStats[key]);
      }
    });
    const avgDiff = totalDiff / 8; 

    if (avgDiff < 15) return { label: '신뢰도 높음', color: 'text-green-300 bg-green-900/30 border-green-500/30', icon: CheckCircle2 };
    if (avgDiff < 30) return { label: '의견 조정중', color: 'text-yellow-300 bg-yellow-900/30 border-yellow-500/30', icon: AlertCircle };
    return { label: '의견 갈림', color: 'text-red-300 bg-red-900/30 border-red-500/30', icon: AlertCircle };
  };

  // 4. 핸들러들
  const handleTogglePick = async () => {
    if (!user) { alert("로그인이 필요합니다! 🔐"); return; }
    if (isLiked) {
      const { error } = await supabase.from('work_likes').delete().eq('work_id', id).eq('user_id', user.id);
      if (!error) setIsLiked(false);
    } else {
      const { error } = await supabase.from('work_likes').insert([{ work_id: id, user_id: user.id }]);
      if (!error) setIsLiked(true);
    }
  };

  const handleVoteTag = async (tagId: number, index: number) => {
    if (!user) { alert("로그인이 필요합니다!"); return; }
    const newTags = [...tags];
    const targetTag = newTags[index];

    if (targetTag.voted) {
      targetTag.vote_count = Math.max(0, targetTag.vote_count - 1);
      targetTag.voted = false;
      await supabase.rpc('decrement_tag_vote', { row_id: tagId });
    } else {
      targetTag.vote_count += 1;
      targetTag.voted = true;
      await supabase.rpc('increment_tag_vote', { row_id: tagId });
    }
    setTags(newTags);
  };

  const handleAddTag = async (tagName: string) => {
    if (!user) { alert("로그인이 필요합니다!"); return; }
    
    if (work.tags?.includes(tagName) || tags.some(t => t.tag_name === tagName)) {
        alert("이미 등록된 태그입니다.");
        return;
    }

    const { error } = await supabase.from('tag_proposals').insert([
      { work_id: id, tag_name: tagName, user_id: user.id, status: 'pending' }
    ]);

    if (!error) {
      alert(`'#${tagName}' 태그 제안이 접수되었습니다.\n관리자 검토 후 반영됩니다! 🕵️`);
      setIsAddingTag(false);
    } else {
      if (error.code === '23505') { 
        alert("이미 제안하신 태그입니다. 검토를 기다려주세요!");
      } else {
        alert("오류가 발생했습니다: " + error.message);
      }
    }
  };

  const submitIngredients = async () => {
    if (!user) { alert("로그인이 필요합니다!"); return; }
    
    const { error } = await supabase.from('work_stats_votes').upsert({
      user_id: user.id,
      work_id: id,
      stats: inputStats
    }, { onConflict: 'user_id, work_id' });

    if (!error) {
      alert(myVote ? "분석이 수정되었습니다." : "분석 제출 완료! (+10P)");
      if (!myVote) await supabase.rpc('increment_points', { user_id: user.id, amount: 10 });
      setIsVoting(false);
      fetchData(); 
    } else {
      alert("오류 발생: " + error.message);
    }
  };

  const handleAddComment = async () => {
    if (!user) { alert("로그인이 필요합니다! 🔐"); return; }
    if (!reviewText.trim()) return;
    const { error } = await supabase.from('comments').insert([{ work_id: id, content: reviewText, author_id: user.id, author_nickname: profile?.nickname || '익명주민' }]);
    if (!error) {
      await supabase.rpc('increment_points', { user_id: user.id, amount: 5 });
      setReviewText('');
      const { data: commentData } = await supabase.from('comments').select('*').eq('work_id', id).order('created_at', { ascending: false });
      if (commentData) setComments(commentData);
    }
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    alert("링크가 복사되었습니다! 🔗");
    setIsShareModalOpen(false);
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center font-black text-gray-400 italic">데이터 로딩 중...</div>;
  if (!work) return null;

  const badge = getBadgeStatus();
  
  const dateObj = new Date(work.created_at || Date.now());
  const releaseYear = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="max-w-3xl mx-auto min-h-screen relative bg-white">
        
        {/* 헤더 */}
        <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-50 border-b border-gray-50">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-all cursor-pointer"><ChevronLeft size={24} /></button>
          <div className="flex items-center gap-1">
            
            {/* ✅ [수정] 관리자 버튼 (레벨 9 이상이면 보임) */}
            {profile && profile.level >= 9 && (
                <button onClick={() => router.push(`/work/${id}/edit`)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all cursor-pointer" title="관리자 수정">
                <PenLine size={20} />
                </button>
            )}

            <button onClick={handleTogglePick} className={`p-2 rounded-full transition-all cursor-pointer ${isLiked ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                <Heart fill={isLiked ? "currentColor" : "none"} size={22} />
            </button>
            <button onClick={() => setIsShareModalOpen(true)} className="p-2 hover:bg-gray-100 rounded-full transition-all cursor-pointer"><Share2 size={22} /></button>
          </div>
        </header>

        {/* ✅ 상단 정보 섹션 */}
        <section className="relative bg-[#0f172a] text-white px-6 pt-8 pb-10 overflow-hidden">
             {/* 배경 장식 */}
             <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] bg-purple-600/30 rounded-full blur-[80px] pointer-events-none"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] bg-indigo-600/30 rounded-full blur-[60px] pointer-events-none"></div>

             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-4">
                 <span className="px-2 py-0.5 bg-white/10 border border-white/10 rounded text-[10px] font-bold backdrop-blur-md">
                   {work.work_type === 'webtoon' ? '웹툰' : '웹소설'}
                 </span>
                 <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md ${badge.color}`}>
                  <badge.icon size={10} /> {badge.label}
                 </div>
               </div>
               
               <h1 className="text-3xl font-black leading-tight mb-3 tracking-tight">{work.title}</h1>
               
               <div className="flex items-center text-sm font-medium text-gray-300 gap-2">
                 <span className="font-bold text-white">{work.author}</span>
                 <span className="text-white/40 text-[10px]">●</span>
                 <span className="text-white/80 font-bold">{releaseYear}</span>
               </div>
             </div>
        </section>

        {/* 나머지 콘텐츠 */}
        <div className="px-6 -mt-6 relative z-20 space-y-6">
          
          {/* 1. 태그 섹션 */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <div className="flex justify-between items-center mb-4"> {/* mb-3 -> mb-4 */}
               <h3 className="font-black text-sm text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
                 <Tag size={16}/> Keywords {/* 아이콘 14 -> 16 */}
               </h3>
               {!isAddingTag && (
                 <button onClick={() => setIsAddingTag(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"> {/* text-[10px] -> text-xs */}
                   <Plus size={12}/> 태그 추가 {/* 아이콘 10 -> 12 */}
                 </button>
               )}
            </div>

            <div className="flex flex-wrap gap-2.5 mb-4"> {/* gap-2 -> gap-2.5 */}
              {work.tags?.map((tag: string) => (
                // text-xs -> text-sm
                <span key={tag} className="px-3.5 py-2 rounded-lg text-sm font-bold bg-gray-100 text-gray-600 cursor-default">
                  {tag}
                </span>
              ))}
              {tags.map((tag, index) => (
                <button key={tag.id} onClick={() => handleVoteTag(tag.id, index)} className={`px-3.5 py-2 rounded-lg text-sm font-bold border transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${tag.voted ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}>
                  #{tag.tag_name} <span className={`text-[10px] ${tag.voted ? 'text-indigo-200' : 'opacity-60'}`}>+{tag.vote_count}</span>
                </button>
              ))}
            </div>

            {/* 태그 추가 패널 */}
            {isAddingTag && (
              <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-1">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-gray-900">추가할 태그를 선택하세요</span>
                  <button onClick={() => setIsAddingTag(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-4 pr-2 scrollbar-thin"> {/* 높이 증가 */}
                  <div>
                      <h4 className="text-xs font-bold text-gray-400 mb-2">🔥 핵심 재미</h4>
                      <div className="flex flex-wrap gap-2">
                        {CORE_TAGS.map((t) => {
                          const clean = cleanTag(t);
                          const isAlready = work.tags?.includes(clean) || tags.some(exist => exist.tag_name === clean);
                          if (isAlready) return null;
                          return (
                            <button key={t} onClick={() => handleAddTag(clean)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                              {t}
                            </button>
                          );
                        })}
                      </div>
                  </div>
                  {Object.entries(TAG_GROUPS).map(([groupName, groupTags]) => (
                    <div key={groupName}>
                      <h4 className="text-xs font-bold text-gray-400 mb-2">{groupName}</h4>
                      <div className="flex flex-wrap gap-2">
                        {groupTags.map((t) => {
                          const clean = cleanTag(t);
                          const isAlready = work.tags?.includes(clean) || tags.some(exist => exist.tag_name === clean);
                          if (isAlready) return null;
                          return (
                            <button key={t} onClick={() => handleAddTag(clean)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. 성분 분석표 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"> {/* p-5 -> p-6 */}
             <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-500" /> 성분 분석
              </h3>
              <span className="text-xs text-gray-400 font-bold bg-gray-50 px-2.5 py-1 rounded-md">참여자 {userVotes.length}명</span>
            </div>

            <div className="space-y-5"> {/* 간격 넓힘 */}
              {statConfig.map((item) => (
                <div key={item.key}>
                  <div className="flex justify-between items-end mb-2">
                    {/* 글자 크기: text-[11px] -> text-sm */}
                    <span className="text-sm font-bold text-gray-600">{item.label}</span>
                    <div className="text-right">
                      {/* 점수 크기: text-xs -> text-base */}
                      <span className="text-base font-black text-gray-900 mr-1.5">
                        {work.adminTaste?.[item.key] ?? 50}% 
                      </span>
                      {userStats && (
                        <span className="text-xs font-bold text-indigo-400">
                          ({userStats[item.key]}%)
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-600">{item.label2}</span>
                  </div>

                  {/* 게이지 두께: h-1.5 -> h-2 */}
                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`absolute top-0 left-0 h-full ${item.color} rounded-full`} 
                      style={{ width: `${work.adminTaste?.[item.key] ?? 50}%` }}
                    ></div>
                    {userStats && (
                      <div 
                        className="absolute top-0 w-1 h-full bg-indigo-900 opacity-50 z-10"
                        style={{ left: `${userStats[item.key]}%` }}
                      ></div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
               {!isVoting ? (
                <button onClick={() => setIsVoting(true)} className="w-full py-3.5 bg-gray-50 text-indigo-600 rounded-xl text-sm font-black hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
                  <Sparkles size={18}/> {myVote ? "내 분석 수정하기" : "나도 평가하기"}
                </button>
              ) : (
                <div className="bg-gray-50 p-5 rounded-xl animate-in fade-in slide-in-from-top-2 text-left">
                  <h3 className="text-sm font-black text-gray-900 mb-4 text-center">슬라이더를 움직여 평가해주세요!</h3>
                  <div className="space-y-5">
                    {statConfig.map((item) => (
                      <div key={item.key}>
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
                          <span>{item.label}</span>
                          <span className="text-indigo-600">{inputStats[item.key as keyof Taste]}%</span>
                          <span>{item.label2}</span>
                        </div>
                        <input type="range" min="0" max="100" step="10" value={inputStats[item.key as keyof Taste]} onChange={(e) => setInputStats({...inputStats, [item.key]: Number(e.target.value)})} className={`w-full h-2 bg-white rounded-lg appearance-none cursor-pointer border border-gray-200 ${item.accent}`}/>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-5">
                      <button onClick={submitIngredients} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 transition-all">{myVote ? '수정 완료' : '제출하기 (+10P)'}</button>
                      <button onClick={() => setIsVoting(false)} className="px-5 py-3 bg-white border border-gray-300 text-gray-500 rounded-lg font-bold text-sm hover:bg-gray-100">취소</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 댓글 섹션 */}
          <div className="pt-6 border-t border-gray-100">
            <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center gap-2"><MessageCircle size={20}/> 주민 한마디 ({comments.length})</h3>
            <div className="relative mb-8">
              <input type="text" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="작품의 매력을 공유해주세요!" className="w-full pl-4 pr-12 py-3.5 bg-gray-50 rounded-xl outline-none font-bold text-sm focus:bg-white transition-all border border-transparent focus:border-indigo-500 shadow-sm" />
              <button onClick={handleAddComment} className="absolute right-2.5 top-2.5 p-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all cursor-pointer"><Send size={16} /></button>
            </div>
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400"><User size={12} /></div>
                    <span className="font-black text-gray-900 text-sm">{comment.author_nickname}</span>
                    <span className="text-xs text-gray-300 font-bold">{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  {/* 댓글 본문: text-xs -> text-sm */}
                  <p className="text-gray-700 font-bold text-sm leading-relaxed">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 스마트 하단바 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-50">
            <div className="max-w-3xl mx-auto flex gap-3">
              {work.platform_link ? (
                <>
                  <button onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(work.title + ' 웹소설')}`)} className="w-14 flex-none py-3.5 bg-white border border-gray-200 text-gray-500 rounded-xl flex justify-center items-center hover:bg-gray-50 transition-colors shadow-sm">
                    <Search size={22}/>
                  </button>
                  <button onClick={() => window.open(work.platform_link)} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-base flex justify-center items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg">
                      <BookOpen size={18}/> 작품 보러가기
                  </button>
                </>
              ) : (
                <button onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(work.title + ' 웹소설')}`)} className="w-full py-3.5 bg-white border-2 border-indigo-500 text-indigo-600 rounded-xl font-black text-base flex justify-center items-center gap-2 hover:bg-indigo-50 transition-colors shadow-sm">
                  <Monitor size={18}/> 구글에서 검색하기
                </button>
              )}
            </div>
        </div>

        {/* 공유 모달 */}
        {isShareModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)}></div>
            <div className="relative bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-lg text-gray-900">공유하기</h3>
                <button onClick={() => setIsShareModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <button onClick={handleShare} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-2xl transition-all">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600"><Copy size={20}/></div>
                  <span className="text-xs font-bold text-gray-600">링크 복사</span>
                </button>
                <button onClick={() => alert("카카오톡 공유 기능 준비중!")} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-2xl transition-all">
                  <div className="w-12 h-12 bg-yellow-300 rounded-full flex items-center justify-center text-brown-800"><MessageCircle size={20}/></div>
                  <span className="text-xs font-bold text-gray-600">카카오톡</span>
                </button>
              </div>
              <button onClick={() => setIsShareModalOpen(false)} className="w-full py-3 bg-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-200">닫기</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}