export type SumbiProfile = {
  name: string;
  note: string;
};

export type SumbiRecord = {
  id: string;
  activity: string;
  reflection: string;
  checkedActivities: string[];
  savedAt: string;
};

export type SumbiDraft = {
  activity: string;
  reflection: string;
  checkedActivities: string[];
};

export type WeeklyActivities = {
  weekKey: string;
  activities: string[];
};

export type SumbiData = {
  profile: SumbiProfile | null;
  weeklyActivities: WeeklyActivities | null;
  records: SumbiRecord[];
  draft: SumbiDraft;
};
