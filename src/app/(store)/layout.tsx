import { ChatWidget, Footer, Header, HomePopup, MobileNav } from "@/components/chrome";
import { CATEGORY_NAV } from "@/lib/nav";
import { getCart, listCategories } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { supabaseEnv } from "@/lib/supabase/env";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await getSession();
  let categories: { slug: string; name: string }[] = [...CATEGORY_NAV];
  let cartCount = 0;
  let popup: { id: string; title: string; body: string; link: string } | null = null;
  if (supabase) {
    const loaded = await listCategories(supabase);
    if (loaded.categories.length > 0) categories = loaded.categories;
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
      {!supabaseEnv().configured ? (
        <p className="bg-ink px-4 py-2 text-center text-sm text-paper">Supabase URL과 anon 키를 넣으면 상품과 로그인이 연결됩니다.</p>
      ) : null}
      <Header categories={categories} cartCount={cartCount} email={profile?.email ?? user?.email ?? null} isAdmin={profile?.role === "admin"} />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 pb-28 md:px-8 md:pb-16">{children}</main>
      <Footer />
      <MobileNav />
      <ChatWidget />
      {popup ? <HomePopup popup={popup} /> : null}
    </div>
  );
}
