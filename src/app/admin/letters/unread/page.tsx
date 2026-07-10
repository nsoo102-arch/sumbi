"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SumbiLetter } from "@/types/sheets";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; letters: SumbiLetter[] };

function formatSentAt(value: string): string {
  if (!value.trim()) {
    return "보낸 날짜 미기록";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function AdminUnreadLettersPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadLetters() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/sheets/letters/unread?limit=100", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: SumbiLetter[];
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error || "읽지 않은 숨편지를 불러오지 못했습니다.",
          );
        }

        if (!cancelled) {
          setState({
            status: "ready",
            letters: Array.isArray(payload.data) ? payload.data : [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "읽지 않은 숨편지를 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadLetters();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="admin-page">
      <div className="admin-container">
        <Link href="/admin" className="admin-back">
          ← 관리자 홈으로
        </Link>

        <h1 className="admin-title">읽지 않은 숨편지</h1>

        <p className="admin-lead">아직 열어보지 않은 숨편지를 살펴봅니다.</p>

        {state.status === "loading" && (
          <p className="admin-muted">숨편지를 불러오는 중…</p>
        )}

        {state.status === "error" && (
          <div className="admin-card">
            <p className="admin-error m-0">{state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="admin-btn mt-4"
            >
              다시 시도
            </button>
          </div>
        )}

        {state.status === "ready" && state.letters.length === 0 && (
          <div className="admin-card py-10 text-center">
            <p className="admin-empty m-0">모든 숨편지를 읽었습니다.</p>
          </div>
        )}

        {state.status === "ready" && state.letters.length > 0 && (
          <ul className="m-0 grid list-none gap-4 p-0">
            {state.letters.map((letter, index) => {
              const detailHref = letter.email
                ? `/admin/users/${encodeURIComponent(letter.email)}`
                : null;
              const displayName =
                letter.nickname || letter.name || "이름 없음";

              return (
                <li
                  key={letter.id || `${letter.email}-${index}`}
                  className="admin-card"
                >
                  <p className="m-0 text-[1.125rem] tracking-[0.03em] text-sumbi-text">
                    {displayName}
                  </p>

                  {letter.name &&
                  letter.nickname &&
                  letter.name !== letter.nickname ? (
                    <p className="mt-1.5 mb-0 text-[0.875rem] tracking-[0.03em] text-sumbi-primary">
                      {letter.name}
                    </p>
                  ) : null}

                  <p className="admin-body admin-break mt-3 mb-0">
                    {letter.email || "이메일 없음"}
                  </p>

                  <p className="admin-label mt-2 mb-0">
                    보낸 날짜 · {formatSentAt(letter.sent_at)}
                  </p>

                  <p className="admin-break mt-4 mb-0 text-[0.9375rem] leading-[1.7] tracking-[0.02em] text-sumbi-text/80 whitespace-pre-wrap">
                    {letter.message}
                  </p>

                  {detailHref ? (
                    <Link href={detailHref} className="admin-btn mt-[18px]">
                      회원 자세히 보기
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
