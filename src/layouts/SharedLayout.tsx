import type { ReactNode } from "react";

type SharedLayoutProps = {
  children: ReactNode;
};

export function SharedLayout({ children }: SharedLayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-sumbi-background text-sumbi-text">
      <main className="mx-auto w-full max-w-screen-sm overflow-x-hidden px-4 py-6">
        {children}
      </main>
    </div>
  );
}
