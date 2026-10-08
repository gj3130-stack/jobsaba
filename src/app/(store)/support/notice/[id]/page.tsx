import { Empty } from "@/components/ui";
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
  if (!supabase) return <Empty title="준비 중인 페이지예요" body="회원·게시판 기능은 오픈 준비 중이에요. 조금만 기다려 주세요." href="/" action="홈으로" />;
  const { post, comments } = await getPost(supabase, id);
  if (!post) notFound();
  return <PostDetail post={post} comments={comments} basePath="/support/notice" canWrite={profile?.role === "admin"} notice={sp.notice} error={sp.error} />;
}
