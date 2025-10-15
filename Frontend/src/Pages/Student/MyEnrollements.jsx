import React, { useContext } from "react";
import EnrollmentsCard from "../../Components/Student/EnrollmentsCard";
import { AppContext } from "../../Context/AppContext";

const MyEnrollements = () => {
  const { enrolledCourses } = useContext(AppContext);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-neutral-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold">My Enrollments</h1>
          <p className="text-neutral-400 mt-2">All of your enrolled classes</p>
        </header>
        {enrolledCourses.length === 0 ? (
          <div className="text-center text-white/80 text-lg mt-16">
            You haven't enrolled in any courses yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {enrolledCourses.map((enrollment, index) => (
              <EnrollmentsCard
                course={enrollment.course}
                expiresAt={enrollment.expiresAt}
                key={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEnrollements;
