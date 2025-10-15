import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  BookOpen,
  Users,
  Award,
  Target,
  CalendarDays,
  MapPin,
  Phone,
  School,
  Building2,
  Globe,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../Context/AppContext";
import heroimage from "../assets/heroimage.jpg";

const Steps = {
  CHECK: "check",
  REGISTER: "register",
  LOGIN: "login",
  VERIFY_OTP: "verifyOtp",
  NIC_Verify: "nicverify",
  Submit_Other_Details: "other",
  FORGOT_PASSWORD: "forgotPassword",
  RESET_PASSWORD_OTP: "resetPasswordOtp",
};

const OTP_LENGTH = 6;

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(Steps.CHECK);
  const [focusedField, setFocusedField] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ExamYear, setExamYear] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phonenumber, setPhonenumber] = useState("");
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");

  // NIC section
  const [BirthDay, setBirthDay] = useState("");
  const [Gender, setGender] = useState("");

  // Forgot password
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Other Details
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [district, setDistrict] = useState("");
  const [stream, setStream] = useState("");
  const [institute, setInstitute] = useState("Online");

  // OTP Verification improvements from new version
  const inputRefs = useRef([]);
  const [otp, setOtp] = useState(new Array(OTP_LENGTH).fill(""));
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const intervalRef = useRef(null);

  const { backend_url, getUserData, setIsuserloggedIn, userData } =
    useContext(AppContext);

  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  // Redirect if already authenticated and verified
  useEffect(() => {
    if (userData && userData.isAccountVerifyed) {
      navigate("/");
    }
  }, [userData, navigate]);

  // Resend timer tick
  useEffect(() => {
    if (resendTimer <= 0) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1000) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [resendTimer]);

  const formatTimer = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // OTP input handlers (from new version)
  const handleInput = (e, index) => {
    const value = e.target.value;
    if (!/^[0-9]?$/.test(value)) return;
    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const nextOtp = [...otp];
        nextOtp[index] = "";
        setOtp(nextOtp);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").slice(0, OTP_LENGTH);
    if (!/^\d+$/.test(paste)) return;
    const nextOtp = new Array(OTP_LENGTH).fill("");
    for (let i = 0; i < paste.length; i++) nextOtp[i] = paste[i];
    setOtp(nextOtp);
    const nextIndex = paste.length < OTP_LENGTH ? paste.length : OTP_LENGTH - 1;
    inputRefs.current[nextIndex]?.focus();
  };

  // Step: CHECK — check if user is registered by phone
  const checkRegister = async (e) => {
    e.preventDefault();

    const phoneRegex = /^07\d{8}$/;
    if (!phoneRegex.test(phonenumber)) {
      toast.error(
        "Invalid Phone Number: Phone number must start with 07 and be 10 digits long."
      );
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await axios.post(
        `${backend_url}/api/auth/is-user-registered`,
        { phonenumber }
      );

      setStep(data.success ? Steps.LOGIN : Steps.REGISTER);
    } catch (err) {
      toast.error("Check User failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step: REGISTER — create account, then move to VERIFY_OTP
  const handleRegister = async (e) => {
    e?.preventDefault();
    if (isLoading) return;

    const phoneRegex = /^07\d{8}$/;
    if (!phoneRegex.test(phonenumber)) {
      toast.error(
        "Invalid Phone Number: must start with 07 and be 10 digits long."
      );
      return;
    }
    const allowedYears = ["2026", "2027"];
    if (!allowedYears.includes(ExamYear)) {
      alert("Please select a valid Exam Year (2026, or 2027).");
      return;
    }
    if (password.length < 6) {
      toast.error("Weak Password: must be at least 6 characters.");
      return;
    }
    const formFields = {
      name,
      lastname,
      ExamYear,
      phonenumber,
      password,
      BirthDay,
      Gender,

      address,
      School: schoolName,
      District: district,
      stream,
      institute,
      whatsapp,
    };

    for (const [key, value] of Object.entries(formFields)) {
      if (!value || (typeof value === "string" && value.trim() === "")) {
        toast.error(`Field "${key}" is required.`);
        return;
      }
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("lastname", lastname);
      formData.append("ExamYear", ExamYear);
      formData.append("phonenumber", phonenumber);
      formData.append("password", password);
      formData.append("BirthDay", BirthDay);
      formData.append("Gender", Gender);
      formData.append("Address", address);
      formData.append("School", schoolName);
      formData.append("District", district);
      formData.append("stream", stream);
      formData.append("institute", institute);
      formData.append("whatsapp", whatsapp);

      const { data } = await axios.post(
        `${backend_url}/api/auth/register`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (data.success) {
        toast.success(
          data.message || "Registration successful! Please verify the OTP."
        );
        setStep(Steps.VERIFY_OTP);
        setResendTimer(2 * 60 * 1000);
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step: LOGIN — sign in existing user (from new version with improvements)
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await axios.post(`${backend_url}/api/auth/login`, {
        phonenumber,
        password,
      });

      if (data.success) {
        await getUserData();
        setIsuserloggedIn(true);
        navigate("/student/dashboard");
        toast.success("Login successful!");
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error(
          "You can enter correct credentials 5 times within 5 minutes. Try again in 5 minutes."
        );
      } else {
        toast.error(err.response?.data?.message || err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password — send OTP (from new version)
  const handleForgotPasswordSendOTP = async () => {
    const phoneRegex = /^07\d{8}$/;
    if (!phoneRegex.test(phonenumber)) {
      toast.error(
        "Invalid Phone Number: must start with 07 and be 10 digits long."
      );
      return;
    }
    try {
      setIsLoading(true);
      const { data } = await axios.post(
        `${backend_url}/api/auth/send-reset-otp`,
        { phonenumber }
      );

      if (data.success) {
        toast.success(data.message || "OTP sent successfully!");
        setOtp(new Array(OTP_LENGTH).fill(""));
        setNewPassword("");
        setConfirmNewPassword("");
        setResendTimer(2 * 60 * 1000);
        setStep(Steps.RESET_PASSWORD_OTP);
      } else {
        toast.error(data.message || "Failed to send OTP.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password — submit new password with OTP (from new version)
  const onSubmitResetPassword = async (e) => {
    e.preventDefault();
    const finalOtp = otp.join("");
    if (finalOtp.length !== OTP_LENGTH) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      const { data } = await axios.post(
        `${backend_url}/api/auth/reset-password`,
        { phonenumber, otp: finalOtp, newPassword }
      );

      if (data.success) {
        toast.success(
          data.message || "Password reset successfully! Please login."
        );
        setPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setOtp(new Array(OTP_LENGTH).fill(""));
        setResendTimer(0);
        setStep(Steps.LOGIN);
      } else {
        toast.error(data.message || "Password reset failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password — resend OTP (from new version)
  const resendResetOTP = async () => {
    try {
      setIsResending(true);
      const { data } = await axios.post(
        `${backend_url}/api/auth/send-reset-otp`,
        {
          phonenumber,
        }
      );
      if (data.success) {
        toast.success("OTP resent successfully!");
        setResendTimer(2 * 60 * 1000);
      } else {
        toast.error(data.message || "Failed to resend OTP.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsResending(false);
    }
  };

  const goBackToCheck = () => {
    setStep(Steps.CHECK);
    setPassword("");
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-black via-neutral-900 to-black text-white relative">
      {/* Background accents */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-72 h-72 bg-red-600 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 w-96 h-96 bg-red-700 rounded-full blur-3xl opacity-20 animate-pulse"
        style={{ animationDelay: "1.5s" }}
      ></div>
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white rounded-full blur-[100px] opacity-[0.04]"></div>

      {/* Left Side - Image */}
      <div className="hidden md:flex md:w-1/2 relative flex-col items-center h-screen overflow-hidden">
        <img
          src={heroimage}
          alt="Login Visual"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
      </div>

      {/* Right Side - Auth Area */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Step: CHECK */}
          {step === Steps.CHECK && (
            <>
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold mb-3">Get Started</h2>
                <p className="text-gray-300">
                  Join our learning community today
                </p>
              </div>
              <form onSubmit={checkRegister} className="space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg
                        className={`w-5 h-5 transition-colors ${
                          focusedField === "phone"
                            ? "text-red-500"
                            : "text-neutral-500"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      id="tel"
                      name="tel"
                      autoComplete="tel"
                      inputMode="numeric"
                      placeholder="07XXXXXXXX"
                      maxLength={10}
                      value={phonenumber}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "");
                        if (value.length > 10) return;
                        if (value.length === 1 && value !== "0") return;
                        if (value.length === 2 && value !== "07") return;
                        setPhonenumber(value);
                      }}
                      onFocus={() => setFocusedField("phone")}
                      onBlur={() => setFocusedField("")}
                      className="w-full pl-12 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Get Started</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step: REGISTER */}
          {step === Steps.REGISTER && (
            <>
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold mb-3">Create Account</h2>
                <p className="text-gray-300">
                  Join our learning community today
                </p>
              </div>

              <div className="space-y-6">
                {/* Name */}
                <div className="flex gap-6">
                  <div className="group w-1/2">
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg
                          className={`w-5 h-5 transition-colors ${
                            focusedField === "name"
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="First Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onFocus={() => setFocusedField("name")}
                        onBlur={() => setFocusedField("")}
                        className="w-full pl-12 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="group w-1/2">
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg
                          className={`w-5 h-5 transition-colors ${
                            focusedField === "lastname"
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                        onFocus={() => setFocusedField("lastname")}
                        onBlur={() => setFocusedField("")}
                        className="w-full pl-12 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm font-medium text-gray-200">
                    Phone Number
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <input
                      type="tel"
                      value={phonenumber}
                      disabled
                      className="w-full pl-10 pr-24 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-gray-300"
                    />
                    <button
                      type="button"
                      onClick={goBackToCheck}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 text-sm font-medium hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Exam Year
                  </label>
                  <div className="relative">
                    <CalendarDays
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                        focusedField === "ExamYear"
                          ? "text-red-500"
                          : "text-gray-400"
                      }`}
                    />
                    <select
                      value={ExamYear}
                      onChange={(e) => setExamYear(e.target.value)}
                      onFocus={() => setFocusedField("ExamYear")}
                      onBlur={() => setFocusedField("")}
                      className="w-full pl-10 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white"
                      required
                    >
                      <option value="">Select Exam Year</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>

                {/* Password */}
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField("")}
                      className="w-full pl-12 pr-12 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={() => {
                    const nameRegex = /^[A-Za-z\s\-]{2,15}$/;

                    if (!nameRegex.test(name)) {
                      toast.error(
                        "First name must be 2–15 letters (letters, spaces, or hyphens only)."
                      );
                      return;
                    }
                    if (!nameRegex.test(lastname)) {
                      toast.error(
                        "Last name must be 2–15 letters (letters, spaces, or hyphens only)."
                      );
                      return;
                    }

                    const phoneRegex = /^07\d{8}$/;
                    if (!phoneRegex.test(phonenumber)) {
                      toast.error(
                        "Invalid Phone Number: must start with 07 and be 10 digits long."
                      );
                      return;
                    }
                    const allowedYears = ["2026", "2027"];
                    if (!allowedYears.includes(ExamYear)) {
                      alert("Please select a valid Exam Year (2026, or 2027).");
                      return;
                    }
                    if (password.length < 6) {
                      toast.error(
                        "Weak Password: must be at least 6 characters."
                      );
                      return;
                    }
                    setStep(Steps.NIC_Verify);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* Step: Submit Other Details */}
          {step === Steps.Submit_Other_Details && (
            <>
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-4xl font-bold mb-3">Other Details</h2>
                  <p className="text-gray-300">Enter your other details</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                  {/* Address */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Address
                    </label>
                    <div className="relative">
                      <MapPin
                        className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                          focusedField === "address"
                            ? "text-red-500"
                            : "text-gray-400"
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="Enter your address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onFocus={() => setFocusedField("address")}
                        onBlur={() => setFocusedField("")}
                        className="w-full pl-10 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* School Name */}
                    <div className="group w-1/2">
                      <label className="block text-sm font-semibold text-gray-200 mb-2">
                        School Name
                      </label>
                      <div className="relative">
                        <School
                          className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                            focusedField === "school"
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="Enter your school name"
                          value={schoolName}
                          maxLength={50}
                          onChange={(e) => setSchoolName(e.target.value)}
                          onFocus={() => setFocusedField("school")}
                          onBlur={() => setFocusedField("")}
                          className="w-full pl-10 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                          required
                        />
                      </div>
                    </div>
                    {/* WhatsApp No */}
                    <div className="group w-1/2">
                      <label className="block text-sm font-semibold text-gray-200 mb-2">
                        WhatsApp No (10 digits)
                      </label>
                      <div className="relative">
                        <Phone
                          className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                            focusedField === "whatsapp"
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                        />
                        <input
                          type="tel"
                          placeholder="07XXXXXXXX"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          maxLength={10}
                          pattern="[0-9]{10}"
                          onFocus={() => setFocusedField("whatsapp")}
                          onBlur={() => setFocusedField("")}
                          className="w-full pl-10 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-8">
                    {/* District */}
                    <div className="group w-1/2">
                      <label className="block text-sm font-semibold text-gray-200 mb-2">
                        District
                      </label>
                      <div className="relative">
                        <Globe
                          className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                            focusedField === "district"
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                        />
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          onFocus={() => setFocusedField("district")}
                          onBlur={() => setFocusedField("")}
                          className="w-full pl-10 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white"
                          required
                        >
                          <option value="">Select District</option>
                          <option value="Ampara">Ampara</option>
                          <option value="Anuradhapura">Anuradhapura</option>
                          <option value="Badulla">Badulla</option>
                          <option value="Batticaloa">Batticaloa</option>
                          <option value="Colombo">Colombo</option>
                          <option value="Galle">Galle</option>
                          <option value="Gampaha">Gampaha</option>
                          <option value="Hambantota">Hambantota</option>
                          <option value="Jaffna">Jaffna</option>
                          <option value="Kalutara">Kalutara</option>
                          <option value="Kandy">Kandy</option>
                          <option value="Kegalle">Kegalle</option>
                          <option value="Kilinochchi">Kilinochchi</option>
                          <option value="Kurunegala">Kurunegala</option>
                          <option value="Mannar">Mannar</option>
                          <option value="Matale">Matale</option>
                          <option value="Matara">Matara</option>
                          <option value="Monaragala">Monaragala</option>
                          <option value="Mullaitivu">Mullaitivu</option>
                          <option value="Nuwara Eliya">Nuwara Eliya</option>
                          <option value="Polonnaruwa">Polonnaruwa</option>
                          <option value="Puttalam">Puttalam</option>
                          <option value="Ratnapura">Ratnapura</option>
                          <option value="Trincomalee">Trincomalee</option>
                          <option value="Vavuniya">Vavuniya</option>
                        </select>
                      </div>
                    </div>

                    {/* A/L Stream */}
                    <div className="group w-1/2">
                      <label className="block text-sm font-semibold text-gray-200 mb-2">
                        A/L Stream
                      </label>
                      <div className="relative">
                        <BookOpen
                          className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                            focusedField === "stream"
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                        />
                        <select
                          value={stream}
                          onChange={(e) => setStream(e.target.value)}
                          onFocus={() => setFocusedField("stream")}
                          onBlur={() => setFocusedField("")}
                          className="w-full pl-10 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white"
                          required
                        >
                          <option value="">Select Stream</option>
                          <option value="Maths + ICT">Maths + ICT</option>
                          <option value="Commerce + ICT">Commerce + ICT</option>
                          <option value="ART + ICT">ART + ICT</option>
                          <option value="E TECH">E TECH</option>
                          <option value="B TECH">B TECH</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Institute */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Institute
                    </label>
                    <div className="relative">
                      <Building2
                        className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                          focusedField === "institute"
                            ? "text-red-500"
                            : "text-gray-400"
                        }`}
                      />
                      <select
                        value={institute}
                        onChange={(e) => setInstitute(e.target.value)}
                        onFocus={() => setFocusedField("institute")}
                        onBlur={() => setFocusedField("")}
                        className="w-full pl-10 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white"
                        required
                      >
                        <option value="Online">Online</option>
                        <option value="SyZyGy - Gampaha">
                          SyZyGy - Gampaha
                        </option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-5">
                    <button
                      type="button"
                      onClick={() => setStep(Steps.NIC_Verify)}
                      className="w-full bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded-xl transition"
                    >
                      Back to NIC
                    </button>
                    {/* Register Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Register</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* Step: LOGIN (With new version improvements) */}
          {step === Steps.LOGIN && (
            <>
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold mb-3">Login Account</h2>
                <p className="text-gray-300">
                  Join our learning community today
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {/* Phone (from check step) */}
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg
                        className={`w-5 h-5 transition-colors ${
                          focusedField === "phone"
                            ? "text-red-500"
                            : "text-neutral-500"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      name="tel"
                      id="tel"
                      autoComplete="tel"
                      placeholder="07XXXXXXXX"
                      maxLength={10}
                      value={phonenumber}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "");
                        if (value.length > 10) return;
                        if (value.length === 1 && value !== "0") return;
                        if (value.length === 2 && value !== "07") return;
                        setPhonenumber(value);
                      }}
                      onFocus={() => setFocusedField("phone")}
                      onBlur={() => setFocusedField("")}
                      className="w-full pl-12 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={goBackToCheck}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 text-sm font-medium hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-sm font-medium text-gray-200 ">
                    Password
                  </label>
                  <div className="relative top-2">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      autoComplete="current-password"
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setStep(Steps.FORGOT_PASSWORD)}
                    className="text-sm text-red-500 hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Login</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step: FORGOT PASSWORD (From new version) */}
          {step === Steps.FORGOT_PASSWORD && (
            <>
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
                  Forgot Password
                </h2>
                <p className="text-gray-300">
                  We'll send a 6-digit OTP to your mobile to reset your
                  password.
                </p>
              </div>

              <div className="space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg
                        className={`w-5 h-5 transition-colors ${
                          focusedField === "phone"
                            ? "text-red-500"
                            : "text-neutral-500"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      placeholder="07XXXXXXXX"
                      maxLength={10}
                      autoComplete="current-phonenumber"
                      value={phonenumber}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "");
                        if (value.length > 10) return;
                        if (value.length === 1 && value !== "0") return;
                        if (value.length === 2 && value !== "07") return;
                        setPhonenumber(value);
                      }}
                      onFocus={() => setFocusedField("phone")}
                      onBlur={() => setFocusedField("")}
                      className="w-full pl-12 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleForgotPasswordSendOTP}
                  disabled={isLoading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center"
                >
                  {isLoading ? "Please wait..." : "Send OTP"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(Steps.LOGIN)}
                  className="w-full bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded-xl transition"
                >
                  Back to Login
                </button>
              </div>
            </>
          )}

          {/* Step: RESET PASSWORD (From new version) */}
          {step === Steps.RESET_PASSWORD_OTP && (
            <div className="w-full max-w-md mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
                  Reset Password
                </h2>
                <p className="text-gray-300">
                  Enter the 6-digit OTP sent to{" "}
                  <span className="font-semibold text-white">
                    {phonenumber}
                  </span>{" "}
                  and set a new password.
                </p>
              </div>

              <form onSubmit={onSubmitResetPassword} className="space-y-6">
                {/* OTP Inputs */}
                <div>
                  <label className="text-sm font-medium text-gray-200">
                    OTP Code
                  </label>
                  <div
                    className="flex justify-center gap-3 mt-2"
                    onPaste={handlePaste}
                  >
                    {otp.map((value, index) => (
                      <input
                        key={index}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={value}
                        maxLength={1}
                        className="w-12 h-14 text-xl text-center bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                        ref={(el) => (inputRefs.current[index] = el)}
                        onChange={(e) => handleInput(e, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                      />
                    ))}
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="text-sm font-medium text-gray-200">
                    New Password
                  </label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-sm font-medium text-gray-200">
                    Confirm Password
                  </label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-neutral-900 border border-neutral-700 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 text-white placeholder-neutral-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmNewPassword(!showConfirmNewPassword)
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resendResetOTP}
                    disabled={resendTimer > 0 || isResending}
                    className={`flex-1 border bg-white text-black border-gray-300 py-3 rounded-xl font-medium transition-all ${
                      resendTimer > 0 || isResending
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {resendTimer > 0
                      ? `Resend OTP in ${formatTimer(resendTimer)}`
                      : "Resend OTP"}
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Bottom right label */}
          <div className="absolute bottom-4 right-4 z-10">
            <p className="inline-block px-4 py-2 text-text text-sm rounded-xl font-medium shadow-sm hover:shadow-md transition-all">
              Developed by{" "}
              <span className="text-red-600 font-bold hover:underline cursor-pointer">
                KJ Developers
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
