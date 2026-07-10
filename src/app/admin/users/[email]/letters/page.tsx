"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { SumbiLetter } from "@/types/sheets";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; letters: SumbiLetter[]; email: string };

function decodeEmailParam(raw: string | string[] | undefined): string {
  if (!raw) {
    return "";
  }

  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatDateTimeKst(value: string): string {
  if (!value.trim()) {
    return "시각 미기록";
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isLetterRead(letter: SumbiLetter): boolean {
  return letter.status === "read" || Boolean(letter.read_at?.trim());
}

export default function AdminUserLettersPage() {
  const params = useParams<{ email: string }>();
  const email = decodeEmailParam(params?.email).trim().toLowerCase();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadLetters() {
      if (!email) {
        setState({
          status: "error",
          message: "회원 이메일이 올바르지 않습니다.",
        });
        return;
      }

      setState({ status: "loading" });

      try {
        const response = await fetch(
          `/api/sheets/letters?email=${encodeURIComponent(email)}&limit=200`,
          { method: "GET", cache: "no-store" },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: SumbiLetter[];
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error || "숨편지 이력을 불러오지 못했습니다.",
          );
        }

        const letters = (Array.isArray(payload.data) ? payload.data : [])
          .filter(
            (letter) =>
              (letter.email || "").trim().toLowerCase() === email,
          )
          .sort((a, b) => {
            const aKey = a.sent_at || "";
            const bKey = b.sent_at || "";
            return aKey < bKey ? 1 : aKey > bKey ? -1 : 0;
          });

        if (!cancelled) {
          setState({ status: "ready", letters, email });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "숨편지 이력을 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadLetters();

    return () => {
      cancelled = true;
    };
  }, [email]);

  const detailHref = email
    ? `/admin/users/${encodeURIComponent(email)}`
    : "/admin/users";

  return (
    <main className="admin-page">
      <div className="admin-container">
        <Link href={detailHref} className="admin-back">
          ← 회원 상세로 돌아가기
        </Link>

        <h1 className="admin-title">숨편지 이력</h1>

        <p className="admin-lead admin-break">
          {email
            ? `${email} 님에게 보낸 숨편지를 날짜순으로 살펴봅니다.`
            : "보낸 숨편지를 날짜순으로 살펴봅니다."}
        </p>

        {state.status === "loading" && (
          <p className="admin-muted">숨편지 이력을 불러오는 중…</p>
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
            <p className="admin-empty m-0">아직 보낸 숨편지가 없습니다.</p>
          </div>
        )}

        {state.status === "ready" && state.letters.length > 0 && (
          <ul className="m-0 grid list-none gap-4 p-0">
            {state.letters.map((letter, index) => {
              const read = isLetterRead(letter);

              return (
                <li
                  key={letter.id || `${letter.sent_at}-${index}`}
                  className="admin-card"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="m-0 text-[0.875rem] tracking-[0.03em] text-sumbi-primary">
                      보낸 시각 · {formatDateTimeKst(letter.sent_at)}
                    </p>
                    <span
                      className={`text-[0.75rem] tracking-[0.04em] ${
                        read ? "text-sumbi-muted" : "text-sumbi-primary"
                      }`}
                    >
                      {read ? "읽음" : "읽지 않음"}
                    </span>
                  </div>
                  {read && letter.read_at.trim() ? (
                    <p className="admin-label mt-1.5 mb-0">
                      읽은 시각 · {formatDateTimeKst(letter.read_at)}
                    </p>
                  ) : null}
                  <p className="admin-break mt-3 mb-0 text-[0.9375rem] leading-[1.8] tracking-[0.02em] text-sumbi-text/80 whitespace-pre-wrap">
                    {letter.message}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
