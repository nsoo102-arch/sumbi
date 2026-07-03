"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { PageLayout } from "@/components/PageLayout";
import { Spacer, Stack } from "@/components/Spacer";
import { PageTitle } from "@/components/Typography";
import { TextArea } from "@/components/TextArea";
import {
  getTodayEntry,
  hasProfile,
  isAuthenticated,
  setTodayRecord,
} from "@/lib/storage";

export default function RecordPage() {
  const router = useRouter();
  const [record, setRecord] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    if (!hasProfile()) {
      router.replace("/profile");
      return;
    }

    const entry = getTodayEntry();
    if (!entry?.activity) {
      router.replace("/breath");
      return;
    }

    if (entry.record) setRecord(entry.record);
    setReady(true);
  }, [router]);

  const handleSubmit = () => {
    if (!record.trim()) return;
    setTodayRecord(record.trim());
    router.push("/saved");
  };

  if (!ready) return null;

  return (
    <PageLayout>
      <Stack gap="lg">
        <PageTitle>오늘 숨비활동은 어땠나요?</PageTitle>

        <Spacer size="sm" />

        <TextArea
          placeholder="오늘의 활동에 대해 자유롭게 적어주세요"
          value={record}
          onChange={(e) => setRecord(e.target.value)}
        />

        <Spacer size="md" />

        <Button fullWidth onClick={handleSubmit} disabled={!record.trim()}>
          저장하기
        </Button>
      </Stack>
    </PageLayout>
  );
}
