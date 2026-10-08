import { listPosts } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "FAQ" };

export default async function FaqPage() {
  const { supabase } = await getSession();
  const { posts } = supabase ? await listPosts(supabase, "faq") : { posts: [] };
  return (
    <div>
      <h1 className="serif text-4xl">자주 묻는 질문</h1>
      <div className="mt-6 space-y-3">
        {posts.map((post) => (
          <details key={post.id} className="panel p-5">
            <summary className="cursor-pointer font-medium">{post.title}</summary>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{post.content}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
