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
import { syncBreathRecord } from "@/lib/sheetSync";

export default function RecordPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [reflection, setReflection] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const trimmed = reflection.trim();
      const checkedActivities = activities.filter(
        (_, index) => checked[index] ?? false,
      );

      saveDraftReflection(trimmed);
      saveDraftCheckedActivities(checkedActivities);
      const record = commitRecord({
        checkedActivities,
        reflection: trimmed,
      });

      if (process.env.NODE_ENV === "development") {
        console.log("RECORD checkedActivities", record.checkedActivities);
      }

      // 시트 동기화 실패해도 다음 화면으로 이동 (로컬 저장은 완료된 상태)
      try {
        await syncBreathRecord(record);
      } catch (syncError) {
        console.warn("[record] syncBreathRecord failed", syncError);
      }

      router.push("/home");
    } catch (submitError) {
      console.error("[record] submit failed", submitError);
      setError("기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  }

  return (
    <section className="sumbi-page items-center">
      <h1 className="sumbi-heading-tight">숨 기록하기</h1>

      <p className="sumbi-body mb-10">
        오늘 하루는 어떻게 숨비했는지
        <br />
        체크해 보세요.
      </p>

      {activities.length > 0 && (
        <ul className="sumbi-content mb-10 space-y-4">
          {activities.map((activity, index) => (
            <li key={`${activity}-${index}`}>
              <label className="sumbi-body flex cursor-pointer items-start gap-3 text-left">
                <input
                  type="checkbox"
                  checked={checked[index] ?? false}
                  onChange={() => toggleActivity(index)}
                  className="mt-1.5 h-4 w-4 shrink-0 rounded border border-sumbi-border accent-sumbi-primary"
                />
                <span className="break-words">{activity}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <p className="sumbi-body mb-8">
        오늘 하루 기억하고 싶은 순간이나
        <br />
        마음이 있다면 남겨보세요.
      </p>

      <textarea
        value={reflection}
        onChange={(event) => setReflection(event.target.value)}
        aria-label="오늘 숨비활동 회고"
        className="sumbi-textarea sumbi-content mb-8 min-h-[200px]"
      />

      {error && (
        <p className="sumbi-error-center sumbi-content mb-6" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-center">
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          aria-label="숨 저장"
        >
          {submitting ? "저장 중…" : "숨 저장"}
        </Button>
      </div>
    </section>
  );
}
