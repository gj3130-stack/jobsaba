import Link from "next/link";
import { getSession } from "@/lib/session";

export const metadata = { title: "이벤트" };

export default async function EventsPage() {
  const { supabase } = await getSession();
  const { data } = supabase ? await supabase.from("events").select("slug,title,description").eq("is_active", true) : { data: [] };
  const events = Array.isArray(data) ? data : [];
  return (
    <div>
      <h1 className="serif text-4xl">이벤트</h1>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <li key={String(event.slug)}>
            <Link href={`/events/${event.slug}`} className="panel block p-6">
              <h2 className="serif text-3xl">{String(event.title)}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{String(event.description || "")}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
