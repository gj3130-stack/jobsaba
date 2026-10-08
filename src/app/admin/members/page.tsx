import { Flash } from "@/components/ui";
import { listMembers } from "@/lib/admin-data";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { setMember } from "@/server/admin";

const STATUS = [
  ["active", "정상"],
  ["suspended", "정지"],
  ["withdrawn", "탈퇴"],
];

export const metadata = { title: "회원" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await requireAdmin();
  if (!session.allowed || !session.supabase) return null;
  const { members, error } = await listMembers(session.supabase, sp.q ?? "");
  return (
    <div>
      <h1 className="serif text-4xl">회원</h1>
      <div className="mt-4">
        <Flash notice={sp.notice} error={sp.error || error || undefined} />
      </div>
      <form className="mt-4 flex gap-2" method="get">
        <input className="field" name="q" defaultValue={sp.q ?? ""} placeholder="이름 또는 이메일" aria-label="회원 검색" />
        <button className="btn btn-ghost" type="submit">
          검색
        </button>
      </form>
      <ul className="mt-4 space-y-3">
        {members.map((member) => (
          <li key={member.id} className="panel p-4">
            <p className="font-medium">{member.name || "이름 없음"}</p>
            <p className="text-sm text-muted">
              {member.email || "이메일 없음"} · {member.phone || "전화 없음"} · {formatDate(member.createdAt)}
            </p>
            <form action={setMember} className="mt-3 grid gap-2 sm:grid-cols-[140px_140px_auto]">
              <input type="hidden" name="memberId" value={member.id} />
              <select className="field" name="role" defaultValue={member.role} aria-label="권한">
                <option value="customer">고객</option>
                <option value="admin">관리자</option>
              </select>
              <select className="field" name="status" defaultValue={member.status} aria-label="상태">
                {STATUS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" type="submit">
                저장
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
