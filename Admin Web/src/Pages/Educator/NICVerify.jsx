// src/pages/NICVerify.jsx
import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Loader2,
  Phone,
  IdCard,
  BadgeCheck,
  ImageOff,
} from "lucide-react";
import { AppContext } from "../../Context/AppContext";

// If you prefer absolute URLs:

export default function NICVerify() {
  const { backend_url } = useContext(AppContext);
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, type: null }); // 'approve' | 'reject'

  const API_BASE = `${backend_url}/api`;
  const GET_PENDING_URL = `${API_BASE}/educator/pending-nic-verifications`;
  const UPDATE_STATUS_URL = `${API_BASE}/educator/update-nic-verify-status`;
  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(GET_PENDING_URL, {
        params: { page },
        // withCredentials: true, // uncomment if your API uses cookies
      });
      const data = res?.data;
      if (!data?.success) {
        throw new Error(data?.message || "Failed to fetch pending NICs");
      }
      setUsers(data.users || []);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load pending NIC verifications";
      toast.error(message);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, []);

  const refresh = () => loadData(currentPage);

  const onView = (user) => setSelectedUser(user);
  const closeModal = () => {
    setSelectedUser(null);
    setConfirm({ open: false, type: null });
  };
  const askConfirm = (type) => setConfirm({ open: true, type });

  const handleUpdateStatus = async (userId, status) => {
    setActionLoading(true);
    try {
      const res = await axios.post(
        UPDATE_STATUS_URL,
        {
          status, // "completed" | "failed" | "pending"
          userID: userId,
        }
        // , { withCredentials: true } // uncomment if your API uses cookies
      );
      const data = res?.data;
      if (!data?.success) {
        throw new Error(data?.message || "Update failed");
      }

      toast.success(
        status === "completed" ? "NIC approved successfully" : "NIC rejected"
      );

      closeModal();

      // If this was the last row on the page and not the first page, go back one page
      if (users.length === 1 && currentPage > 1) {
        await loadData(currentPage - 1);
      } else {
        await loadData(currentPage);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Server error while updating status";
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const ConfirmBar = () =>
    confirm.open ? (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
        <div className="text-sm text-amber-800">
          {confirm.type === "approve"
            ? "Approve this NIC? This will mark the user as verified."
            : "Reject this NIC? This will mark the verification as failed."}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              handleUpdateStatus(
                selectedUser?._id,
                confirm.type === "approve" ? "completed" : "failed"
              )
            }
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white ${
              confirm.type === "approve"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : confirm.type === "approve" ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {confirm.type === "approve" ? "Yes, Approve" : "Yes, Reject"}
          </button>
          <button
            onClick={() => setConfirm({ open: false, type: null })}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={actionLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      {/* Remove this ToastContainer if you already have a global one */}
      <ToastContainer position="top-right" autoClose={2500} />

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            NIC Verification
          </h1>
          <p className="text-sm text-gray-500">
            Review and approve or reject pending NIC verifications.
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>NIC</Th>
                <Th>Exam Year</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && initialLoad ? (
                <SkeletonRows />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8">
                    <EmptyState onReload={() => loadData(currentPage)} />
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <div className="font-medium text-gray-900">
                            {u?.name} {u?.lastname}
                          </div>
                          <div className="text-xs text-gray-500">
                            Pending verification
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{u?.phonenumber || "-"}</span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2 text-gray-700">
                        <IdCard className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{u?.NIC || "-"}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                        {u?.ExamYear || "-"}
                      </span>
                    </Td>
                    <Td align="right">
                      <button
                        onClick={() => onView(u)}
                        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {users.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white p-3">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <button
                onClick={() => loadData(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <Modal onClose={closeModal}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedUser?.name} {selectedUser?.lastname}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Review NIC and take action.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
              <BadgeCheck className="h-3.5 w-3.5" />
              Pending
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 text-sm font-medium text-gray-700">
                NIC Front Image
              </div>
              <ImagePreview src={selectedUser?.NICFrontImage} />
            </div>

            <div className="rounded-lg border border-gray-200 p-3">
              <div className="mb-3 text-sm font-medium text-gray-700">
                User Details
              </div>
              <DetailRow
                label="Name"
                value={`${selectedUser?.name || ""} ${
                  selectedUser?.lastname || ""
                }`}
              />
              <DetailRow
                label="Phone"
                value={selectedUser?.phonenumber || "-"}
              />
              <DetailRow label="NIC" value={selectedUser?.NIC || "-"} />
              <DetailRow
                label="Exam Year"
                value={selectedUser?.ExamYear || "-"}
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => askConfirm("approve")}
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  disabled={actionLoading}
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => askConfirm("reject")}
                  className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                  disabled={actionLoading}
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={closeModal}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Close
                </button>
              </div>

              <ConfirmBar />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, align }) {
  return (
    <td
      className={`px-4 py-3 text-sm text-gray-700 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-3">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3 text-right">
            <div className="ml-auto h-8 w-20 animate-pulse rounded bg-gray-200" />
          </td>
        </tr>
      ))}
    </>
  );
}

function EmptyState({ onReload }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="rounded-full bg-gray-100 p-3">
        <BadgeCheck className="h-5 w-5 text-gray-400" />
      </div>
      <div className="text-sm font-medium text-gray-900">
        No pending NIC verifications
      </div>
      <div className="text-xs text-gray-500">
        Everything looks up to date. Try refreshing if you expect more.
      </div>
      <button
        onClick={onReload}
        className="mt-2 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <RefreshCcw className="h-4 w-4" />
        Refresh
      </button>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

function ImagePreview({ src }) {
  const [errored, setErrored] = React.useState(false);

  if (!src || errored) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50">
        <div className="flex flex-col items-center text-gray-400">
          <ImageOff className="h-8 w-8" />
          <span className="mt-2 text-xs">No image available</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="NIC Front"
      onError={() => setErrored(true)}
      className="h-64 w-full rounded-md object-contain"
    />
  );
}
