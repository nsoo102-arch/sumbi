"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "비밀번호가 올바르지 않습니다.");
        setSubmitting(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  }

  return (
    <section className="sumbi-page items-center text-center">
      <h1 className="sumbi-heading mb-3">숨비 관리자</h1>
      <p className="sumbi-muted mb-10">
        관리자만 들어갈 수 있는 공간입니다.
      </p>

      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            autoComplete="current-password"
            aria-label="관리자 비밀번호"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="sumbi-input text-left"
            required
          />

          {error && <p className="sumbi-error">{error}</p>}

          <Button type="submit" block disabled={submitting}>
            {submitting ? "확인 중…" : "관리자로 들어가기"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
