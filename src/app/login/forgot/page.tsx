"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button, Card } from "@/components";
import { resetPassword } from "@/lib";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    const result = await resetPassword(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
  }

  return (
    <section className="sumbi-page items-center text-center">
      <h1 className="sumbi-heading-tight">비밀번호 찾기</h1>
      <p className="sumbi-body mb-10">
        가입한 이메일과
        <br />
        새 비밀번호를 입력해 주세요.
      </p>

      <Card className="w-full max-w-sm">
        {success ? (
          <div className="space-y-6">
            <p className="sumbi-muted">비밀번호가 변경되었습니다.</p>
            <Link href="/login/email" className="sumbi-btn">
              로그인하기
            </Link>
          </div>
        ) : (
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
              autoComplete="new-password"
              aria-label="새 비밀번호"
              placeholder="새 비밀번호"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="sumbi-input text-left"
              required
              minLength={6}
            />
            <input
              type="password"
              autoComplete="new-password"
              aria-label="새 비밀번호 확인"
              placeholder="새 비밀번호 확인"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className="sumbi-input text-left"
              required
              minLength={6}
            />

            {error && <p className="sumbi-error">{error}</p>}

            <Button type="submit" block disabled={submitting}>
              비밀번호 변경
            </Button>
          </form>
        )}

        {!success && (
          <div className="mt-6 space-y-3 text-[0.9375rem] font-light tracking-wide">
            <p>
              <Link href="/login/email" className="sumbi-link">
                로그인
              </Link>
            </p>
            <p>
              <Link href="/login" className="sumbi-link-muted">
                돌아가기
              </Link>
            </p>
          </div>
        )}
      </Card>
    </section>
  );
}
