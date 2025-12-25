'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, Save, Tag, BarChart3, BookOpen, CheckCircle2 
} from 'lucide-react';

export default function AdminAddPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // 입력 상태
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [link, setLink] = useState(''); // 플랫폼 링크
  const [workType] = useState('novel'); // ✅ 웹툰 삭제하고 'novel'로 고정!
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // 관리자 확정 성분 (기본값 50, 로맨스는 10)
  const [stats, setStats] = useState({
    cider: 50,      // 고구마(0) <-> 사이다(100)
    pace: 50,       // 느림(0) <-> 빠름(100)
    mood: 50,       // 어두움(0) <-> 밝음(100)
    romance: 10,    // 없음(0) <-> 많음(100)
    probability: 50 // 판타지(0) <-> 지능/개연성(100)
  });

  // 🏷️ 태그 리스트 (확정된 50개 표준안 - 관리자가 클릭하기 쉽게 배치)
  const tagGroups = {
    "A. 전개/쾌감 (핵심)": ['#사이다', '#고구마', '#빠른전개', '#느린전개', '#먼치킨', '#성장형', '#지능캐', '#힘숨김', '#착각계', '#노맨스'],
    "B. 분위기/감성": ['#개그', '#유머', '#진지함', '#피폐', '#힐링', '#다크', '#통쾌함', '#감동', '#잔잔함', '#광기'],
    "C. 소재/설정": ['#회귀', '#빙의', '#환생', '#현판', '#무협', '#판타지', '#헌터물', '#탑등반', '#아카데미', '#게임빙의', '#대체역사', '#전문직', '#연예계', '#재벌', '#스포츠'],
    "D. 관계/로맨스": ['#하렘', '#역하렘', '#브로맨스', '#워맨스', '#집착', '#후회', '#순애', '#티키타카', '#육아물', '#복수'],
    "E. 상태/기타": ['#완결', '#연재중', '#장편', '#단편', '#웹툰화']
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("로그인이 필요합니다.");
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('level').eq('id', session.user.id).single();
    
    // Lv.5 이상만 접속 가능
    if (!profile || profile.level < 5) {
      alert("🚫 접근 권한이 없습니다. (관리자 전용)");
      router.push('/');
      return;
    }
    
    setUser(session.user);
    setLoading(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!title || !author) { alert("제목과 작가는 필수입니다."); return; }
    if (selectedTags.length === 0) { alert("태그를 최소 1개 선택하세요."); return; }

    const { error } = await supabase.from('works').insert([{
      title,
      author,
      work_type: workType, // 'novel' 고정
      tags: selectedTags,
      stats: stats,
      created_by: user.id,
      platform_link: link, // ✅ 이제 컬럼 추가했으니 에러 안 날 겁니다!
      status: 'published'
    }]);

    if (error) {
      alert("등록 실패: " + error.message);
    } else {
      const more = confirm("✅ 등록 완료! 계속 등록하시겠습니까?");
      if (more) {
        setTitle('');
        setAuthor('');
        setLink(''); // 링크도 초기화
        setSelectedTags([]);
        window.scrollTo(0, 0);
      } else {
        router.push('/');
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">관리자 권한 확인 중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="max-w-4xl mx-auto bg-white min-h-screen border-x border-slate-200 shadow-xl">
        
        {/* 헤더 */}
        <header className="bg-slate-900 text-white p-6 sticky top-0 z-50 flex justify-between items-center shadow-lg">
          <h1 className="text-xl font-black flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> 관리자 작품 등록 (Seed)
          </h1>
          <button onClick={() => router.push('/')} className="text-xs font-bold bg-white/10 px-3 py-1 rounded hover:bg-white/20">나가기</button>
        </header>

        <div className="p-8 space-y-10">
          
          {/* 1. 기본 정보 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-800 border-b pb-2 flex gap-2 items-center">
              <BookOpen size={20} className="text-indigo-600"/> 1. 기본 정보
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">작품 제목</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-slate-100 rounded-lg font-bold focus:ring-2 ring-indigo-500 outline-none" placeholder="예: 전지적 독자 시점" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">작가명</label>
                <input value={author} onChange={e => setAuthor(e.target.value)} className="w-full p-3 bg-slate-100 rounded-lg font-bold focus:ring-2 ring-indigo-500 outline-none" placeholder="예: 싱숑" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">작품 링크 (선택)</label>
              <input value={link} onChange={e => setLink(e.target.value)} className="w-full p-3 bg-slate-100 rounded-lg font-bold text-sm focus:ring-2 ring-indigo-500 outline-none" placeholder="카카오/네이버 시리즈 등 링크..." />
            </div>
            
            {/* ✅ 웹툰 선택 버튼 삭제됨 -> 안내 문구로 대체 */}
            <div className="p-3 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg text-center">
              📖 카테고리 고정: 웹소설 (MVP)
            </div>
          </section>

          {/* 2. 대표 성분 설정 (슬라이더) */}
          <section className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <BarChart3 className="text-indigo-600"/> 2. 대표 성분 (관리자 확정값)
            </h2>
            <div className="space-y-8">
              {[
                { key: 'cider', label: '고구마 🍠', label2: '🥤 사이다', color: 'accent-indigo-600' },
                { key: 'pace', label: '전개 느림 🐢', label2: '⚡ 빠름', color: 'accent-blue-600' },
                { key: 'mood', label: '어두움 🌑', label2: '☀️ 밝음', color: 'accent-yellow-500' },
                { key: 'romance', label: '로맨스 없음 🌵', label2: '💖 많음', color: 'accent-pink-500' },
                { key: 'probability', label: '판타지 논리 🦄', label2: '🧠 지능/개연성', color: 'accent-purple-600' },
              ].map((item) => (
                <div key={item.key} className="relative">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                    <span>{item.label}</span>
                    <span className="text-slate-900 font-black bg-white px-2 py-0.5 rounded shadow-sm border">{stats[item.key as keyof typeof stats]}%</span>
                    <span>{item.label2}</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="5"
                    value={stats[item.key as keyof typeof stats]}
                    onChange={(e) => setStats({...stats, [item.key]: Number(e.target.value)})}
                    className={`w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer ${item.color}`}
                  />
                  <div className="absolute top-8 left-1/2 w-0.5 h-2 bg-slate-300 -translate-x-1/2"></div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. 태그 선택 */}
          <section>
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Tag size={20} className="text-indigo-600"/> 3. 태그 선택
              </h2>
              <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded-md text-xs">{selectedTags.length}개 선택됨</span>
            </div>
            
            <div className="space-y-8">
              {Object.entries(tagGroups).map(([groupName, tags]) => (
                <div key={groupName}>
                  <h4 className="text-xs font-black text-slate-400 mb-3 uppercase tracking-wider">{groupName}</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <button 
                        key={tag} 
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all active:scale-95
                          ${selectedTags.includes(tag) 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 등록 버튼 */}
          <button 
            onClick={handleSubmit}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xl shadow-xl shadow-slate-300 hover:bg-slate-800 transition-all active:scale-95 flex justify-center items-center gap-2 mt-8"
          >
            <CheckCircle2 /> 작품 등록하기
          </button>

        </div>
      </div>
    </div>
  );
}