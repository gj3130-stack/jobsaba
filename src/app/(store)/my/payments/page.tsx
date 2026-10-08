import { formatDateTime, formatKRW } from "@/lib/format";
import { PAYMENT_STATUS_LABEL, labelOf } from "@/lib/labels";
import { getSession } from "@/lib/session";

export const metadata = { title: "결제" };

export default async function PaymentsPage() {
  const { supabase, user } = await getSession();
  const { data } = supabase && user
    ? await supabase.from("payments").select("id,provider,method,status,amount,transaction_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false })
    : { data: [] };
  const rows = Array.isArray(data) ? data : [];
  return (
    <div>
      <h1 className="serif text-4xl">결제</h1>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={String(row.id)} className="panel p-4 text-sm">
            <p>{labelOf(PAYMENT_STATUS_LABEL, String(row.status))} · {formatKRW(Number(row.amount))}</p>
            <p className="mt-1 text-muted">{String(row.provider)} · {String(row.method)} · {String(row.transaction_id || "-")}</p>
            <p className="mt-1 text-xs text-muted">{formatDateTime(String(row.created_at))}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
