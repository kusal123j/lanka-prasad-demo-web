import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  Eye,
  X,
  DollarSign,
  User,
  Mail,
  Calendar,
  CreditCard,
  BookOpen,
  Check,
  XCircle,
  Clock,
  Search,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
} from "lucide-react";
import axios from "axios";
import { AppContext } from "../../Context/AppContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const PendingPayments = () => {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingPayment, setUpdatingPayment] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);

  const [search, setSearch] = useState("");

  // Bank slip full-screen viewer
  const [isSlipFull, setIsSlipFull] = useState(false);
  const [slipZoom, setSlipZoom] = useState(1);

  const navigate = useNavigate();
  const { backend_url, allCourses } = useContext(AppContext);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString("en-LK", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const formatAmount = (amount) => {
    const n = Number(amount) || 0;
    try {
      return new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return `Rs ${n.toFixed(2)}`;
    }
  };

  const getStatusIcon = (status) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return <Check className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getCourseTitle = (payment) => {
    // Try all known shapes
    const fromPayment =
      payment?.course?.title ||
      payment?.course?.courseTitle ||
      payment?.courseTitle;

    const courseId =
      payment?.courseId ||
      payment?.course?._id ||
      payment?.course ||
      payment?.course?._id;

    const fromAll =
      allCourses?.find((c) => c._id === courseId)?.courseTitle ||
      allCourses?.find((c) => c._id === payment?.courseId)?.courseTitle;

    return fromPayment || fromAll || "Unknown course";
  };

  const getTxnNumber = (p) =>
    p?.txNumber || p?.TXnumber || p?.txnNumber || p?.transactionNumber || "—";

  const getBankSlipUrl = (p) =>
    p?.bankSlipImage || p?.bankSlipUrl || p?.bankSlip || p?.slipUrl || "";

  const normalizePayments = (raw) =>
    raw.map((p) => ({
      ...p,
      id: p.id || p._id, // unify id field
      status: p.status || p.paymentStatus || "pending",
      amount: Number(p.amount) || 0,
      user: p.user || p.student || {},
    }));

  const handlePendingPayments = async (page = 1) => {
    try {
      setLoading(true);
      axios.defaults.withCredentials = true;
      const { data } = await axios.get(
        `${backend_url}/api/educator/pending-payments?page=${page}`
      );

      if (data?.success) {
        setPayments(normalizePayments(data.payments || []));
        setCurrentPage(data.currentPage || 1);
        setTotalPages(data.totalPages || 1);
        setTotalPayments(data.totalPayments || 0);
      } else {
        toast.error("Failed to fetch pending payments");
      }
    } catch (error) {
      toast.error("Failed to fetch pending payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handlePendingPayments(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => {
      const name = p?.user?.name || p?.student?.name || "";
      const email = p?.user?.email || p?.student?.email || "";
      const txn = getTxnNumber(p);
      const course = getCourseTitle(p);
      return [name, email, txn, course].some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [payments, search, allCourses]);

  const handleRowClick = (payment) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
    setIsSlipFull(false);
    setSlipZoom(1);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPayment(null);
    setIsSlipFull(false);
    setSlipZoom(1);
  };

  const updatePaymentStatus = async (paymentId, newStatus) => {
    setUpdatingPayment(paymentId);
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.put(
        `${backend_url}/api/educator/${paymentId}/status`,
        { status: newStatus }
      );
      if (data?.success) {
        toast.success(data.message || "Payment updated");
        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, status: newStatus } : p
          )
        );
        setSelectedPayment((prev) =>
          prev && prev.id === paymentId ? { ...prev, status: newStatus } : prev
        );
        // optional: close modal after success
        closeModal();
        handlePendingPayments();
      } else {
        toast.error(data?.message || "Failed to update payment");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Error updating payment"
      );
    } finally {
      setUpdatingPayment(null);
    }
  };

  const downloadImage = async (url, filename = "bank-slip.jpg") => {
    try {
      const res = await fetch(url, { credentials: "omit" });
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch {
      toast.error("Failed to download slip");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-6">
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-lg"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalAmountOnPage = filteredPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );
  const avgAmountOnPage = filteredPayments.length
    ? totalAmountOnPage / filteredPayments.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Payment Management
          </h1>
          <p className="text-slate-600">
            Manage and review pending payment submissions
          </p>
        </div>

        {/* Quick Nav */}
        <div className="flex flex-wrap gap-3 m-3">
          <button
            onClick={() => navigate("/educator/pending-payments")}
            className="bg-yellow-500 text-black font-semibold px-5 py-2 rounded-md hover:bg-yellow-600 transition"
          >
            Pending Payments
          </button>
          <button
            onClick={() => navigate("/educator/completed-payments")}
            className="bg-green-600 text-white font-semibold px-5 py-2 rounded-md hover:bg-green-700 transition"
          >
            Completed Payments
          </button>
          <button
            onClick={() => navigate("/educator/failed-payments")}
            className="bg-red-600 text-white font-semibold px-5 py-2 rounded-md hover:bg-red-700 transition"
          >
            Failed Payments
          </button>
        </div>

        {/* Top Row: Stats + Search */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Pending
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {totalPayments}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Amount (page)
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatAmount(totalAmountOnPage)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Avg. Amount (page)
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatAmount(avgAmountOnPage || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Pending Payments
            </h2>
            <span className="text-sm text-slate-500">
              Showing {filteredPayments.length} of {payments.length} on this
              page
            </span>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No payments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      TXN Number
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors duration-200"
                      onClick={() => handleRowClick(payment)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {(payment?.user?.name || "?").charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900">
                              {payment?.user?.name || "Unknown"}
                            </div>
                            <div className="text-sm text-slate-500">
                              {payment?.user?.email || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {getCourseTitle(payment)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">
                          {formatAmount(payment.amount)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-slate-600">
                          {getTxnNumber(payment)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-500">
                          {formatDate(payment.createdAt)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            payment.status
                          )}`}
                        >
                          {getStatusIcon(payment.status)}
                          <span className="ml-1 capitalize">
                            {payment.status}
                          </span>
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(payment);
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-xs font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex justify-center items-center gap-2 m-6">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                  Prev
                </button>

                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded ${
                        currentPage === page
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && selectedPayment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900">
                  Payment Details
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Bank Slip Image */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-900">
                      Bank Slip
                    </h4>
                    {getBankSlipUrl(selectedPayment) ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setIsSlipFull(true);
                            setSlipZoom(1);
                          }}
                          className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <Maximize2 className="w-4 h-4" />
                          Full screen
                        </button>
                        <a
                          href={getBankSlipUrl(selectedPayment)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          Open
                        </a>
                        <button
                          onClick={() =>
                            downloadImage(
                              getBankSlipUrl(selectedPayment),
                              `bank-slip-${
                                selectedPayment?.id || "payment"
                              }.jpg`
                            )
                          }
                          className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="bg-slate-100 rounded-lg p-3 text-center">
                    <div className="w-full h-96 md:h-[28rem] bg-white rounded-md flex items-center justify-center overflow-hidden">
                      {getBankSlipUrl(selectedPayment) ? (
                        <img
                          src={getBankSlipUrl(selectedPayment)}
                          alt="Bank slip"
                          className="h-full w-full object-contain cursor-zoom-in"
                          onClick={() => {
                            setIsSlipFull(true);
                            setSlipZoom(1);
                          }}
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://via.placeholder.com/800x600?text=Unable+to+load+slip";
                          }}
                        />
                      ) : (
                        <div className="text-slate-500 text-sm">
                          No bank slip provided.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Transaction Number
                        </p>
                        <p className="text-sm text-slate-600 font-mono">
                          {getTxnNumber(selectedPayment)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Amount
                        </p>
                        <p className="text-lg font-bold text-slate-900">
                          {formatAmount(selectedPayment.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Submitted On
                        </p>
                        <p className="text-sm text-slate-600">
                          {formatDate(selectedPayment.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Student Name
                        </p>
                        <p className="text-sm text-slate-600">
                          {selectedPayment?.user?.name || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Phone Number
                        </p>
                        <p className="text-sm text-slate-600">
                          {selectedPayment?.user?.phonenumber || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <BookOpen className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Course
                        </p>
                        <p className="text-sm text-slate-600">
                          {getCourseTitle(selectedPayment)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Update Buttons */}
                <div className="border-t border-slate-200 pt-6">
                  <h4 className="text-sm font-medium text-slate-900 mb-4">
                    Update Payment Status
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {["pending", "completed", "failed"].map((status) => {
                      const isUpdating = updatingPayment === selectedPayment.id;
                      const isActive =
                        (selectedPayment.status || "").toLowerCase() === status;
                      return (
                        <button
                          key={status}
                          onClick={() =>
                            updatePaymentStatus(selectedPayment.id, status)
                          }
                          disabled={isUpdating || isActive}
                          className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : status === "completed"
                              ? "bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md"
                              : status === "failed"
                              ? "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md"
                              : "bg-yellow-600 hover:bg-yellow-700 text-white shadow-sm hover:shadow-md"
                          } ${
                            isUpdating ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          {isUpdating ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          ) : (
                            getStatusIcon(status)
                          )}
                          <span className="ml-2 capitalize">
                            {isUpdating ? "Updating..." : status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Full-screen Slip Viewer */}
            {isSlipFull && getBankSlipUrl(selectedPayment) && (
              <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
                <div className="flex items-center justify-between p-3">
                  <span className="text-white/90 text-sm">
                    Bank Slip • {getTxnNumber(selectedPayment)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsSlipFull(false)}
                      className="text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto flex items-center justify-center">
                  <img
                    src={getBankSlipUrl(selectedPayment)}
                    alt="Bank slip full"
                    className="max-w-none"
                    style={{
                      transform: `scale(${slipZoom})`,
                      transition: "transform 0.15s ease",
                    }}
                    onDoubleClick={() => setSlipZoom((z) => (z >= 2 ? 1 : 2))}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/1200x800?text=Unable+to+load+slip";
                    }}
                  />
                </div>

                <div className="absolute bottom-6 inset-x-0 flex items-center justify-center">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-2 rounded-lg">
                    <button
                      onClick={() =>
                        setSlipZoom((z) =>
                          Math.max(0.5, +(z - 0.25).toFixed(2))
                        )
                      }
                      className="text-white/90 hover:text-white px-2 py-1"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    <span className="text-white text-sm min-w-[56px] text-center">
                      {(slipZoom * 100).toFixed(0)}%
                    </span>
                    <button
                      onClick={() =>
                        setSlipZoom((z) => Math.min(5, +(z + 0.25).toFixed(2)))
                      }
                      className="text-white/90 hover:text-white px-2 py-1"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSlipZoom(1)}
                      className="text-white/90 hover:text-white px-2 py-1"
                    >
                      <RotateCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        downloadImage(
                          getBankSlipUrl(selectedPayment),
                          `bank-slip-${selectedPayment?.id || "payment"}.jpg`
                        )
                      }
                      className="text-white/90 hover:text-white px-2 py-1"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingPayments;
