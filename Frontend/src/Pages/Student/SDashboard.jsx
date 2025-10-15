import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  Award,
  Bell,
  Search,
  User,
  Settings,
  PlayCircle,
  FileText,
  BarChart3,
  ChevronRight,
  Star,
  TrendingUp,
  Download,
  MessageCircle,
  X,
  Copy,
  Truck,
  MapPin,
  Package,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import "swiper/css";
import "swiper/css/autoplay";
import GraphWidget from "../../Components/Student/GraphWidget";
import { AppContext } from "../../Context/AppContext";
import toast from "react-hot-toast";

/* =============================
   Tute Tracking Modal (List + Detail)
   ============================= */
const TuteTrackingModal = ({ isOpen, onClose, shipments = [] }) => {
  const [selectedIndex, setSelectedIndex] = useState(null); // null = list view
  const [showFrame, setShowFrame] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = selectedIndex !== null ? shipments[selectedIndex] : null;
  const trackingNumber = selected?.trackingNumber || "";

  useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(null);
      setShowFrame(false);
      setFrameLoaded(false);
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const copyTracking = async (tn) => {
    try {
      if (!tn) return;
      await navigator.clipboard.writeText(tn);
      setCopied(true);
      toast.success("Tracking number copied to clipboard.");
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.warn("Clipboard write failed:", e);
    }
  };

  const handleTrackNow = async () => {
    await copyTracking(trackingNumber);
    setShowFrame(true);
  };

  const formatDate = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return d;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-gradient-to-b from-zinc-950 to-black text-white border border-red-500/30 shadow-2xl sm:rounded-2xl relative overflow-hidden h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 bg-black/50">
          <div className="flex items-center gap-3">
            {selected ? (
              <button
                onClick={() => {
                  setSelectedIndex(null);
                  setShowFrame(false);
                  setFrameLoaded(false);
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition"
                aria-label="Back to all shipments"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-300" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h4 className="text-lg font-semibold">
                {selected ? "Shipment details" : "Your Tute Shipments"}
              </h4>
              <p className="text-xs text-zinc-400">
                {selected
                  ? "Tracking number: " + trackingNumber
                  : "Click a shipment to track"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {/* Empty state */}
          {shipments.length === 0 && !selected && (
            <div className="h-full min-h-[40vh] flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Truck className="w-6 h-6 text-zinc-300" />
              </div>
              <h5 className="text-lg font-semibold">No tracking available</h5>
              <p className="text-zinc-400 text-sm mt-1">
                Your tute shipments with tracking will appear here.
              </p>
            </div>
          )}

          {/* List view */}
          {!selected && shipments.length > 0 && (
            <div className="space-y-3">
              {shipments.map((p, idx) => (
                <div
                  key={p._id || idx}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-rose-500/40 hover:shadow hover:shadow-red-900/20 transition cursor-pointer"
                  onClick={() => {
                    setSelectedIndex(idx);
                    setShowFrame(false);
                    setFrameLoaded(false);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedIndex(idx)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-zinc-300 text-xs">
                        <Package className="w-4 h-4 text-rose-400" />
                        <span>Class</span>
                      </div>
                      <div className="font-medium text-white truncate">
                        {p?.course?.courseTitle || "Course"}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {formatDate(p?.createdAt)}
                      </div>
                    </div>

                    <div className="sm:w-72">
                      <div className="text-xs text-zinc-300">
                        Tracking Number
                      </div>
                      <div className="font-semibold break-all">
                        {p?.trackingNumber}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <MapPin className="w-4 h-4 text-rose-400" />
                      <span className="text-sm">Tute delivered for:</span>
                      <span className="text-sm text-white font-medium break-all">
                        {p?.address || "Not provided"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-2 rounded-lg border border-white/10 bg-black/40 text-white text-sm hover:border-rose-500/40 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyTracking(p?.trackingNumber);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Copy className="w-4 h-4" />
                          {copied ? "Copied!" : "Copy"}
                        </div>
                      </button>

                      <button
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-red-700 via-rose-600 to-red-700 text-white text-sm font-medium hover:opacity-95 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(idx);
                          setShowFrame(false);
                          setFrameLoaded(false);
                        }}
                      >
                        View & Track
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Detail view */}
          {selected && (
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-zinc-300 mb-1">
                    <Package className="w-4 h-4 text-rose-400" />
                    <span className="text-sm">Class</span>
                  </div>
                  <div className="text-white font-medium">
                    {selected?.course?.courseTitle || "Course"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-zinc-300 mb-1">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    <span className="text-sm">Tute delivered for</span>
                  </div>
                  <div className="text-white font-medium break-words">
                    {selected?.address || "Not provided"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-zinc-300">Tracking Number</div>
                  <div className="text-white font-semibold mt-0.5 break-all">
                    {trackingNumber || "Not available"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyTracking(trackingNumber)}
                    disabled={!trackingNumber}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-black/40 text-white disabled:opacity-40 hover:border-rose-500/40 hover:shadow hover:shadow-red-900/20 transition"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? "Copied!" : "Copy"}
                  </button>

                  <a
                    href="https://www.promptxpress.lk/TrackItem.aspx#"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-black/40 text-white hover:border-rose-500/40 hover:shadow hover:shadow-red-900/20 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in new tab
                  </a>
                </div>
              </div>

              <button
                onClick={handleTrackNow}
                disabled={!trackingNumber}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-red-700 via-rose-600 to-red-700 text-white font-semibold tracking-wide hover:opacity-95 disabled:opacity-40 transition"
              >
                <Truck className="w-5 h-5" />
                Track Now
              </button>

              <div className="w-full h-px bg-white/10" />

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-300">
                  👉 Scroll down halfway on the page, paste your 📦 Tracking
                  Number in the box, and tap 🔍 “View Your Status”!
                </span>
              </div>

              {showFrame && (
                <div className="relative mt-2 h-[62vh] sm:h-[520px] rounded-xl overflow-hidden border border-white/10 bg-black/60">
                  {!frameLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-3 text-zinc-300">
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-500 border-top-transparent animate-spin" />
                        <span>Loading Prompt Xpress…</span>
                      </div>
                    </div>
                  )}
                  <iframe
                    title="Prompt Xpress Tracker"
                    src="https://www.promptxpress.lk/TrackItem.aspx#"
                    className="w-full h-full"
                    onLoad={() => setFrameLoaded(true)}
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}

              {showFrame && (
                <p className="text-xs text-zinc-400">
                  Tracking number copied. Paste it in the input on the page.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-white/10 bg-black/40 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:border-rose-500/40 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const SDashboard = () => {
  const { userData, enrolledCourses, payments } = useContext(AppContext);
  const [time, setTime] = useState("");
  const [showTuteModal, setShowTuteModal] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setTime(formattedTime);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // All shipments with a real trackingNumber
  const shipments = useMemo(() => {
    if (!Array.isArray(payments)) return [];
    return payments
      .filter((p) => p?.paymentStatus === "completed" && !!p?.trackingNumber)
      .sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      );
  }, [payments]);

  const achievements = [
    { id: 1, title: "Name", description: userData?.name, icon: "🙍" },
    {
      id: 2,
      title: "Phone Number",
      description: userData?.phonenumber,
      icon: "📞",
    },
    {
      id: 3,
      title: "Exam Year",
      description: userData?.mainCategory,
      icon: "📅",
    },
    {
      id: 4,
      title: "NIC",
      description: userData?.NIC,
      icon: "🪪",
    },
    {
      id: 5,
      title: "Address",
      description: userData?.address || "Not Provided",
      icon: "🏠",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-neutral-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-red-700 via-rose-600 to-red-800 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">
                Welcome back,{" "}
                {userData?.name || (
                  <span className="h-4 w-30 inline-block bg-white/20 rounded animate-pulse"></span>
                )}
                ! 👋
              </h2>
              <p className="text-white/80 mb-6">
                Ready to continue your learning journey today?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">Student ID</p>
                      <p className="text-2xl font-bold">
                        {userData?.studentId ? (
                          userData.studentId
                        ) : (
                          <span className="inline-block h-6 w-24 bg-white/20 rounded animate-pulse"></span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">Enrolled Courses</p>
                      <p className="text-2xl font-bold">
                        {enrolledCourses ? (
                          enrolledCourses.length
                        ) : (
                          <span className="h-6 w-10 inline-block bg-white/20 rounded animate-pulse"></span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="relative group overflow-hidden rounded-2xl p-4 md:p-5 cursor-pointer
             bg-gradient-to-br from-zinc-950 via-zinc-900 to-black
             border border-white/10 hover:border-rose-500/40
             hover:shadow-lg hover:shadow-red-900/20
             transition focus:outline-none focus:ring-2 focus:ring-rose-500"
                  onClick={() => setShowTuteModal(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setShowTuteModal(true)}
                  title="View and track your tute shipments"
                >
                  {/* subtle glow accent */}
                  <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-rose-600/10 blur-2xl group-hover:bg-rose-600/20 transition" />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-zinc-400">
                          Tute Tracking
                        </p>
                        <h4 className="text-base sm:text-lg font-semibold text-white">
                          View & Track
                        </h4>
                      </div>
                    </div>

                    {/* Count pill */}
                    {(() => {
                      const list = Array.isArray(payments)
                        ? payments.filter(
                            (p) =>
                              p?.paymentStatus === "completed" &&
                              !!p?.trackingNumber
                          )
                        : [];
                      const count = list.length;
                      return (
                        <span
                          className={
                            "shrink-0 px-3 py-1 rounded-full text-xs font-medium border " +
                            (count > 0
                              ? "bg-rose-600/15 text-rose-200 border-rose-500/30"
                              : "bg-white/5 text-zinc-300 border-white/10")
                          }
                        >
                          {count > 0 ? `${count} active` : "No tracking"}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">Time</p>
                      <p className="text-2xl font-bold">
                        {time || (
                          <span className="inline-block h-6 w-24 bg-white/20 rounded animate-pulse"></span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8 min-w-0">
            {/* Current Courses */}
            <GraphWidget className="w-full" />
            {/* Warning/Notice */}
            <div className="bg-gradient-to-br from-red-900/40 via-red-950/50 to-black/40 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-red-300">
                  ආරක්ෂක දැන්වීම
                </h3>
              </div>

              <div className="p-4 text-red-200">
                අපගේ වෙබ් අඩවිය ඔබේ IP ලිපිනය සහ අනෙකුත් තොරතුරු ස්වයංක්‍රීයව
                සටහන් කරයි. ඔබ විසින් වීඩියෝ, ලේඛන හෝ කිසිදු අන්තර්ගතයක් නීති
                විරෝධීව බෙදා හරින්නේ නම්, අපට ඒවා හඹාහැරී සොයා ගැනීම සහ නීතිමය
                ක්‍රියාමාර්ග ගැනීම සම්පුර්ණ අයිතියක් ඇත. අනවසර බෙදාහැරීම් සඳහා
                ශ්‍රී ලංකාවේ නීතිය යටතේ ඔබට එරෙහිව අධිකරණ ක්‍රියාමාර්ග ගත හැක.
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Profile */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6">Profile</h3>

              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    title: "Name",
                    description: userData?.name,
                    icon: "🙍",
                  },
                  {
                    id: 2,
                    title: "Phone Number",
                    description: userData?.phonenumber,
                    icon: "📞",
                  },
                  {
                    id: 3,
                    title: "Exam Year",
                    description: userData?.mainCategory,
                    icon: "📅",
                  },
                  {
                    id: 4,
                    title: "NIC",
                    description: userData?.NIC,
                    icon: "🪪",
                  },
                  {
                    id: 5,
                    title: "Address",
                    description: userData?.address || "Not Provided",
                    icon: "🏠",
                  },
                ].map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center space-x-4 p-3 bg-white/5 rounded-xl border border-white/10"
                  >
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">
                        {achievement.title}
                      </h4>
                      <p className="text-sm text-zinc-300">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6">
                Quick Actions
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/10 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-900/20 transition-all duration-300">
                  <Download className="w-6 h-6 text-red-400 mb-2" />
                  <span className="text-sm font-medium text-white">
                    Download APK
                  </span>
                </button>

                <button className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/10 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-900/20 transition-all duration-300">
                  <MessageCircle className="w-6 h-6 text-red-400 mb-2" />
                  <span className="text-sm font-medium text-white">
                    Messages
                  </span>
                </button>

                <button className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/10 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-900/20 transition-all duration-300">
                  <Calendar className="w-6 h-6 text-red-400 mb-2" />
                  <span className="text-sm font-medium text-white">
                    Calendar
                  </span>
                </button>

                <button className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/10 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-900/20 transition-all duration-300">
                  <Settings className="w-6 h-6 text-red-400 mb-2" />
                  <span className="text-sm font-medium text-white">
                    Settings
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Mount */}
      <TuteTrackingModal
        isOpen={showTuteModal}
        onClose={() => setShowTuteModal(false)}
        shipments={shipments}
      />
    </div>
  );
};

export default SDashboard;
