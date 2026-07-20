import { NextResponse } from "next/server";
import { listUnreadLetterReplies } from "@/services/sheets/server/getServerSheetStorage";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : 100;

    const replies = await listUnreadLetterReplies(
      Number.isFinite(limit) && limit > 0 ? limit : 100,
    );

    return NextResponse.json({
      ok: true,
      data: replies,
      count: replies.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "읽지 않은 답장을 불러오지 못했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
