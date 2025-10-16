import React, { useContext, useState } from "react";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Receipt,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";
import { AppContext } from "../../Context/AppContext";

const PaymentHistory = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { payments } = useContext(AppContext);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-amber-600" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "failed":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getStatusIconWrap = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-50";
      case "completed":
        return "bg-emerald-50";
      case "failed":
        return "bg-rose-50";
      default:
        return "bg-slate-50";
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const courseTitle = payment.course?.courseTitle || "";
    const matchesFilter = filter === "all" || payment.paymentStatus === filter;
    const matchesSearch =
      courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.TXnumber &&
        payment.TXnumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
                Payment History
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mt-2">
                A clear overview of your course payments and transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Total Payments",
              count: payments.length,
              Icon: Wallet,
              iconWrap: "bg-sky-100 text-sky-600",
            },
            {
              label: "Completed",
              count: payments.filter((p) => p.paymentStatus === "completed")
                .length,
              Icon: CheckCircle,
              iconWrap: "bg-emerald-100 text-emerald-600",
            },
            {
              label: "Pending",
              count: payments.filter((p) => p.paymentStatus === "pending")
                .length,
              Icon: Clock,
              iconWrap: "bg-amber-100 text-amber-600",
            },
            {
              label: "Failed",
              count: payments.filter((p) => p.paymentStatus === "failed")
                .length,
              Icon: XCircle,
              iconWrap: "bg-rose-100 text-rose-600",
            },
          ].map((card, index) => (
            <div
              key={index}
              className="group relative overflow-hidden bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                  <div
                    className={`p-2.5 rounded-lg ${card.iconWrap} shadow-inner`}
                  >
                    <card.Icon className="w-6 h-6" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">
                    {card.label}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {card.count}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl p-4 mb-8 border border-slate-200 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by course name or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white text-slate-800 placeholder-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All", count: payments.length },
                {
                  key: "completed",
                  label: "Completed",
                  count: payments.filter((p) => p.paymentStatus === "completed")
                    .length,
                },
                {
                  key: "pending",
                  label: "Pending",
                  count: payments.filter((p) => p.paymentStatus === "pending")
                    .length,
                },
                {
                  key: "failed",
                  label: "Failed",
                  count: payments.filter((p) => p.paymentStatus === "failed")
                    .length,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    filter === tab.key
                      ? "bg-sky-600 text-white border-sky-600 hover:bg-sky-700 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Payment List */}
        <div className="space-y-6">
          {filteredPayments.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
              <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CreditCard className="w-10 h-10 text-sky-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                No payments found
              </h3>
              <p className="text-slate-600 text-lg">
                {filter === "all"
                  ? "You haven't made any payments yet."
                  : `No ${filter} payments match your search.`}
              </p>
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div
                key={payment._id}
                className="group bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex flex-col xl:flex-row gap-6">
                  {/* Left: Main Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`flex-shrink-0 p-2.5 rounded-lg ${getStatusIconWrap(
                          payment.paymentStatus
                        )} group-hover:shadow-inner transition-colors`}
                      >
                        {getStatusIcon(payment.paymentStatus)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-sky-700 transition-colors">
                          {payment.course?.courseTitle || "No course linked"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            {formatDate(payment.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status and Amount */}
                  <div className="flex flex-col items-end justify-between gap-4">
                    <span
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${getStatusBadge(
                        payment.paymentStatus
                      )}`}
                    >
                      {payment.paymentStatus.charAt(0).toUpperCase() +
                        payment.paymentStatus.slice(1)}
                    </span>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-slate-900">
                        Rs.{" "}
                        {payment.amount?.toLocaleString?.() ?? payment.amount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
