import { notFound } from "next/navigation";
import { PostDetail } from "@/components/board-screen";
import { getPost } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function NoticeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile } = await getSession();
  if (!supabase) return <p>Supabase 연결이 필요합니다.</p>;
  const { post, comments } = await getPost(supabase, id);
  if (!post) notFound();
  return <PostDetail post={post} comments={comments} basePath="/support/notice" canWrite={profile?.role === "admin"} notice={sp.notice} error={sp.error} />;
}
