"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { PageLayout } from "@/components/PageLayout";
import { Spacer, Stack } from "@/components/Spacer";
import { PageTitle } from "@/components/Typography";
import { getState, hasProfile, isAuthenticated, setProfile } from "@/lib/storage";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [breathName, setBreathName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const profile = getState().profile;
    if (profile) {
      setName(profile.name);
      setBreathName(profile.breathName);
    }
    setReady(true);
  }, [router]);

  const handleSubmit = () => {
    if (!name.trim() || !breathName.trim()) return;
    setProfile({ name: name.trim(), breathName: breathName.trim() });
    router.push("/breath");
  };

  if (!ready) return null;

  return (
    <PageLayout>
      <Stack gap="lg">
        <PageTitle>프로필</PageTitle>

        <Spacer size="sm" />

        <Stack gap="md">
          <Input
            label="이름"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="숨이름"
            placeholder="숨이름을 입력하세요"
            value={breathName}
            onChange={(e) => setBreathName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </Stack>

        <Spacer size="md" />

        <Button
          fullWidth
          onClick={handleSubmit}
          disabled={!name.trim() || !breathName.trim()}
        >
          {hasProfile() ? "계속하기" : "저장하기"}
        </Button>
      </Stack>
    </PageLayout>
  );
}
