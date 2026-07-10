"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isAuthenticated } from "@/lib";

/** session 있음 → /today, 없음 → /login/signup */
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthenticated() ? "/today" : "/login/signup");
  }, [router]);

  return null;
}
