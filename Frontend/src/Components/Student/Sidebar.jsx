import React, { useContext, useState } from "react";
import {
  Home,
  ShoppingBag,
  BookOpen,
  CreditCard,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Settings,
  LogOut,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "../../Context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";

const SideBar = ({ isCollapsed, setIsCollapsed }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { userData, backend_url, setUserData, setIsuserloggedIn } =
    useContext(AppContext);

  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Unified red highlight for dark theme
  const menuItems = [
    {
      name: "Dashboard",
      path: "/student/dashboard",
      icon: Home,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      name: "Purchase Class",
      path: "/student/store",
      icon: ShoppingBag,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      name: "My Classes",
      path: "/student/my-enrollments",
      icon: BookOpen,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      name: "Bank Details",
      path: "/student/make-payment",
      icon: CreditCard,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      name: "Payment History",
      path: "/student/payments",
      icon: CreditCard,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      name: "Profile",
      path: "/student/profile",
      icon: User,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
  ];

  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(backend_url + "/api/auth/logout");
      if (data.success) {
        setIsuserloggedIn(false);
        setUserData(null);
        toast.success("Logout Successfully");
        navigate("/");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const bottomMenuItems = [
    {
      name: "Logout",
      icon: LogOut,
      lfunctions: logout,
      color: "text-white",
      bgColor: "bg-red-600",
    },
  ];

  // Mock active path - replace with actual router location
  const [activePath, setActivePath] = useState("/student/dashboard");

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 rounded-xl shadow-lg border border-white/10 hover:bg-white/15 transition-colors"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Menu className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:fixed top-0 left-0 z-40 h-screen
          bg-gradient-to-b from-black via-zinc-950 to-neutral-900
          backdrop-blur-xl border-r border-white/10
          transition-all duration-300 ease-in-out shadow-xl lg:shadow-sm
          ${isCollapsed ? "w-20" : "w-72"}
          ${
            isMobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="flex flex-col h-full text-white">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between cursor-pointer">
              {!isCollapsed && (
                <div
                  onClick={() => navigate("/")}
                  className="flex items-center space-x-3"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
                      Student Panel
                    </h2>
                    <p className="text-xs text-zinc-400">Learning Dashboard</p>
                  </div>
                </div>
              )}

              {/* Collapse Toggle - Desktop Only */}
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-zinc-300" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-zinc-300" />
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
                        ? `${item.bgColor} ${item.color} shadow-sm border border-red-500/40`
                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                      ${isActive ? item.bgColor : "group-hover:bg-white/10"}
                    `}
                  >
                    <IconComponent
                      className={`
                        w-5 h-5 transition-colors
                        ${
                          isActive
                            ? item.color
                            : "text-zinc-400 group-hover:text-white"
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
                    <div className="w-2 h-2 bg-gradient-to-r from-red-500 to-rose-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-white/10">
            {!isCollapsed && (
              <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="flex w-10 h-10 bg-red-600 text-white rounded-full justify-center items-center cursor-pointer relative">
                    {userData?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">
                      {userData?.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {userData?.phonenumber}
                    </p>
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
                    className="w-full bg-red-600 text-white flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors">
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>

                    {!isCollapsed && (
                      <span className="font-medium text-sm">{item.name}</span>
                    )}
                  </button>
                );
              })}

              {!isCollapsed && (
                <div className="text-center pt-5">
                  <p className="inline-block px-4 py-2 bg-white/5 text-sm rounded-xl text-white/80 font-medium shadow-sm hover:shadow-md transition-all">
                    Developed by{" "}
                    <span className="text-red-400 font-bold hover:underline cursor-pointer">
                      KJ Developers
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SideBar;
