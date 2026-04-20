import { atHomeModeMeta, statusMeta } from "@/lib/status/mapping";
import { formatLastActive, isPlayerOnline } from "@/lib/players/format";
import type { ActorState } from "@/types/actor";

import styles from "./scene.module.css";

type SelectedPlayerInfoProps = {
  player: ActorState & {
    isManager: boolean;
    roleLabel: string;
    permissions: string[];
    story: string;
    objective: string;
    queue: string[];
  };
  isPending: boolean;
  timePhaseLabel: string;
  weatherLabel: string;
  weatherHint: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  notification: { title: string; body: string; stamp: number } | null;
  toLocalTime: (isoString: string) => string;
  zoneLabel: Record<string, string>;
};

export function SelectedPlayerInfo({
  player,
  isPending,
  timePhaseLabel,
  weatherLabel,
  weatherHint,
  soundEnabled,
  onToggleSound,
  notification,
  toLocalTime,
  zoneLabel
}: SelectedPlayerInfoProps) {
  const meta = statusMeta[player.status];
  const statusLabel = player.status === "at_home" ? atHomeModeMeta[player.homeMode].label : meta.label;
  const online = isPlayerOnline(player.updatedAt);
  const lastActive = formatLastActive(player.updatedAt);

  return (
    <aside className={styles.infoPanel}>
      <p className={styles.eyebrow}>Live Sim Dashboard</p>
      <h1 className={styles.title}>Pixel Town Control</h1>
      <p className={styles.lead}>首頁優先顯示主管理者，但任何玩家的縮圖都能升級成主舞台，讓大家即時看到彼此目前狀態。</p>
      <div className={styles.statusBadge}>
        <span className={styles.chip} style={{ ["--chip-color" as string]: meta.accent }}>
          {meta.emoji}
        </span>
        <span>{statusLabel}</span>
        <span className={styles.presenceBadge} data-online={online}>
          {online ? "在線" : "離線"}
        </span>
      </div>
      <p className={styles.lead}>{player.story}</p>
      <div className={styles.missionPanel}>
        <div>
          <span className={styles.statLabel}>目前任務</span>
          <p className={styles.missionTitle}>{player.objective}</p>
        </div>
        <div className={styles.syncLine}>
          <span className={styles.syncDot} />
          Multiview Stage + Telegram Control
        </div>
        <div className={styles.phaseRow}>
          <span className={styles.phaseChip}>{timePhaseLabel}</span>
          <span className={styles.phaseChip}>{weatherLabel}</span>
          <span className={styles.phaseHint}>{weatherHint}</span>
        </div>
        <div className={styles.audioRow}>
          <button type="button" className={styles.audioToggle} onClick={onToggleSound} aria-pressed={soundEnabled}>
            <span className={styles.audioIcon}>{soundEnabled ? "SFX ON" : "SFX OFF"}</span>
            <span>{soundEnabled ? "事件提示音已啟用" : "事件提示音已靜音"}</span>
          </button>
        </div>
      </div>
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>目前焦點</span>
          <p className={styles.statValue}>{player.name}</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>角色類型</span>
          <p className={styles.statValue}>{player.roleLabel}</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>所在區域</span>
          <p className={styles.statValue}>{zoneLabel[player.location] ?? player.location}</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>更新時間</span>
          <p className={styles.statValue}>{toLocalTime(player.updatedAt)}</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>最後活動</span>
          <p className={styles.statValue}>{lastActive}</p>
        </div>
      </div>
      <div className={styles.playerRulesCard}>
        <div className={styles.playerRulesHeader}>
          <span className={styles.statLabel}>權限配置</span>
          <span className={styles.playerRulePill} data-manager={player.isManager}>
            {player.isManager ? "主管理者" : "一般玩家"}
          </span>
        </div>
        <div className={styles.playerRulesList}>
          {player.permissions.map((item) => (
            <div key={item} className={styles.queueItem}>
              <span className={styles.queueBullet} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.queuePanel}>
        <p className={styles.queueTitle}>狀態佇列</p>
        {player.queue.map((item) => (
          <div key={item} className={styles.queueItem}>
            <span className={styles.queueBullet} />
            <span>{item}</span>
          </div>
        ))}
      </div>
      <p className={styles.notice}>{isPending ? "正在同步最新狀態..." : "主管理者可新增知識列表；其他玩家目前只允許更新自己的狀態。"}</p>
      {notification ? (
        <div key={`panel-${notification.stamp}`} className={styles.eventCard}>
          <span className={styles.eventLabel}>Event Feed</span>
          <strong>{notification.title}</strong>
          <p>{notification.body}</p>
        </div>
      ) : null}
    </aside>
  );
}
