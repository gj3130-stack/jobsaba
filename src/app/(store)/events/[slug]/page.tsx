import { notFound } from "next/navigation";
import { PageTitle, ProductGrid } from "@/components/ui";
import { getSession } from "@/lib/session";
import { storeEvent } from "@/lib/store-data";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await getSession();
  const event = await storeEvent(supabase, slug);
  if (!event) notFound();
  return (
    <div>
      <PageTitle eyebrow="Event" title={event.title} body={event.description} />
      <div className="mt-8">
        <ProductGrid products={event.products} />
      </div>
    </div>
  );
}
