import React, { useState, useContext } from "react";
import axios from "axios";
import { Plus, Trash2, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AppContext } from "../../Context/AppContext";

const AddQuize = () => {
  const { backend_url } = useContext(AppContext);
  const finalApiUrl = `${backend_url}/api/educator/add-quize`; // keep this consistent

  const emptyAnswer = () => ({ text: "", isCorrect: false });
  const emptyQuestion = () => ({
    questionText: "",
    answers: [emptyAnswer(), emptyAnswer()],
  });

  const [form, setForm] = useState({
    courseId: "",
    quizTitle: "",
    description: "",
    questions: [emptyQuestion()],
  });

  const [submitting, setSubmitting] = useState(false);

  // Helpers to update nested state
  const updateQuestionText = (qi, value) => {
    setForm((prev) => {
      const next = { ...prev };
      next.questions = [...prev.questions];
      next.questions[qi] = { ...next.questions[qi], questionText: value };
      return next;
    });
  };

  const updateAnswerText = (qi, ai, value) => {
    setForm((prev) => {
      const next = { ...prev };
      next.questions = [...prev.questions];
      const q = { ...next.questions[qi] };
      q.answers = [...q.answers];
      q.answers[ai] = { ...q.answers[ai], text: value };
      next.questions[qi] = q;
      return next;
    });
  };

  const markCorrectAnswer = (qi, ai) => {
    setForm((prev) => {
      const next = { ...prev };
      next.questions = [...prev.questions];
      const q = { ...next.questions[qi] };
      q.answers = q.answers.map((ans, idx) => ({
        ...ans,
        isCorrect: idx === ai, // enforce exactly one correct
      }));
      next.questions[qi] = q;
      return next;
    });
  };

  const addAnswer = (qi) => {
    setForm((prev) => {
      const next = { ...prev };
      next.questions = [...prev.questions];
      const q = { ...next.questions[qi] };
      q.answers = [...q.answers, emptyAnswer()];
      next.questions[qi] = q;
      return next;
    });
  };

  const removeAnswer = (qi, ai) => {
    setForm((prev) => {
      const next = { ...prev };
      next.questions = [...prev.questions];
      const q = { ...next.questions[qi] };

      if (q.answers.length <= 2) {
        toast.info("Each question must have at least 2 answers.");
        return prev;
      }

      const wasCorrect = q.answers[ai]?.isCorrect;
      q.answers = q.answers.filter((_, idx) => idx !== ai);

      if (wasCorrect && q.answers.length > 0) {
        q.answers = q.answers.map((a, idx) => ({ ...a, isCorrect: idx === 0 }));
      }

      next.questions[qi] = q;
      return next;
    });
  };

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, emptyQuestion()],
    }));
  };

  const removeQuestion = (qi) => {
    setForm((prev) => {
      if (prev.questions.length <= 1) {
        toast.info("Quiz must have at least 1 question.");
        return prev;
      }
      const nextQs = prev.questions.filter((_, idx) => idx !== qi);
      return { ...prev, questions: nextQs };
    });
  };

  // Client-side validation
  const validate = () => {
    const errors = [];

    if (!form.courseId.trim()) errors.push("Course ID is required.");
    if (!form.quizTitle.trim()) errors.push("Quiz title is required.");
    if (!form.questions || form.questions.length === 0)
      errors.push("At least one question is required.");

    form.questions.forEach((q, qi) => {
      if (!q.questionText.trim())
        errors.push(`Question ${qi + 1}: text is required.`);
      if (!q.answers || q.answers.length < 2)
        errors.push(`Question ${qi + 1}: must have at least 2 answers.`);
      if (q.answers.some((a) => !a.text.trim()))
        errors.push(`Question ${qi + 1}: all answers must have text.`);
      const correctCount = q.answers.filter((a) => a.isCorrect).length;
      if (correctCount !== 1)
        errors.push(
          `Question ${qi + 1}: exactly one answer must be marked correct.`
        );
    });

    return errors;
  };

  const resetForm = () => {
    setForm({
      courseId: "",
      quizTitle: "",
      description: "",
      questions: [emptyQuestion()],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
      return;
    }

    const payload = {
      courseId: form.courseId.trim(),
      quizTitle: form.quizTitle.trim(),
      description: form.description.trim(),
      questions: form.questions.map((q) => ({
        questionText: q.questionText.trim(),
        answers: q.answers.map((a) => ({
          text: a.text.trim(),
          isCorrect: a.isCorrect,
        })),
      })),
    };

    try {
      setSubmitting(true);
      axios.defaults.withCredentials = true;
      const res = await axios.post(finalApiUrl, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      toast.success(res?.data?.message || "Quiz created successfully!");
      resetForm();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong while creating the quiz.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <ToastContainer position="top-right" theme="colored" />

      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
          <Plus className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold text-blue-700">
          Create a New Quiz
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 space-y-6"
      >
        {/* Top-level fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Course ID
            </label>
            <input
              type="text"
              value={form.courseId}
              onChange={(e) =>
                setForm((p) => ({ ...p, courseId: e.target.value }))
              }
              placeholder="e.g. 665a1b2c3d4e5f6789012345"
              className="w-full rounded-md border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">
              Quiz Title
            </label>
            <input
              type="text"
              value={form.quizTitle}
              onChange={(e) =>
                setForm((p) => ({ ...p, quizTitle: e.target.value }))
              }
              placeholder="Algebra Basics Quiz"
              className="w-full rounded-md border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="Short description for this quiz..."
            rows={3}
            className="w-full rounded-md border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
          />
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {form.questions.map((q, qi) => (
            <div
              key={qi}
              className="rounded-lg border border-blue-200 p-4 space-y-4 bg-blue-50/20"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-blue-700">
                  Question {qi + 1}
                </h3>
                <button
                  type="button"
                  onClick={() => removeQuestion(qi)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  title="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-sm">Remove</span>
                </button>
              </div>

              <input
                type="text"
                value={q.questionText}
                onChange={(e) => updateQuestionText(qi, e.target.value)}
                placeholder="Enter the question text"
                className="w-full rounded-md border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
              />

              <div className="space-y-3">
                {q.answers.map((a, ai) => (
                  <div
                    key={ai}
                    className="flex items-center gap-3 bg-white rounded-md border border-blue-100 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => markCorrectAnswer(qi, ai)}
                      className={`rounded-full p-1 transition-colors ${
                        a.isCorrect
                          ? "text-blue-600"
                          : "text-gray-400 hover:text-blue-500"
                      }`}
                      title={a.isCorrect ? "Correct answer" : "Mark as correct"}
                    >
                      {a.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <input
                      type="text"
                      value={a.text}
                      onChange={(e) => updateAnswerText(qi, ai, e.target.value)}
                      placeholder={`Answer ${ai + 1}`}
                      className="flex-1 rounded-md border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
                    />

                    <button
                      type="button"
                      onClick={() => removeAnswer(qi, ai)}
                      className="text-red-600 hover:text-red-700"
                      title="Remove answer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addAnswer(qi)}
                  className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Add answer
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800"
          >
            <Plus className="h-4 w-4" />
            Add another question
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-md disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Quiz
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddQuize;
