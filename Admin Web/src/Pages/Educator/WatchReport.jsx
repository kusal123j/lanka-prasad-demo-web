import axios from "axios";
import { useContext, useState } from "react";
import { toast } from "react-toastify";
import { AppContext } from "../../Context/AppContext";

const VideoWatchExportButton = () => {
  const { backend_url } = useContext(AppContext);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Update this to your actual PDF route
      const endpoint = `${backend_url}/api/educator/export-video-watches`;
      const response = await axios.post(
        endpoint,
        {}, // body (add filters here if needed)
        {
          responseType: "blob",
          headers: { Accept: "application/pdf" },
        }
      );

      // Try to read filename from Content-Disposition header
      let filename = "video_watches.pdf";
      const disposition = response.headers["content-disposition"];
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i
        );
        if (match && match[1]) filename = match[1].replace(/['"]/g, "");
      }

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);

      // Attempt to extract server error message from blob
      let msg = "Failed to download PDF. Please try again.";
      try {
        if (error?.response?.data instanceof Blob) {
          const text = await error.response.data.text();
          try {
            const json = JSON.parse(text);
            msg = json?.message || msg;
          } catch {
            msg = text || msg;
          }
        } else if (error?.message) {
          msg = error.message;
        }
      } catch {}

      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start space-y-2 m-20">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Preparing PDF..." : "Download Video Watch Report (PDF)"}
      </button>
      <small className="text-gray-500 italic">
        ⚠ Please wait while the report is generated.
      </small>
    </div>
  );
};

export default VideoWatchExportButton;
