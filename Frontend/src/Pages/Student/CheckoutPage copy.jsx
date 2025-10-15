import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../../Context/AppContext";
import ModernPaymentUploader from "../../Components/Student/ModernPaymentUploader";
import Loading from "../../Components/Student/Loading";

const CheckoutPage = () => {
  const { id } = useParams();
  const { backend_url, userData, enrolledCourses, categories } =
    useContext(AppContext);
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState(null);
  const [address, setAddress] = useState(userData?.address || "");
  const [mobile, setMobile] = useState(userData?.phonenumber || "");
  const [secondMobile, setSecondMobile] = useState("");
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deliveryBy, setDeliveryBy] = useState("slpost");

  console.log(enrolledCourses);
  console.log(categories);
  // Fetch course details from backend
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        axios.defaults.withCredentials = true;
        const { data } = await axios.get(`${backend_url}/api/course/${id}`);
        if (data.success) {
          setCourseData(data.course);
        } else {
          alert(data.message);
          navigate("/");
        }
      } catch (error) {
        console.error(error);
        alert("Failed to fetch course. Please try again.");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id, backend_url, navigate]);

  console.log(courseData);

  const handleEnroll = () => {
    if (
      !address.trim() ||
      !mobile.trim() ||
      !secondMobile.trim() ||
      !deliveryBy.trim()
    ) {
      alert("Please fill in all student details before uploading the slip.");
      return;
    }
    // Check mobile numbers: must be exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(mobile) || !phoneRegex.test(secondMobile)) {
      alert("Mobile numbers must be exactly 10 digits.");
      return;
    }
    setIsUploaderOpen(true);
  };

  if (loading) return <Loading />;
  if (!courseData)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Class Not Found
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white">
      {isUploaderOpen && (
        <ModernPaymentUploader
          payment={{
            courseId: courseData._id,
            amount: courseData.coursePrice,
            address,
            phonenumber1: mobile,
            phonenumber2: secondMobile,
            deliveryBy,
          }}
          onClose={() => setIsUploaderOpen(false)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <section className="rounded-2xl border border-gray-800 bg-black p-6 shadow-xl">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                {courseData.courseTitle}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-red-600/10 text-red-400 text-xs font-medium">
                  2025
                </span>
                <span className="px-3 py-1 rounded-full bg-red-600/10 text-red-400 text-xs font-medium">
                  Revision
                </span>
                <span className="px-3 py-1 rounded-full bg-red-600/10 text-red-400 text-xs font-medium">
                  {courseData.month || "Month Not Set"}
                </span>
              </div>
              <div className="mt-10 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-sm border border-yellow-400/30 rounded-xl p-4">
                <div className="flex-row items-start space-x-3">
                  <div className="text-red-600 font-semibold text-xl">
                    ⚠️ Important Notice
                  </div>
                  <p className="pt-2 text-sm text-gray-300 leading-relaxed">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: courseData.courseDescription,
                      }}
                    />
                  </p>
                </div>
              </div>
            </section>

            {/* Student Details */}
            <section className="rounded-2xl bg-white text-black p-6 shadow-xl border border-red-600/10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Student Details</h2>
                <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-full">
                  🔒 Secure
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 font-medium">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={userData?.firstname || "Kusal"}
                    readOnly
                    className="w-full mt-1.5 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 font-medium">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={userData?.lastname || "Janana"}
                    readOnly
                    className="w-full mt-1.5 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-gray-700 font-medium">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  required={true}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, City, ZIP"
                  className="w-full mt-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 font-medium">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    required
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ""); // allow only digits
                      if (value.length <= 10) setMobile(value); // max 10 digits
                    }}
                    placeholder="07XXXXXXXX"
                    maxLength={10}
                    className="w-full mt-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 font-medium">
                    Second Mobile
                  </label>
                  <input
                    type="tel"
                    value={secondMobile}
                    required
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ""); // allow only digits
                      if (value.length <= 10) setSecondMobile(value);
                    }}
                    placeholder="07XXXXXXXX"
                    maxLength={10}
                    className="w-full mt-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm text-gray-700 font-medium">
                  Delivery Method
                </label>
                <select
                  value={deliveryBy}
                  onChange={(e) => setDeliveryBy(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="slpost">SL Post</option>
                  <option value="courier">Courier</option>
                </select>
              </div>
            </section>
          </div>

          {/* Right - Summary */}
          <aside className="lg:col-span-1 sticky top-6 self-start">
            <div className="rounded-2xl bg-white text-black p-6 shadow-2xl border border-red-600/20">
              <h3 className="text-lg font-semibold">Total Price</h3>
              <p className="mt-2 text-4xl font-extrabold tracking-tight text-red-600">
                Rs. {courseData.coursePrice}
              </p>

              <button
                onClick={handleEnroll}
                disabled={
                  !address.trim() || !mobile.trim() || !secondMobile.trim()
                }
                className={`mt-6 w-full inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all
    ${
      !address.trim() || !mobile.trim() || !secondMobile.trim()
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700"
    }`}
              >
                Enroll & Upload Slip
              </button>

              <p className="mt-3 text-xs text-gray-600">
                By enrolling, you agree to our terms.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
