import type {
  BreathRecordSheetRow,
  LetterSheetRow,
  MemberSheetRow,
  SheetStagingData,
} from "@/types/sheets";
import type { SheetStorageService } from "../sheetStorage.interface";

const STORAGE_KEY = "sumbi-sheets-staging";

function defaultData(): SheetStagingData {
  return { members: [], records: [], letters: [] };
}

function loadData(): SheetStagingData {
  if (typeof window === "undefined") {
    return defaultData();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultData();
    }
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

function saveData(data: SheetStagingData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const localSheetStorage: SheetStorageService = {
  async saveMember(row: MemberSheetRow) {
    const data = loadData();
    data.members = [...data.members, row];
    saveData(data);
  },
  async listMembers() {
    const data = loadData();
    return [...data.members].reverse();
  },
  async saveBreathRecord(row: BreathRecordSheetRow) {
    const data = loadData();
    data.records = [...data.records, row];
    saveData(data);
  },
  async saveLetter(row: LetterSheetRow) {
    const data = loadData();
    data.letters = [...data.letters, row];
    saveData(data);
  },
};
