import axios from "axios";
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

import { useContext, useEffect, useState } from "react";
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
        return <Clock className="w-4 h-4 text-zinc-400" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-white" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return "bg-zinc-800 text-zinc-200 border-zinc-700";
      case "completed":
        return "bg-white text-black border-white/20";
      case "failed":
        return "bg-red-600/15 text-red-400 border-red-600/30";
      default:
        return "bg-zinc-800 text-zinc-200 border-zinc-700";
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
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-5xl font-bold text-white mb-3">
                Payment History
              </h1>
              <p className="text-lg text-zinc-400 max-w-2xl">
                A clear overview of your course payments and transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards (smaller) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Total Payments",
              count: payments.length,
              icon: <Wallet className="w-6 h-6" />,
            },
            {
              label: "Completed",
              count: payments.filter((p) => p.paymentStatus === "completed")
                .length,
              icon: <CheckCircle className="w-6 h-6" />,
            },
            {
              label: "Pending",
              count: payments.filter((p) => p.paymentStatus === "pending")
                .length,
              icon: <Clock className="w-6 h-6" />,
            },
            {
              label: "Failed",
              count: payments.filter((p) => p.paymentStatus === "failed")
                .length,
              icon: <XCircle className="w-6 h-6" />,
            },
          ].map((card, index) => (
            <div
              key={index}
              className="group relative overflow-hidden bg-zinc-900/70 rounded-xl p-4 border border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 rounded-lg bg-red-600/15 text-red-500">
                    {card.icon}
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-0.5">
                    {card.label}
                  </p>
                  <h3 className="text-2xl font-bold text-white">
                    {card.count}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-zinc-900/70 rounded-xl p-4 mb-8 border border-zinc-800 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by course name or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 text-zinc-100 placeholder-zinc-500 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
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
                      ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                      : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-900"
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
            <div className="bg-zinc-900/70 rounded-xl p-12 text-center border border-zinc-800 shadow-sm">
              <div className="w-20 h-20 bg-red-600/15 rounded-full flex items-center justify-center mx-auto mb-5">
                <CreditCard className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                No payments found
              </h3>
              <p className="text-zinc-400 text-lg">
                {filter === "all"
                  ? "You haven't made any payments yet."
                  : `No ${filter} payments match your search.`}
              </p>
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div
                key={payment._id}
                className="group bg-zinc-900/70 rounded-xl p-6 border border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex flex-col xl:flex-row gap-6">
                  {/* Left: Main Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 p-2.5 bg-zinc-800 rounded-lg group-hover:bg-zinc-700 transition-colors">
                        {getStatusIcon(payment.paymentStatus)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors">
                          {payment.course?.courseTitle || "No course linked"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(payment.createdAt)}
                          </span>
                          <span className="flex items-center gap-2">
                            Transaction ID:
                            <Receipt className="w-4 h-4" />
                            {payment.TXnumber}
                          </span>
                          <span className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Course Price: Rs.{" "}
                            {payment.amount?.toLocaleString?.() ??
                              payment.amount}
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
                      <div className="text-3xl font-bold text-white">
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
