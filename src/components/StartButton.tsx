"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";

export function StartButton() {
  const [href, setHref] = useState("/login/signup");

  useEffect(() => {
    setHref(isAuthenticated() ? "/today" : "/login/signup");
  }, []);

  return (
    <Link href={href} className="sumbi-btn mt-4">
      시작하기
    </Link>
  );
}
