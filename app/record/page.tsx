"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import PageLayout from "@/components/PageLayout";
import { getSumbiData, saveSumbiData } from "@/lib/storage";

export default function RecordPage() {
  const router = useRouter();
  const [recordNote, setRecordNote] = useState("");

  useEffect(() => {
    const data = getSumbiData();
    if (data.recordNote) {
      setRecordNote(data.recordNote);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveSumbiData({ recordNote });
    router.push("/saved");
  };

  return (
    <PageLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-12">
        <p className="text-lg leading-relaxed text-foreground/80">
          오늘 숨비활동은 어땠나요?
        </p>

        <textarea
          value={recordNote}
          onChange={(e) => setRecordNote(e.target.value)}
          rows={12}
          className="resize-none border-b border-foreground/20 bg-transparent py-3 text-base leading-relaxed outline-none transition-colors focus:border-primary"
          placeholder="오늘의 숨비활동을 기록해보세요"
        />

        <Button type="submit" fullWidth>
          저장하기
        </Button>
      </form>
    </PageLayout>
  );
}
