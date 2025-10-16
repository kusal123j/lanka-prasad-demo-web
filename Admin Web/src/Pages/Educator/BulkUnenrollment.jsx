// BulkUnrollemntPage.jsx
// - Requires: axios, react-toastify
// - Context: AppContext provides { backend_url, allCourses, categories }
// - Make sure <ToastContainer /> is mounted somewhere in your app

import React, { useContext, useMemo, useRef, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../Context/AppContext";
// Adjust this import to your actual AppContext path

const BulkUnrollemntPage = () => {
  const { backend_url, allCourses, categories } = useContext(AppContext);

  const [searchTerm, setSearchTerm] = useState("");
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const searchWrapRef = useRef(null);
  const inputRef = useRef(null);

  // Build category name indexes
  const { mainIndex, subIndex } = useMemo(() => {
    const m = {};
    const s = {};
    (categories || []).forEach((main) => {
      if (!main) return;
      if (main._id) m[main._id] = main.name || "";
      (main.subCategories || []).forEach((sub) => {
        if (sub?._id) s[sub._id] = sub.name || "";
      });
    });
    return { mainIndex: m, subIndex: s };
  }, [categories]);

  // Build convenient map for courses
  const courseMap = useMemo(() => {
    const map = {};
    (allCourses || []).forEach((c) => (map[c._id] = c));
    return map;
  }, [allCourses]);

  const formatCourseLabel = (course) => {
    if (!course) return "";
    const mainName = course.mainCategory
      ? mainIndex[course.mainCategory] || "—"
      : "—";
    const subName = course.subCategory
      ? subIndex[course.subCategory] || "—"
      : "—";
    const month = course.month || "—";
    return `${course.courseTitle} - ${mainName} - ${subName} - ${month}`;
  };

  // Build options array
  const options = useMemo(() => {
    return (allCourses || []).map((c) => ({
      value: c._id,
      label: formatCourseLabel(c),
      title: c.courseTitle || "",
      main: c.mainCategory ? mainIndex[c.mainCategory] || "—" : "—",
      sub: c.subCategory ? subIndex[c.subCategory] || "—" : "—",
      month: c.month || "—",
      raw: c,
    }));
  }, [allCourses, mainIndex, subIndex]);

  // Filter options based on searchTerm
  const filteredOptions = useMemo(() => {
    const q = (searchTerm || "").toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => {
      return (
        o.label.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        o.main.toLowerCase().includes(q) ||
        o.sub.toLowerCase().includes(q) ||
        (o.month || "").toLowerCase().includes(q)
      );
    });
  }, [options, searchTerm]);

  const selectedOption = useMemo(() => {
    return options.find((o) => o.value === selectedCourseId) || null;
  }, [options, selectedCourseId]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setOpenSuggestions(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSelectCourse = (opt) => {
    setSelectedCourseId(opt.value);
    setSearchTerm(opt.label);
    setOpenSuggestions(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!openSuggestions && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpenSuggestions(true);
      return;
    }
    if (!filteredOptions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(
        (prev) => (prev + 1) % Math.min(filteredOptions.length, 8)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? Math.min(filteredOptions.length, 8) - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      if (
        openSuggestions &&
        activeIndex >= 0 &&
        activeIndex < Math.min(filteredOptions.length, 8)
      ) {
        e.preventDefault();
        onSelectCourse(filteredOptions[activeIndex]);
      } else if (!openSuggestions && filteredOptions.length === 1) {
        onSelectCourse(filteredOptions[0]);
      }
    } else if (e.key === "Escape") {
      setOpenSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const clearSelection = () => {
    setSelectedCourseId("");
    setSearchTerm("");
    setActiveIndex(-1);
    setOpenSuggestions(false);
    inputRef.current?.focus();
  };

  const joinUrl = (base, path) => {
    if (!base) return path;
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  };

  const requestUnenroll = async () => {
    if (!selectedCourseId) {
      toast.error("Please select a course first");
      return;
    }
    setLoading(true);
    try {
      // If your educator router is mounted at /api/educator, update the path below:
      // const url = joinUrl(backend_url, "/api/educator/unenroll/bulk");
      const url = joinUrl(backend_url, "/educator/unenroll/bulk");
      const payload = { courseId: selectedCourseId }; // backend supports courseId or courseID
      const res = await axios.post(url, payload, { withCredentials: true });

      if (res?.data?.ok) {
        const count = res?.data?.unenrolledCount ?? 0;
        toast.success(
          `${res?.data?.message || "Unenrolled successfully"}. Count: ${count}`
        );
      } else {
        toast.error(res?.data?.message || "Failed to unenroll students");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Request failed";
      toast.error(msg);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const openConfirm = () => {
    if (!selectedOption) {
      toast.error("Please select a course first");
      return;
    }
    setShowConfirm(true);
  };

  const confirmTextLabel = selectedOption ? selectedOption.label : "";

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Bulk Unenrollment</h1>
          <p style={styles.subtitle}>
            Remove all enrolled students from a selected course. This action
            cannot be undone.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Card: Course Picker */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Select Course</h3>
            {selectedCourseId && (
              <button onClick={clearSelection} style={styles.linkButton}>
                Clear
              </button>
            )}
          </div>

          {/* Searchable input with suggestions */}
          <div ref={searchWrapRef} style={{ position: "relative" }}>
            <div style={styles.inputWrap}>
              <SearchIcon />
              <input
                ref={inputRef}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setOpenSuggestions(true);
                }}
                onFocus={() => setOpenSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search by title, category, or month..."
                style={styles.input}
              />
            </div>

            {openSuggestions && (
              <div style={styles.suggestions}>
                {filteredOptions.length ? (
                  filteredOptions.slice(0, 8).map((opt, idx) => (
                    <div
                      key={opt.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelectCourse(opt);
                      }}
                      style={{
                        ...styles.suggestionItem,
                        ...(idx === activeIndex ? styles.suggestionActive : {}),
                      }}
                    >
                      <div style={styles.suggestionTitle}>{opt.title}</div>
                      <div style={styles.suggestionMeta}>
                        {opt.main} • {opt.sub} • {opt.month}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.suggestionEmpty}>
                    No courses match your search
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={styles.divider}>
            <span style={styles.dividerText}>or</span>
          </div>

          {/* Manual select fallback */}
          <label style={styles.label}>Pick from all courses</label>
          <select
            value={selectedCourseId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedCourseId(id);
              const opt = options.find((o) => o.value === id);
              if (opt) setSearchTerm(opt.label);
            }}
            style={styles.select}
          >
            <option value="">Select a course</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Card: Selection Preview + Action */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Selection Details</h3>
          </div>

          {selectedOption ? (
            <div style={styles.selectionBox}>
              <div style={styles.selectionTitle}>{selectedOption.title}</div>
              <div style={styles.selectionMeta}>
                {selectedOption.main} • {selectedOption.sub} •{" "}
                {selectedOption.month}
              </div>
              <div style={styles.selectionSubtle}>
                Course ID: {selectedOption.value}
              </div>
            </div>
          ) : (
            <div style={styles.placeholderBox}>No course selected</div>
          )}

          <div style={styles.dangerZone}>
            <div style={styles.dangerBadge}>Danger</div>
            <p style={styles.dangerText}>
              This will unenroll all students from the selected course. You
              cannot undo this action.
            </p>
            <button
              onClick={openConfirm}
              disabled={!selectedOption || loading}
              style={{
                ...styles.dangerButton,
                ...(loading || !selectedOption
                  ? styles.dangerButtonDisabled
                  : {}),
              }}
            >
              {loading ? (
                <span style={styles.btnFlex}>
                  <Spinner /> Unenrolling...
                </span>
              ) : (
                "Unenroll all students"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        open={showConfirm}
        title="Confirm bulk unenrollment"
        description={`Are you sure to unenroll all of enrolled students from (${confirmTextLabel}) ?`}
        onCancel={() => setShowConfirm(false)}
        onConfirm={requestUnenroll}
        loading={loading}
        confirmLabel="Yes, Unenroll All"
      />
    </div>
  );
};

export default BulkUnrollemntPage;

/* ------------------------- UI bits ------------------------- */

const ConfirmModal = ({
  open,
  title,
  description,
  onCancel,
  onConfirm,
  loading,
  confirmLabel,
}) => {
  if (!open) return null;
  return (
    <div style={modalStyles.backdrop} role="dialog" aria-modal="true">
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <div style={modalStyles.iconWrap}>
            <WarningIcon />
          </div>
          <h3 style={modalStyles.title}>{title}</h3>
        </div>
        <p style={modalStyles.desc}>{description}</p>
        <div style={modalStyles.footer}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={modalStyles.cancelBtn}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={modalStyles.confirmBtn}
          >
            {loading ? (
              <span style={styles.btnFlex}>
                <Spinner /> Working...
              </span>
            ) : (
              confirmLabel || "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    style={{ color: "#64748b" }}
  >
    <path
      d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WarningIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    style={{ color: "#ef4444" }}
  >
    <path
      d="M12 9v4m0 4h.01M10.29 3.86l-8.48 14.7A2 2 0 003.53 22h16.94a2 2 0 001.72-3.44l-8.48-14.7a2 2 0 00-3.42 0z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Spinner = () => (
  <span
    style={{
      display: "inline-block",
      width: 16,
      height: 16,
      border: "2px solid rgba(255,255,255,0.6)",
      borderTopColor: "#fff",
      borderRadius: "50%",
      marginRight: 8,
      animation: "spin 0.8s linear infinite",
    }}
  />
);

/* ------------------------- Styles ------------------------- */

const styles = {
  page: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial",
    color: "#0f172a",
  },
  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    margin: 4,
    color: "#64748b",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 16,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 2px rgba(16,24,40,0.06)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "10px 12px",
    background: "#f8fafc",
    transition: "border-color 120ms ease",
  },
  input: {
    outline: "none",
    border: "none",
    background: "transparent",
    width: "100%",
    fontSize: 14,
    color: "#0f172a",
  },
  suggestions: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    marginTop: 6,
    boxShadow: "0 10px 18px rgba(2,6,23,0.06)",
    maxHeight: 300,
    overflowY: "auto",
    zIndex: 20,
  },
  suggestionItem: {
    padding: "10px 12px",
    cursor: "pointer",
    borderBottom: "1px solid #f1f5f9",
  },
  suggestionActive: {
    background: "#f1f5f9",
  },
  suggestionTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: "#0f172a",
  },
  suggestionMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  suggestionEmpty: {
    padding: "12px",
    color: "#64748b",
    fontSize: 14,
  },
  divider: {
    position: "relative",
    textAlign: "center",
    margin: "16px 0",
    height: 1,
    background: "#e5e7eb",
  },
  dividerText: {
    position: "relative",
    top: -10,
    background: "#fff",
    padding: "0 8px",
    fontSize: 12,
    color: "#64748b",
  },
  label: {
    display: "block",
    fontSize: 13,
    color: "#334155",
    marginBottom: 6,
    marginTop: 4,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    borderRadius: 10,
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
  },
  selectionBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 12,
    background: "#f8fafc",
    marginBottom: 16,
  },
  selectionTitle: {
    fontWeight: 700,
    fontSize: 15,
    marginBottom: 2,
  },
  selectionMeta: {
    fontSize: 13,
    color: "#475569",
  },
  selectionSubtle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 6,
  },
  placeholderBox: {
    border: "1px dashed #cbd5e1",
    borderRadius: 10,
    padding: 14,
    color: "#94a3b8",
    marginBottom: 16,
    textAlign: "center",
  },
  dangerZone: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: 12,
  },
  dangerBadge: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 8,
  },
  dangerText: {
    margin: "6px 0 12px 0",
    color: "#475569",
    fontSize: 14,
  },
  dangerButton: {
    width: "100%",
    padding: "12px 14px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },
  dangerButtonDisabled: {
    background: "#fca5a5",
    cursor: "not-allowed",
  },
  linkButton: {
    background: "transparent",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    fontWeight: 600,
  },
  btnFlex: {
    display: "inline-flex",
    alignItems: "center",
  },
};

const modalStyles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 24px rgba(2,6,23,0.2)",
    padding: 18,
  },
  header: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "#fef2f2",
    display: "grid",
    placeItems: "center",
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
  },
  desc: {
    color: "#475569",
    fontSize: 14,
    marginTop: 6,
  },
  footer: {
    marginTop: 16,
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelBtn: {
    padding: "10px 12px",
    background: "#f8fafc",
    color: "#0f172a",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },
  confirmBtn: {
    padding: "10px 12px",
    background: "#ef4444",
    color: "#fff",
    border: "1px solid #ef4444",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },
};

/* Keyframes for spinner (works inline in many bundlers) */
const styleTag =
  typeof document !== "undefined" ? document.createElement("style") : null;
if (styleTag) {
  styleTag.innerHTML = `
  @keyframes spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(styleTag);
}
