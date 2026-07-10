import { NextResponse } from "next/server";
import { listUnreadLetters } from "@/services/sheets/server/getServerSheetStorage";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : 100;

    const letters = await listUnreadLetters(
      Number.isFinite(limit) && limit > 0 ? limit : 100,
    );
    return NextResponse.json({ ok: true, data: letters });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "읽지 않은 숨편지를 불러오지 못했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
