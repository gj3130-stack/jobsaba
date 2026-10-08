import { Flash } from "@/components/ui";
import { listTaxDocuments } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { setTaxStatus } from "@/server/admin";

const DOC: Record<string, string> = {
  cash_receipt: "현금영수증",
  tax_invoice: "세금계산서",
};

const STATUS: Record<string, string> = {
  requested: "요청",
  issued: "발급",
  rejected: "반려",
};

export const metadata = { title: "증빙" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const { documents, error } = await listTaxDocuments(session.supabase);
  return (
    <div>
      <h1 className="serif text-4xl">증빙</h1>
      <p className="mt-2 text-sm text-muted">세금계산서와 현금영수증은 모의 상태만 바꿉니다. 국세청 전송은 하지 않습니다.</p>
      <div className="mt-4">
        <Flash notice={sp.notice} error={sp.error || error || undefined} />
      </div>
      <ul className="mt-4 space-y-3">
        {documents.length === 0 ? <li className="panel p-5 text-sm text-muted">요청된 문서가 없습니다.</li> : null}
        {documents.map((doc) => (
          <li key={doc.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
              {DOC[doc.docType] ?? doc.docType} · {doc.orderNo || "주문 없음"} · {doc.provider}
              <span className="block text-muted">
                {STATUS[doc.status] ?? doc.status} · {formatDateTime(doc.createdAt)}
              </span>
            </span>
            <form action={setTaxStatus} className="flex gap-2">
              <input type="hidden" name="id" value={doc.id} />
              <select className="field" name="status" defaultValue={doc.status} aria-label="문서 상태">
                <option value="requested">요청</option>
                <option value="issued">발급</option>
                <option value="rejected">반려</option>
              </select>
              <button className="btn btn-ghost" type="submit">
                저장
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
