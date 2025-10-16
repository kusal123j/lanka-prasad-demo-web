import React, { useContext, useMemo, useState } from "react";
import axios from "axios";
import { AppContext } from "../../Context/AppContext";

// Helper: format Date to yyyy-mm-dd for <input type="date" />
const toDateInputValue = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Helper: extract filename from Content-Disposition header
const getFilenameFromDisposition = (disposition) => {
  if (!disposition) return null;
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(disposition);
  if (match && match[1])
    return decodeURIComponent(match[1].replace(/['"]/g, ""));
  return null;
};

const downloadBlob = (blob, filename = `payments_${Date.now()}.pdf`) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function TuteCenter({
  // set your API route here or pass as prop
  className = "",
}) {
  const [mode, setMode] = useState("single"); // "single" | "range"
  const [date, setDate] = useState(toDateInputValue());
  const [startDate, setStartDate] = useState(toDateInputValue());
  const [endDate, setEndDate] = useState(toDateInputValue());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { backend_url } = useContext(AppContext);
  const endpoint = backend_url + "/api/educator/get-payments-by-date";
  const isValid = useMemo(() => {
    if (mode === "single") return Boolean(date);
    if (!startDate || !endDate) return false;
    return startDate <= endDate;
  }, [mode, date, startDate, endDate]);

  const payload = useMemo(() => {
    return mode === "single" ? { date } : { startDate, endDate };
  }, [mode, date, startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await axios.post(endpoint, payload, {
        responseType: "blob", // PDF stream
        // withCredentials: true, // enable if your API uses cookies/auth
      });

      const contentType = res.headers["content-type"] || "";
      // If backend returns JSON error with responseType 'blob', show it
      if (contentType.includes("application/json")) {
        const text = await res.data.text();
        const json = JSON.parse(text || "{}");
        throw new Error(json.message || "Unexpected server response.");
      }

      const filename =
        getFilenameFromDisposition(res.headers["content-disposition"]) ||
        `payments_${Date.now()}.pdf`;

      const blob = new Blob([res.data], { type: "application/pdf" });
      downloadBlob(blob, filename);
      setSuccess("Your report is downloading.");
    } catch (err) {
      // axios errors may also contain blob, try parsing
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text || "{}");
          setError(json.message || "Failed to generate report.");
        } catch {
          setError(err.message || "Failed to generate report.");
        }
      } else {
        setError(err.message || "Failed to generate report.");
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMode("single");
    setDate(toDateInputValue());
    setStartDate(toDateInputValue());
    setEndDate(toDateInputValue());
    setError("");
    setSuccess("");
  };

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Payments Report (PDF)
            </h2>
            <p className="text-sm text-gray-500">
              Download completed payments by date or date range.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mode toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Mode:</span>
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setMode("single")}
                className={`px-4 py-2 text-sm ${
                  mode === "single"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Single day
              </button>
              <button
                type="button"
                onClick={() => setMode("range")}
                className={`px-4 py-2 text-sm ${
                  mode === "range"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Date range
              </button>
            </div>
          </div>

          {/* Inputs */}
          {mode === "single" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            </div>
          )}

          {/* Alerts */}
          {!isValid && (
            <div className="text-sm text-red-600">
              {mode === "single"
                ? "Please select a date."
                : "Select both start and end dates, and ensure start date is not after end date."}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!isValid || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5L16.5 12M12 3v13.5"
                    />
                  </svg>
                  Download PDF
                </>
              )}
            </button>

            <button
              type="button"
              onClick={reset}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Reset
            </button>
          </div>

          <p className="text-xs text-gray-500 pt-1">
            Note: The API expects either a single "date" or a "startDate" and
            "endDate" (YYYY-MM-DD).
          </p>
        </form>
      </div>
    </div>
  );
}
