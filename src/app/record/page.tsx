"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components";
import {
  commitRecord,
  getWeeklyActivities,
  loadSumbi,
  saveDraftCheckedActivities,
  saveDraftReflection,
} from "@/lib";

export default function RecordPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [reflection, setReflection] = useState("");

  useEffect(() => {
    const list = getWeeklyActivities();
    setActivities(list);
    setChecked(list.map(() => false));

    const data = loadSumbi();
    if (data.draft.reflection) {
      setReflection(data.draft.reflection);
    }
  }, []);

  function toggleActivity(index: number) {
    setChecked((prev) =>
      prev.map((value, i) => (i === index ? !value : value)),
    );
  }

  function handleSubmit() {
    const trimmed = reflection.trim();
    if (!trimmed) {
      return;
    }

    saveDraftReflection(trimmed);
    saveDraftCheckedActivities(
      activities.filter((_, index) => checked[index]),
    );
    commitRecord();
    router.push("/footprints");
  }

  return (
    <section className="sumbi-page items-center">
      <h1 className="sumbi-heading mb-4">숨 돌아보기</h1>

      {activities.length > 0 && (
        <ul className="mb-12 w-full max-w-[360px] space-y-4">
          {activities.map((activity, index) => (
            <li key={`${activity}-${index}`}>
              <label className="sumbi-body flex cursor-pointer items-start gap-3 text-left">
                <input
                  type="checkbox"
                  checked={checked[index] ?? false}
                  onChange={() => toggleActivity(index)}
                  className="mt-1.5 h-4 w-4 shrink-0 rounded border border-sumbi-border accent-sumbi-primary"
                />
                <span>{activity}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <h2 className="sumbi-heading mb-6 w-full max-w-[360px]">
        숨 기록하기
      </h2>

      <textarea
        value={reflection}
        onChange={(event) => setReflection(event.target.value)}
        aria-label="오늘 숨비활동 회고"
        className="sumbi-textarea mx-auto mb-14 min-h-[200px] w-full max-w-[360px]"
      />

      <div className="flex justify-center">
        <Button
          className="px-12 py-3.5 text-[0.9375rem] font-normal tracking-wide"
          onClick={handleSubmit}
          disabled={!reflection.trim()}
        >
          다음
        </Button>
      </div>
    </section>
  );
}
