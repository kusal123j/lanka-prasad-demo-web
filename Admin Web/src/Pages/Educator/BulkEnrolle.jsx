import React, { useContext, useMemo, useRef, useState } from "react";
import axios from "axios";
import Select, { components } from "react-select";
import { AppContext } from "../../Context/AppContext";

// ---------- Utils ----------
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

const looksLikeObjectId = (s) =>
  typeof s === "string" && /^[a-f\d]{24}$/i.test(s);

// ---------- Component ----------
const BulkEnrollment = () => {
  const { backend_url, allCourses, categories } = useContext(AppContext);

  const [file, setFile] = useState(null);
  const [courseId, setCourseId] = useState("");
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

  // ---------- Category name resolution (ids -> human names) ----------
  const { mainById, subById } = useMemo(() => {
    const main = new Map();
    const sub = new Map();
    const list = Array.isArray(categories) ? categories : [];

    list.forEach((m) => {
      const mName = m?.name || m?.title || m?.label || m?.slug || m?._id;
      if (m?._id) main.set(m._id, mName);
      const subs = Array.isArray(m?.subcategories) ? m.subcategories : [];
      subs.forEach((s) => {
        const sName = s?.name || s?.title || s?.label || s?.slug || s?._id;
        if (s?._id) sub.set(s._id, sName);
      });
    });

    return { mainById: main, subById: sub };
  }, [categories]);

  const readName = (val) => {
    if (!val) return undefined;
    if (typeof val === "string") {
      const mapped = mainById.get(val) || subById.get(val);
      if (mapped) return mapped;
      // Avoid showing raw Mongo IDs as labels; show nothing if it's an ID
      return looksLikeObjectId(val) ? undefined : val;
    }
    if (typeof val === "object") {
      return (
        val.name ||
        val.title ||
        val.label ||
        val.slug ||
        mainById.get(val._id) ||
        subById.get(val._id) ||
        (looksLikeObjectId(val._id) ? undefined : val._id) ||
        undefined
      );
    }
    return undefined;
  };

  const makeCourseLabel = (c) => {
    const title = c.courseTitle || "Untitled";
    const main = readName(c.mainCategory) || c.category || "-";
    const sub = readName(c.subCategory) || "-";
    const month = c.month || "-";
    return `${title} • ${main} • ${sub} • ${month}`;
  };

  // ---------- Build options for react-select ----------
  const flatCourseOptions = useMemo(() => {
    const list = Array.isArray(allCourses) ? allCourses : [];
    return list.map((c) => {
      const title = c.courseTitle || "Untitled";
      const main = readName(c.mainCategory) || c.category || "-";
      const sub = readName(c.subCategory) || "-";
      const month = c.month || "-";
      return {
        value: c._id,
        label: `${title} • ${main} • ${sub} • ${month}`,
        meta: {
          course: c,
          title,
          main,
          sub,
          month,
          published: !!c.isPublished,
          price: c.coursePrice,
        },
      };
    });
  }, [allCourses, mainById, subById]); // readName depends on maps

  const filteredFlatOptions = useMemo(() => {
    return publishedOnly
      ? flatCourseOptions.filter((o) => o.meta.published)
      : flatCourseOptions;
  }, [flatCourseOptions, publishedOnly]);

  const groupedOptions = useMemo(() => {
    const groups = new Map();
    filteredFlatOptions.forEach((opt) => {
      const groupLabel = opt.meta.main || "Other";
      if (!groups.has(groupLabel)) groups.set(groupLabel, []);
      groups.get(groupLabel).push(opt);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, options]) => ({
        label,
        options: options.sort((a, b) => a.label.localeCompare(b.label)),
      }));
  }, [filteredFlatOptions]);

  const selectedCourse = useMemo(() => {
    if (!courseId) return null;
    return allCourses?.find((c) => c._id === courseId) || null;
  }, [allCourses, courseId]);

  const selectedOption = useMemo(
    () => flatCourseOptions.find((o) => o.value === courseId) || null,
    [flatCourseOptions, courseId]
  );

  // ---------- react-select styling and filtering ----------
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      borderRadius: 12,
      minHeight: 46,
      borderColor: state.isFocused ? "#60a5fa" : "#e5e7eb",
      boxShadow: "none",
      ":hover": { borderColor: "#93c5fd" },
      fontSize: 14,
    }),
    menu: (base) => ({ ...base, zIndex: 40, borderRadius: 12 }),
    groupHeading: (base) => ({
      ...base,
      fontSize: 12,
      color: "#6b7280",
      textTransform: "none",
      fontWeight: 600,
    }),
    option: (base, state) => ({
      ...base,
      padding: "10px 12px",
      backgroundColor: state.isSelected
        ? "#dbeafe"
        : state.isFocused
        ? "#eff6ff"
        : "white",
      color: "#111827",
      fontSize: 14,
    }),
    singleValue: (base) => ({ ...base, fontWeight: 600 }),
    placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  };

  const filterOption = (option, rawInput) => {
    const q = rawInput.trim().toLowerCase();
    if (!q) return true;
    const m = option.data.meta;
    const hay = [m.title, m.main, m.sub, m.month]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };

  const Option = (props) => {
    const m = props.data.meta;
    return (
      <components.Option {...props}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-800">{m.title}</div>
            <div className="text-xs text-gray-500">
              {m.main} • {m.sub} • {m.month}
            </div>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              m.published
                ? "bg-green-100 text-green-700"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {m.published ? "Published" : "Draft"}
          </span>
        </div>
      </components.Option>
    );
  };

  const SingleValue = (props) => {
    const m = props.data.meta;
    return (
      <components.SingleValue {...props}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">{m.title}</span>
          <span className="text-xs text-gray-500">
            • {m.main} • {m.sub} • {m.month}
          </span>
        </div>
      </components.SingleValue>
    );
  };

  // ---------- Handlers ----------
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
        successCount,
        totalCount,
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

  // ---------- Render ----------
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

            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">
                {filteredFlatOptions.length
                  ? `${filteredFlatOptions.length} courses`
                  : "No courses found"}
              </div>

              <div className="inline-flex items-center gap-2 text-sm">
                <span className="text-gray-500">Filter:</span>
                <div className="bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setPublishedOnly(false)}
                    className={`px-3 py-1 rounded-md ${
                      !publishedOnly
                        ? "bg-white shadow text-gray-800"
                        : "text-gray-600"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishedOnly(true)}
                    className={`px-3 py-1 rounded-md ${
                      publishedOnly
                        ? "bg-white shadow text-gray-800"
                        : "text-gray-600"
                    }`}
                  >
                    Published
                  </button>
                </div>
              </div>
            </div>

            <Select
              isClearable
              placeholder="Search by title, main/sub category, or month..."
              options={groupedOptions}
              value={selectedOption}
              onChange={(opt) => setCourseId(opt?.value || "")}
              filterOption={filterOption}
              components={{
                Option,
                SingleValue,
                IndicatorSeparator: () => null,
              }}
              styles={selectStyles}
              noOptionsMessage={() => "No matches"}
            />

            {/* Selected Course Preview */}
            {selectedCourse && (
              <div className="border rounded-xl p-4 bg-gray-50 flex gap-4 mt-3">
                {/* Optional thumbnail
                <img
                  src={selectedCourse.courseThumbnail || ""}
                  alt={selectedCourse.courseTitle || "Course thumbnail"}
                  className="w-24 h-24 rounded-lg object-cover bg-white border"
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                /> */}
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
                      Sub: <b>{readName(selectedCourse.subCategory) || "-"}</b>
                    </span>
                    {selectedCourse.coursePrice != null && (
                      <span>
                        Price: Rs.{" "}
                        <b>
                          {Number(selectedCourse.coursePrice).toLocaleString()}
                        </b>
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedCourse._id || "");
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
