import axios from "axios";
import { createContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const getUserData = async () => {
    try {
      axios.defaults.withCredentials = true;
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
  const getAuthstate = async () => {
    try {
      axios.defaults.withCredentials = true;

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
      const { data } = await axios.get(backend_url + `/api/course/all`);
      if (data.success) {
        setAllCourses(data.courses);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Error fetching all courses");
    }
  };
  const fetchEnrolledCourses = async () => {
    try {
      const { data } = await axios.get(
        backend_url + `/api/user/enrolled-courses`
      );
      if (data.success) {
        setEnrolledCourses(data.enrolledCourses);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Error fetching all courses");
    }
  };
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${backend_url}/api/user/all-categories`);
      // API example shows an array; handle both array or {categories: []}
      const payload = Array.isArray(res.data)
        ? res.data
        : res.data?.categories || [];
      setCategories(payload);
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    getAuthstate();
    fetchAllCourses();
    fetchCategories();
  }, []);
  useEffect(() => {
    if (isuserloggedin) {
      fetchEnrolledCourses();
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
