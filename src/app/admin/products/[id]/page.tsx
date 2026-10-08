import { notFound } from "next/navigation";
import { ImageUploader } from "@/components/image-uploader";
import { Flash } from "@/components/ui";
import { getAdminProduct } from "@/lib/admin-data";
import { listCategories } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { addVariant, deleteProductImage, updateProduct, updateVariant } from "@/server/admin";

export const metadata = { title: "상품 수정" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const [{ product }, categories] = await Promise.all([getAdminProduct(session.supabase, id), listCategories(session.supabase)]);
  if (!product) notFound();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif text-4xl">{product.name}</h1>
        <p className="mt-1 text-sm text-muted">{product.slug}</p>
      </div>
      <Flash notice={sp.notice} error={sp.error} />
      <form action={updateProduct} className="panel grid gap-3 p-5 md:grid-cols-2">
        <input type="hidden" name="id" value={product.id} />
        <label className="text-sm">
          분류
          <select className="field mt-1" name="categoryId" defaultValue={product.categoryId} aria-label="분류">
            <option value="">없음</option>
            {categories.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          상태
          <select className="field mt-1" name="status" defaultValue={product.status}>
            <option value="on_sale">판매중</option>
            <option value="sold_out">품절</option>
            <option value="hidden">숨김</option>
            <option value="stopped">판매중지</option>
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          상품명
          <input className="field mt-1" name="name" required defaultValue={product.name} />
        </label>
        <label className="text-sm md:col-span-2">
          한 줄 소개
          <input className="field mt-1" name="summary" defaultValue={product.summary} />
        </label>
        <label className="text-sm md:col-span-2">
          설명
          <textarea className="field mt-1 min-h-28" name="description" defaultValue={product.description} />
        </label>
        <label className="text-sm">
          원산지
          <input className="field mt-1" name="origin" defaultValue={product.origin} />
        </label>
        <label className="text-sm">
          원재료
          <input className="field mt-1" name="ingredients" defaultValue={product.ingredients} />
        </label>
        <label className="text-sm">
          알레르기
          <input className="field mt-1" name="allergens" defaultValue={product.allergens} />
        </label>
        <label className="text-sm">
          보관
          <input className="field mt-1" name="storageMethod" defaultValue={product.storageMethod} />
        </label>
        <label className="text-sm">
          소비기한 안내
          <input className="field mt-1" name="shelfLife" defaultValue={product.shelfLife} />
        </label>
        <label className="text-sm">
          제조원
          <input className="field mt-1" name="manufacturer" defaultValue={product.manufacturer} />
        </label>
        <label className="text-sm">
          판매원
          <input className="field mt-1" name="seller" defaultValue={product.seller} />
        </label>
        <label className="text-sm">
          배송 안내
          <input className="field mt-1" name="shippingNote" defaultValue={product.shippingNote} />
        </label>
        <label className="text-sm">
          적립률(bps)
          <input className="field mt-1" name="pointRate" type="number" min={0} defaultValue={product.pointRateBps} />
        </label>
        <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isBest" defaultChecked={product.isBest} /> 베스트
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isNew" defaultChecked={product.isNew} /> 신상
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isOnePlus" defaultChecked={product.isOnePlusOne} /> 1+1 뱃지
          </label>
        </div>
        <div className="md:col-span-2">
          <button className="btn btn-primary" type="submit">
            상품 정보 저장
          </button>
        </div>
      </form>

      <section>
        <h2 className="serif text-2xl">이미지</h2>
        <p className="mt-1 text-sm text-muted">관리자 세션으로 product-images 버킷에 올린 뒤 상품에 연결합니다.</p>
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {product.images.map((image) => (
            <li key={image.id} className="panel overflow-hidden">
              <img src={image.src} alt={image.alt} className="aspect-square w-full object-cover" />
              <form action={deleteProductImage} className="p-2">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="imageId" value={image.id} />
                <input type="hidden" name="path" value={image.path} />
                <button className="text-sm text-gochujang" type="submit">
                  삭제
                </button>
              </form>
            </li>
          ))}
        </ul>
        <div className="panel mt-3 p-4">
          <ImageUploader productId={product.id} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="serif text-2xl">옵션과 재고</h2>
        {product.variants.map((variant) => (
          <form key={variant.id} action={updateVariant} className="panel grid gap-2 p-4 md:grid-cols-6">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="variantId" value={variant.id} />
            <p className="text-xs text-muted md:col-span-6">{variant.sku}</p>
            <input className="field" name="optionName" defaultValue={variant.optionName} aria-label="옵션명" />
            <input className="field" name="listPrice" type="number" min={0} defaultValue={variant.listPrice} aria-label="정상가" />
            <input className="field" name="salePrice" type="number" min={0} defaultValue={variant.salePrice} aria-label="판매가" />
            <input className="field" name="stock" type="number" min={0} defaultValue={variant.stock} aria-label="재고" />
            <input className="field" name="safetyStock" type="number" min={0} defaultValue={variant.safetyStock} aria-label="안전재고" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={variant.active} /> 판매
              <button className="btn btn-ghost ml-auto" type="submit">
                저장
              </button>
            </label>
          </form>
        ))}
        <form action={addVariant} className="panel grid gap-2 p-4 md:grid-cols-3">
          <input type="hidden" name="productId" value={product.id} />
          <input className="field" name="sku" required placeholder="새 SKU" aria-label="새 SKU" />
          <input className="field" name="optionName" placeholder="옵션명" defaultValue="기본" aria-label="새 옵션명" />
          <input className="field" name="listPrice" type="number" min={0} required placeholder="정상가" aria-label="새 정상가" />
          <input className="field" name="salePrice" type="number" min={0} required placeholder="판매가" aria-label="새 판매가" />
          <input className="field" name="stock" type="number" min={0} required placeholder="재고" aria-label="새 재고" />
          <input className="field" name="safetyStock" type="number" min={0} defaultValue={5} aria-label="새 안전재고" />
          <button className="btn btn-primary" type="submit">
            옵션 추가
          </button>
        </form>
      </section>
    </div>
  );
}
