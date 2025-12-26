'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search, Filter, RotateCcw, Sparkles, Dices, User, LogIn, LogOut, Ghost, PenTool, 
  ChevronDown, Zap, Map, Radar, X, SlidersHorizontal, Gift, Lock, Plus, Info, Trophy, PartyPopper, Crown
} from 'lucide-react';
import Link from 'next/link';
import {
  CORE_TAGS, TAG_GROUPS, NEUTRAL_TASTE, Taste,
  cleanTag, recommendPresetFromTags, applyDelta,
  calcTagMatch, calcTasteMatch, calcFreshBoost, trustBoostFromBadge,
  computeBadge, badgeLabel, badgeTone
} from '@/lib/storyvillage';

// --- [등급 시스템] ---
const getLevelName = (level: number) => {
  const levels: { [key: number]: string } = {
    1: "길 잃은 여행자 🏕️", 2: "이삿짐 싼 정착민 🏠", 3: "마을의 성실 일꾼 ⚒️",
    4: "열혈 마을 보안관 🤠", 5: "베테랑 이야기꾼 📖", 6: "마을의 명예 원로 🎖️",
    7: "전설적인 촌장 대행 👑", 8: "차기 촌장 후보 💍", 9: "마을의 창조주 (MASTER) 🌟" 
  };
  return levels[level] || `Lv.${level} 주민`;
};

// --- [데이터 타입] ---
type Work = {
  id: string | number; title: string; author?: string; platform?: string;
  tags: string[]; adminTaste: Taste; nVotes?: number; avgDiff?: number;
  badge?: '⚪'|'🟢'|'🟡'|'🔴'; createdAt?: string; updatedAt?: string; releaseYear?: string;
};
type RadarItem = { id: number; tags: string[]; search_count: number; zero_rate: number; radar_score: number; };
type DailyQuest = { id: number; date: string; tags: string[]; sliders: any; status: string; };

function normalizeWork(row: any): Work {
  const rawTags = Array.isArray(row?.tags) ? row.tags : typeof row?.tags === 'string' ? row.tags.split(',').map((s:string)=>s.trim()).filter(Boolean) : [];
  const tags = rawTags.map((t:any) => cleanTag(String(t)));
  const s = row.stats || {};
  const adminTaste: Taste = {
    cider: Number(s.cider ?? row.admin_cider ?? 50), pace: Number(s.pace ?? row.admin_pace ?? 50),
    dark: Number(s.mood ?? row.admin_dark ?? 50), romance: Number(s.romance ?? row.admin_romance ?? 50),
    probability: Number(s.probability ?? row.admin_probability ?? 50), character: Number(s.character ?? row.admin_character ?? 50),
    growth: Number(s.growth ?? row.admin_growth ?? 50),
  };
  const nVotes = Number(row?.n_votes ?? 0);
  const avgDiff = Number(row?.avg_diff ?? 0);
  const dateObj = new Date(row.created_at || Date.now());
  return {
    id: row?.id ?? crypto.randomUUID(), title: String(row?.title ?? '제목 없음'), author: row?.author ?? '',
    tags, adminTaste, nVotes, avgDiff, badge: (row?.badge as any) ?? computeBadge(nVotes, avgDiff),
    createdAt: row?.created_at, updatedAt: row?.updated_at,
    releaseYear: `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}`
  };
}

// --- [슬라이더 설정] ---
const SLIDER_CONFIG = [
  { key: 'cider', left: '🍠 고구마', right: '🥤 사이다', color: 'accent-indigo-600' },
  { key: 'pace', left: '🐢 느림', right: '⚡ 빠름', color: 'accent-blue-600' },
  { key: 'dark', left: '☀️ 힐링', right: '🌑 피폐', color: 'accent-gray-600' },
  { key: 'romance', left: '🌵 노맨스', right: '💖 로맨스', color: 'accent-pink-600' },
  { key: 'probability', left: '⚡ 극적허용', right: '🧠 개연성', color: 'accent-purple-600' },
  { key: 'character', left: '😇 선함', right: '😈 악당', color: 'accent-red-600' },
  { key: 'growth', left: '👶 성장', right: '👑 완성', color: 'accent-yellow-600' },
];

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // 초기 로딩 여부 체크
  const isInitialMount = useRef(true);

  // --- [상태 관리] ---
  const [works, setWorks] = useState<Work[]>([]);
  const [radar, setRadar] = useState<RadarItem[]>([]);
  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [uiTags, setUiTags] = useState<string[]>([]);
  const [uiSliders, setUiSliders] = useState<Taste>(NEUTRAL_TASTE);
  const [uiSearchTerm, setUiSearchTerm] = useState('');

  const [appliedTags, setAppliedTags] = useState<string[]>([]);
  const [appliedSliders, setAppliedSliders] = useState<Taste>(NEUTRAL_TASTE);
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');

  const [isTagExpanded, setIsTagExpanded] = useState(false);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  const preset = useMemo(() => recommendPresetFromTags(uiTags), [uiTags]);

  // URL 파라미터 동기화
  useEffect(() => {
    const tagsParam = searchParams.get('tags');
    const searchParam = searchParams.get('q');
    const limitParam = searchParams.get('limit');
    
    const newSliders: Taste = { ...NEUTRAL_TASTE };
    let hasSliderParam = false;
    SLIDER_CONFIG.forEach(({ key }) => {
      const val = searchParams.get(key);
      if (val) {
        newSliders[key as keyof Taste] = Number(val);
        hasSliderParam = true;
      }
    });

    const newTags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];
    const newSearch = searchParam || '';
    const newVisibleCount = limitParam ? parseInt(limitParam) : 15;

    setUiTags(newTags);
    setAppliedTags(newTags);
    
    setUiSearchTerm(newSearch);
    setAppliedSearchTerm(newSearch);
    
    setUiSliders(newSliders);
    setAppliedSliders(newSliders);

    setVisibleCount(newVisibleCount);

    if (hasSliderParam) setIsSliderOpen(true);

    // 페이지 최초 진입/뒤로가기 시에만 스크롤 이동
    if (isInitialMount.current) {
      if (newTags.length > 0 || newSearch || hasSliderParam || limitParam) {
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 400);
      }
      isInitialMount.current = false; 
    }

  }, [searchParams]);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchWorks(), fetchRadar(), fetchQuest(), checkUserAndDNA()]);
    })();
  }, []);

  const checkUserAndDNA = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (pData) {
        setProfile(pData);
        const storageKey = `level_${session.user.id}`;
        const prevLevel = localStorage.getItem(storageKey);
        if (prevLevel && parseInt(prevLevel) < pData.level) setShowLevelUpModal(true);
        localStorage.setItem(storageKey, pData.level.toString());
      }

      if (!searchParams.has('cider') && !searchParams.has('tags')) {
        const { data: dna } = await supabase.from('taste_profiles').select('*').eq('user_id', session.user.id).single();
        if (dna) {
          const dnaTaste = {
            cider: dna.cider ?? 50, pace: dna.pace ?? 50, dark: dna.dark ?? 50, romance: dna.romance ?? 50,
            probability: 50, character: 50, growth: 50
          };
          setUiSliders(dnaTaste);
          setAppliedSliders(dnaTaste); 
        }
      }
    }
  };

  const fetchWorks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('works').select('*').in('status', ['published','pending']).order('created_at', { ascending: false }).limit(300);
    if (error) { console.error(error); setWorks([]); setLoading(false); return; }
    setWorks((data ?? []).map(normalizeWork));
    setLoading(false);
  };

  const fetchRadar = async () => {
    const { data } = await supabase.from('radar_queue').select('*').order('radar_score', { ascending: false }).limit(5);
    if (data) setRadar(data.map((r: any) => ({
      id: r.id, tags: (r.tags ?? []).map((t: any) => cleanTag(String(t))),
      search_count: Number(r.search_count ?? 0), zero_rate: Number(r.zero_rate ?? 0), radar_score: Number(r.radar_score ?? 0),
    })));
  };

  const fetchQuest = async () => {
    const todayStr = new Intl.DateTimeFormat('ko-KR').format(new Date()).replace(/\. /g, '').replace('.', '');
    const todayNum = parseInt(todayStr);
    const allTags = [...CORE_TAGS, ...Object.values(TAG_GROUPS).flat()];
    const targetTag = allTags[todayNum % allTags.length];
    setQuest({
      id: todayNum, date: todayStr, tags: [cleanTag(targetTag)],
      sliders: { cider: (todayNum % 2) * 100, pace: ((todayNum + 1) % 2) * 100 },
      status: 'active',
    });
  };

  const handleAddWorkClick = () => {
    if (!user) { alert("로그인이 필요합니다 🔐"); router.push('/login'); return; }
    if (profile && profile.level < 3) { alert("작품 제보는 Lv.3부터 가능합니다!"); return; }
    router.push('/add');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const toggleTag = (raw: string) => {
    const t = cleanTag(raw);
    setUiTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const pickRandomTag = () => {
    const all = [...CORE_TAGS, ...Object.values(TAG_GROUPS).flat()];
    const randomTag = cleanTag(all[Math.floor(Math.random() * all.length)]);
    setUiTags([randomTag]);
  };

  const resetFilter = () => {
    setUiTags([]); setUiSearchTerm(''); setUiSliders(NEUTRAL_TASTE);
    setIsSliderOpen(false);
    router.push('/');
  };

  const applyPreset = () => {
    if (!preset) return;
    setUiSliders(prev => applyDelta(prev, preset.delta));
    setIsSliderOpen(true);
  };

  const applyQuest = () => {
    if (!quest) return;
    const msg = `📅 오늘의 퀘스트\n촌장님이 엄선한 [ #${quest.tags.join(', #')} ] 테마입니다.\n\n이 세팅으로 필터를 적용하시겠습니까?`;
    if (window.confirm(msg)) {
      const params = new URLSearchParams();
      if (quest.tags.length > 0) params.set('tags', quest.tags.join(','));
      
      const newSliders = {...NEUTRAL_TASTE, ...quest.sliders};
      SLIDER_CONFIG.forEach(({ key }) => {
        const val = newSliders[key as keyof Taste];
        if (val !== 50) params.set(key, val.toString());
      });

      router.push(`?${params.toString()}`);
      
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const executeSearch = () => {
    const params = new URLSearchParams();
    
    if (uiTags.length > 0) params.set('tags', uiTags.join(','));
    if (uiSearchTerm.trim()) params.set('q', uiSearchTerm.trim());
    
    SLIDER_CONFIG.forEach(({ key }) => {
      const val = uiSliders[key as keyof Taste];
      if (val !== 50) params.set(key, val.toString());
    });

    // [수정] 검색 시 현재 보고 있는 갯수(더보기 상태)를 유지
    params.set('limit', visibleCount.toString());

    router.push(`?${params.toString()}`);
    
    setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleLoadMore = () => {
    const nextCount = visibleCount + 12;
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', nextCount.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const scored = useMemo(() => {
    let base = works;
    const q = appliedSearchTerm.trim().toLowerCase();
    
    if (q) base = base.filter((w) => w.title.toLowerCase().includes(q) || (w.author ?? '').toLowerCase().includes(q));

    const list = base.map((w) => {
      const { tagMatch, corePenalty, overlapped } = calcTagMatch(appliedTags, w.tags);
      const tasteMatch = calcTasteMatch(appliedSliders, w.adminTaste);
      const trust = trustBoostFromBadge(w.badge ?? '⚪');
      const fresh = calcFreshBoost(w.updatedAt ?? w.createdAt);
      
      const baseScore = tasteMatch * 0.55 + tagMatch * 0.30 + trust * 0.10 + fresh * 0.05;
      const finalScore = baseScore * 100 + corePenalty;
      
      return { work: w, meta: { finalScore, overlapped } };
    });

    const filtered = appliedTags.length > 0 
      ? list.filter(item => item.meta.overlapped.length === appliedTags.length)
      : list;

    filtered.sort((a,b) => b.meta.finalScore - a.meta.finalScore);
    
    return filtered;
  }, [works, appliedSearchTerm, appliedTags, appliedSliders]);

  const isChanged = useMemo(() => {
    return JSON.stringify(uiTags) !== JSON.stringify(appliedTags) || 
           JSON.stringify(uiSliders) !== JSON.stringify(appliedSliders) ||
           uiSearchTerm !== appliedSearchTerm;
  }, [uiTags, uiSliders, uiSearchTerm, appliedTags, appliedSliders, appliedSearchTerm]);

  return (
    <div className="min-h-screen bg-white pb-32">
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        .animate-pop { animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      <div className="max-w-5xl mx-auto min-h-screen relative bg-white">
        
        {/* 헤더 */}
        <header className="px-6 py-4 flex justify-between items-center bg-white z-50">
          <h1 className="text-xl md:text-2xl font-black text-indigo-600 tracking-tighter cursor-pointer shrink-0" onClick={() => window.location.reload()}>
            StoryVillage
          </h1>
          
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-indigo-100 shadow-sm transition-all hover:bg-indigo-100">
                <div onClick={() => router.push('/my')} className="flex items-center gap-2 cursor-pointer group">
                  <span className={`text-xs font-black text-white px-2 py-0.5 rounded-md transition-colors ${profile?.level >= 9 ? 'bg-purple-600' : 'bg-indigo-600 group-hover:bg-indigo-700'}`}>
                    LV.{profile?.level || 1}
                  </span>
                  
                  <div className="hidden md:flex flex-col">
                    <span className="text-[13px] font-black text-indigo-700 leading-tight group-hover:underline">
                      {getLevelName(profile?.level || 1)}
                    </span>
                    <span className="text-xs font-bold text-indigo-300">
                      {profile?.nickname || '주민'} · {profile?.points || 0}P
                    </span>
                  </div>

                  <span className="md:hidden text-xs font-black text-indigo-700 max-w-[60px] truncate">
                    {profile?.nickname || '주민'}
                  </span>
                </div>

                {profile?.level >= 9 && (
                  <button onClick={() => router.push('/admin')} className="flex items-center gap-1 px-2 py-1 bg-gray-900 text-white rounded-md text-[10px] font-black hover:bg-gray-700 transition-colors">
                    <Crown size={10} /> <span className="hidden md:inline">관리</span>
                  </button>
                )}

                <div className="hidden md:block w-[1px] h-3 bg-indigo-200 mx-1"></div>
                
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-all flex items-center">
                  <LogOut size={16} className="md:hidden" /> 
                  <span className="hidden md:block text-xs font-bold">퇴장</span>
                </button>
              </div>
            ) : (
              <button onClick={() => router.push('/login')} className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-indigo-600 font-bold text-xs transition-all">
                <LogIn size={16} /> <span className="hidden md:inline">로그인</span>
              </button>
            )}
          </div>
        </header>

        <main className="px-6 pt-4">
          
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="shrink-0">
              <h2 className="text-2xl font-black text-gray-900 leading-tight">
                <span className="text-indigo-600">웹소설.</span> 줄거리 말고, 취향으로.
              </h2>
              <p className="text-sm font-medium text-gray-500 mt-1">태그로 골라서 바로 찾기 (1개도 OK)</p>
            </div>
            
            <div className="grid grid-cols-4 gap-1.5 w-full md:w-auto">
              <button 
                onClick={() => {
                  if (!user) {
                    alert("🔒 DNA 분석은 로그인이 필요한 기능입니다.\n(결과를 저장하고 검색에 반영해야 하거든요!)");
                    router.push('/login');
                    return;
                  }
                  router.push('/dna');
                }}
                className="flex flex-col md:flex-row items-center justify-center gap-1 px-1 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors text-center"
              >
                <Map size={14} /> <span>DNA</span>
              </button>

              <button onClick={applyQuest} className="flex flex-col md:flex-row items-center justify-center gap-1 px-1 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors relative overflow-hidden text-center">
                <Zap size={14} /> <span>오늘의 퀘스트</span>
                {quest && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}
              </button>
              <button onClick={() => setIsRadarOpen(!isRadarOpen)} className={`flex flex-col md:flex-row items-center justify-center gap-1 px-1 py-2 rounded-lg text-xs font-bold transition-colors text-center ${isRadarOpen ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <Radar size={14} /> <span>숨은명작</span>
              </button>
              <Link href="/secret" className="flex flex-col md:flex-row items-center justify-center gap-1 px-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors text-center">
                <Ghost size={14} /> <span>숨읽명</span>
              </Link>
            </div>
          </div>

          {isRadarOpen && (
            <div className="mb-6 bg-gray-900 rounded-xl p-4 text-white shadow-xl animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-2">
                 <div className="text-sm font-bold text-gray-400 flex items-center gap-1"><Radar size={14}/> 사람들이 찾았지만 없었던 맛</div>
                 <button onClick={() => setIsRadarOpen(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
              </div>
              <div className="space-y-2">
                 {radar.length === 0 ? <div className="text-xs text-gray-500 py-1">아직 데이터가 부족해요.</div> : radar.map(r => (
                   <div key={r.id} className="flex justify-between items-center bg-gray-800 p-2 rounded-lg border border-gray-700">
                     <span className="text-xs font-bold truncate text-gray-200">{r.tags.map(t=>`#${t}`).join(' ')}</span>
                     <button onClick={() => router.push(`/add?prefill_tags=${encodeURIComponent(r.tags.join(','))}`)} className="text-xs px-2 py-1 bg-indigo-600 rounded-md font-bold hover:bg-indigo-500 transition-colors">내가 채울래!</button>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {preset && uiTags.length >= 2 && (
            <div className="mb-4 animate-in slide-in-from-top-2 fade-in duration-300">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 mb-0.5"><Zap size={14}/> 추천 조합</div>
                  <div className="font-black text-sm text-indigo-900">{preset.label}</div>
                </div>
                <button onClick={applyPreset} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-black text-xs shadow-md hover:bg-indigo-700 transition-colors">적용하기</button>
              </div>
            </div>
          )}

          <div className="mb-2">
            {/* 🔥 수정: gap-3 -> gap-2로 줄여서 모바일 한 줄 정렬 공간 확보 */}
            <div className="flex flex-wrap items-end gap-2 mb-3">
              <div>
                <span className="text-sm font-black text-gray-800 flex items-center gap-1"><Filter size={16}/> 오늘 땡기는 맛</span>
                <p className="text-xs text-gray-400 font-bold mt-0.5 ml-0.5">여러 개면 더 정확해요!</p>
              </div>
              
              <div className="flex gap-2">
                {/* 🔥 수정: 주사위 이모지 제거 & whitespace-nowrap 추가 */}
                <button onClick={pickRandomTag} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-black flex items-center gap-1 hover:bg-indigo-200 transition-all border border-indigo-200 whitespace-nowrap">
                  <Dices size={12}/> 랜덤 조합
                </button>

                {/* 🔥 수정: w-24 제거 (폭 유동적) & whitespace-nowrap 추가 (줄바꿈 방지) */}
                <button 
                  onClick={() => setIsSliderOpen(!isSliderOpen)} 
                  className={`px-3 py-1.5 rounded-md text-xs font-black flex items-center justify-center gap-1 transition-all border whitespace-nowrap ${isSliderOpen ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
                >
                  <SlidersHorizontal size={12} />
                  {isSliderOpen ? '접기' : '디테일 설정'}
                </button>
              </div>
            </div>

            {/* 슬라이더 패널 (위치: 버튼 바로 아래) */}
            {isSliderOpen && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-top-2 fade-in">
                <div className="flex justify-between items-center mb-2">
                   <h4 className="text-xs font-black text-gray-700 flex items-center gap-1"><SlidersHorizontal size={14}/> 7대 성분 미세 조정</h4>
                   <button onClick={() => setUiSliders(NEUTRAL_TASTE)} className="text-xs text-gray-400 font-bold underline hover:text-indigo-500">초기화</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  {SLIDER_CONFIG.map((s) => (
                    <div key={s.key}>
                      <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                        <span>{s.left}</span>
                        <span className="text-indigo-600">{uiSliders[s.key as keyof Taste] ?? 50}%</span>
                        <span>{s.right}</span>
                      </div>
                      <input type="range" min="0" max="100" step="10" value={uiSliders[s.key as keyof Taste] ?? 50} onChange={(e) => setUiSliders({...uiSliders, [s.key]: Number(e.target.value)})} className={`w-full h-2 bg-white rounded-lg appearance-none cursor-pointer border border-gray-200 ${s.color}`}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mb-3">
              <h4 className="text-[13px] font-black text-indigo-500 mb-1.5 uppercase tracking-wider ml-0.5">🔥 핵심 재미</h4>
              <div className="flex flex-wrap gap-2">
                {CORE_TAGS.map(t => {
                  const tag = cleanTag(t);
                  const isSelected = uiTags.includes(tag);
                  
                  return (
                    <button key={t} onClick={() => toggleTag(t)} className={`px-3 py-2 rounded-xl text-[13px] font-bold border transition-all active:scale-95 ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-200 hover:text-indigo-600'}`}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {isTagExpanded ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-1 mt-2">
                {Object.entries(TAG_GROUPS).map(([groupName, tags]) => (
                  <div key={groupName}>
                    <h4 className="text-[13px] font-black text-gray-400 mb-1.5 ml-0.5">{groupName}</h4>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(t => {
                        const tag = cleanTag(t);
                        const isSelected = uiTags.includes(tag);
                        return (
                          <button key={t} onClick={() => toggleTag(t)} className={`px-3 py-2 rounded-xl text-[13px] font-bold border transition-all active:scale-95 ${isSelected ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button onClick={() => setIsTagExpanded(false)} className="w-full py-2 text-xs font-bold text-gray-400 flex items-center justify-center gap-1 hover:text-gray-600"><ChevronDown size={14} className="rotate-180"/> 태그 접기</button>
              </div>
            ) : (
              <button onClick={() => setIsTagExpanded(true)} className="w-full py-2.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-500 flex items-center justify-center gap-1 hover:bg-gray-100 transition-colors mt-2">
                <ChevronDown size={14}/> 상세 태그 더보기
              </button>
            )}
          </div>

          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                value={uiSearchTerm} 
                onChange={(e) => setUiSearchTerm(e.target.value)} 
                placeholder="작품명/작가로 바로 찾기" 
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none font-bold text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>
            
            <button 
              onClick={handleAddWorkClick} 
              className="shrink-0 px-4 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              <PenTool size={16} /> 
              <span className="hidden sm:inline">작품 제보</span>
            </button>
          </div>

          <div ref={resultsRef} className="space-y-4">
            <div className="flex justify-between items-end">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Sparkles size={16} className={appliedTags.length > 0 ? "text-indigo-600" : "text-yellow-500"} />
                {appliedTags.length > 0 ? <span className="text-indigo-600">추천 순위 ({scored.length})</span> : "지금 많이 찾는 작품"}
              </h2>
              <span className="text-xs font-bold text-gray-400">취향 일치순</span>
            </div>
            
            {appliedTags.length === 0 && <p className="text-xs font-bold text-gray-400 -mt-2 mb-2 ml-7">요즘 인기 조합 반영</p>}

            {loading ? (
              <div className="text-center py-20 text-gray-400 font-bold animate-pulse">데이터 로딩중...</div>
            ) : scored.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200 animate-in fade-in zoom-in duration-300">
                <Ghost size={32} className="mx-auto mb-3 text-gray-400"/>
                <h3 className="text-gray-900 font-black text-lg mb-1">결과가 없어요 😢</h3>
                <p className="text-sm text-gray-500 font-bold mb-6">조건을 조금만 풀어볼까요?</p>
                
                <div className="flex flex-col items-center gap-4">
                   <button onClick={resetFilter} className="py-3 px-6 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-2 shadow-sm transition-all">
                     <RotateCcw size={14}/> 초기화
                   </button>
                   
                   <div className="flex flex-col items-center gap-1 mt-2">
                     <span className="text-xs text-gray-400 font-bold">혹시 찾는 작품이 없나요?</span>
                     <button 
                       onClick={() => router.push(`/add?prefill_tags=${encodeURIComponent(appliedTags.join(','))}`)} 
                       className="text-indigo-600 text-xs font-black underline flex items-center gap-1 hover:text-indigo-800"
                     >
                       <PenTool size={12}/> 이 태그로 제보하기
                     </button>
                   </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scored.slice(0, visibleCount).map(({work, meta}) => {
                  const tone = badgeTone(work.badge ?? '⚪');
                  const label = badgeLabel(work.badge ?? '⚪');
                  const sortedTags = [...work.tags].sort((a, b) => {
                    const aSelected = appliedTags.includes(a);
                    const bSelected = appliedTags.includes(b);
                    if (aSelected === bSelected) return 0;
                    return aSelected ? -1 : 1;
                  });
                  
                  const top3Stats = SLIDER_CONFIG.map(conf => {
                     const val = (work.adminTaste as any)[conf.key] ?? 50;
                     const distinctness = Math.abs(val - 50);
                     return { ...conf, val, distinctness, label: val >= 50 ? conf.right : conf.left };
                  }).sort((a, b) => b.distinctness - a.distinctness).slice(0, 3);

                  return (
                    <div key={work.id} onClick={() => router.push(`/work/${work.id}`)} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                           <span className="text-sm text-gray-500 font-bold tracking-tight truncate">{work.author || '작가 미상'}</span>
                           <span className="text-xs text-gray-300 font-medium shrink-0">·</span>
                           <span className="text-[13px] text-gray-400 font-bold shrink-0">{work.releaseYear}</span>
                        </div>
                        <div className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black border ${tone}`}>
                          {work.badge} {label}
                        </div>
                      </div>
                      <h3 className="text-[20px] font-black text-gray-900 leading-tight group-hover:text-indigo-600 mb-2 tracking-tight truncate">
                        {work.title}
                      </h3>
                      <div className="flex flex-wrap gap-1 mb-3 h-[24px] overflow-hidden">
                        {sortedTags.slice(0, 5).map((tag) => (
                          <span key={tag} className={`px-2 py-[3px] text-xs font-bold rounded-md tracking-tight whitespace-nowrap border ${appliedTags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-0 divide-x divide-slate-200 bg-[#F8F9FE] rounded-lg border border-slate-100 py-2.5">
                        {top3Stats.map((stat) => (
                          <div key={stat.key} className="flex flex-col items-center justify-center leading-none gap-0.5">
                             <span className="text-xs font-bold text-slate-400">{stat.label.split(' ')[0]}</span>
                             <span className="text-xs font-black text-slate-600">{stat.label.split(' ')[1]} <span className="text-indigo-400">{stat.val}%</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {visibleCount < scored.length && (
              <button onClick={handleLoadMore} className="w-full py-4 bg-gray-50 text-gray-500 font-bold text-sm rounded-2xl hover:bg-gray-100 transition-colors">
                더 보기 ({scored.length - visibleCount}개 남음)
              </button>
            )}
          </div>
        </main>
        
        {/* [수정] 플로팅 바 상시 노출 (조건문 제거) */}
        <div className="fixed bottom-12 left-0 right-0 z-[100] flex justify-center pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md border border-gray-200 shadow-2xl rounded-full pl-5 pr-1 py-1.5 flex items-center gap-3 pointer-events-auto animate-in slide-in-from-bottom-4 fade-in">
            <div className="flex flex-col items-center leading-none py-1">
              <span className="text-[11px] text-gray-400 font-bold mb-0.5">선택된 맛</span>
              <div className="flex gap-1 h-5 overflow-x-auto scrollbar-hide max-w-[120px] items-center">
                {uiTags.length > 0 ? uiTags.map(tag => (
                  <span key={tag} className="text-indigo-600 font-black text-xs shrink-0 whitespace-nowrap">#{tag}</span>
                )) : <span className="text-gray-300 text-xs font-bold">전체</span>}
              </div>
            </div>
            <div className="w-[1px] h-6 bg-gray-200"></div>
            
            <button onClick={resetFilter} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-gray-500">
              <RotateCcw size={14}/>
            </button>

            {isChanged ? (
              <button onClick={executeSearch} className="px-4 py-2 bg-indigo-600 text-white rounded-full font-black text-xs hover:bg-indigo-700 transition-colors shadow-lg animate-pulse">
                🔍 결과 보기
              </button>
            ) : (
              <div className="text-xs font-bold text-gray-400 pr-3 pl-1">{scored.length}건</div>
            )}
          </div>
        </div>
        
        {showLevelUpModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLevelUpModal(false)}></div>
            <div className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 text-center animate-pop overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-yellow-100 to-white -z-10"></div>
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-200 text-white animate-bounce"><PartyPopper size={40} /></div>
              <h2 className="text-3xl font-black text-indigo-600 mb-2 tracking-tighter">LEVEL UP!</h2>
              <p className="text-gray-500 font-bold mb-6">축하합니다! 등급이 올랐어요!</p>
              <div className="bg-gray-50 rounded-3xl p-6 mb-8 border border-gray-100">
                <div className="text-xs font-black text-gray-400 mb-2">현재 등급</div>
                <div className="text-xl font-black text-indigo-600 flex items-center justify-center gap-2"><Trophy size={20} className="text-yellow-500" />{getLevelName(profile?.level)}</div>
              </div>
              <button onClick={() => setShowLevelUpModal(false)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95">멋져요! 확인</button>
            </div>
          </div>
        )}

        {isGuideOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>
            <div className="relative bg-white w-full max-w-md rounded-[48px] shadow-2xl p-10 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-8">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-100"><Map size={24} /></div>
                <button onClick={() => setIsGuideOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-300"><X size={24} /></button>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">StoryVillage Guide 🗺️</h3>
              <p className="text-sm text-gray-400 font-bold mb-8">주민의 취향으로 완성되는 도감입니다.</p>
              <div className="space-y-6">
                <div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0 text-xs">1</div><div><h4 className="font-black text-gray-800 text-sm mb-1">참여하고 포인트 받기</h4><p className="text-xs text-gray-400 font-medium">한마디를 남길 때마다 10P가 쌓입니다.</p></div></div>
                <div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0 text-xs">2</div><div><h4 className="font-black text-gray-800 text-sm mb-1">성실 일꾼 승급</h4><p className="text-xs text-gray-400 font-medium">Lv.3이 되면 직접 작품을 제보할 수 있습니다.</p></div></div>
              </div>
              <button onClick={() => setIsGuideOpen(false)} className="w-full mt-10 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-indigo-100 active:scale-95 transition-all">확인했습니다!</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}