export type MemberStatus = "active" | "inactive";

export type MemberSheetRow = {
  user_id: string;
  name: string;
  nickname: string;
  email: string;
  created_at: string;
  status: MemberStatus;
};

/** weekly_plan 시트의 최근 주간 숨비소리 */
export type MemberWeeklyPlan = {
  created_at: string;
  user_id: string;
  name: string;
  nickname: string;
  email: string;
  week_start_date: string;
  rituals: string[];
};

/** daily_record 시트의 최근 숨 기록 */
export type MemberDailyRecord = {
  timestamp: string;
  user_id: string;
  nickname: string;
  date: string;
  completed_rituals: string;
  memo: string;
};

export type MemberDetail = {
  member: MemberSheetRow;
  weekly: MemberWeeklyPlan | null;
  records: MemberDailyRecord[];
};

export type BreathRecordSheetRow = {
  record_id: string;
  user_id: string;
  name: string;
  nickname: string;
  email: string;
  date: string;
  mood: string;
  content: string;
  created_at: string;
};

export type LetterSentStatus = "pending" | "sent";

/** 로컬 스테이징용 레거시 편지 행 */
export type LetterSheetRow = {
  letter_id: string;
  user_id: string;
  record_id: string;
  name: string;
  nickname: string;
  letter_content: string;
  created_at: string;
  sent_status: LetterSentStatus;
};

export type SumbiLetterStatus = "unread" | "read";

/** Google Sheets Letters 시트 행 */
export type SumbiLetter = {
  id: string;
  email: string;
  name: string;
  nickname: string;
  message: string;
  sent_at: string;
  read_at: string;
  status: SumbiLetterStatus;
};

/** Google Sheets LetterReplies 시트 행 (참여자 → 수 답장) */
export type LetterReply = {
  replyId: string;
  letterId: string;
  userId: string;
  email: string;
  nickname: string;
  replyContent: string;
  createdAt: string;
  isRead: boolean;
};

/** 관리자 대시보드 최근 가입자 */
export type AdminRecentUser = {
  user_id: string;
  name: string;
  nickname: string;
  email: string;
  created_at: string;
};

/** 관리자 대시보드 요약 */
export type AdminSummary = {
  /** snake_case (Apps Script / 기존) */
  total_members: number;
  today_breathers: number;
  week_participants: number;
  unread_letters: number;
  /** camelCase aliases */
  totalUsers: number;
  todayWriters: number;
  weeklyParticipants: number;
  weeklyParticipationRate: number;
  unreadLetters: number;
  recentUsers: AdminRecentUser[];
  today: string;
  week_start: string;
  week_end: string;
};

/** 관리자용 Daily 기록 (Users 조인 포함) */
export type AdminDailyRecord = {
  timestamp: string;
  user_id: string;
  name: string;
  nickname: string;
  email: string;
  date: string;
  completed_rituals: string;
  memo: string;
};

/** 이번 주 가장 많이 실행된 숨비소리 */
export type AdminRitualRank = {
  name: string;
  count: number;
};

/** 주간 참여자 추이 */
export type AdminWeeklyTrend = {
  week_start: string;
  week_end: string;
  participants: number;
};

/** 관리자 통계 (/admin/stats) */
export type AdminStats = {
  totalUsers: number;
  weeklyParticipants: number;
  weeklyParticipationRate: number;
  weeklyRecordCount: number;
  topRituals: AdminRitualRank[];
  recentWeeks: AdminWeeklyTrend[];
  today: string;
  week_start: string;
  week_end: string;
};

/** 관리자 전용 운영 메모 (AdminNotes 시트) */
export type AdminNote = {
  email: string;
  note: string;
  updated_at: string;
};

export type SheetStagingData = {
  members: MemberSheetRow[];
  records: BreathRecordSheetRow[];
  letters: LetterSheetRow[];
};
