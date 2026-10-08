import { formatDateTime, formatKRW, formatPoint } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata = { title: "환불" };

export default async function RefundsPage() {
  const { supabase, user } = await getSession();
  const { data } = supabase && user
    ? await supabase.from("refunds").select("id,amount,points_restored,points_clawed_back,unrecoverable_points,coupon_restored,status,note,created_at,orders!inner(order_no,user_id)").eq("orders.user_id", user.id).order("created_at", { ascending: false })
    : { data: [] };
  const rows = Array.isArray(data) ? data : [];
  return (
    <div>
      <h1 className="serif text-4xl">환불</h1>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
          return (
            <li key={String(row.id)} className="panel p-4 text-sm leading-6">
              <p>{order && typeof order === "object" && "order_no" in order ? String(order.order_no) : ""} · {formatKRW(Number(row.amount))}</p>
              <p>포인트 복원 {formatPoint(Number(row.points_restored))} · 적립 회수 {formatPoint(Number(row.points_clawed_back))}</p>
              <p>회수하지 못한 적립 {formatPoint(Number(row.unrecoverable_points))} · 쿠폰 {row.coupon_restored ? "복원" : "해당 없음"}</p>
              <p className="text-xs text-muted">{String(row.status)} · {formatDateTime(String(row.created_at))}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
