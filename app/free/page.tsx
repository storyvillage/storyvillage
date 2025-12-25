'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Gift, ExternalLink, Send, PenTool, 
  X, Filter, Edit2, CheckCircle2, BookOpen, Monitor, Search 
} from 'lucide-react';

export default function FreePage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('전체');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [workType, setWorkType] = useState('novel');
  const [dealType, setDealType] = useState('기간한정');
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('카카오페이지');
  const [link, setLink] = useState('');
  const [genre, setGenre] = useState('판타지');

  const genres = ['전체', '판타지', '현판', '무협', '로판', '로맨스', 'BL/GL', '기타'];
  const writeGenres = ['판타지', '현판', '무협', '로판', '로맨스', 'BL/GL', '기타'];
  const dealTypes = ['기간한정', '기다리면무료', 'N화 무료', '대여권/캐시', '전체무료'];
  const novelPlatforms = ['카카오페이지', '네이버시리즈', '리디북스', '문피아', '조아라', '노벨피아', '기타'];
  const webtoonPlatforms = ['네이버웹툰', '카카오웹툰', '카카오페이지', '레진코믹스', '봄툰', '리디북스', '기타'];
  const currentPlatforms = workType === 'webtoon' ? webtoonPlatforms : novelPlatforms;

  // ✅ [수정] 프로필 가져오는 함수 분리 (업데이트 시 재사용 위해)
  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      await fetchProfile(); // 초기 실행
      fetchEvents();
    };
    fetchData();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('free_events').select('*').order('created_at', { ascending: false });
    if (data) {
      setEvents(data);
      setFilteredEvents(data);
    }
  };

  useEffect(() => {
    if (selectedGenre === '전체') {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(item => item.genre === selectedGenre));
    }
  }, [selectedGenre, events]);

  const toggleWriteForm = () => {
    if (!user) {
      if(confirm("로그인이 필요한 기능입니다. 로그인 하러 가시겠습니까?")) router.push('/login?next=/free');
      return;
    }
    if ((profile?.level || 1) < 2) { 
      alert("Lv.2 정착민부터 정보를 공유할 수 있어요! 🏠"); 
      return; 
    }
    if (showWriteForm) resetForm();
    setShowWriteForm(!showWriteForm);
  };

  const resetForm = () => {
    setWorkType('novel'); setDealType('기간한정'); setTitle(''); setPlatform('카카오페이지'); setLink(''); setGenre('판타지');
    setIsEditing(false); setEditId(null);
  };

  const handleEditClick = (item: any) => {
    if (!showWriteForm) setShowWriteForm(true);
    setIsEditing(true);
    setEditId(item.id);
    setWorkType(item.work_type || 'novel');
    setDealType(item.deal_type || '기간한정');
    setTitle(item.title);
    setPlatform(item.platform);
    setLink(item.link || '');
    setGenre(item.genre || '판타지');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTypeChange = (type: string) => {
    setWorkType(type);
    if (type === 'webtoon') setPlatform(webtoonPlatforms[0]);
    else setPlatform(novelPlatforms[0]);
  };

  const handleSubmit = async () => {
    if (!title || !platform) { alert("작품명과 플랫폼은 필수입니다!"); return; }

    const payload = {
      title, platform, link, genre, 
      work_type: workType,
      deal_type: dealType
    };

    if (isEditing && editId) {
      const { error } = await supabase.from('free_events').update(payload).eq('id', editId);
      if (!error) {
        alert("정보가 수정되었습니다! ✨");
        resetForm(); setShowWriteForm(false); fetchEvents();
      } else {
        alert("수정 실패: " + error.message);
      }
    } else {
      const { error } = await supabase.from('free_events').insert([{
        user_id: user.id,
        nickname: profile?.nickname || '익명',
        ...payload
      }]);

      if (!error) {
        alert("무료 정보 공유 완료! (+5P)");
        await supabase.rpc('increment_points', { user_id: user.id, amount: 5 });
        
        // ✅ [핵심] 포인트 올리고 나서 프로필 다시 가져오기!
        await fetchProfile();
        
        resetForm(); setShowWriteForm(false); fetchEvents();
      }
    }
  };

  const handleLinkClick = (item: any) => {
    if (item.link && item.link.trim() !== '') {
      window.open(item.link);
    } else {
      const searchKeyword = `${item.title} ${item.platform} ${item.work_type === 'webtoon' ? '웹툰' : '웹소설'}`;
      window.open(`https://www.google.com/search?q=${encodeURIComponent(searchKeyword)}`);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50/30 pb-20">
      <div className="max-w-3xl mx-auto min-h-screen relative bg-white border-x border-gray-50">
        
        <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-50 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-all cursor-pointer"><ChevronLeft size={24} /></button>
            <h1 className="font-black text-lg text-rose-600 flex items-center gap-2">
              <Gift size={20} /> 오늘의 무료
            </h1>
          </div>
          <button onClick={toggleWriteForm} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer ${showWriteForm ? 'bg-gray-100 text-gray-500' : 'bg-rose-500 text-white hover:bg-rose-600'}`}>
            {showWriteForm ? <><X size={14}/> 닫기</> : <><PenTool size={14}/> 정보 공유</>}
          </button>
        </header>

        <main className="px-6 pt-6">
          
          {showWriteForm && (
            <div className="bg-white p-6 rounded-[32px] border-2 border-rose-100 shadow-xl mb-8 animate-in slide-in-from-top-4 duration-300">
              <h3 className="font-bold text-rose-900 mb-4 text-sm flex items-center gap-2">
                {isEditing ? <><Edit2 size={16}/> 정보 수정하기</> : '📢 알뜰 정보 공유하기'}
              </h3>
              
              <div className="flex bg-rose-50 p-1.5 rounded-xl mb-4">
                <button type="button" onClick={() => handleTypeChange('novel')} className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${workType === 'novel' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>
                  <BookOpen size={14}/> 웹소설
                </button>
                <button type="button" onClick={() => handleTypeChange('webtoon')} className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${workType === 'webtoon' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>
                  <Monitor size={14}/> 웹툰
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-rose-400 mb-1 ml-1 block">어떤 혜택인가요?</label>
                  <select value={dealType} onChange={e => setDealType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-rose-200 text-sm font-bold focus:outline-none focus:border-rose-500 bg-white">
                    {dealTypes.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="flex gap-2">
                  <select value={genre} onChange={e => setGenre(e.target.value)} className="px-4 py-3 rounded-xl border border-rose-200 text-sm font-bold focus:outline-none focus:border-rose-500 bg-white">
                    {writeGenres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select value={platform} onChange={e => setPlatform(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-rose-200 text-sm font-bold focus:outline-none focus:border-rose-500 bg-white">
                    {currentPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="작품 제목" className="w-full px-4 py-3 rounded-xl border border-rose-200 text-sm font-bold focus:outline-none focus:border-rose-500" />
                <input value={link} onChange={e => setLink(e.target.value)} placeholder="링크 (비워두면 자동 검색됩니다)" className="w-full px-4 py-3 rounded-xl border border-rose-200 text-sm font-bold focus:outline-none focus:border-rose-500" />
                
                <button onClick={handleSubmit} className="w-full py-3 bg-rose-500 text-white rounded-xl font-black shadow-lg hover:bg-rose-600 transition-all flex justify-center items-center gap-2 cursor-pointer">
                  {isEditing ? <><CheckCircle2 size={16} /> 수정 완료</> : <><Send size={16} /> 등록하고 5P 받기</>}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
            {genres.map(g => (
              <button key={g} onClick={() => setSelectedGenre(g)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${selectedGenre === g ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:border-rose-200'}`}>
                {g}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredEvents.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all flex justify-between items-center group">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-rose-400 shrink-0">
                      {item.work_type === 'webtoon' ? <Monitor size={14}/> : <BookOpen size={14}/>}
                    </span>
                    <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-md shrink-0">
                      {item.deal_type || '기간한정'}
                    </span>
                    <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">{item.genre || '기타'}</span>
                    <span className="text-[10px] text-gray-400 font-bold truncate">| {item.platform}</span>
                  </div>
                  
                  <h3 className="font-black text-gray-900 text-base truncate mb-1">{item.title}</h3>
                  
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400 font-bold">제보: {item.nickname}</p>
                    <span className="text-[10px] text-gray-300 font-bold">· {new Date(item.created_at).toLocaleDateString()}</span>
                    {user && user.id === item.user_id && (
                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="text-[10px] text-rose-400 hover:text-rose-600 font-bold underline cursor-pointer ml-auto">수정</button>
                    )}
                  </div>
                </div>

                <button onClick={() => handleLinkClick(item)} className={`p-3 rounded-full transition-all cursor-pointer shrink-0 ${item.link ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`} title={item.link ? "바로가기" : "구글 검색"}>
                  {item.link ? <ExternalLink size={20} /> : <Search size={20} />}
                </button>
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <div className="text-center py-20 text-gray-400 font-bold">
                <Filter className="mx-auto mb-2 opacity-50" />
                해당 장르의 정보가 없어요!
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}