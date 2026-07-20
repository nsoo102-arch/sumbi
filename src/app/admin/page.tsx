"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminSummary } from "@/types/sheets";

type DashboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      todayWriters: number;
      unreadReplies: number;
      inactiveCount: number;
    };

export default function AdminPage() {
  const [state, setState] = useState<DashboardState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setState({ status: "loading" });

      try {
        const [summaryResponse, inactiveResponse, repliesResponse] =
          await Promise.all([
            fetch("/api/sheets/admin-summary", {
              method: "GET",
              cache: "no-store",
            }),
            fetch("/api/sheets/admin-inactive-week", {
              method: "GET",
              cache: "no-store",
            }),
            fetch("/api/sheets/letters/replies/unread?limit=100", {
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
          data?: unknown[];
          error?: string;
        };
        const repliesPayload = (await repliesResponse.json()) as {
          ok?: boolean;
          count?: number;
          data?: unknown[];
          error?: string;
        };

        if (!summaryResponse.ok || !summaryPayload.ok || !summaryPayload.data) {
          throw new Error(
            summaryPayload.error || "오늘 할 일을 불러오지 못했습니다.",
          );
        }

        const inactiveCount =
          inactiveResponse.ok &&
          inactivePayload.ok &&
          Array.isArray(inactivePayload.data)
            ? inactivePayload.data.length
            : 0;

        const unreadReplies =
          repliesResponse.ok && repliesPayload.ok
            ? typeof repliesPayload.count === "number"
              ? repliesPayload.count
              : Array.isArray(repliesPayload.data)
                ? repliesPayload.data.length
                : 0
            : 0;

        if (!cancelled) {
          setState({
            status: "ready",
            todayWriters: summaryPayload.data.todayWriters,
            unreadReplies,
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
                : "오늘 할 일을 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="admin-page">
      <div className="admin-container">
        <h1 className="admin-title">숨비 관리자</h1>
        <p className="admin-lead">
          오늘 누구의 숨을 읽고,
          <br />
          누구에게 숨편지를 보낼까.
        </p>

        {state.status === "loading" && (
          <p className="admin-muted">오늘 할 일을 불러오는 중…</p>
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
          <div className="grid gap-6">
            <Link href="/admin/records" className="admin-card-link">
              <p className="m-0 text-[0.875rem] font-medium tracking-[0.03em] text-sumbi-primary">
                오늘 읽을 숨
              </p>
              <p className="mt-3 mb-0 text-[clamp(1.75rem,4vw,2.25rem)] font-medium leading-[1.1] tracking-[0.02em] text-sumbi-text">
                {state.todayWriters}
              </p>
              <p className="admin-label mt-2.5 mb-0">오늘 기록한 사람 수</p>
            </Link>

            <Link href="/admin/letters/replies" className="admin-card-link">
              <p className="m-0 text-[0.875rem] font-medium tracking-[0.03em] text-sumbi-primary">
                새 답장
              </p>
              <p className="mt-3 mb-0 text-[clamp(1.75rem,4vw,2.25rem)] font-medium leading-[1.1] tracking-[0.02em] text-sumbi-text">
                {state.unreadReplies}
              </p>
              <p className="admin-label mt-2.5 mb-0">읽지 않은 답장 수</p>
            </Link>

            <section className="admin-card">
              <h2 className="m-0 text-[1.0625rem] font-medium tracking-[0.04em] text-sumbi-primary">
                빠른 실행
              </h2>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/admin/records" className="admin-btn">
                  오늘 숨 읽기
                </Link>
                <Link href="/admin/letters" className="admin-btn">
                  숨편지 쓰기
                </Link>
              </div>
            </section>

            <section className="admin-card">
              <h2 className="m-0 text-[1.0625rem] font-medium tracking-[0.04em] text-sumbi-primary">
                이번 주 아직 숨이 없는 사람
              </h2>
              <p className="mt-3 mb-0 text-[clamp(1.75rem,4vw,2.25rem)] font-medium leading-[1.1] tracking-[0.02em] text-sumbi-text">
                {state.inactiveCount}
              </p>
              <p className="admin-label mt-2 mb-5">인원</p>
              <Link href="/admin/inactive" className="admin-btn">
                살펴보기
              </Link>
            </section>
          </div>
        )}

        <nav
          className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[0.9375rem] font-light tracking-[0.03em]"
          aria-label="관리 메뉴"
        >
          <Link href="/admin/overview" className="text-sumbi-primary no-underline hover:opacity-80">
            운영 현황
          </Link>
          <Link href="/admin/users" className="text-sumbi-primary no-underline hover:opacity-80">
            회원
          </Link>
          <Link href="/admin/letters" className="text-sumbi-primary no-underline hover:opacity-80">
            숨편지 관리
          </Link>
        </nav>
      </div>
    </main>
  );
}
