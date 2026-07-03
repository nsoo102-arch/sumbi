"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components";
import {
  getWeeklyActivities,
  normalizeActivities,
  saveDraftActivity,
  saveWeeklyActivities,
} from "@/lib";

const ACTIVITY_COUNT = 5;

const inputClassName =
  "sumbi-input mx-auto h-14 w-full max-w-[360px] !py-0 px-4 text-left";

function toInputFields(saved: string[]): string[] {
  const fields = Array(ACTIVITY_COUNT).fill("");
  saved.slice(0, ACTIVITY_COUNT).forEach((activity, index) => {
    fields[index] = activity;
  });
  return fields;
}

export default function TodayPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<string[]>(
    Array(ACTIVITY_COUNT).fill(""),
  );

  useEffect(() => {
    setActivities(toInputFields(getWeeklyActivities()));
  }, []);

  function updateActivity(index: number, value: string) {
    setActivities((prev) =>
      prev.map((activity, i) => (i === index ? value : activity)),
    );
  }

  function handleSubmit() {
    const filled = normalizeActivities(
      activities.map((activity) => activity.trim()),
    );
    saveWeeklyActivities(filled);
    saveDraftActivity(filled.join("\n"));
    router.push("/record");
  }

  return (
    <section className="sumbi-page items-center">
      <h1 className="sumbi-heading mb-4">이번 주 나의 숨비소리</h1>

      <p className="sumbi-body mb-10">
        이번 주 나를 숨 쉬게 할
        <br />
        소소한 활동을 정해보세요.
      </p>

      <div className="mb-14 flex w-full max-w-[360px] flex-col space-y-4">
        {activities.map((activity, index) => (
          <input
            key={index}
            type="text"
            aria-label={`활동 ${index + 1}`}
            value={activity}
            onChange={(event) => updateActivity(index, event.target.value)}
            className={inputClassName}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          className="px-12 py-3.5 text-[0.9375rem] font-normal tracking-wide"
          onClick={handleSubmit}
        >
          다음
        </Button>
      </div>
    </section>
  );
}
