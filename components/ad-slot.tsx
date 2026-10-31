export function AdSlot() {
  const id = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
  if (!id) return null;
  // Placeholder only: real ad units are added only after AdSense approval.
  return (
    <div role="complementary" aria-label="Advertisement" data-adsense-publisher={id}
      className="mx-auto my-8 flex min-h-[90px] max-w-3xl items-center justify-center rounded-xl border-2 border-dashed border-[#99f6e4] bg-white text-sm text-slate-500 dark:bg-slate-900">
      Advertisement
    </div>
  );
}
