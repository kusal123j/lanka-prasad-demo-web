import React, { useContext, useMemo, useState, useEffect } from "react";
import axios from "axios";
import { AppContext } from "../../Context/AppContext"; // <-- keep your path

// Helpers
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "-");
const daysLeft = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
const humanize = (s) =>
  s ? s.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "";

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - tzOffset);
  return local.toISOString().slice(0, 10);
};

const Badge = ({ color = "bg-emerald-100 text-emerald-700", children }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}
  >
    {children}
  </span>
);

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-wide text-slate-500">
      {label}
    </span>
    <span className="text-slate-900 break-words">{value ?? "-"}</span>
  </div>
);

const SectionTitle = ({ children, right }) => (
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-sm font-semibold text-slate-700">{children}</h3>
    {right}
  </div>
);

const getCourseId = (c) => c?._id || c?.id || c?.courseId || "";

// Build maps: mainID -> name, subID -> name
const buildCategoryMaps = (categories) => {
  const main = new Map();
  const sub = new Map();
  (categories || []).forEach((m) => {
    if (m?._id) main.set(String(m._id), m.name);
    (m?.subCategories || []).forEach((s) => {
      if (s?._id) sub.set(String(s._id), s.name);
    });
  });
  return { main, sub };
};

export default function StudentN() {
  const {
    allCourses = [],
    backend_url,
    categories = [],
  } = useContext(AppContext);

  // Category name maps
  const catMaps = useMemo(() => buildCategoryMaps(categories), [categories]);
  const mainName = (id) => (id ? catMaps.main.get(String(id)) || "" : "");
  const subName = (id) => (id ? catMaps.sub.get(String(id)) || "" : "");

  // Label builders
  const courseLabelFromCatalog = (c) => {
    const parts = [
      c?.courseTitle || "Untitled",
      c?.category ? humanize(c.category) : "",
      [mainName(c?.mainCategory), subName(c?.subCategory)]
        .filter(Boolean)
        .join(" • "),
      c?.month || "",
    ].filter(Boolean);
    return parts.join(" • ");
  };

  const courseLabelFromEnrollment = (course) => {
    const parts = [
      course?.courseTitle || "Untitled",
      [mainName(course?.mainCategory), subName(course?.subCategory)]
        .filter(Boolean)
        .join(" • "),
      course?.month || "",
    ].filter(Boolean);
    return parts.join(" • ");
  };

  // Axios instance
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: `${backend_url}/api/educator`,
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
    });
    instance.interceptors.request.use((config) => {
      if (typeof window !== "undefined") {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return instance;
  }, [backend_url]);

  const [query, setQuery] = useState({ phonenumber: "", NIC: "" });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null); // { userInfo, enrolledCourses, payments }
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Enroll/Unenroll
  const [courseSearch, setCourseSearch] = useState("");
  const [onlyNotEnrolled, setOnlyNotEnrolled] = useState(true);
  const [courseIdToEnroll, setCourseIdToEnroll] = useState("");
  const [courseIdToUnenroll, setCourseIdToUnenroll] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  // Edit user
  const [editForm, setEditForm] = useState({
    name: "",
    lastname: "",
    phonenumber: "",
    NIC: "",
    ExamYear: "",
    role: "student",
    BirthDay: "",
    Gender: "",
    isAccountVerified: false,
  });
  const [prevRole, setPrevRole] = useState("student");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const allowedExamYears = ["2025", "2026", "2027"];

  const getErr = (e, fb) => e?.response?.data?.message || e?.message || fb;
  const canSearch = query.phonenumber.trim() || query.NIC.trim();

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    setError("");
    setSuccess("");
    if (!canSearch) {
      setError("Enter a phone number or NIC.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/getuserdata", {
        phonenumber: query.phonenumber.trim() || undefined,
        NIC: query.NIC.trim() || undefined,
      });
      if (!res.data?.success)
        throw new Error(res.data?.message || "Failed to fetch user.");
      setData(res.data.data);
      setSuccess("User loaded.");
      setCourseIdToUnenroll("");

      if (res?.data?.data?.userInfo?.phonenumber) {
        setQuery((q) => ({
          ...q,
          phonenumber: res.data.data.userInfo.phonenumber,
        }));
      }
    } catch (err) {
      setData(null);
      setError(getErr(err, "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!canSearch) return;
    await handleSearch();
  };

  const handleEnroll = async () => {
    setError("");
    setSuccess("");
    if (!query.phonenumber.trim() || !courseIdToEnroll.trim()) {
      setError("Phone number and Course ID are required to enroll.");
      return;
    }
    setEnrolling(true);
    try {
      const res = await api.post("/manully-enroll-student", {
        phonenumber: query.phonenumber.trim(),
        courseId: courseIdToEnroll.trim(),
      });
      if (!res.data?.success)
        throw new Error(res.data?.message || "Enrollment failed.");
      setSuccess(res.data.message || "User enrolled.");
      setCourseIdToEnroll("");
      await refresh();
    } catch (err) {
      setError(getErr(err, "Enrollment failed."));
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    setError("");
    setSuccess("");
    if (!query.phonenumber.trim() || !courseIdToUnenroll.trim()) {
      setError("Select a course to unenroll.");
      return;
    }
    setUnenrolling(true);
    try {
      const res = await api.post("/manully-unenroll-student", {
        phonenumber: query.phonenumber.trim(),
        courseId: courseIdToUnenroll.trim(),
      });
      if (!res.data?.success)
        throw new Error(res.data?.message || "Unenrollment failed.");
      setSuccess(res.data.message || "User unenrolled.");
      setCourseIdToUnenroll("");
      await refresh();
    } catch (err) {
      setError(getErr(err, "Unenrollment failed."));
    } finally {
      setUnenrolling(false);
    }
  };

  const user = data?.userInfo || null;
  const enrolledCourses = data?.enrolledCourses || [];
  const payments = data?.payments || [];

  const nicUpper = useMemo(() => query.NIC.toUpperCase(), [query.NIC]);

  // Sync edit form with user
  useEffect(() => {
    if (!user?._id) return;
    setEditForm({
      name: user?.name || "",
      lastname: user?.lastname || "",
      phonenumber: user?.phonenumber || "",
      NIC: (user?.NIC || "").toUpperCase(),
      ExamYear: user?.ExamYear ? String(user.ExamYear) : "",
      role: user?.role || "student",
      BirthDay: toDateInputValue(user?.BirthDay),
      Gender: user?.Gender || "",
      isAccountVerified: !!user?.isAccountVerifyed,
    });
    setPrevRole(user?.role || "student");
  }, [user?._id]);

  // Set of enrolled course IDs to hide in picker
  const enrolledCourseIds = useMemo(() => {
    const set = new Set();
    for (const en of enrolledCourses) {
      const id = getCourseId(en?.course);
      if (id) set.add(String(id));
    }
    return set;
  }, [enrolledCourses]);

  // Filter + search the catalog
  const filteredAllCourses = useMemo(() => {
    const arr = Array.isArray(allCourses) ? allCourses : [];
    const q = courseSearch.trim().toLowerCase();
    let out = arr;

    if (q) {
      out = out.filter((c) => {
        const hay = `${c?.courseTitle || ""} ${c?.category || ""} ${mainName(
          c?.mainCategory
        )} ${subName(c?.subCategory)} ${c?.month || ""} ${getCourseId(
          c
        )}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (onlyNotEnrolled) {
      out = out.filter((c) => !enrolledCourseIds.has(String(getCourseId(c))));
    }
    return out
      .slice()
      .sort((a, b) =>
        (a?.courseTitle || "").localeCompare(b?.courseTitle || "")
      );
  }, [
    allCourses,
    courseSearch,
    onlyNotEnrolled,
    enrolledCourseIds,
    categories,
  ]);

  const selectedCourse = useMemo(
    () =>
      (Array.isArray(allCourses) ? allCourses : []).find(
        (c) => String(getCourseId(c)) === String(courseIdToEnroll)
      ),
    [allCourses, courseIdToEnroll]
  );

  // Edit handlers
  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    if (newRole === "admin" && prevRole !== "admin") {
      const ok = window.confirm(
        "Are you sure you want to assign this user to admin? Admins have full access."
      );
      if (!ok) return;
    }
    setEditForm((f) => ({ ...f, role: newRole }));
    setPrevRole(newRole);
  };

  const handleUpdateUser = async (e) => {
    e?.preventDefault?.();
    if (!user?._id) return;
    setError("");
    setSuccess("");

    // Build a payload with only changed fields (diff)
    const norm = {
      name: (user?.name || "").trim(),
      lastname: (user?.lastname || "").trim(),
      phonenumber: (user?.phonenumber || "").trim(),
      NIC: (user?.NIC || "").toUpperCase().trim(),
      ExamYear: user?.ExamYear ? String(user.ExamYear) : "",
      role: user?.role || "student",
      BirthDay: toDateInputValue(user?.BirthDay), // YYYY-MM-DD for compare
      Gender: user?.Gender || "",
      isAccountVerified: !!user?.isAccountVerifyed,
    };

    const cur = {
      name: (editForm.name || "").trim(),
      lastname: (editForm.lastname || "").trim(),
      phonenumber: (editForm.phonenumber || "").trim(),
      NIC: (editForm.NIC || "").toUpperCase().trim(),
      ExamYear: editForm.ExamYear ? String(editForm.ExamYear) : "",
      role: editForm.role || "student",
      BirthDay: editForm.BirthDay || "",
      Gender: editForm.Gender || "",
      isAccountVerified: !!editForm.isAccountVerified,
    };

    const payload = {};
    if (cur.name && cur.name !== norm.name) payload.name = cur.name;
    if (cur.lastname && cur.lastname !== norm.lastname)
      payload.lastname = cur.lastname;
    if (cur.phonenumber && cur.phonenumber !== norm.phonenumber)
      payload.phonenumber = cur.phonenumber;
    if (cur.NIC && cur.NIC !== norm.NIC) payload.NIC = cur.NIC;
    if (cur.ExamYear && cur.ExamYear !== norm.ExamYear)
      payload.ExamYear = cur.ExamYear;
    if (cur.role && cur.role !== norm.role) payload.role = cur.role;
    if (cur.BirthDay && cur.BirthDay !== norm.BirthDay)
      payload.BirthDay = cur.BirthDay;
    if (cur.Gender && cur.Gender !== norm.Gender) payload.Gender = cur.Gender;
    if (cur.isAccountVerified !== norm.isAccountVerified)
      payload.isAccountVerified = cur.isAccountVerified;

    // Validate ExamYear if it's being changed
    if (
      Object.prototype.hasOwnProperty.call(payload, "ExamYear") &&
      payload.ExamYear &&
      !allowedExamYears.includes(String(payload.ExamYear))
    ) {
      setError("Invalid Exam Year. Allowed: 2025, 2026, 2027.");
      return;
    }

    if (Object.keys(payload).length === 0) {
      setSuccess("No changes to update.");
      return;
    }

    setUpdating(true);
    try {
      const res = await api.put(`/edit-user/${user._id}`, payload);
      if (!res?.data?.success) {
        throw new Error(res?.data?.message || "Update failed.");
      }
      const updatedUser = res.data.user || {};
      // Update local UI without re-fetch
      setData((d) => (d ? { ...d, userInfo: updatedUser } : d));
      // Keep search phone in sync if changed
      if (updatedUser?.phonenumber) {
        setQuery((q) => ({ ...q, phonenumber: updatedUser.phonenumber }));
      }
      setSuccess(res.data.message || "User updated successfully.");
    } catch (err) {
      setError(getErr(err, "Failed to update user."));
    } finally {
      setUpdating(false);
    }
  };

  const handleResetEdit = () => {
    if (!user) return;
    setEditForm({
      name: user?.name || "",
      lastname: user?.lastname || "",
      phonenumber: user?.phonenumber || "",
      NIC: (user?.NIC || "").toUpperCase(),
      ExamYear: user?.ExamYear ? String(user.ExamYear) : "",
      role: user?.role || "student",
      BirthDay: toDateInputValue(user?.BirthDay),
      Gender: user?.Gender || "",
      isAccountVerified: !!user?.isAccountVerifyed,
    });
    setPrevRole(user?.role || "student");
  };

  const handleDeleteUser = async () => {
    if (!user?._id) return;
    const ok = window.confirm(
      "This will permanently delete the user. Are you sure?"
    );
    if (!ok) return;

    setError("");
    setSuccess("");
    setDeleting(true);
    try {
      // Adjust this path if your API differs
      const res = await api.delete(`/delete-user/${user.phonenumber}`);
      if (!res?.data?.success) {
        throw new Error(res?.data?.message || "Failed to delete user.");
      }
      setSuccess(res.data.message || "User deleted.");
      // Clear UI
      setData(null);
      setQuery({ phonenumber: "", NIC: "" });
    } catch (err) {
      setError(getErr(err, "Failed to delete user."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Student Management
        </h1>
        <p className="text-slate-500 mt-1">
          Search by phone or NIC. View profile, manage enrollments, and preview
          user data.
        </p>
      </header>

      {/* Search Card */}
      <form
        onSubmit={handleSearch}
        className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone number
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="07XXXXXXXX"
              className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
              value={query.phonenumber}
              onChange={(e) =>
                setQuery((q) => ({ ...q, phonenumber: e.target.value }))
              }
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              NIC
            </label>
            <input
              type="text"
              placeholder="2000XXXXXXXV"
              className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500 uppercase"
              value={nicUpper}
              onChange={(e) =>
                setQuery((q) => ({ ...q, NIC: e.target.value.toUpperCase() }))
              }
            />
          </div>
          <div className="col-span-1 flex items-end gap-2">
            <button
              type="submit"
              disabled={!canSearch || loading}
              className="inline-flex items-center justify-center w-full md:w-auto px-4 py-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Searching...
                </span>
              ) : (
                "Search"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery({ phonenumber: "", NIC: "" });
                setData(null);
                setError("");
                setSuccess("");
                setCourseIdToEnroll("");
                setCourseIdToUnenroll("");
                setCourseSearch("");
              }}
              className="inline-flex items-center justify-center w-full md:w-auto px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>

        {(error || success) && (
          <div className="mt-4 space-y-2">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}
          </div>
        )}
      </form>

      {/* Content */}
      {user ? (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile + Details */}
          <section className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-xl font-semibold text-slate-700">
                  {user?.name?.[0]?.toUpperCase() || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900 truncate">
                      {user.name} {user.lastname ? ` ${user.lastname}` : ""}
                    </h2>
                    {user.isAccountVerifyed ? (
                      <Badge>Verified</Badge>
                    ) : (
                      <Badge color="bg-amber-100 text-amber-700">
                        Unverified
                      </Badge>
                    )}
                    {user.isBlocked ? (
                      <Badge color="bg-rose-100 text-rose-700">Blocked</Badge>
                    ) : null}
                    {user.role ? (
                      <Badge color="bg-indigo-100 text-indigo-700">
                        {user.role}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Student ID:{" "}
                    <span className="font-medium text-slate-800">
                      {user.studentId}
                    </span>
                  </div>
                  {user.studentIdCard ? (
                    <div className="mt-1">
                      <a
                        className="text-sm text-slate-700 underline hover:no-underline"
                        href={user.studentIdCard}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Student ID Card
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                <InfoRow label="Phone" value={user.phonenumber} />
                <InfoRow label="Student Id" value={user.studentId} />
                <InfoRow label="WhatsApp" value={user.whatsapp} />
                <InfoRow label="NIC" value={user.NIC} />
                <InfoRow label="Gender" value={user.Gender} />
                <InfoRow label="Birthday" value={user.BirthDay} />
                <InfoRow label="Address" value={user.Address} />
                <InfoRow label="Institute" value={user.institute} />
                <InfoRow label="School" value={user.School} />
                <InfoRow label="Exam Year" value={user.ExamYear} />
                <InfoRow label="District" value={user.District} />
                <InfoRow label="Stream" value={user.stream} />
                <InfoRow
                  label="Account Complete"
                  value={user.isAccountComplete ? "Yes" : "No"}
                />
                <InfoRow
                  label="Tute Center"
                  value={user.tuteCenter ? "Yes" : "No"}
                />
                <InfoRow label="Created" value={fmtDate(user.createdAt)} />
                <InfoRow label="Updated" value={fmtDate(user.updatedAt)} />
                {user.NICFrontImage ? (
                  <div className="sm:col-span-2">
                    <InfoRow
                      label="NIC Front Image"
                      value={
                        <a
                          href={user.NICFrontImage}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-700 underline hover:no-underline"
                        >
                          Open Image
                        </a>
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Enrolled Courses */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <SectionTitle
                right={
                  <Badge color="bg-slate-100 text-slate-700">
                    {enrolledCourses.length} total
                  </Badge>
                }
              >
                Enrolled Courses
              </SectionTitle>

              {enrolledCourses.length === 0 ? (
                <div className="text-sm text-slate-500">
                  No enrollments yet.
                </div>
              ) : (
                <ul className="space-y-3">
                  {enrolledCourses.map((en) => {
                    const course = en.course || {};
                    const leftDays = daysLeft(en.expiresAt);
                    const expired = leftDays !== null && leftDays <= 0;
                    return (
                      <li
                        key={en._id}
                        className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">
                              {course.courseTitle || "Untitled Course"}
                            </div>
                            <div className="text-sm text-slate-600">
                              {[
                                mainName(course.mainCategory),
                                subName(course.subCategory),
                                course.month,
                              ]
                                .filter(Boolean)
                                .join(" • ") || "-"}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Enrolled: {fmtDate(en.enrolledAt)} | Expires:{" "}
                              {fmtDate(en.expiresAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {expired ? (
                              <Badge color="bg-rose-100 text-rose-700">
                                Expired
                              </Badge>
                            ) : (
                              <Badge>
                                {leftDays === null
                                  ? "Active"
                                  : `${leftDays}d left`}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          Course ID:{" "}
                          <span className="font-mono text-slate-700">
                            {course?._id || "-"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Payments */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <SectionTitle>Payments</SectionTitle>
              {payments?.length ? (
                <div className="overflow-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-3 py-2">#</th>
                        <th className="text-left px-3 py-2">ID</th>
                        <th className="text-left px-3 py-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p, idx) => (
                        <tr key={p._id || idx} className="border-t">
                          <td className="px-3 py-2 text-slate-600">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {p._id || "-"}
                          </td>
                          <td className="px-3 py-2">
                            <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                              {JSON.stringify(p, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  No payment records.
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <aside className="space-y-6">
            {/* Edit User */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">
                Edit User
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Update basic details. Admin role requires confirmation.
              </p>

              <form className="mt-3 space-y-3" onSubmit={handleUpdateUser}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      value={editForm.lastname}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, lastname: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone number
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="07XXXXXXXX"
                      className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      value={editForm.phonenumber}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          phonenumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      NIC
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500 uppercase"
                      value={editForm.NIC}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          NIC: e.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Exam Year
                    </label>
                    <select
                      className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      value={editForm.ExamYear}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          ExamYear: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select year</option>
                      {["2025", "2026", "2027"].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Role
                    </label>
                    <select
                      className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      value={editForm.role}
                      onChange={handleRoleChange}
                    >
                      {["student", "instructor", "admin"].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Birthday
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      value={editForm.BirthDay}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          BirthDay: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      value={editForm.Gender}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, Gender: e.target.value }))
                      }
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                    checked={editForm.isAccountVerified}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        isAccountVerified: e.target.checked,
                      }))
                    }
                  />
                  Account Verified
                </label>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={updating}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {updating ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      "Update User"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetEdit}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>

            {/* Enroll Student */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">
                Enroll Student
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pick a course from your catalog and enroll this student for 30
                days.
              </p>

              <div className="mt-3 space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Search courses
                </label>
                <input
                  type="text"
                  placeholder="Type title, category, main/sub category, month, or ID"
                  className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                />

                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                      checked={onlyNotEnrolled}
                      onChange={(e) => setOnlyNotEnrolled(e.target.checked)}
                    />
                    Show only not-enrolled
                  </label>
                  <span className="text-xs text-slate-500">
                    {filteredAllCourses.length} matches
                  </span>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Select course
                </label>
                <select
                  className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                  value={courseIdToEnroll}
                  onChange={(e) => setCourseIdToEnroll(e.target.value)}
                >
                  <option value="">Select a course</option>
                  {filteredAllCourses.slice(0, 300).map((c) => {
                    const id = getCourseId(c);
                    return (
                      <option key={id} value={id}>
                        {courseLabelFromCatalog(c)} • {id}
                      </option>
                    );
                  })}
                </select>

                {/* Manual fallback */}
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-slate-500">
                    Or paste Course ID manually
                  </summary>
                  <input
                    type="text"
                    placeholder="Paste Course ID"
                    className="mt-2 w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                    value={courseIdToEnroll}
                    onChange={(e) => setCourseIdToEnroll(e.target.value)}
                  />
                </details>

                {selectedCourse ? (
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2">
                    Selected:{" "}
                    <span className="font-medium">
                      {courseLabelFromCatalog(selectedCourse)}
                    </span>
                    <div className="font-mono text-slate-700 truncate">
                      ID: {getCourseId(selectedCourse)}
                    </div>
                  </div>
                ) : null}

                <button
                  onClick={handleEnroll}
                  disabled={enrolling || !courseIdToEnroll.trim()}
                  className="mt-2 inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {enrolling ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Enrolling...
                    </span>
                  ) : (
                    "Enroll Student"
                  )}
                </button>
              </div>
            </div>

            {/* Unenroll Student */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">
                Unenroll Student
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select an enrolled course to unenroll this student.
              </p>
              <div className="mt-3 space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Enrolled Courses
                </label>
                <select
                  className="w-full rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                  value={courseIdToUnenroll}
                  onChange={(e) => setCourseIdToUnenroll(e.target.value)}
                >
                  <option value="">Select a course</option>
                  {enrolledCourses.map((en) => (
                    <option key={en._id} value={getCourseId(en.course)}>
                      {courseLabelFromEnrollment(en.course)} (
                      {getCourseId(en.course) || "No ID"})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleUnenroll}
                  disabled={unenrolling || !courseIdToUnenroll.trim()}
                  className="mt-2 inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {unenrolling ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Unenrolling...
                    </span>
                  ) : (
                    "UnEnroll Student"
                  )}
                </button>
              </div>
            </div>

            {/* Account Flags */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">
                Account Flags
              </h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Verified</span>
                  {user.isAccountVerifyed ? (
                    <Badge>Yes</Badge>
                  ) : (
                    <Badge color="bg-amber-100 text-amber-700">No</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Blocked</span>
                  {user.isBlocked ? (
                    <Badge color="bg-rose-100 text-rose-700">Yes</Badge>
                  ) : (
                    <Badge>No</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">
                    Account Complete
                  </span>
                  {user.isAccountComplete ? (
                    <Badge>Yes</Badge>
                  ) : (
                    <Badge color="bg-amber-100 text-amber-700">No</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-rose-700">
                Danger Zone
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Permanently delete this user.
              </p>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="mt-3 inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {deleting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Delete User"
                )}
              </button>
              <p className="text-[11px] text-slate-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="mt-6 text-sm text-slate-500">
          {loading ? "Searching..." : "Search for a student to get started."}
        </div>
      )}
    </div>
  );
}
