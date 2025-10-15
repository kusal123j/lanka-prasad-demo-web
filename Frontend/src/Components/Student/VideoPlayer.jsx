import React, { useEffect, useRef } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

const VideoPlayer = ({ videoId, userId }) => {
  const playerRef = useRef(null);
  const watermarkRef = useRef(null);
  const pauseOverlayRef = useRef(null);
  const controlsOverlayRef = useRef(null);

  useEffect(() => {
    const player = new Plyr(playerRef.current, {
      seekTime: 10,
      controls: [
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
      ],
      youtube: {
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
      keyboard: { focused: true, global: true },
    });

    // Watermark text
    if (watermarkRef.current) watermarkRef.current.textContent = userId;

    // Pause overlay toggle
    const onPause = () => {
      if (pauseOverlayRef.current)
        pauseOverlayRef.current.style.display = "flex";
    };
    const onPlay = () => {
      if (pauseOverlayRef.current)
        pauseOverlayRef.current.style.display = "none";
    };
    player.on("pause", onPause);
    player.on("play", onPlay);

    // Theme (red/black/white) via CSS variables
    const applyTheme = () => {
      const c = player.elements.container;
      if (!c) return;
      c.style.setProperty("--plyr-color-main", "#ff0000"); // red
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

      // Put overlays inside the element that goes fullscreen
      if (watermarkRef.current && !c.contains(watermarkRef.current))
        c.appendChild(watermarkRef.current);
      if (pauseOverlayRef.current && !c.contains(pauseOverlayRef.current))
        c.appendChild(pauseOverlayRef.current);
      if (controlsOverlayRef.current && !c.contains(controlsOverlayRef.current))
        c.appendChild(controlsOverlayRef.current);
    };
    player.on("ready", applyTheme);

    // Optional: block right-click only when paused
    const handleContextMenu = (e) => {
      if (player.paused) e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      player.destroy();
    };
  }, [userId]);

  // Skip handlers (also have built-in rewind/fast-forward in the bar)
  const forward10 = () => {
    const plyr = playerRef.current?.plyr;
    if (plyr)
      plyr.currentTime = Math.min(
        plyr.duration ?? Infinity,
        (plyr.currentTime ?? 0) + 10
      );
  };
  const backward10 = () => {
    const plyr = playerRef.current?.plyr;
    if (plyr) plyr.currentTime = Math.max(0, (plyr.currentTime ?? 0) - 10);
  };

  return (
    <div className="video-container relative w-full max-w-4xl aspect-video mx-auto bg-black">
      <div
        ref={playerRef}
        data-plyr-provider="youtube"
        data-plyr-embed-id={videoId}
      />

      {/* Moving watermark */}
      <div
        ref={watermarkRef}
        className="absolute text-white font-black text-2xl opacity-70 z-[60] select-none pointer-events-none animate-moveAround drop-shadow-lg"
      >
        Loading...
      </div>

      {/* Pause overlay (click to resume) */}
      <div
        ref={pauseOverlayRef}
        className="absolute inset-0 z-[55] hidden bg-black/50 text-white text-4xl font-bold flex items-center justify-center cursor-pointer"
        onClick={() => playerRef.current?.plyr?.play()}
      >
        ▶
      </div>

      <style>{`
        /* Watermark animation */
        @keyframes moveAround {
          0%   { top: 8%;  left: 6%;  }
          25%  { top: 28%; left: 72%; }
          50%  { top: 62%; left: 18%; }
          75%  { top: 82%; left: 78%; }
          100% { top: 8%;  left: 42%; }
        }
        .animate-moveAround {
          animation: moveAround 22s linear infinite alternate;
        }

        /* Show big skip buttons on hover (mouse) */
        .custom-skip-controls { opacity: 0; transition: opacity .25s; }
        .video-container:hover .custom-skip-controls,
        .plyr:hover .custom-skip-controls,
        .custom-skip-controls:focus-within {
          opacity: 1;
        }

        /* Ensure Plyr UI uses red accents */
        .video-container .plyr--full-ui {
          --plyr-color-main: #ff0000; /* red */
          --plyr-video-controls-background: rgba(0, 0, 0, 0.6);
          --plyr-video-control-color: #ffffff;
          --plyr-video-control-hover-background: rgba(255, 255, 255, 0.06);
          --plyr-tooltip-background: #000000;
          --plyr-tooltip-color: #ffffff;
        }
        .video-container .plyr--full-ui input[type="range"] {
          accent-color: #ff0000; /* ensure volume/progress slider is red */
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;
