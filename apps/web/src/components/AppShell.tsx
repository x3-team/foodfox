import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-phone flex-col bg-fox-bg">
      {children}
      <BottomNav />
    </div>
  );
}

export { Header } from "./Header";
