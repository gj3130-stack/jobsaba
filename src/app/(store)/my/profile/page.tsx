import { Flash } from "@/components/ui";
import { listAddresses } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { deleteAddress, saveAddress, saveProfile, withdrawAccount } from "@/server/shop";

export const metadata = { title: "회원 정보" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await getSession();
  const addresses = supabase && user ? await listAddresses(supabase, user.id) : { addresses: [] };
  return (
    <div className="space-y-6">
      <h1 className="serif text-4xl">회원 정보</h1>
      <Flash notice={sp.notice} error={sp.error} />
      <form action={saveProfile} className="panel space-y-3 p-5">
        <input className="field" name="name" defaultValue={profile?.name} required aria-label="이름" />
        <input className="field" name="phone" defaultValue={profile?.phone ?? ""} aria-label="전화번호" />
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="marketing" defaultChecked={profile?.marketingAgreed} /> 소식 수신
        </label>
        <button className="btn btn-primary" type="submit">저장</button>
      </form>
      <section>
        <h2 className="font-semibold">배송지</h2>
        <ul className="mt-3 space-y-2">
          {addresses.addresses.map((address) => (
            <li key={address.id} className="panel flex items-start justify-between p-4 text-sm">
              <span>
                {address.recipient} · {address.phone}
                <br />
                ({address.postalCode}) {address.address1} {address.address2}
              </span>
              <form action={deleteAddress}>
                <input type="hidden" name="id" value={address.id} />
                <button className="text-muted" type="submit">삭제</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={saveAddress} className="panel mt-3 space-y-2 p-4">
          <input className="field" name="label" placeholder="집, 회사" />
          <input className="field" name="recipient" required placeholder="받는 사람" />
          <input className="field" name="phone" required placeholder="전화번호" />
          <input className="field" name="postalCode" required placeholder="우편번호" />
          <input className="field" name="address1" required placeholder="주소" />
          <input className="field" name="address2" placeholder="상세 주소" />
          <button className="btn btn-ghost" type="submit">배송지 추가</button>
        </form>
      </section>
      <form action={withdrawAccount}>
        <button className="text-sm text-gochujang" type="submit">회원 탈퇴</button>
      </form>
    </div>
  );
}
