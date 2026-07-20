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
import { syncWeeklyPlanAfterSave } from "@/lib/sheetSync";

const ACTIVITY_COUNT = 5;

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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setActivities(toInputFields(getWeeklyActivities()));
  }, []);

  function updateActivity(index: number, value: string) {
    setActivities((prev) =>
      prev.map((activity, i) => (i === index ? value : activity)),
    );
  }

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const filled = normalizeActivities(
        activities.map((activity) => activity.trim()),
      );
      saveWeeklyActivities(filled);
      saveDraftActivity(filled.join("\n"));

      try {
        await syncWeeklyPlanAfterSave(filled);
      } catch (syncError) {
        console.warn("[today] syncWeeklyPlanAfterSave failed", syncError);
      }

      router.push("/home");
    } catch (submitError) {
      console.error("[today] submit failed", submitError);
      setSubmitting(false);
    }
  }

  return (
    <section className="sumbi-page items-center">
      <h1 className="sumbi-today-title">숨비소리</h1>

      <p className="sumbi-today-desc mb-8">
        나를 위한,
        <br />
        나를 숨 쉬게 해주는
        <br />
        활동을 계획해 보세요.
      </p>

      <div className="sumbi-content mb-14 flex flex-col space-y-4">
        {activities.map((activity, index) => (
          <input
            key={index}
            type="text"
            aria-label={`숨비활동 ${index + 1}`}
            value={activity}
            onChange={(event) => updateActivity(index, event.target.value)}
            className="sumbi-input-tall"
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={handleSubmit} disabled={submitting}>
          숨 저장
        </Button>
      </div>
    </section>
  );
}
