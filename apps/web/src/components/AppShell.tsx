import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-phone flex-col bg-fox-bg">
      {children}
      <BottomNav />
    </div>
  );
}

export { PageHeader } from "./PageHeader";
