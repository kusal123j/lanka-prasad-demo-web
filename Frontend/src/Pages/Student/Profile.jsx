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

// Light-theme reusable input/select
const InputField = memo(function InputField({
  icon: Icon,
  id,
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  required = true,
  disabled = false,
  options = null,
  autoComplete,
  inputMode,
  maxLength,
  pattern,
  title,
}) {
  return (
    <div className="group">
      {label && (
        <label
          htmlFor={id || name}
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
              : "border-gray-200 hover:border-blue-300 focus-within:border-blue-400"
          }
        `}
      >
        {Icon && (
          <Icon
            className={`w-5 h-5 mr-3 ${
              disabled
                ? "text-gray-400"
                : "text-gray-500 group-focus-within:text-blue-500"
            }`}
          />
        )}

        {options ? (
          <select
            id={id || name}
            name={name}
            value={value || ""}
            onChange={onChange}
            required={required}
            disabled={disabled}
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
            id={id || name}
            type={type}
            name={name}
            placeholder={placeholder}
            value={value || ""}
            onChange={onChange}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
            inputMode={inputMode}
            maxLength={maxLength}
            pattern={pattern}
            title={title}
            className={`w-full outline-none bg-transparent text-gray-900 font-medium placeholder:text-gray-400 ${
              disabled ? "cursor-not-allowed opacity-70" : ""
            }`}
          />
        )}
      </div>
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
  });

  const [initialProfile, setInitialProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

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
    "Grade 12",
  ];
  const genders = ["Male", "Female", "Other"];

  // Normalize date from server to yyyy-MM-dd
  const toDateInput = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
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
    ExamYear: (v) => onlyDigits(v, 4),
    Address: (v) => v.slice(0, 140),
    School: (v) => v.slice(0, 80),
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const clean = sanitize[name] ? sanitize[name](value) : value;
    setProfile((prev) => ({ ...prev, [name]: clean }));
  };

  const EDITABLE_FIELDS = [
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
  }, [profile, initialProfile]);

  const handleUpdate = async (e) => {
    e.preventDefault();
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
    if (initialProfile) setProfile(initialProfile);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-600 font-medium">Loading your profile...</p>
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

        <form onSubmit={handleUpdate} className="space-y-8">
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
                autoComplete="given-name"
              />
              <InputField
                icon={User}
                name="lastname"
                label="Last Name"
                placeholder="Enter last name"
                value={profile.lastname}
                onChange={handleChange}
                autoComplete="family-name"
              />
              <InputField
                icon={Phone}
                name="phonenumber"
                type="tel"
                label="Phone Number"
                placeholder="07XXXXXXXX"
                value={profile.phonenumber}
                onChange={handleChange}
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                pattern="^\d{10}$"
                title="Enter a 10-digit phone number"
              />
              <InputField
                name="Gender"
                label="Gender"
                value={profile.Gender}
                onChange={handleChange}
                options={genders}
                placeholder="Select gender"
              />
              <InputField
                icon={Calendar}
                name="BirthDay"
                type="date"
                label="Birth Day"
                value={profile.BirthDay || ""}
                onChange={handleChange}
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
                autoComplete="street-address"
                maxLength={140}
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
                  inputMode="numeric"
                  maxLength={10}
                  pattern="^\d{10}$"
                  title="Enter a 10-digit phone number"
                />
                <InputField
                  icon={Phone}
                  name="tuteDliveryPhoennumebr2"
                  type="tel"
                  label="Tute Delivery Phone Number 2 "
                  placeholder="07XXXXXXXX"
                  value={profile.tuteDliveryPhoennumebr2}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={10}
                  pattern="^\d{10}$"
                  title="Enter a 10-digit phone number"
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
                autoComplete="organization"
                maxLength={80}
              />
              <InputField
                icon={MapPin}
                name="ExamYear"
                label="Class"
                placeholder="Select class"
                value={profile.ExamYear}
                onChange={handleChange}
                options={ExamYears}
              />
              <InputField
                icon={MapPin}
                name="District"
                label="District"
                placeholder="Select district"
                value={profile.District}
                onChange={handleChange}
                options={districts}
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
          Student ID is read-only. All other fields above match your backend and
          can be edited.
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
