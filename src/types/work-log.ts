export type WorkLogKind = "status" | "speech";

export interface WorkLogItem {
  id: string;
  targetId: string;
  targetName: string;
  isManager: boolean;
  status: string;
  speechText: string;
  kind: WorkLogKind;
  createdAt: string;
  updatedBy: string;
}

export interface WorkLogPage {
  items: WorkLogItem[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
