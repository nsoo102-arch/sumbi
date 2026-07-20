"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components";
import {
  getFootprintsSummary,
  getPracticeRates,
  loadSumbi,
  normalizeActivities,
} from "@/lib";
import type { FootprintsSummary, PracticeRates } from "@/lib";
import type { SumbiRecord } from "@/types";

function getTodayRecord(records: SumbiRecord[]): SumbiRecord | undefined {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  return records
    .filter((record) => {
      const savedAt = new Date(record.savedAt);
      return savedAt >= todayStart && savedAt < todayEnd;
    })
    .at(-1);
}

export default function FootprintsPage() {
  const router = useRouter();
  const [todayActivities, setTodayActivities] = useState<string[]>([]);
  const [summary, setSummary] = useState<FootprintsSummary>({
    weekCounts: [],
  });
  const [rates, setRates] = useState<PracticeRates>({
    hasBreathedToday: false,
    weekRate: 0,
    monthRate: 0,
  });

  useEffect(() => {
    const data = loadSumbi();
    const todayRecord = getTodayRecord(data.records);
    setTodayActivities(
      normalizeActivities(todayRecord?.checkedActivities ?? []),
    );
    setSummary(getFootprintsSummary(data.records));
    setRates(getPracticeRates(data.records));
  }, []);

  function handleSubmit() {
    router.push("/home");
  }

  return (
    <section className="sumbi-page-scroll items-center">
      <h1 className="sumbi-heading-form">숨 기록</h1>

      <div className="sumbi-content mb-14 space-y-10">
        <div>
          <h2 className="sumbi-subheading">오늘의 숨</h2>
          <Card compact>
            {todayActivities.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {todayActivities.map((activity) => (
                  <span
                    key={activity}
                    className="rounded-full border border-sumbi-border bg-sumbi-background px-4 py-2 text-[0.9375rem] font-light tracking-[0.04em] text-sumbi-text"
                  >
                    {activity}
                  </span>
                ))}
              </div>
            ) : (
              <p className="sumbi-loading">오늘 남긴 숨이 아직 없습니다.</p>
            )}
          </Card>
        </div>

        <div>
          <h2 className="sumbi-subheading">이번 주의 숨</h2>
          <Card compact>
            {summary.weekCounts.length > 0 ? (
              <ul className="sumbi-body space-y-3 text-left">
                {summary.weekCounts.map(([activity, count]) => (
                  <li
                    key={activity}
                    className="flex items-baseline justify-between gap-6 font-light"
                  >
                    <span className="break-words">{activity}</span>
                    <span className="shrink-0 text-sumbi-text/70">
                      {count}회
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sumbi-loading">이번 주 쌓인 숨이 아직 없습니다.</p>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
      </div>

      <div className="flex justify-center">
        <Button onClick={handleSubmit}>숨 완료</Button>
      </div>
    </section>
  );
}
