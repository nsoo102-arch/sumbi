"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MemberSheetRow } from "@/types/sheets";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; members: MemberSheetRow[] };

type SortOption = "recent" | "name" | "nickname";

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

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "ko", { sensitivity: "base" });
}

function joinedAtSortKey(value: string): number | null {
  const raw = (value || "").trim();
  if (!raw) {
    return null;
  }

  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

function sortMembers(
  members: MemberSheetRow[],
  sortBy: SortOption,
): MemberSheetRow[] {
  const next = [...members];

  next.sort((a, b) => {
    if (sortBy === "name") {
      const byName = compareText(a.name || "", b.name || "");
      if (byName !== 0) {
        return byName;
      }
      return compareText(a.nickname || "", b.nickname || "");
    }

    if (sortBy === "nickname") {
      const byNickname = compareText(a.nickname || "", b.nickname || "");
      if (byNickname !== 0) {
        return byNickname;
      }
      return compareText(a.name || "", b.name || "");
    }

    // 최근 가입순 (기본). 날짜 없거나 잘못된 회원은 맨 아래.
    const aTime = joinedAtSortKey(a.created_at);
    const bTime = joinedAtSortKey(b.created_at);
    if (aTime === null && bTime === null) {
      return compareText(a.name || "", b.name || "");
    }
    if (aTime === null) {
      return 1;
    }
    if (bTime === null) {
      return -1;
    }
    if (aTime !== bTime) {
      return bTime - aTime;
    }
    return compareText(a.name || "", b.name || "");
  });

  return next;
}

function matchesSearch(member: MemberSheetRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return [member.name, member.nickname, member.email].some((value) =>
    (value || "").trim().toLowerCase().includes(needle),
  );
}

export default function AdminUsersPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/sheets/members", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: MemberSheetRow[];
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error || "회원 목록을 불러오지 못했습니다.",
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
                : "회원 목록을 불러오지 못했습니다.",
          });
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleMembers = useMemo(() => {
    if (state.status !== "ready") {
      return [];
    }

    const filtered = state.members.filter((member) =>
      matchesSearch(member, query),
    );
    return sortMembers(filtered, sortBy);
  }, [state, query, sortBy]);

  return (
    <main className="admin-page">
      <div className="admin-container">
        <Link href="/admin" className="admin-back">
          ← 관리자 홈으로
        </Link>

        <h1 className="admin-title">회원</h1>

        <p className="admin-lead">
          함께하는 참여자를 살펴보고,
          <br />
          최근 함께하게 된 사람도 확인합니다.
        </p>

        {state.status === "ready" && state.members.length > 0 && (
          <div className="mb-7 grid gap-3">
            <label className="grid gap-2">
              <span className="admin-label">검색</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이름, 활동이름, 이메일"
                className="admin-control"
              />
            </label>

            <label className="grid gap-2">
              <span className="admin-label">정렬</span>
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as SortOption)
                }
                className="admin-control"
              >
                <option value="recent">최근 가입순</option>
                <option value="name">이름순</option>
                <option value="nickname">활동이름순</option>
              </select>
            </label>
          </div>
        )}

        {state.status === "loading" && (
          <p className="admin-muted leading-[1.8]">회원 목록을 불러오는 중…</p>
        )}

        {state.status === "error" && (
          <div className="admin-card">
            <p className="admin-error m-0">{state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="admin-btn mt-5"
            >
              다시 시도
            </button>
          </div>
        )}

        {state.status === "ready" && state.members.length === 0 && (
          <div className="admin-card py-10 text-center">
            <p className="admin-empty m-0">
              아직 등록된 회원이 없습니다.
              <br />
              회원가입이 완료되면 이곳에 나타납니다.
            </p>
          </div>
        )}

        {state.status === "ready" &&
          state.members.length > 0 &&
          visibleMembers.length === 0 && (
            <div className="admin-card py-10 text-center">
              <p className="admin-empty m-0">찾는 사람이 없습니다.</p>
            </div>
          )}

        {state.status === "ready" && visibleMembers.length > 0 && (
          <ul className="m-0 grid list-none gap-4 p-0">
            {visibleMembers.map((member, index) => {
              const href = memberDetailHref(member.email);

              const content = (
                <>
                  <p className="m-0 text-[1.125rem] tracking-[0.03em] text-sumbi-text">
                    {member.name || "이름 없음"}
                  </p>

                  <p className="mt-2 mb-0 text-[0.9375rem] tracking-[0.04em] text-sumbi-primary">
                    {member.nickname || "활동이름 없음"}
                  </p>

                  <p className="admin-body admin-break mt-4 mb-0">
                    {member.email || "이메일 없음"}
                  </p>

                  <p className="admin-label mt-2.5 mb-0">
                    가입일 · {formatJoinedAt(member.created_at)}
                  </p>

                  {href ? (
                    <p className="mt-[18px] mb-0 text-[0.875rem] tracking-[0.04em] text-sumbi-primary">
                      자세히 보기 →
                    </p>
                  ) : null}
                </>
              );

              return (
                <li key={member.user_id || `${member.email}-${index}`}>
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
      </div>
    </main>
  );
}
