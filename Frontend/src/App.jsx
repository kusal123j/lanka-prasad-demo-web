import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Pages/Login";
import { AppContext } from "./Context/AppContext";
import axios from "axios";
import MyEnrollements from "./Pages/Student/MyEnrollements";
import Player from "./Pages/Student/Player";
import Loading from "./Components/Student/Loading";
import "quill/dist/quill.core.css";
import NoFound from "./Pages/NoFound";
import Student from "./Pages/Student/Student";
import SDashboard from "./Pages/Student/SDashboard";
import PaymentHistory from "./Components/Student/PaymentHistory";
import ProfilePage from "./Pages/Student/Profile";
import Store from "./Pages/Student/Store";
import CheckoutPage from "./Pages/Student/CheckoutPage";
import MakePayment from "./Components/Student/MakePayment";
import { Toaster } from "react-hot-toast";

const App = () => {
  axios.defaults.withCredentials = true; // Ensure axios uses credentials for all requests
  const { isuserloggedin, authLoading } = useContext(AppContext);

  if (authLoading) {
    return <Loading />;
  }

  return (
    <div>
      <Toaster position="top-center" reverseOrder={true} />
      <Routes>
        <Route
          path="/"
          element={
            isuserloggedin ? <Navigate to="/student/dashboard" /> : <Login />
          }
        />

        <Route
          path="/student"
          element={isuserloggedin ? <Student /> : <Navigate to="/" />}
        >
          <Route path="dashboard" element={<SDashboard />} />

          <Route path="profile" element={<ProfilePage />} />
          <Route path="make-payment" element={<MakePayment />} />
          <Route path="my-enrollments" element={<MyEnrollements />} />
          <Route path="payments" element={<PaymentHistory />} />
          <Route path="store" element={<Store />} />
          <Route path="class/:id" element={<CheckoutPage />} />
          <Route path="player/:courseId" element={<Player />} />
        </Route>
        <Route path="*" element={<NoFound />} />
      </Routes>
    </div>
  );
};

export default App;
