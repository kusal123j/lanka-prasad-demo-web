// src/components/Store.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useContext,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../../Context/AppContext";

const MAIN_CATEGORIES = [
  {
    name: "Grade 6",
    image:
      "https://www.the74million.org/wp-content/uploads/2024/12/relevant-absenteeism-pandemic.jpg",
    gradient: "from-sky-100 to-blue-50",
  },
  {
    name: "Grade 7",
    image:
      "https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=1400&auto=format&fit=crop",
    gradient: "from-emerald-100 to-teal-50",
  },
  {
    name: "Grade 8",
    image:
      "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=1400&auto=format&fit=crop",
    gradient: "from-fuchsia-100 to-pink-50",
  },
  {
    name: "Grade 9",
    image:
      "https://www.nasca.edu.in/learning-centre/wp-content/uploads/2019/10/students-future-740x493.jpg",
    gradient: "from-orange-100 to-rose-50",
  },
  {
    name: "Grade 10",
    image:
      "https://ideas.time.com/wp-content/uploads/sites/5/2013/03/college.jpg?w=720&h=480&crop=1",
    gradient: "from-violet-100 to-indigo-50",
  },
  {
    name: "Grade 11",
    image:
      "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1400&auto=format&fit=crop",
    gradient: "from-amber-100 to-yellow-50",
  },
];

// Full month names (UI order)
const UI_MONTHS = [
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

// Normalize possible month formats from backend ("jan", "JAN", "Sept", etc.)
const normalizeMonth = (m) => {
  if (!m || typeof m !== "string") return "";
  const s = m.trim().toLowerCase();
  const map = {
    jan: "january",
    january: "january",
    feb: "february",
    february: "february",
    mar: "march",
    march: "march",
    apr: "april",
    april: "april",
    may: "may",
    jun: "june",
    june: "june",
    jul: "july",
    july: "july",
    aug: "august",
    august: "august",
    sep: "september",
    sept: "september",
    september: "september",
    oct: "october",
    october: "october",
    nov: "november",
    november: "november",
    dec: "december",
    december: "december",
  };
  return map[s] || s;
};

// Try to get a human label for a sub-category from a course
const inferSubLabel = (course) => {
  const name =
    course?.subCategory?.name ||
    course?.subCategoryName ||
    (course?.title ? course.title.split(/[-•|–—>/]/)[0]?.trim() : "");

  if (name && name.length) return name;
  const id =
    (typeof course?.subCategory === "object"
      ? course?.subCategory?._id
      : course?.subCategory) || "";
  return id ? `Class ${String(id).slice(0, 4)}…` : "Class";
};

const Store = () => {
  const navigate = useNavigate();
  const { backend_url } = useContext(AppContext);
  // UI state
  const [selectedMain, setSelectedMain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");

  // Cache: { [mainName]: Course[] }
  const [coursesByMain, setCoursesByMain] = useState({});

  // Click a main category (Grade)
  const handleSelectMain = async (mainName) => {
    setSelectedMain(mainName);
    setFetchError("");
    // If cached, no fetch
    if (coursesByMain[mainName]?.length) return;

    // Load with skeleton
    setLoading(true);
    try {
      const { data } = await axios.post(
        backend_url + "/api/course/get-courses-by-maincategory",
        {
          mainCategory: mainName,
        }
      );
      console.log(data);

      if (data?.success) {
        const list = Array.isArray(data?.courses) ? data.courses : [];
        setCoursesByMain((prev) => ({ ...prev, [mainName]: list }));
      } else {
        setFetchError(data?.message || "Failed to fetch courses.");
      }
    } catch (err) {
      setFetchError(
        err?.response?.data?.message ||
          err?.message ||
          "Something went wrong loading courses."
      );
    } finally {
      setLoading(false);
    }
  };

  const goBackToMain = () => {
    setSelectedMain(null);
    setSearch("");
    setFetchError("");
  };

  // Build sub-category groups from courses
  const subGroups = useMemo(() => {
    const courses = selectedMain ? coursesByMain[selectedMain] || [] : [];
    const map = new Map(); // subId -> { id, name, monthMap: Map(lowerMonth -> course) }

    for (const c of courses) {
      const subId =
        typeof c?.subCategory === "object"
          ? c?.subCategory?._id
          : c?.subCategory;
      if (!subId) continue;

      const lowerMonth = normalizeMonth(c?.month);
      if (!lowerMonth) continue;

      if (!map.has(subId)) {
        map.set(subId, {
          id: subId,
          name: inferSubLabel(c),
          monthMap: new Map(),
        });
      }
      map.get(subId).monthMap.set(lowerMonth, c);
    }

    let groups = Array.from(map.values());
    // Optional: sort by name
    groups.sort((a, b) => a.name.localeCompare(b.name));

    // Filter by search
    const q = search.trim().toLowerCase();
    if (q) groups = groups.filter((g) => g.name.toLowerCase().includes(q));

    return groups;
  }, [selectedMain, coursesByMain, search]);

  const openCourse = useCallback(
    (course) => {
      if (!course?._id) return;
      navigate(`/student/class/${course._id}`);
    },
    [navigate]
  );

  // Skeleton card
  const SkeletonCard = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-1/2 bg-slate-200 rounded" />
        <div className="h-3 w-1/3 bg-slate-200 rounded" />
        <div className="grid grid-cols-3 gap-2 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );

  // UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-800">
      {/* Top header */}
      <header className="sticky top-0 z-10 backdrop-blur-sm bg-white/75 border-b border-slate-200">
        <div className=" max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedMain ? (
              <button
                onClick={goBackToMain}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                title="Back to grades"
              >
                <span className="i">←</span> Back
              </button>
            ) : null}
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">
                {selectedMain ? `Browse: ${selectedMain}` : "Browse Classes"}
              </h1>
              <p className="text-slate-500 text-sm">
                {selectedMain
                  ? "Pick a subject and month to open the class."
                  : "Start by selecting your grade."}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className=" max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* MAIN CATEGORIES (Grades) */}
        {!selectedMain && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-medium">Choose your Grade</h2>
              <p className="text-slate-500 text-sm">
                These are fixed. You can change the images in the code.
              </p>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-5">
              {MAIN_CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => handleSelectMain(cat.name)}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${cat.gradient}`}
                  />
                  <div className="absolute inset-0 bg-white/50" />
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="relative p-5">
                    <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-white shadow border border-slate-200">
                      <span className="text-lg font-bold text-slate-700">
                        {cat.name.replace("Grade ", "")}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="text-base font-semibold">{cat.name}</div>
                      <div className="text-sm text-slate-600">
                        View subjects and months
                      </div>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 text-sky-700 font-medium">
                      Continue <span>→</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* SUBCATEGORIES + MONTHS */}
        {selectedMain && (
          <>
            {/* Error */}
            {fetchError ? (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                {fetchError}
              </div>
            ) : null}

            {/* Skeleton while loading */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <>
                {/* No data */}
                {!subGroups.length ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
                    {search
                      ? `No subjects match “${search}”.`
                      : "No classes found for this grade."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subGroups.map((sub) => {
                      // month -> course map
                      const monthMap = sub.monthMap;
                      return (
                        <div
                          key={sub.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-11 w-11 grid place-items-center rounded-xl bg-sky-100 text-sky-700 font-semibold border border-sky-200">
                              {String(sub.name).slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="text-base font-semibold">
                                {sub.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                Tap a month to open class
                              </div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="mb-2 text-xs text-slate-500">
                              Months
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {UI_MONTHS.map((m) => {
                                const key = normalizeMonth(m);
                                const course = monthMap.get(key);
                                const available = !!course;

                                return (
                                  <button
                                    key={m}
                                    disabled={!available}
                                    onClick={() =>
                                      available && openCourse(course)
                                    }
                                    className={[
                                      "inline-flex items-center justify-center rounded-lg px-2.5 py-2 text-sm border transition",
                                      available
                                        ? "bg-gradient-to-r from-sky-400 to-indigo-400 text-white border-sky-300 hover:from-sky-500 hover:to-indigo-500 shadow-sm"
                                        : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed",
                                    ].join(" ")}
                                    title={
                                      available
                                        ? `Open ${sub.name} • ${m}`
                                        : `${m} not available`
                                    }
                                  >
                                    {available ? "✓" : "•"} {m.slice(0, 3)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Store;
