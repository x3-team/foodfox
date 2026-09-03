import type { HTMLAttributes, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
type LogoProps = HTMLAttributes<HTMLSpanElement>;

export function IconUpload(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M12 16V4m0 0 4 4m-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
    </svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <rect x="7" y="10" width="3" height="9" rx="1" fill="currentColor" stroke="none" />
      <rect x="12" y="6" width="3" height="13" rx="1" fill="currentColor" stroke="none" opacity="0.7" />
      <rect x="17" y="13" width="3" height="6" rx="1" fill="currentColor" stroke="none" opacity="0.45" />
    </svg>
  );
}

export function IconRecipe(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M6 4h12a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2z" strokeLinejoin="round" />
      <path d="M8 8h8M8 12h6" strokeLinecap="round" />
    </svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path
        d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v7A2.5 2.5 0 0 1 16.5 15H10l-4.5 3.5V15H7.5A2.5 2.5 0 0 1 5 12.5v-7z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPlan(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <rect x="4" y="5" width="16" height="16" rx="2" strokeLinejoin="round" />
      <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
      <path d="M8 14h3M8 18h5" strokeLinecap="round" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
    </svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m5 12 14-7-4 14-2-5-5-2 14-7z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        d="M8 3h6l4 4v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" strokeLinejoin="round" />
      <path d="M9 13h6M9 17h4" strokeLinecap="round" />
    </svg>
  );
}

/** Fox mark from Figma MVP Screens header (node `1:4`, 🦊). */
export function FoxLogo({ className = "", style, ...props }: LogoProps) {
  return (
    <span
      aria-hidden
      className={`inline-block select-none leading-none ${className}`}
      style={{ fontSize: "inherit", lineHeight: 1, ...style }}
      {...props}
    >
      🦊
    </span>
  );
}
