import { Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700", "800"],
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
