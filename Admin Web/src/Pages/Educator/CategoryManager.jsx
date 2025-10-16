import React, { useEffect, useMemo, useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../Context/AppContext";

// Simple spinner
const Spinner = ({ className = "" }) => (
  <div
    className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`}
  />
);

// Modal base
const Modal = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {title ? (
          <h3 className="mb-4 text-xl font-bold text-gray-900">{title}</h3>
        ) : null}
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  );
};

// Confirm dialog
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmText,
  confirmColor = "red",
  onConfirm,
  onCancel,
  loading,
}) => {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onCancel}
      title={title || "Are you sure?"}
      children={<p className="text-gray-700">{message}</p>}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-white ${
              confirmColor === "red"
                ? "bg-rose-600 hover:bg-rose-700"
                : confirmColor === "blue"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-800 hover:bg-gray-900"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {loading ? <Spinner /> : confirmText || "Confirm"}
          </button>
        </div>
      }
    />
  );
};

// Hash to gradient colors for a lively UI
const gradients = [
  "from-pink-500 via-red-500 to-amber-500",
  "from-blue-500 via-sky-500 to-cyan-500",
  "from-purple-500 via-violet-500 to-indigo-500",
  "from-emerald-500 via-teal-500 to-emerald-600",
  "from-orange-500 via-amber-500 to-yellow-500",
  "from-fuchsia-500 via-pink-500 to-rose-500",
];
const gradientForIndex = (idx) =>
  `bg-gradient-to-r ${gradients[idx % gradients.length]}`;

// Helper: safely get error message
const getErr = (err) =>
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  "Something went wrong";

const CategoryManager = () => {
  const {
    backend_url,
    categories: contextCategories = [],
    fetchCategories,
  } = useContext(AppContext);

  // Load categories on mount
  const [isFetching, setIsFetching] = useState(false);
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!fetchCategories) return;
      try {
        setIsFetching(true);
        await Promise.resolve(fetchCategories());
      } catch (e) {
        toast.error(getErr(e));
      } finally {
        if (mounted) setIsFetching(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [fetchCategories]);

  // UI state
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  useEffect(() => {
    // Expand all on first load
    if (contextCategories?.length) {
      setExpanded(new Set(contextCategories.map((c) => c._id)));
    }
  }, [contextCategories?.length]);

  // Create modals
  const [showMainModal, setShowMainModal] = useState(false);
  const [mainName, setMainName] = useState("");
  const [creatingMain, setCreatingMain] = useState(false);

  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedMainForSub, setSelectedMainForSub] = useState("");
  const [subName, setSubName] = useState("");
  const [creatingSub, setCreatingSub] = useState(false);

  // Editing state
  const [editingMainId, setEditingMainId] = useState(null);
  const [editingMainName, setEditingMainName] = useState("");
  const [updatingMainId, setUpdatingMainId] = useState(null);

  const [editingSubId, setEditingSubId] = useState(null);
  const [editingSubName, setEditingSubName] = useState("");
  const [updatingSubId, setUpdatingSubId] = useState(null);

  // Delete states
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
    loading: false,
  });
  const [deletingMainId, setDeletingMainId] = useState(null);
  const [deletingSubId, setDeletingSubId] = useState(null);

  // Bulk mode per main
  const [bulkMode, setBulkMode] = useState(new Set()); // mainIds that are in bulk mode
  const [bulkSelections, setBulkSelections] = useState({}); // { mainId: Set(subIds) }
  const [bulkDeletingMainId, setBulkDeletingMainId] = useState(null);

  const toggleExpand = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };
  const expandAll = () =>
    setExpanded(new Set(contextCategories.map((c) => c._id)));
  const collapseAll = () => setExpanded(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return contextCategories.map((m) => ({
        ...m,
        visibleSubs: m.subCategories || [],
      }));
    }
    return contextCategories
      .map((m) => {
        const mainMatch = m.name.toLowerCase().includes(q);
        const matchedSubs = (m.subCategories || []).filter((s) =>
          s.name.toLowerCase().includes(q)
        );
        if (mainMatch) {
          return { ...m, visibleSubs: m.subCategories || [] };
        }
        if (matchedSubs.length > 0) {
          return { ...m, visibleSubs: matchedSubs };
        }
        return null;
      })
      .filter(Boolean);
  }, [contextCategories, query]);

  // Create main
  const handleCreateMain = async () => {
    if (!mainName.trim()) return toast.error("Name is required");
    try {
      setCreatingMain(true);
      const { data } = await axios.post(
        `${backend_url}/api/educator/create-main-category`,
        {
          name: mainName.trim(),
        }
      );
      if (data?.success) {
        toast.success("Main category created");
        setMainName("");
        setShowMainModal(false);
        await Promise.resolve(fetchCategories?.());
        // expand newly created if present
        if (data?.mainCategory?._id) {
          setExpanded((prev) => new Set([...prev, data.mainCategory._id]));
        }
      }
    } catch (err) {
      toast.error(getErr(err));
    } finally {
      setCreatingMain(false);
    }
  };

  // Create sub
  const handleCreateSub = async () => {
    if (!selectedMainForSub) return toast.error("Select a main category");
    if (!subName.trim()) return toast.error("Subcategory name is required");
    try {
      setCreatingSub(true);
      const { data } = await axios.post(
        `${backend_url}/api/educator/create-sub-category`,
        {
          name: subName.trim(),
          parentId: selectedMainForSub,
        }
      );
      if (data?.success) {
        toast.success("Subcategory created");
        setSubName("");
        setSelectedMainForSub("");
        setShowSubModal(false);
        await Promise.resolve(fetchCategories?.());
        setExpanded((prev) => new Set([...prev, selectedMainForSub]));
      }
    } catch (err) {
      toast.error(getErr(err));
    } finally {
      setCreatingSub(false);
    }
  };

  // Edit main
  const startEditMain = (main) => {
    setEditingMainId(main._id);
    setEditingMainName(main.name);
  };
  const cancelEditMain = () => {
    setEditingMainId(null);
    setEditingMainName("");
  };
  const saveEditMain = async (id) => {
    if (!editingMainName.trim()) return toast.error("Name is required");
    try {
      setUpdatingMainId(id);
      const { data } = await axios.put(
        `${backend_url}/api/educator/main/${id}`,
        {
          name: editingMainName.trim(),
        }
      );
      if (data?.success) {
        toast.success("Main category updated");
        await Promise.resolve(fetchCategories?.());
      }
      cancelEditMain();
    } catch (err) {
      toast.error(getErr(err));
    } finally {
      setUpdatingMainId(null);
    }
  };

  // Edit sub
  const startEditSub = (sub) => {
    setEditingSubId(sub._id);
    setEditingSubName(sub.name);
  };
  const cancelEditSub = () => {
    setEditingSubId(null);
    setEditingSubName("");
  };
  const saveEditSub = async (id) => {
    if (!editingSubName.trim()) return toast.error("Name is required");
    try {
      setUpdatingSubId(id);
      const { data } = await axios.put(
        `${backend_url}/api/educator/sub/${id}`,
        {
          name: editingSubName.trim(),
        }
      );
      if (data?.success) {
        toast.success("Subcategory updated");
        await Promise.resolve(fetchCategories?.());
      }
      cancelEditSub();
    } catch (err) {
      toast.error(getErr(err));
    } finally {
      setUpdatingSubId(null);
    }
  };

  // Delete main (with confirm)
  const requestDeleteMain = (main) => {
    setConfirm({
      open: true,
      title: "Delete main category?",
      message:
        "This will permanently delete the main category and all its subcategories. This action cannot be undone.",
      onConfirm: async () => {
        try {
          setConfirm((c) => ({ ...c, loading: true }));
          setDeletingMainId(main._id);
          await axios.delete(`${backend_url}/api/educator/main/${main._id}`);
          toast.success("Main category deleted");
          await Promise.resolve(fetchCategories?.());
          setConfirm({
            open: false,
            title: "",
            message: "",
            onConfirm: null,
            loading: false,
          });
        } catch (err) {
          toast.error(getErr(err));
          setConfirm((c) => ({ ...c, loading: false }));
        } finally {
          setDeletingMainId(null);
        }
      },
    });
  };

  // Delete sub (with confirm)
  const requestDeleteSub = (sub) => {
    setConfirm({
      open: true,
      title: "Delete subcategory?",
      message: "This will permanently delete the subcategory.",
      onConfirm: async () => {
        try {
          setConfirm((c) => ({ ...c, loading: true }));
          setDeletingSubId(sub._id);
          await axios.delete(`${backend_url}/api/educator/sub/${sub._id}`);
          toast.success("Subcategory deleted");
          await Promise.resolve(fetchCategories?.());
          setConfirm({
            open: false,
            title: "",
            message: "",
            onConfirm: null,
            loading: false,
          });
        } catch (err) {
          toast.error(getErr(err));
          setConfirm((c) => ({ ...c, loading: false }));
        } finally {
          setDeletingSubId(null);
        }
      },
    });
  };

  // Bulk mode helpers
  const toggleBulkModeForMain = (mainId) => {
    const next = new Set(bulkMode);
    if (next.has(mainId)) {
      next.delete(mainId);
      setBulkSelections((prev) => {
        const copy = { ...prev };
        delete copy[mainId];
        return copy;
      });
    } else {
      next.add(mainId);
    }
    setBulkMode(next);
  };

  const toggleSelectSub = (mainId, subId) => {
    setBulkSelections((prev) => {
      const current = new Set(prev[mainId] || []);
      if (current.has(subId)) current.delete(subId);
      else current.add(subId);
      return { ...prev, [mainId]: current };
    });
  };
  const bulkCount = (mainId) =>
    bulkSelections[mainId] ? bulkSelections[mainId].size : 0;

  const handleBulkDelete = (mainId) => {
    const ids = [...(bulkSelections[mainId] || [])];
    if (ids.length === 0) return toast.info("No subcategories selected");
    setConfirm({
      open: true,
      title: "Bulk delete subcategories?",
      message: `You are about to delete ${ids.length} subcategory(s). This cannot be undone.`,
      onConfirm: async () => {
        try {
          setConfirm((c) => ({ ...c, loading: true }));
          setBulkDeletingMainId(mainId);
          await Promise.all(
            ids.map((id) =>
              axios.delete(`${backend_url}/api/educator/sub/${id}`)
            )
          );
          toast.success(`Deleted ${ids.length} subcategory(s)`);
          await Promise.resolve(fetchCategories?.());
          // Clear selection after delete
          setBulkSelections((prev) => {
            const copy = { ...prev };
            delete copy[mainId];
            return copy;
          });
          setBulkMode((prev) => {
            const n = new Set(prev);
            n.delete(mainId);
            return n;
          });
          setConfirm({
            open: false,
            title: "",
            message: "",
            onConfirm: null,
            loading: false,
          });
        } catch (err) {
          toast.error(getErr(err));
          setConfirm((c) => ({ ...c, loading: false }));
        } finally {
          setBulkDeletingMainId(null);
        }
      },
    });
  };

  const openAddSubForMain = (mainId) => {
    setSelectedMainForSub(mainId);
    setShowSubModal(true);
    setSubName("");
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">
            Category Manager
          </h2>
          <p className="text-sm text-gray-500">
            Create, search, edit, and organize your categories with a modern UI.
          </p>
        </div>

        <div className="flex flex-1 flex-col items-stretch gap-3 md:flex-none md:flex-row md:items-center">
          <div className="relative flex-1 md:w-80">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mains or subs..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {query ? (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
                title="Clear"
              >
                ✖
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Collapse All
            </button>
            <button
              onClick={() => setShowMainModal(true)}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700"
            >
              + Main
            </button>
            <button
              onClick={() => {
                setSelectedMainForSub("");
                setShowSubModal(true);
              }}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
            >
              + Sub
            </button>
            <button
              onClick={async () => {
                try {
                  setIsFetching(true);
                  await Promise.resolve(fetchCategories?.());
                  toast.success("Refreshed");
                } catch (e) {
                  toast.error(getErr(e));
                } finally {
                  setIsFetching(false);
                }
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {isFetching ? (
                <Spinner className="border-t-gray-600 border-gray-300 h-4 w-4" />
              ) : (
                "Refresh"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {isFetching ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl bg-gray-100"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
            <div className="mb-2 text-3xl">🗂️</div>
            <p className="text-gray-700">No categories found.</p>
            <p className="text-sm text-gray-500">
              Try adjusting your search or add a new category.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((main, idx) => {
              const visibleSubs = main.visibleSubs || [];
              const isExpanded = expanded.has(main._id);
              const inBulk = bulkMode.has(main._id);
              const selectedCount = bulkCount(main._id);
              const isDeletingMain = deletingMainId === main._id;
              const isUpdatingMain = updatingMainId === main._id;
              const gradient = gradientForIndex(idx);

              return (
                <div
                  key={main._id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  {/* Header */}
                  <div className={`${gradient} relative p-4 text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleExpand(main._id)}
                          className="rounded-full bg-white/20 px-2 py-1 text-xs hover:bg-white/30"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? "▾" : "▸"}
                        </button>

                        {editingMainId === main._id ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={editingMainName}
                              onChange={(e) =>
                                setEditingMainName(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditMain(main._id);
                                if (e.key === "Escape") cancelEditMain();
                              }}
                              className="rounded-md border border-white/40 bg-white/20 px-2 py-1 text-white placeholder:text-white/70 focus:border-white focus:outline-none"
                              placeholder="Main category name"
                            />
                            <button
                              onClick={() => saveEditMain(main._id)}
                              disabled={isUpdatingMain}
                              className="rounded-md bg-white/20 px-2 py-1 text-sm hover:bg-white/30 disabled:cursor-not-allowed"
                              title="Save"
                            >
                              {isUpdatingMain ? (
                                <Spinner className="h-4 w-4 border-white/50" />
                              ) : (
                                "💾"
                              )}
                            </button>
                            <button
                              onClick={cancelEditMain}
                              className="rounded-md bg-white/20 px-2 py-1 text-sm hover:bg-white/30"
                              title="Cancel"
                            >
                              ✖
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold">{main.name}</h3>
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                              {main.subCategories?.length || 0} subs
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!editingMainId && (
                          <>
                            <button
                              onClick={() => startEditMain(main)}
                              className="rounded-md bg-white/20 px-2 py-1 text-sm hover:bg-white/30"
                              title="Rename"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => openAddSubForMain(main._id)}
                              className="rounded-md bg-white/20 px-2 py-1 text-sm hover:bg-white/30"
                              title="Add Subcategory"
                            >
                              ➕
                            </button>
                            <button
                              onClick={() => toggleBulkModeForMain(main._id)}
                              className={`rounded-md px-2 py-1 text-sm ${
                                inBulk
                                  ? "bg-white text-gray-800"
                                  : "bg-white/20 text-white"
                              } hover:bg-white/30`}
                              title="Bulk select subs"
                            >
                              {inBulk ? "Bulk ✓" : "Bulk"}
                            </button>
                            <button
                              onClick={() => requestDeleteMain(main)}
                              disabled={isDeletingMain}
                              className="rounded-md bg-white/20 px-2 py-1 text-sm hover:bg-white/30 disabled:cursor-not-allowed"
                              title="Delete main (and all subs)"
                            >
                              {isDeletingMain ? (
                                <Spinner className="h-4 w-4 border-white/60" />
                              ) : (
                                "🗑️"
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {inBulk && (
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <div className="rounded-md bg-white/20 px-2 py-1">
                          Selected: {selectedCount}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setBulkSelections((prev) => {
                                const s = new Set(
                                  visibleSubs.map((s) => s._id)
                                );
                                return { ...prev, [main._id]: s };
                              })
                            }
                            className="rounded-md bg-white/20 px-2 py-1 hover:bg-white/30"
                          >
                            Select visible
                          </button>
                          <button
                            onClick={() =>
                              setBulkSelections((prev) => {
                                const copy = { ...prev };
                                copy[main._id] = new Set();
                                return copy;
                              })
                            }
                            className="rounded-md bg-white/20 px-2 py-1 hover:bg-white/30"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => handleBulkDelete(main._id)}
                            disabled={
                              selectedCount === 0 ||
                              bulkDeletingMainId === main._id
                            }
                            className="rounded-md bg-rose-600 px-2 py-1 text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {bulkDeletingMainId === main._id ? (
                              <Spinner />
                            ) : (
                              `Delete (${selectedCount})`
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                      {visibleSubs.length > 0 ? (
                        visibleSubs.map((sub) => {
                          const isEditingSub = editingSubId === sub._id;
                          const isUpdatingSub = updatingSubId === sub._id;
                          const isDeletingSub = deletingSubId === sub._id;
                          const selected = !!(
                            bulkSelections[main._id] &&
                            bulkSelections[main._id].has(sub._id)
                          );
                          return (
                            <div
                              key={sub._id}
                              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                {inBulk && (
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() =>
                                      toggleSelectSub(main._id, sub._id)
                                    }
                                    className="h-4 w-4 accent-indigo-600"
                                  />
                                )}
                                {isEditingSub ? (
                                  <input
                                    autoFocus
                                    value={editingSubName}
                                    onChange={(e) =>
                                      setEditingSubName(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        saveEditSub(sub._id);
                                      if (e.key === "Escape") cancelEditSub();
                                    }}
                                    className="w-64 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="Subcategory name"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-gray-800">
                                    {sub.name}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {isEditingSub ? (
                                  <>
                                    <button
                                      onClick={() => saveEditSub(sub._id)}
                                      disabled={isUpdatingSub}
                                      className="rounded-md bg-indigo-600 px-2 py-1 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed"
                                    >
                                      {isUpdatingSub ? <Spinner /> : "Save"}
                                    </button>
                                    <button
                                      onClick={cancelEditSub}
                                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm hover:bg-gray-50"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {!inBulk && (
                                      <>
                                        <button
                                          onClick={() => startEditSub(sub)}
                                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm hover:bg-gray-50"
                                          title="Rename"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => requestDeleteSub(sub)}
                                          disabled={isDeletingSub}
                                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed"
                                          title="Delete"
                                        >
                                          {isDeletingSub ? (
                                            <Spinner className="h-4 w-4 border-gray-500" />
                                          ) : (
                                            "🗑️"
                                          )}
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-6 text-sm text-gray-500">
                          No subcategories
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Main Modal */}
      <Modal
        open={showMainModal}
        onClose={() => (creatingMain ? null : setShowMainModal(false))}
        title="Add Main Category"
        children={
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              value={mainName}
              onChange={(e) => setMainName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateMain();
              }}
              placeholder="e.g. Design"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowMainModal(false)}
              disabled={creatingMain}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateMain}
              disabled={creatingMain}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed"
            >
              {creatingMain ? <Spinner /> : "Create"}
            </button>
          </div>
        }
      />

      {/* Add Sub Modal */}
      <Modal
        open={showSubModal}
        onClose={() => (creatingSub ? null : setShowSubModal(false))}
        title="Add Subcategory"
        children={
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Main category
              </label>
              <select
                value={selectedMainForSub}
                onChange={(e) => setSelectedMainForSub(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Select main category</option>
                {contextCategories.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Subcategory name
              </label>
              <input
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSub();
                }}
                placeholder="e.g. UX Basics"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowSubModal(false)}
              disabled={creatingSub}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSub}
              disabled={creatingSub}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed"
            >
              {creatingSub ? <Spinner /> : "Create"}
            </button>
          </div>
        }
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onCancel={() =>
          confirm.loading
            ? null
            : setConfirm({
                open: false,
                title: "",
                message: "",
                onConfirm: null,
                loading: false,
              })
        }
        onConfirm={confirm.onConfirm}
        loading={confirm.loading}
        confirmText="Yes, delete"
        confirmColor="red"
      />
    </div>
  );
};

export default CategoryManager;
