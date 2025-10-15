import { CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
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
  const { categories } = useContext(AppContext);

  if (!course) {
    return (
      <div className="rounded-xl p-6 bg-gradient-to-br from-black via-zinc-900 to-neutral-800 border border-red-500/40 shadow-lg">
        <div className="text-center text-red-400">
          <XCircle className="w-8 h-8 mx-auto mb-2" />
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
      <div className=" rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm  hover:border-red-500/60 hover:shadow-red-500/20 shadow-lg transition-all duration-300 overflow-hidden">
        {/* Header with status */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  expired ? "bg-red-500" : "bg-green-500"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  expired ? "text-red-400" : "text-white"
                }`}
              >
                {expired ? "Expired" : "Active"}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-red-400 group-hover:translate-x-1 transition-all duration-200" />
          </div>

          {/* Course Title */}
          <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2 group-hover:text-red-400 transition-colors">
            {course.courseTitle || "Untitled Course"}
          </h3>

          {/* Time remaining */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
              expired
                ? "bg-red-900/40 text-red-300 border-red-600/50"
                : "bg-zinc-800 text-white border-zinc-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{timeLeft}</span>
          </div>
        </div>

        {/* Footer with categories */}
        <div className="px-6 pb-6">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-600/30 text-white border border-red-500/40">
              {mainName}
            </span>

            {subName && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-600/20 text-white border border-red-500/30">
                {subName}
              </span>
            )}

            {month && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 text-white border border-white/20">
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
