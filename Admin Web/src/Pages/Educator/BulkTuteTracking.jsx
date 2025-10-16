import React, { useContext, useMemo, useRef, useState } from "react";
import axios from "axios";
import { AppContext } from "../../Context/AppContext";

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "-";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const downloadCSV = (rows, filename = "rows.csv") => {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => `"${(row[h] ?? "").toString().replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Safely derive a human-friendly name from possibly an id or object
const readName = (val) => {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object")
    return (
      val.name || val.title || val.label || val.slug || val._id || undefined
    );
  return undefined;
};

const makeCourseLabel = (c) => {
  const title = c.courseTitle || "Untitled";
  const main = readName(c.mainCategory) || c.category || "-";
  const sub = readName(c.subCategory) || "-";
  const month = c.month || "-";
  return `${title} : ${main} : ${sub} : ${month}`;
};

const statusPills = {
  success: "bg-green-100 text-green-700",
  saved_but_sms_failed: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-gray-200 text-gray-700",
};

const BulkTuteTracking = () => {
  const { backend_url, allCourses } = useContext(AppContext);

  const [file, setFile] = useState(null);
  const [courseId, setCourseId] = useState("");
  const [query, setQuery] = useState("");
  const [publishedOnly, setPublishedOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [serverData, setServerData] = useState(null); // raw server response
  const [result, setResult] = useState(null); // derived summary
  const [error, setError] = useState("");
  const [debugOpen, setDebugOpen] = useState(false);
  const [timing, setTiming] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);

  const [filterStatus, setFilterStatus] = useState("all");

  const abortCtrlRef = useRef(null);
  const inputFileRef = useRef(null);

  // Build options from allCourses
  const courseOptions = useMemo(() => {
    const list = Array.isArray(allCourses) ? allCourses : [];
    const options = list.map((c) => ({
      id: c._id,
      label: makeCourseLabel(c),
      course: c,
    }));
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [allCourses]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    let opts = courseOptions;
    if (publishedOnly) {
      opts = opts.filter((o) => !!o.course.isPublished);
    }
    if (!q) return opts;
    return opts.filter((o) => {
      const hay = [
        o.label,
        o.course.courseTitle,
        o.course.month,
        o.course.category,
        readName(o.course.mainCategory),
        readName(o.course.subCategory),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [courseOptions, query, publishedOnly]);

  const selectedCourse = useMemo(() => {
    if (!courseId) return null;
    return allCourses?.find((c) => c._id === courseId) || null;
  }, [allCourses, courseId]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setServerData(null);
    setResult(null);
    setError("");
    setUploadProgress(0);
  };

  const openFilePicker = () => inputFileRef.current?.click();

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    const ok = /\.(xlsx|xls)$/i.test(f.name);
    if (!ok) {
      alert("Please drop an Excel file (.xlsx or .xls).");
      return;
    }
    setFile(f);
    setServerData(null);
    setResult(null);
    setError("");
    setUploadProgress(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !courseId) {
      setError("Please select a course and choose the Excel file.");
      return;
    }

    setError("");
    setResult(null);
    setServerData(null);
    setStatusInfo(null);
    setUploadProgress(0);
    setTiming(null);

    const formData = new FormData();
    formData.append("file", file); // field name must be 'file'
    formData.append("courseId", courseId);

    const controller = new AbortController();
    abortCtrlRef.current = controller;

    const start = performance.now();
    setLoading(true);

    try {
      const response = await axios.post(
        `${backend_url}/api/educator/bulk-tracking-number`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (evt) => {
            if (evt.total) {
              const percent = Math.round((evt.loaded * 100) / evt.total);
              setUploadProgress(percent);
            }
          },
          signal: controller.signal,
          // withCredentials: true, // uncomment if your auth is cookie-based and you need credentials
        }
      );

      const data = response.data || {};
      setServerData(data);

      const details = Array.isArray(data.details) ? data.details : [];
      setResult({
        ok: !!data.ok,
        courseId: data.courseId,
        totalRows: Number(data.totalRows) || 0,
        processed: Number(data.processed) || 0,
        successCount: Number(data.success) || 0,
        failureCount: Number(data.failures) || 0,
        details,
      });

      setStatusInfo({
        httpStatus: response.status,
        statusText: response.statusText,
        ok: response.status >= 200 && response.status < 300,
      });
    } catch (err) {
      const resp = err?.response;
      const serverMsg = resp?.data?.message;
      setError(
        serverMsg ||
          err.message ||
          "Failed to upload file or process tracking numbers."
      );
      setStatusInfo({
        httpStatus: resp?.status ?? "—",
        statusText: resp?.statusText ?? "Request Error",
        ok: false,
      });
      setServerData(resp?.data || null);
    } finally {
      const ms = Math.round(performance.now() - start);
      setTiming({ durationMs: ms });
      setLoading(false);
      abortCtrlRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const resetAll = () => {
    setFile(null);
    setCourseId("");
    setQuery("");
    setPublishedOnly(false);
    setError("");
    setResult(null);
    setServerData(null);
    setUploadProgress(0);
    setStatusInfo(null);
    setTiming(null);
    setFilterStatus("all");
  };

  const countsByStatus = useMemo(() => {
    const map = { success: 0, saved_but_sms_failed: 0, failed: 0, skipped: 0 };
    if (result?.details?.length) {
      result.details.forEach((d) => {
        if (d?.status) map[d.status] = (map[d.status] || 0) + 1;
      });
    }
    return map;
  }, [result]);

  const filteredDetails = useMemo(() => {
    if (!result?.details?.length) return [];
    if (filterStatus === "all") return result.details;
    return result.details.filter((d) => d.status === filterStatus);
  }, [result, filterStatus]);

  const detailsCSVRows = useMemo(() => {
    if (!result?.details?.length) return [];
    return result.details.map((d) => ({
      row: d.row ?? "",
      phone: d.phone ?? "",
      tracking: d.tracking ?? "",
      status: d.status ?? "",
      reason: d.reason ?? "",
    }));
  }, [result]);

  const copyDetailsToClipboard = async () => {
    if (!detailsCSVRows.length) return;
    const text = detailsCSVRows
      .map(
        (r) => `${r.row}\t${r.phone}\t${r.tracking}\t${r.status}\t${r.reason}`
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("Details copied to clipboard.");
    } catch {
      alert("Unable to copy to clipboard.");
    }
  };

  const downloadTemplate = () => {
    // No header row on purpose (server treats first row as data)
    const rows = [
      { phone: "0771234567", tracking: "AB123456789LK" },
      { phone: "0719876543", tracking: "CD987654321LK" },
    ];
    const csv = rows.map((r) => `${r.phone},${r.tracking}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "tute-tracking-template.csv";
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Bulk Tute Tracking Numbers
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload an Excel sheet to assign tracking numbers to paid users of
              the selected course. First sheet only. Column A = Phone, Column B
              = Tracking number. Preferably no header row.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="text-sm px-3 py-1 rounded-md border hover:bg-gray-50"
              title="Download sample CSV"
            >
              Template
            </button>
            <button
              type="button"
              onClick={() => setDebugOpen((v) => !v)}
              className="text-sm px-3 py-1 rounded-md border hover:bg-gray-50"
              title="Toggle debug"
            >
              {debugOpen ? "Hide Debug" : "Show Debug"}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Course Selector */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Select Course
            </label>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by title, category, subcategory, or month..."
                    className="w-full border rounded-lg pl-10 pr-10 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    🔎
                  </span>
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-gray-600 select-none">
                  <input
                    type="checkbox"
                    checked={publishedOnly}
                    onChange={(e) => setPublishedOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Published only
                </label>
              </div>

              <div>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="" disabled>
                    {filteredOptions.length
                      ? `Select a course (${filteredOptions.length} available)`
                      : "No courses found"}
                  </option>
                  {filteredOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Course Preview */}
              {selectedCourse && (
                <div className="border rounded-xl p-4 bg-gray-50 flex gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800">
                        {selectedCourse.courseTitle || "Untitled"}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          selectedCourse.isPublished
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {selectedCourse.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Month: <b>{selectedCourse.month || "-"}</b>
                      </span>

                      <span>
                        Main:{" "}
                        <b>{readName(selectedCourse.mainCategory) || "-"}</b>
                      </span>
                      <span>
                        Sub:{" "}
                        <b>{readName(selectedCourse.subCategory) || "-"}</b>
                      </span>
                      {selectedCourse.coursePrice != null && (
                        <span>
                          Price: Rs.
                          <b>
                            {Number(
                              selectedCourse.coursePrice
                            ).toLocaleString()}
                          </b>
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            selectedCourse._id || ""
                          );
                          alert("Course ID copied to clipboard");
                        }}
                        className="text-sm px-3 py-1 rounded-md border hover:bg-white"
                      >
                        Copy Course ID
                      </button>
                      <button
                        type="button"
                        onClick={() => setCourseId("")}
                        className="text-sm px-3 py-1 rounded-md border hover:bg-white"
                      >
                        Clear selection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Excel File (A: phone, B: tracking)
            </label>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={openFilePicker}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-6 bg-gray-50 hover:bg-gray-100 transition
                ${file ? "border-green-300" : "border-gray-300"}`}
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">📄</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    {file ? file.name : "Drag & drop your Excel file here"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Accepted: .xlsx, .xls • Click to browse
                  </div>
                  {file && (
                    <div className="text-xs text-gray-500 mt-1">
                      Size: {formatBytes(file.size)}
                    </div>
                  )}
                </div>
                {file && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-sm px-3 py-1 rounded-md border hover:bg-white"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                ref={inputFileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Tip: Avoid header rows. First sheet only. Non-digits in phone will
              be ignored server-side e.g., 94XXXXXXXXX --&gt; 0XXXXXXXXX.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {loading && (
            <div className="w-full">
              <div className="flex justify-between text-sm mb-1 text-gray-600">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading ? "Processing..." : "Upload Tracking Numbers"}
            </button>

            {loading && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={resetAll}
              className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Results */}
        {result && (
          <div className="mt-8 space-y-4">
            <div
              className={`p-3 rounded-md border ${
                result.ok
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-yellow-50 border-yellow-200 text-yellow-700"
              }`}
            >
              <div className="font-medium">Server Summary</div>
              <div className="text-sm">
                Processed {result.processed}/{result.totalRows} rows.
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="p-3 rounded-md bg-gray-50 border text-center">
                <div className="text-xs text-gray-500">Success</div>
                <div className="text-lg font-semibold text-green-600">
                  {result.successCount ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-md bg-gray-50 border text-center">
                <div className="text-xs text-gray-500">SMS Failed (Saved)</div>
                <div className="text-lg font-semibold text-yellow-600">
                  {countsByStatus.saved_but_sms_failed ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-md bg-gray-50 border text-center">
                <div className="text-xs text-gray-500">Failed</div>
                <div className="text-lg font-semibold text-red-600">
                  {result.failureCount ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-md bg-gray-50 border text-center">
                <div className="text-xs text-gray-500">Skipped</div>
                <div className="text-lg font-semibold">
                  {countsByStatus.skipped ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-md bg-gray-50 border text-center">
                <div className="text-xs text-gray-500">Processed</div>
                <div className="text-lg font-semibold">
                  {result.processed ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-md bg-gray-50 border text-center">
                <div className="text-xs text-gray-500">HTTP Status</div>
                <div className="text-lg font-semibold">
                  {statusInfo?.httpStatus ?? "—"}
                </div>
              </div>
            </div>

            {/* Details Filter */}
            {result.details?.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-semibold text-gray-800">
                    Row Details
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Filter:</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="text-sm border rounded-md px-2 py-1"
                    >
                      <option value="all">All</option>
                      <option value="success">Success</option>
                      <option value="saved_but_sms_failed">
                        SMS Failed (Saved)
                      </option>
                      <option value="failed">Failed</option>
                      <option value="skipped">Skipped</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 border rounded-lg max-h-72 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-2 border-b">Row</th>
                        <th className="text-left p-2 border-b">Phone</th>
                        <th className="text-left p-2 border-b">Tracking</th>
                        <th className="text-left p-2 border-b">Status</th>
                        <th className="text-left p-2 border-b">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDetails.map((d, idx) => (
                        <tr
                          key={`${d.row}-${d.phone}-${idx}`}
                          className="odd:bg-white even:bg-gray-50"
                        >
                          <td className="p-2 border-b">{d.row ?? "—"}</td>
                          <td className="p-2 border-b font-mono">
                            {d.phone ?? "—"}
                          </td>
                          <td className="p-2 border-b font-mono">
                            {d.tracking ?? "—"}
                          </td>
                          <td className="p-2 border-b">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                statusPills[d.status] ||
                                "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {d.status || "—"}
                            </span>
                          </td>
                          <td className="p-2 border-b text-gray-700">
                            {d.reason || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={copyDetailsToClipboard}
                    className="text-sm px-3 py-1 rounded-md border hover:bg-gray-50"
                  >
                    Copy to clipboard
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCSV(detailsCSVRows, "bulk-tracking-details.csv")
                    }
                    className="text-sm px-3 py-1 rounded-md border hover:bg-gray-50"
                  >
                    Download CSV
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Debug Panel */}
        {debugOpen && (
          <div className="mt-8">
            <h2 className="text-md font-semibold text-gray-800 mb-2">Debug</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 rounded-md bg-gray-50 border">
                <div className="text-sm text-gray-600 mb-1">Request</div>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>URL: {backend_url}/api/educator/bulk-tracking-number</li>
                  <li>Method: POST (multipart/form-data)</li>
                  <li>
                    Course ID:{" "}
                    <span className="font-mono">{courseId || "—"}</span>
                  </li>
                  <li>
                    File:{" "}
                    {file ? `${file.name} (${formatBytes(file.size)})` : "—"}
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-md bg-gray-50 border">
                <div className="text-sm text-gray-600 mb-1">Response</div>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>
                    Status: {statusInfo?.httpStatus ?? "—"}{" "}
                    {statusInfo?.statusText ? `(${statusInfo.statusText})` : ""}
                  </li>
                  <li>OK: {String(!!statusInfo?.ok)}</li>
                  <li>
                    Duration:{" "}
                    {timing?.durationMs ? `${timing.durationMs} ms` : "—"}
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-md bg-gray-50 border">
              <div className="text-sm text-gray-600 mb-1">Raw server data</div>
              <pre className="text-xs overflow-auto max-h-64">
                {serverData ? JSON.stringify(serverData, null, 2) : "—"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkTuteTracking;
