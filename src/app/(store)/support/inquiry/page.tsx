import { Flash } from "@/components/ui";
import { createInquiry } from "@/server/shop";

export const metadata = { title: "1:1 문의" };

export default async function InquiryPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="serif text-4xl">1:1 문의</h1>
      <div className="mt-4">
        <Flash notice={sp.notice} error={sp.error} />
      </div>
      <form action={createInquiry} className="panel mt-4 space-y-3 p-5">
        <select className="field" name="category" aria-label="문의 유형">
          <option>배송</option>
          <option>주문</option>
          <option>상품</option>
          <option>교환·반품</option>
          <option>기타</option>
        </select>
        <input className="field" name="title" required placeholder="제목" />
        <textarea className="field min-h-36" name="content" required placeholder="내용" />
        <button className="btn btn-primary" type="submit">
          접수
        </button>
      </form>
    </div>
  );
}
