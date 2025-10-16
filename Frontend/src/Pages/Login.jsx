import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  BookOpen,
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
  Submit_Other_Details: "other",
  FORGOT_PASSWORD: "forgotPassword",
  Tute_Details: "tuteDetails",
  RESET_PASSWORD_OTP: "resetPasswordOtp",
};

const OTP_LENGTH = 6;

// Frontend validations aligned with backend
const allowedExamYears = [
  "grade-6",
  "grade-7",
  "grade-8",
  "grade-9",
  "grade-10",
  "grade-11",
];
const allowedGenders = ["Male", "Female", "Other"];
const phoneRegex = /^[0-9]{10}$/;
const nameRegex = /^[A-Za-z\s\-]{2,15}$/;
const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

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

  // Forgot password
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Tute Delivery + Other Details
  const [address, setAddress] = useState("");
  const [tuteDliveryPhoennumebr1, setTuteDliveryPhoennumebr1] = useState("");
  const [tuteDliveryPhoennumebr2, setTuteDliveryPhoennumebr2] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [district, setDistrict] = useState("");
  const [Gender, setGender] = useState(""); // "Male" | "Female" | "Other"
  const [BirthDay, setBirthDay] = useState(""); // "YYYY-MM-DD"

  // OTP (for reset password only)
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

  // Redirect if already authenticated (optional)
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

  // OTP input handlers
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

    if (!phoneRegex.test(phonenumber)) {
      toast.error("Invalid Phone Number: must be 10 digits.");
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
      toast.error(
        "Check User failed: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Transition from basic register info to details step (client-side checks)
  const goToDetailsStep = () => {
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
    if (!phoneRegex.test(phonenumber)) {
      toast.error("Invalid Phone Number: must be 10 digits.");
      return;
    }
    if (!allowedExamYears.includes(ExamYear)) {
      toast.error(
        `Please select a valid Exam Year (${allowedExamYears.join(", ")}).`
      );
      return;
    }
    if (password.length < 6) {
      toast.error("Weak Password: must be at least 6 characters.");
      return;
    }
    setStep(Steps.Tute_Details);
  };

  // Step: REGISTER — submit full registration
  const handleRegister = async (e) => {
    e?.preventDefault();
    if (isLoading) return;

    // Required fields map to backend schema
    const payload = {
      name: name?.trim(),
      lastname: lastname?.trim(),
      ExamYear,
      phonenumber,
      password,
      Address: address?.trim(),
      School: schoolName?.trim(),
      District: district?.trim(),
      Gender,
      BirthDay,
      tuteDliveryPhoennumebr1,
      tuteDliveryPhoennumebr2,
    };

    // Presence checks
    for (const [key, value] of Object.entries(payload)) {
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        toast.error(`Field "${key}" is required.`);
        return;
      }
    }

    // Validate names
    if (!nameRegex.test(payload.name)) {
      toast.error("Invalid first name (2–15 letters).");
      return;
    }
    if (!nameRegex.test(payload.lastname)) {
      toast.error("Invalid last name (2–15 letters).");
      return;
    }

    // Validate exam year and gender
    if (!allowedExamYears.includes(String(payload.ExamYear))) {
      toast.error(
        `Invalid Exam Year. Allowed: ${allowedExamYears.join(", ")}.`
      );
      return;
    }
    if (!allowedGenders.includes(payload.Gender)) {
      toast.error("Invalid Gender value.");
      return;
    }

    // Validate phone numbers
    if (!phoneRegex.test(payload.phonenumber)) {
      toast.error("Invalid phone number (must be 10 digits).");
      return;
    }
    if (
      !phoneRegex.test(payload.tuteDliveryPhoennumebr1) ||
      !phoneRegex.test(payload.tuteDliveryPhoennumebr2)
    ) {
      toast.error("Invalid tute delivery phone number(s) (must be 10 digits).");
      return;
    }
    if (payload.tuteDliveryPhoennumebr1 === payload.tuteDliveryPhoennumebr2) {
      toast.error(
        "tuteDliveryPhoennumebr1 and tuteDliveryPhoennumebr2 must be different."
      );
      return;
    }

    // Validate BirthDay format
    if (!isIsoDate(payload.BirthDay)) {
      toast.error("Invalid BirthDay format (use YYYY-MM-DD).");
      return;
    }

    // Password
    if (String(payload.password).length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await axios.post(
        `${backend_url}/api/auth/register`,
        payload
      );

      if (data.success) {
        toast.success("Registration successful! Please login.");
        setStep(Steps.LOGIN);
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step: LOGIN — sign in existing user
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phoneRegex.test(phonenumber)) {
      toast.error("Invalid Phone Number: must be 10 digits.");
      return;
    }
    if (!password || password.length < 1) {
      toast.error("Please enter your password.");
      return;
    }

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

  // Forgot Password — send OTP
  const handleForgotPasswordSendOTP = async () => {
    if (!phoneRegex.test(phonenumber)) {
      toast.error("Invalid Phone Number: must be 10 digits.");
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

  // Forgot Password — submit new password with OTP
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
        toast.success("Password reset successfully! Please login.");
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

  const resendResetOTP = async () => {
    try {
      setIsResending(true);
      const { data } = await axios.post(
        `${backend_url}/api/auth/send-reset-otp`,
        { phonenumber }
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

  // Placeholder return (UI/JSX will be provided in the next step)
  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-sky-50 via-emerald-50 to-amber-50 text-slate-900 relative">
      {/* Soft colorful background glows */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-72 h-72 bg-blue-300/30 rounded-full blur-3xl animate-pulse"></div>
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 w-96 h-96 bg-emerald-300/30 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1.5s" }}
      ></div>
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-300/30 rounded-full blur-[100px]"></div>

      {/* Left Side - Hero Image */}
      <div className="hidden md:flex md:w-1/2 relative flex-col items-center h-screen overflow-hidden">
        <img
          src={heroimage}
          alt="Learning Journey"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sky-600/20 via-emerald-600/20 to-amber-600/20" />
        <div className="absolute bottom-10 left-8 right-8 bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-lg">
          <h3 className="text-xl font-bold text-slate-800">
            Welcome to your study space
          </h3>
          <p className="text-slate-600 text-sm mt-1">
            Learn smarter, track progress, and access resources anywhere.
          </p>
        </div>
      </div>

      {/* Right Side - Auth Area */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md md:max-w-lg">
          {/* Step: CHECK */}
          {step === Steps.CHECK && (
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-7">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 via-emerald-100 to-amber-100 text-slate-700 text-xs font-semibold mb-3">
                  <span>Step 1 of 3</span>
                </div>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-emerald-600 to-amber-600 bg-clip-text text-transparent">
                  Get Started
                </h2>
                <p className="text-slate-600 mt-1">
                  Enter your phone number to continue
                </p>
              </div>

              <form onSubmit={checkRegister} className="space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                        focusedField === "phone"
                          ? "text-blue-600"
                          : "text-slate-400"
                      }`}
                    />
                    <input
                      type="tel"
                      id="tel"
                      name="tel"
                      autoComplete="tel"
                      inputMode="numeric"
                      placeholder="07XXXXXXXX"
                      maxLength={10}
                      value={phonenumber}
                      onChange={(e) =>
                        setPhonenumber(
                          e.target.value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                      onFocus={() => setFocusedField("phone")}
                      onBlur={() => setFocusedField("")}
                      className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-slate-900 placeholder-slate-400"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 hover:brightness-110 text-white font-semibold py-3 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Step: REGISTER */}
          {step === Steps.REGISTER && (
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-7">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 via-emerald-100 to-amber-100 text-slate-700 text-xs font-semibold mb-3">
                  <span>Step 1 of 3</span>
                </div>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-emerald-600 to-amber-600 bg-clip-text text-transparent">
                  Create your account
                </h2>
                <p className="text-slate-600 mt-1">Tell us a bit about you</p>
              </div>

              <div className="space-y-6">
                {/* First/Last Name */}
                <div className="flex gap-4 flex-col sm:flex-row">
                  <div className="group w-full">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <svg
                        className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${
                          focusedField === "name"
                            ? "text-blue-600"
                            : "text-slate-400"
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
                      <input
                        type="text"
                        placeholder="First name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onFocus={() => setFocusedField("name")}
                        onBlur={() => setFocusedField("")}
                        className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="group w-full">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <svg
                        className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${
                          focusedField === "lastname"
                            ? "text-blue-600"
                            : "text-slate-400"
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
                      <input
                        type="text"
                        placeholder="Last name"
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                        onFocus={() => setFocusedField("lastname")}
                        onBlur={() => setFocusedField("")}
                        className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Phone - locked */}
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Phone Number
                  </label>
                  <div className="relative mt-2">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={phonenumber}
                      disabled
                      className="w-full pl-10 pr-28 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={goBackToCheck}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-sm font-medium hover:underline px-2 py-1"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Exam Year */}
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Exam Year
                  </label>
                  <div className="relative">
                    <CalendarDays
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                        focusedField === "ExamYear"
                          ? "text-blue-600"
                          : "text-slate-400"
                      }`}
                    />
                    <select
                      value={ExamYear}
                      onChange={(e) => setExamYear(e.target.value)}
                      onFocus={() => setFocusedField("ExamYear")}
                      onBlur={() => setFocusedField("")}
                      className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      required
                    >
                      <option value="">Select your grade</option>
                      {allowedExamYears.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.replace("-", " ").replace("grade", "Grade")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password */}
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField("")}
                      className="w-full pl-10 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Next */}
                <button
                  onClick={goToDetailsStep}
                  className="w-full bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 hover:brightness-110 text-white font-semibold py-3 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step: Tute Details / Complete Profile */}
          {step === Steps.Tute_Details && (
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-7">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 via-emerald-100 to-amber-100 text-slate-700 text-xs font-semibold mb-3">
                  <span>Step 2 of 3</span>
                </div>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-emerald-600 to-amber-600 bg-clip-text text-transparent">
                  Complete your details
                </h2>
                <p className="text-slate-600 mt-1">
                  We’ll set up your student profile
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                {/* Address */}
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin
                      className={`absolute left-3 top-3 w-5 h-5 ${
                        focusedField === "address"
                          ? "text-blue-600"
                          : "text-slate-400"
                      }`}
                    />
                    <textarea
                      placeholder="Enter your address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onFocus={() => setFocusedField("address")}
                      onBlur={() => setFocusedField("")}
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      required
                    />
                  </div>
                </div>

                {/* Tute Delivery Phones */}
                <div className="flex gap-4 flex-col sm:flex-row">
                  <div className="group w-full">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Tute Delivery Phone 1
                    </label>
                    <div className="relative">
                      <Phone
                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                          focusedField === "tdp1"
                            ? "text-blue-600"
                            : "text-slate-400"
                        }`}
                      />
                      <input
                        type="tel"
                        placeholder="07XXXXXXXX"
                        value={tuteDliveryPhoennumebr1}
                        maxLength={10}
                        onChange={(e) =>
                          setTuteDliveryPhoennumebr1(
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        onFocus={() => setFocusedField("tdp1")}
                        onBlur={() => setFocusedField("")}
                        className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="group w-full">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Tute Delivery Phone 2
                    </label>
                    <div className="relative">
                      <Phone
                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                          focusedField === "tdp2"
                            ? "text-blue-600"
                            : "text-slate-400"
                        }`}
                      />
                      <input
                        type="tel"
                        placeholder="07XXXXXXXX"
                        value={tuteDliveryPhoennumebr2}
                        maxLength={10}
                        onChange={(e) =>
                          setTuteDliveryPhoennumebr2(
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        onFocus={() => setFocusedField("tdp2")}
                        onBlur={() => setFocusedField("")}
                        className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(Steps.REGISTER)}
                    className="w-1/2 bg-white hover:bg-slate-50 text-slate-800 font-medium py-3 rounded-2xl border border-slate-200 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setStep(Steps.Submit_Other_Details);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 hover:brightness-110 text-white font-semibold py-3 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step: Tute Details / Complete Profile */}
          {step === Steps.Submit_Other_Details && (
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-7">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 via-emerald-100 to-amber-100 text-slate-700 text-xs font-semibold mb-3">
                  <span>Step 3 of 3</span>
                </div>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-emerald-600 to-amber-600 bg-clip-text text-transparent">
                  Complete your details
                </h2>
                <p className="text-slate-600 mt-1">
                  We’ll set up your student profile
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                {/* School + District */}
                <div className="flex gap-4 flex-col sm:flex-row">
                  <div className="group w-full">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      School
                    </label>
                    <div className="relative">
                      <School
                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                          focusedField === "school"
                            ? "text-blue-600"
                            : "text-slate-400"
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="Your school name"
                        value={schoolName}
                        maxLength={60}
                        onChange={(e) => setSchoolName(e.target.value)}
                        onFocus={() => setFocusedField("school")}
                        onBlur={() => setFocusedField("")}
                        className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="group w-full">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      District
                    </label>
                    <div className="relative">
                      <Globe
                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                          focusedField === "district"
                            ? "text-blue-600"
                            : "text-slate-400"
                        }`}
                      />
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        onFocus={() => setFocusedField("district")}
                        onBlur={() => setFocusedField("")}
                        className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                </div>

                {/* Gender + Birthday */}
                <div className="flex gap-4 flex-col sm:flex-row">
                  <div className="group w-full">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Gender
                    </label>
                    <div className="relative">
                      <Building2
                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                          focusedField === "gender"
                            ? "text-blue-600"
                            : "text-slate-400"
                        }`}
                      />
                      <select
                        value={Gender}
                        onChange={(e) => setGender(e.target.value)}
                        onFocus={() => setFocusedField("gender")}
                        onBlur={() => setFocusedField("")}
                        className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        required
                      >
                        <option value="">Select Gender</option>
                        {allowedGenders.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="group w-full">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Birthday
                    </label>
                    <div className="relative">
                      <CalendarDays
                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                          focusedField === "birthday"
                            ? "text-blue-600"
                            : "text-slate-400"
                        }`}
                      />
                      <input
                        type="date"
                        value={BirthDay}
                        onChange={(e) => setBirthDay(e.target.value)}
                        onFocus={() => setFocusedField("birthday")}
                        onBlur={() => setFocusedField("")}
                        max={new Date().toISOString().slice(0, 10)}
                        className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(Steps.Tute_Details)}
                    className="w-1/2 bg-white hover:bg-slate-50 text-slate-800 font-medium py-3 rounded-2xl border border-slate-200 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-1/2 bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 hover:brightness-110 text-white font-semibold py-3 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
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
          )}

          {/* Step: LOGIN */}
          {step === Steps.LOGIN && (
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-7">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-emerald-600 to-amber-600 bg-clip-text text-transparent">
                  Welcome back
                </h2>
                <p className="text-slate-600 mt-1">
                  Log in to continue learning
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {/* Phone */}
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                        focusedField === "phone"
                          ? "text-blue-600"
                          : "text-slate-400"
                      }`}
                    />
                    <input
                      type="tel"
                      name="tel"
                      id="tel"
                      autoComplete="tel"
                      placeholder="07XXXXXXXX"
                      maxLength={10}
                      value={phonenumber}
                      onChange={(e) =>
                        setPhonenumber(
                          e.target.value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                      onFocus={() => setFocusedField("phone")}
                      onBlur={() => setFocusedField("")}
                      className="w-full pl-10 pr-24 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={goBackToCheck}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-sm font-medium hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      autoComplete="current-password"
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 hover:brightness-110 text-white font-semibold py-3 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
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
            </div>
          )}

          {/* Step: FORGOT PASSWORD */}
          {step === Steps.FORGOT_PASSWORD && (
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-7">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-emerald-600 to-amber-600 bg-clip-text text-transparent">
                  Forgot Password
                </h2>
                <p className="text-slate-600">
                  We’ll send a 6-digit OTP to your mobile to reset your password
                </p>
              </div>

              <div className="space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                        focusedField === "phone"
                          ? "text-blue-600"
                          : "text-slate-400"
                      }`}
                    />
                    <input
                      type="tel"
                      placeholder="07XXXXXXXX"
                      maxLength={10}
                      autoComplete="current-phonenumber"
                      value={phonenumber}
                      onChange={(e) =>
                        setPhonenumber(
                          e.target.value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                      onFocus={() => setFocusedField("phone")}
                      onBlur={() => setFocusedField("")}
                      className="w-full pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleForgotPasswordSendOTP}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 hover:brightness-110 text-white font-semibold py-3 rounded-2xl transition-all duration-300 flex items-center justify-center"
                >
                  {isLoading ? "Please wait..." : "Send OTP"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(Steps.LOGIN)}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 font-medium py-3 rounded-2xl border border-slate-200 transition"
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}

          {/* Step: RESET PASSWORD */}
          {step === Steps.RESET_PASSWORD_OTP && (
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-7">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-emerald-600 to-amber-600 bg-clip-text text-transparent">
                  Reset Password
                </h2>
                <p className="text-slate-600">
                  Enter the 6-digit OTP sent to{" "}
                  <span className="font-semibold text-slate-900">
                    {phonenumber}
                  </span>{" "}
                  and set a new password
                </p>
              </div>

              <form onSubmit={onSubmitResetPassword} className="space-y-6">
                {/* OTP Inputs */}
                <div>
                  <label className="text-sm font-semibold text-slate-700">
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
                        className="w-12 h-14 text-xl text-center bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        ref={(el) => (inputRefs.current[index] = el)}
                        onChange={(e) => handleInput(e, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                      />
                    ))}
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    New Password
                  </label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                  <label className="text-sm font-semibold text-slate-700">
                    Confirm Password
                  </label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showConfirmNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmNewPassword(!showConfirmNewPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                    className={`flex-1 border bg-white text-slate-900 border-slate-200 py-3 rounded-2xl font-medium transition-all ${
                      resendTimer > 0 || isResending
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {resendTimer > 0
                      ? `Resend OTP in ${formatTimer(resendTimer)}`
                      : "Resend OTP"}
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 hover:brightness-110 text-white font-semibold py-3 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
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
            <p className="inline-block px-4 py-2 bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl text-slate-700 text-sm font-medium shadow-sm hover:shadow-md transition-all">
              Developed by{" "}
              <span className="text-blue-600 font-bold hover:underline cursor-pointer">
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
