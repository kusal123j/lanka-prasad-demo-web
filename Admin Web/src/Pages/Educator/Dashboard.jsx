import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "../../Context/AppContext";
import CourseCard from "../../Components/Student/CourseCard";

// Optional color styles per main category name
const CATEGORY_STYLES = {
  2025: {
    chip: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
    chipActive: "bg-emerald-600 text-white border-emerald-600",
  },
  2026: {
    chip: "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200",
    chipActive: "bg-sky-600 text-white border-sky-600",
  },
  2027: {
    chip: "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200",
    chipActive: "bg-violet-600 text-white border-violet-600",
  },
  default: {
    chip: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    chipActive: "bg-slate-700 text-white border-slate-700",
  },
};

// Helper to normalize IDs to string
const getId = (val) => {
  if (!val) return null;
  if (typeof val === "string" || typeof val === "number") return String(val);
  if (typeof val === "object") return val._id ? String(val._id) : null;
  return null;
};

// Standardize how we read course data (be flexible to schema differences)
const readCourse = (course) => {
  const title = (course?.title || course?.name || "").trim();
  const description = (course?.description || "").trim();

  // Try multiple shapes for main category
  const mainId =
    getId(course?.categoryId) ||
    getId(course?.category) ||
    getId(course?.category?.main) ||
    getId(course?.mainCategoryId) ||
    getId(course?.mainCategory) ||
    getId(course?.yearId) ||
    getId(course?.year) ||
    null;

  const mainName =
    (course?.category?.name ||
      course?.category?.main?.name ||
      course?.mainCategoryName ||
      course?.yearName ||
      course?.year ||
      "") + "";

  // Subcategory possibilities
  const subId =
    getId(course?.subCategoryId) ||
    getId(course?.subCategory) ||
    getId(course?.category?.sub) ||
    null;

  const subName =
    (course?.category?.sub?.name || course?.subCategoryName || "") + "";

  const createdAt = course?.updatedAt || course?.createdAt || null;
  const popularity =
    course?.enrollmentsCount ||
    course?.studentsCount ||
    course?.viewsCount ||
    course?.rating ||
    0;

  return {
    title,
    description,
    mainId: mainId ? String(mainId) : null,
    mainName,
    subId: subId ? String(subId) : null,
    subName,
    createdAt,
    popularity,
  };
};

const Dashboard = () => {
  const {
    allCourses,
    navigate,
    coursesLoading,
    categories = [],
  } = useContext(AppContext);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedMain, setSelectedMain] = useState("all"); // main category _id or "all"
  const [selectedSub, setSelectedSub] = useState("all"); // sub category _id or "all"
  const [sortBy, setSortBy] = useState("recent"); // recent | popular | az

  // Main list normalized
  const mainList = useMemo(
    () =>
      (Array.isArray(categories) ? categories : []).map((m) => ({
        ...m,
        _id: String(m._id),
        subCategories: (m.subCategories || []).map((s) => ({
          ...s,
          _id: String(s._id),
        })),
      })),
    [categories]
  );

  const activeMain =
    selectedMain !== "all"
      ? mainList.find((m) => String(m._id) === String(selectedMain))
      : null;

  const subOptions = activeMain?.subCategories || [];

  // Map subCategoryId -> mainCategoryId (for courses that only store subId)
  const subToMain = useMemo(() => {
    const map = new Map();
    mainList.forEach((m) =>
      (m.subCategories || []).forEach((s) => {
        map.set(String(s._id), String(m._id));
      })
    );
    return map;
  }, [mainList]);

  // Filter + sort courses
  const filteredCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    const selMainId = selectedMain !== "all" ? String(selectedMain) : null;
    const selSubId = selectedSub !== "all" ? String(selectedSub) : null;

    let list = Array.isArray(allCourses) ? [...allCourses] : [];

    list = list.filter((c) => {
      const rc = readCourse(c);

      // Search
      if (term) {
        const hay = `${rc.title} ${rc.description}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }

      // Main category filter
      if (selMainId) {
        const mainMatchById = rc.mainId && String(rc.mainId) === selMainId;
        const mainMatchByName =
          rc.mainName && String(rc.mainName) === String(activeMain?.name);
        const belongsViaSub =
          rc.subId && subToMain.get(String(rc.subId)) === selMainId;

        if (!(mainMatchById || mainMatchByName || belongsViaSub)) return false;
      }

      // Subcategory filter
      if (selSubId) {
        const subMatchId = rc.subId && String(rc.subId) === selSubId;
        const subMatchName =
          subOptions.find((s) => String(s._id) === selSubId)?.name ===
          rc.subName;

        if (!(subMatchId || subMatchName)) return false;
      }

      return true;
    });

    // Sort
    list.sort((a, b) => {
      const ra = readCourse(a);
      const rb = readCourse(b);

      if (sortBy === "recent") {
        const da = ra.createdAt ? new Date(ra.createdAt).getTime() : 0;
        const db = rb.createdAt ? new Date(rb.createdAt).getTime() : 0;
        return db - da;
      }

      if (sortBy === "popular") {
        return (rb.popularity || 0) - (ra.popularity || 0);
      }

      // A → Z
      const ta = (ra.title || "").toLowerCase();
      const tb = (rb.title || "").toLowerCase();
      return ta.localeCompare(tb);
    });

    return list;
  }, [
    allCourses,
    search,
    selectedMain,
    selectedSub,
    sortBy,
    activeMain,
    subOptions,
    subToMain,
  ]);

  const totalCount = allCourses?.length || 0;
  const filteredCount = filteredCourses.length;

  const resetFilters = () => {
    setSearch("");
    setSelectedMain("all");
    setSelectedSub("all");
    setSortBy("recent");
  };

  // Skeleton Loader Component
  const CourseSkeleton = () => (
    <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
      <div className="bg-gray-200 h-32 rounded-lg mb-4"></div>
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="flex items-center justify-between mt-4">
        <div className="h-5 bg-gray-200 rounded w-1/4"></div>
        <div className="h-5 bg-gray-200 rounded w-1/6"></div>
      </div>
    </div>
  );

  // Loading state
  if (coursesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="animate-pulse mb-8">
            <div className="h-8 bg-gray-200 rounded-lg w-48 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>

          {/* Courses Skeleton Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <CourseSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              My Courses
            </h1>
            <p className="text-gray-600">
              Manage and track your educational content
            </p>
          </div>
          <button
            className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            onClick={() => navigate("/educator/add-course")}
          >
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add New Course</span>
            </div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
          {/* Year chips + Count */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap py-1">
              <button
                onClick={() => {
                  setSelectedMain("all");
                  setSelectedSub("all");
                }}
                className={`px-3 py-1.5 rounded-full border text-sm transition ${
                  selectedMain === "all"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
              >
                All years
              </button>

              {mainList.map((m) => {
                const style =
                  CATEGORY_STYLES[m.name] || CATEGORY_STYLES.default;
                const active = String(selectedMain) === String(m._id);
                return (
                  <button
                    key={m._id}
                    onClick={() => {
                      setSelectedMain(String(m._id));
                      setSelectedSub("all");
                    }}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      active ? style.chipActive : style.chip
                    }`}
                    title={m.name}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>

            {/* Result count + Reset */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-900">
                  {filteredCount}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-900">{totalCount}</span>
              </span>
              <button
                onClick={resetFilters}
                className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Controls row */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="col-span-1 lg:col-span-2">
              <div className="relative">
                <svg
                  className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title or description..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                />
              </div>
            </div>

            {/* Subcategory (depends on selected main) */}
            <div>
              <select
                value={selectedSub}
                onChange={(e) => setSelectedSub(e.target.value)}
                disabled={!activeMain || subOptions.length === 0}
                className={`w-full py-2.5 px-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 ${
                  activeMain ? "focus:ring-emerald-200" : "focus:ring-gray-200"
                } disabled:opacity-50`}
              >
                <option value="all">
                  {activeMain ? "All subcategories" : "Select a year first"}
                </option>
                {subOptions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-2.5 px-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="recent">Sort: Recent</option>
                <option value="popular">Sort: Popular</option>
                <option value="az">Sort: A → Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No matching courses
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Try adjusting your filters or search terms.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={resetFilters}
              >
                Reset filters
              </button>
              <button
                className="inline-flex items-center space-x-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-5 rounded-xl transition-all duration-200"
                onClick={() => navigate("/educator/add-course")}
              >
                Create new course
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {filteredCourses.map((course, index) => (
              <CourseCard
                key={course?._id || course?.id || index}
                course={course}
                className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
