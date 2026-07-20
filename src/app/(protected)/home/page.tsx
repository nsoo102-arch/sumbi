"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components";
import {
  clearSession,
  getPracticeRates,
  getSession,
  loadSumbi,
} from "@/lib";
import type { PracticeRates } from "@/lib";
import type { SumbiLetter } from "@/types";

function isUnreadLetter(letter: SumbiLetter): boolean {
  return letter.status !== "read" && !letter.read_at;
}

export default function HomePage() {
  const router = useRouter();
  const [rates, setRates] = useState<PracticeRates>({
    hasBreathedToday: false,
    weekRate: 0,
    monthRate: 0,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const data = loadSumbi();
    setRates(getPracticeRates(data.records));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUnreadLetters() {
      const session = getSession();
      if (!session?.email) {
        return;
      }

      try {
        const response = await fetch(
          `/api/sheets/letters?email=${encodeURIComponent(session.email)}&limit=30`,
          { method: "GET", cache: "no-store" },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: SumbiLetter[];
        };

        if (!response.ok || !payload.ok || !Array.isArray(payload.data)) {
          return;
        }

        if (!cancelled) {
          setUnreadCount(payload.data.filter(isUnreadLetter).length);
        }
      } catch {
        // 홈 메뉴는 유지하고 배지만 생략
      }
    }

    void loadUnreadLetters();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogout() {
    clearSession();
    router.replace("/login/signup");
  }

  return (
    <section className="sumbi-page-scroll items-center">
      <h1 className="sumbi-heading-tight">오늘도 숨비하셨나요?</h1>

      <p className="sumbi-muted mb-8 text-center">
        {rates.hasBreathedToday
          ? "오늘도 숨을 남기셨네요."
          : "아직 오늘의 숨이 없어요."}
      </p>

      <div className="sumbi-content mb-10 grid grid-cols-2 gap-3">
        <Card compact className="text-center">
          <p className="sumbi-caption mb-2">이번 주 실천률</p>
          <p className="text-[1.5rem] font-normal tracking-[0.04em] text-sumbi-primary">
            {rates.weekRate}%
          </p>
        </Card>
        <Card compact className="text-center">
          <p className="sumbi-caption mb-2">이번 달 실천률</p>
          <p className="text-[1.5rem] font-normal tracking-[0.04em] text-sumbi-primary">
            {rates.monthRate}%
          </p>
        </Card>
      </div>

      <nav className="sumbi-content mb-8 flex w-full flex-col gap-3" aria-label="홈 메뉴">
        <Link href="/today" className="sumbi-home-menu-card">
          <span className="sumbi-home-menu-emoji" aria-hidden>
            🌿
          </span>
          <span className="sumbi-home-menu-text">
            <span className="sumbi-home-menu-title">오늘의 숨</span>
            <span className="sumbi-home-menu-desc">이번 주 활동을 정하고 기록해요</span>
          </span>
        </Link>

        <Link href="/footprints" className="sumbi-home-menu-card">
          <span className="sumbi-home-menu-emoji" aria-hidden>
            📚
          </span>
          <span className="sumbi-home-menu-text">
            <span className="sumbi-home-menu-title">지난 숨</span>
            <span className="sumbi-home-menu-desc">쌓아 온 숨을 돌아봐요</span>
          </span>
        </Link>

        <Link href="/footprints" className="sumbi-home-menu-card">
          <span className="sumbi-home-menu-emoji" aria-hidden>
            💌
          </span>
          <span className="sumbi-home-menu-text">
            <span className="sumbi-home-menu-title">
              숨편지
              {unreadCount > 0 && (
                <span className="sumbi-home-badge">새 편지 {unreadCount}</span>
              )}
            </span>
            <span className="sumbi-home-menu-desc">도착한 숨편지를 읽어요</span>
          </span>
        </Link>

        <div className="sumbi-home-menu-card-wrap">
          <button
            type="button"
            className="sumbi-home-menu-card w-full"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <span className="sumbi-home-menu-emoji" aria-hidden>
              ⚙
            </span>
            <span className="sumbi-home-menu-text">
              <span className="sumbi-home-menu-title">설정</span>
              <span className="sumbi-home-menu-desc">
                프로필, 비밀번호, 로그아웃
              </span>
            </span>
          </button>

          {settingsOpen && (
            <div className="sumbi-home-settings">
              <Link href="/profile" className="sumbi-home-settings-link">
                프로필
              </Link>
              <Link href="/login/forgot" className="sumbi-home-settings-link">
                비밀번호 변경
              </Link>
              <button
                type="button"
                className="sumbi-home-settings-link sumbi-home-settings-logout"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </nav>
    </section>
  );
}
