import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const backend_url = import.meta.env.VITE_Backend_URL;
  axios.defaults.withCredentials = true;

  const [isuserloggedin, setIsuserloggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isEducator, setisEducator] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [allCourses, setAllCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [isAccountComplete, setisAccountComplete] = useState(false);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const lastFetchRef = useRef(0);
  const getUserData = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.get(`${backend_url}/api/user/data`);
      if (data.success) {
        setUserData(data.userData);
        if (data.userData.isAccountComplete) {
          setisAccountComplete(true);
        }
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
        if (userRes.data.userData.role === "admin") {
          setIsuserloggedIn(true);
          setUserData(userRes.data.userData);
          setisEducator(true);
        } else {
          setIsuserloggedIn(false);
          setUserData(null);
          setisEducator(false);
        }
      } else {
        setIsuserloggedIn(false);
        setUserData(null);
        setisEducator(false);
      }
    } catch (error) {
      toast.error(error.message);
      setIsuserloggedIn(false);
      setUserData(null);
      setisEducator(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchAllCourses = async () => {
    try {
      setCoursesLoading(true);
      const { data } = await axios.get(
        backend_url + `/api/educator/all-courses`
      );
      if (data.success) {
        setAllCourses(data.courses);
        setCoursesLoading(false);
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
  }, []);
  useEffect(() => {
    if (isuserloggedin) {
      fetchAllCourses();
      fetchCategories();
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
    isEducator,
    setisEducator,
    fetchAllCourses,
    navigate,
    isAccountComplete,
    categories,
    coursesLoading,
    setCoursesLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
