import { ChatWidget, Footer, Header, HomePopup, MobileNav } from "@/components/chrome";
import { getCart } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { storeCategories } from "@/lib/store-data";
import { supabaseEnv } from "@/lib/supabase/env";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await getSession();
  if (!supabaseEnv().configured && process.env.NODE_ENV !== "production") {
    // 방문자 화면에는 띄우지 않고 개발 콘솔에만 남긴다.
    console.warn("[jobsaba] Supabase URL/anon 키가 없어 로컬 카탈로그(src/lib/catalog-data.ts)로 상점을 보여 줍니다.");
  }
  const categories = (await storeCategories(supabase)).map((category) => ({ slug: category.slug, name: category.name }));
  let cartCount = 0;
  let popup: { id: string; title: string; body: string; link: string } | null = null;
  if (supabase) {
    if (user) {
      const cart = await getCart(supabase, user.id);
      cartCount = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
    }
    const { data } = await supabase.from("popups").select("id,title,body,link_url").eq("is_active", true).limit(1).maybeSingle();
    if (data && typeof data === "object" && "id" in data) {
      popup = {
        id: String(data.id),
        title: String(data.title ?? ""),
        body: String(data.body ?? ""),
        link: String(data.link_url ?? "/signup"),
      };
    }
  }
  return (
    <div className="flex min-h-screen flex-col">
      <Header categories={categories} cartCount={cartCount} email={profile?.email ?? user?.email ?? null} isAdmin={profile?.role === "admin"} />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-10 pt-4 md:px-8 md:pt-8">{children}</main>
      <Footer />
      <MobileNav cartCount={cartCount} member={Boolean(user)} />
      <ChatWidget />
      {popup ? <HomePopup popup={popup} /> : null}
    </div>
  );
}
