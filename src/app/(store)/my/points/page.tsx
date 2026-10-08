import { formatDateTime, formatPoint } from "@/lib/format";
import { listLedger } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "포인트" };

const TYPE_LABEL: Record<string, string> = { earn: "적립", use: "사용", restore: "복원", expire: "만료", adjust: "조정" };

export default async function PointsPage() {
  const { supabase, user } = await getSession();
  let balance = 0;
  if (supabase && user) {
    const refreshed = await supabase.rpc("refresh_my_points");
    balance = typeof refreshed.data === "number" ? refreshed.data : 0;
  }
  const { entries } = supabase && user ? await listLedger(supabase, user.id) : { entries: [] };
  return (
    <div>
      <h1 className="serif text-4xl">포인트</h1>
      <p className="serif mt-3 text-3xl">{formatPoint(balance)}</p>
      <p className="mt-2 text-sm text-muted">결제된 상품 금액의 1%를 적립하고, 1,000P부터 사용할 수 있습니다. 적립일로부터 1년이 지나면 만료 원장에 남습니다.</p>
      <ul className="mt-6 space-y-2">
        {entries.map((entry) => (
          <li key={String(entry.id)} className="panel flex items-center justify-between p-4 text-sm">
            <span>
              {TYPE_LABEL[String(entry.type)] || String(entry.type)} · {String(entry.memo || "")}
              <span className="mt-1 block text-xs text-muted">{formatDateTime(String(entry.created_at))}</span>
            </span>
            <span>{formatPoint(Number(entry.amount))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
