import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Award,
  BarChart3,
  Calendar,
  Settings,
  Download,
  MessageCircle,
  Truck,
  MapPin,
  Package,
  ExternalLink,
  ArrowLeft,
  Copy,
  X,
} from "lucide-react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

import { AppContext } from "../../Context/AppContext";
import toast from "react-hot-toast";

/* =============================
   Tute Tracking Modal (Light Theme)
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
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white text-slate-900 border border-slate-200 shadow-2xl sm:rounded-2xl relative overflow-hidden h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
          <div className="flex items-center gap-3">
            {selected ? (
              <button
                onClick={() => {
                  setSelectedIndex(null);
                  setShowFrame(false);
                  setFrameLoaded(false);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 transition"
                aria-label="Back to all shipments"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h4 className="text-lg font-semibold">
                {selected ? "Shipment details" : "Your Tute Shipments"}
              </h4>
              <p className="text-xs text-slate-500">
                {selected
                  ? "Tracking number: " + trackingNumber
                  : "Click a shipment to track"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition"
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
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                <Truck className="w-6 h-6 text-slate-500" />
              </div>
              <h5 className="text-lg font-semibold">No tracking available</h5>
              <p className="text-slate-500 text-sm mt-1">
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
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition cursor-pointer"
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
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Package className="w-4 h-4 text-indigo-500" />
                        <span>Class</span>
                      </div>
                      <div className="font-medium text-slate-900 truncate">
                        {p?.course?.courseTitle || "Course"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatDate(p?.createdAt)}
                      </div>
                    </div>

                    <div className="sm:w-72">
                      <div className="text-xs text-slate-500">
                        Tracking Number
                      </div>
                      <div className="font-semibold break-all">
                        {p?.trackingNumber}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm">Tute delivered for:</span>
                      <span className="text-sm text-slate-900 font-medium break-all">
                        {p?.address || "Not provided"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm hover:border-indigo-300 transition"
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
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 via-sky-500 to-fuchsia-600 text-white text-sm font-medium hover:opacity-95 transition"
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
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Package className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm">Class</span>
                  </div>
                  <div className="text-slate-900 font-medium">
                    {selected?.course?.courseTitle || "Course"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm">Tute delivered for</span>
                  </div>
                  <div className="text-slate-900 font-medium break-words">
                    {selected?.address || "Not provided"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-600">Tracking Number</div>
                  <div className="text-slate-900 font-semibold mt-0.5 break-all">
                    {trackingNumber || "Not available"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyTracking(trackingNumber)}
                    disabled={!trackingNumber}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:border-indigo-300 transition"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? "Copied!" : "Copy"}
                  </button>

                  <a
                    href="https://slpmail.slpost.gov.lk/track/index.php"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in new tab
                  </a>
                </div>
              </div>

              <button
                onClick={handleTrackNow}
                disabled={!trackingNumber}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-sky-500 to-fuchsia-600 text-white font-semibold tracking-wide hover:opacity-95 disabled:opacity-40 transition"
              >
                <Truck className="w-5 h-5" />
                Track Now
              </button>

              <div className="w-full h-px bg-slate-200" />

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">
                  👉 Scroll down halfway on the page, paste your 📦 Tracking
                  Number in the box, and tap 🔍 “View Your Status”!
                </span>
              </div>

              {showFrame && (
                <div className="relative mt-2 h-[62vh] sm:h-[520px] rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  {!frameLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-3 text-slate-600">
                        <div className="w-5 h-5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                        <span>Loading SLP Mail Tracking...</span>
                      </div>
                    </div>
                  )}
                  <iframe
                    title="SLP Mail Tracker"
                    src="https://slpmail.slpost.gov.lk/track/index.php"
                    className="w-full h-full"
                    onLoad={() => setFrameLoaded(true)}
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}

              {showFrame && (
                <p className="text-xs text-slate-500">
                  Tracking number copied. Paste it in the input on the page.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 hover:border-indigo-300 transition"
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

  const shipments = useMemo(() => {
    if (!Array.isArray(payments)) return [];
    return payments
      .filter((p) => p?.paymentStatus === "completed" && !!p?.trackingNumber)
      .sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      );
  }, [payments]);

  // Replace with your own adverts (images and optional links)
  const adverts = [
    {
      id: 1,
      src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0pHAuLtTux9Z_qwc56dRniCy4GD7fPk5XAw&s",
      title: "Enroll now and save 20%",
      href: "#",
    },
    {
      id: 2,
      src: "https://img.freepik.com/free-psd/e-commerce-facebook-ad-template-design_23-2149586406.jpg",
      title: "New classes are live!",
      href: "#",
    },
    {
      id: 3,
      src: "https://i0.wp.com/www.themediaant.com/blog/wp-content/uploads/2023/01/6-Powerful-E-commerce-Advertising-Strategies.jpeg?w=512&ssl=1",
      title: "Download our mobile app",
      href: "#",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-indigo-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 via-sky-500 to-fuchsia-500 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">
                Welcome back,{" "}
                {userData?.name || (
                  <span className="h-4 w-30 inline-block bg-white/30 rounded animate-pulse"></span>
                )}
                ! 👋
              </h2>
              <p className="text-white/90 mb-6">
                Ready to continue your learning journey today?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-white/80">Student ID</p>
                      <p className="text-2xl font-bold">
                        {userData?.studentId ? (
                          userData.studentId
                        ) : (
                          <span className="inline-block h-6 w-24 bg-white/30 rounded animate-pulse"></span>
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
                      <p className="text-sm text-white/80">Enrolled Courses</p>
                      <p className="text-2xl font-bold">
                        {enrolledCourses ? (
                          enrolledCourses.length
                        ) : (
                          <span className="h-6 w-10 inline-block bg-white/30 rounded animate-pulse"></span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="relative group overflow-hidden rounded-2xl p-4 md:p-5 cursor-pointer
             bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md
             transition focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                  onClick={() => setShowTuteModal(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setShowTuteModal(true)}
                  title="View and track your tute shipments"
                >
                  <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Tute Tracking
                        </p>
                        <h4 className="text-base sm:text-lg font-semibold text-slate-900">
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
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-50 text-slate-600 border-slate-200")
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
                      <p className="text-sm text-white/80">Time</p>
                      <p className="text-2xl font-bold">
                        {time || (
                          <span className="inline-block h-6 w-24 bg-white/30 rounded animate-pulse"></span>
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
            {/* Image Advertisements (Slider) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-slate-900">
                  අනෙකුත් තොරතුරු
                </h3>
              </div>

              <div className="relative">
                <Swiper
                  modules={[Autoplay, Pagination]}
                  slidesPerView={1}
                  loop
                  autoplay={{ delay: 3000, disableOnInteraction: false }}
                  pagination={{ clickable: true }}
                  className="rounded-xl"
                >
                  {adverts.map((ad) => (
                    <SwiperSlide key={ad.id}>
                      <a
                        href={ad.href || "#"}
                        className="block group"
                        target={ad.href ? "_blank" : undefined}
                        rel={ad.href ? "noreferrer" : undefined}
                        aria-label={ad.title}
                      >
                        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200">
                          <img
                            src={ad.src}
                            alt={ad.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                          <div className="absolute left-4 bottom-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium text-slate-800 shadow-sm border border-slate-200">
                            {ad.title}
                          </div>
                        </div>
                      </a>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>

            {/* Warning/Notice */}
            <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 rounded-2xl p-6 border border-rose-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-rose-700">
                  ආරක්ෂක දැන්වීම
                </h3>
              </div>

              <div className="p-4 text-rose-800">
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
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Profile</h3>

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
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-4 p-3 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="text-2xl">{item.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">
                        {item.title}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-6">
                Quick Actions
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300">
                  <Download className="w-6 h-6 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-slate-900">
                    Download APK
                  </span>
                </button>

                <button className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300">
                  <MessageCircle className="w-6 h-6 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-slate-900">
                    Messages
                  </span>
                </button>

                <button className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300">
                  <Calendar className="w-6 h-6 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-slate-900">
                    Calendar
                  </span>
                </button>

                <button className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300">
                  <Settings className="w-6 h-6 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-slate-900">
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
