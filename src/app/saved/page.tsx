"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components";

export default function SavedPage() {
  const router = useRouter();

  return (
    <section className="sumbi-page">
      <h1 className="sumbi-heading mb-10">오늘도 숨비하셨네요!</h1>

      <p className="sumbi-body mb-16">
        마음대로 &apos;수&apos;가
        <br />
        당신의 숨을 읽고
        <br />
        짧은 숨편지를 보내드립니다.
      </p>

      <div className="flex justify-center">
        <Button
          className="px-12 py-3.5 text-[0.9375rem] font-normal tracking-wide"
          onClick={() => router.push("/")}
        >
          다시 숨비하기
        </Button>
      </div>
    </section>
  );
}
