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

  // Colorful accents per item
  const menuItems = [
    {
      name: "Dashboard",
      path: "/student/dashboard",
      icon: Home,
      color: "text-sky-700",
      bgColor: "bg-sky-100/70",
      borderColor: "border-sky-300/60",
      iconFrom: "from-sky-400",
      iconTo: "to-cyan-500",
      dotFrom: "from-sky-500",
      dotTo: "to-cyan-500",
    },
    {
      name: "Purchase Class",
      path: "/student/store",
      icon: ShoppingBag,
      color: "text-amber-700",
      bgColor: "bg-amber-100/70",
      borderColor: "border-amber-300/60",
      iconFrom: "from-amber-400",
      iconTo: "to-orange-500",
      dotFrom: "from-amber-500",
      dotTo: "to-orange-500",
    },
    {
      name: "My Classes",
      path: "/student/my-enrollments",
      icon: BookOpen,
      color: "text-emerald-700",
      bgColor: "bg-emerald-100/70",
      borderColor: "border-emerald-300/60",
      iconFrom: "from-emerald-400",
      iconTo: "to-teal-500",
      dotFrom: "from-emerald-500",
      dotTo: "to-teal-500",
    },
    {
      name: "Bank Details",
      path: "/student/make-payment",
      icon: CreditCard,
      color: "text-violet-700",
      bgColor: "bg-violet-100/70",
      borderColor: "border-violet-300/60",
      iconFrom: "from-violet-400",
      iconTo: "to-fuchsia-500",
      dotFrom: "from-violet-500",
      dotTo: "to-fuchsia-500",
    },
    {
      name: "Payment History",
      path: "/student/payments",
      icon: CreditCard,
      color: "text-rose-700",
      bgColor: "bg-rose-100/70",
      borderColor: "border-rose-300/60",
      iconFrom: "from-pink-400",
      iconTo: "to-rose-500",
      dotFrom: "from-pink-500",
      dotTo: "to-rose-500",
    },
    {
      name: "Profile",
      path: "/student/profile",
      icon: User,
      color: "text-indigo-700",
      bgColor: "bg-indigo-100/70",
      borderColor: "border-indigo-300/60",
      iconFrom: "from-indigo-400",
      iconTo: "to-blue-500",
      dotFrom: "from-indigo-500",
      dotTo: "to-blue-500",
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
    },
  ];

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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-slate-200 rounded-xl shadow-lg hover:bg-slate-50 transition-colors"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-slate-700" />
        ) : (
          <Menu className="w-6 h-6 text-slate-700" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:fixed top-0 left-0 z-40 h-screen
          bg-gradient-to-b from-white via-indigo-50 to-pink-50
          backdrop-blur-xl border-r border-indigo-100
          transition-all duration-300 ease-in-out shadow-xl lg:shadow-sm
          ${isCollapsed ? "w-20" : "w-72"}
          ${
            isMobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="flex flex-col h-full text-slate-800">
          {/* Header */}
          <div className="p-6 border-b border-indigo-100">
            <div className="flex items-center justify-between cursor-pointer">
              {!isCollapsed && (
                <div
                  onClick={() => navigate("/")}
                  className="flex items-center space-x-3"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-fuchsia-600 bg-clip-text text-transparent">
                      Student Panel
                    </h2>
                    <p className="text-xs text-slate-500">Learning Dashboard</p>
                  </div>
                </div>
              )}

              {/* Collapse Toggle - Desktop Only */}
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex p-2 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
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
                        ? `${item.bgColor} ${item.color} shadow-sm border ${item.borderColor}`
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }
                  `}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                      bg-gradient-to-br ${item.iconFrom} ${item.iconTo}
                    `}
                  >
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>

                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                  )}

                  {!isCollapsed && isActive && (
                    <div
                      className={`w-2 h-2 bg-gradient-to-r ${item.dotFrom} ${item.dotTo} rounded-full`}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-indigo-100">
            {!isCollapsed && (
              <div className="bg-white rounded-xl p-4 mb-4 border border-indigo-100 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex w-10 h-10 bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white rounded-full justify-center items-center cursor-pointer relative">
                    {userData?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">
                      {userData?.name}
                    </p>
                    <p className="text-xs text-slate-500">
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

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (item.lfunctions) item.lfunctions();
                    }}
                    className="w-full bg-gradient-to-r from-rose-500 to-red-500 text-white flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group hover:from-rose-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-rose-300/50"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center">
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
                  <p className="inline-block px-4 py-2 bg-white text-sm rounded-xl text-slate-600 font-medium shadow-sm hover:shadow-md transition-all border border-slate-200">
                    Developed by{" "}
                    <span className="text-fuchsia-600 font-bold hover:underline cursor-pointer">
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
