"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminRecentUser, AdminSummary } from "@/types/sheets";

type SummaryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      summary: AdminSummary;
      inactiveCount: number;
    };

const ADMIN_CARDS = [
  {
    title: "사람 만나기",
    description: "함께하는 사람들의 모습을 살펴봅니다.",
    button: "사람 만나기",
    href: "/admin/users",
  },
  {
    title: "오늘 숨 읽기",
    description: "오늘 남겨진 숨을 읽고 응답합니다.",
    button: "오늘 숨 읽기",
    href: "/admin/records",
  },
  {
    title: "숨편지 쓰기",
    description: "기록을 읽고 직접 짧은 숨편지를 전합니다.",
    button: "사람 만나기",
    href: "/admin/users",
  },
  {
    title: "숨 돌아보기",
    description: "한 주의 숨을 천천히 돌아봅니다.",
    button: "숨 돌아보기",
    href: "/admin/stats",
  },
  {
    title: "이번 주 아직 숨이 없는 사람",
    description: "이번 주 기록이 아직 없는 분들을 살펴봅니다.",
    button: "살펴보기",
    href: "/admin/inactive",
  },
] as const;

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
    label: "읽지 않은 숨편지",
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

export default function AdminPage() {
  const [state, setState] = useState<SummaryState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setState({ status: "loading" });

      try {
        const [summaryResponse, inactiveResponse] = await Promise.all([
          fetch("/api/sheets/admin-summary", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/sheets/admin-inactive-week", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        const summaryPayload = (await summaryResponse.json()) as {
          ok?: boolean;
          data?: AdminSummary;
          error?: string;
        };
        const inactivePayload = (await inactiveResponse.json()) as {
          ok?: boolean;
          data?: AdminRecentUser[];
          error?: string;
        };

        if (!summaryResponse.ok || !summaryPayload.ok || !summaryPayload.data) {
          throw new Error(
            summaryPayload.error || "운영 현황을 불러오지 못했습니다.",
          );
        }

        const inactiveCount =
          inactiveResponse.ok &&
          inactivePayload.ok &&
          Array.isArray(inactivePayload.data)
            ? inactivePayload.data.length
            : 0;

        if (!cancelled) {
          setState({
            status: "ready",
            summary: summaryPayload.data,
            inactiveCount,
          });
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

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const priorityItems =
    state.status === "ready"
      ? [
          {
            label: "오늘 만나면 좋은 사람",
            value: String(state.summary.todayWriters),
            href: "/admin/records",
            hint: "오늘 숨을 남긴 사람",
          },
          {
            label: "아직 답장을 기다리는 숨",
            value: String(state.summary.unreadLetters),
            href: "/admin/letters/unread",
            hint: "읽지 않은 숨편지",
          },
          {
            label: "이번 주 아직 숨이 없는 사람",
            value: String(state.inactiveCount),
            href: "/admin/inactive",
            hint: "이번 주 미참여",
          },
          {
            label: "최근 함께하게 된 사람",
            value: String(state.summary.recentUsers.length),
            href: "/admin/users",
            hint: "최근 가입자",
          },
        ]
      : [];

  return (
    <main className="admin-page">
      <div className="admin-container-wide">
        <h1 className="admin-title">숨비 관리자</h1>

        <p className="admin-lead">
          사람의 숨을 읽고, 필요한 곳에 짧게 응답하는 공간입니다.
        </p>

        <section>
          <h2 className="admin-section-title">오늘 살펴볼 일</h2>

          {state.status === "loading" && (
            <p className="admin-muted">오늘 살펴볼 일을 불러오는 중…</p>
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
            <div className="admin-grid-metrics">
              {priorityItems.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="admin-card-link"
                >
                  <p className="m-0 text-[0.875rem] font-medium tracking-[0.03em] text-sumbi-primary">
                    {item.label}
                  </p>
                  <p
                    className="mt-3 mb-0 text-[clamp(1.75rem,4vw,2.25rem)] font-medium leading-[1.1] tracking-[0.02em] text-sumbi-text"
                  >
                    {item.value}
                  </p>
                  <p className="admin-label mt-2.5 mb-0">{item.hint}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {state.status === "ready" && (
          <section className="mt-9">
            <h2 className="admin-section-title">운영 현황</h2>
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
        )}

        {state.status === "ready" && (
          <section className="mt-9">
            <h2 className="admin-section-title">최근 함께하게 된 사람</h2>

            {state.summary.recentUsers.length === 0 ? (
              <div className="admin-card text-center">
                <p className="admin-empty m-0">아직 최근 가입자가 없습니다.</p>
              </div>
            ) : (
              <ul className="m-0 grid list-none gap-3 p-0">
                {state.summary.recentUsers.map((user) => {
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
        )}

        <section className="mt-11">
          <h2 className="admin-section-title">빠른 메뉴</h2>

          <div className="admin-grid-stats gap-5">
            {ADMIN_CARDS.map(({ title, description, button, href }) => (
              <div key={title} className="admin-card">
                <h3 className="m-0 text-[1.125rem] font-medium tracking-[0.04em] text-sumbi-primary">
                  {title}
                </h3>
                <p className="admin-body my-3 mb-5">{description}</p>
                <Link href={href} className="admin-btn">
                  {button}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
