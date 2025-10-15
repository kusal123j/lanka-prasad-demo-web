import React, { useState, useEffect } from "react";

const NICVerificationStep = ({ setStep, Steps }) => {
  const [BirthDay, setBirthDay] = useState("");
  const [Gender, setGender] = useState("");
  const [NICnumber, setNICnumber] = useState("");
  const [NICFrontImage, setNICFrontImage] = useState(null);
  const [NICFrontPreview, setNICFrontPreview] = useState(null);

  const [nicError, setNicError] = useState("");
  const [imageError, setImageError] = useState("");
  const [focusedField, setFocusedField] = useState("");
  const [nicValid, setNicValid] = useState(false);

  // --- NIC parsing logic (handles old 9+V/X and new 12-digit NICs) ---
  const parseNIC = (nicRaw) => {
    if (!nicRaw) return { error: "Please enter an NIC." };
    const nic = nicRaw.replace(/[\s-]/g, "").toUpperCase();
    const today = new Date();

    // Old format: 9 digits + V/X (e.g. 861234567V)
    if (/^[0-9]{9}[VX]$/.test(nic)) {
      const yy = parseInt(nic.slice(0, 2), 10);
      let dayCode = parseInt(nic.slice(2, 5), 10);
      if (isNaN(dayCode)) return { error: "Invalid NIC day code." };

      let gender = "Male";
      if (dayCode > 500) {
        gender = "Female";
        dayCode -= 500;
      }
      if (dayCode < 1 || dayCode > 366)
        return { error: "Invalid NIC day-of-year." };

      let year = 1900 + yy;
      let birth = new Date(year, 0, dayCode);
      if (birth > today) {
        year = 2000 + yy;
        birth = new Date(year, 0, dayCode);
      }
      if (birth > today)
        return { error: "NIC parsed to a future date. Check the NIC." };

      return { birthday: birth.toISOString().slice(0, 10), gender };
    }

    // New format: 12 digits (YYYYDDDxxxxx)
    if (/^[0-9]{12}$/.test(nic)) {
      const year = parseInt(nic.slice(0, 4), 10);
      let dayCode = parseInt(nic.slice(4, 7), 10);
      if (isNaN(dayCode)) return { error: "Invalid NIC day code." };

      let gender = "Male";
      if (dayCode > 500) {
        gender = "Female";
        dayCode -= 500;
      }
      if (dayCode < 1 || dayCode > 366)
        return { error: "Invalid NIC day-of-year." };

      const birth = new Date(year, 0, dayCode);
      if (birth > today)
        return { error: "NIC parsed to a future date. Check the NIC." };

      return { birthday: birth.toISOString().slice(0, 10), gender };
    }

    return {
      error:
        "Unrecognized NIC format. Accepts old (9 digits + V/X) or new (12 digits). Remove spaces/hyphens.",
    };
  };

  const handleNICBlur = () => {
    const res = parseNIC(NICnumber.trim());
    if (res.error) {
      setNicError(res.error);
      setBirthDay("");
      setGender("");
      setNicValid(false);
    } else {
      setNicError("");
      setBirthDay(res.birthday);
      setGender(res.gender);
      setNicValid(true);
    }
  };

  const handleImageChange = (e) => {
    setImageError("");
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setNICFrontImage(null);
      if (NICFrontPreview) {
        URL.revokeObjectURL(NICFrontPreview);
        setNICFrontPreview(null);
      }
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageError("Please upload a valid image file (jpg, png, etc.)");
      setNICFrontImage(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image too large. Max 5MB allowed.");
      setNICFrontImage(null);
      return;
    }

    if (NICFrontPreview) URL.revokeObjectURL(NICFrontPreview);
    const previewUrl = URL.createObjectURL(file);
    setNICFrontPreview(previewUrl);
    setNICFrontImage(file);
    setImageError("");
  };

  const handleNext = (e) => {
    e.preventDefault();
    setNicError("");
    setImageError("");

    const nicResult = parseNIC(NICnumber.trim());
    if (nicResult.error) {
      setNicError(nicResult.error);
      setNicValid(false);
      return;
    }
    setBirthDay(nicResult.birthday);
    setGender(nicResult.gender);
    setNicValid(true);

    if (!NICFrontImage) {
      setImageError("Please upload the NIC front image.");
      return;
    }

    setStep(Steps.Submit_Other_Details);
  };

  useEffect(() => {
    return () => {
      if (NICFrontPreview) URL.revokeObjectURL(NICFrontPreview);
    };
  }, [NICFrontPreview]);

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
          NIC Verification
        </h2>
        <p className="text-gray-600">
          Submit a valid Sri Lankan NIC to auto-fill birthday & gender
        </p>
      </div>

      <form onSubmit={handleNext} className="space-y-4 max-w-xl mx-auto">
        {/* NIC input */}
        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            NIC Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className={`w-5 h-5 transition-colors ${
                  focusedField === "nic" ? "text-purple-500" : "text-gray-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <input
              type="text"
              inputMode="text"
              placeholder="e.g. 861234567V or 200012345678"
              value={NICnumber}
              onChange={(e) => {
                setNICnumber(e.target.value);
                setNicError("");
                setNicValid(false);
                setBirthDay("");
                setGender("");
              }}
              onFocus={() => setFocusedField("nic")}
              onBlur={() => {
                setFocusedField("");
                handleNICBlur();
              }}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all duration-200 text-gray-800 placeholder-gray-400"
            />
            {nicValid && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg
                  className="w-5 h-5 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 111.414-1.414L8.414 12.586l7.879-7.879a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
          {nicError && <p className="text-sm text-red-600 mt-2">{nicError}</p>}
        </div>

        {/* Birthday & Gender */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Birthday
            </label>
            <input
              type="date"
              value={BirthDay}
              disabled
              className="w-full pl-3 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-100 text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Gender
            </label>
            <input
              type="text"
              value={Gender}
              disabled
              className="w-full pl-3 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-100 text-gray-700"
            />
          </div>
        </div>

        {/* NIC Image */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Upload NIC Front Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full border border-gray-200 rounded-xl bg-gray-100 text-gray-700 py-2 px-3"
          />
          {imageError && (
            <p className="text-sm text-red-600 mt-2">{imageError}</p>
          )}
          {NICFrontPreview && (
            <div className="mt-3 flex items-center space-x-3">
              <img
                src={NICFrontPreview}
                alt="NIC front preview"
                className="w-28 h-20 object-cover rounded-md border"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {NICFrontImage?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(NICFrontImage?.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (NICFrontPreview) URL.revokeObjectURL(NICFrontPreview);
                    setNICFrontPreview(null);
                    setNICFrontImage(null);
                    setImageError("");
                  }}
                  className="mt-2 inline-block text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Next button */}
        <button
          type="submit"
          disabled={!nicValid || !NICFrontImage}
          className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg ${
            !nicValid || !NICFrontImage ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          Next
        </button>
      </form>
    </>
  );
};

export default NICVerificationStep;
