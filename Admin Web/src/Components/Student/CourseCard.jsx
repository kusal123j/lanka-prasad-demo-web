import { Pencil } from "lucide-react";
import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../../Context/AppContext";

const CourseCard = ({ course }) => {
  const { isEducator } = useContext(AppContext);
  const navigate = useNavigate();

  if (!course) {
    return <div className="text-gray-500 p-4">Course data not available.</div>;
  }

  const handleCardClick = () => {
    window.scrollTo(0, 0);
  };

  return (
    <div className="bg-white text-gray-800 rounded-xl shadow-md overflow-hidden max-w-sm w-full border border-gray-200 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-100 transition duration-300 ease-in-out">
      {/* Clickable Wrapper */}
      <Link
        to={`/educator/edit-course/${course._id}`}
        onClick={handleCardClick}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <span className="bg-blue-100 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              Class
            </span>
            <span className="text-lg font-bold text-blue-600">
              Rs.{course.coursePrice}
            </span>
          </div>

          {/* Title */}
          <Link
            to={`/educator/edit-course/${course._id}`}
            onClick={handleCardClick}
          >
            <h3 className="text-[20px] font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors">
              {course.courseTitle}
            </h3>
          </Link>

          {/* Footer */}
          <div className="flex justify-between items-center text-gray-500 text-xs pt-2 border-t border-gray-200 mt-2">
            {/* Edit Button for Educator */}
            {isEducator && (
              <button
                onClick={() => navigate(`/educator/edit-course/${course._id}`)}
                className="text-blue-600 hover:text-blue-500 flex items-center gap-1 text-xs mt-1 transition-colors"
                title="Edit Course"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default CourseCard;
