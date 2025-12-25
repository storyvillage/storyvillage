'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ChevronLeft, Save, Trash2, Layout, Link as LinkIcon } from 'lucide-react'; // Monitor, BookOpen 아이콘 제거
import { Taste } from '@/lib/storyvillage';

export default function EditWorkPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 폼 데이터 상태
  const [form, setForm] = useState({
    title: '',
    author: '',
    platform: '',
    platform_link: '',
    description: '',
    work_type: 'webnovel', // 화면엔 안 보이지만 기본값 유지
  });

  // 관리자용 7대 성분
  const [adminTaste, setAdminTaste] = useState<Taste>({
    cider: 50, pace: 50, dark: 50, romance: 50, probability: 50, character: 50, growth: 50
  });

  // 성분 설정
  const statConfig = [
    { key: 'cider', left: '🍠 고구마', right: '🥤 사이다', color: 'accent-indigo-600' },
    { key: 'pace', left: '🐢 빌드업', right: '⚡ 빠른전개', color: 'accent-blue-600' },
    { key: 'dark', left: '☀️ 힐링물', right: '🌑 피폐/딥', color: 'accent-gray-600' },
    { key: 'romance', left: '🌵 노맨스', right: '💖 로맨스', color: 'accent-pink-600' },
    { key: 'probability', left: '⚡ 극적 허용', right: '🧠 개연성', color: 'accent-purple-600' },
    { key: 'character', left: '😇 선함/호구', right: '😈 악당형', color: 'accent-red-600' },
    { key: 'growth', left: '👶 성장형', right: '👑 완성형', color: 'accent-yellow-600' },
  ];

  useEffect(() => {
    fetchWork();
  }, []);

  const fetchWork = async () => {
    if (!id) return;
    const { data, error } = await supabase.from('works').select('*').eq('id', id).single();
    if (error) {
      alert('작품을 불러오지 못했습니다.');
      router.back();
      return;
    }

    setForm({
      title: data.title || '',
      author: data.author || '',
      platform: data.platform || '',
      platform_link: data.platform_link || '',
      description: data.description || '',
      work_type: data.work_type || 'webnovel',
    });

    const s = data.stats || {};
    setAdminTaste({
        cider: s.cider ?? data.admin_cider ?? 50,
        pace: s.pace ?? data.admin_pace ?? 50,
        dark: s.mood ?? data.admin_dark ?? 50,
        romance: s.romance ?? data.admin_romance ?? 50,
        probability: s.probability ?? data.admin_probability ?? 50,
        character: s.character ?? data.admin_character ?? 50,
        growth: s.growth ?? data.admin_growth ?? 50,
    });

    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { alert('제목은 필수입니다!'); return; }
    setSaving(true);

    const updates = {
      title: form.title,
      author: form.author,
      platform: form.platform,
      platform_link: form.platform_link,
      description: form.description,
      work_type: form.work_type,
      // 7대 성분 저장
      admin_cider: adminTaste.cider,
      admin_pace: adminTaste.pace,
      admin_dark: adminTaste.dark,
      admin_romance: adminTaste.romance,
      admin_probability: adminTaste.probability,
      admin_character: adminTaste.character,
      admin_growth: adminTaste.growth,
      // 하위 호환성용 stats jsonb
      stats: {
        cider: adminTaste.cider,
        pace: adminTaste.pace,
        mood: adminTaste.dark,
        romance: adminTaste.romance,
        probability: adminTaste.probability,
        character: adminTaste.character,
        growth: adminTaste.growth,
      },
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('works').update(updates).eq('id', id);

    if (error) {
      alert('저장 실패: ' + error.message);
    } else {
      alert('수정되었습니다! 🎉');
      router.push(`/work/${id}`);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까? (복구 불가)')) return;
    const { error } = await supabase.from('works').delete().eq('id', id);
    if (!error) {
      alert('삭제되었습니다.');
      router.replace('/');
    } else {
      alert('삭제 실패: ' + error.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">데이터 불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-2xl mx-auto bg-white min-h-screen shadow-sm">
        
        {/* 헤더 */}
        <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-600"><ChevronLeft size={24}/></button>
          <h1 className="font-black text-lg text-gray-900">작품 정보 수정</h1>
          <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-full transition-all"><Trash2 size={20}/></button>
        </header>

        <div className="p-6 space-y-8">
          
          {/* 1. 기본 정보 섹션 */}
          <section className="space-y-4">
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2"><Layout size={16}/> 기본 정보</h2>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2">
                 <label className="block text-xs font-bold text-gray-500 mb-1">작품 제목 <span className="text-red-500">*</span></label>
                 <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 font-bold text-gray-900" placeholder="제목을 입력하세요"/>
               </div>
               
               <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">작가명</label>
                 <input type="text" value={form.author} onChange={e => setForm({...form, author: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 font-bold text-gray-900" placeholder="작가 이름"/>
               </div>

               <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">연재처(플랫폼)</label>
                 <input type="text" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 font-bold text-gray-900" placeholder="예: 네이버시리즈"/>
               </div>
               
               {/* 🗑️ 작품 유형 선택 박스 삭제됨 */}
            </div>
          </section>

          {/* 2. 링크 섹션 */}
          <section className="space-y-4">
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2"><LinkIcon size={16}/> 연결 링크</h2>
            <div>
               <label className="block text-xs font-bold text-indigo-600 mb-1">🔗 작품 보러가기 URL (경로)</label>
               <input 
                 type="text" 
                 value={form.platform_link} 
                 onChange={e => setForm({...form, platform_link: e.target.value})} 
                 className="w-full p-3 bg-indigo-50 rounded-xl border border-indigo-100 outline-none focus:border-indigo-500 font-bold text-indigo-900 placeholder-indigo-300" 
                 placeholder="https://..."
               />
               <p className="text-[10px] text-gray-400 mt-1 pl-1"> *여기에 입력하면 상세페이지 하단 '작품 보러가기' 버튼이 활성화됩니다.</p>
            </div>
          </section>

          {/* 3. 성분 분석 (7대 성분) */}
          <section className="space-y-4">
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">🧪 공식 성분 설정 (관리자)</h2>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-6">
              {statConfig.map((s) => (
                <div key={s.key}>
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                    <span>{s.left}</span>
                    <span className="text-indigo-600">{adminTaste[s.key as keyof Taste]}%</span>
                    <span>{s.right}</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="5" 
                    value={adminTaste[s.key as keyof Taste]} 
                    onChange={(e) => setAdminTaste({...adminTaste, [s.key]: Number(e.target.value)})}
                    className={`w-full h-2 bg-white rounded-lg appearance-none cursor-pointer border border-gray-200 ${s.color}`}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* 4. 상세 소개 */}
          <section className="space-y-4">
            <h2 className="text-sm font-black text-gray-900">📝 작품 소개</h2>
            <textarea 
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})} 
              className="w-full h-40 p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 font-medium text-sm text-gray-700 resize-none"
              placeholder="작품 줄거리나 매력 포인트를 적어주세요."
            />
          </section>

        </div>

        {/* 하단 저장 버튼 */}
        <div className="p-6 fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
          <div className="max-w-2xl mx-auto">
            <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50">
              <Save size={18}/> {saving ? '저장 중...' : '수정사항 저장하기'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}