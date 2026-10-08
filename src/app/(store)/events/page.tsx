import Link from "next/link";
import { ChevronRight } from "@/components/icons";
import { PageTitle } from "@/components/ui";
import { getSession } from "@/lib/session";
import { storeEvents } from "@/lib/store-data";

export const metadata = { title: "이벤트" };

const FALLBACK_ART: Record<string, string> = {
  "one-plus-one": "/images/products/manneung-yangnyeom.webp",
  "jangdok-week": "/images/products/bori-gochujang.webp",
  "aekjeot-week": "/images/products/aekjeot-samjong-set-photo.webp",
};

export default async function EventsPage() {
  const { supabase } = await getSession();
  const events = await storeEvents(supabase);
  return (
    <div>
      <PageTitle eyebrow="Event" title="기획전 · 이벤트" body="지금 진행 중인 잡사바 기획전이에요." />
      <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <li key={event.slug}>
            <Link href={`/events/${event.slug}`} className="group block overflow-hidden rounded-2xl bg-paper ring-1 ring-line transition hover:shadow-lg">
              <span className="block aspect-[16/10] overflow-hidden bg-cream-deep">
                <img src={event.image ?? FALLBACK_ART[event.slug] ?? "/images/products/jangdok-samjong-set.webp"} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </span>
              <span className="block p-5">
                <span className="serif block text-2xl font-bold">{event.title}</span>
                <span className="mt-2 line-clamp-2 block text-sm leading-6 text-muted">{event.description}</span>
                <span className="mt-3 flex items-center gap-0.5 text-sm font-semibold text-gochujang">
                  상품 {event.productIds.length}개 보기 <ChevronRight size={16} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
