import Link from "next/link";
import { listCategories } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { CATEGORY_NAV } from "@/lib/nav";

export const metadata = { title: "카테고리" };

export default async function CategoryIndexPage() {
  const { supabase } = await getSession();
  const loaded = supabase ? await listCategories(supabase) : { categories: [] };
  const categories = loaded.categories.length > 0 ? loaded.categories : CATEGORY_NAV.map((item) => ({ ...item, id: item.slug, description: "" }));
  return (
    <div>
      <h1 className="serif text-4xl">카테고리</h1>
      <ul className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <li>
          <Link href="/category/all" className="panel block p-5">
            <p className="font-semibold">전체</p>
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <Link href={`/category/${category.slug}`} className="panel block p-5">
              <p className="font-semibold">{category.name}</p>
              <p className="mt-1 text-sm text-muted">{category.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
