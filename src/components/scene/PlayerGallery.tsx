import Image from "next/image";
import type { CSSProperties } from "react";

import { formatLastActive, isPlayerOnline } from "@/lib/players/format";
import { atHomeModeMeta, statusMeta } from "@/lib/status/mapping";
import type { ActorState } from "@/types/actor";

import styles from "./scene.module.css";

function getStableHue(seed: string) {
  return Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
}

export type PlayerGalleryItem = {
  id: string;
  isPlaceholder?: boolean;
  name: string;
  characterSummary?: string;
  needsCharacterSelection?: boolean;
  state: ActorState;
  isManager: boolean;
  roleLabel: string;
  previewBackground: string;
  previewCharacter: string;
  previewObjective: string;
  previewCharacterWidth: number;
};

type PlayerGalleryProps = {
  players: PlayerGalleryItem[];
  activePlayerId: string;
  onSelect: (playerId: string) => void;
};

export function PlayerGallery({ players, activePlayerId, onSelect }: PlayerGalleryProps) {
  return (
    <section className={styles.playerDeck}>
      <div className={styles.playerDeckHeader}>
        <div>
          <p className={styles.eyebrow}>Player Deck</p>
          <h2 className={styles.playerDeckTitle}>玩家舞台列表</h2>
        </div>
        <p className={styles.playerDeckHint}>預設顯示主管理者，點擊任何玩家即可切換主舞台與右側資訊面板。</p>
      </div>

      <div className={styles.playerDeckGrid}>
        {players.map((player) => {
          if (player.isPlaceholder) {
            return (
              <div key={player.id} className={styles.playerCardPlaceholder}>
                <div className={styles.playerPlaceholderVisual}>
                  <span className={styles.playerPlaceholderPlus}>+</span>
                </div>
                <div className={styles.playerCardMeta}>
                  <div className={styles.playerCardNameRow}>
                    <strong>等待玩家加入</strong>
                    <span className={styles.playerCardGhostBadge}>空白槽位</span>
                  </div>
                  <p>玩家完成 Telegram 註冊並通過審核後，會依序顯示在這裡。</p>
                </div>
              </div>
            );
          }

          const meta = statusMeta[player.state.status];
          const label = player.state.status === "at_home" ? atHomeModeMeta[player.state.homeMode].label : meta.label;
          const online = isPlayerOnline(player.state.updatedAt);
          const lastActive = formatLastActive(player.state.updatedAt);
          const speechPreview = player.state.speechText?.trim()?.slice(0, 18) ?? "";
          const speechTheme = player.isManager
            ? {
                background: "linear-gradient(180deg, rgba(255, 244, 204, 0.96), rgba(247, 226, 169, 0.92))",
                border: "rgba(167, 126, 35, 0.24)",
                text: "#2f2008"
              }
            : (() => {
                const hue = getStableHue(player.id);
                return {
                  background: `linear-gradient(180deg, hsla(${hue}, 72%, 96%, 0.96), hsla(${hue}, 64%, 90%, 0.92))`,
                  border: `hsla(${hue}, 48%, 42%, 0.2)`,
                  text: `hsl(${hue}, 32%, 20%)`
                };
              })();

          return (
            <button
              key={player.id}
              type="button"
              className={styles.playerCard}
              data-active={player.id === activePlayerId}
              onClick={() => onSelect(player.id)}
            >
              <div
                className={styles.playerCardScene}
                style={{ backgroundImage: `linear-gradient(180deg, rgba(10, 20, 30, 0.08), rgba(10, 20, 30, 0.28)), url(${player.previewBackground})` }}
              >
                <span className={styles.playerCardRole} data-manager={player.isManager}>
                  {player.roleLabel}
                </span>
                {speechPreview ? (
                  <span
                    className={styles.playerCardSpeech}
                    style={
                      {
                        ["--player-speech-background" as string]: speechTheme.background,
                        ["--player-speech-border" as string]: speechTheme.border,
                        ["--player-speech-text" as string]: speechTheme.text
                      } as CSSProperties
                    }
                  >
                    {speechPreview}
                  </span>
                ) : null}
                <div className={styles.playerCardCharacter} style={{ width: `${player.previewCharacterWidth}%` }}>
                  {player.needsCharacterSelection ? (
                    <div className={styles.playerCardCharacterFallback}>
                      <span>待選角</span>
                    </div>
                  ) : (
                    <Image
                      src={player.previewCharacter}
                      alt={`${player.name} 的狀態圖`}
                      width={480}
                      height={480}
                      className={styles.playerCardImage}
                    />
                  )}
                </div>
              </div>

              <div className={styles.playerCardMeta}>
                <div className={styles.playerCardNameRow}>
                  <strong>{player.name}</strong>
                  <span className={styles.playerCardBadge} style={{ ["--chip-color" as string]: meta.accent }}>
                    {label}
                  </span>
                </div>
                <div className={styles.playerCardPresenceRow}>
                  <span className={styles.playerPresenceDot} data-online={online} />
                  <span className={styles.playerPresenceText}>{online ? "在線" : "離線"}</span>
                  <span className={styles.playerLastActive}>{lastActive}</span>
                </div>
                {player.characterSummary ? <span className={styles.playerCardCharacterMeta}>{player.characterSummary}</span> : null}
                <p>{player.previewObjective}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
