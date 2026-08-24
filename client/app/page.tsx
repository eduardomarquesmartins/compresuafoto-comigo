"use client";

export default function EcontiHome() {
  return (
    <>
      <iframe
        title="Econti Marketing Digital"
        src="/econti/index.html"
        className="econti-site-frame fixed inset-0 z-50 h-dvh w-screen border-0 bg-white"
      />
      <style jsx global>{`
        body:has(.econti-site-frame) footer,
        body:has(.econti-site-frame) [data-cart-drawer] {
          display: none !important;
        }
      `}</style>
    </>
  );
}
