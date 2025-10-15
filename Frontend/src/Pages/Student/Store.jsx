// src/components/Store.jsx
import React, { useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppContext } from "../../Context/AppContext";
import NICVerificationCard from "../../Components/Student/NICVerificationCard";

// Full month names to match course.month values
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const Store = () => {
  const navigate = useNavigate();
  const { allCourses = [], userData, categories } = useContext(AppContext);

  const mainCategoryName = userData?.mainCategory || "";

  // Modal state (bug-free alternative to accordion toggles)
  const [selectedSub, setSelectedSub] = useState(null);
  const [query, setQuery] = useState("");

  // Find the main category object by name (e.g., "2025")
  const mainCategory = useMemo(() => {
    if (!categories?.length || !mainCategoryName) return null;
    const mc = categories.find(
      (c) =>
        c?.type === "main" &&
        String(c?.name).toLowerCase() === mainCategoryName.toLowerCase()
    );
    return mc || null;
  }, [categories, mainCategoryName]);

  const subCategories = mainCategory?.subCategories || [];

  // Build a fast lookup for courses by "subCategoryId_month"
  const courseMap = useMemo(() => {
    const map = new Map();
    if (!mainCategory?._id || !Array.isArray(allCourses)) return map;
    const mainId = mainCategory._id;

    for (const course of allCourses) {
      if (!course?.isPublished) continue;
      if (course?.mainCategory !== mainId) continue; // ensure it belongs to this main category
      const subId = course?.subCategory;
      const monthKey = String(course?.month || "").toLowerCase();
      if (!subId || !monthKey) continue;

      const key = `${subId}_${monthKey}`;
      if (!map.has(key)) map.set(key, course);
    }
    return map;
  }, [allCourses, mainCategory]);

  const isMonthAvailable = (subId, month) => {
    const key = `${subId}_${month.toLowerCase()}`;
    return courseMap.has(key);
  };

  const handleMonthClick = (subId, month) => {
    const key = `${subId}_${month.toLowerCase()}`;
    const course = courseMap.get(key);
    if (course?._id) {
      navigate(`/student/class/${course._id}`);
    }
  };

  const filteredSubs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subCategories;
    return subCategories.filter((s) =>
      String(s?.name || "")
        .toLowerCase()
        .includes(q)
    );
  }, [subCategories, query]);

  // Modal helpers
  const openSub = (sub) => setSelectedSub(sub);
  const closeSub = () => setSelectedSub(null);

  // Close on ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeSub();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Body scroll lock when modal open
  useEffect(() => {
    if (selectedSub) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedSub]);

  // Icons
  const CheckIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M20 6L9 17l-5-5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  const LockIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="4" y="11" width="16" height="9" rx="2" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  const SearchIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
  const XIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const subCount = subCategories?.length || 0;
  const IsNICVerify = userData?.IsNICVerified === "completed";

  return IsNICVerify ? (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-neutral-900 text-white">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]">
          <div className="h-40 bg-gradient-to-b from-rose-600/10 via-red-500/5 to-transparent blur-2xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-red-400 to-orange-300">
                  Your Classes
                </span>
              </h1>
              <p className="text-neutral-400 mt-2">
                Explore monthly classes for{" "}
                <span className="text-rose-400 font-medium">
                  {mainCategoryName || "—"}
                </span>
              </p>

              {mainCategory && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  {/* Keep only subcategory count. Removed any "months available" counters */}
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-neutral-300">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    {subCount} class{subCount === 1 ? "" : "es"}
                  </span>
                </div>
              )}
            </div>

            {/* Search */}
            {mainCategory && (
              <div className="w-full sm:w-80">
                <label className="block">
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                      <SearchIcon className="w-4 h-4 text-neutral-400" />
                    </div>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search your class..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400/40 transition"
                    />
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {!mainCategory && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 grid place-items-center rounded-xl bg-rose-500/10 ring-1 ring-rose-400/30 text-rose-300">
                !
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  Main category not found
                </h2>
                <p className="text-neutral-400 mt-1">
                  We couldn’t find a main category for “
                  {mainCategoryName || "—"}”. Please check your selection or try
                  again later.
                </p>
              </div>
            </div>
          </div>
        )}

        {mainCategory && (
          <>
            {subCategories?.length ? (
              <>
                {/* Subcategory grid */}
                {filteredSubs?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSubs.map((sub) => (
                      <motion.button
                        key={sub._id}
                        type="button"
                        onClick={() => openSub(sub)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="group relative text-left rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent backdrop-blur-sm overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)] hover:border-rose-400/40 hover:shadow-[0_0_0_1px_rgba(244,63,94,0.25),0_20px_40px_-20px_rgba(244,63,94,0.35)] transition focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                      >
                        <div className="p-5 flex items-start gap-4">
                          <div className="h-12 w-12 select-none grid place-items-center rounded-xl bg-rose-500/10 ring-1 ring-rose-400/30 text-rose-300 font-semibold">
                            {String(sub?.name || "?")
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold tracking-wide">
                              {sub.name}
                            </h3>
                            {/* Removed "1/12 months" and any "X months available" text */}
                            <p className="mt-1 text-sm text-neutral-400">
                              Tap to view months
                            </p>
                          </div>
                          <span className="ml-auto inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs text-neutral-300 group-hover:border-rose-400/40">
                            View
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                    No classes match “{query}”.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 sm:p-8 text-neutral-300">
                No classes found for “{mainCategoryName}”.
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: Months for selected subcategory (mobile-friendly bottom sheet) */}
      <AnimatePresence>
        {selectedSub && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSub}
            />
            {/* Dialog */}
            <motion.div
              key="dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sub-title"
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
            >
              <div
                className="w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 grid place-items-center rounded-lg bg-rose-500/10 ring-1 ring-rose-400/30 text-rose-300 font-semibold">
                      {String(selectedSub?.name || "?")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h2 id="sub-title" className="text-lg font-semibold">
                        {selectedSub?.name}
                      </h2>
                      <p className="text-xs text-neutral-400">
                        Choose a month to open the class
                      </p>
                    </div>
                  </div>
                  <button
                    aria-label="Close"
                    onClick={closeSub}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-neutral-300 hover:border-rose-400/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-5 py-4">
                  {/* Legend */}
                  <div className="mb-4 flex items-center gap-4 text-xs text-neutral-400">
                    <div className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />{" "}
                      Available
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-white/20" />{" "}
                      Locked
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {MONTHS.map((month) => {
                      const available = isMonthAvailable(
                        selectedSub._id,
                        month
                      );
                      return (
                        <button
                          key={month}
                          disabled={!available}
                          onClick={() =>
                            available &&
                            handleMonthClick(selectedSub._id, month)
                          }
                          title={
                            available
                              ? `Open ${selectedSub.name} • ${month}`
                              : `${month} is locked`
                          }
                          className={[
                            "inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium border transition-all",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
                            available
                              ? "bg-gradient-to-r from-rose-600 to-red-500 text-white border-rose-400/30 hover:from-rose-500 hover:to-red-400 shadow-md shadow-rose-900/20"
                              : "bg-white/[0.03] border-white/10 text-neutral-500 cursor-not-allowed",
                          ].join(" ")}
                          aria-label={`${month} ${
                            available ? "available" : "locked"
                          }`}
                        >
                          {available ? (
                            <CheckIcon className="w-4 h-4" />
                          ) : (
                            <LockIcon className="w-4 h-4" />
                          )}
                          {month.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile handle */}
                <div className="sm:hidden h-3 w-16 mx-auto mb-3 rounded-full bg-white/10" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  ) : (
    <NICVerificationCard />
  );
};

export default Store;
