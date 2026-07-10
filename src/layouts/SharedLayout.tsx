"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type SharedLayoutProps = {
  children: ReactNode;
};

export function SharedLayout({ children }: SharedLayoutProps) {
  const pathname = usePathname();
  const isAdminApp =
    pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");

  return (
    <div className="min-h-[100dvh] bg-sumbi-background text-sumbi-text">
      <main
        className={
          isAdminApp
            ? "mx-auto w-full max-w-[960px] overflow-x-hidden px-0 py-0"
            : "mx-auto w-full max-w-screen-sm overflow-x-hidden px-4 py-6"
        }
      >
        {children}
      </main>
    </div>
  );
}
