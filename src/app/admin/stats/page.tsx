"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminStats } from "@/types/sheets";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; stats: AdminStats };

function formatWeekRange(start: string, end: string): string {
  const format = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const date = new Date(`${value}T12:00:00+09:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "numeric",
      day: "numeric",
    }).format(date);
  };

  if (!start && !end) {
    return "기간 미기록";
  }
  if (!end || start === end) {
    return format(start);
  }
  return `${format(start)} – ${format(end)}`;
}

export default function AdminStatsPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/sheets/admin-stats", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: AdminStats;
          error?: string;
        };

        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(
            payload.error || "관리자 통계를 불러오지 못했습니다.",
          );
        }

        if (!cancelled) {
          setState({ status: "ready", stats: payload.data });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "관리자 통계를 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = state.status === "ready" ? state.stats : null;
  const maxRitualCount = stats
    ? Math.max(1, ...stats.topRituals.map((item) => item.count), 1)
    : 1;
  const maxWeekParticipants = stats
    ? Math.max(1, ...stats.recentWeeks.map((item) => item.participants), 1)
    : 1;

  return (
    <main className="admin-page">
      <div className="admin-container">
        <Link href="/admin" className="admin-back">
          ← 관리자 홈으로
        </Link>

        <h1 className="admin-title">숨 돌아보기</h1>

        <p className="admin-lead">
          {stats
            ? `${formatWeekRange(stats.week_start, stats.week_end)} 한 주의 숨을 돌아봅니다.`
            : "한 주의 숨을 천천히 돌아보는 공간입니다."}
        </p>

        {state.status === "loading" && (
          <p className="admin-muted">통계를 불러오는 중…</p>
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

        {stats && (
          <>
            <div className="admin-grid-stats mb-6">
              {[
                { label: "전체 사람 수", value: String(stats.totalUsers) },
                {
                  label: "이번 주 참여자",
                  value: String(stats.weeklyParticipants),
                },
                {
                  label: "이번 주 참여율",
                  value: `${stats.weeklyParticipationRate}%`,
                },
                {
                  label: "이번 주 기록 수",
                  value: String(stats.weeklyRecordCount),
                },
              ].map((metric) => (
                <div key={metric.label} className="admin-card">
                  <p className="admin-label m-0">{metric.label}</p>
                  <p className="mt-2.5 mb-0 text-[1.75rem] font-medium tracking-[0.03em] text-sumbi-primary">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <section className="admin-card mb-6">
              <h2 className="admin-section-title">이번 주 많이 실행된 숨비소리</h2>
              {stats.topRituals.length === 0 ? (
                <p className="admin-muted m-0 leading-[1.8]">
                  이번 주 실행된 숨비소리가 아직 없습니다.
                </p>
              ) : (
                <ul className="m-0 grid list-none gap-3.5 p-0">
                  {stats.topRituals.map((ritual, index) => (
                    <li key={`${ritual.name}-${index}`}>
                      <div
                        className="mb-1.5 flex justify-between gap-3"
                      >
                        <span className="text-[0.9375rem] tracking-[0.03em] text-sumbi-text">
                          {index + 1}. {ritual.name}
                        </span>
                        <span className="text-[0.875rem] tracking-[0.03em] text-sumbi-primary">
                          {ritual.count}회
                        </span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          borderRadius: 999,
                          background: "#EEEAE2",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.round(
                              (ritual.count / maxRitualCount) * 100,
                            )}%`,
                            height: "100%",
                            background: "#2E7D7A",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-card">
              <h2 className="admin-section-title">최근 4주 참여자</h2>
              {stats.recentWeeks.length === 0 ? (
                <p className="admin-muted m-0 leading-[1.8]">
                  주간 참여자 데이터가 아직 없습니다.
                </p>
              ) : (
                <ul className="m-0 grid list-none gap-3.5 p-0">
                  {stats.recentWeeks.map((week) => (
                    <li key={week.week_start}>
                      <div className="mb-1.5 flex justify-between gap-3">
                        <span className="text-[0.875rem] tracking-[0.03em] text-sumbi-text/70">
                          {formatWeekRange(week.week_start, week.week_end)}
                        </span>
                        <span className="text-[0.875rem] tracking-[0.03em] text-sumbi-primary">
                          {week.participants}명
                        </span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          borderRadius: 999,
                          background: "#EEEAE2",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.round(
                              (week.participants / maxWeekParticipants) * 100,
                            )}%`,
                            height: "100%",
                            background: "#2E7D7A",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
