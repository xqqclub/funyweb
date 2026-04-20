import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";

import { getFirebaseClientDb } from "@/lib/firebase/client";
import type { WorkLogItem } from "@/types/work-log";

const COLLECTION_NAME = "work_logs";

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

export function subscribeToWorkLogs(onChange: (logs: WorkLogItem[]) => void, maxItems = 10) {
  const db = getFirebaseClientDb();
  if (!db) {
    onChange([]);
    return () => undefined;
  }

  const logsQuery = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"), limit(maxItems));

  return onSnapshot(logsQuery, (snapshot) => {
    onChange(snapshot.docs.map((doc) => normalizeLog(doc.id, doc.data() as Partial<WorkLogItem> | undefined)));
  });
}
