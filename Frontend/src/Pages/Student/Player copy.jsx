import { useContext, useState, useEffect, useMemo } from "react";
import { AppContext } from "../../Context/AppContext";
import { useParams } from "react-router-dom";
import Loading from "../../Components/Student/Loading";
import {
  ArrowLeftFromLine,
  Play,
  BookOpen,
  Video,
  Download,
  FileText,
  Users,
  Clock,
} from "lucide-react";
import VideoPlayer from "../../Components/Student/VideoPlayer";

const Player = () => {
  const app = useContext(AppContext) ?? {};
  const { enrolledCourses = [], navigate, userData } = app;
  const { courseId } = useParams();

  const [courseData, setCourseData] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState("All");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playerData, setplayerData] = useState(false);
  const [lectureTitle, setLectureTitle] = useState("");
  const [showResources, setShowResources] = useState(false);

  useEffect(() => {
    if (!Array.isArray(enrolledCourses) || !courseId) return;
    const course = enrolledCourses.find((c) => c?.course?._id === courseId);
    setCourseData(course?.course ?? null);
  }, [enrolledCourses, courseId]);

  function extractYouTubeVideoID(url = "") {
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  const getHostname = (url = "") => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  };

  const handleChapterFilter = (chapterTitle) => {
    setSelectedChapter(chapterTitle);
    setSelectedVideo(null);
  };

  const courseContent = Array.isArray(courseData?.courseContent)
    ? courseData.courseContent
    : [];

  const lectures = useMemo(() => {
    if (!courseContent.length) return [];
    if (selectedChapter === "All") {
      return courseContent.flatMap((chapter) =>
        Array.isArray(chapter?.chapterContent)
          ? chapter.chapterContent.map((lecture) => ({
              ...lecture,
              chapterTitle: chapter.chapterTitle,
            }))
          : []
      );
    } else {
      const chapter = courseContent.find(
        (ch) => ch.chapterTitle === selectedChapter
      );
      return Array.isArray(chapter?.chapterContent)
        ? chapter.chapterContent.map((lecture) => ({
            ...lecture,
            chapterTitle: chapter.chapterTitle,
          }))
        : [];
    }
  }, [courseContent, selectedChapter]);

  const resources = useMemo(
    () =>
      Array.isArray(courseData?.courseResources)
        ? courseData.courseResources
        : [],
    [courseData]
  );

  return courseData ? (
    <div className="min-h-screen bg-neutral-950 text-gray-100 selection:bg-rose-500/30 selection:text-white">
      {showResources ? (
        // Resources View
        <div className="sm:pt-20 px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setShowResources(false)}
                className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60"
                aria-label="Back"
              >
                <ArrowLeftFromLine className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  Course Resources
                </h1>
                <p className="text-gray-400 mt-1">{courseData.courseTitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {resources.length === 0 ? (
                <div className="col-span-full">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                      <FileText className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-lg">
                      No resources available yet
                    </p>
                  </div>
                </div>
              ) : (
                resources.map((r, idx) => (
                  <div
                    key={r.resourceId || r._id || idx}
                    className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-rose-500/40 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-600/15 text-rose-300 border border-rose-500/20">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-base text-white truncate">
                          {r.resourceTitle}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">
                          {getHostname(r.resourceUrl)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        window.open(
                          r.resourceUrl,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 text-white px-4 py-2.5 hover:bg-rose-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60"
                    >
                      <Download className="w-4 h-4" />
                      Open Resource
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : playerData ? (
        // Player View
        <div className="sm:pt-20 px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => {
                  setSelectedVideo(null);
                  setplayerData(false);
                }}
                className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60"
                aria-label="Back"
              >
                <ArrowLeftFromLine className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold truncate">
                  {lectureTitle || "Video Player"}
                </h1>
                <p className="text-gray-400 truncate">
                  {courseData.courseTitle}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black overflow-hidden">
              <div className="aspect-video w-full">
                {selectedVideo && userData?.NIC ? (
                  <VideoPlayer
                    videoId={extractYouTubeVideoID(selectedVideo)}
                    userId={userData.NIC}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                        <Video className="w-7 h-7 text-gray-400" />
                      </div>
                      <p className="text-gray-400 text-lg">
                        {userData?.NIC
                          ? "Select a video to start learning"
                          : "Loading player..."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Course Content View
        <div className="sm:pt-20 px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-start gap-4 sm:gap-5 mb-8">
              <button
                onClick={() =>
                  navigate ? navigate("/student/my-enrollments") : null
                }
                className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60"
                aria-label="Back to My Enrollments"
              >
                <ArrowLeftFromLine className="w-5 h-5" />
              </button>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight leading-tight">
                  {courseData.courseTitle}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-400 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    <span className="font-medium">
                      {lectures.length} Lectures
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span className="font-medium">
                      {courseContent.length} Chapters
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 sm:gap-4 mb-8">
              {courseData.zoomLink && (
                <button
                  onClick={() => {
                    const url = courseData.zoomLink;
                    if (/^https?:\/\//i.test(url)) {
                      window.open(url, "_blank", "noopener,noreferrer");
                    } else if (navigate) {
                      navigate(url);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 sm:px-5 py-2.5 hover:bg-blue-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                >
                  <Users className="w-5 h-5" />
                  Join Live Session
                </button>
              )}

              {courseData.youtubeLive && (
                <button
                  onClick={() => {
                    setSelectedVideo(courseData.youtubeLive);
                    setLectureTitle("YouTube Live");
                    setplayerData(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 text-white px-4 sm:px-5 py-2.5 hover:bg-rose-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60"
                >
                  <Video className="w-5 h-5" />
                  Watch Live Stream
                </button>
              )}

              {resources.length > 0 && (
                <button
                  onClick={() => setShowResources(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 text-white px-4 sm:px-5 py-2.5 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60"
                >
                  <FileText className="w-5 h-5" />
                  Resources ({resources.length})
                </button>
              )}
            </div>

            {/* Chapter Filter */}
            <div className="mb-8">
              <h2 className="text-base sm:text-lg font-medium text-gray-200 mb-3">
                Browse by Chapter
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleChapterFilter("All")}
                  className={`px-4 py-2 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60 ${
                    selectedChapter === "All"
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  All Lectures
                </button>

                {courseContent.map((chapter, idx) => (
                  <button
                    key={chapter.chapterId || chapter._id || idx}
                    onClick={() => handleChapterFilter(chapter.chapterTitle)}
                    className={`px-4 py-2 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60 ${
                      selectedChapter === chapter.chapterTitle
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {chapter.chapterTitle}
                  </button>
                ))}
              </div>
            </div>

            {/* Lectures */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-5 w-1 rounded-full bg-rose-500/80" />
                <h2 className="text-xl sm:text-2xl font-semibold">
                  {selectedChapter === "All" ? "All Lectures" : selectedChapter}
                </h2>
              </div>

              {lectures.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                    <Video className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-lg">
                    No lectures found in this chapter
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lectures.map((lecture, index) => (
                    <div
                      key={
                        lecture.lectureId ||
                        lecture._id ||
                        `${lecture.chapterTitle}-${index}`
                      }
                      className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-rose-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600/15 text-rose-300 border border-rose-500/20 flex-shrink-0 font-semibold">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-medium text-white truncate">
                              {lecture.lectureTitle}
                            </h3>
                            <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                              <BookOpen className="w-4 h-4" />
                              <span className="truncate">
                                {lecture.chapterTitle}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedVideo(lecture.lectureUrl);
                            setplayerData(true);
                            setLectureTitle(lecture.lectureTitle);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 text-white px-4 py-2 hover:bg-rose-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60"
                          aria-label={`Play ${lecture.lectureTitle}`}
                        >
                          <Play className="w-5 h-5" />
                          <span className="hidden sm:inline">Watch</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <Loading />
  );
};

export default Player;
