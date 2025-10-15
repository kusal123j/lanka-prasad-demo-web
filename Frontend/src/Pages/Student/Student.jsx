import { Outlet } from "react-router-dom";
import SideBar from "../../Components/Student/Sidebar";
import { useState } from "react";

const Student = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <SideBar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main content area */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isCollapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        <main className="h-screen overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Student;
