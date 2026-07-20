"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button, Card } from "@/components";
import { isAuthenticated, signIn } from "@/lib";

export default function EmailLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/home");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await signIn(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace("/home");
  }

  return (
    <section className="sumbi-page items-center text-center">
      <h1 className="sumbi-heading-form">로그인</h1>

      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            autoComplete="email"
            aria-label="이메일"
            placeholder="이메일"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="sumbi-input text-left"
            required
          />
          <input
            type="password"
            autoComplete="current-password"
            aria-label="비밀번호"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="sumbi-input text-left"
            required
          />

          {error && <p className="sumbi-error">{error}</p>}

          <Button type="submit" block disabled={submitting}>
            로그인
          </Button>
        </form>

        <div className="mt-6 space-y-3 text-[0.9375rem] font-light tracking-wide">
          <p>
            <Link href="/login/signup" className="sumbi-link">
              회원가입
            </Link>
          </p>
          <p>
            <Link href="/login/forgot" className="sumbi-link">
              비밀번호 찾기
            </Link>
          </p>
          <p>
            <Link href="/" className="sumbi-link-muted">
              돌아가기
            </Link>
          </p>
        </div>
      </Card>
    </section>
  );
}
