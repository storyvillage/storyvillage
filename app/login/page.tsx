'use client';

import { useState, Suspense } from 'react';
// ❌ 기존 구식 클라이언트 삭제
// import { supabase } from '@/lib/supabaseClient'; 
// ✅ 최신 도구(@supabase/ssr)를 가져옵니다.
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Mail, Lock, LogIn, UserPlus, MessageCircle } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/';

  // ✅ 여기서 '쿠키 전용' 수파베이스를 즉석에서 만듭니다.
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert("로그인 실패! 정보를 확인해주세요.");
      setLoading(false);
    } else {
      // ✅ 윈도우 이동으로 확실하게 리다이렉트
      window.location.replace(nextUrl);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    // ✅ 돌아올 주소를 더 안전하게 만듭니다.
    const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;
    
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider, 
      options: { 
        redirectTo: redirectUrl,
        // ✅ 카카오일 때만 이메일 요청을 빼고 '닉네임, 사진'만 요청하도록 설정합니다.
        queryParams: provider === 'kakao' ? { scope: 'profile_nickname,profile_image' } : undefined,
      } 
    });

    if (error) {
      alert(`${provider === 'kakao' ? '카카오' : '구글'} 로그인 중 오류가 발생했습니다.`);
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-sm">
        {/* 1. 헤더 */}
        <button onClick={() => router.back()} className="mb-10 text-gray-900 hover:text-indigo-600 transition-colors">
          <ChevronLeft size={28} />
        </button>

        {/* 2. 타이틀 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-indigo-600 mb-3">StoryVillage</h1>
          <p className="text-gray-500 text-sm font-bold">이메일 또는 소셜 계정으로 입장하세요.</p>
        </div>

        {/* 3. 이메일/비밀번호 폼 */}
        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 주소" 
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" 
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
              required
            />
          </div>
          
          <div className="flex gap-4 mt-2">
            <button 
              type="submit" disabled={loading}
              className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-md hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn size={20} /> 로그인
            </button>
            <button 
              type="button" onClick={() => router.push('/signup')}
              className="flex-1 py-4 bg-white text-indigo-600 border-2 border-indigo-600 rounded-2xl font-black text-lg shadow-sm hover:bg-indigo-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <UserPlus size={20} /> 회원가입
            </button>
          </div>
        </form>

        {/* 4. 구분선 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-[1px] bg-gray-200 flex-1"></div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">OR CONNECT WITH</span>
          <div className="h-[1px] bg-gray-200 flex-1"></div>
        </div>

        {/* 5. 소셜 버튼 */}
        <div className="space-y-3 mb-10">
          <button onClick={() => handleSocialLogin('google')} className="w-full py-4 bg-white border-2 border-gray-200 text-gray-800 rounded-2xl font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84.81-.81z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            구글로 입장하기
          </button>
          <button onClick={() => handleSocialLogin('kakao')} className="w-full py-4 bg-[#FEE500] text-[#391B1B] rounded-2xl font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3">
            <MessageCircle size={22} fill="currentColor" /> 카카오로 입장하기
          </button>
        </div>

        {/* 6. 이용약관 */}
        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
            가입 시 스토리빌리지의 <Link href="#" className="underline hover:text-gray-600">이용약관</Link> 및<br/>
            <Link href="#" className="underline hover:text-gray-600">개인정보 처리방침</Link>에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-gray-300">로딩 중...</div>}>
      <LoginForm />
    </Suspense>
  );
}