import React, { useState, useEffect, useContext } from "react";
import {
  Eye,
  EyeOff,
  User,
  Lock,
  ArrowRight,
  BookOpen,
  Users,
  Award,
  Target,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../Context/AppContext";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { backend_url, getUserData, setIsuserloggedIn, setisEducator } =
    useContext(AppContext);

  const loginNotice =
    "Important Notice! ඔබගේ Account Login Mobile Number සහ Password කිසිදු අයෙකුට ලබා නොදෙන්න. වෙනත් පාර්ශවයක් අතට ඔබේ Account Login ලැබීමෙන් ඔවුන් සිදු කරන යම් නීතිවිරෝධී ක්‍රියාවකදී අසුවන්නේ ඔබවයි. ඔබ දැනටමත් Account Details වෙනත් අයෙකුට ලබා දී ඇත්නම් මෙතන Click කර Password එක මාරු කරගන්න.";

  const stats = [
    { icon: Users, value: "50,000+", label: "Active Students" },
    { icon: BookOpen, value: "1,200+", label: "Courses" },
    { icon: Award, value: "98%", label: "Success Rate" },
    { icon: Target, value: "15+", label: "Years Experience" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    axios.defaults.withCredentials = true;

    try {
      const { data } = await axios.post(`${backend_url}/api/auth/login`, {
        phonenumber: email,
        password,
      });

      if (data.success) {
        getUserData();
        setIsuserloggedIn(true);
        setisEducator(true);
        toast.success("Login successful!");
        navigate("/educator/dashboard");
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (err) {
      toast.error("Login failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-red-200 to-red-50 flex overflow-x-hidden">
      {/* Animated Background */}
      {/* Background bubbles - FIXED positions */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>

      <div
        className="absolute top-0 right-0 w-64 h-64 bg-red-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"
        style={{ animationDelay: "2s" }}
      ></div>

      <div
        className="absolute bottom-0 left-10 w-64 h-64 bg-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"
        style={{ animationDelay: "4s" }}
      ></div>

      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div className="w-full bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 text-white p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Geometric patterns */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white rotate-12"></div>
            <div className="absolute bottom-40 right-20 w-24 h-24 border-2 border-white rounded-full"></div>
            <div className="absolute top-1/2 left-1/3 w-16 h-16 border-2 border-white rotate-45"></div>
          </div>

          <div className="relative z-10">
            <div className="flex-1 flex flex-col justify-center space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight transition-opacity duration-1000">
                  ⚠️ Danger Zone, keep out
                </h1>
                <p className="text-lg text-white/90 max-w-md">
                  Join thousands of students who are transforming their future
                  through quality education.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 max-w-md">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm"
                  >
                    <stat.icon className="w-6 h-6 mb-2 text-white/90" />
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-white/80">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 m-5">
              <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-400 text-xl">⚠️</div>
                  <p className="text-sm text-gray-200 leading-relaxed">
                    {loginNotice}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center pt-3">
              <p className="inline-block px-4 py-2 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 text-sm rounded-xl text-gray-700 font-medium shadow-sm hover:shadow-md transition-all">
                Developed by{" "}
                <span className="text-blue-600 font-bold hover:underline cursor-pointer">
                  KJ Developers
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md ">
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
              Lanka Prasad <br />
              <span className="text-red-600">Admin Panel</span>
            </h2>
            <p className="text-gray-600">⚠️ Danger Zone, keep out</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Danger Number
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  placeholder="Danger Number "
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-red-200 rounded-xl bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-red-200 rounded-xl bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
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
        </div>
      </div>
    </div>
  );
};

export default Login;
