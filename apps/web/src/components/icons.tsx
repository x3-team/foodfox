import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

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

export function FoxLogo(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <circle cx="16" cy="16" r="15" fill="#E8F5E9" />
      <path
        d="M10 14c0-3.3 2.7-6 6-6s6 2.7 6 6c0 2.5-1.5 4.6-3.6 5.5L16 24l-2.4-4.5C11.5 18.6 10 16.5 10 14z"
        fill="#256029"
      />
      <circle cx="13" cy="14" r="1.2" fill="#FAFAF7" />
      <circle cx="19" cy="14" r="1.2" fill="#FAFAF7" />
      <path d="M14 17.5c.8.6 2.2.6 3 0" stroke="#FAFAF7" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
