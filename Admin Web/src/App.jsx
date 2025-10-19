import React, { useContext } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AppContext } from "./Context/AppContext";
import axios from "axios";
import Loading from "./Components/Student/Loading";
import Educator from "./Pages/Educator/Educator";
import AddCourse from "./Pages/Educator/AddCourse";
import Dashboard from "./Pages/Educator/Dashboard";
import "quill/dist/quill.core.css";
import StudentEnrollement from "./Pages/Educator/StudentEnrollement";
import EditCourse from "./Pages/Educator/EditCourse";
import NoFound from "./Pages/NoFound";
import PendingPayments from "./Components/Educator/PendingPayments ";
import AdminLogin from "./Pages/AdminPanel";
import AddQuize from "./Pages/Educator/AddQuize";
import CategoryManager from "./Pages/Educator/CategoryManager";
import StudentN from "./Pages/Educator/StudentN";
import TuteCenter from "./Pages/Educator/TuteCenter";
import ManullStudentRegister from "./Pages/Educator/ManullStudentRegister";
import VideoWatchExportButton from "./Pages/Educator/WatchReport";
import BulkEnrollment from "./Pages/Educator/BulkEnrolle";
import NICVerify from "./Pages/Educator/NICVerify";
import BulkTuteTracking from "./Pages/Educator/BulkTuteTracking";
import BulkUnenrollment from "./Pages/Educator/BulkUnenrollment";
import PremiumPricing from "./Pages/Educator/PremiumPricing";
const App = () => {
  axios.defaults.withCredentials = true; // Ensure axios uses credentials for all requests
  const { authLoading, isEducator } = useContext(AppContext);
  const location = useLocation();

  if (authLoading) {
    return <Loading />;
  }

  return (
    <div>
      <ToastContainer />
      <Routes>
        <Route
          path="/"
          element={
            isEducator ? <Navigate to="/educator/dashboard" /> : <AdminLogin />
          }
        />
        <Route
          path="/educator"
          element={!isEducator ? <Navigate to="/" /> : <Educator />}
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="add-course" element={<AddCourse />} />
          <Route path="tute-tracking" element={<BulkTuteTracking />} />
          <Route path="watch-report" element={<VideoWatchExportButton />} />
          <Route path="student-management" element={<StudentN />} />
          <Route path="nic-verify" element={<NICVerify />} />
          <Route path="bulk-enroll" element={<BulkEnrollment />} />
          <Route path="bulk-unenroll" element={<BulkUnenrollment />} />
          <Route path="user-register" element={<ManullStudentRegister />} />
          <Route path="tute-center" element={<TuteCenter />} />
          <Route path="category" element={<CategoryManager />} />
          <Route path="pricing" element={<PremiumPricing />} />
          <Route path="add-quize" element={<AddQuize />} />
          <Route path="edit-course/:id" element={<EditCourse />} />
          <Route path="student-enrollement" element={<StudentEnrollement />} />
          <Route path="pending-payments" element={<PendingPayments />} />
          <Route path="completed-payments" element={<PendingPayments />} />
          <Route path="failed-payments" element={<PendingPayments />} />
        </Route>

        <Route path="*" element={<NoFound />} />
      </Routes>
    </div>
  );
};

export default App;
