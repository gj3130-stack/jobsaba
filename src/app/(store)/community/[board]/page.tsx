import { notFound } from "next/navigation";
import { PostList } from "@/components/board-screen";
import { listPosts } from "@/lib/queries";
import { getSession } from "@/lib/session";

const BOARDS = {
  qna: { title: "Q&A", description: "상품과 주문에 대한 공개 질문입니다. 비밀글을 고르면 작성자와 관리자만 봅니다.", allowSecret: true },
  free: { title: "자유게시판", description: "밥상 이야기와 간단한 조리 메모를 남기는 곳입니다.", allowSecret: false },
  reservations: {
    title: "예약·픽업 확인",
    description: "픽업을 원하는 날짜와 이름을 글로 남겨 주세요. 실시간 예약이나 자동 확정은 하지 않고, 관리자가 답글로 확인합니다.",
    allowSecret: false,
  },
} as const;

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ board: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { board } = await params;
  if (!(board in BOARDS)) notFound();
  const meta = BOARDS[board as keyof typeof BOARDS];
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const posts = supabase ? await listPosts(supabase, board) : { posts: [] };
  return (
    <PostList
      title={meta.title}
      description={meta.description}
      posts={posts.posts}
      basePath={`/community/${board}`}
      board={board}
      canWrite={Boolean(user)}
      allowSecret={meta.allowSecret}
      notice={sp.notice}
      error={sp.error || posts.error || undefined}
    />
  );
}
