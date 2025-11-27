'use client';
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import axios from 'axios';

type ScholasticRecord = {
  scholastic_id: number;
  strand: string;
  grade_level: number;
  semester: number;
  subject?: string;
  subjects?: string;
  grade: number | string | null;
};

const Page = () => {
  const [track, setTrack] = useState<string | null>(null);
  const [gradeLevel, setGradeLevel] = useState(12);
  const [semester, setSemester] = useState(1);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(true);
  const [allGrades, setAllGrades] = useState<any[]>([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [notAvailable, setNotAvailable] = useState<boolean[]>([]);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  // 🧭 Redirect admin away
  useEffect(() => {
    const roleId = localStorage.getItem('role_id');
    if (roleId === '1') router.replace('/admin');
  }, [router]);

  // 🔹 Fetch strand
  useEffect(() => {
    const fetchUserStrand = async () => {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        alert('You must be logged in.');
        router.push('/');
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/api/scholastic/user-strand/${userId}`);
        if (res.data && res.data.strand) {
          setTrack(res.data.strand);
          setShowStepsModal(false);
        }
      } catch (error) {
        console.error('Error fetching user strand:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStrand();
  }, [API_BASE_URL, router]);

  // 🔹 Fetch subjects or records
  useEffect(() => {
    const fetchData = async () => {
      if (!track || loading) return;

      const userId = localStorage.getItem('user_id');
      if (!userId) return;

      try {
        const recordRes = await axios.get(`${API_BASE_URL}/api/scholastic/records/${userId}`);

        if (recordRes.data.success && recordRes.data.records.length > 0) {
          setLocked(true);

          const filtered: ScholasticRecord[] = recordRes.data.records.filter(
            (r: ScholasticRecord) =>
              r.semester === semester &&
              r.strand === track
          );

          setSubjects(filtered);

          // FIX: Convert "marked" to NA auto-lock
          const fixedGrades = filtered.map((r) =>
            r.grade === "marked" ? "N/A" : r.grade?.toString() || ""
          );

          const fixedNA = filtered.map((r) =>
            r.grade === "marked"
          );

          setGrades(fixedGrades);
          setNotAvailable(fixedNA);
          setErrors(Array(filtered.length).fill(''));

          return;
        }

        const subjRes = await axios.get(`${API_BASE_URL}/api/scholastic/subjects`, {
          params: { strand: track, grade_level: gradeLevel, semester },
        });

        if (Array.isArray(subjRes.data)) {
          setSubjects(subjRes.data);
          setGrades(Array(subjRes.data.length).fill(''));
          setErrors(Array(subjRes.data.length).fill(''));
          setNotAvailable(Array(subjRes.data.length).fill(false));
          setLocked(false);
        } else {
          setSubjects([]);
        }
      } catch (error) {
        console.error('Failed to fetch scholastic data:', error);
        setSubjects([]);
      }
    };

    fetchData();
  }, [track, gradeLevel, semester, loading, API_BASE_URL]);

  // Fully lock to Grade 12 (no changes allowed anywhere)
  useEffect(() => {
    setGradeLevel(12);
  }, []);

  // 🔹 Grade input
  const handleGradeChange = (index: number, value: string) => {
    const updatedGrades = [...grades];
    updatedGrades[index] = value;

    const updatedErrors = [...errors];
    if (!value) updatedErrors[index] = 'Fill the blanks';
    else if (isNaN(Number(value)) || Number(value) < 60 || Number(value) > 100)
      updatedErrors[index] = 'Invalid grade input';
    else updatedErrors[index] = '';

    setGrades(updatedGrades);
    setErrors(updatedErrors);
  };
  const toggleNotAvailable = (index: number) => {
    const updated = [...notAvailable];
    updated[index] = !updated[index];
    setNotAvailable(updated);

    const updatedErrors = [...errors];
    updatedErrors[index] = '';
    setErrors(updatedErrors);

    const updatedGrades = [...grades];
    updatedGrades[index] = updated[index] ? 'N/A' : '';
    setGrades(updatedGrades);
  };

  // 🔹 Next navigation
  const handleNext = () => {
    const updatedErrors = grades.map((g, i) => {
      if (notAvailable[i]) return '';
      if (!g) return 'Fill the blanks';
      if (isNaN(Number(g)) || Number(g) < 60 || Number(g) > 100)
        return 'Invalid grade input';
      return '';
    });

    setErrors(updatedErrors);

    if (updatedErrors.some((err) => err)) {
      setShowErrorPopup(true);
      const firstErrorIndex = updatedErrors.findIndex((err) => err);
      document.getElementById(`grade-input-${firstErrorIndex}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }

    const userId = localStorage.getItem('user_id');
    const currentPayload = subjects.map((subj, i) => ({
      user_id: Number(userId),
      scholastic_id: subj.scholastic_id,
      grade: parseFloat(parseFloat(grades[i]).toFixed(2)) || 0,
    }));

    setAllGrades((prev) => {
      const filtered = prev.filter(
        (item) => !currentPayload.some((c) => c.scholastic_id === item.scholastic_id)
      );
      return [...filtered, ...currentPayload];
    });
    if (semester === 1) setSemester(2);
    else setShowConfirmation(true);

  };

  const handleBack = () => {
    // 🔒 User has already submitted → restrict "Back"
    if (locked) {
      // Allowed: Sem 2 → Sem 1
      if (semester === 2) {
        setSemester(1);
      }
      // Not allowed: Sem 1 → Strand selection
      return;
    }

    // Normal behavior (user not locked)
    if (semester === 2) {
      setSemester(1);
    } else {
      setSemester(1);
      setTrack(null);
    }
  };

  const handleCancel = () => setShowConfirmation(false);

  const handleConfirm = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        alert('You must be logged in to submit.');
        return;
      }

      const finalPayload = subjects.map((subj, i) => ({
        user_id: Number(userId),
        scholastic_id: subj.scholastic_id,
        grade: parseFloat(grades[i]) || 0,
      }));

      const payload = [
        ...allGrades.filter(
          (item) => !finalPayload.some((f) => f.scholastic_id === item.scholastic_id)
        ),
        ...finalPayload,
      ];

      if (payload.length === 0) {
        alert('No grades to submit.');
        return;
      }

      // 🧩 STEP 1: Save user strand first (only if not already saved)
      try {
        await axios.post(`${API_BASE_URL}/api/scholastic/save-strand`, {
          user_id: Number(userId),
          strand: track,
        });
      } catch (error: any) {
        // If user already has a strand (status 409), ignore it safely
        if (error.response && error.response.status !== 409) {
          console.error('Failed to save strand:', error);
          alert('Error saving strand.');
          return;
        }
      }

      // 🧩 STEP 2: Submit grades
      await axios.post(`${API_BASE_URL}/api/scholastic/answers`, payload);

      alert('Grades submitted successfully!');
      setShowConfirmation(false);
      router.push('/PersonalityTest');
    } catch (error) {
      console.error('Failed to submit grades:', error);
      alert('Error submitting grades.');
    }
  };


  // 🌐 Loading
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-[#4B3621] text-2xl font-semibold">
        Loading...
      </div>
    );
  }

  // 🧩 Steps Modal (if no track yet)
  if (!track) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#FAF9F6] via-[#F2E9E4] to-[#EDE0D4] px-6">
        {showStepsModal ? (
          <div className="bg-[#FFFFFF]/80 backdrop-blur-2xl p-12 rounded-3xl shadow-2xl max-w-2xl text-center border border-[#D9C3A9]">
            <h2 className="text-4xl font-bold text-[#4B3621] mb-8">Steps to Complete</h2>
            <ul className="space-y-4 text-left text-xl text-[#5C4D40] font-medium">
              <li>🟤 Step 1: Scholastic Record</li>
              <li>🟤 Step 2: Personality Test</li>
              <li>🟤 Step 3: Knowledge Test</li>
            </ul>
            <button
              onClick={() => setShowStepsModal(false)}
              className="mt-10 px-8 py-3 bg-[#7B4F2C] text-white font-semibold rounded-xl hover:bg-[#5C3B27] transition-all duration-300"
            >
              Proceed →
            </button>
          </div>
        ) : (
          <div className="bg-[#FFFFFF]/80 backdrop-blur-2xl p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center border border-[#D9C3A9]">
            <h1 className="text-4xl font-bold text-[#4B3621] mb-8">Select Track</h1>
            <div className="flex flex-col gap-5">
              {['STEM', 'ABM', 'HUMSS'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTrack(t)}
                  className="px-8 py-4 text-2xl font-semibold bg-[#7B4F2C] text-white rounded-2xl shadow-md hover:scale-[1.03] hover:bg-[#5C3B27] transition-all duration-300"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 🧾 Main Scholastic Record UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F6] via-[#F2E9E4] to-[#EDE0D4] flex justify-center items-start px-4 py-12 relative">
      {/* Page Title */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-center text-[#4B3621] mt-6 md:mt-10 mb-6 md:mb-8 drop-shadow-sm">
          Scholastic Record
        </h2>
      </div>

      {/* ====== MAIN CARD (subjects area) ====== */}
<div className="w-full max-w-xl md:max-w-5xl bg-white/90 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-[#E6D3BA] relative mt-32">

  {/* ✅ HALF-TAB (A1) */}
  <div
    className="
      absolute -top-6 left-0
      w-1/2
      bg-[#7B4F2C] text-white
      rounded-t-2xl
      py-2
      text-center
      font-bold text-lg
      shadow
    "
  >
    Grade {gradeLevel} • {semester === 1 ? '1st Sem' : '2nd Sem'}
  </div>

        <div className="pl-20 md:pl-28"></div>

        {/* Subjects List (each card looks like a bubble and aligns visually with the indicator) */}
        <div className="space-y-4">
          {subjects.map((subject, index) => (
            <div
              key={index}
              className="flex justify-between items-center bg-[#FAF4E6] rounded-3xl p-5 shadow-md border border-[#E4D0B4] hover:shadow-lg hover:scale-[1.01] transition-all duration-300"
            >
              {/* left "bubble" accent that visually lines up with the indicator's connector */}
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-[#7B4F2C] rounded-full flex-shrink-0 shadow-inner" />
                <span className="text-2xl md:text-2xl lg:text-3xl font-semibold text-[#4B3621]">
                  {subject.subject || subject.subjects}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* ❌ Toggle Button */}
                <button
                  onClick={() => !locked && toggleNotAvailable(index)}
                  disabled={locked}
                  className={`
                    w-8 h-8 flex items-center justify-center
                    text-lg font-bold rounded-lg border
                    ${notAvailable[index]
                      ? "bg-red-600 text-white border-red-700"
                      : "bg-white text-gray-500 border-gray-400"}
                    ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {notAvailable[index] ? "X" : ""}
                </button>

                {/* Grade Input */}
                <div className="flex flex-col items-end">
                  <input
                    id={`grade-input-${index}`}
                    type="text"
                    value={grades[index]}
                    disabled={locked || notAvailable[index]}
                    onChange={(e) => handleGradeChange(index, e.target.value)}
                    className={`no-spinner w-28 md:w-32 text-center rounded-xl border-2 py-2 text-lg font-medium
                      ${errors[index] ? 'border-red-500' : 'border-[#CBB197]'}
                      ${notAvailable[index] ? "bg-gray-300 cursor-not-allowed" : "bg-white"}`}
                  />

                  {!notAvailable[index] && errors[index] && (
                    <p className="text-red-500 text-sm mt-1">{errors[index]}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons row - Home (left), Back, Next (right) */}
        <div className="flex items-center justify-between gap-6 mt-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              title="Home"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-transparent hover:bg-[#F2E9E4] border border-transparent hover:border-[#E6D3BA] transition"
            >
              <svg className="w-6 h-6 text-[#7B4F2C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l9-9 9 9M9 21V9h6v12" />
              </svg>
              <span className="hidden sm:inline text-[#4B3621] font-medium">Home</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            disabled={locked && semester === 1}
            className={`px-6 py-3 border rounded-xl font-semibold transition-all duration-300
              ${locked && semester === 1
                ? "border-gray-400 text-gray-400 cursor-not-allowed"
                : "border-[#7B4F2C] text-[#7B4F2C] hover:bg-[#7B4F2C] hover:text-white"
              }`}
          >
            ← Back
          </button>

            <button
              onClick={() => {
                if (locked && semester === 2) {
                  // if locked and this is the final step, proceed to next flow (e.g., personality)
                  router.push('/PersonalityTest');
                } else {
                  handleNext();
                }
              }}
              className="px-6 py-3 bg-[#7B4F2C] text-white font-semibold rounded-xl shadow-md hover:bg-[#5C3B27] transition-all duration-300"
            >
              {semester === 2 && gradeLevel === 12 ? (locked ? 'Proceed' : 'Submit') : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-[#FFFFFF]/90 backdrop-blur-2xl p-10 rounded-3xl shadow-2xl border border-[#E6D3BA] max-w-md text-center">
            <h2 className="text-3xl font-bold text-[#4B3621] mb-6">Confirm Submission</h2>
            <p className="text-lg text-[#5C4D40] mb-8">Are you sure you want to submit your grades?</p>
            <div className="flex justify-center gap-6">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-[#7B4F2C] text-[#7B4F2C] font-semibold rounded-xl hover:bg-[#7B4F2C] hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-[#7B4F2C] text-white font-semibold rounded-xl hover:bg-[#5C3B27] transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-[#FFFFFF]/90 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-red-300 max-w-md text-center">
            <h2 className="text-3xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-lg mb-6 text-[#5C4D40]">Please correct invalid grade inputs before proceeding.</p>
            <button
              onClick={() => setShowErrorPopup(false)}
              className="px-8 py-2 bg-[#7B4F2C] text-white font-semibold rounded-xl hover:bg-[#5C3B27] transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
