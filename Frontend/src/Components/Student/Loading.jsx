import { motion } from "framer-motion";

const Loading = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
      <div className="flex items-center space-x-2">
        {/* Compact Spinner */}
        <motion.div
          className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        />

        {/* Text with subtle animation */}
        <motion.p
          className="text-lg font-medium text-blue-700"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          Loading...
        </motion.p>
      </div>
    </div>
  );
};

export default Loading;
