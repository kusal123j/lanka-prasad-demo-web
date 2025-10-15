// AccessPage.jsx
import React, { useEffect, useMemo, useState } from "react";

const DOWNLOAD_URL = "https://downloads.lasithaprasad.com/";
const WEB_PLAYER_URL = "https://player.lasithaprasad.com/";

function detectPlatform() {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent || navigator.vendor || window.opera;

  // iPadOS 13+ reports as Mac sometimes
  const isIpadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua) || isIpadOS) return "ios";
  if (/Macintosh|Mac OS X|MacIntel/.test(ua)) return "mac";
  if (/Win/.test(ua)) return "windows";
  if (/Linux/.test(ua)) return "linux";
  return "unknown";
}

const platformLabel = {
  ios: "iPhone/iPad",
  mac: "Mac",
  windows: "Windows",
  android: "Android",
  linux: "Linux",
  unknown: "Your device",
};

const IconPlay = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M8 5v14l11-7z" />
  </svg>
);
const IconDownload = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeWidth="2" d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
  </svg>
);
const IconInfo = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <circle cx="12" cy="12" r="9" strokeWidth="2" />
    <path strokeWidth="2" d="M12 8h.01M11 12h2v5h-2z" />
  </svg>
);
const IconApple = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.365 1.43c.125 1.03-.305 2.06-.96 2.82-.675.78-1.77 1.39-2.86 1.3-.14-1.01.31-2.06.98-2.83.67-.8 1.84-1.38 2.84-1.29zM20.5 17.38c-.45 1.04-1 2.06-1.76 3.02-.92 1.17-2.01 2.37-3.5 2.38-1.52.02-2-.77-3.73-.77-1.73 0-2.27.75-3.74.79-1.5.06-2.66-1.27-3.58-2.43-1.95-2.52-3.45-7.12-1.45-10.25.98-1.55 2.72-2.52 4.6-2.55 1.44-.03 2.79.84 3.74.84.93 0 2.57-1.04 4.34-.89.74.03 2.8.3 4.13 2.23-.11.07-2.47 1.45-2.45 4.33.02 3.43 3.09 4.57 3.1 4.57z" />
  </svg>
);
const IconWindows = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3 4.5 11.5 3v8.5H3V4.5zm8.5 8.5H3V21l8.5 1.5V13zm1.5-10L21 3v8.5h-8.5V3.5zM21 13h-8.5V22.5L21 21V13z" />
  </svg>
);
const IconAndroid = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path
      d="M7 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 10.5A1.5 1.5 0 0 1 6.5 9h11A1.5 1.5 0 0 1 19 10.5V17a2 2 0 0 1-2 2v2a1 1 0 0 1-2 0v-2H9v2a1 1 0 0 1-2 0v-2a2 2 0 0 1-2-2v-6.5zM7 3l1.5 2M17 3l-1.5 2"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

export default function Player() {
  const [manualPlatform, setManualPlatform] = useState("auto");
  const [detected, setDetected] = useState("unknown");

  useEffect(() => setDetected(detectPlatform()), []);

  const effectivePlatform = useMemo(
    () => (manualPlatform === "auto" ? detected : manualPlatform),
    [manualPlatform, detected]
  );

  // New strict rule:
  // - iOS => web only
  // - Windows/Mac/Android (+ others) => download only
  const isIOS = effectivePlatform === "ios";
  const recommendedAction = isIOS ? "web" : "download";

  const DeviceBadge = ({ platform }) => (
    <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-300">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60"></span>
        <span className="relative inline-flex size-2 rounded-full bg-red-500"></span>
      </span>
      Recommended for {platformLabel[platform] || "your device"}
    </span>
  );

  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-100 selection:bg-red-600 selection:text-white">
      {/* background accent */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950 to-black"></div>
        <div className="absolute inset-x-0 top-[-20%] mx-auto h-[520px] w-[720px] rounded-full bg-red-600/20 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-900/40">
            <IconPlay className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight">
              Class Video Access
            </div>
            <div className="text-xs text-neutral-400">
              Official Player Required
            </div>
          </div>
        </div>

        {/* Device switcher */}
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-xs text-neutral-400">Device:</span>
          <div className="flex overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/60">
            {[
              { key: "auto", label: "Auto" },
              { key: "ios", label: "iPhone/iPad" },
              { key: "windows", label: "Windows" },
              { key: "mac", label: "Mac" },
              { key: "android", label: "Android" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setManualPlatform(opt.key)}
                className={`px-3 py-1.5 text-sm transition ${
                  manualPlatform === opt.key
                    ? "bg-red-600 text-white"
                    : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Watch your class videos using our player
          </h1>
          <p className="mt-3 text-neutral-300">
            iPhone/iPad use the Web Player. Windows/Mac/Android must download
            the player.
          </p>
        </div>

        {/* Recommended card */}
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl shadow-black/30 backdrop-blur">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div className="space-y-2">
              <DeviceBadge platform={effectivePlatform} />
              <h2 className="text-xl font-semibold">
                {recommendedAction === "web"
                  ? "Open the Web Player"
                  : "Download the Video Player"}
              </h2>
              <p className="text-sm text-neutral-400">
                {recommendedAction === "web"
                  ? "On iPhone or iPad, use the web player (no app download)."
                  : "On Windows, Mac, or Android, download and install our player (no web player)."}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {recommendedAction === "web" ? (
                <a
                  href={WEB_PLAYER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <IconPlay className="h-5 w-5" />
                  Open Web Player
                </a>
              ) : (
                <a
                  href={DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <IconDownload className="h-5 w-5" />
                  Download Player
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Detail cards */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* iPhone/iPad */}
          <div className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 transition hover:border-red-500/40 hover:bg-neutral-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/90 text-white shadow shadow-red-900/40">
                <IconApple className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">iPhone / iPad</h3>
            </div>
            <p className="text-neutral-300">
              Use the Web Player to watch your class videos on iOS.
            </p>
            <a
              href={WEB_PLAYER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <IconPlay className="h-5 w-5" />
              Open Web Player
            </a>
            <p className="mt-3 text-xs text-neutral-500">
              No downloadable app for iPhone/iPad.
            </p>
          </div>

          {/* Windows / Mac / Android */}
          <div className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 transition hover:border-red-500/40 hover:bg-neutral-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/90 text-white shadow shadow-red-900/40">
                <IconDownload className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">Windows / Mac / Android</h3>
            </div>
            <p className="text-neutral-300">
              Download and install our official video player to watch your class
              videos.
            </p>
            <a
              href={DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <IconDownload className="h-5 w-5" />
              Go to Downloads
            </a>
            <div className="mt-3 flex items-start gap-2 text-xs text-neutral-400">
              <IconInfo className="mt-0.5 h-4 w-4" />
              <p>
                No web player available for Windows, Mac, or Android. Please use
                the downloadable app.
              </p>
            </div>
          </div>
        </div>

        {/* Clear rules section */}
        <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
          <div className="mb-2 flex items-center gap-2 text-red-300">
            <IconInfo className="h-5 w-5" />
            <span className="font-medium">Important</span>
          </div>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li>• You must use our official player to watch class videos.</li>
            <li>
              • iPhone/iPad: use the Web Player —
              <a
                className="ml-1 text-red-400 underline decoration-red-500/50 underline-offset-2 hover:text-red-300"
                href={WEB_PLAYER_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                player.lasithaprasad.com
              </a>
              .
            </li>
            <li>
              • Windows/Mac/Android: download the player —
              <a
                className="ml-1 text-red-400 underline decoration-red-500/50 underline-offset-2 hover:text-red-300"
                href={DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                downloads.lasithaprasad.com
              </a>
              .
            </li>
            <li>
              • Mac: do not use the browser — install the Mac app from the
              downloads page.
            </li>
          </ul>
        </div>

        {/* OS quick-icons */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-4 text-center text-xs text-neutral-400 sm:grid-cols-5">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
            <IconApple className="h-5 w-5 text-neutral-300" />
            <span>Mac</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
            <IconWindows className="h-5 w-5 text-neutral-300" />
            <span>Windows</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
            <IconAndroid className="h-5 w-5 text-neutral-300" />
            <span>Android</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
            <IconApple className="h-5 w-5 text-neutral-300" />
            <span>iPhone</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
            <IconApple className="h-5 w-5 text-neutral-300" />
            <span>iPad</span>
          </div>
        </div>
      </section>
    </main>
  );
}
