import React, { useEffect, useState, useContext, useMemo, memo } from "react";
import axios from "axios";
import { AppContext } from "../../Context/AppContext";
import {
  User,
  Phone,
  Home,
  Calendar,
  MapPin,
  Save,
  GraduationCap,
  Loader,
  Hash,
  UserCircle2,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";

// Light-theme reusable input/select with error display
const InputField = memo(function InputField({
  icon: Icon,
  id,
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  options = null,
  autoComplete,
  inputMode,
  maxLength,
  pattern,
  title,
  error,
  helperText,
}) {
  const inputId = id || name;
  const describedBy = error
    ? `${inputId}-error`
    : helperText
    ? `${inputId}-help`
    : undefined;

  return (
    <div className="group">
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-1 text-sm font-medium text-gray-700"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        className={`relative flex items-center rounded-xl bg-white p-3 shadow-sm border transition-colors
          ${
            disabled
              ? "bg-gray-50 border-gray-200"
              : error
              ? "border-rose-400 hover:border-rose-400 focus-within:border-rose-500"
              : "border-gray-200 hover:border-blue-300 focus-within:border-blue-400"
          }
        `}
      >
        {Icon && (
          <Icon
            className={`w-5 h-5 mr-3 ${
              disabled
                ? "text-gray-400"
                : error
                ? "text-rose-500"
                : "text-gray-500 group-focus-within:text-blue-500"
            }`}
          />
        )}

        {options ? (
          <select
            id={inputId}
            name={name}
            value={value || ""}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={`w-full outline-none bg-transparent text-gray-900 font-medium appearance-none ${
              disabled ? "cursor-not-allowed opacity-70" : ""
            }`}
          >
            <option value="" disabled className="text-gray-500">
              {placeholder || `Select ${label || name}`}
            </option>
            {options.map((option) => (
              <option key={option} value={option} className="text-gray-900">
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={inputId}
            type={type}
            name={name}
            placeholder={placeholder}
            value={value || ""}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
            inputMode={inputMode}
            maxLength={maxLength}
            pattern={pattern}
            title={title}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={`w-full outline-none bg-transparent text-gray-900 font-medium placeholder:text-gray-400 ${
              disabled ? "cursor-not-allowed opacity-70" : ""
            }`}
          />
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-rose-600">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-help`} className="mt-1 text-xs text-gray-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  gradient = "from-blue-500 to-indigo-500",
  children,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center px-6 pt-6">
        <div
          className={`p-3 rounded-xl bg-gradient-to-r ${gradient} text-white shadow-md mr-4`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const ProfilePage = () => {
  const { backend_url, getUserData } = useContext(AppContext);
  const GET_PROFILE_ENDPOINT = "/api/user/profile"; // GET -> { success, userData }
  const UPDATE_PROFILE_ENDPOINT = "/api/user/update-profile"; // PUT -> { success, user }

  const [profile, setProfile] = useState({
    // readonly
    studentId: "",

    // editable (match backend keys exactly)
    name: "",
    lastname: "",
    phonenumber: "",
    Gender: "",
    BirthDay: "",
    School: "",
    ExamYear: "",
    District: "",
    Address: "",
    tuteDliveryPhoennumebr1: "",
    tuteDliveryPhoennumebr2: "",
    // Optional (add only if your backend supports it)
  });

  const [initialProfile, setInitialProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // form meta state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const districts = [
    "Colombo",
    "Gampaha",
    "Kalutara",
    "Kandy",
    "Matale",
    "Nuwara Eliya",
    "Galle",
    "Matara",
    "Hambantota",
    "Jaffna",
    "Kilinochchi",
    "Mannar",
    "Vavuniya",
    "Mullaitivu",
    "Batticaloa",
    "Ampara",
    "Trincomalee",
    "Kurunegala",
    "Puttalam",
    "Anuradhapura",
    "Polonnaruwa",
    "Badulla",
    "Monaragala",
    "Ratnapura",
    "Kegalle",
  ];
  const ExamYears = [
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
  ];
  const genders = ["Male", "Female", "Other"];

  // Helpers
  const toDateInput = (val) => {
    if (!val) return "";
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const normalizeFromServer = (data = {}) => ({
    ...data,
    BirthDay: data.BirthDay ? toDateInput(data.BirthDay) : "",
  });

  // Sanitizers
  const onlyDigits = (v, len) => v.replace(/\D/g, "").slice(0, len);
  const onlyLetters = (v, len) => v.replace(/[^\p{L}\s'-]/gu, "").slice(0, len);

  const sanitize = {
    phonenumber: (v) => onlyDigits(v, 10),
    tuteDliveryPhoennumebr1: (v) => onlyDigits(v, 10),
    tuteDliveryPhoennumebr2: (v) => onlyDigits(v, 10),
    name: (v) => onlyLetters(v, 50),
    lastname: (v) => onlyLetters(v, 50),
    ExamYear: (v) => v, // select value like "Grade 6"
    Address: (v) => v.slice(0, 140),
    School: (v) => v.slice(0, 80),
  };

  // Validation utils
  const isTenDigits = (v) => /^\d{10}$/.test(v);
  const isMainPhoneValidWhenChanged = (v) => /^07\d{8}$/.test(v);
  const notFutureDate = (v) => {
    if (!v) return true;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d <= today && d.getFullYear() >= 1900;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const clean = sanitize[name] ? sanitize[name](value) : value;
    setProfile((prev) => {
      const next = { ...prev, [name]: clean };
      return next;
    });
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((prev) => {
      const msg = validateField(name, clean);
      return { ...prev, [name]: msg };
    });
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((prev) => {
      const msg = validateField(name, profile[name]);
      return { ...prev, [name]: msg };
    });
  };

  const EDITABLE_FIELDS_BASE = [
    "name",
    "lastname",
    "Gender",
    "BirthDay",
    "ExamYear",
    "phonenumber",
    "Address",
    "tuteDliveryPhoennumebr1",
    "tuteDliveryPhoennumebr2",
    "School",
    "District",
  ];

  const EDITABLE_FIELDS = useMemo(() => {
    const fields = [...EDITABLE_FIELDS_BASE];
    if ("NIC" in profile) fields.push("NIC");
    return fields;
  }, [profile]);

  const buildUpdatePayload = () => {
    const payload = {};
    EDITABLE_FIELDS.forEach((k) => {
      payload[k] = profile[k] ?? "";
    });
    return payload;
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${backend_url}${GET_PROFILE_ENDPOINT}`, {
        withCredentials: true,
      });
      if (res.data?.success) {
        const normalized = normalizeFromServer(res.data.userData || {});
        setProfile((prev) => ({ ...prev, ...normalized }));
        setInitialProfile(normalized);
        setErrors({});
        setTouched({});
        getUserData?.();
      } else {
        toast.error(res.data?.message || "Failed to load profile.");
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
      toast.error("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = useMemo(() => {
    if (!initialProfile) return false;
    return EDITABLE_FIELDS.some(
      (k) => (profile[k] || "") !== (initialProfile[k] || "")
    );
  }, [profile, initialProfile, EDITABLE_FIELDS]);

  // Field-level validation
  const validateField = (name, value) => {
    switch (name) {
      case "name":
        if (!value) return "First name is required.";
        if (value.length < 2)
          return "First name must be at least 2 characters.";
        return "";
      case "lastname":
        if (!value) return "Last name is required.";
        if (value.length < 2) return "Last name must be at least 2 characters.";
        return "";
      case "Gender":
        if (!value) return "Please select your gender.";
        if (!["Male", "Female", "Other"].includes(value))
          return "Invalid gender selection.";
        return "";
      case "BirthDay":
        if (!value) return "";
        if (!notFutureDate(value)) return "Please enter a valid past date.";
        return "";
      case "phonenumber": {
        if (!value) return "Phone number is required.";
        if (!isTenDigits(value)) return "Enter a 10-digit phone number.";
        const changed =
          initialProfile && value !== (initialProfile.phonenumber || "");
        if (changed && !isMainPhoneValidWhenChanged(value))
          return "If you update your number, it must start with 07 (e.g., 07XXXXXXXX).";
        return "";
      }
      case "tuteDliveryPhoennumebr1":
      case "tuteDliveryPhoennumebr2":
        if (!value) return "";
        if (!isTenDigits(value)) return "Enter a 10-digit phone number.";
        return "";
      case "Address":
        if (!value) return "";
        if (value.length < 5) return "Address should be at least 5 characters.";
        return "";
      case "School":
        return ""; // optional
      case "ExamYear":
        if (!value) return "Please select your class.";
        if (!ExamYears.includes(value)) return "Invalid class selection.";
        return "";
      case "District":
        if (!value) return "Please select your district.";
        if (!districts.includes(value)) return "Invalid district selection.";
        return "";
      default:
        return "";
    }
  };

  const validateAll = () => {
    const nextErrors = {};
    const fields = [
      "name",
      "lastname",
      "Gender",
      "BirthDay",
      "phonenumber",
      "Address",
      "tuteDliveryPhoennumebr1",
      "tuteDliveryPhoennumebr2",
      "School",
      "ExamYear",
      "District",
    ];
    fields.forEach((f) => {
      if (f in profile) {
        const msg = validateField(f, profile[f]);
        if (msg) nextErrors[f] = msg;
      }
    });
    setErrors(nextErrors);
    return {
      valid: Object.values(nextErrors).every((m) => !m),
      firstKey: Object.keys(nextErrors).find((k) => nextErrors[k]),
    };
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { valid, firstKey } = validateAll();
    if (!valid) {
      // Focus the first invalid field
      if (firstKey) {
        const el = document.getElementById(firstKey);
        el?.focus?.();
      }
      toast.error("Please fix the highlighted errors.");
      return;
    }

    setUpdating(true);
    try {
      const payload = buildUpdatePayload();
      const res = await axios.put(
        `${backend_url}${UPDATE_PROFILE_ENDPOINT}`,
        payload,
        { withCredentials: true }
      );
      if (res.data?.success) {
        const normalized = normalizeFromServer(res.data.user || {});
        setProfile((p) => ({ ...p, ...normalized }));
        setInitialProfile(normalized);
        setErrors({});
        setTouched({});
        toast.success("Profile updated successfully!");
      } else {
        toast.error(res.data?.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile", error);
      toast.error("Error updating profile");
    } finally {
      setUpdating(false);
    }
  };

  const resetChanges = () => {
    if (initialProfile) {
      setProfile((prev) => ({ ...prev, ...initialProfile }));
      setErrors({});
      setTouched({});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl mb-4 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            My Profile
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your personal, delivery, and education information
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-8" noValidate>
          {/* Personal Information */}
          <SectionCard
            title="Personal Information"
            subtitle="Your basic details"
            icon={UserCircle2}
            gradient="from-blue-500 to-indigo-500"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InputField
                icon={Hash}
                name="studentId"
                label="Student ID"
                value={profile.studentId}
                disabled={true}
              />
              <InputField
                icon={User}
                name="name"
                label="First Name"
                placeholder="Enter first name"
                value={profile.name}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="given-name"
                required
                error={touched.name ? errors.name : ""}
              />
              <InputField
                icon={User}
                name="lastname"
                label="Last Name"
                placeholder="Enter last name"
                value={profile.lastname}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="family-name"
                required
                error={touched.lastname ? errors.lastname : ""}
              />
              <InputField
                icon={Phone}
                name="phonenumber"
                type="tel"
                label="Phone Number"
                placeholder="07XXXXXXXX"
                value={profile.phonenumber}
                onChange={handleChange}
                onBlur={handleBlur}
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                pattern="^\d{10}$"
                title="Enter a 10-digit phone number"
                required
                error={touched.phonenumber ? errors.phonenumber : ""}
                helperText="If you update this number, it must start with 07."
              />

              <InputField
                name="Gender"
                label="Gender"
                value={profile.Gender}
                onChange={handleChange}
                onBlur={handleBlur}
                options={genders}
                placeholder="Select gender"
                required
                error={touched.Gender ? errors.Gender : ""}
              />
              <InputField
                icon={Calendar}
                name="BirthDay"
                type="date"
                label="Birth Day"
                value={profile.BirthDay || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.BirthDay ? errors.BirthDay : ""}
              />
            </div>
          </SectionCard>

          {/* Tute Delivery Info */}
          <SectionCard
            title="Tute Delivery Info"
            subtitle="Where and how we can deliver"
            icon={Package}
            gradient="from-emerald-500 to-teal-500"
          >
            <div className="grid grid-cols-1 gap-6">
              <InputField
                icon={Home}
                name="Address"
                label="Address"
                placeholder="House No, Street, City"
                value={profile.Address}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="street-address"
                maxLength={140}
                error={touched.Address ? errors.Address : ""}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  icon={Phone}
                  name="tuteDliveryPhoennumebr1"
                  type="tel"
                  label="Tute Delivery Phone Number 1"
                  placeholder="07XXXXXXXX"
                  value={profile.tuteDliveryPhoennumebr1}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  inputMode="numeric"
                  maxLength={10}
                  pattern="^\d{10}$"
                  title="Enter a 10-digit phone number"
                  error={
                    touched.tuteDliveryPhoennumebr1
                      ? errors.tuteDliveryPhoennumebr1
                      : ""
                  }
                />
                <InputField
                  icon={Phone}
                  name="tuteDliveryPhoennumebr2"
                  type="tel"
                  label="Tute Delivery Phone Number 2"
                  placeholder="07XXXXXXXX"
                  value={profile.tuteDliveryPhoennumebr2}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  inputMode="numeric"
                  maxLength={10}
                  pattern="^\d{10}$"
                  title="Enter a 10-digit phone number"
                  error={
                    touched.tuteDliveryPhoennumebr2
                      ? errors.tuteDliveryPhoennumebr2
                      : ""
                  }
                />
              </div>
            </div>
          </SectionCard>

          {/* Education Information */}
          <SectionCard
            title="Education Information"
            subtitle="Your academic details"
            icon={GraduationCap}
            gradient="from-fuchsia-500 to-purple-500"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InputField
                name="School"
                label="School"
                placeholder="Your school name"
                value={profile.School}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="organization"
                maxLength={80}
                error={touched.School ? errors.School : ""}
              />
              <InputField
                icon={MapPin}
                name="ExamYear"
                label="Class"
                placeholder="Select class"
                value={profile.ExamYear}
                onChange={handleChange}
                onBlur={handleBlur}
                options={ExamYears}
                required
                error={touched.ExamYear ? errors.ExamYear : ""}
              />
              <InputField
                icon={MapPin}
                name="District"
                label="District"
                placeholder="Select district"
                value={profile.District}
                onChange={handleChange}
                onBlur={handleBlur}
                options={districts}
                required
                error={touched.District ? errors.District : ""}
              />
            </div>
          </SectionCard>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="submit"
              disabled={updating || !isDirty}
              className={`inline-flex items-center justify-center rounded-xl font-semibold px-6 py-3 shadow-sm transition-all
                ${
                  updating || !isDirty
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 hover:shadow-md"
                }`}
            >
              {updating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {isDirty ? "Save Changes" : "No Changes"}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetChanges}
              disabled={updating || !isDirty}
              className={`inline-flex items-center justify-center rounded-xl font-semibold px-6 py-3 border transition-colors
                ${
                  updating || !isDirty
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
            >
              Reset
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          Student ID is read-only. Your main phone must be 10 digits. When you
          update it, it must start with 07.
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
