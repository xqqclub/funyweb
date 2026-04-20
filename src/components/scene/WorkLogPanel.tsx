import type { WorkLogPage } from "@/types/work-log";

import styles from "./scene.module.css";

type WorkLogPanelProps = {
  targetName: string;
  workLogPage: WorkLogPage;
  onPageChange: (nextPage: number) => void;
  toLocalTime: (isoString: string) => string;
};

function getDisplayStatus(status: string) {
  if (!status) {
    return "未設定";
  }

  if (status.startsWith("at_home:")) {
    const mode = status.replace("at_home:", "");
    return `在家 / ${mode}`;
  }

  return status;
}

export function WorkLogPanel({ targetName, workLogPage, onPageChange, toLocalTime }: WorkLogPanelProps) {
  return (
    <section id="work-log" className={styles.workLogCard}>
      <div className={styles.knowledgeHeader}>
        <div>
          <p className={styles.eyebrow}>Work Log</p>
          <h2 className={styles.knowledgeTitle}>工作日誌</h2>
        </div>
        <p className={styles.knowledgeHint}>{targetName} 的狀態與對話更新紀錄，包含更新時間、狀態與當下說話內容。</p>
      </div>

      <div className={styles.workLogList}>
        {workLogPage.items.length > 0 ? (
          workLogPage.items.map((item) => (
            <article key={item.id} className={styles.workLogRow}>
              <div className={styles.workLogMain}>
                <div className={styles.workLogTop}>
                  <strong>{item.targetName}</strong>
                  <span className={styles.workLogKind} data-kind={item.kind}>
                    {item.kind === "speech" ? "對話更新" : "狀態更新"}
                  </span>
                </div>
                <div className={styles.workLogMeta}>
                  <span>狀態：{getDisplayStatus(item.status)}</span>
                  <span>更新者：{item.updatedBy}</span>
                </div>
                <p className={styles.workLogSpeech}>說話：{item.speechText?.trim() ? item.speechText : "無"}</p>
              </div>
              <span className={styles.knowledgeTime}>{toLocalTime(item.createdAt)}</span>
            </article>
          ))
        ) : (
          <div className={styles.knowledgeEmpty}>目前還沒有工作日誌。之後每次狀態或對話改變都會記錄在這裡。</div>
        )}
      </div>

      <div className={styles.knowledgePager}>
        {workLogPage.hasPreviousPage ? (
          <button type="button" className={styles.knowledgePageLink} onClick={() => onPageChange(workLogPage.page - 1)}>
            上一頁
          </button>
        ) : (
          <span className={styles.knowledgePageLinkDisabled}>上一頁</span>
        )}
        <span className={styles.knowledgePageStatus}>第 {workLogPage.page} 頁</span>
        {workLogPage.hasNextPage ? (
          <button type="button" className={styles.knowledgePageLink} onClick={() => onPageChange(workLogPage.page + 1)}>
            下一頁
          </button>
        ) : (
          <span className={styles.knowledgePageLinkDisabled}>下一頁</span>
        )}
      </div>
    </section>
  );
}
