import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../Context/AppContext";

// Allowed Exam Years (matching your controller)
const ALLOWED_EXAM_YEARS = ["2025", "2026", "2027"];

// Months for filtering/enrollment UI
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

// --- NIC parsing logic (handles old 9+V/X and new 12-digit NICs) ---
const parseNIC = (nicRaw) => {
  if (!nicRaw) return { error: "Please enter an NIC." };

  const nic = nicRaw.replace(/[\s-]/g, "").toUpperCase();
  const today = new Date();

  const formatDate = (d) =>
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");

  // Old format: 9 digits + V/X
  if (/^[0-9]{9}[VX]$/.test(nic)) {
    const yy = parseInt(nic.slice(0, 2), 10);
    let dayCode = parseInt(nic.slice(2, 5), 10);
    if (isNaN(dayCode)) return { error: "Invalid NIC day code." };

    let gender = "Male";
    if (dayCode > 500) {
      gender = "Female";
      dayCode -= 500;
    }
    if (dayCode < 1 || dayCode > 366)
      return { error: "Invalid NIC day-of-year." };

    let year = 1900 + yy;
    let birth = new Date(year, 0, dayCode);
    if (birth > today) {
      year = 2000 + yy;
      birth = new Date(year, 0, dayCode);
    }
    if (birth > today)
      return { error: "NIC parsed to a future date. Check the NIC." };

    return { birthday: formatDate(birth), gender };
  }

  // New format: 12 digits
  if (/^[0-9]{12}$/.test(nic)) {
    const year = parseInt(nic.slice(0, 4), 10);
    let dayCode = parseInt(nic.slice(4, 7), 10);
    if (isNaN(dayCode)) return { error: "Invalid NIC day code." };

    let gender = "Male";
    if (dayCode > 500) {
      gender = "Female";
      dayCode -= 500;
    }
    if (dayCode < 1 || dayCode > 366)
      return { error: "Invalid NIC day-of-year." };

    const birth = new Date(year, 0, dayCode);
    if (birth > today)
      return { error: "NIC parsed to a future date. Check the NIC." };

    return { birthday: formatDate(birth), gender };
  }

  return {
    error:
      "Unrecognized NIC format. Accepts old (9 digits + V/X) or new (12 digits). Remove spaces/hyphens.",
  };
};

// 7-char alphanumeric password generator
const generatePassword = (len = 7) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

export default function ManullStudentRegister() {
  const [loading, setLoading] = useState(false);
  const [nicError, setNicError] = useState("");
  const { backend_url, categories, allCourses } = useContext(AppContext);

  // APIs — adjust ENROLL_API if needed
  const REGISTER_API = backend_url + "/api/educator/manully-register-user";
  const ENROLL_API = backend_url + "/api/educator/enroll-multiple-courses";

  const currentMonthName = MONTHS[new Date().getMonth()];

  // Register form
  const [form, setForm] = useState({
    name: "",
    lastname: "",
    phonenumber: "",
    NIC: "",
    ExamYear: ALLOWED_EXAM_YEARS[0],
    role: "student",
    password: generatePassword(),
    institute: "Online",
    BirthDay: "",
    Gender: "",
  });

  // Enrollment state
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
  const [search, setSearch] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  // Parse NIC with a slight debounce
  useEffect(() => {
    if (!form.NIC) {
      setNicError("");
      setForm((f) => ({ ...f, BirthDay: "", Gender: "" }));
      return;
    }
    const t = setTimeout(() => {
      const res = parseNIC(form.NIC);
      if (res.error) {
        setNicError(res.error);
        setForm((f) => ({ ...f, BirthDay: "", Gender: "" }));
      } else {
        setNicError("");
        setForm((f) => ({ ...f, BirthDay: res.birthday, Gender: res.gender }));
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.NIC]);

  // Pull from context (with safe defaults)
  const ctxCategories = Array.isArray(categories) ? categories : [];
  const ctxCoursesRaw = Array.isArray(allCourses) ? allCourses : [];
  const ctxCourses = useMemo(
    () => ctxCoursesRaw.filter((c) => c?.isPublished !== false),
    [ctxCoursesRaw]
  );

  // Simple "loading" for catalog if context not yet ready
  const catalogLoading = ctxCategories.length === 0 && ctxCourses.length === 0;

  // Derived: subcategories for selected main category
  const availableSubCats = useMemo(() => {
    const main = ctxCategories.find((m) => m._id === selectedMainCategory);
    return main?.subCategories || [];
  }, [ctxCategories, selectedMainCategory]);

  // Filtered courses by main, sub, month, search
  const filteredCourses = useMemo(() => {
    const s = search.trim().toLowerCase();
    return ctxCourses.filter((c) => {
      const okMain = selectedMainCategory
        ? c.mainCategory === selectedMainCategory
        : true;
      const okSub = selectedSubCategory
        ? c.subCategory === selectedSubCategory
        : true;
      const okMonth = selectedMonth ? c.month === selectedMonth : true;
      const okSearch = s ? c.courseTitle?.toLowerCase().includes(s) : true;
      return okMain && okSub && okMonth && okSearch;
    });
  }, [
    ctxCourses,
    selectedMainCategory,
    selectedSubCategory,
    selectedMonth,
    search,
  ]);

  const inputCls =
    "mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60";
  const labelCls = "block text-sm font-medium text-gray-700";
  const sectionCls =
    "rounded-xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleRoleChange = (e) => {
    const next = e.target.value;
    if (next === "admin") {
      const sure = window.confirm("Are you sure you want to set role = admin?");
      if (!sure) return;
    }
    setForm((f) => ({ ...f, role: next }));
  };

  const toggleCourse = (courseId) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const resetForm = () => {
    setForm({
      name: "",
      lastname: "",
      phonenumber: "",
      NIC: "",
      ExamYear: ALLOWED_EXAM_YEARS[0],
      role: "student",
      password: generatePassword(),
      institute: "Online",
      BirthDay: "",
      Gender: "",
    });
    setSelectedCourseIds([]);
  };

  // Enroll API call
  const enrollSelectedCourses = async () => {
    if (!selectedCourseIds.length) return { ok: true, skipped: true };
    try {
      const payload = {
        phonenumber: form.phonenumber,
        courseIds: selectedCourseIds,
      };
      const { data } = await axios.post(ENROLL_API, payload);
      // data = { success: true, results: [{ courseId, success, message }, ...] }
      const results = Array.isArray(data?.results) ? data.results : [];
      const successCount = results.filter((r) => r.success).length;
      const dupCount = results.filter(
        (r) => !r.success && /already enrolled/i.test(r.message)
      ).length;
      const nfCount = results.filter(
        (r) => !r.success && /not found/i.test(r.message)
      ).length;
      const otherFail = results.filter(
        (r) => !r.success && !/already enrolled|not found/i.test(r.message)
      ).length;

      toast.success(
        `Enrollment complete: ${successCount} added, ${dupCount} already enrolled, ${nfCount} not found${
          otherFail ? `, ${otherFail} failed` : ""
        }.`
      );

      return { ok: true, results };
    } catch (err) {
      const msg = err?.response?.data?.message || "Enrollment failed.";
      toast.error(msg);
      return { ok: false, error: msg };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic client-side checks
    const required = [
      "name",
      "lastname",
      "phonenumber",
      "NIC",
      "ExamYear",
      "role",
      "password",
      "institute",
      "BirthDay",
      "Gender",
    ];
    for (const k of required) {
      if (!form[k]) {
        toast.error(`Please fill ${k}.`);
        return;
      }
    }
    if (!/^[0-9]{10}$/.test(form.phonenumber)) {
      toast.error("Phone Number must be 10 digits.");
      return;
    }
    if (!ALLOWED_EXAM_YEARS.includes(String(form.ExamYear))) {
      toast.error("Invalid Exam Year. Allowed: 2025, 2026, 2027.");
      return;
    }
    if (nicError) {
      toast.error(nicError);
      return;
    }

    try {
      setLoading(true);

      // 1) Register
      const payload = {
        name: form.name,
        lastname: form.lastname,
        phonenumber: form.phonenumber,
        NIC: form.NIC,
        ExamYear: String(form.ExamYear),
        role: form.role,
        password: form.password,
        institute: form.institute,
        BirthDay: form.BirthDay, // YYYY-MM-DD
        Gender: form.Gender, // Male | Female
      };

      const regRes = await axios.post(REGISTER_API, payload);
      toast.success(
        regRes?.data?.message || "User registered successfully by admin."
      );

      // 2) Enroll (if courses selected)
      const enrollRes = await enrollSelectedCourses();
      if (!enrollRes.ok) {
        // proceed to show login message below even if enrollment failed
      }

      // Offer login details to copy
      const loginMessage = `Your Login Details 🔒

📱 Phone Number: ${form.phonenumber}
🔑 Password: ${form.password}

Download the software here 👇
https://downloads.lasithaprasad.com/

Please do not share these login details with others.

- From Lasitha Prasad`;

      if (window.confirm(`${loginMessage}\n\nClick OK to copy details.`)) {
        await navigator.clipboard.writeText(loginMessage);
        toast.success("Login details copied!");
      }

      resetForm();
    } catch (error) {
      const msg = error?.response?.data?.message || "Failed to register user.";
      const status = error?.response?.status;

      // If the user already exists, offer to continue with enrollment
      if ((status === 409 || /exist/i.test(msg)) && selectedCourseIds.length) {
        const cont = window.confirm(
          "User already exists. Do you want to enroll the selected courses to this phone number?"
        );
        if (cont) {
          const enrollRes = await enrollSelectedCourses();
          if (enrollRes.ok) {
            toast.success("Enrollment completed for existing user.");
          }
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Manual Student Register
        </h1>
        <p className="text-gray-600">
          Admins can register a student manually. NIC will auto-fill Gender and
          Birthday. Then enroll the student into multiple courses.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity Section */}
        <section className={sectionCls}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="name">
                First Name
              </label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={inputCls}
                placeholder="e.g., Kusal"
                disabled={loading}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="lastname">
                Last Name
              </label>
              <input
                id="lastname"
                name="lastname"
                value={form.lastname}
                onChange={handleChange}
                className={inputCls}
                placeholder="e.g., Janana"
                disabled={loading}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="NIC">
                NIC (Sri Lanka)
              </label>
              <input
                id="NIC"
                name="NIC"
                value={form.NIC}
                onChange={handleChange}
                className={`${inputCls} ${
                  nicError
                    ? "border-red-400 focus:ring-red-500 focus:border-red-500"
                    : ""
                }`}
                placeholder="Old: 861234567V  |  New: 200012312345"
                disabled={loading}
              />
              {nicError ? (
                <p className="mt-1 text-sm text-red-600">{nicError}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  Gender and Birthday will be auto-filled from NIC.
                </p>
              )}
            </div>

            <div>
              <label className={labelCls} htmlFor="Gender">
                Gender
              </label>
              <input
                id="Gender"
                name="Gender"
                value={form.Gender}
                readOnly
                className={`${inputCls} bg-gray-100`}
                placeholder="Auto"
                disabled={loading}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="BirthDay">
                Birthday
              </label>
              <input
                id="BirthDay"
                name="BirthDay"
                type="date"
                value={form.BirthDay}
                readOnly
                className={`${inputCls} bg-gray-100`}
                placeholder="YYYY-MM-DD"
                disabled={loading}
              />
            </div>
          </div>
        </section>

        {/* Contact & Academic */}
        <section className={sectionCls}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Contact & Academic
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls} htmlFor="phonenumber">
                Phone Number
              </label>
              <input
                id="phonenumber"
                name="phonenumber"
                type="tel"
                value={form.phonenumber}
                maxLength="10"
                pattern="[0-9]{10}"
                onChange={handleChange}
                className={inputCls}
                placeholder="07XXXXXXXX"
                disabled={loading}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="institute">
                Institute
              </label>
              <select
                id="institute"
                name="institute"
                value={form.institute}
                onChange={handleChange}
                className={inputCls}
                disabled={loading}
              >
                <option>Online</option>
                <option>SyZyGy - Gampaha</option>
              </select>
            </div>

            <div>
              <label className={labelCls} htmlFor="ExamYear">
                Exam Year
              </label>
              <select
                id="ExamYear"
                name="ExamYear"
                value={form.ExamYear}
                onChange={handleChange}
                className={inputCls}
                disabled={loading}
              >
                {ALLOWED_EXAM_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="role">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleRoleChange}
                className={inputCls}
                disabled={loading}
              >
                <option value="student">student</option>
                <option value="instructor">instructor</option>
                <option value="admin">admin</option>
              </select>
              <p className="mt-1 text-sm text-blue-600">
                Default role is student. Admin selection requires confirmation.
              </p>
            </div>
          </div>
        </section>

        {/* Password */}
        <section className={sectionCls}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Password</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="password">
                Auto-generated Password (7 chars)
              </label>
              <input
                id="password"
                name="password"
                value={form.password}
                readOnly
                className={`${inputCls} bg-gray-100`}
                disabled={loading}
              />
              <p className="mt-1 text-sm text-gray-500">
                Password contains letters and numbers.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const pwd = generatePassword();
                  setForm((f) => ({ ...f, password: pwd }));
                  toast.success("Password regenerated");
                }}
                className="inline-flex w-full justify-center rounded-lg bg-blue-600 px-3 py-2 text-white font-medium shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                title="Regenerate password"
              >
                🔄 Regenerate
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(form.password);
                    toast.success("Password copied");
                  } catch {
                    toast.error("Copy failed");
                  }
                }}
                className="inline-flex w-full justify-center rounded-lg bg-blue-50 px-3 py-2 text-blue-700 font-medium shadow hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                title="Copy password"
              >
                📋 Copy
              </button>
            </div>
          </div>
        </section>

        {/* Student Enrollment */}
        <section className={sectionCls}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Student Enrollment
            </h2>
            {catalogLoading && (
              <span className="text-sm text-gray-500">Loading catalog…</span>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelCls} htmlFor="month">
                Enrollment Month
              </label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={inputCls}
                disabled={loading}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls} htmlFor="maincat">
                Main Category
              </label>
              <select
                id="maincat"
                value={selectedMainCategory}
                onChange={(e) => {
                  setSelectedMainCategory(e.target.value);
                  setSelectedSubCategory("");
                }}
                className={inputCls}
                disabled={loading}
              >
                <option value="">All</option>
                {ctxCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls} htmlFor="subcat">
                Subcategory
              </label>
              <select
                id="subcat"
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className={inputCls}
                disabled={loading || !selectedMainCategory}
              >
                <option value="">All</option>
                {availableSubCats.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls} htmlFor="search">
                Search Title
              </label>
              <input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputCls}
                placeholder="Type to filter courses…"
                disabled={loading}
              />
            </div>
          </div>

          {/* Course List + Selected */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="rounded-lg border border-gray-200">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-t-lg">
                <div className="text-sm text-gray-700">
                  Courses ({filteredCourses.length})
                </div>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => {
                    setSelectedMainCategory("");
                    setSelectedSubCategory("");
                    setSelectedMonth(currentMonthName);
                    setSearch("");
                  }}
                  disabled={loading}
                >
                  Clear filters
                </button>
              </div>
              <div className="max-h-80 overflow-auto divide-y">
                {filteredCourses.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    No courses match your filters.
                  </div>
                ) : (
                  filteredCourses.map((c) => (
                    <label
                      key={c._id}
                      className="flex items-start gap-3 p-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedCourseIds.includes(c._id)}
                        onChange={() => toggleCourse(c._id)}
                        disabled={loading}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {c.courseTitle}
                        </div>
                        <div className="text-xs text-gray-500">
                          Month: {c.month} • Price: {c.coursePrice ?? "-"}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200">
              <div className="px-3 py-2 bg-gray-50 rounded-t-lg flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Selected ({selectedCourseIds.length})
                </div>
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => setSelectedCourseIds([])}
                  disabled={loading}
                >
                  Clear selected
                </button>
              </div>
              <div className="max-h-80 overflow-auto divide-y">
                {selectedCourseIds.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    No courses selected.
                  </div>
                ) : (
                  ctxCourses
                    .filter((c) => selectedCourseIds.includes(c._id))
                    .map((c) => (
                      <div
                        key={c._id}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="text-sm text-gray-800">
                          {c.courseTitle}
                        </div>
                        <button
                          type="button"
                          className="text-sm text-red-600 hover:underline"
                          onClick={() => toggleCourse(c._id)}
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            After registering the student, we will enroll them into the selected
            course(s){/* for the chosen month (filter only). */}.
          </p>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Clear
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Processing..." : "Register + Enroll"}
          </button>
        </div>
      </form>
    </div>
  );
}
