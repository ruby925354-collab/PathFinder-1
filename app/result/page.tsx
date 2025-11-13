'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheckCircle, FaHome, FaBrain, FaUser, FaListOl, FaTimes, FaDownload } from 'react-icons/fa';
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";


interface Program {
  label: string;
  details?: string;
  rank?: number;
}

interface TestResult {
  success?: boolean;
  personality_types?: string[];
  highest_knowledge_categories?: string[];
  highest_knowledge_values?: string[];
  final_top3?: Program[];
  program_count?: number;
  saved_to_user_personality_result?: boolean;
  source?: string;
}


const Result = () => {
  const [results, setResults] = useState<TestResult | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // For program modal
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [programDetails, setProgramDetails] = useState<string | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(false);

  const router = useRouter();

  // 🧩 Load user_id
  useEffect(() => {
    const storedId = localStorage.getItem('user_id');
    if (storedId) setUserId(storedId);
    else setError('No user logged in. Please sign in first.');
  }, []);

  // 🧠 Fetch results (only from backend test-results)
  useEffect(() => {
    const fetchResults = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/test-results/${userId}`);
        if (!res.ok) throw new Error(`Failed to load test results: ${res.status}`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error('Error fetching test results:', err);
        setError('Failed to load test results.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!showNotification && userId) fetchResults();
  }, [showNotification, userId]);

  const handleDownloadReport = async () => {
    if (!userId) {
      setError("No user ID found. Please log in first.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Fetch the .docx template
      const templateRes = await fetch("/templates/PathFinder.docx");
      if (!templateRes.ok) throw new Error("Template not found");

      const arrayBuffer = await templateRes.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      // Fetch report data from FastAPI
      const reportRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/${userId}/report-data`);
      if (!reportRes.ok) throw new Error("Failed to fetch report data");
      const reportData = await reportRes.json();

      // Render the document
      doc.render({
        ...reportData,
        DATE: new Date().toLocaleDateString(),
      });

      // Convert the filled document into a Blob
      const output = doc.getZip().generate({ type: "blob" });
      const docxFile = new File([output], `${reportData.full_name || "User"}_PathFinder_Report.docx`, {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Send to FastAPI for PDF conversion
      const formData = new FormData();
      formData.append("file", docxFile);

      const pdfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/convert-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!pdfRes.ok) {
        const errorText = await pdfRes.text();
        throw new Error(`PDF conversion failed: ${errorText}`);
      }

      const pdfBlob = await pdfRes.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Trigger browser download
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `${reportData.full_name || "User"}_PathFinder_Report.pdf`;
      link.click();

      // Clean up URL
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error generating PDF.");
    } finally {
      setIsLoading(false);
    }
  };


  // 🔍 Fetch program details when clicked
  const handleProgramClick = async (program: Program) => {
    setSelectedProgram(program);
    setLoadingProgram(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/program/${encodeURIComponent(program.label)}`);
      if (!res.ok) throw new Error(`Failed to load program details`);
      const data = await res.json();
      setProgramDetails(data.program_details || 'No description available.');
    } catch (err) {
      console.error('Error fetching program details:', err);
      setProgramDetails('Failed to load program details.');
    } finally {
      setLoadingProgram(false);
    }
  };

  // 🌀 Loading Overlay
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#3E2723]/80 backdrop-blur-sm text-[#EFEBE9]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#EFEBE9] mb-6"></div>
        <p className="text-2xl font-semibold tracking-wide">Generating your results...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen px-6 bg-[#EFEBE9]">
      {showNotification ? (
        // 🔸 Steps Overlay
        <div className="fixed inset-0 flex justify-center items-center bg-[#3E2723]/70 backdrop-blur-sm">
          <div className="bg-[#D7CCC8] text-[#3E2723] pt-16 pb-14 px-12 rounded-2xl shadow-2xl w-full max-w-xl">
            <h2 className="text-3xl font-bold mb-10 text-center">Steps Completed</h2>
            <ul className="list-decimal pl-8 mb-10 text-lg space-y-4">
              <li className="flex items-center gap-3">
                <FaCheckCircle className="text-[#5D4037]" size={22} /> Scholastic Record
              </li>
              <li className="flex items-center gap-3">
                <FaCheckCircle className="text-[#5D4037]" size={22} /> Personality Test
              </li>
              <li className="flex items-center gap-3">
                <FaCheckCircle className="text-[#5D4037]" size={22} /> Knowledge Test
              </li>
            </ul>
            <div className="flex justify-end">
              <button
                onClick={() => setShowNotification(false)}
                className="bg-[#5D4037] text-[#EFEBE9] text-lg px-6 py-2 rounded-lg hover:bg-[#4E342E] transition-all duration-200"
              >
                See Results
              </button>
            </div>
          </div>
        </div>
      ) : error ? (
        <p className="text-red-700 font-medium">{error}</p>
      ) : !results ? (
        <p className="text-[#3E2723]">Loading results...</p>
      ) : (
        <>
          {/* 🔸 Results Card */}
          <div className="bg-gradient-to-b from-[#EDE0D4] to-[#D7CCC8] text-[#3E2723] shadow-2xl rounded-3xl p-12 w-full max-w-4xl border border-[#BCAAA4] transition-all duration-500 hover:shadow-[0_0_30px_rgba(60,30,10,0.25)]">
            <h1 className="text-5xl font-extrabold text-center mb-12 tracking-wide drop-shadow-sm">
               Your Assessment Results
            </h1>

            {/* Personality Section */}
            <section className="mb-10">
              <div className="flex items-center gap-4 mb-4 border-b border-[#BCAAA4] pb-2">
                <FaUser className="text-[#4E342E]" size={32} />
                <h2 className="text-3xl font-bold">Personality Type</h2>
              </div>
              <p className="text-2xl ml-10 leading-relaxed">
                Your dominant personality type is{' '}
                <span className="font-extrabold text-[#3E2723] underline decoration-[#6D4C41]/60 decoration-4">
                  {results.personality_types?.join(', ') || 'N/A'}
                </span>.
              </p>
            </section>

            {/* Knowledge Section */}
            <section className="mb-10">
              <div className="flex items-center gap-4 mb-4 border-b border-[#BCAAA4] pb-2">
                <FaBrain className="text-[#4E342E]" size={32} />
                <h2 className="text-3xl font-bold">Knowledge Strength</h2>
              </div>

              <p className="text-2xl ml-10 leading-relaxed">
                You scored highest in{" "}
                <span className="font-semibold text-[#4E342E]">
                  {results.highest_knowledge_categories?.join(", ") || "N/A"}
                </span>
                {" "}with score(s){" "}
                <span className="font-extrabold text-[#3E2723]">
                  {results.highest_knowledge_values?.join(", ") || "N/A"}
                </span>.
              </p>
            </section>

            {/* Recommended Programs */}
            <section className="mb-10">
              <div className="flex items-center gap-4 mb-4 border-b border-[#BCAAA4] pb-2">
                <FaListOl className="text-[#4E342E]" size={32} />
                <h2 className="text-3xl font-bold">Top 3 Recommended Programs</h2>
              </div>

              {results.final_top3 && results.final_top3.length > 0 ? (
                <ol className="ml-8 space-y-6 text-2xl">
                  {results.final_top3.map((prog, index) => (
                    <li
                      key={index}
                      className="bg-[#EFEBE9] p-5 rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.02] cursor-pointer transition-all border border-[#BCAAA4]"
                      onClick={() => handleProgramClick(prog)}
                    >
                      <div className="font-bold text-3xl text-[#3E2723]">
                        {prog.rank ?? index + 1}. {prog.label}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="ml-6 text-xl text-gray-700 italic">
                  No recommendations available.
                </p>
              )}
            </section>

            {/* Home + Download Buttons */}
            <div className="flex justify-center mt-12 gap-6">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-3 bg-[#3E2723] text-[#EFEBE9] px-10 py-4 rounded-2xl text-2xl font-semibold hover:bg-[#4E342E] hover:scale-[1.03] transition-all duration-300 shadow-lg"
              >
                <FaHome size={24} />
                Return Home
              </button>

              <button
                onClick={handleDownloadReport}
                disabled={isLoading}
                className={`flex items-center gap-3 px-10 py-4 rounded-2xl text-2xl font-semibold shadow-lg transition-all duration-300 ${
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#6D4C41] text-[#EFEBE9] hover:bg-[#5D4037] hover:scale-[1.03]"
                }`}
              >
                <FaDownload size={24} />
                {isLoading ? "Generating..." : "Download Report"}
              </button>
            </div>
          </div>

          {/* 🔹 Program Description Modal */}
          {selectedProgram && (
            <div className="fixed inset-0 flex justify-center items-center bg-black/50 backdrop-blur-sm z-50">
              <div className="bg-[#EFEBE9] text-[#3E2723] p-10 rounded-2xl shadow-2xl w-full max-w-2xl relative animate-fadeIn">
                <button
                  onClick={() => {
                    setSelectedProgram(null);
                    setProgramDetails(null);
                  }}
                  className="absolute top-4 right-4 text-[#3E2723] hover:text-red-700 transition"
                >
                  <FaTimes size={22} />
                </button>
                <h2 className="text-4xl font-extrabold mb-6">
                  {selectedProgram.label}
                </h2>
                {loadingProgram ? (
                  <p className="text-xl italic text-[#6D4C41]">
                    Loading description...
                  </p>
                ) : (
                  <p className="text-xl leading-relaxed text-[#4E342E]">
                    {programDetails || 'No description available.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Result;
