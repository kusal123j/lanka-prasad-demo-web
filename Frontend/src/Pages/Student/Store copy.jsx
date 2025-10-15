// src/components/Store.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppContext } from "../../Context/AppContext";

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
  const {
    allCourses = [],
    backend_url,
    userData,
    categories,
  } = useContext(AppContext);

  // Demo: use mainCategory name "2025". Replace with userData.mainCategory when integrating.
  const mainCategoryName = userData.mainCategory;

  const [expandedId, setExpandedId] = useState(null); // which subcategory is expanded

  // Find the main category object by name (e.g., "2025")
  const mainCategory = useMemo(() => {
    if (!categories?.length) return null;
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
      // Keep the first found course for a (subId, month) combo
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

  const toggleExpand = (subId) => {
    setExpandedId((prev) => (prev === subId ? null : subId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-neutral-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold">Courses Store</h1>
          <p className="text-neutral-400 mt-2">
            Showing courses for{" "}
            <span className="text-red-500 font-medium">{mainCategoryName}</span>
          </p>
        </header>

        {!mainCategory && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-6 text-neutral-300">
            No main category found for “{mainCategoryName}”.
          </div>
        )}

        {mainCategory && (
          <>
            {subCategories?.length ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subCategories.map((sub) => {
                    const availableCount = MONTHS.reduce(
                      (acc, m) => acc + (isMonthAvailable(sub._id, m) ? 1 : 0),
                      0
                    );
                    const isOpen = expandedId === sub._id;

                    return (
                      <div
                        key={sub._id}
                        className="rounded-2xl border border-neutral-800 bg-neutral-950 shadow-xl shadow-black/40 overflow-hidden"
                      >
                        <button
                          onClick={() => toggleExpand(sub._id)}
                          className={`w-full text-left p-5 flex items-center justify-between transition-colors
              ${isOpen ? "bg-neutral-900/60" : "hover:bg-neutral-900/60"}`}
                        >
                          <div>
                            <h3 className="text-lg font-semibold tracking-wide">
                              {sub.name}
                            </h3>
                            <p className="text-sm text-neutral-400 mt-1">
                              {availableCount} month
                              {availableCount !== 1 ? "s" : ""} available
                            </p>
                          </div>
                          <div
                            className={`w-9 h-9 flex items-center justify-center rounded-full border
                                       transition-all duration-200
                                       ${
                                         isOpen
                                           ? "border-red-500 bg-red-600"
                                           : "border-neutral-800 bg-neutral-900 group-hover:border-red-500"
                                       }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              className={`w-5 h-5 transition-transform duration-200 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            >
                              <path
                                d="M6 9l6 6 6-6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="px-5 pb-5 pt-2 border-t border-neutral-900 bg-black/60"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {MONTHS.map((month) => {
                                  const available = isMonthAvailable(
                                    sub._id,
                                    month
                                  );
                                  return (
                                    <button
                                      key={month}
                                      disabled={!available}
                                      onClick={() =>
                                        available &&
                                        handleMonthClick(sub._id, month)
                                      }
                                      className={[
                                        "rounded-lg px-3 py-2 text-sm font-medium border transition-all",
                                        "focus:outline-none focus:ring-2 focus:ring-offset-0",
                                        available
                                          ? "bg-red-600 border-red-500 text-white hover:bg-red-500 focus:ring-red-400"
                                          : "bg-neutral-900 border-neutral-800 text-neutral-500 cursor-not-allowed",
                                      ].join(" ")}
                                      aria-label={`${month} ${
                                        available ? "available" : "unavailable"
                                      }`}
                                    >
                                      {month.slice(0, 3)}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-6 text-neutral-300">
                No subcategories found for “{mainCategoryName}”.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Store;
