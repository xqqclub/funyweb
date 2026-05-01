import type { GameEvent, RpsMove } from "@/types/game";

import styles from "./scene.module.css";

type GameEventPanelProps = {
  events: GameEvent[];
  toLocalTime: (isoString: string) => string;
};

const moveLabels: Record<RpsMove, string> = {
  rock: "石頭",
  scissors: "剪刀",
  paper: "布"
};

function getMoveLabel(move: RpsMove | undefined) {
  return move ? moveLabels[move] : "未出拳";
}

export function GameEventPanel({ events, toLocalTime }: GameEventPanelProps) {
  const latest = events[0];

  return (
    <section className={styles.gameEventCard}>
      <div className={styles.knowledgeHeader}>
        <div>
          <p className={styles.eyebrow}>Game Events</p>
          <h2 className={styles.knowledgeTitle}>遊戲事件</h2>
        </div>
        <p className={styles.knowledgeHint}>玩家從 Telegram 或 LINE 下指令後，這裡會呈現最近的對戰結果。</p>
      </div>

      {latest ? (
        <article className={styles.gameEventHero} data-result={latest.result}>
          <div>
            <span className={styles.gameEventTag}>{latest.title}</span>
            <strong>{latest.result === "draw" ? "平手" : `${latest.players.find((player) => player.playerId === latest.winnerId)?.name ?? "玩家"} 勝利`}</strong>
            <p>{latest.message}</p>
          </div>
          <div className={styles.gameMoveGrid}>
            {latest.players.map((player) => (
              <div key={player.playerId} className={styles.gameMoveTile} data-winner={latest.winnerId === player.playerId}>
                <span>{player.name}</span>
                <strong>{getMoveLabel(latest.moves[player.playerId])}</strong>
              </div>
            ))}
          </div>
        </article>
      ) : (
        <div className={styles.knowledgeEmpty}>目前還沒有遊戲事件。玩家按下「猜拳」並完成出拳後，結果會出現在這裡。</div>
      )}

      {events.length > 1 ? (
        <div className={styles.gameEventList}>
          {events.slice(1).map((event) => (
            <div key={event.id} className={styles.gameEventRow}>
              <span>{toLocalTime(event.createdAt)}</span>
              <strong>{event.title}</strong>
              <p>{event.message}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
