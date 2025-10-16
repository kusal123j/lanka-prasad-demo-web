// pages/Educator/AddCourse.jsx

import React, { useRef, useState, useEffect, useContext } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { AppContext } from "../../Context/AppContext";
import Loading from "../../Components/Student/Loading";
import axios from "axios";
import { toast } from "react-toastify";

const AddCourse = () => {
  const quillRef = useRef(null);
  const editorRef = useRef(null);
  const { isEducator, backend_url, navigate } = useContext(AppContext);

  const [courseTitle, setCourseTitle] = useState("");
  const [coursePrice, setCoursePrice] = useState(0);
  const [chapters, setChapters] = useState([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isloading, setisloading] = useState(false);
  const [disablesubmit, setdisablesubmit] = useState(false);

  // Type
  const [courseType, setCourseType] = useState("class"); // default to class

  // Categories
  const [categories, setCategories] = useState([]);
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [month, setMonth] = useState("");

  // Setup Quill editor
  useEffect(() => {
    if (!quillRef.current && editorRef.current) {
      quillRef.current = new Quill(editorRef.current, { theme: "snow" });
    }
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get(
          backend_url + "/api/user/all-categories"
        );
        const payload = Array.isArray(data.categories) ? data.categories : [];
        setCategories(payload);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load categories");
      }
    };
    fetchCategories();
  }, [backend_url]);

  // Handlers
  const handleAddChapter = () => {
    setChapters((prev) => [
      ...prev,
      {
        chapterId: Date.now().toString(),
        chapterTitle: "",
        chapterOrder: prev.length + 1,
        chapterContent: [],
      },
    ]);
  };

  const handleDeleteChapter = (index) => {
    setChapters((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleChapterTitleChange = (index, value) => {
    setChapters((prev) => {
      const updated = [...prev];
      updated[index].chapterTitle = value;
      return updated;
    });
  };

  const handleAddLecture = (chapterIndex) => {
    setChapters((prev) => {
      const updated = [...prev];
      updated[chapterIndex].chapterContent.push({
        lectureId: Date.now().toString(),
        lectureTitle: "",
        lectureUrl: "",
        lectureOrder: updated[chapterIndex].chapterContent.length + 1,
      });
      return updated;
    });
  };

  const handleDeleteLecture = (chapterIndex, lectureIndex) => {
    setChapters((prev) => {
      const updated = [...prev];
      updated[chapterIndex].chapterContent.splice(lectureIndex, 1);
      return updated;
    });
  };

  const handleLectureChange = (chapterIndex, lectureIndex, key, value) => {
    setChapters((prev) => {
      const updated = [...prev];
      updated[chapterIndex].chapterContent[lectureIndex][key] = value;
      return updated;
    });
  };

  const validate = () => {
    if (!courseTitle.trim()) {
      toast.error("Course title is required.");
      return false;
    }
    if (!courseType) {
      toast.error("Please select course type.");
      return false;
    }
    if (courseType === "class" && (!mainCategory || !subCategory)) {
      toast.error("Please select main and sub category for class.");
      return false;
    }
    return true;
  };

  // Submit
  const handleAddNow = async () => {
    try {
      if (!validate()) return;

      setdisablesubmit(true);
      const courseDescription = quillRef.current?.root?.innerHTML || "";

      const baseData = {
        courseTitle,
        coursePrice,
        courseDescription,
        courseContent: chapters,
        isPublished,
        month,
        courseType,
      };

      const courseData =
        courseType === "class"
          ? { ...baseData, mainCategory, subCategory }
          : { ...baseData }; // no categories for lesson-pack

      const { data } = await axios.post(
        backend_url + "/api/educator/add-course",
        { courseData },
        { headers: { "Content-Type": "application/json" } }
      );

      if (data.success) {
        toast.success("Course added successfully");
        // reset form
        setCourseTitle("");
        setChapters([]);
        setCoursePrice(0);
        setMainCategory("");
        setSubCategory("");
        setMonth("");
        setCourseType("class");
        if (quillRef.current) quillRef.current.root.innerHTML = "";
        navigate("/educator/dashboard");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setdisablesubmit(false);
    }
  };

  return isEducator ? (
    <>
      {isloading && <Loading />}
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Add New Course</h1>

        <div className="space-y-4">
          {/* Course Type */}
          <label className="block">
            <span className="font-medium">Course Type</span>
            <select
              value={courseType}
              onChange={(e) => {
                const value = e.target.value;
                setCourseType(value);
                if (value === "lesson-pack") {
                  setMainCategory("");
                  setSubCategory("");
                }
              }}
              className="border border-gray-300 p-2 rounded w-full mt-1"
            >
              <option value="class">Class</option>
              <option value="lesson-pack">Lesson Pack</option>
            </select>
          </label>

          {/* Course Title */}
          <label className="block">
            <span className="font-medium">Course Title</span>
            <input
              type="text"
              placeholder="Course Title"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="border border-gray-300 p-2 rounded w-full mt-1"
            />
          </label>

          {/* Course Description */}
          <label className="block">
            <span className="font-medium">Course Description</span>
            <div ref={editorRef} className="h-40 border rounded p-2 mt-1"></div>
          </label>

          {/* Course Price */}
          <label className="block">
            <span className="font-medium">Course Price (Without Rs.)</span>
            <input
              type="number"
              value={coursePrice}
              onChange={(e) => setCoursePrice(Number(e.target.value))}
              className="border border-gray-300 p-2 rounded w-full mt-1"
            />
          </label>

          {/* Main Category (only for class) */}
          {courseType === "class" && (
            <>
              <label className="block">
                <span className="font-medium">Main Category</span>
                <select
                  value={mainCategory}
                  onChange={(e) => {
                    setMainCategory(e.target.value);
                    setSubCategory("");
                  }}
                  className="border border-gray-300 p-2 rounded w-full mt-1"
                >
                  <option value="">-- Select Main Category --</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>

              {mainCategory && (
                <label className="block">
                  <span className="font-medium">Sub Category</span>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="border border-gray-300 p-2 rounded w-full mt-1"
                  >
                    <option value="">-- Select Sub Category --</option>
                    {categories
                      .find((c) => c._id === mainCategory)
                      ?.subCategories?.map((sub) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </>
          )}
          {courseType === "class" && (
            <div>
              <label className="block">
                <span className="font-medium">Month</span>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="border border-gray-300 p-2 rounded w-full mt-1"
                >
                  <option value="">-- Select Month --</option>
                  {[
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* Chapters */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Chapters</h2>

            {chapters.map((chapter, cIdx) => (
              <div
                key={chapter.chapterId}
                className="border border-gray-300 rounded-lg p-4 mb-6"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-lg">Chapter {cIdx + 1}</h3>
                  <button
                    onClick={() => handleDeleteChapter(cIdx)}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Chapter Title"
                  value={chapter.chapterTitle}
                  onChange={(e) =>
                    handleChapterTitleChange(cIdx, e.target.value)
                  }
                  className="border border-gray-300 p-2 rounded w-full mb-4"
                />

                {/* Lectures */}
                <div>
                  <p className="font-medium mb-2">Lectures</p>
                  {chapter.chapterContent.map((lecture, lIdx) => (
                    <div
                      key={lecture.lectureId}
                      className="space-y-2 mb-4 p-2 border border-gray-200 rounded"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Lecture {lIdx + 1}
                        </span>
                        <button
                          onClick={() => handleDeleteLecture(cIdx, lIdx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Lecture Title"
                        value={lecture.lectureTitle}
                        onChange={(e) =>
                          handleLectureChange(
                            cIdx,
                            lIdx,
                            "lectureTitle",
                            e.target.value
                          )
                        }
                        className="border border-gray-300 p-2 rounded w-full"
                      />
                      <input
                        type="text"
                        placeholder="Lecture URL"
                        value={lecture.lectureUrl}
                        onChange={(e) =>
                          handleLectureChange(
                            cIdx,
                            lIdx,
                            "lectureUrl",
                            e.target.value
                          )
                        }
                        className="border border-gray-300 p-2 rounded w-full"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleAddLecture(cIdx)}
                  className="bg-blue-600 text-white px-4 py-1 rounded mt-2"
                >
                  + Add Lecture
                </button>
              </div>
            ))}

            <button
              onClick={handleAddChapter}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              + Add Chapter
            </button>
          </div>

          {/* Publish checkbox */}
          <div>
            <label className="font-medium">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="mr-2"
              />
              Publish Immediately
            </label>
          </div>

          {/* Add Now Button */}
          <div className="pt-6">
            <button
              onClick={async () => {
                setisloading(true);
                await handleAddNow();
                setisloading(false);
              }}
              className={`${
                disablesubmit
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-700 hover:bg-indigo-800"
              } text-white px-6 py-2 rounded text-lg w-full`}
              disabled={disablesubmit}
            >
              {disablesubmit ? "Processing..." : "🚀 Add Now"}
            </button>
          </div>
        </div>
      </div>
    </>
  ) : (
    <div>login as admin</div>
  );
};

export default AddCourse;
