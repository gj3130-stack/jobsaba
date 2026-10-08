import { Flash } from "@/components/ui";
import { listCategories } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { createProduct } from "@/server/admin";

export const metadata = { title: "상품 등록" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const { categories } = await listCategories(session.supabase);
  return (
    <div>
      <h1 className="serif text-4xl">상품 등록</h1>
      <p className="mt-2 text-sm text-muted">첫 옵션 하나가 함께 만들어집니다. 이미지는 저장 후 상세 화면에서 올립니다.</p>
      <div className="mt-4">
        <Flash error={sp.error} />
      </div>
      <form action={createProduct} className="panel mt-4 grid gap-3 p-5 md:grid-cols-2">
        <label className="text-sm">
          분류
          <select className="field mt-1" name="categoryId" aria-label="분류">
            <option value="">없음</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          슬러그
          <input className="field mt-1" name="slug" required placeholder="sesame-sauce" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
        </label>
        <label className="text-sm md:col-span-2">
          상품명
          <input className="field mt-1" name="name" required />
        </label>
        <label className="text-sm md:col-span-2">
          한 줄 소개
          <input className="field mt-1" name="summary" />
        </label>
        <label className="text-sm md:col-span-2">
          설명
          <textarea className="field mt-1 min-h-28" name="description" />
        </label>
        <label className="text-sm">
          SKU
          <input className="field mt-1" name="sku" required />
        </label>
        <label className="text-sm">
          옵션명
          <input className="field mt-1" name="optionName" defaultValue="기본" />
        </label>
        <label className="text-sm">
          정상가
          <input className="field mt-1" name="listPrice" type="number" min={0} required />
        </label>
        <label className="text-sm">
          판매가
          <input className="field mt-1" name="salePrice" type="number" min={0} required />
        </label>
        <label className="text-sm">
          재고
          <input className="field mt-1" name="stock" type="number" min={0} required defaultValue={0} />
        </label>
        <label className="text-sm">
          안전재고
          <input className="field mt-1" name="safetyStock" type="number" min={0} defaultValue={5} />
        </label>
        <label className="text-sm">
          원산지
          <input className="field mt-1" name="origin" />
        </label>
        <label className="text-sm">
          원재료
          <input className="field mt-1" name="ingredients" />
        </label>
        <label className="text-sm">
          알레르기
          <input className="field mt-1" name="allergens" />
        </label>
        <label className="text-sm">
          보관
          <input className="field mt-1" name="storageMethod" />
        </label>
        <label className="text-sm">
          소비기한 안내
          <input className="field mt-1" name="shelfLife" />
        </label>
        <label className="text-sm">
          제조원
          <input className="field mt-1" name="manufacturer" defaultValue="잡사바 식품" />
        </label>
        <label className="text-sm">
          판매원
          <input className="field mt-1" name="seller" defaultValue="잡사바" />
        </label>
        <label className="text-sm">
          배송 안내
          <input className="field mt-1" name="shippingNote" />
        </label>
        <label className="text-sm">
          적립률(bps, 100=1%)
          <input className="field mt-1" name="pointRate" type="number" min={0} defaultValue={100} />
        </label>
        <label className="text-sm">
          상태
          <select className="field mt-1" name="status" defaultValue="on_sale">
            <option value="on_sale">판매중</option>
            <option value="sold_out">품절</option>
            <option value="hidden">숨김</option>
            <option value="stopped">판매중지</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isBest" /> 베스트
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isNew" /> 신상
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isOnePlus" /> 1+1 뱃지
          </label>
        </div>
        <div className="md:col-span-2">
          <button className="btn btn-primary" type="submit">
            등록
          </button>
        </div>
      </form>
    </div>
  );
}
