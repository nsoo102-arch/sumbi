"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components";
import { getSession } from "@/lib/auth";
import { loadSumbi, saveProfile } from "@/lib";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    const data = loadSumbi();
    if (data.profile?.name) {
      setName(data.profile.name);
      return;
    }

    const session = getSession();
    if (session?.nickname) {
      setName(session.nickname);
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
    router.push("/home");
  }

  return (
    <section className="sumbi-page items-center">
      <h1 className="sumbi-heading-tight">활동이름</h1>
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
        className="sumbi-input-tall sumbi-content mb-14"
      />

      <div className="flex justify-center">
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          다음
        </Button>
      </div>
    </section>
  );
}
