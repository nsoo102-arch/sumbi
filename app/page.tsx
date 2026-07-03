"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import PageLayout from "@/components/PageLayout";

export default function LandingPage() {
  const router = useRouter();

  return (
    <PageLayout className="justify-center">
      <div className="flex flex-col gap-16 sm:gap-24">
        <div className="flex flex-col gap-12">
          <h1 className="text-2xl font-light tracking-wide text-primary sm:text-3xl">
            숨비소리
          </h1>
          <p className="text-lg leading-relaxed text-foreground/80 sm:text-xl sm:leading-loose">
            오늘 하루도
            <br />
            욕심내지 말고
            <br />
            너의 숨만큼만
            <br />
            있다 오거라.
          </p>
        </div>
        <Button onClick={() => router.push("/login")}>시작하기</Button>
      </div>
    </PageLayout>
  );
}
