"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import PageLayout from "@/components/PageLayout";

export default function SavedPage() {
  const router = useRouter();

  return (
    <PageLayout className="justify-center">
      <div className="flex flex-col gap-16 sm:gap-24">
        <div className="flex flex-col gap-8">
          <p className="text-lg leading-relaxed text-foreground/80 sm:text-xl sm:leading-loose">
            오늘도 숨을 남겼습니다.
          </p>
          <p className="text-base leading-relaxed text-foreground/60 sm:text-lg sm:leading-loose">
            &apos;수&apos;가 당신의 기록을 읽고
            <br />
            며칠 안에
            <br />
            짧은 숨편지를 보내드립니다.
          </p>
        </div>
        <Button onClick={() => router.push("/")} fullWidth>
          홈으로
        </Button>
      </div>
    </PageLayout>
  );
}
