"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  if (pathname === "/admin/login") {
    return null;
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // 쿠키 삭제 실패해도 로그인 화면으로 이동
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-container-wide flex justify-end px-5 pt-4 sm:px-6">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="admin-btn-outline"
        aria-label="관리자 나가기"
      >
        {loggingOut ? "나가는 중…" : "관리자 나가기"}
      </button>
    </div>
  );
}
