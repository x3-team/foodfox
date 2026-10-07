export type Partner = { name: string; logo: string; count: string; here: boolean; href: string };

export const PARTNERS: Partner[] = [
  { name: "Ситилаб", logo: "/figma/labs/citilab.svg", count: "86 отделений", here: true, href: "https://citilab.ru" },
  { name: "Гемотест", logo: "/figma/labs/gemotest.svg", count: "140 отделений", here: true, href: "https://gemotest.ru" },
  { name: "KDL", logo: "/figma/labs/kdl.svg", count: "54 отделения", here: true, href: "https://kdl.ru" },
  { name: "ДНКОМ", logo: "/figma/labs/dnkom.svg", count: "17 отделений", here: true, href: "https://dnkom.ru" },
  { name: "INVITRO", logo: "/figma/labs/invitro.svg", count: "128 отделений", here: true, href: "https://www.invitro.ru" },
  { name: "CMD", logo: "/figma/labs/cmd.svg", count: "41 отделение", here: true, href: "https://cmd-online.ru" },
  { name: "CHROMOLAB", logo: "/figma/labs/chromolab.png", count: "23 отделения", here: true, href: "https://chromolab.ru" },
  { name: "Хеликс", logo: "/figma/labs/helix.svg", count: "32 отделения", here: true, href: "https://helix.ru" },
  { name: "Юнимед", logo: "/figma/labs/unimed.svg", count: "Нет в вашем городе", here: false, href: "#l05" },
];

/** Routing only: booking and payment happen on the lab site, we add UTM (Figma 05 · /labs — логика страницы). */
export function withUtm(href: string, content = "book_modal") {
  try {
    const url = new URL(href);
    url.searchParams.set("utm_source", "foxfood");
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_campaign", "fox_test");
    url.searchParams.set("utm_content", content);
    return url.toString();
  } catch {
    return href;
  }
}

export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
