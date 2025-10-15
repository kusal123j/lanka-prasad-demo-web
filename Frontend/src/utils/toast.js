// utils/toast.js
import { toast as hotToast } from "react-hot-toast";

const toast = {
  success: (msg, options = {}) => hotToast.success(msg, options),
  error: (msg, options = {}) => hotToast.error(msg, options),
  info: (msg, options = {}) => hotToast(msg, options),
  // optional: mimic other react-toastify methods if needed
  dismiss: (id) => hotToast.dismiss(id),
};

export default toast;
