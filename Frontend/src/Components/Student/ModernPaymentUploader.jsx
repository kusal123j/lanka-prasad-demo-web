import React, { useContext, useState } from "react";
import {
  Upload,
  X,
  FileText,
  CreditCard,
  User,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash,
} from "lucide-react";
import axios from "axios";
import { AppContext } from "../../Context/AppContext";
import toast from "react-hot-toast";

export default function ModernPaymentUploader({ payment, onClose }) {
  const [isPopupOpen, setIsPopupOpen] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [txnNumber, setTxnNumber] = useState("");
  const [showTxnHelp, setShowTxnHelp] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { backend_url, handlePaymentHistory, navigate } =
    useContext(AppContext);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileUpload = (file) => {
    setErrorMessage("");

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file (PNG, JPG, JPEG)");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(
        `File size exceeds 5MB limit. Current size: ${(
          file.size /
          1024 /
          1024
        ).toFixed(2)}MB`
      );
      return;
    }

    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file (PNG, JPG, JPEG)");
      return;
    }

    handleFileUpload(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setErrorMessage("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleCancel = () => {
    if (uploadedFile || txnNumber.trim()) {
      if (
        !window.confirm(
          "Are you sure you want to cancel? Your uploaded data will be lost."
        )
      ) {
        return;
      }
    }

    // Cleanup
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setUploadedFile(null);
    setPreviewUrl(null);
    setTxnNumber("");
    onClose?.();
  };

  // Keep isUploading true through both the simulated progress AND the API request.
  const simulateUpload = () => {
    return new Promise((resolve) => {
      setIsUploading(true);
      setUploadProgress(0);

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            // Keep isUploading true; we will set it false after API result.
            resolve();
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    });
  };

  const handleSubmit = async () => {
    if (!uploadedFile || !txnNumber.trim()) return;

    try {
      axios.defaults.withCredentials = true;

      // Simulate upload progress
      await simulateUpload();

      // Prepare FormData for actual backend integration
      const formData = new FormData();
      formData.append("TXnumber", txnNumber);
      formData.append("courseId", payment?.courseId);
      formData.append("address", payment?.address);
      formData.append("phonenumber1", payment?.phonenumber1);
      formData.append("phonenumber2", payment?.phonenumber2);
      formData.append("deliveryBy", payment?.deliveryBy);
      formData.append("image", uploadedFile);

      // Keep button disabled until we get the result
      const { data } = await axios.post(
        backend_url + "/api/user/payment/bankslip",
        formData
      );

      if (data.success) {
        await handlePaymentHistory();
        setShowSuccess(true);
        setIsUploading(false);
        // ✅ Close popup after 3s, then navigate
        setTimeout(() => {
          onClose?.();
          navigate("/student/payments", { replace: true });
        }, 3000);
      } else {
        setErrorMessage(data.message);
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        setIsUploading(false);
        setUploadProgress(0);
        toast.error("Transaction number already exists, upload a new one");
        setErrorMessage("Transaction number already exists, upload a new one");
      } else {
        setErrorMessage(error.message);
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  // Success Modal
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-8 text-center text-white">
          <div className="w-16 h-16 bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-red-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            Payment Submitted Successfully!
          </h3>
          <p className="text-neutral-300 mb-6">
            Your payment slip has been uploaded and is being processed. You will
            receive a confirmation email shortly.
          </p>
          <button
            onClick={() => onClose?.()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="max-w-5xl w-full bg-neutral-900 text-white rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto scroll-smooth">
        {/* Header */}
        <div className="px-8 py-6 relative border-b border-neutral-800 bg-neutral-900">
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X size={24} className="text-white" />
          </button>
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-3 bg-red-600/20 rounded-xl">
              <CreditCard size={24} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Upload Payment Slip</h2>
              <p className="text-neutral-300 mt-1">
                Complete your course enrollment
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Section - Takes 2 columns on large screens */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Upload Area */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Upload size={20} className="text-red-500" />
                  <h3 className="text-lg font-semibold">Payment Slip</h3>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle
                      size={16}
                      className="text-red-400 flex-shrink-0"
                    />
                    <p className="text-sm text-red-300">{errorMessage}</p>
                  </div>
                )}

                {!uploadedFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                      isDragOver
                        ? "border-red-500 bg-red-950/30"
                        : "border-neutral-700 hover:border-red-500 hover:bg-neutral-800/60"
                    }`}
                  >
                    <label htmlFor="fileInput" className="cursor-pointer block">
                      <div className="flex flex-col items-center gap-4">
                        <div
                          className={`p-4 rounded-full transition-colors ${
                            isDragOver ? "bg-red-900/40" : "bg-neutral-800"
                          }`}
                        >
                          <Upload
                            size={32}
                            className={
                              isDragOver ? "text-red-500" : "text-neutral-300"
                            }
                          />
                        </div>
                        <div>
                          <p className="text-lg font-medium mb-1">
                            Drop your payment slip here
                          </p>
                          <p className="text-neutral-300">
                            or{" "}
                            <span className="text-red-500 font-medium">
                              browse files
                            </span>
                          </p>
                          <p className="text-sm text-neutral-400 mt-2">
                            Supports: PNG, JPG, JPEG (Max 5MB)
                          </p>
                        </div>
                      </div>
                      <input
                        id="fileInput"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileInputChange}
                        aria-label="Upload payment slip image"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="border border-neutral-800 rounded-xl p-6 bg-neutral-900">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">Uploaded File</h4>
                        <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                          {previewUrl && (
                            <img
                              src={previewUrl}
                              alt="Payment slip preview"
                              className="w-full max-w-md mx-auto rounded-lg shadow-sm"
                            />
                          )}

                          {/* Upload Progress Bar */}
                          {isUploading && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-neutral-300">
                                  Uploading...
                                </span>
                                <span className="text-sm text-neutral-300">
                                  {uploadProgress}%
                                </span>
                              </div>
                              <div className="w-full bg-neutral-700 rounded-full h-2">
                                <div
                                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>

                              {uploadProgress >= 100 && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-neutral-300">
                                  <Loader2
                                    size={16}
                                    className="animate-spin text-red-500"
                                  />
                                  Processing payment...
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-800">
                            <div className="flex items-center gap-2">
                              <FileText
                                size={16}
                                className="text-neutral-300"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm text-neutral-200 truncate">
                                  {uploadedFile.name}
                                </span>
                                <span className="text-xs text-neutral-400">
                                  {(uploadedFile.size / 1024 / 1024).toFixed(2)}{" "}
                                  MB
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={removeFile}
                              disabled={isUploading}
                              className="flex items-center gap-1 px-3 py-1 text-sm text-red-400 hover:bg-red-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Replace uploaded file"
                            >
                              <Trash size={14} />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction Number Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={20} className="text-red-500" />
                    <label className="text-lg font-semibold">
                      Transaction Details
                    </label>
                  </div>
                  <button
                    onMouseEnter={() => setShowTxnHelp(true)}
                    onMouseLeave={() => setShowTxnHelp(false)}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-400"
                  >
                    <Eye size={14} />
                    Where to find?
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={txnNumber}
                    onChange={(e) => setTxnNumber(e.target.value)}
                    placeholder="Enter transaction number or reference ID"
                    className="w-full px-4 py-3 bg-neutral-800 text-white placeholder-neutral-400 border border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    aria-describedby="txn-help"
                    disabled={isUploading}
                  />

                  {/* Help Tooltip */}
                  {showTxnHelp && (
                    <div
                      className="absolute top-full mt-2 right-0 z-10 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl p-4 w-80 text-white"
                      id="txn-help"
                    >
                      <div className="text-sm text-neutral-300 mb-2">
                        Look for the transaction number in these locations:
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                        <img
                          src="https://apply.sliate.ac.lk/img/bank-slip-2.png"
                          alt="Transaction number location example"
                          className="w-full rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="lg:col-span-1">
              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 h-fit sticky top-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User size={20} className="text-red-500" />
                  Caution
                </h3>

                <div className="space-y-4 text-neutral-300">
                  {/* User Info */}
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Iusto, nam molestiae? Illo, facere id quas iure ea veritatis
                  voluptate, tempora quia aspernatur fugiat architecto quisquam
                  pariatur. Dignissimos, doloribus? Vel, ab.
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-neutral-800">
            <button
              onClick={handleCancel}
              disabled={isUploading}
              className="px-6 py-3 border border-neutral-700 text-white rounded-xl hover:bg-neutral-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cancel upload"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!uploadedFile || !txnNumber.trim() || isUploading}
              className="px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-red-900/30 flex items-center gap-2"
              aria-label="Submit payment slip"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {uploadProgress < 100 ? "Uploading..." : "Processing..."}
                </>
              ) : (
                "Submit Payment"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
