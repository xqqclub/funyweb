"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import type { User } from "firebase/auth";

import { signInAsAdmin, signOutAdmin, subscribeToAuthState } from "@/lib/firebase/auth-helpers";
import { atHomeModeMeta, statusMeta } from "@/lib/status/mapping";
import type { ActorStatus, AtHomeMode } from "@/types/actor";
import type { WeatherMode } from "@/types/weather";

const statuses: ActorStatus[] = ["working", "going_home", "biking", "cleaning", "sleeping", "at_home"];
const atHomeModes: AtHomeMode[] = ["idle", "gaming", "streaming", "reading"];

export default function AdminPage() {
  const [selectedStatus, setSelectedStatus] = useState<ActorStatus>("working");
  const [selectedHomeMode, setSelectedHomeMode] = useState<AtHomeMode>("idle");
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("auto");
  const [feedback, setFeedback] = useState("尚未送出狀態更新。");
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  async function handleLogin() {
    try {
      await signInAsAdmin();
      setFeedback("登入成功，可以開始切換主角狀態。");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "登入失敗，請檢查 Firebase Auth 設定。");
    }
  }

  async function handleLogout() {
    await signOutAdmin();
    setFeedback("已登出管理後台。");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      if (!user) {
        setFeedback("請先登入管理後台。");
        return;
      }

      const idToken = await user.getIdToken();
      const response = await fetch("/api/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          status: selectedStatus,
          homeMode: selectedStatus === "at_home" ? selectedHomeMode : undefined,
          updatedBy: user.email ?? "admin-panel"
        })
      });

      if (!response.ok) {
        setFeedback("狀態更新失敗，請確認登入帳號是否已列入允許管理者。");
        return;
      }

      const payload = (await response.json()) as { state: { updatedAt: string } };
      setFeedback(`已切換為 ${statusMeta[selectedStatus].label}，更新時間 ${payload.state.updatedAt}`);
    });
  }

  function handleWeatherSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      if (!user) {
        setFeedback("請先登入管理後台。");
        return;
      }

      const idToken = await user.getIdToken();
      const response = await fetch("/api/weather", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          mode: weatherMode
        })
      });

      if (!response.ok) {
        setFeedback("天氣模式更新失敗。");
        return;
      }

      setFeedback(`已切換天氣模式為 ${weatherMode === "rain" ? "手動雨天" : "自動依台中天氣"}`);
    });
  }

  return (
    <main style={{ padding: "40px 20px", maxWidth: 920, margin: "0 auto", color: "var(--ink)" }}>
      <h1 style={{ marginBottom: 12 }}>管理後台雛形</h1>
      <p style={{ lineHeight: 1.7 }}>
        這一頁已接上 Firebase Google 登入與 API token 驗證，只有授權帳號能切換主角狀態。
      </p>

      <section
        style={{
          marginTop: 24,
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          background: "rgba(255,250,240,0.9)",
          border: "3px solid rgba(47,36,58,0.18)"
        }}
      >
        <h2 style={{ margin: 0 }}>管理者登入</h2>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          {authReady
            ? user
              ? `目前登入：${user.email ?? user.uid}`
              : "尚未登入，請使用 Firebase Auth 已啟用的 Google 帳號。"
            : "正在檢查登入狀態..."}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleLogin}
            disabled={isPending || !authReady || Boolean(user)}
            style={{
              width: "fit-content",
              padding: "12px 18px",
              borderRadius: 999,
              border: "none",
              background: "#2f243a",
              color: "#fff8ec",
              cursor: "pointer"
            }}
          >
            Google 登入
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending || !user}
            style={{
              width: "fit-content",
              padding: "12px 18px",
              borderRadius: 999,
              border: "2px solid rgba(47,36,58,0.2)",
              background: "#fff",
              color: "#2f243a",
              cursor: "pointer"
            }}
          >
            登出
          </button>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: 24,
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          background: "rgba(255,250,240,0.9)",
          border: "3px solid rgba(47,36,58,0.18)"
        }}
      >
        <label htmlFor="status">主角狀態</label>
        <select
          id="status"
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value as ActorStatus)}
          style={{ padding: 12, borderRadius: 12, border: "2px solid rgba(47,36,58,0.2)" }}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusMeta[status].label}
            </option>
          ))}
        </select>

        {selectedStatus === "at_home" ? (
          <>
            <label htmlFor="home-mode">在家模式</label>
            <select
              id="home-mode"
              value={selectedHomeMode}
              onChange={(event) => setSelectedHomeMode(event.target.value as AtHomeMode)}
              style={{ padding: 12, borderRadius: 12, border: "2px solid rgba(47,36,58,0.2)" }}
            >
              {atHomeModes.map((mode) => (
                <option key={mode} value={mode}>
                  {atHomeModeMeta[mode].label}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <button
          type="submit"
          disabled={isPending || !user}
          style={{
            width: "fit-content",
            padding: "12px 18px",
            borderRadius: 999,
            border: "none",
            background: "#2f243a",
            color: "#fff8ec",
            cursor: "pointer"
          }}
        >
          {isPending ? "更新中..." : "送出狀態"}
        </button>

        <p style={{ margin: 0, opacity: 0.8 }}>{feedback}</p>
      </form>

      <form
        onSubmit={handleWeatherSubmit}
        style={{
          marginTop: 24,
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          background: "rgba(255,250,240,0.9)",
          border: "3px solid rgba(47,36,58,0.18)"
        }}
      >
        <label htmlFor="weather-mode">天氣模式</label>
        <select
          id="weather-mode"
          value={weatherMode}
          onChange={(event) => setWeatherMode(event.target.value as WeatherMode)}
          style={{ padding: 12, borderRadius: 12, border: "2px solid rgba(47,36,58,0.2)" }}
        >
          <option value="auto">自動依台中天氣</option>
          <option value="rain">手動雨天</option>
        </select>

        <button
          type="submit"
          disabled={isPending || !user}
          style={{
            width: "fit-content",
            padding: "12px 18px",
            borderRadius: 999,
            border: "none",
            background: "#2f243a",
            color: "#fff8ec",
            cursor: "pointer"
          }}
        >
          {isPending ? "更新中..." : "送出天氣模式"}
        </button>
      </form>
    </main>
  );
}
