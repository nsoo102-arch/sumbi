import { NextResponse } from "next/server";
import {
  getServerSheetStorage,
  listMembers,
} from "@/services/sheets/server/getServerSheetStorage";
import { parseMemberRow } from "@/services/sheets/server/validate";

export async function GET() {
  try {
    const members = await listMembers();
    return NextResponse.json({ ok: true, data: members });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "회원 목록을 불러오지 못했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const row = parseMemberRow(body);
    await getServerSheetStorage().saveMember(row);
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "회원 저장에 실패했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
