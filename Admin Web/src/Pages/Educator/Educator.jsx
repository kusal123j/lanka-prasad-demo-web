import React from "react";
import { Outlet } from "react-router-dom";
import SideBar from "../../Components/Educator/Sidebar";

const Educator = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <SideBar />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Educator;
