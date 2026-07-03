"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { PageLayout } from "@/components/PageLayout";
import { Spacer, Stack } from "@/components/Spacer";
import { PageTitle } from "@/components/Typography";
import { setAuth } from "@/lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const goToProfile = () => router.push("/profile");

  const handleEmailLogin = () => {
    if (!email.trim()) return;
    setAuth("email", email.trim());
    goToProfile();
  };

  const handleGoogleLogin = () => {
    setAuth("google");
    goToProfile();
  };

  const handleGuestLogin = () => {
    setAuth("guest");
    goToProfile();
  };

  return (
    <PageLayout>
      <Stack gap="lg">
        <PageTitle>로그인</PageTitle>

        <Spacer size="sm" />

        <Stack gap="sm">
          <Input
            label="이메일"
            type="email"
            placeholder="이메일을 입력하세요"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
          />

          <Button fullWidth onClick={handleEmailLogin} disabled={!email.trim()}>
            이메일로 로그인
          </Button>
        </Stack>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-primary/10" />
          <span className="text-sm text-primary/40">또는</span>
          <div className="h-px flex-1 bg-primary/10" />
        </div>

        <Stack gap="sm">
          <Button fullWidth variant="secondary" onClick={handleGoogleLogin}>
            Google로 로그인
          </Button>

          <Button fullWidth variant="ghost" onClick={handleGuestLogin}>
            게스트로 시작하기
          </Button>
        </Stack>
      </Stack>
    </PageLayout>
  );
}
