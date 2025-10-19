import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify"; // adjust if you use a different toast library
import { AppContext } from "../../Context/AppContext";
import { useContext } from "react";

// Business constants
const PLAN_NAME = "Premium";
const PLAN_PRICE_LKR = 10000; // Base plan price per month
const FREE_SMS = 1000; // Free SMS per month
const EXTRA_SMS_RATE_LKR = 0.5; // Rs 0.5 per SMS

// Helpers
const formatCurrency = (n) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(n);

const toLocalDateString = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // matches typical "YYYY-MM-DD" pattern
};

const getMonthStartString = (d = new Date()) => {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  return toLocalDateString(start);
};

const getTodayString = () => toLocalDateString(new Date());

const getNextDueDate = () => {
  const now = new Date();
  const thisMonth20 = new Date(now.getFullYear(), now.getMonth(), 20);
  const due =
    now <= thisMonth20
      ? thisMonth20
      : new Date(now.getFullYear(), now.getMonth() + 1, 20);
  return due.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function PremiumPricing() {
  const [loading, setLoading] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [monthToDateCount, setMonthToDateCount] = useState(0);
  const { backend_url } = useContext(AppContext);
  const additionalSms = useMemo(
    () => Math.max(0, monthToDateCount - FREE_SMS),
    [monthToDateCount]
  );
  const additionalCost = useMemo(
    () => additionalSms * EXTRA_SMS_RATE_LKR,
    [additionalSms]
  );
  const totalThisMonth = useMemo(
    () => PLAN_PRICE_LKR + additionalCost,
    [additionalCost]
  );

  const freeUsage = Math.min(monthToDateCount, FREE_SMS);
  const freeUsagePct = Math.min(100, (freeUsage / FREE_SMS) * 100);

  const fetchCounts = async () => {
    try {
      setLoading(true);
      const todayStr = getTodayString();
      const monthStartStr = getMonthStartString();

      const [todayRes, monthRes] = await Promise.all([
        axios.post(`${backend_url}/api/educator/get-all-sms`, {
          startDate: todayStr,
        }),
        axios.post(`${backend_url}/api/educator/get-all-sms`, {
          startDate: monthStartStr,
          endDate: todayStr,
        }),
      ]);

      setTodayCount(Number(todayRes?.data?.totalCount || 0));
      setMonthToDateCount(Number(monthRes?.data?.totalCount || 0));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load SMS usage.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
            💎 Best Value
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900">
            Premium Plan Pricing
          </h1>
          <p className="mt-2 text-gray-600">
            Simple monthly pricing with 1,000 free SMS and transparent overage.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan Card */}
          <div className="relative rounded-2xl bg-white shadow-xl ring-1 ring-indigo-100 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-orange-400" />
            </div>

            <div className="p-8 sm:p-10">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {PLAN_NAME} Plan
                <span className="ml-2 inline-flex items-center rounded-full bg-fuchsia-100 px-2 py-0.5 text-xs font-semibold text-fuchsia-700">
                  Most Popular
                </span>
              </h2>

              <div className="mt-6 flex items-end gap-2">
                <div className="text-4xl sm:text-5xl font-extrabold text-gray-900">
                  {formatCurrency(PLAN_PRICE_LKR)}
                </div>
                <div className="pb-2 text-gray-500">/ month</div>
              </div>

              <ul className="mt-8 space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    ✓
                  </span>
                  <p className="text-gray-700">
                    1,000 SMS included every month
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    ✓
                  </span>
                  <p className="text-gray-700">
                    Additional SMS: {formatCurrency(EXTRA_SMS_RATE_LKR)} each
                    <span className="text-gray-500"> (0.5 cents)</span>
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    ✓
                  </span>
                  <p className="text-gray-700">
                    Payment due date: 20th of every month
                  </p>
                </li>
              </ul>

              <div className="mt-8">
                <button
                  type="button"
                  className="w-full sm:w-auto rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
                >
                  Get Premium
                </button>
              </div>

              <p className="mt-4 text-xs text-gray-500">
                All prices in Sri Lankan Rupees (LKR). SMS usage resets at the
                start of each month.
              </p>
            </div>
          </div>

          {/* Usage & Billing Card */}
          <div className="rounded-2xl bg-white shadow-xl ring-1 ring-pink-100 p-8 sm:p-10">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Usage & Billing
              </h3>
              <button
                onClick={fetchCounts}
                className="rounded-lg bg-pink-600 text-white px-4 py-2 text-sm font-semibold hover:bg-pink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink-600"
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 p-4 bg-gradient-to-br from-indigo-50 to-white">
                <div className="text-sm text-gray-500">SMS sent today</div>
                <div className="mt-1 text-3xl font-extrabold text-indigo-700">
                  {loading ? "—" : todayCount}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 p-4 bg-gradient-to-br from-pink-50 to-white">
                <div className="text-sm text-gray-500">
                  SMS this month (MTD)
                </div>
                <div className="mt-1 text-3xl font-extrabold text-pink-700">
                  {loading ? "—" : monthToDateCount}
                </div>
              </div>
            </div>

            {/* Free SMS Progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Free SMS used</span>
                <span>
                  {freeUsage} / {FREE_SMS}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-3 bg-gradient-to-r from-emerald-400 via-indigo-400 to-fuchsia-400"
                  style={{ width: `${freeUsagePct}%` }}
                />
              </div>
              {additionalSms > 0 && (
                <p className="mt-2 text-sm text-red-600">
                  You are over the free quota by{" "}
                  {additionalSms.toLocaleString()} SMS.
                </p>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="mt-8 rounded-xl border border-gray-100 p-5 bg-white">
              <h4 className="font-semibold text-gray-900 mb-4">
                Current Month Charges (so far)
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Base plan</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(PLAN_PRICE_LKR)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">
                    Additional SMS ({additionalSms.toLocaleString()} ×{" "}
                    {formatCurrency(EXTRA_SMS_RATE_LKR)})
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(additionalCost)}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    Total (MTD)
                  </span>
                  <span className="font-extrabold text-indigo-700">
                    {formatCurrency(totalThisMonth)}
                  </span>
                </div>
              </div>
            </div>

            {/* Due date */}
            <div className="mt-6 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-amber-100 p-5">
              <div className="text-sm text-gray-700">
                Payment due on the 20th of every month.
              </div>
              <div className="mt-1 font-semibold text-amber-800">
                Next due: {getNextDueDate()}
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Your API: POST /get-all-sms expects {"{ startDate, endDate? }"}{" "}
              and returns {"{ totalCount, smsCounts }"}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
