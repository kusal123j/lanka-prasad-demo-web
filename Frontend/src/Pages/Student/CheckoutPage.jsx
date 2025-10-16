import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../../Context/AppContext";
import Loading from "../../Components/Student/Loading";
import paymentGuidelinesImage from "../../assets/payment-guidelines.jpg"; // fixed stray space in file name
import {
  ShieldCheck,
  AlertCircle,
  Calendar,
  Tag,
  GraduationCap,
  Phone,
  Home,
  MessageCircle,
  FileUp,
  Edit3,
} from "lucide-react";

const formatLKR = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK")}`;

const getCategoryNames = (categories, mainId, subId) => {
  if (!categories || !mainId) return { mainName: "—", subName: "—" };
  const main = categories.find((c) => String(c._id) === String(mainId));
  const sub = main?.subCategories?.find((s) => String(s._id) === String(subId));
  return {
    mainName: main?.name || "—",
    subName: sub?.name || "—",
  };
};

const CheckoutPage = () => {
  const { id } = useParams();
  const { backend_url, userData, enrolledCourses, categories, payments } =
    useContext(AppContext);
  const navigate = useNavigate();

  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Redirect if there is a pending payment for this course
  useEffect(() => {
    if (!id || !payments) return;
    const hasPendingPayment = payments?.some(
      (p) =>
        String(p?.course?._id) === String(id) &&
        p?.paymentStatus?.toLowerCase() === "pending"
    );
    if (hasPendingPayment) navigate("/student/payments", { replace: true });
  }, [payments, id, navigate]);

  // Redirect if already enrolled
  useEffect(() => {
    if (!id || !enrolledCourses) return;
    const alreadyEnrolled = enrolledCourses?.some((e) => {
      const c = e?.course;
      const cid = typeof c === "string" ? c : c?._id;
      return cid === id;
    });
    if (alreadyEnrolled) navigate("/student/my-enrollments", { replace: true });
  }, [enrolledCourses, id, navigate]);

  // Fetch course details
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        window.scrollTo(0, 0);
        axios.defaults.withCredentials = true;
        const { data } = await axios.get(`${backend_url}/api/course/${id}`);
        if (data.success) {
          setCourseData(data.course);
        } else {
          alert(data.message || "Class not found");
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
    if (id) fetchCourse();
  }, [id, backend_url, navigate]);

  const { mainName, subName } = useMemo(() => {
    if (!courseData) return { mainName: "—", subName: "—" };
    return getCategoryNames(
      categories,
      courseData?.mainCategory?._id || courseData?.mainCategory,
      courseData?.subCategory?._id || courseData?.subCategory
    );
  }, [categories, courseData]);

  const basePrice = courseData?.coursePrice || 0;

  // Safely read student details from userData
  const firstName = userData?.name || "—";
  const lastName = userData?.lastname || "—";
  const address = userData?.address || "—";
  const phone1 =
    userData?.phonenumber ||
    userData?.phone ||
    userData?.mobile ||
    "Not provided";
  const phone2 =
    userData?.phonenumber2 ||
    userData?.secondaryPhone ||
    userData?.secondPhone ||
    userData?.phone2 ||
    "Not provided";

  // Fix casing logic
  const getWhatsappTargetNumber = () => {
    const main = (mainName || "").trim().toLowerCase();
    const lowerGrades = new Set([
      "grade 6",
      "grade 7",
      "grade 8",
      "grade 9",
      "grade 10",
    ]);
    if (main === "grade 11") return "0760242357"; // Grade 11
    if (lowerGrades.has(main)) return "0711000121"; // Grades 6–10
    return "0711000121";
  };

  const toWhatsAppInternational = (localNumber) => {
    const digits = String(localNumber).replace(/\D/g, "");
    // Sri Lanka country code 94, remove leading 0
    return "94" + digits.replace(/^0/, "");
  };

  const handleWhatsAppUpload = () => {
    if (!courseData) return;

    const targetLocal = getWhatsappTargetNumber();
    const waNumber = toWhatsAppInternational(targetLocal);

    const msg = `
Hello, I would like to submit my bank slip.

Course: ${courseData?.courseTitle || "—"}
Category: ${mainName}${subName && subName !== "—" ? ` • ${subName}` : ""}
Month: ${courseData?.month || "—"}
Amount: ${formatLKR(basePrice)}

Student: ${firstName} ${lastName}
Delivery Address: ${address}
Primary Phone: ${phone1}
Secondary Phone: ${phone2}

I will attach the bank slip image here. Thank you!
    `.trim();

    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) return <Loading />;

  if (!courseData)
    return (
      <div className="min-h-screen bg-white text-gray-700 flex items-center justify-center">
        Class Not Found
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-sky-50 text-gray-800">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6 flex items-center gap-2 text-sm text-emerald-700">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Secure Checkout</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {courseData.courseTitle}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {mainName}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium border border-sky-100">
                  <Tag className="w-3.5 h-3.5" />
                  {subName}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                  <Calendar className="w-3.5 h-3.5" />
                  {courseData.month || "Month Not Set"}
                </span>
              </div>

              <div className="mt-6 rounded-xl border border-gray-200 bg-gradient-to-r from-rose-50 to-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
                  <div className="text-sm leading-relaxed text-gray-700">
                    <div
                      className="course-description-content"
                      dangerouslySetInnerHTML={{
                        __html: courseData.courseDescription,
                      }}
                    />
                  </div>
                </div>
              </div>
              <style>{`
                .course-description-content, .course-description-content * {
                  color: #374151 !important; /* gray-700 */
                }
              `}</style>
            </section>

            {/* Payment Guidelines - full width */}
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-700">
                  Payment Guidelines
                </p>
                <p className="text-xs text-gray-500">
                  Follow these steps when sending your bank slip via WhatsApp.
                </p>
              </div>
              <div className="overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                <img
                  src={paymentGuidelinesImage}
                  alt="Payment Guidelines"
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              </div>
            </section>
          </div>

          {/* Summary + WhatsApp CTA */}
          <aside className="lg:col-span-1">
            <div className="space-y-6">
              <div className="lg:sticky lg:top-6 rounded-2xl border border-gray-200 bg-white shadow-lg p-6">
                <h3 className="text-lg font-semibold">Order Summary</h3>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Payment Amount</span>
                    <span className="font-semibold">
                      {formatLKR(basePrice)}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs text-gray-500">
                      You’ll be redirected to WhatsApp to share your bank slip
                      image and order details with our support.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleWhatsAppUpload}
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow-md bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <MessageCircle className="w-5 h-5" />
                  Upload Slip via WhatsApp
                </button>

                <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
                  <FileUp className="w-4 h-4 mt-0.5 text-gray-400" />
                  <p>
                    After WhatsApp opens, attach your bank slip image and send
                    the message. We’ll verify and confirm your enrollment.
                  </p>
                </div>
              </div>

              {/* Tute Delivery card (now spaced from the summary card) */}
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Tute Delivery</h2>
                  <button
                    onClick={() => navigate("/student/profile")}
                    className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-800 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100"
                  >
                    <Edit3 className="w-4 h-4" />
                    Change info
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      Registered Phone Number
                    </div>
                    <p className="mt-1 font-medium">{phone1}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">First Name</p>
                      <p className="font-medium">{firstName}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">Last Name</p>
                      <p className="font-medium">{lastName}</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Home className="w-4 h-4" />
                      Tute Delivery Address
                    </div>
                    <p className="mt-1 font-medium">{address}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="w-4 h-4" />
                      Tute Delivery Phone Number
                    </div>
                    <p className="mt-1 font-medium">{phone1}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="w-4 h-4" />
                      Tute Delivery Second Phone Number
                    </div>
                    <p className="mt-1 font-medium">{phone2}</p>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
