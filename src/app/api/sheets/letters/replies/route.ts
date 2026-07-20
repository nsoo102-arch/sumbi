import { NextResponse } from "next/server";
import {
  createLetterReply,
  listLetterReplies,
} from "@/services/sheets/server/getServerSheetStorage";
import {
  isAppsScriptConfigured,
  normalizeEmail,
} from "@/services/sheets/server/appsScriptClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const letterId = String(
      searchParams.get("letterId") ?? searchParams.get("letter_id") ?? "",
    ).trim();
    const email = normalizeEmail(searchParams.get("email") ?? "");

    if (!letterId) {
      return NextResponse.json(
        { ok: false, error: "letterId 쿼리 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    const replies = await listLetterReplies({ letterId, email });
    return NextResponse.json({ ok: true, data: replies });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "답장 목록을 불러오지 못했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const letterId = String(body.letterId ?? body.letter_id ?? "").trim();
    const email = normalizeEmail(String(body.email ?? ""));
    const replyContent = String(
      body.replyContent ?? body.reply_content ?? body.message ?? "",
    ).trim();
    const userId = String(body.userId ?? body.user_id ?? "").trim();
    const nickname = String(body.nickname ?? "").trim();

    if (!letterId) {
      return NextResponse.json(
        { ok: false, error: "letterId가 필요합니다." },
        { status: 400 },
      );
    }

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "email이 필요합니다." },
        { status: 400 },
      );
    }

    if (!replyContent) {
      return NextResponse.json(
        { ok: false, error: "답장 내용이 비어 있습니다." },
        { status: 400 },
      );
    }

    if (!isAppsScriptConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Apps Script URL이 설정되지 않아 답장을 저장할 수 없습니다.",
        },
        { status: 503 },
      );
    }

    const reply = await createLetterReply({
      letterId,
      email,
      userId,
      nickname,
      replyContent,
    });

    return NextResponse.json({ ok: true, data: reply });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "답장 저장에 실패했습니다.";
    const status = message.includes("이미 답장")
      ? 409
      : message.includes("찾을 수 없습니다")
        ? 404
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
