import { Empty } from "@/components/ui";
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
  if (!supabase) return <Empty title="준비 중인 페이지예요" body="회원·게시판 기능은 오픈 준비 중이에요. 조금만 기다려 주세요." href="/" action="홈으로" />;
  const { post, comments } = await getPost(supabase, id);
  if (!post) notFound();
  return <PostDetail post={post} comments={comments} basePath={`/community/${board}`} canWrite={Boolean(user)} notice={sp.notice} error={sp.error} />;
}
