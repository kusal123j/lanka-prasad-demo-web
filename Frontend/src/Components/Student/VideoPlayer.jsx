import React, { useContext, useEffect, useRef, useState } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import axios from "axios";
import toast from "react-hot-toast";
import { AppContext } from "../../Context/AppContext";

const VideoPlayer = ({ videoId, userId, courseId, chapterId, lectureId }) => {
  const { backend_url } = useContext(AppContext);

  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const watermarkRef = useRef(null);
  const pauseOverlayRef = useRef(null);
  const fixSoundButtonRef = useRef(null); // NEW

  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [showFixSoundButton, setShowFixSoundButton] = useState(false);

  // Logic refs (from current version)
  const trackingRef = useRef({ timer: null, lastStart: 0, finished: false });
  const resumeAppliedRef = useRef(false);
  const resumeTargetRef = useRef(0);
  const pendingSeekRef = useRef(null);
  const timeUpdateThrottleRef = useRef(0);
  const slowTimerRef = useRef(null);

  const lsKey = `videoProgress:${courseId}:${chapterId}:${lectureId}`;

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Reset on context change
  useEffect(() => {
    resumeAppliedRef.current = false;
    resumeTargetRef.current = 0;
    setIsLoading(true);
    setLoadingSlow(false);
  }, [videoId, courseId, chapterId, lectureId]);

  useEffect(() => {
    if (!playerRef.current) return;

    // Old UI controls, plus speed in settings
    const controls = [
      "play-large",
      "rewind",
      "play",
      "fast-forward",
      "progress",
      "current-time",
      "mute",
      "volume",
      "settings",
      "fullscreen",
    ];
    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

    const player = new Plyr(playerRef.current, {
      seekTime: 10,
      controls,
      speed: { selected: 1, options: speedOptions },
      youtube: {
        rel: 1,
        modestbranding: 1,
        playsinline: 1,
      },
      keyboard: { focused: true, global: true }, // match old behavior
      ratio: "16:9",
      autoplay: false,
      clickToPlay: true,
      muted: false,
      // Important: prevent restoring muted/volume from other pages
      storage: { enabled: false },
    });

    playerInstanceRef.current = player;

    // show slow-loading hint after 8s if still loading
    slowTimerRef.current = setTimeout(() => setLoadingSlow(true), 8000);

    const UPDATE_INTERVAL_MS = 60000;
    const tracking = trackingRef.current;
    tracking.timer = null;
    tracking.lastStart = 0;
    tracking.finished = false;

    const canTrack =
      Boolean(backend_url) &&
      Boolean(courseId) &&
      Boolean(chapterId) &&
      Boolean(lectureId);

    // sendBeacon / keepalive helper
    const postJSONBeacon = (url, payload) => {
      try {
        const body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: "application/json" });
          return navigator.sendBeacon(url, blob);
        }
        return fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
          credentials: "include",
        });
      } catch (e) {
        try {
          return fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
            credentials: "include",
          });
        } catch {}
      }
    };

    // seconds: watched delta; useBeacon: for unload; overridePosition: optional explicit pos
    const sendUpdate = async (
      seconds = 0,
      useBeacon = false,
      overridePosition
    ) => {
      if (!canTrack) return;
      const currentPositionSec =
        overridePosition != null
          ? Math.floor(overridePosition)
          : Math.floor(player.currentTime || 0);
      const payload = {
        courseId,
        chapterId,
        lectureId,
        watchedDuration: Math.max(0, Math.round(seconds)),
        currentPositionSec,
      };
      const url = `${backend_url}/api/user/updatevideotime`;
      if (useBeacon) {
        postJSONBeacon(url, payload);
        return;
      }
      try {
        await axios.post(url, payload, { withCredentials: true });
      } catch (err) {
        console.error("updatevideotime failed", err);
      }
    };

    const finishSession = async (useBeacon = false) => {
      if (tracking.finished || !canTrack) return;
      tracking.finished = true;
      const currentPositionSec = Math.floor(player.currentTime || 0);
      const payload = { courseId, chapterId, lectureId, currentPositionSec };
      const url = `${backend_url}/api/user/finishvideo`;
      if (useBeacon) {
        postJSONBeacon(url, payload);
        return;
      }
      try {
        await axios.post(url, payload, { withCredentials: true });
      } catch (err) {
        console.error("finishvideo failed", err);
      }
    };

    const startTracking = () => {
      if (!canTrack) return;
      sendUpdate(0);
      tracking.finished = false;
      if (tracking.timer) clearInterval(tracking.timer);
      tracking.lastStart = Date.now();

      tracking.timer = setInterval(() => {
        const now = Date.now();
        const deltaSec = (now - tracking.lastStart) / 1000;
        if (deltaSec > 0.5) {
          sendUpdate(deltaSec);
          tracking.lastStart = now;
        }
      }, UPDATE_INTERVAL_MS);
    };

    const stopTracking = async (finalize = false, useBeacon = false) => {
      if (tracking.lastStart) {
        const now = Date.now();
        const deltaSec = (now - tracking.lastStart) / 1000;
        if (deltaSec > 0.5) {
          await sendUpdate(deltaSec, useBeacon);
        }
      }
      if (tracking.timer) {
        clearInterval(tracking.timer);
        tracking.timer = null;
      }
      tracking.lastStart = 0;

      if (finalize) {
        await finishSession(useBeacon);
      }
    };

    // Watermark text
    if (watermarkRef.current) {
      watermarkRef.current.textContent = userId || "User";
    }

    const tryApplySeek = (pos) => {
      if (!pos || !Number.isFinite(pos) || pos <= 0) return false;
      try {
        player.currentTime = pos;
        return true;
      } catch {
        return false;
      }
    };

    // Events
    const onPause = () => {
      if (pauseOverlayRef.current) {
        pauseOverlayRef.current.style.display = "flex";
      }
      stopTracking(false);
    };

    const onPlay = () => {
      if (pauseOverlayRef.current) {
        pauseOverlayRef.current.style.display = "none";
      }
      // Ensure unmuted and audible on first play (user gesture)
      try {
        if (player.muted) player.muted = false;
        // If supported, set a sane volume
        if (typeof player.volume === "number" && player.volume < 0.2) {
          player.volume = 0.7;
        }
      } catch {}

      if (pendingSeekRef.current) {
        try {
          const pos = pendingSeekRef.current;
          player.currentTime = pos;
          pendingSeekRef.current = null;
          resumeAppliedRef.current = true;
          toast.success(
            `Resumed at ${new Date(pos * 1000).toISOString().substring(11, 19)}`
          );
        } catch {}
      }
      startTracking();
    };

    const onEnded = () => {
      stopTracking(true);
    };

    player.on("play", onPlay);
    player.on("pause", onPause);
    player.on("ended", onEnded);

    // Mirror position to localStorage (fallback)
    player.on("timeupdate", () => {
      const now = Date.now();
      if (now - (timeUpdateThrottleRef.current || 0) > 4000) {
        timeUpdateThrottleRef.current = now;
        try {
          const curr = Math.floor(player.currentTime || 0);
          localStorage.setItem(lsKey, String(curr));
        } catch {}
      }
    });

    // Save when user seeks
    player.on("seeked", () => {
      sendUpdate(0);
      try {
        const curr = Math.floor(player.currentTime || 0);
        localStorage.setItem(lsKey, String(curr));
      } catch {}
    });

    // NEW: Show Fix Sound only when muted or volume is 0
    const updateFixSoundVisibility = () => {
      try {
        const muted = player.muted;
        const vol = typeof player.volume === "number" ? player.volume : 1;
        setShowFixSoundButton(Boolean(muted) || vol === 0);
      } catch {
        setShowFixSoundButton(false);
      }
    };

    player.on("volumechange", updateFixSoundVisibility);
    player.on("play", updateFixSoundVisibility);

    // Ready: theme + fetch resume + first update, then show the player
    player.on("ready", async () => {
      const c = player.elements.container;
      if (c) {
        c.style.setProperty("--plyr-color-main", "#ff0000");
        c.style.setProperty(
          "--plyr-video-controls-background",
          "rgba(0,0,0,.65)"
        );
        c.style.setProperty("--plyr-video-control-color", "#ffffff");
        c.style.setProperty(
          "--plyr-video-control-hover-background",
          "rgba(255,255,255,0.06)"
        );
        c.style.setProperty("--plyr-tooltip-background", "#000");
        c.style.setProperty("--plyr-tooltip-color", "#fff");
        // Keep your old layout: move watermark/overlay inside Plyr container
        if (watermarkRef.current && !c.contains(watermarkRef.current))
          c.appendChild(watermarkRef.current);
        if (pauseOverlayRef.current && !c.contains(pauseOverlayRef.current))
          c.appendChild(pauseOverlayRef.current);
        // NEW: Move Fix Sound button into Plyr container so it shows in fullscreen
        if (fixSoundButtonRef.current && !c.contains(fixSoundButtonRef.current))
          c.appendChild(fixSoundButtonRef.current);
      }

      // Make sure unmuted by default (not autoplaying)
      try {
        player.muted = false;
        if (typeof player.volume === "number" && player.volume < 0.2) {
          player.volume = 0.7;
        }
      } catch {}

      // NEW: Set initial visibility of Fix Sound button
      updateFixSoundVisibility();

      let pos = 0;
      try {
        if (backend_url && courseId && chapterId && lectureId) {
          const { data } = await axios.get(
            `${backend_url}/api/user/getlastvideotime`,
            {
              params: { courseId, chapterId, lectureId },
              withCredentials: true,
            }
          );
          pos = Number(data?.positionSec) || 0;
        }
      } catch (e) {
        console.error("getlastvideotime failed", e);
      }
      // Fallback to local storage
      if (!pos) {
        try {
          const localPos = Number(localStorage.getItem(lsKey) || 0);
          if (localPos && Number.isFinite(localPos)) pos = localPos;
        } catch {}
      }

      resumeTargetRef.current = pos;

      if (pos > 0 && Number.isFinite(pos)) {
        const applied = tryApplySeek(pos);
        if (applied) {
          resumeAppliedRef.current = true;
          // Tell the user resume is ready
          toast.success(
            `Ready to resume at ${new Date(pos * 1000)
              .toISOString()
              .substring(11, 19)}`
          );
        } else {
          pendingSeekRef.current = pos; // apply on first play
        }
      }

      // First update to server before showing player (use override position)
      try {
        await sendUpdate(0, false, pos || 0);
      } catch (e) {
        console.warn("Initial update failed", e);
      }

      // Show the player now
      setIsLoading(false);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setLoadingSlow(false);
    });

    // Prevent right-click (only when paused)
    const handleContextMenu = (e) => {
      if (player.paused) e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);

    // Visibility
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopTracking(false);
      } else if (!player.paused) {
        startTracking();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Flush progress on unload/close (mobile-friendly)
    const handleBeforeUnload = () => {
      stopTracking(true, true);
    };
    const handlePageHide = () => {
      stopTracking(true, true);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    // Ensure first user click seeks to resume position before play toggles
    const handleFirstClickCapture = () => {
      if (resumeAppliedRef.current) return;
      const pos = resumeTargetRef.current;
      if (pos > 0 && Number.isFinite(pos)) {
        try {
          player.currentTime = pos;
          resumeAppliedRef.current = true;
        } catch {
          pendingSeekRef.current = pos;
        }
      }
      containerRef.current?.removeEventListener(
        "click",
        handleFirstClickCapture,
        true
      );
    };
    containerRef.current?.addEventListener(
      "click",
      handleFirstClickCapture,
      true
    );

    return () => {
      containerRef.current?.removeEventListener(
        "click",
        handleFirstClickCapture,
        true
      );
      setShowFixSoundButton(false);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      stopTracking(true, true);
      player.destroy();
      playerInstanceRef.current = null;
    };
  }, [videoId, backend_url, courseId, chapterId, lectureId, userId]);

  const handleOverlayClick = () => {
    playerInstanceRef.current?.play();
  };

  return (
    <div
      ref={containerRef}
      className="video-container relative w-full max-w-4xl aspect-video mx-auto bg-black"
    >
      {/* Plyr mount */}
      <div
        ref={playerRef}
        data-plyr-provider="youtube"
        data-plyr-embed-id={videoId}
      />

      {/* Loading overlay until resume fetched + first update sent */}
      {isLoading && (
        <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
          <div
            role="progressbar"
            aria-label="Loading video"
            className="h-8 w-8 rounded-full border-2 border-white/40 border-t-white animate-spin"
          />
          <div className="text-sm font-medium">Connecting to servers…</div>
          {loadingSlow && (
            <div className="text-xs opacity-80">
              If this takes long, please check your internet connection.
            </div>
          )}
        </div>
      )}

      {/* Watermark (old UI) */}
      <div
        ref={watermarkRef}
        className="absolute text-black font-semibold text-sm opacity-60 z-[60] select-none pointer-events-none animate-moveAround drop-shadow"
        style={{ top: "8%", left: "6%" }}
      >
        Loading...
      </div>

      {/* Pause overlay (old behavior: empty overlay, click to play) */}
      {/* Pause overlay */}
      <div
        ref={pauseOverlayRef}
        className="absolute inset-0 z-[55] hidden bg-black/50 text-white text-4xl font-bold flex items-center justify-center cursor-pointer"
        onClick={() => playerRef.current?.plyr?.play()}
      ></div>

      <style>{`
        @keyframes moveAround {
          0%   { top: 8%;  left: 6%;  }
          25%  { top: 28%; left: 72%; }
          50%  { top: 62%; left: 18%; }
          75%  { top: 82%; left: 78%; }
          100% { top: 8%;  left: 42%; }
        }
        .animate-moveAround {
          animation: moveAround 60s linear infinite alternate;
        }

        .video-container .plyr--full-ui {
          --plyr-color-main: #ff0000;
          --plyr-video-controls-background: rgba(0, 0, 0, 0.6);
          --plyr-video-control-color: #ffffff;
          --plyr-video-control-hover-background: rgba(255, 255, 255, 0.06);
          --plyr-tooltip-background: #000000;
          --plyr-tooltip-color: #ffffff;
        }
        .video-container .plyr--full-ui input[type="range"] {
          accent-color: #ff0000;
        }

        /* Mobile: hide volume slider; keep mute icon so users can toggle sound */
        @media (max-width: 768px) {
          .video-container .plyr--full-ui .plyr__controls {
            padding: 8px 10px;
            gap: 8px;
          }
          .video-container .plyr__volume {
            display: none !important;
          }
          .video-container .plyr__progress input[type="range"] {
            height: 24px;
          }
          .video-container .plyr__controls .plyr__progress {
            flex: 1 1 auto;
          }
        }

        /* NEW: Keep Fix Sound visible and on top while in fullscreen */
        .plyr--fullscreen .fix-sound-btn {
          position: fixed !important;
          right: 16px !important;
          bottom: 16px !important;
          z-index: 2147483647 !important;
        }
      `}</style>

      {/* Fix Sound Button (always rendered; visibility toggled) */}
      <button
        ref={fixSoundButtonRef}
        onClick={() => {
          const player = playerInstanceRef.current;
          if (player) {
            try {
              player.muted = false;
              if (typeof player.volume === "number") {
                player.volume = 1; // 100%
              }
              setShowFixSoundButton(false);
              toast.success("Sound restored to 100%!");
            } catch (e) {
              console.error("Failed to fix sound", e);
            }
          }
        }}
        style={{ display: showFixSoundButton ? "block" : "none" }}
        className="fix-sound-btn absolute bottom-4 right-4 z-[80] bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md transition"
        aria-label="Fix sound (unmute and set volume to max)"
      >
        🔈 Fix Sound
      </button>
    </div>
  );
};

export default VideoPlayer;
