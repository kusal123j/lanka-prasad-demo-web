import axios from "axios";
import { createContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const backend_url = import.meta.env.VITE_Backend_URL;
  axios.defaults.withCredentials = true;

  const [isuserloggedin, setIsuserloggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [allCourses, setAllCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [socket, setSocket] = useState(null);
  const [payments, setPayments] = useState([]);
  const navigate = useNavigate();

  // Fetch user data
  const getUserData = async () => {
    try {
      const { data } = await axios.get(`${backend_url}/api/user/data`);
      if (data.success) {
        setUserData(data.userData);
        return data.userData;
      } else {
        toast.error(data.message || "Failed to get user data");
      }
    } catch (error) {
      toast.error("Error fetching user data");
    }
  };

  // Check auth state
  const getAuthstate = async () => {
    try {
      const [authRes, userRes] = await Promise.all([
        axios.get(`${backend_url}/api/auth/is-auth`),
        axios.get(`${backend_url}/api/user/data`),
      ]);

      if (authRes.data.success && userRes.data.success) {
        setIsuserloggedIn(true);
        setUserData(userRes.data.userData);
      } else {
        setIsuserloggedIn(false);
        setUserData(null);
      }
    } catch (error) {
      toast.error(error.message);
      setIsuserloggedIn(false);
      setUserData(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Socket.io setup for real-time logout
  useEffect(() => {
    if (isuserloggedin && userData) {
      const newSocket = io(backend_url, { withCredentials: true });
      setSocket(newSocket);

      // Register the user on the server
      newSocket.emit("registerUser", userData._id);

      // Listen for force logout
      newSocket.on("forceLogout", () => {
        toast.error(
          "You have been logged out because your account was logged in elsewhere."
        );
        setIsuserloggedIn(false);
        setUserData(null);
        navigate("/login");
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isuserloggedin, userData]);

  // Courses and categories functions
  const calculateNoOfLectures = (course) => {
    let totalLectures = 0;
    course.courseContent.forEach((chapter) => {
      if (Array.isArray(chapter.chapterContent)) {
        totalLectures += chapter.chapterContent.length;
      }
    });
    return totalLectures;
  };

  const fetchAllCourses = async () => {
    try {
      const { data } = await axios.get(`${backend_url}/api/course/all`);
      if (data.success) setAllCourses(data.courses);
      else toast.error(data.message);
    } catch {
      toast.error("Error fetching all courses");
    }
  };

  const fetchEnrolledCourses = async () => {
    try {
      const { data } = await axios.get(
        `${backend_url}/api/user/enrolled-courses`
      );
      if (data.success) setEnrolledCourses(data.enrolledCourses);
      else toast.error(data.message);
    } catch {
      toast.error("Error fetching enrolled courses");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${backend_url}/api/user/all-categories`);
      const payload = Array.isArray(res.data)
        ? res.data
        : res.data?.categories || [];
      setCategories(payload);
    } catch {
      toast.error("Failed to load categories");
    }
  };

  const handlePaymentHistory = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.get(
        backend_url + "/api/user/payment-history"
      );
      if (data.success) {
        setPayments(data.payments);
      } else {
        toast.error(data.message || "Failed to fetch payment history");
      }
    } catch (error) {
      toast.error("Error fetching payment history");
    }
  };
  useEffect(() => {
    getAuthstate();
  }, []);

  useEffect(() => {
    if (isuserloggedin) {
      fetchEnrolledCourses();
      fetchAllCourses();
      fetchCategories();
      handlePaymentHistory();
    }
  }, [isuserloggedin]);

  const value = {
    backend_url,
    isuserloggedin,
    userData,
    setIsuserloggedIn,
    setUserData,
    getUserData,
    authLoading,
    allCourses,
    calculateNoOfLectures,
    enrolledCourses,
    fetchAllCourses,
    fetchEnrolledCourses,
    navigate,
    categories,
    payments,
    handlePaymentHistory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
