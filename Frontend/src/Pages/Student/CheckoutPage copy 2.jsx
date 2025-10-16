import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../../Context/AppContext";
import ModernPaymentUploader from "../../Components/Student/ModernPaymentUploader";
import Loading from "../../Components/Student/Loading";
import {
  CreditCard,
  UploadCloud,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Tag,
  GraduationCap,
  Phone,
  Home,
  Package,
  CheckCircle2,
} from "lucide-react";

const formatLKR = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK")}`;

const getCategoryNames = (categories, mainId, subId) => {
  if (!categories || !mainId) return { mainName: "—", subName: "—" };

  // Ensure we compare string IDs
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
  const [address, setAddress] = useState(userData?.address || "");
  const [mobile, setMobile] = useState(userData?.phonenumber || "");
  const [secondMobile, setSecondMobile] = useState("");
  const [deliveryBy, setDeliveryBy] = useState("slpost");

  const [paymentMethod, setPaymentMethod] = useState("bank-slip"); // 'online' | 'bank-slip'
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (!id || !payments) return;

    const hasPendingPayment = payments?.some(
      (p) =>
        String(p?.course?._id) === String(id) &&
        p?.paymentStatus?.toLowerCase() === "pending"
    );

    if (hasPendingPayment) {
      navigate("/student/payments", { replace: true });
    }
  }, [payments, id, navigate]);

  // Redirect if already enrolled
  useEffect(() => {
    if (!id || !enrolledCourses) return;
    const alreadyEnrolled = enrolledCourses?.some((e) => {
      const c = e?.course;
      const cid = typeof c === "string" ? c : c?._id;
      return cid === id;
    });
    if (alreadyEnrolled) {
      navigate("/student/my-enrollments", { replace: true });
    }
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

    // Use _id or name safely
    return getCategoryNames(
      categories,
      courseData?.mainCategory?._id || courseData?.mainCategory,
      courseData?.subCategory?._id || courseData?.subCategory
    );
  }, [categories, courseData]);

  const basePrice = courseData?.coursePrice || 0;
  const onlineFee = useMemo(() => {
    if (paymentMethod !== "online") return 0;
    // 2.5% processing fee (rounded to nearest rupee)
    return Math.round(basePrice * 0.025);
  }, [paymentMethod, basePrice]);
  const totalPrice = basePrice + onlineFee;

  const detailsValid = useMemo(() => {
    const phoneRegex = /^\d{10}$/;
    return (
      address.trim() &&
      phoneRegex.test(mobile) &&
      phoneRegex.test(secondMobile) &&
      deliveryBy.trim()
    );
  }, [address, mobile, secondMobile, deliveryBy]);

  const openBankSlipUploader = () => {
    if (!detailsValid) {
      alert(
        "Please complete all student details with valid 10-digit phone numbers before continuing."
      );
      return;
    }
    setIsUploaderOpen(true);
  };

  const handleOnlinePayment = async () => {
    if (!detailsValid) {
      alert(
        "Please complete all student details with valid 10-digit phone numbers before continuing."
      );
      return;
    }
    try {
      setIsPaying(true);
      // TODO: Replace with your actual online payment init API
      // Example payload
      const payload = {
        courseId: courseData?._id,
        amount: totalPrice,
        fee: onlineFee,
        method: "online",
        address,
        phonenumber1: mobile,
        phonenumber2: secondMobile,
        deliveryBy,
      };

      // Example endpoint (adjust to your backend)
      const { data } = await axios.post(
        `${backend_url}/api/payments/online/initiate`,
        payload,
        { withCredentials: true }
      );

      if (data?.success && data?.paymentUrl) {
        window.location.href = data.paymentUrl; // redirect to gateway
      } else if (data?.success && data?.redirect) {
        navigate(data.redirect);
      } else {
        alert(data?.message || "Online payment initiation failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to start online payment. Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) return <Loading />;

  if (!courseData)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Class Not Found
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      {isUploaderOpen && (
        <ModernPaymentUploader
          payment={{
            courseId: courseData._id,
            amount: basePrice, // no fee for bank slip
            address,
            phonenumber1: mobile,
            phonenumber2: secondMobile,
            deliveryBy,
          }}
          onClose={() => setIsUploaderOpen(false)}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/70 to-black shadow-xl p-6">
              <div className="flex items-center gap-2 text-zinc-300">
                <ShieldCheck className="w-5 h-5 text-red-500" />
                <span className="text-sm">Secure Checkout</span>
              </div>

              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
                {courseData.courseTitle}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-600/10 text-red-400 text-xs font-medium">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {mainName}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-600/10 text-red-400 text-xs font-medium">
                  <Tag className="w-3.5 h-3.5" />
                  {subName}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-600/10 text-red-400 text-xs font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {courseData.month || "Month Not Set"}
                </span>
              </div>

              <div className="mt-6 text-white bg-gradient-to-r from-yellow-400/10 to-orange-400/10 border border-yellow-400/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div className="text-sm leading-relaxed">
                    <div
                      className="course-description-content"
                      dangerouslySetInnerHTML={{
                        __html: courseData.courseDescription,
                      }}
                    />
                  </div>
                </div>

                {/* Inline style override for any HTML injected inside */}
                <style jsx>{`
                  .course-description-content,
                  .course-description-content * {
                    color: white !important;
                  }
                `}</style>
              </div>
            </section>

            {/* Student Details */}
            <section className="rounded-2xl bg-zinc-950 border border-zinc-800 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Student Details</h2>
                <span className="text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Encrypted
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-300 font-medium">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={userData?.name}
                    readOnly
                    className="w-full mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 font-medium">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={userData?.lastname}
                    readOnly
                    className="w-full mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-zinc-300 font-medium">
                  Address
                </label>
                <div className="relative">
                  <Home className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={address}
                    required
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, City, ZIP"
                    className="w-full pl-9 mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-300 font-medium">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={mobile}
                      required
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value.length <= 10) setMobile(value);
                      }}
                      placeholder="07XXXXXXXX"
                      maxLength={10}
                      className="w-full pl-9 mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 font-medium">
                    Second Mobile
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={secondMobile}
                      required
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value.length <= 10) setSecondMobile(value);
                      }}
                      placeholder="07XXXXXXXX"
                      maxLength={10}
                      className="w-full pl-9 mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-zinc-300 font-medium">
                  Delivery Method
                </label>
                <div className="relative">
                  <Package className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={deliveryBy}
                    onChange={(e) => setDeliveryBy(e.target.value)}
                    className="w-full pl-9 mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="slpost">SL Post</option>
                    <option value="courier">Courier</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="rounded-2xl bg-zinc-950 border border-zinc-800 p-6">
              <h3 className="text-xl font-semibold">Choose Payment Method</h3>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Online Payment */}
                <button
                  type="button"
                  disabled
                  onClick={() => setPaymentMethod("online")}
                  className={`group text-left rounded-xl p-4 border transition-all ${
                    paymentMethod === "online"
                      ? "border-red-600 bg-red-600/10 shadow-[0_0_0_3px_rgba(220,38,38,.2)]"
                      : "border-zinc-800 bg-black/40 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          paymentMethod === "online"
                            ? "bg-red-600/20"
                            : "bg-zinc-800"
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium">Online Payment</p>
                        <p className="text-xs text-zinc-400">
                          Fast and secure checkout
                        </p>
                      </div>
                    </div>
                    {paymentMethod === "online" && (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                </button>

                {/* Bank Slip */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank-slip")}
                  className={`group text-left rounded-xl p-4 border transition-all ${
                    paymentMethod === "bank-slip"
                      ? "border-red-600 bg-red-600/10 shadow-[0_0_0_3px_rgba(220,38,38,.2)]"
                      : "border-zinc-800 bg-black/40 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          paymentMethod === "bank-slip"
                            ? "bg-red-600/20"
                            : "bg-zinc-800"
                        }`}
                      >
                        <UploadCloud className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium">Bank Slip Upload</p>
                        <p className="text-xs text-zinc-400">
                          Upload your payment slip
                        </p>
                      </div>
                    </div>
                    {paymentMethod === "bank-slip" && (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                </button>
              </div>

              {paymentMethod === "online" && (
                <div className="mt-4 text-sm text-zinc-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                  <p>
                    A 2.5% payment processing fee is added because you selected
                    Online Payment.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Summary */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl">
              <h3 className="text-lg font-semibold">Order Summary</h3>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-zinc-300">
                  <span>Class Price</span>
                  <span className="font-medium">{formatLKR(basePrice)}</span>
                </div>

                {paymentMethod === "online" && (
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Processing Fee (2.5%)</span>
                    <span className="font-medium">{formatLKR(onlineFee)}</span>
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
                  <span className="text-zinc-200 font-semibold">Total</span>
                  <span className="text-3xl font-extrabold text-red-500">
                    {formatLKR(totalPrice)}
                  </span>
                </div>
              </div>

              <button
                onClick={
                  paymentMethod === "online"
                    ? handleOnlinePayment
                    : openBankSlipUploader
                }
                disabled={!detailsValid || isPaying}
                className={`mt-6 w-full inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${
                  !detailsValid || isPaying
                    ? "bg-zinc-700 cursor-not-allowed text-zinc-300"
                    : "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700"
                }`}
              >
                {paymentMethod === "online" ? (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    {isPaying
                      ? "Processing..."
                      : `Pay ${formatLKR(totalPrice)} Online`}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5" />
                    Upload Bank Slip & Enroll
                  </div>
                )}
              </button>

              <p className="mt-3 text-xs text-zinc-400">
                By continuing, you agree to our terms & privacy policy.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
