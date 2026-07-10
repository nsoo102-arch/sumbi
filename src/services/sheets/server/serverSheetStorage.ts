import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  BreathRecordSheetRow,
  LetterSheetRow,
  MemberSheetRow,
  SheetStagingData,
} from "@/types/sheets";
import type { SheetStorageService } from "../sheetStorage.interface";

const DATA_DIR = path.join(process.cwd(), ".data");
const STAGING_FILE = path.join(DATA_DIR, "sheets-staging.json");

function defaultData(): SheetStagingData {
  return { members: [], records: [], letters: [] };
}

async function loadData(): Promise<SheetStagingData> {
  try {
    const raw = await readFile(STAGING_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<SheetStagingData>;
    return {
      members: parsed.members ?? [],
      records: parsed.records ?? [],
      letters: parsed.letters ?? [],
    };
  } catch {
    return defaultData();
  }
}

async function saveData(data: SheetStagingData): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STAGING_FILE, JSON.stringify(data, null, 2), "utf8");
}

/** 시범 운영용 서버 스테이징 저장소 (API route 전용) */
export const serverSheetStorage: SheetStorageService = {
  async saveMember(row: MemberSheetRow) {
    const data = await loadData();
    data.members = [...data.members, row];
    await saveData(data);
  },
  async listMembers() {
    const data = await loadData();
    return [...data.members].reverse();
  },
  async saveBreathRecord(row: BreathRecordSheetRow) {
    const data = await loadData();
    data.records = [...data.records, row];
    await saveData(data);
  },
  async saveLetter(row: LetterSheetRow) {
    const data = await loadData();
    data.letters = [...data.letters, row];
    await saveData(data);
  },
};
