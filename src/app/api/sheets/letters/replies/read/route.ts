import { NextResponse } from "next/server";
import { markLetterReplyRead } from "@/services/sheets/server/getServerSheetStorage";
import { isAppsScriptConfigured } from "@/services/sheets/server/appsScriptClient";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const replyId = String(body.replyId ?? body.reply_id ?? body.id ?? "").trim();

    if (!replyId) {
      return NextResponse.json(
        { ok: false, error: "replyId가 필요합니다." },
        { status: 400 },
      );
    }

    if (!isAppsScriptConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Apps Script URL이 설정되지 않아 읽음 처리할 수 없습니다.",
        },
        { status: 503 },
      );
    }

    const reply = await markLetterReplyRead({ replyId });
    return NextResponse.json({ ok: true, data: reply });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "읽음 처리에 실패했습니다.";
    const status = message.includes("찾을 수 없습니다") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}