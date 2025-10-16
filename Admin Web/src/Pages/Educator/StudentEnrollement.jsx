import React, { useContext, useState } from "react";
import { AppContext } from "../../Context/AppContext.jsx";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const StudentEnrollment = () => {
  axios.defaults.withCredentials = true;

  const { allCourses, backend_url } = useContext(AppContext);
  const [email, setEmail] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEnroll = async (e) => {
    e.preventDefault();

    if (!email || !selectedCourse) {
      return toast.error("Please fill in all fields");
    }

    setLoading(true);

    try {
      const { data } = await axios.post(`${backend_url}/api/educator/enroll`, {
        email,
        courseId: selectedCourse,
      });

      if (data.success) {
        toast.success(" Student enrolled successfully!");
        setEmail("");
        setSelectedCourse("");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-semibold mb-6 text-center">
        📘 Manual Student Enrollment
      </h1>

      <form onSubmit={handleEnroll} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Student Email</label>
          <input
            type="email"
            value={email}
            placeholder="student@example.com"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Select Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="" disabled>
              Select a course
            </option>
            {(Array.isArray(allCourses) ? allCourses : []).map((course) => (
              <option key={course._id} value={course._id}>
                {course.courseTitle}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-lg text-white font-semibold ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Enrolling..." : "Enroll Student"}
        </button>
      </form>
    </div>
  );
};

export default StudentEnrollment;
