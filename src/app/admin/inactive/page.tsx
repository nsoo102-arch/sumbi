"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminRecentUser } from "@/types/sheets";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; members: AdminRecentUser[] };

function formatJoinedAt(value: string): string {
  if (!value.trim()) {
    return "가입일 미기록";
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

function memberDetailHref(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  return `/admin/users/${encodeURIComponent(trimmed)}`;
}

export default function AdminInactiveWeekPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/sheets/admin-inactive-week", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: AdminRecentUser[];
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error ||
              "이번 주 미참여 회원 목록을 불러오지 못했습니다.",
          );
        }

        if (!cancelled) {
          setState({
            status: "ready",
            members: Array.isArray(payload.data) ? payload.data : [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "이번 주 미참여 회원 목록을 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadMembers();

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

        <h1 className="admin-title">이번 주 아직 숨을 쉬지 않은 사람</h1>

        <p className="admin-lead">
          이번 주 기록이 아직 없는 분들을 가입 오래된 순으로 살펴봅니다.
        </p>

        {state.status === "loading" && (
          <p className="admin-muted">목록을 불러오는 중…</p>
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

        {state.status === "ready" && state.members.length === 0 && (
          <div className="admin-card py-10 text-center">
            <p className="admin-empty m-0">이번 주 모두 숨을 쉬었습니다.</p>
          </div>
        )}

        {state.status === "ready" && state.members.length > 0 && (
          <ul className="m-0 grid list-none gap-4 p-0">
            {state.members.map((member, index) => {
              const href = memberDetailHref(member.email);

              return (
                <li
                  key={member.user_id || `${member.email}-${index}`}
                  className="admin-card"
                >
                  <p className="m-0 text-[1.125rem] tracking-[0.03em] text-sumbi-text">
                    {member.name || "이름 없음"}
                  </p>
                  <p className="mt-2 mb-0 text-[0.9375rem] tracking-[0.04em] text-sumbi-primary">
                    {member.nickname || "활동이름 없음"}
                  </p>
                  <p className="admin-label mt-3.5 mb-0">
                    가입일 · {formatJoinedAt(member.created_at)}
                  </p>
                  {href ? (
                    <Link href={href} className="admin-btn mt-5">
                      회원 보기
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
