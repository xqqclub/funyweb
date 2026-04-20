export type ApplicationStatus = "pending" | "approved" | "rejected" | "blocked";
export type ApplicationPlatform = "telegram" | "line" | "web";

export interface PlayerApplication {
  platform: ApplicationPlatform;
  platformUserId: string;
  platformUsername: string;
  telegramUserId: string;
  telegramUsername: string;
  displayName: string;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  note: string;
}
