"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { PageLayout } from "@/components/PageLayout";
import { Spacer, Stack } from "@/components/Spacer";
import { PageText, PageTitle } from "@/components/Typography";
import { getTodayEntry, isAuthenticated } from "@/lib/storage";

export default function SavedPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const entry = getTodayEntry();
    if (!entry?.activity || !entry?.record) {
      router.replace("/breath");
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <PageLayout>
      <Stack gap="lg">
        <PageTitle>오늘도 숨을 남겼습니다.</PageTitle>

        <Spacer size="md" />

        <PageText>
          &apos;수&apos;가 당신의 기록을 읽고
          <br />
          며칠 안에
          <br />
          짧은 숨편지를 보내드립니다.
        </PageText>

        <Spacer size="xl" />

        <Button fullWidth onClick={() => router.push("/")}>
          홈으로
        </Button>
      </Stack>
    </PageLayout>
  );
}
