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
  setTodayActivity,
} from "@/lib/storage";

export default function BreathPage() {
  const router = useRouter();
  const [activity, setActivity] = useState("");
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
    if (entry?.activity) setActivity(entry.activity);
    setReady(true);
  }, [router]);

  const handleSubmit = () => {
    if (!activity.trim()) return;
    setTodayActivity(activity.trim());
    router.push("/record");
  };

  if (!ready) return null;

  return (
    <PageLayout>
      <Stack gap="lg">
        <PageTitle>
          오늘 편안한 숨을 위해서
          <br />
          무엇을 할 수 있을까요?
        </PageTitle>

        <Spacer size="sm" />

        <TextArea
          placeholder="오늘의 활동을 적어주세요"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        />

        <Spacer size="md" />

        <Button fullWidth onClick={handleSubmit} disabled={!activity.trim()}>
          다음
        </Button>
      </Stack>
    </PageLayout>
  );
}
