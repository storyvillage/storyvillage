'use client';

// ✅ 1. 파일 맨 위 import에 Suspense를 추가했습니다.
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Taste, NEUTRAL_TASTE, cleanTag, CORE_TAGS, TAG_GROUPS } from '@/lib/storyvillage';
import { ChevronLeft, PenTool, CheckCircle2 } from 'lucide-react';

// ✅ 2. 실제 내용을 담은 보따리를 하나 더 만들었습니다. (기존 AddPage -> AddWorkForm으로 이름 변경)
function AddWorkForm() {
  const router = useRouter();
  const sp = useSearchParams(); // ⬅️ 에러의 원인이 되는 부분입니다.
  
  const prefill = useMemo(() => {
    const raw = sp.get('prefill_tags');
    if (!raw) return [];
    return decodeURIComponent(raw).split(',').map(cleanTag).filter(Boolean);
  }, [sp]);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [platform, setPlatform] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [taste, setTaste] = useState<Taste>(NEUTRAL_TASTE);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (prefill.length) setTags(prefill); }, [prefill]);

  const statConfig = [
    { key: 'readability', label: '📚 묵직함', label2: '📖 술술', color: 'accent-emerald-600' }, // 👈 추가됨!
    { key: 'cider', label: '🍠 고구마', label2: '🥤 사이다', color: 'accent-indigo-600' },
    { key: 'pace', label: '🐢 느림', label2: '⚡ 빠름', color: 'accent-blue-600' },
    { key: 'dark', label: '☀️ 힐링', label2: '🌑 피폐', color: 'accent-gray-600' },
    { key: 'romance', label: '🌵 노맨스', label2: '💖 로맨스', color: 'accent-pink-600' },
    { key: 'probability', label: '⚡ 극적허용', label2: '🧠 개연성', color: 'accent-purple-600' },
    { key: 'character', label: '😇 선함', label2: '😈 악당', color: 'accent-red-600' },
    { key: 'growth', label: '👶 성장', label2: '👑 완성', color: 'accent-yellow-600' },
  ];

  const toggleTag = (raw: string) => {
    const t = cleanTag(raw);
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].slice(0, 8));
  };

  const save = async () => {
    if (!title.trim()) { alert('작품명을 입력해주세요!'); return; }
    if (!author.trim()) { alert('작가명을 입력해주세요! (필수)'); return; }
    setLoading(true);
    const statsJSON = {
      cider: Math.round(taste.cider), pace: Math.round(taste.pace), mood: Math.round(taste.dark), 
      romance: Math.round(taste.romance), probability: Math.round(taste.probability),
      character: Math.round(taste.character), growth: Math.round(taste.growth),
      readability: Math.round(taste.readability ?? 50), // 👈 추가됨!
    };
    
    const payload: any = {
      title: title.trim(), author: author.trim(), platform: platform.trim(),
      work_type: 'webnovel', tags, status: 'pending', stats: statsJSON,
      admin_cider: Math.round(taste.cider), admin_pace: Math.round(taste.pace),
      admin_dark: Math.round(taste.dark), admin_romance: Math.round(taste.romance),
      admin_probability: Math.round(taste.probability), admin_character: Math.round(taste.character),
      admin_growth: Math.round(taste.growth),
      admin_readability: Math.round(taste.readability ?? 50), // 👈 추가됨!
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('works').insert(payload);
    setLoading(false);
    if (error) { console.error(error); alert('오류가 발생했습니다.'); } 
    else { alert('제보 완료! 촌장님 확인 후 등록됩니다. 📦'); router.push('/'); }
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="max-w-3xl mx-auto min-h-screen bg-white relative">
        <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-50">
          <button onClick={()=>router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-all"><ChevronLeft size={24}/></button>
          <span className="font-black text-lg text-gray-900">작품 제보</span>
          <div className="w-10"></div> 
        </header>
        <main className="px-6 pt-4">
          <div className="bg-indigo-50 p-6 rounded-3xl mb-8 text-center">
            <PenTool className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
            <h2 className="text-xl font-black text-gray-900 mb-1">이 작품도 맛집인데!</h2>
            <p className="text-sm font-bold text-gray-500">우리 마을에 없는 웹소설 명작을 알려주세요.<br/>성분 분석표까지 채워주시면 더 좋아요!</p>
          </div>
          <div className="space-y-8">
            <div className="space-y-4">
              <Field label="작품명 (필수)"><input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-2xl font-bold outline-none focus:bg-white focus:ring-2 ring-indigo-500 transition-all" placeholder="예: 전지적 독자 시점" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="작가 (필수)"><input value={author} onChange={(e)=>setAuthor(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-2xl font-bold outline-none focus:bg-white focus:ring-2 ring-indigo-500 transition-all" /></Field>
                <Field label="플랫폼 (선택)"><input value={platform} onChange={(e)=>setPlatform(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-2xl font-bold outline-none focus:bg-white focus:ring-2 ring-indigo-500 transition-all" /></Field>
              </div>
            </div>
            <Field label="태그 선택 (최대 8개)">
              <div className="bg-white border border-gray-200 rounded-3xl p-4">
                <div className="text-[10px] font-black text-indigo-500 mb-2 uppercase tracking-wider">🔥 핵심 재미</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {CORE_TAGS.map(t => (<TagBtn key={t} tag={t} selected={tags.includes(cleanTag(t))} onClick={()=>toggleTag(t)} />))}
                </div>
                {Object.entries(TAG_GROUPS).map(([group, groupTags]) => (
                  <div key={group} className="mb-3 last:mb-0">
                    <div className="text-[10px] font-black text-gray-400 mb-2">{group}</div>
                    <div className="flex flex-wrap gap-2">{(groupTags as any)?.map?.((t: any) => (<TagBtn key={t} tag={t} selected={tags.includes(cleanTag(t))} onClick={()=>toggleTag(t)} />))}</div>
                  </div>
                ))}
              </div>
            </Field>
            <Field label="이 작품의 맛은? (추정치)">
              <div className="bg-white border border-gray-100 rounded-3xl p-5 space-y-6 shadow-sm">
                {statConfig.map((item) => (
                  <div key={item.key}>
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-2"><span>{item.label}</span><span className="text-indigo-600 font-black">{taste[item.key as keyof Taste] ?? 50}%</span><span>{item.label2}</span></div>
                    <input type="range" min={0} max={100} step={10} value={taste[item.key as keyof Taste] ?? 50} onChange={(e)=>setTaste({...taste, [item.key]: Number(e.target.value)})} className={`w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer ${item.color}`} />
                  </div>
                ))}
              </div>
            </Field>
            <button onClick={save} disabled={loading} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">{loading ? '전송 중...' : <><CheckCircle2 size={20}/> 제보하기</>}</button>
          </div>
        </main>
      </div>
    </div>
  );
}

// ✅ 3. 여기가 핵심입니다. 위에서 만든 보따리(AddWorkForm)를 Suspense 보호막으로 감싸서 내보냅니다.
export default function AddPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-black text-gray-300 animate-pulse">마을 비서가 페이지 조립 중... 👷</div>}>
      <AddWorkForm />
    </Suspense>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return (<div><div className="text-xs font-black text-gray-500 mb-2 ml-1">{label}</div>{children}</div>); }
function TagBtn({ tag, selected, onClick }: { tag: string, selected: boolean, onClick: () => void }) { return (<button onClick={onClick} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-100'}`}>{tag}</button>); }