import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // 꼬리표(next)가 있으면 챙기고, 없으면 대문('/')
  const next = searchParams.get('next') || '/';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // ✅ 최신 버전은 이렇게 'getAll'과 'setAll'을 써야 합니다!
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // 서버 컴포넌트에서 쿠키를 건드리면 나는 에러를 무시합니다.
            }
          },
        },
      }
    );

    // 인증 코드 교환
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // 성공! 원래 가려던 곳으로 이동
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 실패하면 대문으로 이동
  return NextResponse.redirect(`${origin}/`);
}