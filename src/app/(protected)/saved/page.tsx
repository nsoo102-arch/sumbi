"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 완료 화면은 더 이상 쓰지 않음 — /home으로 바로 보냄 */
export default function SavedPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home");
  }, [router]);

  return null;
}
