'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Lock, Sparkles, Send, PenTool, X, Filter, 
  Edit2, CheckCircle2, BookOpen, Monitor 
} from 'lucide-react';

export default function SecretPage() {
  const router = useRouter();
  const [gems, setGems] = useState<any[]>([]);
  const [filteredGems, setFilteredGems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('전체');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [workType, setWorkType] = useState('novel'); 
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [genre, setGenre] = useState('판타지');

  const genres = ['전체', '판타지', '현판', '무협', '로판', '로맨스', 'BL/GL', '기타'];
  const writeGenres = ['판타지', '현판', '무협', '로판', '로맨스', 'BL/GL', '기타'];

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(data);
      }
      fetchGems();
    };
    fetchData();
  }, []);

  const fetchGems = async () => {
    const { data } = await supabase.from('hidden_gems').select('*').order('created_at', { ascending: false });
    if (data) {
      setGems(data);
      setFilteredGems(data);
    }
  };

  useEffect(() => {
    if (selectedGenre === '전체') {
      setFilteredGems(gems);
    } else {
      setFilteredGems(gems.filter(item => item.genre === selectedGenre));
    }
  }, [selectedGenre, gems]);

  const toggleWriteForm = () => {
    if (!user) {
      if(confirm("로그인이 필요한 기능입니다. 로그인 하러 가시겠습니까?")) router.push('/login?next=/secret');
      return;
    }
    if ((profile?.level || 1) < 2) { 
      alert("Lv.2 정착민부터 비밀을 풀 수 있어요! 🗝️"); 
      return; 
    }
    if (showWriteForm) resetForm();
    setShowWriteForm(!showWriteForm);
  };

  const resetForm = () => {
    setWorkType('novel'); setTitle(''); setContent(''); setGenre('판타지');
    setIsEditing(false); setEditId(null);
  };

  const handleEditClick = (item: any) => {
    if (!showWriteForm) setShowWriteForm(true);
    setIsEditing(true);
    setEditId(item.id);
    setWorkType(item.work_type || 'novel');
    setTitle(item.title);
    setContent(item.content);
    setGenre(item.genre || '판타지');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!title || !content) { alert("작품명과 추천 이유는 필수입니다!"); return; }

    const payload = {
      title, content, genre, work_type: workType
    };

    if (isEditing && editId) {
      const { error } = await supabase.from('hidden_gems').update(payload).eq('id', editId);
      if (!error) {
        alert("비밀 내용이 수정되었습니다! 🤫");
        resetForm(); setShowWriteForm(false); fetchGems();
      } else {
        alert("수정 실패: " + error.message);
      }
    } else {
      const { error } = await supabase.from('hidden_gems').insert([{
        user_id: user.id,
        nickname: profile?.nickname || '익명',
        ...payload
      }]);

      if (!error) {
        alert("비밀 공유 완료! (+10P)");
        await supabase.rpc('increment_points', { user_id: user.id, amount: 10 });
        resetForm(); setShowWriteForm(false); fetchGems();
      }
    }
  };

  return (
    <div className="min-h-screen bg-purple-50/30 pb-20">
      <div className="max-w-3xl mx-auto min-h-screen relative bg-white border-x border-gray-50">
        
        <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-50 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-all cursor-pointer"><ChevronLeft size={24} /></button>
            <h1 className="font-black text-lg text-purple-600 flex items-center gap-2">
              <Lock size={20} /> 숨읽명 도감
            </h1>
          </div>
          <button onClick={toggleWriteForm} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer ${showWriteForm ? 'bg-gray-100 text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
            {showWriteForm ? <><X size={14}/> 닫기</> : <><PenTool size={14}/> 명작 제보</>}
          </button>
        </header>

        <main className="px-6 pt-6">
          
          {showWriteForm && (
            <div className="bg-white p-6 rounded-[32px] border-2 border-purple-100 shadow-xl mb-8 animate-in slide-in-from-top-4 duration-300">
              <h3 className="font-bold text-purple-900 mb-4 text-sm flex items-center gap-2">
                {isEditing ? <><Edit2 size={16}/> 비밀 수정하기</> : '🤫 나만 아는 명작 풀기'}
              </h3>

              <div className="flex bg-purple-50 p-1.5 rounded-xl mb-4">
                <button type="button" onClick={() => setWorkType('novel')} className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${workType === 'novel' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}>
                  <BookOpen size={14}/> 웹소설
                </button>
                <button type="button" onClick={() => setWorkType('webtoon')} className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${workType === 'webtoon' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}>
                  <Monitor size={14}/> 웹툰
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                   <select value={genre} onChange={e => setGenre(e.target.value)} className="px-4 py-3 rounded-xl border border-purple-200 text-sm font-bold focus:outline-none focus:border-purple-500 bg-white min-w-[100px]">
                    {writeGenres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="작품 제목" className="flex-1 px-4 py-3 rounded-xl border border-purple-200 text-sm font-bold focus:outline-none focus:border-purple-500" />
                </div>
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="이 작품이 특별한 이유를 알려주세요!" className="w-full px-4 py-3 rounded-xl border border-purple-200 text-sm font-bold focus:outline-none focus:border-purple-500 h-24 resize-none" />
                <button onClick={handleSubmit} className="w-full py-3 bg-purple-600 text-white rounded-xl font-black shadow-lg hover:bg-purple-700 transition-all flex justify-center items-center gap-2 cursor-pointer">
                  {isEditing ? <><CheckCircle2 size={16} /> 수정 완료</> : <><Send size={16} /> 등록하고 10P 받기</>}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
            {genres.map(g => (
              <button key={g} onClick={() => setSelectedGenre(g)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${selectedGenre === g ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:border-purple-200'}`}>
                {g}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredGems.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    
                    {/* ✅ [수정] 뱃지를 독립적으로 분리하여 디자인 개선 */}
                    <div className="flex gap-1.5 mb-2">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 
                        ${item.work_type === 'webtoon' ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {item.work_type === 'webtoon' ? <Monitor size={10}/> : <BookOpen size={10}/>}
                        {item.work_type === 'webtoon' ? '웹툰' : '웹소설'}
                      </span>
                      <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-1 rounded-lg">
                        {item.genre || '기타'}
                      </span>
                    </div>

                    <h3 className="font-black text-gray-900 text-lg">{item.title}</h3>
                  </div>
                  <div className="bg-purple-100 text-purple-600 p-2 rounded-full">
                    <Sparkles size={14} fill="currentColor" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-bold leading-relaxed mb-4 line-clamp-3">
                  {item.content}
                </p>
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 border-t border-gray-50 pt-3">
                  <div className="flex items-center gap-2">
                    <span>추천인: {item.nickname}</span>
                    {user && user.id === item.user_id && (
                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="text-purple-400 hover:text-purple-600 font-bold underline cursor-pointer">수정</button>
                    )}
                  </div>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {filteredGems.length === 0 && (
              <div className="text-center py-20 text-gray-400 font-bold">
                <Filter className="mx-auto mb-2 opacity-50" />
                이 장르의 보물은 아직 발견되지 않았어요.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}