"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components";
import { loadSumbi, saveProfile } from "@/lib";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    const data = loadSumbi();
    if (data.profile?.name) {
      setName(data.profile.name);
    }
  }, []);
  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const existing = loadSumbi();
    saveProfile({
      name: trimmedName,
      note: existing.profile?.note ?? "",
    });
    router.push("/today");
  }

  return (
    <section className="sumbi-page items-center">
      <h1 className="sumbi-heading mb-4">활동이름</h1>
      <p className="sumbi-body mb-10">
        숨비소리에서
        <br />
        불리고 싶은 이름을 적어주세요.
      </p>

      <input
        id="profile-name"
        type="text"
        aria-label="활동이름"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="sumbi-input mx-auto mb-14 h-14 w-full max-w-[360px] !py-0 px-4 text-left"
      />

      <div className="flex justify-center">
        <Button
          className="px-12 py-3.5 text-[0.9375rem] font-normal tracking-wide"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          다음
        </Button>
      </div>
    </section>
  );
}
