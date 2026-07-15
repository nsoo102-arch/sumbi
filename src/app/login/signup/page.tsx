"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button, Card } from "@/components";
import { signUp } from "@/lib/auth";
import { initializeUserProfile } from "@/lib/storage";
import { syncMemberAfterSignup } from "@/lib/sheetSync";

const isDevelopment = process.env.NODE_ENV === "development";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);

    if (isDevelopment) {
      console.log("SIGNUP SUBMIT START");
    }

    try {
      // Apps Script URL이 있으면 시트에 password_hash 포함 가입 → 다른 기기 로그인 가능
      const signupResult = await signUp(name, nickname, email, password);

      if (!signupResult.ok) {
        setError(signupResult.error);
        return;
      }

      const { session } = signupResult;

      initializeUserProfile(nickname.trim());

      // 로컬/서버 스테이징 (관리자용) — 실패해도 가입은 유지
      try {
        await syncMemberAfterSignup(session);
      } catch (syncError) {
        console.warn("[signup] members API sync failed", syncError);
      }

      if (isDevelopment) {
        console.log("SIGNUP OK", session.email);
      }

      router.replace("/today");
    } catch (error) {
      console.error("[signup] unexpected error", error);
      setError("회원가입 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="sumbi-page items-center text-center">
      <h1 className="sumbi-heading-form">숨비친구</h1>

      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            autoComplete="name"
            aria-label="이름"
            placeholder="이름"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="sumbi-input text-left"
            required
          />
          <input
            type="text"
            autoComplete="nickname"
            aria-label="닉네임"
            placeholder="닉네임"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            className="sumbi-input text-left"
            required
          />
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
            aria-label="비밀번호"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="sumbi-input text-left"
            required
            minLength={6}
          />
          <input
            type="password"
            autoComplete="new-password"
            aria-label="비밀번호 확인"
            placeholder="비밀번호 확인"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            className="sumbi-input text-left"
            required
            minLength={6}
          />

          {error && <p className="sumbi-error">{error}</p>}

          <Button type="submit" block disabled={submitting}>
            친구되기
          </Button>
        </form>

        <p className="mt-6 text-[0.9375rem] font-light tracking-wide">
          <Link href="/login/email" className="sumbi-link">
            이미 계정이 있어요? 로그인
          </Link>
        </p>
      </Card>
    </section>
  );
}
