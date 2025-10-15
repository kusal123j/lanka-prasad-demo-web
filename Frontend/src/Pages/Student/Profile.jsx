import React, { useEffect, useState, useContext, useMemo, memo } from "react";
import axios from "axios";
import { AppContext } from "../../Context/AppContext";
import {
  User,
  Mail,
  Phone,
  Home,
  Calendar,
  MapPin,
  UserCheck,
  Users,
  Save,
  Shield,
  GraduationCap,
  Loader,
  Hash,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";

// Reusable input/select with dark styles
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
      <label
        htmlFor={id || name}
        className="block mb-1 text-sm font-medium text-zinc-200"
      >
        {label || placeholder}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div
        className={`relative flex items-center transition-all duration-200 rounded-xl p-3 shadow-sm
        ${disabled ? "bg-zinc-950" : "bg-zinc-900"}
        border-2 ${
          disabled
            ? "border-zinc-800"
            : "border-zinc-800 group-hover:border-red-400 focus-within:border-red-500"
        }`}
      >
        <Icon
          className={`w-5 h-5 mr-3 transition-colors
          ${
            disabled
              ? "text-zinc-500"
              : "text-zinc-400 group-focus-within:text-red-400"
          }`}
        />
        {options ? (
          <select
            id={id || name}
            name={name}
            value={value || ""}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className={`w-full outline-none bg-transparent text-zinc-100 font-medium ${
              disabled ? "cursor-not-allowed opacity-70" : ""
            }`}
          >
            <option value="" disabled className="bg-zinc-900 text-zinc-300">
              {placeholder || `Select ${label || name}`}
            </option>
            {options.map((option) => (
              <option
                key={option}
                value={option}
                className="bg-zinc-900 text-zinc-100"
              >
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
            className={`w-full outline-none bg-transparent text-zinc-100 font-medium placeholder-zinc-500 ${
              disabled ? "cursor-not-allowed opacity-70" : ""
            }`}
          />
        )}
      </div>
    </div>
  );
});

const ProfilePage = () => {
  const { backend_url, getUserData } = useContext(AppContext);
  const GET_PROFILE_ENDPOINT = "/api/user/profile"; // GET
  const UPDATE_PROFILE_ENDPOINT = "/api/user/update-profile"; // PUT

  const [profile, setProfile] = useState({
    // readonly/ids
    studentId: "",

    // editable
    name: "",
    lastname: "",
    phonenumber: "",
    Address: "",
    School: "",
    District: "",
    stream: "",
    institute: "",
    // locked
    Gender: "",
    NIC: "",
    BirthDay: "",
    ExamYear: "",
  });

  const [initialProfile, setInitialProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Options
  const streams = [
    "Maths + ICT",
    "Commerce + ICT",
    "ART + ICT",
    "E TECH",
    "B TECH",
  ];
  const institutes = ["Online", "SyZyGy - Gampaha"];
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

  // Fetch profile
  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${backend_url}${GET_PROFILE_ENDPOINT}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setProfile((prev) => ({ ...prev, ...(res.data.userData || {}) }));
        setInitialProfile(res.data.userData || {});
        getUserData?.();
      } else {
        toast.error(res.data.message || "Failed to load profile.");
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

  // Simple sanitizers
  const sanitize = {
    phonenumber: (v) => v.replace(/\D/g, "").slice(0, 10),
    GuardianPhonenumber: (v) => v.replace(/\D/g, "").slice(0, 10),
    NIC: (v) => v.replace(/\s/g, "").toUpperCase().slice(0, 12),
    name: (v) => v.replace(/[^\p{L}\s'-]/gu, "").slice(0, 50),
    lastname: (v) => v.replace(/[^\p{L}\s'-]/gu, "").slice(0, 50),
    GuardianName: (v) => v.replace(/[^\p{L}\s'-]/gu, "").slice(0, 60),
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const clean = sanitize[name] ? sanitize[name](value) : value;
    setProfile((prev) => ({ ...prev, [name]: clean }));
  };

  // Only send editable fields
  const EDITABLE_FIELDS = [
    "phonenumber",
    "Address",
    "School",
    "District",
    "stream",
    "institute",
  ];

  const buildUpdatePayload = () => {
    const payload = {};
    EDITABLE_FIELDS.forEach((k) => {
      if (profile[k] !== undefined) payload[k] = profile[k];
    });
    return payload;
  };

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
      if (res.data.success) {
        toast.success("Profile updated successfully!");
        // sync from server response to avoid drift (trimming, etc.)
        setProfile((p) => ({ ...p, ...(res.data.user || {}) }));
        setInitialProfile(res.data.user || {});
      } else {
        toast.error(res.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile", error);
      toast.error("Error updating profile");
    } finally {
      setUpdating(false);
    }
  };

  // Compare only editable fields for "dirty" state
  const isDirty = useMemo(() => {
    if (!initialProfile) return false;
    return EDITABLE_FIELDS.some((k) => profile[k] !== initialProfile[k]);
  }, [profile, initialProfile]);

  // Format BirthDay for input[type=date]
  const formatDateForInput = (value) => {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="w-8 h-8 animate-spin text-red-500" />
          <p className="text-zinc-300 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-600 to-rose-600 rounded-full mb-4 shadow-[0_0_30px_rgba(244,63,94,0.35)]">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-zinc-100 mb-2">My Profile</h1>
          <p className="text-zinc-400 text-lg">
            Manage your personal information and settings
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleUpdate} className="space-y-8">
          {/* Identity Card */}
          <div className="bg-zinc-900/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-zinc-800">
            <div className="flex items-center mb-6">
              <div className="bg-red-900/30 p-3 rounded-xl mr-4 border border-red-700/40">
                <User className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">
                  Personal Information
                </h2>
                <p className="text-zinc-400">Your basic personal details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InputField
                icon={Hash}
                name="studentId"
                label="Student ID"
                placeholder="Student ID"
                value={profile.studentId}
                disabled={true}
              />
              <InputField
                icon={User}
                name="name"
                label="First Name"
                disabled={true}
                value={profile.name}
              />
              <InputField
                icon={UserCheck}
                name="lastname"
                label="Last Name"
                value={profile.lastname}
                disabled={true}
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
                icon={UserCheck}
                name="Gender"
                label="Gender"
                disabled={true}
                placeholder="Gender"
                value={profile.Gender}
              />
              <InputField
                icon={Shield}
                name="NIC"
                label="National ID Number"
                placeholder="e.g., 923456789V or 200012345678"
                value={profile.NIC}
                disabled={true}
              />
              <InputField
                icon={Calendar}
                name="BirthDay"
                label="Birth Day"
                value={profile.BirthDay}
                disabled={true}
              />
              <InputField
                icon={Calendar}
                name="ExamYear"
                label="Exam Year"
                placeholder="Exam Year"
                value={profile.ExamYear}
                disabled={true}
              />
            </div>

            <div className="mt-6">
              <InputField
                icon={Home}
                name="Address"
                label="Address"
                placeholder="Complete Address"
                value={profile.Address}
                onChange={handleChange}
                autoComplete="street-address"
                maxLength={120}
              />
            </div>
          </div>

          {/* Education */}
          <div className="bg-zinc-900/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-zinc-800">
            <div className="flex items-center mb-6">
              <div className="bg-red-900/30 p-3 rounded-xl mr-4 border border-red-700/40">
                <GraduationCap className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">
                  Education Information
                </h2>
                <p className="text-zinc-400">
                  Your academic details and location
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InputField
                icon={GraduationCap}
                name="School"
                label="School Name"
                placeholder="School Name"
                value={profile.School}
                onChange={handleChange}
                autoComplete="organization"
                maxLength={80}
              />
              <InputField
                icon={MapPin}
                name="District"
                label="District"
                placeholder="Select District"
                value={profile.District}
                onChange={handleChange}
                options={districts}
              />
              <InputField
                icon={Building2}
                name="institute"
                label="Institute"
                placeholder="Select Institute"
                value={profile.institute}
                onChange={handleChange}
                options={institutes}
              />
              <InputField
                icon={GraduationCap}
                name="stream"
                label="Stream"
                placeholder="Select Stream"
                value={profile.stream}
                onChange={handleChange}
                options={streams}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={updating || !isDirty}
              className="group relative bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-red-500/30 transform hover:scale-105 disabled:hover:scale-100 transition-all duration-200 min-w-[200px]"
            >
              <div className="flex items-center justify-center">
                {updating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                    {isDirty ? "Save Changes" : "No Changes"}
                  </>
                )}
              </div>
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-zinc-500 text-sm">
            Fields marked <span className="text-red-500">*</span> are required.
            First Name, Last Name, NIC, Gender, Birth Day, and Exam Year are
            locked.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
