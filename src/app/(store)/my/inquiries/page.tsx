import Link from "next/link";
import { Flash } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { listInquiries } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "내 문의" };

export default async function MyInquiriesPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const { inquiries } = supabase && user ? await listInquiries(supabase, user.id) : { inquiries: [] };
  return (
    <div>
      <h1 className="serif text-4xl">문의</h1>
      <div className="mt-4"><Flash notice={sp.notice} /></div>
      <Link href="/support/inquiry" className="btn btn-primary mt-4">새 문의</Link>
      <ul className="mt-4 space-y-3">
        {inquiries.map((row) => (
          <li key={String(row.id)} className="panel p-4 text-sm">
            <p className="font-medium">{String(row.title)}</p>
            <p className="mt-2 whitespace-pre-wrap leading-6">{String(row.content)}</p>
            {row.answer ? <p className="mt-3 whitespace-pre-wrap leading-6 text-gochujang">답변 {String(row.answer)}</p> : <p className="mt-2 text-muted">답변 대기</p>}
            <p className="mt-2 text-xs text-muted">{formatDateTime(String(row.created_at))}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
