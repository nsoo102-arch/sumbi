import type {
  BreathRecordSheetRow,
  LetterSheetRow,
  MemberSheetRow,
} from "@/types/sheets";

export type SheetStorageService = {
  saveMember(row: MemberSheetRow): Promise<void>;
  listMembers(): Promise<MemberSheetRow[]>;
  saveBreathRecord(row: BreathRecordSheetRow): Promise<void>;
  saveLetter(row: LetterSheetRow): Promise<void>;
};
