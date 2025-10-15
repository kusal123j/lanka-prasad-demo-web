// NICVerificationPage.jsx
import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Shield,
  Hourglass,
  AlertTriangle,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  Lock,
  Info,
  CheckCircle2,
  X,
  RefreshCw,
} from "lucide-react";

import { AppContext } from "../../Context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ["image/png", "image/jpeg"];

// Status enum (only these two)
const STATUS = {
  PENDING: "pending",
  FAILED: "failed",
};

// Black + Red theme tokens
const ACCENT_GRADIENT = "from-red-600 via-red-500 to-red-400";
const ACCENT_TEXT = "text-red-400";
const CARD_BG = "bg-neutral-900/60";
const CARD_BORDER = "border border-neutral-800";

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={["animate-pulse rounded-md bg-neutral-800/50", className].join(
        " "
      )}
    />
  );
}

function ImageWithSkeleton({ src, alt, imgClass = "" }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div className="relative h-full w-full">
      {!loaded && (
        <div className="absolute inset-0">
          <div className="h-full w-full animate-pulse rounded-lg bg-neutral-900">
            <div className="h-full w-full bg-gradient-to-br from-neutral-800/60 via-neutral-800/30 to-neutral-900/60" />
          </div>
        </div>
      )}
      {src ? (
        <img
          src={src}
          alt={alt}
          className={[
            "h-full w-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            imgClass,
          ].join(" ")}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      ) : null}
    </div>
  );
}

export default function NICVerificationPage() {
  const [status, setStatus] = useState(STATUS.PENDING); // backend truth
  const [selectedTab, setSelectedTab] = useState(STATUS.PENDING); // UI view
  const [loading, setLoading] = useState(true);

  const { userData, backend_url } = useContext(AppContext);

  // Existing server image (preview for pending)
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  // Failed state controls (local upload)
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Drag state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Refresh state + fetch error state
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Prevent race conditions on overlapping fetches
  const requestIdRef = useRef(0);

  const addCacheBuster = (url) => {
    if (!url) return null;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}_=${Date.now()}`;
    // NOTE: It's a client-side cache buster; server may add cache headers as well.
  };

  const getTheVerifyInfo = useCallback(
    async ({ bustCache = false, showGlobalLoader = false } = {}) => {
      axios.defaults.withCredentials = true;
      const currentRequestId = ++requestIdRef.current;
      if (showGlobalLoader) setLoading(true);
      setFetchError(null);

      try {
        const { data } = await axios.get(`${backend_url}/api/user/nic-info`, {
          withCredentials: true,
        });
        console.log(data);

        // Ignore stale responses
        if (currentRequestId !== requestIdRef.current) return;

        if (data?.success) {
          const rawUrl = data.NICImage || null;
          const finalUrl = bustCache ? addCacheBuster(rawUrl) : rawUrl;
          setExistingImageUrl(finalUrl);

          // Only two supported statuses
          let incomingStatus = STATUS.FAILED; // default to failed if unknown
          if (data.status === STATUS.PENDING) {
            incomingStatus = STATUS.PENDING;
          } else if (data.status === STATUS.FAILED) {
            incomingStatus = STATUS.FAILED;
          }

          setStatus(incomingStatus);
          setSelectedTab(incomingStatus);
          // Do NOT clear user's current selection automatically when status is failed.
          // They might already be preparing a re-upload.
        } else {
          const msg = data?.message || "Failed to fetch NIC info.";
          setFetchError(msg);
          toast.error(msg);
          setStatus(STATUS.FAILED);
          setSelectedTab(STATUS.FAILED);
          setExistingImageUrl(null);
        }
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) return;
        const msg =
          err?.response?.data?.message || err.message || "Request failed.";
        setFetchError(msg);
        toast.error(`Request failed: ${msg}`);
        setStatus(STATUS.FAILED);
        setSelectedTab(STATUS.FAILED);
        setExistingImageUrl(null);
      } finally {
        if (currentRequestId === requestIdRef.current && showGlobalLoader) {
          setLoading(false);
        }
      }
    },
    [backend_url]
  );

  // Initial fetch with cache-buster
  useEffect(() => {
    getTheVerifyInfo({ bustCache: true, showGlobalLoader: true });
  }, [getTheVerifyInfo]);

  // Auto-refresh on focus/visibility
  useEffect(() => {
    const onFocus = () => getTheVerifyInfo({ bustCache: true });
    const onVis = () => {
      if (!document.hidden) getTheVerifyInfo({ bustCache: true });
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [getTheVerifyInfo]);

  // Poll while under review (pending)
  useEffect(() => {
    if (status !== STATUS.PENDING) return;
    const id = setInterval(() => {
      getTheVerifyInfo({ bustCache: true });
    }, 20000);
    return () => clearInterval(id);
  }, [status, getTheVerifyInfo]);

  // Revoke blob when preview changes/unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (existingImageUrl && existingImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(existingImageUrl);
      }
    };
  }, [existingImageUrl]);

  const validateFile = (file) => {
    const okType = ALLOWED_MIME.includes(file.type);
    const okExt = /\.(png|jpe?g)$/i.test(file.name || "");
    if (!(okType && okExt)) {
      toast.error("Only .png or .jpg images are allowed.");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Max file size is 5MB.");
      return false;
    }
    return true;
  };

  const onFileSelect = (file) => {
    if (!file) return;
    if (!validateFile(file)) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const onInputChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    onFileSelect(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (submitting) return; // block interaction while submitting
    setDragActive(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    onFileSelect(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (submitting) return;
    setDragActive(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const clearSelected = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (previewUrl && previewUrl.startsWith("blob:"))
      URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("Please upload your NIC image.");
      return;
    }

    try {
      setSubmitting(true);
      setUploadProgress(0);

      // Upload to your backend
      const formData = new FormData();
      formData.append("nicImage", selectedFile);

      await axios.post(`${backend_url}/api/user/nic-upload`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!evt?.total) return;
          const pct = Math.round((evt.loaded * 100) / evt.total);
          setUploadProgress(pct);
        },
      });

      // Move to pending on success, clear local selection
      setStatus(STATUS.PENDING);
      setSelectedTab(STATUS.PENDING);
      clearSelected();

      toast.success("Submitted! We’ll review your NIC shortly.");

      // Re-fetch latest info and server image URL (cache-busted)
      await getTheVerifyInfo({ bustCache: true });
    } catch (e) {
      const msg = e?.response?.data?.message || "Upload failed. Try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const Step = ({ label, icon: Icon, active, done }) => {
    return (
      <div className="flex items-center gap-3">
        <div
          className={[
            "flex items-center justify-center rounded-full border text-xs",
            "h-6 w-6 sm:h-7 sm:w-7", // responsive sizing for small screens
            done
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : active
              ? "border-red-500/60 bg-red-500/10 text-red-300"
              : "border-neutral-700 bg-neutral-800/40 text-neutral-400",
          ].join(" ")}
        >
          {done ? (
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : (
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
        </div>
        <span
          className={[
            "text-[11px] sm:text-xs",
            active ? "text-neutral-200" : "text-neutral-400",
          ].join(" ")}
        >
          {label}
        </span>
      </div>
    );
  };

  const isPendingStatus = status === STATUS.PENDING; // backend truth
  const isPendingView = selectedTab === STATUS.PENDING; // user view tab
  const hasPreview = Boolean(previewUrl);
  const hasExisting = Boolean(existingImageUrl);

  return (
    <div className="min-h-screen text-neutral-100 bg-neutral-950 relative overflow-x-hidden">
      {/* Subtle red background glow */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div
          className={`absolute -top-40 left-1/2 -translate-x-1/2 h-[440px] w-[840px] rounded-full blur-3xl bg-gradient-to-r ${ACCENT_GRADIENT} opacity-20`}
        />
      </div>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        {/* Page heading + stepper */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">
              Verify your identity
            </h1>
            <p className="text-sm text-neutral-400">
              Upload your NIC to access classes and features.
            </p>
          </div>

          {/* Stepper or skeleton while loading + Refresh */}
          {loading ? (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-[2px] w-8 hidden sm:block" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-[2px] w-8 hidden sm:block" />
              <Skeleton className="h-7 w-7 rounded-full" />

              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-neutral-900/80 px-3 py-1.5 text-sm border border-neutral-800 opacity-60 w-full sm:w-auto mt-2 sm:mt-0"
              >
                <RefreshCw className="h-4 w-4 text-red-300" />
                Refresh
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <Step
                label="Upload"
                icon={ImageIcon}
                active={!isPendingStatus}
                done={isPendingStatus && hasExisting}
              />
              <div className="h-px w-8 bg-neutral-700 hidden sm:block" />
              <Step
                label="Review"
                icon={Hourglass}
                active={isPendingStatus}
                done={false}
              />
              <div className="h-px w-8 bg-neutral-700 hidden sm:block" />
              <Step label="Unlock" icon={Shield} active={false} done={false} />

              <button
                type="button"
                onClick={async () => {
                  setRefreshing(true);
                  await getTheVerifyInfo({ bustCache: true });
                  setRefreshing(false);
                }}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-neutral-900/80 px-3 py-1.5 text-sm border border-neutral-800 hover:bg-neutral-800/80 disabled:opacity-60 w-full sm:w-auto mt-2 sm:mt-0"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-red-300" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-red-300" />
                )}
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Status or error banner */}
        {loading ? (
          <div className="mt-4">
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : fetchError ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-600/50 bg-red-950/30 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <p className="text-sm">
              {fetchError}
              <span className="text-neutral-400"> • Try refresh.</span>
            </p>
          </div>
        ) : isPendingStatus ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <Hourglass className="h-5 w-5 text-red-300" />
            <p className="text-sm">
              Under review. Thanks for your patience.{" "}
              <span className="text-neutral-400">
                Classes unlock after verification.
              </span>
            </p>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-600/50 bg-red-950/30 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <p className="text-sm">
              Verification failed. Re-upload a clear NIC image.{" "}
              <span className="text-neutral-400">
                We review within 48 hours.
              </span>
            </p>
          </div>
        )}

        {/* Content area */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Image/Upload */}
          <section className="lg:col-span-7">
            {/* Loading skeleton for the left card */}
            {loading ? (
              <div
                className={`rounded-xl ${CARD_BORDER} ${CARD_BG} overflow-hidden`}
              >
                <div className="border-b border-neutral-800 px-4 py-3">
                  <Skeleton className="h-5 w-48" />
                </div>
                <div className="p-4">
                  <div className="aspect-[16/10] w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
                    <Skeleton className="h-full w-full rounded-lg" />
                  </div>
                </div>
              </div>
            ) : isPendingView ? (
              <div
                className={`rounded-xl ${CARD_BORDER} ${CARD_BG} overflow-hidden`}
              >
                <div className="border-b border-neutral-800 px-4 py-3 text-sm text-neutral-300 flex items-center gap-2">
                  <ImageIcon className={`h-4 w-4 ${ACCENT_TEXT}`} />
                  NIC image (pending preview)
                </div>
                <div className="p-4">
                  <div className="aspect-[16/10] w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 relative">
                    {hasExisting ? (
                      <>
                        <ImageWithSkeleton
                          src={existingImageUrl}
                          alt="NIC under review"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-neutral-950/70 to-transparent p-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs text-neutral-300">
                            Last submitted • Preview only
                          </div>
                          <div className="flex items-center flex-wrap gap-2">
                            <div className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900/80 px-2 py-1.5 text-[11px] text-neutral-300 border border-neutral-800">
                              <Hourglass className="h-3.5 w-3.5 text-red-300" />
                              24–48h
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                setRefreshing(true);
                                await getTheVerifyInfo({ bustCache: true });
                                setRefreshing(false);
                              }}
                              disabled={refreshing}
                              className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900/80 px-2 py-1.5 text-[11px] text-neutral-300 border border-neutral-800 hover:bg-neutral-800/80 disabled:opacity-60"
                            >
                              {refreshing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-300" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5 text-red-300" />
                              )}
                              Refresh
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center gap-2">
                        <ImageIcon className="h-8 w-8 text-neutral-600" />
                        <p className="text-xs text-neutral-500">
                          No NIC uploaded yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-xl ${CARD_BORDER} ${CARD_BG} overflow-hidden`}
              >
                <div className="border-b border-neutral-800 px-4 py-3 text-sm text-neutral-300 flex items-center gap-2">
                  <UploadCloud className={`h-4 w-4 ${ACCENT_TEXT}`} />
                  Upload new NIC image
                </div>

                <div className="p-4 space-y-4">
                  {/* Drop zone */}
                  <div
                    className={[
                      "relative rounded-xl p-[1px] transition",
                      dragActive || hasPreview
                        ? "bg-gradient-to-r from-red-600/40 via-red-500/40 to-red-400/40"
                        : "bg-gradient-to-r from-neutral-700/40 to-neutral-800/40",
                    ].join(" ")}
                  >
                    <div
                      onDragEnter={onDragEnter}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      className={[
                        "group flex flex-col items-center justify-center gap-3 rounded-[11px] border-2 border-dashed px-4 py-10 cursor-pointer select-none",
                        dragActive
                          ? "border-red-400/70 bg-neutral-950/50"
                          : "border-neutral-700 bg-neutral-950/50 hover:border-red-400/50",
                        submitting ? "pointer-events-none opacity-70" : "",
                      ].join(" ")}
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (submitting) return;
                        if (e.key === "Enter" || e.key === " ")
                          fileInputRef.current?.click();
                      }}
                      aria-label="Upload NIC image by browsing or drag and drop"
                      aria-busy={submitting}
                    >
                      <input
                        ref={fileInputRef}
                        id="nic-upload"
                        type="file"
                        accept="image/png,image/jpeg"
                        className="sr-only"
                        onChange={onInputChange}
                        disabled={submitting}
                      />
                      <div className="h-12 w-12 rounded-lg bg-red-600/15 border border-red-500/40 flex items-center justify-center shadow-inner">
                        <UploadCloud className="h-6 w-6 text-red-300" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm text-neutral-200">
                          Drag & drop or{" "}
                          <span className="underline decoration-red-400 text-red-300 group-hover:text-red-200">
                            browse
                          </span>
                        </p>
                        <p className="text-xs text-neutral-400">
                          PNG/JPG • Max 5MB
                        </p>
                      </div>

                      {hasPreview ? (
                        <div className="w-full max-w-xl">
                          <div className="mt-4 aspect-[16/10] overflow-hidden rounded-lg border border-neutral-800 bg-black relative">
                            <img
                              src={previewUrl}
                              alt="Selected NIC"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex flex-wrap items-start justify-between gap-2">
                              <div className="text-[11px] text-neutral-300 flex flex-col">
                                <span className="truncate max-w-[55vw] sm:max-w-[240px]">
                                  {selectedFile?.name}
                                </span>
                                <span className="text-neutral-400">
                                  {formatBytes(selectedFile?.size || 0)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    // reset the input to ensure same-file re-selection triggers change
                                    if (fileInputRef.current) {
                                      fileInputRef.current.value = "";
                                    }
                                    fileInputRef.current?.click();
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900/80 px-2.5 py-1.5 text-[11px] border border-neutral-800 hover:bg-neutral-800/80"
                                  disabled={submitting}
                                >
                                  <RefreshCw className="h-3.5 w-3.5 text-red-300" />
                                  Replace
                                </button>
                                <button
                                  type="button"
                                  onClick={clearSelected}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900/80 px-2.5 py-1.5 text-[11px] border border-neutral-800 hover:bg-neutral-800/80"
                                  disabled={submitting}
                                >
                                  <X className="h-3.5 w-3.5 text-red-300" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* NIC number */}
                  <div className="space-y-2">
                    <label
                      htmlFor="nic-number"
                      className="text-sm text-neutral-300"
                    >
                      NIC Number
                    </label>
                    <input
                      id="nic-number"
                      type="text"
                      value={userData?.NIC || ""}
                      disabled
                      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder-neutral-500 outline-none focus:ring-2 focus:ring-red-500/80"
                    />
                    <p className="text-red-500 text-sm">
                      {`Make sure the NIC number in the image matches your NIC number: ${
                        userData?.NIC || "—"
                      }.`}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={clearSelected}
                      className="text-sm text-neutral-300 hover:text-white hover:underline underline-offset-4"
                      disabled={submitting}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleSubmit}
                      className={[
                        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white",
                        "focus:outline-none focus:ring-2 focus:ring-red-500/80",
                        "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 active:from-red-700 active:to-red-600",
                        "w-full sm:w-auto", // full width on mobile
                        submitting ? "opacity-70 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {uploadProgress > 0
                            ? `Submitting ${uploadProgress}%`
                            : "Submitting"}
                        </>
                      ) : (
                        <>Submit</>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-neutral-500">
                    No GIFs, videos, or documents.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Right: Notes */}
          <aside className="lg:col-span-5 space-y-3">
            <div
              className={`flex items-start gap-2 rounded-lg ${CARD_BORDER} ${CARD_BG} p-3`}
            >
              <Lock className={`h-4 w-4 ${ACCENT_TEXT} mt-0.5`} />
              <p className="text-sm">
                Your data is encrypted by KJ Developers. We never share your
                files.
              </p>
            </div>
            <div
              className={`flex items-start gap-2 rounded-lg ${CARD_BORDER} ${CARD_BG} p-3`}
            >
              <Info className={`h-4 w-4 ${ACCENT_TEXT} mt-0.5`} />
              <div className="text-sm">
                <p>Classes unlock after verification.</p>
                <ul className="mt-2 list-disc pl-5 text-[13px] text-neutral-400 space-y-1">
                  <li>Use a well-lit photo. Avoid glare and shadows.</li>
                  <li>All corners of the NIC should be visible.</li>
                  <li>PNG or JPG only, up to 5MB.</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
