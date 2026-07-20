"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminRecentUser, AdminSummary } from "@/types/sheets";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: AdminSummary };

const METRICS = [
  {
    key: "totalUsers" as const,
    label: "전체 사람 수",
    href: "/admin/users",
    suffix: "",
  },
  {
    key: "todayWriters" as const,
    label: "오늘 숨을 남긴 사람",
    href: "/admin/records",
    suffix: "",
  },
  {
    key: "weeklyParticipants" as const,
    label: "이번 주 숨 참여자",
    href: "/admin/stats",
    suffix: "",
  },
  {
    key: "weeklyParticipationRate" as const,
    label: "이번 주 참여율",
    href: "/admin/stats",
    suffix: "%",
  },
  {
    key: "unreadLetters" as const,
    label: "아직 읽히지 않은 숨편지",
    href: "/admin/letters/unread",
    suffix: "",
  },
] as const;

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

export default function AdminOverviewPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/sheets/admin-summary", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: AdminSummary;
          error?: string;
        };

        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(
            payload.error || "운영 현황을 불러오지 못했습니다.",
          );
        }

        if (!cancelled) {
          setState({ status: "ready", summary: payload.data });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "운영 현황을 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="admin-page">
      <div className="admin-container-wide">
        <Link href="/admin" className="admin-back">
          ← 관리자 홈으로
        </Link>

        <h1 className="admin-title">운영 현황</h1>
        <p className="admin-lead">
          전체 흐름과 참여를 천천히 살펴보는 공간입니다.
        </p>

        {state.status === "loading" && (
          <p className="admin-muted">운영 현황을 불러오는 중…</p>
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

        {state.status === "ready" && (
          <>
            <section>
              <h2 className="admin-section-title">주요 지표</h2>
              <div className="admin-grid-stats">
                {METRICS.map((metric) => (
                  <Link
                    key={metric.key}
                    href={metric.href}
                    className="admin-card-link"
                  >
                    <p className="admin-label m-0">{metric.label}</p>
                    <p className="mt-2.5 mb-0 text-[clamp(1.75rem,4vw,2.25rem)] font-medium leading-[1.1] tracking-[0.02em] text-sumbi-primary">
                      {state.summary[metric.key]}
                      {metric.suffix}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="mt-9">
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2 className="admin-section-title mb-0">
                  최근 함께하게 된 사람
                </h2>
                <Link href="/admin/users" className="admin-btn-outline">
                  회원에서 보기
                </Link>
              </div>

              {state.summary.recentUsers.length === 0 ? (
                <div className="admin-card text-center">
                  <p className="admin-empty m-0">아직 최근 가입자가 없습니다.</p>
                </div>
              ) : (
                <ul className="m-0 grid list-none gap-3 p-0">
                  {state.summary.recentUsers.map((user: AdminRecentUser) => {
                    const href = user.email.trim()
                      ? `/admin/users/${encodeURIComponent(user.email.trim().toLowerCase())}`
                      : null;

                    const content = (
                      <>
                        <p className="m-0 text-[1.0625rem] tracking-[0.03em] text-sumbi-text">
                          {user.name || "이름 없음"}
                        </p>
                        <p className="mt-1.5 mb-0 text-[0.875rem] tracking-[0.03em] text-sumbi-primary">
                          {user.nickname || "활동이름 없음"}
                        </p>
                        <p className="admin-label mt-2.5 mb-0">
                          가입일 · {formatJoinedAt(user.created_at)}
                        </p>
                      </>
                    );

                    return (
                      <li key={user.user_id || user.email}>
                        {href ? (
                          <Link href={href} className="admin-card-link">
                            {content}
                          </Link>
                        ) : (
                          <div className="admin-card">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="mt-10">
              <Link href="/admin/stats" className="admin-btn">
                주간 통계 더 보기
              </Link>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
