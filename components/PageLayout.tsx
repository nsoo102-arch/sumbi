import { ReactNode } from "react";

type PageLayoutProps = {
  children: ReactNode;
  className?: string;
};

export default function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <main
      className={`min-h-screen bg-background px-6 py-16 sm:px-8 sm:py-24 ${className}`}
    >
      <div className="mx-auto flex w-full max-w-md flex-col">{children}</div>
    </main>
  );
}
