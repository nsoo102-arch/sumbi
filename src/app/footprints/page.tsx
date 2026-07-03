"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components";
import { getFootprintsSummary, loadSumbi, normalizeActivities } from "@/lib";
import type { FootprintsSummary } from "@/lib";
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

  useEffect(() => {
    const data = loadSumbi();
    const todayRecord = getTodayRecord(data.records);
    setTodayActivities(
      normalizeActivities(todayRecord?.checkedActivities ?? []),
    );
    setSummary(getFootprintsSummary(data.records));
  }, []);

  function handleSubmit() {
    router.push("/saved");
  }

  return (
    <section className="sumbi-page items-center">
      <h1 className="sumbi-heading mb-10">이번 주 나의 숨</h1>

      <div className="mb-14 w-full max-w-[360px] space-y-10">
        <div>
          <h2 className="sumbi-body mb-4 text-center">오늘의 숨</h2>
          <Card className="!py-5">
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
              <p className="sumbi-body text-center text-[0.9375rem] font-light text-sumbi-text/60">
                오늘 남긴 숨이 아직 없습니다.
              </p>
            )}
          </Card>
        </div>

        <div>
          <h2 className="sumbi-body mb-4 text-center">이번 주의 숨</h2>
          <Card className="!py-5">
            {summary.weekCounts.length > 0 ? (
              <ul className="sumbi-body space-y-3 text-left">
                {summary.weekCounts.map(([activity, count]) => (
                  <li
                    key={activity}
                    className="flex items-baseline justify-between gap-6 font-light"
                  >
                    <span>{activity}</span>
                    <span className="shrink-0 text-sumbi-text/70">
                      {count}회
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sumbi-body text-center text-[0.9375rem] font-light text-sumbi-text/60">
                이번 주 쌓인 숨이 아직 없습니다.
              </p>
            )}
          </Card>
        </div>

        <div>
          <h2 className="sumbi-body mb-4 text-center">다음 주에 이어갈 숨</h2>
          <Card className="!py-5">
            <p className="sumbi-body text-center font-light leading-relaxed">
              이번 주의 숨을 보고,
              <br />
              다음 주 숨비소리를 다시 정해보세요.
            </p>
          </Card>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          className="px-12 py-3.5 text-[0.9375rem] font-normal tracking-wide"
          onClick={handleSubmit}
        >
          마무리하기
        </Button>
      </div>
    </section>
  );
}
