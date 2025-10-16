import React, { useContext, useState, useEffect } from "react";
import {
  Home,
  ShoppingBag,
  BookOpen,
  CreditCard,
  User,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LogOut,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "../../Context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";

const SideBar = ({ isCollapsed, setIsCollapsed }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const { userData, backend_url, setUserData, setIsuserloggedIn } =
    useContext(AppContext);

  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Colorful accents per item (unchanged)
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

  const bottomMenuItems = [
    {
      name: "Logout",
      icon: LogOut,
      lfunctions: () => logout(),
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

  const handleMenuClick = (path) => {
    navigate(path);
  };

  const isActivePath = (path) => {
    // startsWith gives better highlighting for nested routes
    return currentPath.startsWith(path);
  };

  // Close the bottom sheet when route changes
  useEffect(() => {
    setIsMoreOpen(false);
  }, [currentPath]);

  // First two items for the mobile bottom bar
  const primaryMobileItems = menuItems.slice(0, 2);

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`
          hidden lg:flex fixed top-0 left-0 z-40 h-screen
          ${isCollapsed ? "w-20" : "w-72"}
          bg-white/80 backdrop-blur-xl
          border-r border-indigo-100
          shadow-[0_10px_30px_rgba(80,56,237,0.08)]
          transition-all duration-300 ease-out
        `}
      >
        <div className="flex flex-col h-full text-slate-800">
          {/* Header */}
          <div className="p-5 border-b border-indigo-100">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <div
                  onClick={() => navigate("/")}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-sm">
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
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 hover:bg-indigo-50 rounded-lg transition-colors"
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
          <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const active = isActivePath(item.path);
              return (
                <button
                  key={item.name}
                  onClick={() => handleMenuClick(item.path)}
                  className={`
                    w-full flex items-center gap-4 px-3 py-2.5 rounded-xl group
                    transition-all duration-200
                    ${
                      active
                        ? `${item.bgColor} ${item.color} border ${item.borderColor} shadow-sm`
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      bg-gradient-to-br ${item.iconFrom} ${item.iconTo}
                      shadow-sm
                    `}
                  >
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>

                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                  )}

                  {!isCollapsed && active && (
                    <div
                      className={`w-2 h-2 bg-gradient-to-r ${item.dotFrom} ${item.dotTo} rounded-full`}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User + Logout */}
          <div className="p-4 border-t border-indigo-100">
            {!isCollapsed && (
              <div className="bg-white rounded-xl p-4 mb-4 border border-indigo-100 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex w-10 h-10 bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white rounded-full justify-center items-center cursor-pointer">
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

            <div className="space-y-2">
              {bottomMenuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => item.lfunctions && item.lfunctions()}
                    className="w-full bg-gradient-to-r from-rose-500 to-red-500 text-white flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:from-rose-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-rose-300/50"
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
                <div className="text-center pt-4">
                  <p className="inline-block px-4 py-2 bg-white text-sm rounded-xl text-slate-600 font-medium shadow-sm border border-slate-200">
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

      {/* MOBILE BOTTOM NAV (3 icons) */}
      <div
        className="
          lg:hidden fixed bottom-0 inset-x-0 z-50
          bg-white/90 backdrop-blur-xl border-t border-slate-200
          shadow-[0_-6px_30px_rgba(2,6,23,0.08)]
        "
        style={{
          paddingBottom:
            "max(0px, env(safe-area-inset-bottom))" /* iOS safe area */,
        }}
      >
        <nav className="grid grid-cols-3">
          {primaryMobileItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActivePath(item.path);
            return (
              <button
                key={item.name}
                onClick={() => handleMenuClick(item.path)}
                className={`
                  flex flex-col items-center justify-center gap-1 py-2.5
                  text-xs font-medium
                  ${active ? "text-indigo-600" : "text-slate-500"}
                  transition-colors
                `}
              >
                <div
                  className={`
                    w-9 h-9 rounded-xl flex items-center justify-center
                    bg-gradient-to-br ${item.iconFrom} ${item.iconTo}
                    ${active ? "opacity-100" : "opacity-90"}
                    shadow-sm
                  `}
                >
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <span className="leading-none">{item.name.split(" ")[0]}</span>
              </button>
            );
          })}

          {/* More */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium text-slate-600"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900 text-white shadow-sm">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="leading-none">More</span>
          </button>
        </nav>
      </div>

      {/* MOBILE BOTTOM SHEET: all navigation (2 columns) */}
      {isMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          {/* Dim backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Sheet */}
          <div
            className="
              absolute bottom-0 left-0 right-0
              bg-white rounded-t-3xl border-t border-slate-200
              shadow-2xl
            "
            style={{
              paddingBottom:
                "calc(env(safe-area-inset-bottom) + 16px)" /* safe area */,
            }}
          >
            {/* Drag handle + header */}
            <div className="pt-3 pb-2 flex flex-col items-center">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
              <div className="mt-2 px-6 w-full flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">
                  Navigation
                </div>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Grid list */}
            <div className="px-4 pb-2 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {menuItems.map((item) => {
                  const IconComponent = item.icon;
                  const active = isActivePath(item.path);
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleMenuClick(item.path)}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-xl border
                        ${
                          active
                            ? `${item.borderColor} ${item.bgColor}`
                            : "border-slate-200 bg-white"
                        }
                        hover:bg-slate-50 transition-all text-left
                      `}
                    >
                      <div
                        className={`
                          w-10 h-10 rounded-lg flex items-center justify-center
                          bg-gradient-to-br ${item.iconFrom} ${item.iconTo} shadow-sm
                        `}
                      >
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-800">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {active ? "Current" : "Go"}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Logout in grid */}
                {bottomMenuItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => item.lfunctions && item.lfunctions()}
                      className="
                        w-full flex items-center gap-3 p-3 rounded-xl border
                        border-rose-200 bg-gradient-to-r from-rose-50 to-white
                        hover:from-rose-100 hover:to-white transition-all
                      "
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-500 text-white shadow-sm">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-rose-700">
                          {item.name}
                        </div>
                        <div className="text-xs text-rose-500">Sign out</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SideBar;
