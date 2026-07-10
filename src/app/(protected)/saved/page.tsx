"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components";

export default function SavedPage() {
  const router = useRouter();

  return (
    <section className="sumbi-page items-center text-center">
      <h1 className="sumbi-heading-form">오늘도 숨비하셨네요!</h1>

      <p className="sumbi-body mb-16">
        마음대로 &apos;수&apos;가
        <br />
        당신의 숨을 읽고
        <br />
        짧은 숨편지를 보내드립니다.
      </p>

      <p className="sumbi-muted mb-16">
        도착한 숨편지는
        <br />
        나의 숨 페이지에서 확인할 수 있어요.
      </p>

      <div className="flex justify-center">
        <Button onClick={() => router.push("/")}>다시 숨비하기</Button>
      </div>
    </section>
  );
}
