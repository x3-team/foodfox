export function Header({ title }: { title: string }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border border-fox-border bg-white px-5 pb-4 pt-14">
      <span className="text-2xl" aria-hidden>
        🦊
      </span>
      <h1 className="text-xl font-semibold text-fox-text">{title}</h1>
    </header>
  );
}
