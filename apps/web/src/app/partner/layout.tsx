import localFont from "next/font/local";

// Manrope served from the repo (was next/font/google; build-time fetch broke deploys).
const manrope = localFont({
  src: "../../fonts/Manrope-var.woff2",
  weight: "300 800",
  style: "normal",
  display: "swap",
});

export const metadata = {
  title: "FOX — кабинет партнёра",
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${manrope.className} min-h-screen overflow-x-hidden bg-[#F8F9F6]`}>
      {children}
    </div>
  );
}
