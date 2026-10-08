import { notFound } from "next/navigation";
import { PostDetail } from "@/components/board-screen";
import { getPost } from "@/lib/queries";
import { getSession } from "@/lib/session";

const BOARDS = ["qna", "free", "reservations"];

export default async function CommunityPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ board: string; id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { board, id } = await params;
  if (!BOARDS.includes(board)) notFound();
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  if (!supabase) return <p>Supabase 연결이 필요합니다.</p>;
  const { post, comments } = await getPost(supabase, id);
  if (!post) notFound();
  return <PostDetail post={post} comments={comments} basePath={`/community/${board}`} canWrite={Boolean(user)} notice={sp.notice} error={sp.error} />;
}
