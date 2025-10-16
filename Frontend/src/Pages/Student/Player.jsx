import { useContext, useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
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
import Loading from "../../Components/Student/Loading";
import VideoPlayer from "../../Components/Student/VideoPlayer";
import { AppContext } from "../../Context/AppContext";

const Player = () => {
  const app = useContext(AppContext) ?? {};
  const { enrolledCourses = [], navigate, userData } = app;
  const { courseId } = useParams();

  const [courseData, setCourseData] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playerData, setplayerData] = useState(false);
  const [lectureTitle, setLectureTitle] = useState("");
  const [showResources, setShowResources] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);

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

  const handleChapterFilter = (chapterTitle) => {
    setSelectedChapter(chapterTitle);
    setSelectedVideo(null);
    setSelectedLecture(null);
  };

  const courseContent = Array.isArray(courseData?.courseContent)
    ? courseData.courseContent
    : [];

  useEffect(() => {
    if (!selectedChapter && courseContent.length > 0) {
      setSelectedChapter(courseContent[0].chapterTitle);
    }
  }, [courseContent, selectedChapter]);

  const lectures = useMemo(() => {
    if (!courseContent?.length) return [];

    const chapterTitle = selectedChapter || courseContent[0]?.chapterTitle;
    const chapter =
      courseContent.find((ch) => ch.chapterTitle === chapterTitle) ||
      courseContent[0];

    const cid = chapter?.chapterId || chapter?._id || chapter?.id;

    return Array.isArray(chapter?.chapterContent)
      ? chapter.chapterContent.map((lecture, idx) => ({
          ...lecture,
          chapterTitle: chapter.chapterTitle,
          chapterId: cid,
          lectureId: lecture.lectureId || lecture._id || `${cid}-${idx}`,
        }))
      : [];
  }, [courseContent, selectedChapter]);

  const resources = useMemo(
    () =>
      Array.isArray(courseData?.courseResources)
        ? courseData.courseResources
        : [],
    [courseData]
  );

  const openExternalLink = (url) => {
    try {
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url; // auto-fix if protocol missing
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Invalid URL:", url, err);
    }
  };

  return courseData ? (
    <div className="min-h-screen pt-16 md:pt-2 bg-neutral-50 text-neutral-900 selection:bg-rose-200 selection:text-neutral-900">
      {showResources ? (
        // Resources View
        <div className="sm:pt-20 px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setShowResources(false)}
                className="h-11 w-11 rounded-xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center hover:bg-neutral-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 text-neutral-600"
                aria-label="Back"
              >
                <ArrowLeftFromLine className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  Course Resources
                </h1>
                <p className="text-neutral-500 mt-1">
                  {courseData.courseTitle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {resources.length === 0 ? (
                <div className="col-span-full">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 border border-neutral-200">
                      <FileText className="w-7 h-7 text-neutral-500" />
                    </div>
                    <p className="text-neutral-500 text-lg">
                      No resources available yet
                    </p>
                  </div>
                </div>
              ) : (
                resources.map((r, idx) => (
                  <div
                    key={r.resourceId || r._id || idx}
                    className="group rounded-2xl border border-neutral-200 bg-white p-5 hover:bg-neutral-50 hover:border-rose-300 transition-colors shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-base text-neutral-900 truncate">
                          {r.resourceTitle}
                        </h3>
                        <p className="text-sm text-neutral-500 truncate">
                          {r.resourceUrl}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => openExternalLink(r.resourceUrl)}
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
                  setSelectedLecture(null);
                }}
                className="h-11 w-11 rounded-xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center hover:bg-neutral-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 text-neutral-600"
                aria-label="Back"
              >
                <ArrowLeftFromLine className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold truncate">
                  {lectureTitle || "Video Player"}
                </h1>
                <p className="text-neutral-500 truncate">
                  {courseData.courseTitle}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
              <div className="aspect-video w-full">
                {selectedVideo && selectedLecture && userData ? (
                  <VideoPlayer
                    videoId={extractYouTubeVideoID(selectedVideo)}
                    userId={userData?.NIC || userData?._id}
                    courseId={courseId}
                    chapterId={selectedLecture?.chapterId}
                    lectureId={selectedLecture?.lectureId}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 border border-neutral-200">
                        <Video className="w-7 h-7 text-neutral-500" />
                      </div>
                      <p className="text-neutral-500 text-lg">
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
                onClick={() => (navigate ? navigate("/dashboard") : null)}
                className="h-11 w-11 rounded-xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center hover:bg-neutral-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 text-neutral-600"
                aria-label="Back to My Enrollments"
              >
                <ArrowLeftFromLine className="w-5 h-5" />
              </button>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight leading-tight">
                  {courseData.courseTitle}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-neutral-500 text-sm">
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
                  onClick={() => openExternalLink(courseData.zoomLink)}
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
                    setSelectedLecture({
                      lectureId: "youtubeLive",
                      lectureTitle: "YouTube Live",
                      lectureUrl: courseData.youtubeLive,
                      chapterId: "live",
                    });
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
                  className="inline-flex items-center gap-2 rounded-lg bg-white border border-neutral-200 text-neutral-700 px-4 sm:px-5 py-2.5 hover:bg-neutral-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                >
                  <FileText className="w-5 h-5" />
                  Resources ({resources.length})
                </button>
              )}
            </div>

            {/* Chapter Filter */}
            <div className="mb-8">
              <h2 className="text-base sm:text-lg font-medium text-neutral-700 mb-3">
                Browse by Chapter
              </h2>
              <div className="flex flex-wrap gap-2">
                {courseContent.map((chapter, idx) => (
                  <button
                    key={chapter.chapterId || chapter._id || idx}
                    onClick={() => handleChapterFilter(chapter.chapterTitle)}
                    className={`px-4 py-2 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 ${
                      selectedChapter === chapter.chapterTitle
                        ? "bg-neutral-100 border-neutral-300 text-neutral-900"
                        : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
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
                  {selectedChapter ||
                    courseContent[0]?.chapterTitle ||
                    "Lectures"}
                </h2>
              </div>

              {lectures.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 border border-neutral-200">
                    <Video className="w-7 h-7 text-neutral-500" />
                  </div>
                  <p className="text-neutral-500 text-lg">
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
                      className="group rounded-2xl border border-neutral-200 bg-white p-5 hover:bg-neutral-50 hover:border-rose-300 transition-colors shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex-shrink-0 font-semibold">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-medium text-neutral-900 truncate">
                              {lecture.lectureTitle}
                            </h3>
                            <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                              <BookOpen className="w-4 h-4" />
                              <span className="truncate">
                                {lecture.chapterTitle}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const ch = courseContent.find(
                              (c) => c.chapterTitle === lecture.chapterTitle
                            );
                            const chapterId =
                              lecture.chapterId ||
                              ch?.chapterId ||
                              ch?._id ||
                              ch?.id;

                            const normalizedLecture = {
                              ...lecture,
                              chapterId,
                              lectureId:
                                lecture.lectureId ||
                                lecture._id ||
                                `${chapterId}-${index}`,
                            };

                            setSelectedLecture(normalizedLecture);
                            setSelectedVideo(lecture.lectureUrl);
                            setplayerData(true);
                            setLectureTitle(lecture.lectureTitle);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 text-white px-4 py-2 hover:bg-rose-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60"
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
