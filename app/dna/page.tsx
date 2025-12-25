'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Taste, NEUTRAL_TASTE, clamp, recommendCoreTagsFromTaste } from '@/lib/storyvillage';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';

type Answer = { label: string; delta: Partial<Taste> };
type Q = { id: string; title: string; answers: Answer[] };

const QUESTIONS: Q[] = [
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
  { id:'q5', title:'사이다는 “결과”가 빨라야 한다', answers:[
    { label:'완전 공감', delta:{ cider:+15, pace:+10 } },
    { label:'대체로 공감', delta:{ cider:+8, pace:+5 } },
    { label:'상관없음', delta:{} },
    { label:'과정이 더 중요', delta:{ cider:-10, pace:-5 } },
  ]},
  { id:'q6', title:'감정 온도는?', answers:[
    { label:'따뜻하게', delta:{ dark:-15 } },
    { label:'중립', delta:{} },
    { label:'차갑게', delta:{ dark:+15 } },
    { label:'극한', delta:{ dark:+25 } },
  ]},
];

function add(base: Taste, delta: Partial<Taste>) {
  const out: Taste = { ...base };
  (Object.keys(delta) as (keyof Taste)[]).forEach((k) => { out[k] = clamp(out[k] + (delta as any)[k]); });
  return out;
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-black text-gray-600 mb-2">
        <span>{label}</span><span className="text-gray-400">{Math.round(value)}%</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-3 bg-indigo-600 rounded-full" style={{ width: `${Math.round(value)}%` }} />
      </div>
    </div>
  );
}

export default function DNA() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [user, setUser] = useState<any>(null);

  // [수정 1] 로그인 체크 로직 추가
  useEffect(() => {
    const checkLogin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("🔒 DNA 분석은 로그인이 필요한 기능입니다.\n(결과를 저장하고 검색에 반영해야 하거든요!)");
        router.replace('/login'); // replace로 뒤로가기 방지
      } else {
        setUser(session.user);
      }
    };
    checkLogin();
  }, []);

  const done = step >= QUESTIONS.length;
  const taste = useMemo(() => {
    let t = { ...NEUTRAL_TASTE };
    for (const q of QUESTIONS) {
      const idx = picked[q.id];
      if (idx == null) continue;
      t = add(t, q.answers[idx].delta);
    }
    return t;
  }, [picked]);

  const coreTags = useMemo(() => recommendCoreTagsFromTaste(taste), [taste]);

  const saveProfile = async () => {
    if (!user) return;
    await supabase.from('taste_profiles').upsert({
      user_id: user.id,
      cider: Math.round(taste.cider),
      pace: Math.round(taste.pace),
      dark: Math.round(taste.dark),
      romance: Math.round(taste.romance),
      core_tags: coreTags,
      updated_at: new Date().toISOString(),
    });
  };

  const go = async () => {
    await saveProfile();
    router.push('/'); 
  };

  // 로그인 체크 중이면 빈 화면
  if (!user) return <div className="min-h-screen bg-white" />;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto min-h-screen border-x border-gray-50 px-6 py-8">
        <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-all"><ChevronLeft size={24}/></button>
          <button onClick={() => { setPicked({}); setStep(0); }} className="text-xs font-black text-gray-400 hover:text-gray-700">다시하기</button>
        </div>

        <h1 className="mt-6 text-2xl font-black text-gray-900">취향 DNA 테스트</h1>
        <p className="mt-2 text-xs font-bold text-gray-400">스포일러 없는 “맛 지표”만 만들어요.</p>

        {!done ? (
          <div className="mt-8">
            <div className="text-[11px] font-black text-gray-400 mb-2">{step+1} / {QUESTIONS.length}</div>
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
              <div className="text-lg font-black text-gray-900">{QUESTIONS[step].title}</div>
              <div className="mt-4 grid gap-2">
                {QUESTIONS[step].answers.map((a, idx) => {
                  const on = picked[QUESTIONS[step].id] === idx;
                  return (
                    <button key={idx} onClick={() => setPicked((p)=>({ ...p, [QUESTIONS[step].id]: idx }))}
                      className={['w-full text-left px-4 py-3 rounded-2xl border font-black text-sm transition-all',
                        on ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-800 border-gray-200 hover:border-indigo-200'].join(' ')}>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setStep((s)=>Math.max(0,s-1))} disabled={step===0} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm disabled:opacity-50">이전</button>
              <button onClick={() => setStep((s)=>s+1)} disabled={picked[QUESTIONS[step].id]==null} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm disabled:opacity-50 transition-all active:scale-95">다음</button>
            </div>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            <div className="bg-indigo-600 text-white rounded-3xl p-6 shadow-xl shadow-indigo-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={18} className="text-indigo-200"/>
                <div className="text-xs font-black text-indigo-100">분석 완료</div>
              </div>
              <div className="text-2xl font-black mb-1">당신의 취향 DNA</div>
              <p className="text-xs text-indigo-200 font-medium leading-relaxed">
                이 결과는 저장되어, <br/>
                앞으로 <strong>메인 화면의 기본 검색 값</strong>으로 사용됩니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {coreTags.length ? coreTags.map((t) => (
                  <span key={t} className="px-3 py-1 bg-white/20 border border-white/10 rounded-full text-xs font-black">#{t}</span>
                )) : <span className="text-xs font-bold text-indigo-100">밸런스형! 메인에서 직접 골라보세요.</span>}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 grid gap-4">
              <Bar label="사이다" value={taste.cider} />
              <Bar label="전개" value={taste.pace} />
              <Bar label="다크" value={taste.dark} />
              <Bar label="로맨스" value={taste.romance} />
            </div>

            <div className="space-y-3">
              <button onClick={go} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-base shadow-lg hover:bg-gray-800 transition-all active:scale-95">
                저장하고 메인으로 가기
              </button>
              <p className="text-center text-[10px] text-gray-400">결과는 언제든 다시 테스트해서 바꿀 수 있어요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}