"use client";

import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

/** 랜딩 "시작하기" — 클릭 시점에 세션을 확인해 이동 */
export function StartButton() {
  const router = useRouter();

  function handleStart() {
    if (isAuthenticated()) {
      router.push("/home");
      return;
    }
    router.push("/login/email");
  }

  return (
    <button type="button" className="sumbi-btn mt-4" onClick={handleStart}>
      시작하기
    </button>
  );
}
