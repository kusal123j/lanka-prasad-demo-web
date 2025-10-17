import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../Context/AppContext";

// Backend-aligned constants
const EXAM_YEAR_OPTIONS = [
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
];
const ALLOWED_GENDERS = ["Male", "Female", "Other"];
const PHONE_REGEX = /^[0-9]{10}$/;
const NAME_REGEX = /^[A-Za-z\s\-]{2,15}$/;

// Months for enrollment UI (unchanged)
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

// Optional helper: verify YYYY-MM-DD
function isIsoDate(str) {
  if (typeof str !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === str;
}

// 7-char password generator (>=6 satisfies backend)
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

  const REGISTER_API = backend_url + "/api/educator/manully-register-user";
  const ENROLL_API = backend_url + "/api/educator/enroll-multiple-courses";

  const currentMonthName = MONTHS[new Date().getMonth()];

  // Form state
  const [form, setForm] = useState({
    name: "",
    lastname: "",
    phonenumber: "",

    ExamYear: EXAM_YEAR_OPTIONS[0],
    role: "student",
    password: generatePassword(),
    BirthDay: "",
    Gender: "",
    Address: "",
    School: "",
    District: "",
    tuteDliveryPhoennumebr1: "",
    tuteDliveryPhoennumebr2: "",
  });

  // Enrollment state
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
  const [search, setSearch] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  // Context data
  const ctxCategories = Array.isArray(categories) ? categories : [];
  const ctxCoursesRaw = Array.isArray(allCourses) ? allCourses : [];
  const ctxCourses = useMemo(
    () => ctxCoursesRaw.filter((c) => c?.isPublished !== false),
    [ctxCoursesRaw]
  );

  const catalogLoading = ctxCategories.length === 0 && ctxCourses.length === 0;

  const availableSubCats = useMemo(() => {
    const main = ctxCategories.find((m) => m._id === selectedMainCategory);
    return main?.subCategories || [];
  }, [ctxCategories, selectedMainCategory]);

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

  const handlePhoneInput = (e) => {
    const { name, value } = e.target;
    const digits = value.replace(/\D/g, "").slice(0, 10);
    // 👇 Add this validation before updating state
    if (!value.startsWith("07") && value.length >= 2) {
      return; // Stop updating if the number doesn't start with 07
    }
    setForm((f) => ({ ...f, [name]: digits }));
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

      ExamYear: EXAM_YEAR_OPTIONS[0],
      role: "student",
      password: generatePassword(),
      BirthDay: "",
      Gender: "",
      Address: "",
      School: "",
      District: "",
      tuteDliveryPhoennumebr1: "",
      tuteDliveryPhoennumebr2: "",
    });
    setSelectedCourseIds([]);
  };

  // Enroll API call (unchanged)
  const enrollSelectedCourses = async () => {
    if (!selectedCourseIds.length) return { ok: true, skipped: true };
    try {
      const payload = {
        phonenumber: form.phonenumber,
        courseIds: selectedCourseIds,
      };
      const { data } = await axios.post(ENROLL_API, payload);
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

    // Required fields per backend
    const required = [
      "name",
      "lastname",
      "phonenumber",
      "password",
      "BirthDay",
      "Gender",
      "ExamYear",
      "Address",
      "School",
      "District",
      "tuteDliveryPhoennumebr1",
      "tuteDliveryPhoennumebr2",
    ];

    for (const k of required) {
      if (!String(form[k] ?? "").trim()) {
        toast.error(`Please fill ${k}.`);
        return;
      }
    }

    // Validate names
    if (!NAME_REGEX.test(form.name)) {
      toast.error(
        "Invalid first name (2–15 letters, spaces and hyphens allowed)."
      );
      return;
    }
    if (!NAME_REGEX.test(form.lastname)) {
      toast.error(
        "Invalid last name (2–15 letters, spaces and hyphens allowed)."
      );
      return;
    }

    // Validate phones
    if (!PHONE_REGEX.test(form.phonenumber)) {
      toast.error("Phone Number must be 10 digits.");
      return;
    }
    if (
      !PHONE_REGEX.test(form.tuteDliveryPhoennumebr1) ||
      !PHONE_REGEX.test(form.tuteDliveryPhoennumebr2)
    ) {
      toast.error("Tute delivery phone numbers must be 10 digits.");
      return;
    }
    if (form.tuteDliveryPhoennumebr1 === form.tuteDliveryPhoennumebr2) {
      toast.error(
        "tuteDliveryPhoennumebr1 and tuteDliveryPhoennumebr2 must be different."
      );
      return;
    }

    // Exam year and gender
    if (!EXAM_YEAR_OPTIONS.includes(String(form.ExamYear))) {
      toast.error(
        `Invalid Exam Year. Allowed: ${EXAM_YEAR_OPTIONS.join(", ")}.`
      );
      return;
    }
    if (!ALLOWED_GENDERS.includes(String(form.Gender))) {
      toast.error("Invalid Gender value.");
      return;
    }

    // Date + password
    if (!isIsoDate(String(form.BirthDay))) {
      toast.error("Invalid BirthDay format (use YYYY-MM-DD).");
      return;
    }
    if (String(form.password).length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);

      // Build backend-aligned payload (do not send NIC or institute)
      const payload = {
        name: form.name.trim(),
        lastname: form.lastname.trim(),
        phonenumber: form.phonenumber.trim(),
        password: form.password,
        BirthDay: form.BirthDay,
        Gender: form.Gender,
        Address: form.Address.trim(),
        School: form.School.trim(),
        ExamYear: String(form.ExamYear),
        District: form.District.trim(),
        tuteDliveryPhoennumebr1: form.tuteDliveryPhoennumebr1,
        tuteDliveryPhoennumebr2: form.tuteDliveryPhoennumebr2,
        role: form.role, // optional, backend validates
      };

      const regRes = await axios.post(REGISTER_API, payload);
      const studentId = regRes?.data?.data?.studentId;
      toast.success(
        regRes?.data?.message || "User registered successfully by admin."
      );

      // Enroll selected courses
      const enrollRes = await enrollSelectedCourses();
      if (!enrollRes.ok) {
        // continue
      }

      // Offer login details to copy (include studentId if available)
      const loginMessage = `Your Login Details 🔒

Student ID: ${studentId || "-"}
📱 Phone Number: ${form.phonenumber}
🔑 Password: ${form.password}

Download the software here 👇
https://downloads.lasithaprasad.com/

Please do not share these login details with others.

- From Lanka Prasad`;

      if (window.confirm(`${loginMessage}\n\nClick OK to copy details.`)) {
        await navigator.clipboard.writeText(loginMessage);
        toast.success("Login details copied!");
      }

      resetForm();
    } catch (error) {
      const msg = error?.response?.data?.message || "Failed to register user.";
      const status = error?.response?.status;

      // If user exists, offer enrollment for the selected courses
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

  const tuteSame =
    form.tuteDliveryPhoennumebr1 &&
    form.tuteDliveryPhoennumebr2 &&
    form.tuteDliveryPhoennumebr1 === form.tuteDliveryPhoennumebr2;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Manual User Register
        </h1>
        <p className="text-gray-600">
          Admins can register a user manually. Optionally enter NIC to auto-fill
          Gender and Birthday. Then enroll the user into multiple courses.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
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
              <p className="mt-1 text-xs text-gray-500">
                2–15 letters, spaces and hyphens allowed.
              </p>
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
              <p className="mt-1 text-xs text-gray-500">
                2–15 letters, spaces and hyphens allowed.
              </p>
            </div>

            <div>
              <label className={labelCls} htmlFor="Gender">
                Gender
              </label>
              <select
                id="Gender"
                name="Gender"
                value={form.Gender}
                onChange={handleChange}
                className={inputCls}
                disabled={loading}
              >
                <option value="">Select gender</option>
                {ALLOWED_GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
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
                onChange={handleChange}
                className={inputCls}
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
                Phone Number ( start from 07 )*
              </label>
              <input
                id="phonenumber"
                name="phonenumber"
                type="tel"
                value={form.phonenumber}
                onChange={handlePhoneInput}
                className={inputCls}
                placeholder="07XXXXXXXX"
                disabled={loading}
                pattern="^07[0-9]{8}$"
                title="Phone number must start with 07 and have 10 digits"
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="ExamYear">
                Grade
              </label>
              <select
                id="ExamYear"
                name="ExamYear"
                value={form.ExamYear}
                onChange={handleChange}
                className={inputCls}
                disabled={loading}
              >
                {EXAM_YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls} htmlFor="School">
                School
              </label>
              <input
                id="School"
                name="School"
                value={form.School}
                onChange={handleChange}
                className={inputCls}
                placeholder="Enter school name"
                disabled={loading}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="District">
                District
              </label>
              <input
                id="District"
                name="District"
                value={form.District}
                onChange={handleChange}
                className={inputCls}
                placeholder="Enter district"
                disabled={loading}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="Address">
                Address
              </label>
              <input
                id="Address"
                name="Address"
                value={form.Address}
                onChange={handleChange}
                className={inputCls}
                placeholder="Enter full address"
                disabled={loading}
              />
            </div>

            <div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelCls} htmlFor="tuteDliveryPhoennumebr1">
                Tute Delivery Phone 1
              </label>
              <input
                id="tuteDliveryPhoennumebr1"
                name="tuteDliveryPhoennumebr1"
                type="tel"
                value={form.tuteDliveryPhoennumebr1}
                onChange={handlePhoneInput}
                className={`${inputCls} ${tuteSame ? "border-red-400" : ""}`}
                placeholder="07XXXXXXXX"
                disabled={loading}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="tuteDliveryPhoennumebr2">
                Tute Delivery Phone 2
              </label>
              <input
                id="tuteDliveryPhoennumebr2"
                name="tuteDliveryPhoennumebr2"
                type="tel"
                value={form.tuteDliveryPhoennumebr2}
                onChange={handlePhoneInput}
                className={`${inputCls} ${tuteSame ? "border-red-400" : ""}`}
                placeholder="07XXXXXXXX"
                disabled={loading}
              />
              {tuteSame && (
                <p className="mt-1 text-sm text-red-600">
                  tuteDliveryPhoennumebr1 and tuteDliveryPhoennumebr2 must be
                  different.
                </p>
              )}
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
                Must be at least 6 characters. You can regenerate and copy.
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
            After registering the user, we will enroll them into the selected
            course(s).
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
