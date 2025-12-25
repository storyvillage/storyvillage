import { createBrowserClient } from '@supabase/ssr';

// ✅ 이제 옛날 createClient 대신, 최신 'createBrowserClient'를 씁니다.
// 이렇게 하면 이 파일을 쓰는 모든 페이지(무료/숨읽명)가 자동으로 '쿠키'를 확인하게 됩니다!
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);