import Link from "next/link";
import { Flash } from "@/components/ui";
import { listAdminProducts } from "@/lib/admin-data";
import { formatKRW } from "@/lib/format";
import { PRODUCT_STATUS_LABEL, labelOf } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "상품" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const { products, error } = await listAdminProducts(session.supabase);
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <h1 className="serif text-4xl">상품</h1>
        <Link href="/admin/products/new" className="btn btn-primary">
          상품 등록
        </Link>
      </div>
      <div className="mt-4">
        <Flash notice={sp.notice} error={sp.error || error || undefined} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 font-medium">상품</th>
              <th className="py-2 font-medium">분류</th>
              <th className="py-2 font-medium">상태</th>
              <th className="py-2 font-medium">판매가</th>
              <th className="py-2 font-medium">재고</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-line">
                <td className="py-3">
                  <Link href={`/admin/products/${product.id}`} className="font-medium">
                    {product.name}
                  </Link>
                  <p className="text-xs text-muted">{product.slug}</p>
                </td>
                <td>{product.categoryName}</td>
                <td>{labelOf(PRODUCT_STATUS_LABEL, product.status)}</td>
                <td>{formatKRW(product.salePrice)}</td>
                <td>{product.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
