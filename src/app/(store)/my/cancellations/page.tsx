import { Flash } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { RETURN_STATUS_LABEL, labelOf } from "@/lib/labels";
import { getSession } from "@/lib/session";

export const metadata = { title: "취소 내역" };

export default async function CancellationsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const { data } = supabase && user
    ? await supabase.from("returns").select("id,reason,status,created_at,orders(order_no)").eq("user_id", user.id).eq("type", "cancel").order("created_at", { ascending: false })
    : { data: [] };
  const rows = Array.isArray(data) ? data : [];
  return (
    <div>
      <h1 className="serif text-4xl">취소</h1>
      <div className="mt-4"><Flash notice={sp.notice} /></div>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
          return (
            <li key={String(row.id)} className="panel p-4 text-sm">
              <p>{order && typeof order === "object" && "order_no" in order ? String(order.order_no) : ""}</p>
              <p className="mt-1">{labelOf(RETURN_STATUS_LABEL, String(row.status))} · {formatDateTime(String(row.created_at))}</p>
              <p className="mt-1 text-muted">{String(row.reason || "사유 없음")}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
