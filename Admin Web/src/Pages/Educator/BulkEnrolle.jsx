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

const parseSuccessFromMessage = (msg) => {
  if (!msg) return null;
  const match = msg.match(/\b(\d+)\s+users?\s+enrolled\s+successfully\b/i);
  return match ? Number(match[1]) : null;
};

const downloadCSV = (rows, filename = "failed-users.csv") => {
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

const BulkEnrollment = () => {
  const { backend_url, allCourses, categories } = useContext(AppContext);
  console.log(allCourses);
  console.log(categories);
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
    // Accept Excel files
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
    formData.append("file", file);
    formData.append("courseId", courseId);

    const controller = new AbortController();
    abortCtrlRef.current = controller;

    const start = performance.now();
    setLoading(true);

    try {
      const response = await axios.post(
        `${backend_url}/api/educator/enroll/bulk`,
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
        }
      );

      const data = response.data || {};
      setServerData(data);

      const failedUsers = Array.isArray(data.failedUsers)
        ? data.failedUsers
        : [];
      const failedCount = failedUsers.length;
      const parsedSuccess = parseSuccessFromMessage(data.message);
      const successCount = Number.isFinite(parsedSuccess)
        ? parsedSuccess
        : null;
      const totalCount = Number.isFinite(successCount)
        ? successCount + failedCount
        : null;

      setResult({
        success: !!data.success,
        message: data.message || "",
        failedUsers,
        failedCount,
        successCount, // may be null
        totalCount, // may be null
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
        serverMsg || err.message || "Failed to upload file or enroll users."
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

  const failedCSVRows = useMemo(() => {
    if (!result?.failedUsers?.length) return [];
    return result.failedUsers.map((u) => ({
      phonenumber: u.phonenumber || "",
      error: u.error || "",
    }));
  }, [result]);

  const copyFailedToClipboard = async () => {
    if (!failedCSVRows.length) return;
    const text = failedCSVRows
      .map((r) => `${r.phonenumber}\t${r.error}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("Failed users copied to clipboard.");
    } catch {
      alert("Unable to copy to clipboard.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Bulk User Enrollment
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Enroll users into a selected course using an Excel sheet (first
              column should be phone numbers).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDebugOpen((v) => !v)}
            className="text-sm px-3 py-1 rounded-md border hover:bg-gray-50"
            title="Toggle debug"
          >
            {debugOpen ? "Hide Debug" : "Show Debug"}
          </button>
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
                  {/* Thumbnail  <img
                    src={selectedCourse.courseThumbnail || ""}
                    alt={selectedCourse.courseTitle || "Course thumbnail"}
                    className="w-24 h-24 rounded-lg object-cover bg-white border"
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />*/}
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
              Excel File (first column: phone numbers)
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
              {loading ? "Processing..." : "Enroll Users"}
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
              onClick={() => {
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
              }}
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
                result.success
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-yellow-50 border-yellow-200 text-yellow-700"
              }`}
            >
              <div className="font-medium">Server Message</div>
              <div>{result.message || "—"}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-md bg-gray-50 border text-center">
                <div className="text-xs text-gray-500">Success</div>
                <div className="text-lg font-semibold text-green-600">
                  {Number.isFinite(result.successCount)
                    ? result.successCount
                    : "—"}
                </div>
              </div>
              <div className="p-3 rounded-md bg-gray-50 border text-center">
                <div className="text-xs text-gray-500">Failed</div>
                <div className="text-lg font-semibold text-red-600">
                  {result.failedCount ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-md bg-gray-50 border text-center">
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-lg font-semibold">
                  {Number.isFinite(result.totalCount) ? result.totalCount : "—"}
                </div>
              </div>
              <div className="p-3 rounded-md bg-gray-50 border text-center">
                <div className="text-xs text-gray-500">HTTP Status</div>
                <div className="text-lg font-semibold">
                  {statusInfo?.httpStatus ?? "—"}
                </div>
              </div>
            </div>

            {/* Failed Users */}
            {result.failedUsers?.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-semibold text-gray-800">
                    Failed Users
                  </h3>
                </div>

                <div className="bg-gray-50 border rounded-lg max-h-60 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="text-left p-2 border-b">#</th>
                        <th className="text-left p-2 border-b">Phone</th>
                        <th className="text-left p-2 border-b">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.failedUsers.map((u, idx) => (
                        <tr
                          key={`${u.phonenumber}-${idx}`}
                          className="odd:bg-white even:bg-gray-50"
                        >
                          <td className="p-2 border-b">{idx + 1}</td>
                          <td className="p-2 border-b font-mono">
                            {u.phonenumber}
                          </td>
                          <td className="p-2 border-b text-red-600">
                            {u.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={copyFailedToClipboard}
                    className="text-sm px-3 py-1 rounded-md border hover:bg-gray-50"
                  >
                    Copy to clipboard
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCSV(failedCSVRows)}
                    className="text-sm px-3 py-1 rounded-md border hover:bg-gray-50"
                  >
                    Download CSV
                  </button>
                </div>
              </div>
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
                  <li>URL: {backend_url}/api/educator/enroll/bulk</li>
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

export default BulkEnrollment;
