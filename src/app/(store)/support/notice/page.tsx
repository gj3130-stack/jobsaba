import { PostList } from "@/components/board-screen";
import { listPosts } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "공지" };

export default async function NoticePage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await getSession();
  const posts = supabase ? await listPosts(supabase, "notice") : { posts: [], error: null };
  return (
    <PostList
      title="공지"
      description="배송과 운영 소식을 올립니다."
      posts={posts.posts}
      basePath="/support/notice"
      board="notice"
      canWrite={profile?.role === "admin"}
      notice={sp.notice}
      error={sp.error || posts.error || undefined}
    />
  );
}
