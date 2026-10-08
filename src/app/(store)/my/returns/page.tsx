import { Flash } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { RETURN_STATUS_LABEL, labelOf } from "@/lib/labels";
import { getSession } from "@/lib/session";

export const metadata = { title: "반품" };

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const { data } = supabase && user
    ? await supabase.from("returns").select("id,reason,status,admin_note,created_at,orders(order_no)").eq("user_id", user.id).eq("type", "return").order("created_at", { ascending: false })
    : { data: [] };
  const rows = Array.isArray(data) ? data : [];
  return (
    <div>
      <h1 className="serif text-4xl">반품</h1>
      <div className="mt-4"><Flash notice={sp.notice} /></div>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
          return (
            <li key={String(row.id)} className="panel p-4 text-sm">
              <p>{order && typeof order === "object" && "order_no" in order ? String(order.order_no) : ""} · {labelOf(RETURN_STATUS_LABEL, String(row.status))}</p>
              <p className="mt-1">{String(row.reason || "")}</p>
              {row.admin_note ? <p className="mt-1 text-muted">답변 {String(row.admin_note)}</p> : null}
              <p className="mt-1 text-xs text-muted">{formatDateTime(String(row.created_at))}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
