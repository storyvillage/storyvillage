'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, PenLine, Search } from 'lucide-react';
// ✅ 기존에 잘 되던 방식으로 통일
import { supabase } from '@/lib/supabaseClient'; 

let isGlobalProcessing = false;

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setIsLoggedIn(true);
      } catch (e) {
        console.error("로그인 체크 실패:", e);
      }
    };
    checkLogin();
  }, []);

  // 메인과 추가 페이지에서는 헤더 숨김
  if (pathname === '/' || pathname === '/add') return null;
  
  const isMain = pathname === '/';
  const workIdMatch = pathname.match(/\/work\/(\d+)/);
  const currentWorkId = workIdMatch ? workIdMatch[1] : null;

  const handleRecommendClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isGlobalProcessing) return;
    isGlobalProcessing = true;

    try {
      let currentStatus = isLoggedIn;
      if (!currentStatus) {
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
           currentStatus = true;
           setIsLoggedIn(true);
         }
      }

      if (!currentStatus) {
        alert("로그인이 필요한 기능입니다. 🔐");
        // ✅ 원래 보던 작품 페이지로 돌아오도록 설정
        const returnUrl = `/recommend?workId=${currentWorkId}`;
        router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
        
        setTimeout(() => { isGlobalProcessing = false; }, 500);
        return;
      }

      router.push(`/recommend?workId=${currentWorkId}`);
      setTimeout(() => { isGlobalProcessing = false; }, 1500);

    } catch (error) {
      console.error(error);
      isGlobalProcessing = false;
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50 px-5 py-4">
      <div className="max-w-2xl mx-auto flex items-center justify-between relative">
        {!isMain ? (
          <Link href="/" className="p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
            <ArrowLeft size={20} className="text-gray-900" />
          </Link>
        ) : <div className="w-10"></div>}

        <Link href="/" className="text-xl font-black tracking-tighter text-indigo-600 cursor-pointer">
          StoryVillage
        </Link>

        {currentWorkId ? (
          <div 
            onClick={handleRecommendClick}
            className="group relative bg-indigo-600 text-white text-[10px] font-black px-3 py-2 rounded-lg transition-all flex items-center gap-1 shadow-md cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 w-1/3 h-full bg-white/30 skew-x-[-25deg] -left-full group-hover:left-[150%] transition-all duration-700"></div>
            <PenLine size={12}/> 추천글 쓰기
          </div>
        ) : (
          <a href="#library" className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-2 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1 cursor-pointer">
            <Search size={12}/> 작품 고르기
          </a>
        )}
      </div>
    </header>
  );
}