import type { KnowledgePage } from "@/types/knowledge";

import styles from "./scene.module.css";

type KnowledgeListPanelProps = {
  knowledgePage: KnowledgePage;
  toLocalTime: (isoString: string) => string;
};

export function KnowledgeListPanel({ knowledgePage, toLocalTime }: KnowledgeListPanelProps) {
  return (
    <section id="knowledge-list" className={styles.knowledgeCard}>
      <div className={styles.knowledgeHeader}>
        <div>
          <p className={styles.eyebrow}>Knowledge List</p>
          <h2 className={styles.knowledgeTitle}>知識列表</h2>
        </div>
        <p className={styles.knowledgeHint}>主管理者可新增知識連結。首頁目前每頁顯示 5 筆，其餘內容可往下一頁切換。</p>
      </div>

      <div className={styles.knowledgeList}>
        {knowledgePage.items.length > 0 ? (
          knowledgePage.items.map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className={styles.knowledgeRow}>
              <div className={styles.knowledgeMain}>
                <strong>{item.title}</strong>
                <span>{item.domain}</span>
              </div>
              <span className={styles.knowledgeTime}>{toLocalTime(item.createdAt)}</span>
            </a>
          ))
        ) : (
          <div className={styles.knowledgeEmpty}>目前還沒有知識連結。之後主管理者可透過 Telegram 新增給所有玩家閱讀。</div>
        )}
      </div>

      <div className={styles.knowledgePager}>
        {knowledgePage.hasPreviousPage ? (
          <a className={styles.knowledgePageLink} href={`/?page=${knowledgePage.page - 1}#knowledge-list`}>
            上一頁
          </a>
        ) : (
          <span className={styles.knowledgePageLinkDisabled}>上一頁</span>
        )}
        <span className={styles.knowledgePageStatus}>第 {knowledgePage.page} 頁</span>
        {knowledgePage.hasNextPage ? (
          <a className={styles.knowledgePageLink} href={`/?page=${knowledgePage.page + 1}#knowledge-list`}>
            下一頁
          </a>
        ) : (
          <span className={styles.knowledgePageLinkDisabled}>下一頁</span>
        )}
      </div>
    </section>
  );
}
