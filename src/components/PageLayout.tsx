import type { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <main
      className={`min-h-screen bg-ivory px-6 py-12 sm:px-8 sm:py-16 md:px-12 md:py-20 ${className}`}
    >
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-lg flex-col justify-center sm:min-h-[calc(100vh-8rem)]">
        {children}
      </div>
    </main>
  );
}
