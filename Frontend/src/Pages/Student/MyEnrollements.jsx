import React, { useContext } from "react";
import EnrollmentsCard from "../../Components/Student/EnrollmentsCard";
import { AppContext } from "../../Context/AppContext";
import paymentDetailsImage from "../../assets/payment-guidelines.jpg";
const MyEnrollements = () => {
  const { enrolledCourses = [] } = useContext(AppContext);
  const hasEnrollments =
    Array.isArray(enrolledCourses) && enrolledCourses.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            My Classes
          </h1>
          <p className="text-slate-600 mt-2">All of your enrolled classes</p>
          <div className="mt-4 h-px bg-gradient-to-r from-sky-200 via-teal-200 to-cyan-200" />
        </header>

        {!hasEnrollments ? (
          <div className="mt-16">
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-slate-600 text-lg">
                You haven't enrolled in any class yet.
              </p>
              <div className="p-2 sm:p-4 md:p-6">
                <img
                  src={paymentDetailsImage}
                  alt="Bank payment details"
                  className="mx-auto w-full max-h-[80vh] object-contain rounded-2xl select-none"
                  draggable="false"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {enrolledCourses.map((enrollment, index) => (
              <EnrollmentsCard
                key={index}
                course={enrollment.course}
                expiresAt={enrollment.expiresAt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEnrollements;
