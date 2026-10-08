import Link from "next/link";
import { Flash } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { CommentItem, PostItem } from "@/lib/models";
import { createComment, createPost } from "@/server/shop";

export function PostList({
  title,
  description,
  posts,
  basePath,
  board,
  canWrite,
  allowSecret,
  productId,
  notice,
  error,
}: {
  title: string;
  description: string;
  posts: PostItem[];
  basePath: string;
  board: string;
  canWrite: boolean;
  allowSecret?: boolean;
  productId?: string;
  notice?: string;
  error?: string;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="serif text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </header>
      <Flash notice={notice} error={error} />
      {canWrite ? (
        <form action={createPost} className="panel space-y-3 p-5">
          <input type="hidden" name="board" value={board} />
          <input type="hidden" name="back" value={basePath} />
          {productId ? <input type="hidden" name="productId" value={productId} /> : null}
          <input className="field" name="title" required maxLength={120} placeholder="제목" />
          <textarea className="field min-h-28" name="content" required maxLength={5000} placeholder="내용" />
          {allowSecret ? (
            <label className="flex gap-2 text-sm">
              <input type="checkbox" name="secret" /> 비밀글
            </label>
          ) : null}
          <button className="btn btn-primary" type="submit">
            등록
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">글을 쓰려면 로그인해 주세요.</p>
      )}
      <ul className="divide-y divide-line rounded-2xl bg-paper ring-1 ring-line">
        {posts.length === 0 ? <li className="p-6 text-sm text-muted">아직 글이 없습니다.</li> : null}
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`${basePath}/${post.id}`} className="block px-5 py-4">
              <p className="font-medium">
                {post.isPinned ? "고정 · " : ""}
                {post.isSecret ? "비밀 · " : ""}
                {post.title}
              </p>
              <p className="mt-1 text-xs text-muted">
                {post.authorName} · {formatDateTime(post.createdAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PostDetail({
  post,
  comments,
  basePath,
  canWrite,
  notice,
  error,
}: {
  post: PostItem;
  comments: CommentItem[];
  basePath: string;
  canWrite: boolean;
  notice?: string;
  error?: string;
}) {
  return (
    <article className="space-y-6">
      <Link href={basePath} className="text-sm text-muted">
        목록
      </Link>
      <header>
        <h1 className="serif text-4xl">{post.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {post.authorName} · {formatDateTime(post.createdAt)}
        </p>
      </header>
      <Flash notice={notice} error={error} />
      <div className="panel whitespace-pre-wrap p-6 leading-7">{post.content}</div>
      <section className="space-y-3">
        <h2 className="font-semibold">댓글</h2>
        {comments.map((comment) => (
          <div key={comment.id} className="panel p-4">
            <p className="text-xs text-muted">
              {comment.isAdmin ? "잡사바" : comment.authorName} · {formatDateTime(comment.createdAt)}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.content}</p>
          </div>
        ))}
        {canWrite ? (
          <form action={createComment} className="space-y-2">
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="back" value={`${basePath}/${post.id}`} />
            <textarea className="field min-h-24" name="content" required placeholder="댓글" />
            <button className="btn btn-primary" type="submit">
              등록
            </button>
          </form>
        ) : null}
      </section>
    </article>
  );
}
