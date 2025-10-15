import { Link } from "react-router-dom";

const NoFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6 text-center">
      {/* 404 Title */}
      <h1 className="text-[70px] font-extrabold text-red-600 leading-tight">
        404
      </h1>

      {/* Subtitle */}
      <p className="text-xl font-medium text-white mt-1">
        Oops! Page not found.
      </p>

      {/* Description */}
      <p className="text-gray-300 mt-1 max-w-md">
        The page you're looking for doesn't exist or has been moved. Let’s get
        you back on track!
      </p>

      {/* CTA Button */}
      <Link
        to="/"
        className="mt-5 inline-block px-6 py-3 bg-red-600 text-white font-medium text-sm rounded-full shadow 
             hover:bg-red-700 hover:scale-105 transition-transform duration-300 transform"
      >
        Go to Home
      </Link>
    </div>
  );
};

export default NoFound;
