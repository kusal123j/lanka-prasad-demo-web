import { XCircle, Clock, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../../Context/AppContext";

// Helper: resolve main/sub names from AppContext categories + course fields
function resolveCategoryNames(categories = [], course = {}) {
  const asText = (v) => (typeof v === "string" ? v.trim() : "");

  let mainName = asText(course.mainCategoryName || course.categoryName || "");
  let subName = asText(course.subCategoryName || "");

  const mainId =
    course.mainCategoryId ||
    course.categoryId ||
    course.category?._id ||
    course.category;

  const subId =
    course.subCategoryId ||
    course.subcategoryId ||
    course.subCategory?._id ||
    course.subCategory;

  // Try to find main category
  let main = undefined;
  if (mainId) {
    main = categories.find(
      (c) =>
        c?._id === mainId ||
        c?.name?.toLowerCase() === String(mainId).toLowerCase()
    );
  }
  if (!main && mainName) {
    main = categories.find(
      (c) => c?.name?.toLowerCase() === mainName.toLowerCase()
    );
  }

  if (main) {
    mainName = main.name;

    // Try to find subcategory within that main
    if (subId) {
      const foundSub = (main.subCategories || []).find(
        (s) =>
          s?._id === subId ||
          s?.name?.toLowerCase() === String(subId).toLowerCase()
      );
      if (foundSub) subName = foundSub.name;
    }

    if (!subName && course.subCategoryName) {
      const foundByName = (main.subCategories || []).find(
        (s) => s?.name?.toLowerCase() === course.subCategoryName.toLowerCase()
      );
      if (foundByName) subName = foundByName.name;
    }
  } else {
    // If only sub info exists, resolve it and infer parent main
    const allSubs = categories.flatMap((c) =>
      (c.subCategories || []).map((s) => ({ ...s, parentName: c.name }))
    );
    const maybeSub = allSubs.find(
      (s) =>
        s?._id === subId ||
        s?.name?.toLowerCase() === String(subId).toLowerCase() ||
        (course.subCategoryName &&
          s?.name?.toLowerCase() === course.subCategoryName.toLowerCase())
    );
    if (maybeSub) {
      subName = maybeSub.name;
      mainName = maybeSub.parentName;
    }
  }

  return {
    mainName: mainName || "Uncategorised",
    subName: subName || "",
  };
}

const EnrollmentsCard = ({ course, expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);
  const { categories = [] } = useContext(AppContext);

  if (!course) {
    return (
      <div className="rounded-xl p-6 bg-slate-50 border border-slate-200 shadow-sm">
        <div className="text-center text-slate-600">
          <XCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-medium">Course data unavailable</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft("No expiry");
      setExpired(false);
      return;
    }

    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime())) {
      setTimeLeft("Invalid date");
      setExpired(false);
      return;
    }

    function tick() {
      const now = new Date();
      const diff = expiryDate - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setExpired(true);
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff / 3600000) % 24);
      const minutes = Math.floor((diff / 60000) % 60);

      setExpired(false);

      if (days > 0) {
        setTimeLeft(`${days} day${days > 1 ? "s" : ""} left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else {
        setTimeLeft(`${minutes}m left`);
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const { mainName, subName } = useMemo(
    () => resolveCategoryNames(categories, course),
    [categories, course]
  );

  const month =
    course?.month || course?.sessionMonth || course?.enrollMonth || "";

  return (
    <Link
      to={`/student/player/${course._id}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="block group"
    >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200 overflow-hidden">
        {/* Header with status */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  expired ? "bg-slate-400" : "bg-green-500"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  expired ? "text-slate-600" : "text-green-700"
                }`}
              >
                {expired ? "Expired" : "Active"}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all duration-200" />
          </div>

          {/* Course Title */}
          <h3 className="text-lg font-semibold text-slate-900 mb-3 line-clamp-2 group-hover:text-sky-700 transition-colors">
            {course.courseTitle || "Untitled Course"}
          </h3>

          {/* Time remaining */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
              expired
                ? "bg-slate-50 text-slate-700 border-slate-200"
                : "bg-teal-50 text-teal-700 border-teal-200"
            }`}
          >
            <Clock
              className={`w-4 h-4 ${
                expired ? "text-slate-500" : "text-teal-600"
              }`}
            />
            <span>Until Exam</span>
          </div>
        </div>

        {/* Footer with categories */}
        <div className="px-6 pb-6">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200">
              {mainName}
            </span>

            {subName && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-teal-100 text-teal-800 border border-teal-200">
                {subName}
              </span>
            )}

            {month && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-cyan-100 text-cyan-800 border border-cyan-200">
                {month}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EnrollmentsCard;
