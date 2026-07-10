"use client";

import { useRouter } from "next/navigation";
import { clearSumbiTestData } from "@/lib/resetTestData";

const isDevelopment = process.env.NODE_ENV === "development";

type DevResetTestDataButtonProps = {
  redirectTo?: string;
  className?: string;
};

export function DevResetTestDataButton({
  redirectTo = "/login",
  className = "mt-10",
}: DevResetTestDataButtonProps) {
  const router = useRouter();

  if (!isDevelopment) {
    return null;
  }

  function handleClick() {
    clearSumbiTestData();
    window.alert("테스트 데이터가 초기화되었습니다.");
    router.replace(redirectTo);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-[0.8125rem] font-light text-sumbi-text/45 underline-offset-2 hover:text-sumbi-text/70 hover:underline ${className}`}
    >
      테스트 데이터 초기화
    </button>
  );
}
