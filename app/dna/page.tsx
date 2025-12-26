'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Taste, NEUTRAL_TASTE, clamp, recommendCoreTagsFromTaste } from '@/lib/storyvillage';
import { ChevronLeft, CheckCircle2, RefreshCw, BarChart3 } from 'lucide-react';

// ✅ [수정] 8가지 성분을 측정하기 위한 질문 8개
type Answer = { label: string; delta: Partial<Taste> };
type Q = { id: string; title: string; answers: Answer[] };

const QUESTIONS: Q[] = [
  // 1. 스타일 (기존)
  { id:'q1', title:'답답한 전개(고구마)를 얼마나 견딜 수 있어?', answers:[
    { label:'못 견딤(사이다!)', delta:{ cider:+25 } },
    { label:'조금은 OK', delta:{ cider:+10 } },
    { label:'꽤 OK', delta:{ cider:-10 } },
    { label:'고구마도 맛이다', delta:{ cider:-25 } },
  ]},
  { id:'q2', title:'전개 템포는?', answers:[
    { label:'빠를수록 좋음', delta:{ pace:+25 } },
    { label:'적당히 빠름', delta:{ pace:+10 } },
    { label:'느긋한 빌드업', delta:{ pace:-10 } },
    { label:'잔잔이 최고', delta:{ pace:-25 } },
  ]},
  // 2. 분위기 (기존)
  { id:'q3', title:'다크/피폐 내성은?', answers:[
    { label:'힐링만', delta:{ dark:-25 } },
    { label:'조금은 괜찮음', delta:{ dark:-10 } },
    { label:'꽤 괜찮음', delta:{ dark:+10 } },
    { label:'다크가 맛이다', delta:{ dark:+25 } },
  ]},
  { id:'q4', title:'로맨스 비중은?', answers:[
    { label:'로맨스 거의 X', delta:{ romance:-25 } },
    { label:'있어도 무관', delta:{ romance:-5 } },
    { label:'적당히 있으면 좋음', delta:{ romance:+10 } },
    { label:'로맨스가 중심', delta:{ romance:+25 } },
  ]},
  // 3. 신규 성분 4종 (기획 반영)
  { id:'q5', title:'설정이나 개연성은?', answers:[
    { label:'논문급 치밀함', delta:{ probability:+25 } },
    { label:'오류만 없으면 됨', delta:{ probability:+10 } },
    { label:'재미있으면 장땡', delta:{ probability:-10 } },
    { label:'뇌 빼고 봄', delta:{ probability:-25 } },
  ]},
  { id:'q6', title:'주인공의 성장은?', answers:[
    { label:'바닥부터 성장형', delta:{ growth:+25 } },
    { label:'성장하긴 함', delta:{ growth:+10 } },
    { label:'완성형 강자', delta:{ growth:-10 } },
    { label:'세계관 최강자', delta:{ growth:-25 } },
  ]},
  { id:'q7', title:'선호하는 캐릭터는?', answers:[
    { label:'입체적인 인간상', delta:{ character:+25 } },
    { label:'사연 있는 악당', delta:{ character:+10 } },
    { label:'단순명쾌한 성격', delta:{ character:-10 } },
    { label:'권선징악 확실', delta:{ character:-25 } },
  ]},
  { id:'q8', title:'가독성(술술 읽힘)은?', answers:[
    { label:'킬링타임(술술)', delta:{ readability:+25 } },
    { label:'적당히 가벼움', delta:{ readability:+10 } },
    { label:'생각할 거리 필요', delta:{ readability:-10 } },
    { label:'묵직한 벽돌책', delta:{ readability:-25 } },
  ]},
];

// --- [Bar 컴포넌트: 원본 디자인 유지] ---
function Bar({ label, value, colorClass = "bg-indigo-500" }: { label: string, value: number, colorClass?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs font-bold text-gray-600">
      <div className="w-14 shrink-0 text-right">{label}</div>
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden relative">
        <div 
          className={`absolute top-0 left-0 h-full ${colorClass} transition-all duration-700`} 
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="w-8 shrink-0 text-gray-400 text-right">{Math.round(value)}</div>
    </div>
  );
}

export default function DNATestPage() {
  const router = useRouter();
  
  const [step, setStep] = useState(0); 
  const [taste, setTaste] = useState<Taste>({ ...NEUTRAL_TASTE });
  const [saving, setSaving] = useState(false);

  // 답변 핸들러
  const handleAnswer = (delta: Partial<Taste>) => {
    setTaste(prev => {
      const next = { ...prev };
      (Object.keys(delta) as Array<keyof Taste>).forEach(key => {
        if (delta[key] !== undefined) {
          next[key] = clamp(next[key] + (delta[key] || 0));
        }
      });
      return next;
    });

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setStep(QUESTIONS.length);
    }
  };

  // 저장 로직
  // 🔵 완벽하게 고쳐진 코드 (이걸로 덮어쓰세요)
  const go = async () => {
    setSaving(true);
    try {
      // 1. 현재 접속한 유저의 세션(ID, 이메일 등)을 가져옵니다.
      const { data: { session } } = await supabase.auth.getSession();
      
      localStorage.setItem('storyvillage_auto_filter', 'true');

      if (session) {
        // 2. [핵심 수정] update를 upsert로 변경하여 데이터가 없으면 만들고 있으면 고칩니다.
        // 이메일 주소도 이때 함께 저장하여 네이버 계정 연동 문제를 해결합니다.
        const { error } = await supabase
          .from('profiles')
          .upsert({ 
            id: session.user.id,        // 유저 고유 번호 (이걸로 본인 확인)
            email: session.user.email,  // 비어있던 이메일 정보를 강제로 채워넣음
            dna: taste,                 // 측정된 8대 성분 값
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });     // ID가 겹치면 새로 만들지 말고 덮어쓰기

        if (error) {
          console.error("DB 저장 실패!", error.message);
          throw error;
        }
      } else {
        // 로그인을 안 한 상태라면 브라우저 임시 저장소에 보관
        localStorage.setItem('guest_dna', JSON.stringify(taste));
      }
      
      // 3. 저장이 완료되면 메인 페이지로 이동
      router.push('/');
    } catch (e) {
      console.error("에러 발생:", e);
      alert('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep(0);
    setTaste({ ...NEUTRAL_TASTE });
  };

  // ----------------------------------------------------
  // [렌더링 1] 결과 화면 (8개 성분 표시)
  if (step >= QUESTIONS.length) {
    const coreTags = recommendCoreTagsFromTaste(taste);

    return (
      <main className="min-h-screen bg-white p-6 flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="w-full space-y-6 animate-fade-in-up">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 rounded-full text-indigo-600 mb-2">
              <div className="text-xs font-black text-indigo-600 flex items-center gap-1">
                <CheckCircle2 size={14}/> 분석 완료
              </div>
            </div>
            <div className="text-2xl font-black mb-1">당신의 취향 DNA</div>
            <p className="text-xs text-indigo-200 font-medium leading-relaxed">
              이 결과는 저장되어, <br/>
              앞으로 <strong>메인 화면의 기본 검색 값</strong>으로 사용됩니다.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {coreTags.length ? coreTags.map((t) => (
                <span key={t} className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs font-black text-gray-600">
                  #{t}
                </span>
              )) : <span className="text-xs font-bold text-gray-400">밸런스형! 메인에서 직접 골라보세요.</span>}
            </div>
          </div>

          {/* ✅ [수정] 8개 그래프 표시 (원본 디자인 박스 안에 욱여넣지 않고 깔끔하게 정리) */}
          <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 shadow-inner">
            <div className="flex items-center gap-2 mb-4 text-gray-400 text-xs font-black">
              <BarChart3 size={14}/> 상세 분석표
            </div>
            
            <div className="space-y-4">
              {/* 그룹 1 */}
              <div>
                <Bar label="가독성" value={taste.readability} colorClass="bg-emerald-400" />
                <Bar label="사이다" value={taste.cider} colorClass="bg-blue-400" />
                <Bar label="속도" value={taste.pace} colorClass="bg-cyan-400" />
              </div>
              <div className="h-px bg-gray-200"/>
              {/* 그룹 2 */}
              <div>
                <Bar label="다크함" value={taste.dark} colorClass="bg-purple-400" />
                <Bar label="로맨스" value={taste.romance} colorClass="bg-pink-400" />
              </div>
              <div className="h-px bg-gray-200"/>
              {/* 그룹 3 */}
              <div>
                <Bar label="개연성" value={taste.probability} colorClass="bg-indigo-400" />
                <Bar label="성장성" value={taste.growth} colorClass="bg-orange-400" />
                <Bar label="입체적" value={taste.character} colorClass="bg-teal-400" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button 
              onClick={reset}
              className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={16}/> 다시하기
            </button>
            <button 
              onClick={go}
              disabled={saving}
              className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-black text-base shadow-lg hover:bg-gray-800 active:scale-95 transition-all"
            >
              {saving ? '저장 중...' : '결과 적용하기 🚀'}
            </button>
          </div>

        </div>
      </main>
    );
  }

  // ----------------------------------------------------
  // [렌더링 2] 질문 화면 (원본 디자인 100% 동일)
  const q = QUESTIONS[step];
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  return (
    <main className="min-h-screen bg-white flex flex-col max-w-md mx-auto relative">
      <div className="p-4 flex items-center">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-400 hover:bg-gray-50 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center font-black text-gray-400 text-xs tracking-widest">
          DNA ANALYSIS ({step + 1}/{QUESTIONS.length})
        </div>
        <div className="w-10" />
      </div>

      <div className="w-full h-1 bg-gray-100 mb-8">
        <div 
          className="h-full bg-indigo-600 transition-all duration-300 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 px-6 pb-10 flex flex-col">
        <div className="mb-10 animate-fade-in-up">
          <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black mb-3">
            Q{step + 1}.
          </span>
          <h2 className="text-2xl font-black text-gray-900 leading-snug mb-2 whitespace-pre-wrap">
            {q.title}
          </h2>
        </div>

        <div className="space-y-3 flex-1">
          {q.answers.map((ans, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(ans.delta)}
              className="w-full text-left p-5 rounded-2xl border-2 border-gray-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all group animate-fade-in-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <span className="block font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">
                {ans.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}