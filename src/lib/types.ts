export type GoalType = "lose" | "gain";

export type PublicUser = {
  id: number;
  email: string;
  displayName: string;
  goalType: GoalType;
  goalWeightKg: number | null;
  shareProgress: boolean;
};

export type WeightEntry = { id: number; entryDate: string; weightKg: number };

export type LeaderboardEntry = {
  rank: number;
  userId: number;
  displayName: string;
  progressPct: number;
  consistencyPct: number;
  score: number;
  isYou: boolean;
};

export type ComparePoint = { date: string; pct: number };

export type CompareSeries = {
  userId: number;
  displayName: string;
  isYou: boolean;
  points: ComparePoint[];
};

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  goalType: GoalType;
  goalWeightKg?: number;
};

export type LoginInput = { email: string; password: string };

export type SaveWeightInput = { entryDate: string; weightKg: number };

export type SaveWeightResult = { entry: WeightEntry; created: boolean };
