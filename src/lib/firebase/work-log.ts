import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import type { WorkLogItem, WorkLogKind, WorkLogPage } from "@/types/work-log";

const COLLECTION_NAME = "work_logs";
const DEFAULT_LIMIT = 5;

function normalizeLog(id: string, raw: Partial<WorkLogItem> | undefined): WorkLogItem {
  return {
    id,
    targetId: raw?.targetId ?? "",
    targetName: raw?.targetName ?? "Unknown",
    isManager: raw?.isManager ?? false,
    status: raw?.status ?? "",
    speechText: raw?.speechText ?? "",
    kind: raw?.kind === "speech" ? "speech" : "status",
    createdAt: raw?.createdAt ?? new Date(0).toISOString(),
    updatedBy: raw?.updatedBy ?? "system"
  };
}

export async function appendWorkLog(input: {
  targetId: string;
  targetName: string;
  isManager: boolean;
  status: string;
  speechText?: string;
  kind: WorkLogKind;
  updatedBy: string;
}) {
  const db = getFirebaseAdminDb();
  if (!db) {
    return { ok: false as const, reason: "Firebase unavailable" };
  }

  const createdAt = new Date().toISOString();
  const log: Omit<WorkLogItem, "id"> = {
    targetId: input.targetId,
    targetName: input.targetName,
    isManager: input.isManager,
    status: input.status,
    speechText: input.speechText ?? "",
    kind: input.kind,
    createdAt,
    updatedBy: input.updatedBy
  };

  const ref = await db.collection(COLLECTION_NAME).add(log);
  return { ok: true as const, id: ref.id, createdAt };
}

export async function listRecentWorkLogs(maxItems = DEFAULT_LIMIT): Promise<WorkLogItem[]> {
  const db = getFirebaseAdminDb();
  if (!db) {
    return [];
  }

  try {
    const snapshot = await db.collection(COLLECTION_NAME).orderBy("createdAt", "desc").limit(maxItems).get();
    return snapshot.docs.map((doc) => normalizeLog(doc.id, doc.data() as Partial<WorkLogItem> | undefined));
  } catch {
    return [];
  }
}

export async function listWorkLogs(targetId: string, page = 1, pageSize = DEFAULT_LIMIT): Promise<WorkLogPage> {
  const db = getFirebaseAdminDb();
  if (!db) {
    return {
      items: [],
      page,
      pageSize,
      hasNextPage: false,
      hasPreviousPage: page > 1
    };
  }

  try {
    const snapshot = await db.collection(COLLECTION_NAME).where("targetId", "==", targetId).get();
    const allItems = snapshot.docs
      .map((doc) => normalizeLog(doc.id, doc.data() as Partial<WorkLogItem> | undefined))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const startIndex = Math.max(0, (page - 1) * pageSize);
    const pagedItems = allItems.slice(startIndex, startIndex + pageSize);

    return {
      items: pagedItems,
      page,
      pageSize,
      hasNextPage: allItems.length > startIndex + pageSize,
      hasPreviousPage: page > 1
    };
  } catch {
    return {
      items: [],
      page,
      pageSize,
      hasNextPage: false,
      hasPreviousPage: page > 1
    };
  }
}
