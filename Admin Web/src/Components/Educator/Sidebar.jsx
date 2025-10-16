import React, { useContext, useState } from "react";
import {
  Home,
  BookOpen,
  CreditCard,
  User,
  Menu,
  X,
  Bus,
  IdCard,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ShieldUser,
  CloudDownload,
  LogOut,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "../../Context/AppContext";
import axios from "axios";
import Loading from "../Student/Loading";

const SideBar = ({ isCollapsed, setIsCollapsed }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isloading, setIsloading] = useState(false);
  const {
    userData,
    backend_url,
    setUserData,
    setIsuserloggedIn,
    setisEducator,
    setisAccountComplete,
  } = useContext(AppContext);

  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const menuItems = [
    {
      name: "Dashboard",
      path: "/educator/dashboard",
      icon: Home,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      name: "User Register",
      path: "/educator/user-register",
      icon: ShieldUser,
      color: "text-green-600",
      bgColor: "bg-green-50",
    } /**
    {
      name: "Payments",
      path: "/educator/pending-payments",
      icon: CreditCard,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },*/,
    {
      name: "Student Management",
      path: "/educator/student-management",
      icon: BookOpen,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    /** 
    {
      name: "NIC Verify",
      path: "/educator/nic-verify",
      icon: IdCard,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },*/
    {
      name: "Bulk Enroll",
      path: "/educator/bulk-enroll",
      icon: BookOpen,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      name: "Bulk UnEnroll",
      path: "/educator/bulk-unenroll",
      icon: BookOpen,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      name: "Tute Center",
      path: "/educator/tute-center",
      icon: BookOpen,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      name: "Tute Tracking",
      path: "/educator/tute-tracking",
      icon: Bus,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      name: "Category ",
      path: "/educator/category",
      icon: User,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },

    {
      name: "Watch Report",
      path: "/educator/watch-report",
      icon: CloudDownload,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];
  const logout = async () => {
    try {
      setIsloading(true);
      axios.defaults.withCredentials = true;

      const { data } = await axios.post(backend_url + "/api/auth/logout");
      if (data.success) {
        // Reset everything related to auth
        setIsuserloggedIn(false);
        setisEducator(false);
        setUserData(null);
        setisAccountComplete(false);

        toast.success("Logout Successfully");
        navigate("/");
      } else {
        toast.error(data.message || "Logout Failed");
      }
    } catch (error) {
      toast.error("Logout failed: " + error.message);
    } finally {
      setIsloading(false);
    }
  };

  const bottomMenuItems = [
    {
      name: "Logout",
      icon: LogOut,
      lfunctions: logout,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  // Mock active path - replace with actual router location
  const [activePath, setActivePath] = useState("/educator/dashboard");

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false); // Close mobile menu when item is clicked
  };

  return (
    <>
      {isloading && <Loading />}
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-600" />
        ) : (
          <Menu className="w-6 h-6 text-gray-600" />
        )}
      </button>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside
        className={`
    fixed lg:fixed top-0 left-0 z-40 h-screen bg-white/80 backdrop-blur-xl border-r border-white/20 
    transition-all duration-300 ease-in-out shadow-xl lg:shadow-sm
    ${isCollapsed ? "w-20" : "w-72"}
    ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
  `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-100/50">
            <div className="flex items-center justify-between cursor-pointer">
              {!isCollapsed && (
                <div
                  onClick={() => {
                    navigate("/");
                  }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Admin Panel
                    </h2>
                    <p className="text-xs text-gray-500">Admin Dashboard</p>
                  </div>
                </div>
              )}

              {/* Collapse Toggle - Desktop Only */}
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = currentPath === item.path;

              return (
                <button
                  key={item.name}
                  onClick={() => handleMenuClick(item.path)}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${
                      isActive
                        ? `${item.bgColor} ${item.color} shadow-sm border border-white/50`
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                >
                  <div
                    className={`
                    w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                    ${isActive ? item.bgColor : "group-hover:bg-gray-100"}
                  `}
                  >
                    <IconComponent
                      className={`
                      w-5 h-5 transition-colors
                      ${
                        isActive
                          ? item.color
                          : "text-gray-500 group-hover:text-gray-700"
                      }
                    `}
                    />
                  </div>

                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                  )}

                  {!isCollapsed && isActive && (
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-gray-100/50">
            {!isCollapsed && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex w-10 h-10 bg-black text-white rounded-full justify-center items-center cursor-pointer relative">
                    {userData?.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">
                      {userData?.name}
                    </p>
                    <p className="text-xs text-red-500">Admin</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Menu Items */}
            <div className="space-y-2">
              {bottomMenuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activePath === item.path;

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (item.lfunctions) item.lfunctions();
                      else handleMenuClick(item.path);
                    }}
                    className={`
                      w-full bg-red-600 text-white flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group
                      
                    `}
                  >
                    <div
                      className={`
                      w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                     
                    `}
                    >
                      <IconComponent
                        className={`
                        w-4 h-4 transition-colors text-white
                        
                      `}
                      />
                    </div>

                    {!isCollapsed && (
                      <span className="font-medium text-sm">{item.name}</span>
                    )}
                  </button>
                );
              })}
              {!isCollapsed && (
                <div className="text-center pt-5">
                  <p className="inline-block px-4 py-2 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 text-sm rounded-xl text-gray-700 font-medium shadow-sm hover:shadow-md transition-all">
                    Developed by{" "}
                    <span className="text-blue-600 font-bold hover:underline cursor-pointer">
                      KJ Developers
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
      {/* Content Spacer for Desktop */}
    </>
  );
};

export default SideBar;
