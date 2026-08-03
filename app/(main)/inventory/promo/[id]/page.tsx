import PromoEditor from '@/components/promo/PromoEditor';

export default async function EditPromoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PromoEditor id={id} />;
}
