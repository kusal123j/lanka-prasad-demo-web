const Loading = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="w-10 h-10 border-4 border-t-transparent border-red-600 rounded-full animate-spin " />
      <p className="m-4 text-black">Loading </p>
    </div>
  );
};

export default Loading;
