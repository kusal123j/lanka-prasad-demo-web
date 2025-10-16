import React, { useRef, useState, useEffect, useContext } from "react";
import { AppContext } from "../../Context/AppContext";
import Loading from "../../Components/Student/Loading";
import axios from "axios";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const EditCourse = () => {
  const { id } = useParams();
  const { backend_url, navigate, fetchAllCourses } = useContext(AppContext);

  const [courseData, setCourseData] = useState(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [coursePrice, setCoursePrice] = useState(0);
  const [chapters, setChapters] = useState([]);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [courseDescription, setCourseDescription] = useState("");
  const [resources, setResources] = useState([]);
  const [zoomLink, setzoomLink] = useState("");
  const [displayZoominput, setdisplayZoominput] = useState(false);
  const [youtubeLive, setyoutubeLive] = useState("");
  const [displayYoutubeinput, setdisplayYoutubeinput] = useState(false);

  const quillRef = useRef(null);
  const [quill, setQuill] = useState(null);
  const [content, setContent] = useState("");

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) {
        toast.error("Course ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await axios.get(`${backend_url}/api/course/${id}`);

        if (data.success && data.course) {
          const course = data.course;
          setCourseData(course);
          setCourseTitle(course.courseTitle || "");
          setCoursePrice(course.coursePrice || 0);
          setChapters(course.courseContent || []);
          setIsPublished(course.isPublished || false);
          setCourseDescription(course.courseDescription || "");
          setzoomLink(course.zoomLink || "");
          setyoutubeLive(course.youtubeLive || "");
          setResources(course.courseResources || []);
        } else {
          toast.error(data.message || "Failed to load course data");
        }
      } catch (error) {
        console.error("Fetch course error:", error);
        toast.error(
          "Failed to fetch course: " +
            (error.response?.data?.message || error.message)
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [backend_url, id]);

  // Zoom & YouTube toggles
  useEffect(() => setdisplayZoominput(zoomLink !== ""), [zoomLink]);
  useEffect(() => setdisplayYoutubeinput(youtubeLive !== ""), [youtubeLive]);

  // Quill editor
  useEffect(() => {
    if (quillRef.current && !quill) {
      const editor = new Quill(quillRef.current, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [1, 2, false] }],
            ["bold", "italic", "underline", "strike", "blockquote"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ color: [] }, { background: [] }],
          ],
        },
      });

      if (courseDescription) {
        editor.clipboard.dangerouslyPasteHTML(courseDescription);
      }

      editor.on("text-change", () => {
        const html = editor.root.innerHTML;
        setContent(html);
        setCourseDescription(html);
      });

      setQuill(editor);
    }
  }, [quill, courseDescription]);

  // Chapter handlers
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
    if (chapters.length === 1) {
      toast.warning("Course must have at least one chapter");
      return;
    }
    setChapters((prev) => prev.filter((_, idx) => idx !== index));
  };
  const handleChapterTitleChange = (index, value) => {
    setChapters((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], chapterTitle: value };
      return updated;
    });
  };

  // Lecture handlers
  const handleAddLecture = (chapterIndex) => {
    setChapters((prev) => {
      const updated = [...prev];
      updated[chapterIndex] = {
        ...updated[chapterIndex],
        chapterContent: [
          ...updated[chapterIndex].chapterContent,
          {
            lectureId: Date.now().toString(),
            lectureTitle: "",
            lectureUrl: "",
            lectureOrder: updated[chapterIndex].chapterContent.length + 1,
          },
        ],
      };
      return updated;
    });
  };
  const handleDeleteLecture = (chapterIndex, lectureIndex) => {
    setChapters((prev) => {
      const updated = [...prev];
      updated[chapterIndex] = {
        ...updated[chapterIndex],
        chapterContent: updated[chapterIndex].chapterContent.filter(
          (_, idx) => idx !== lectureIndex
        ),
      };
      return updated;
    });
  };
  const handleLectureChange = (chapterIndex, lectureIndex, key, value) => {
    setChapters((prev) => {
      const updated = [...prev];
      updated[chapterIndex] = {
        ...updated[chapterIndex],
        chapterContent: updated[chapterIndex].chapterContent.map(
          (lecture, idx) =>
            idx === lectureIndex ? { ...lecture, [key]: value } : lecture
        ),
      };
      return updated;
    });
  };

  // Resource handlers
  const handleAddResource = () => {
    setResources((prev) => [
      ...prev,
      {
        resourceId: Date.now().toString(),
        resourceTitle: "",
        resourceUrl: "",
      },
    ]);
  };
  const handleResourceChange = (index, key, value) => {
    setResources((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };
  const handleDeleteResource = (index) => {
    setResources((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Validation
  const validateCourseData = () => {
    if (!courseTitle.trim()) {
      toast.error("Course title is required.");
      return false;
    }
    if (coursePrice < 0) {
      toast.error("Course price cannot be negative.");
      return false;
    }
    if (chapters.length === 0) {
      toast.error("Course must have at least one chapter.");
      return false;
    }
    for (let i = 0; i < chapters.length; i++) {
      if (!chapters[i].chapterTitle.trim()) {
        toast.error(`Chapter ${i + 1} title is required.`);
        return false;
      }
      for (let j = 0; j < chapters[i].chapterContent.length; j++) {
        const lecture = chapters[i].chapterContent[j];
        if (!lecture.lectureTitle.trim()) {
          toast.error(
            `Lecture ${j + 1} title in Chapter ${i + 1} is required.`
          );
          return false;
        }
        if (!lecture.lectureUrl.trim()) {
          toast.error(`Lecture ${j + 1} URL in Chapter ${i + 1} is required.`);
          return false;
        }
      }
    }
    if (!courseDescription.trim()) {
      toast.error("Course description cannot be empty.");
      return false;
    }
    return true;
  };

  // Update handler
  const handleUpdate = async () => {
    if (!validateCourseData()) return;

    try {
      setUpdating(true);

      const updatedData = {
        courseId: id,
        courseTitle: courseTitle.trim(),
        coursePrice: Number(coursePrice),
        zoomLink,
        youtubeLive,
        courseDescription: courseDescription.trim(),
        courseResources: resources,
        courseContent: chapters.map((chapter, idx) => ({
          ...chapter,
          chapterOrder: idx + 1,
          chapterContent: chapter.chapterContent.map((lecture, lectureIdx) => ({
            ...lecture,
            lectureOrder: lectureIdx + 1,
          })),
        })),
        isPublished,
      };

      const { data } = await axios.post(
        `${backend_url}/api/educator/edit-course`,
        { courseData: updatedData }
      );

      if (zoomLink && zoomLink !== courseData.zoomLink) {
        const { zoom } = await axios.post(
          `${backend_url}/api/educator/set-zoom-notification`,
          { courseId: id }
        );
        if (!zoom.success) toast.error(data.message);
      }

      if (data.success) {
        toast.success("Course updated successfully");
        setCourseData((prev) => ({ ...prev, ...updatedData }));
        navigate("/educator/dashboard");
        fetchAllCourses();
      } else {
        toast.error(data.message || "Failed to update course");
      }
    } catch (error) {
      console.error("Update course error:", error);
      toast.error(
        "Error updating course: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleCourseDelete = async () => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        axios.defaults.withCredentials = true;
        const { data } = await axios.delete(
          `${backend_url}/api/educator/delete-course`,
          { data: { courseId: id } }
        );
        if (data.success) {
          toast.success(data.message);
          navigate("/educator/dashboard");
          fetchAllCourses();
        } else {
          toast.error(data.message || "Failed to delete course");
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Something went wrong");
      }
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loading />
      </div>
    );
  if (!courseData)
    return <div className="p-4 text-center">Course not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Edit Course: {courseData.courseTitle}
      </h1>

      <div className="space-y-6">
        {/* Course Title */}
        <div>
          <label className="block font-medium mb-2">Course Title *</label>
          <input
            type="text"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter course title"
          />
        </div>

        {/* Course Price */}
        <div>
          <label className="block font-medium mb-2">Course Price ($)</label>
          <input
            type="number"
            min={0}
            value={coursePrice}
            onChange={(e) => setCoursePrice(e.target.value)}
            className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter price (0 for free)"
          />
        </div>

        {/* Course Description */}
        <div>
          <p className="mb-1 font-medium">Course Description</p>
          <div ref={quillRef} style={{ height: "300px" }} />
        </div>

        {/* Chapters */}
        <div>
          <label className="block font-medium mb-2">Chapters *</label>
          {chapters.map((chapter, cIdx) => (
            <div
              key={chapter.chapterId}
              className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex justify-between items-center mb-2">
                <input
                  type="text"
                  value={chapter.chapterTitle}
                  onChange={(e) =>
                    handleChapterTitleChange(cIdx, e.target.value)
                  }
                  placeholder={`Chapter ${cIdx + 1} Title`}
                  className="border border-gray-300 rounded-md p-2 flex-grow"
                />
                <button
                  onClick={() => handleDeleteChapter(cIdx)}
                  className="ml-4 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                  title="Delete Chapter"
                >
                  Delete
                </button>
              </div>

              <div className="pl-4">
                <h4 className="font-semibold mb-2">Lectures</h4>
                {chapter.chapterContent.map((lecture, lIdx) => (
                  <div
                    key={lecture.lectureId}
                    className="mb-3 flex flex-col md:flex-row md:items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder={`Lecture ${lIdx + 1} Title`}
                      value={lecture.lectureTitle}
                      onChange={(e) =>
                        handleLectureChange(
                          cIdx,
                          lIdx,
                          "lectureTitle",
                          e.target.value
                        )
                      }
                      className="border border-gray-300 rounded-md p-2 flex-grow"
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
                      className="border border-gray-300 rounded-md p-2 flex-grow"
                    />
                    <button
                      onClick={() => handleDeleteLecture(cIdx, lIdx)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      title="Delete Lecture"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleAddLecture(cIdx)}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                >
                  + Add Lecture
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={handleAddChapter}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded"
          >
            + Add Chapter
          </button>
        </div>

        {/* Resources */}
        <div>
          <label className="block font-medium mb-2">Resources</label>
          {resources.map((res, rIdx) => (
            <div
              key={res.resourceId}
              className="mb-3 flex flex-col md:flex-row md:items-center gap-2"
            >
              <input
                type="text"
                placeholder={`Resource ${rIdx + 1} Title`}
                value={res.resourceTitle}
                onChange={(e) =>
                  handleResourceChange(rIdx, "resourceTitle", e.target.value)
                }
                className="border border-gray-300 rounded-md p-2 flex-grow"
              />
              <input
                type="text"
                placeholder="Resource URL"
                value={res.resourceUrl}
                onChange={(e) =>
                  handleResourceChange(rIdx, "resourceUrl", e.target.value)
                }
                className="border border-gray-300 rounded-md p-2 flex-grow"
              />
              <button
                onClick={() => handleDeleteResource(rIdx)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>
          ))}
          <button
            onClick={handleAddResource}
            className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
          >
            + Add Resource
          </button>
        </div>

        {/* Zoom */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <button
            onClick={() => setdisplayZoominput((prev) => !prev)}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded"
          >
            {displayZoominput ? (
              <span>− Remove Zoom Meeting</span>
            ) : (
              <span>+ Add Zoom Meeting</span>
            )}
          </button>

          {displayZoominput && (
            <div className="mt-3">
              <label className="block font-medium mb-2 text-gray-700">
                Zoom Meeting Link *
              </label>
              <input
                type="text"
                value={zoomLink}
                onChange={(e) => setzoomLink(e.target.value)}
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Enter Zoom meeting URL"
              />
            </div>
          )}
        </div>

        {/* YouTube Live */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <button
            onClick={() => setdisplayYoutubeinput((prev) => !prev)}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded"
          >
            {displayYoutubeinput ? (
              <span>− Remove Youtube Live</span>
            ) : (
              <span>+ Add Youtube Live</span>
            )}
          </button>

          {displayYoutubeinput && (
            <div className="mt-3">
              <label className="block font-medium mb-2 text-gray-700">
                Youtube Live Link *
              </label>
              <input
                type="text"
                value={youtubeLive}
                onChange={(e) => setyoutubeLive(e.target.value)}
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Enter Youtube Live Link"
              />
            </div>
          )}
        </div>

        {/* Publish Toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            id="publishToggle"
          />
          <label htmlFor="publishToggle" className="font-medium">
            Publish Course
          </label>
        </div>

        {/* Submit */}
        <div>
          <button
            onClick={handleUpdate}
            disabled={updating}
            className={`w-full py-3 text-white rounded-lg ${
              updating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {updating ? "Updating..." : "Update Course"}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-100 rounded-lg p-4">
          <p className="text-black text-2xl font-bold mb-5">Danger Zone</p>
          <button
            onClick={handleCourseDelete}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-1 rounded"
            title="Delete Course"
          >
            Delete
          </button>
          <p className="text-gray-500 font-semibold m-3">
            Deleting a course is permanent and cannot be undone. Please be
            careful.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EditCourse;
