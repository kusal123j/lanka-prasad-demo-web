import React, {
  useEffect,
  useState,
  useContext,
  useMemo,
  memo, // add memo
} from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// MOVE InputField OUTSIDE and memoize it
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
        className="block mb-1 text-sm font-medium text-gray-700"
      >
        {label || placeholder}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div
        className={`relative flex items-center transition-all duration-200 ${
          disabled ? "bg-gray-50" : "bg-white"
        } border-2 ${
          disabled
            ? "border-gray-200"
            : "border-gray-200 group-hover:border-blue-300 focus-within:border-blue-500"
        } rounded-xl p-3 shadow-sm`}
      >
        <Icon
          className={`w-5 h-5 mr-3 transition-colors ${
            disabled
              ? "text-gray-400"
              : "text-gray-500 group-focus-within:text-blue-500"
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
            className="w-full outline-none bg-transparent text-gray-700 font-medium"
          >
            <option value="" disabled>
              {placeholder || `Select ${label || name}`}
            </option>
            {options.map((option) => (
              <option key={option} value={option}>
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
            className={`w-full outline-none bg-transparent text-gray-700 font-medium placeholder-gray-400 ${
              disabled ? "cursor-not-allowed" : ""
            }`}
          />
        )}
      </div>
    </div>
  );
});

const CompleteProfile = () => {
  const { backend_url, getUserData } = useContext(AppContext);
  const GET_PROFILE_ENDPOINT = "/api/user/profile"; // GET
  const UPDATE_PROFILE_ENDPOINT = "/api/user/update-profile"; // PUT

  const [profile, setProfile] = useState({
    name: "",
    lastname: "",
    email: "",
    phonenumber: "",
    GuardianName: "",
    GuardianPhonenumber: "",
    Address: "",
    Gender: "",
    NIC: "",
    School: "",
    ExamYear: "",
    District: "",
  });

  const [initialProfile, setInitialProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const Navigate = useNavigate();
  // Predefined options
  const genders = ["Male", "Female"];
  const examYears = ["2025", "2026", "2027"];
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

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${backend_url}${GET_PROFILE_ENDPOINT}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setProfile(res.data.userData || {});
        setInitialProfile(res.data.userData || {});
        getUserData();
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

  // Simple sanitizers for better input UX
  const sanitize = {
    phonenumber: (v) => v.replace(/\D/g, "").slice(0, 10),
    GuardianPhonenumber: (v) => v.replace(/\D/g, "").slice(0, 10),
    NIC: (v) => v.replace(/\s/g, "").toUpperCase().slice(0, 12),
    name: (v) => v.replace(/[^\p{L}\s'-]/gu, "").slice(0, 50),
    lastname: (v) => v.replace(/[^\p{L}\s'-]/gu, "").slice(0, 50),
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const clean = sanitize[name] ? sanitize[name](value) : value;
    setProfile((prev) => ({ ...prev, [name]: clean }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await axios.put(
        `${backend_url}${UPDATE_PROFILE_ENDPOINT}`,
        profile,
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success("Profile updated successfully!");
        setInitialProfile(profile);
        getUserData();
        Navigate("/student/dashboard");
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

  const isDirty = useMemo(() => {
    if (!initialProfile) return false;
    return JSON.stringify(profile) !== JSON.stringify(initialProfile);
  }, [profile, initialProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Complete Profile Info
          </h1>
          <p className="text-gray-600 text-lg">
            Update your personal information to access Student Dashboard
          </p>
        </div>

        {/* Single parent form only */}
        <form onSubmit={handleUpdate} className="space-y-8">
          {/* Personal Information Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-3 rounded-xl mr-4">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Personal Information
                </h2>
                <p className="text-gray-600">Your basic personal details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InputField
                icon={User}
                name="name"
                label="First Name"
                placeholder="First Name"
                value={profile.name}
                onChange={handleChange}
                autoComplete="given-name"
                maxLength={50}
              />
              <InputField
                icon={UserCheck}
                name="lastname"
                label="Last Name"
                placeholder="Last Name"
                value={profile.lastname}
                onChange={handleChange}
                autoComplete="family-name"
                maxLength={50}
              />
              <InputField
                icon={Mail}
                name="email"
                type="email"
                label="Email Address"
                placeholder="Email Address"
                value={profile.email}
                onChange={handleChange}
                disabled={true}
                autoComplete="email"
                required={false}
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
                placeholder="Select Gender"
                value={profile.Gender}
                onChange={handleChange}
                options={genders}
              />

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
            <div className="mt-6">
              <InputField
                icon={Shield}
                name="NIC"
                label="National ID Number"
                placeholder="e.g., 923456789V or 200012345678"
                value={profile.NIC}
                onChange={handleChange}
                maxLength={12}
                pattern="^(\d{9}[VX]|(\d{12}))$"
                title="Old NIC: 9 digits + V/X (e.g., 923456789V). New NIC: 12 digits (e.g., 200012345678)."
              />
              <p className="text-gray-600 text-lg font-semibold mt-2 bg-amber-200 p-3 rounded-2xl">
                ⛔ ඔබ ලියාපදිංචි වීමෙන් පසු ජාතික හැඳුනුම්පත් අංකය වෙනස් කළ
                නොහැක.වෙනත් අයෙකුගේ ජාතික හැඳුනුම්පතක් ඇතුලත් කිරීමෙන් වලකින්න.
              </p>
            </div>
          </div>

          {/* Guardian Information Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="bg-green-100 p-3 rounded-xl mr-4">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Guardian Information
                </h2>
                <p className="text-gray-600">
                  Details of your parent or guardian
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                icon={Users}
                name="GuardianName"
                label="Guardian's Full Name"
                placeholder="Guardian's Full Name"
                value={profile.GuardianName}
                onChange={handleChange}
                maxLength={60}
                autoComplete="name"
              />
              <InputField
                icon={Phone}
                name="GuardianPhonenumber"
                type="tel"
                label="Guardian's Phone Number"
                placeholder="07XXXXXXXX"
                value={profile.GuardianPhonenumber}
                onChange={handleChange}
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                pattern="^\d{10}$"
                title="Enter a 10-digit phone number"
              />
            </div>
          </div>

          {/* Education Information Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="bg-purple-100 p-3 rounded-xl mr-4">
                <GraduationCap className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Education Information
                </h2>
                <p className="text-gray-600">
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
                icon={Calendar}
                name="ExamYear"
                label="Exam Year"
                placeholder="Select Exam Year"
                value={profile.ExamYear}
                onChange={handleChange}
                options={examYears}
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
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={updating || !isDirty}
              className="group relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100 transition-all duration-200 min-w-[200px]"
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
                    {isDirty ? "Complete Profile" : "No Changes"}
                  </>
                )}
              </div>
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            All fields marked with <span className="text-red-500">*</span> are
            required.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
