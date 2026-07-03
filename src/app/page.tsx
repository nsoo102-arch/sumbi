"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { PageLayout } from "@/components/PageLayout";
import { Spacer, Stack } from "@/components/Spacer";
import { PageTitle, PoemText } from "@/components/Typography";

export default function LandingPage() {
  const router = useRouter();

  return (
    <PageLayout>
      <Stack gap="lg">
        <PageTitle>숨비소리</PageTitle>

        <Spacer size="md" />

        <PoemText
          lines={[
            "오늘 하루도",
            "욕심내지 말고",
            "너의 숨만큼만",
            "있다 오거라.",
          ]}
        />

        <Spacer size="xl" />

        <Button fullWidth onClick={() => router.push("/login")}>
          시작하기
        </Button>
      </Stack>
    </PageLayout>
  );
}
