'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mail, Lock, User, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. 회원가입 요청
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: nickname, // 닉네임 메타데이터로 저장
        },
      },
    });

    if (error) {
      alert("가입 실패: " + error.message);
      setLoading(false);
    } else {
      // ✅ [핵심] 이메일 인증 안내 팝업
      if (data.user && data.user.identities && data.user.identities.length === 0) {
         alert("이미 가입된 이메일입니다. 로그인해주세요.");
         router.push('/login');
      } else {
         alert("🎉 가입 신청 완료! \n\n입력하신 이메일로 '인증 메일'을 보냈습니다.\n메일함에서 [확인] 버튼을 눌러야 로그인이 가능합니다.");
         router.push('/login');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-sm">
        <button onClick={() => router.back()} className="mb-10 text-gray-900 hover:text-indigo-600 transition-colors">
          <ChevronLeft size={28} />
        </button>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-indigo-600 mb-3">주민 등록</h1>
          <p className="text-gray-500 text-sm font-bold">스토리빌리지의 새 주민이 되어주세요!</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 mb-6">
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
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 (6자 이상)" 
              minLength={6}
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
              required
            />
          </div>
           <div className="relative">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임 (나중에 변경 가능)" 
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
              required
            />
          </div>
          
          <button 
            type="submit" disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-md hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            <UserPlus size={20} /> 가입하기
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm font-bold text-gray-400">
            이미 계정이 있으신가요? <Link href="/login" className="text-indigo-600 hover:underline">로그인하기</Link>
          </p>
        </div>
      </div>
    </div>
  );
}