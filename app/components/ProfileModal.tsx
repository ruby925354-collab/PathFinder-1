'use client';
import React, { useState, useEffect } from 'react';
import ChangePasswordModal from './ChangePasswordModal';
import LogoutConfirmationModal from './LogoutConfirmationModal';
import {
  FaTimes,
  FaChevronDown,
  FaUserCircle,
  FaUser,
  FaCog,
  FaQuestionCircle,
  FaSignOutAlt,
  FaFileAlt,
  FaPencilAlt,
  FaStar,
} from 'react-icons/fa';
import { useAuth } from '@/app/context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: string;
}

interface Program {
  program_id: number;
  program_name: string;
  program_details?: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  initialSection = 'Profile',
}) => {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [user, setUser] = useState<any>(null);
  const [recommendedPrograms, setRecommendedPrograms] = useState<Program[]>([]);
  const [personalityType, setPersonalityType] = useState<string[]>([]);
  const [knowledgeScore, setKnowledgeScore] = useState<
    { subject: string; score: number }[]
  >([]);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isLLMOpen, setIsLLMOpen] = useState(false);
  const [selectedLLM, setSelectedLLM] = useState("gpt-5.1"); // default backend key
  const AVAILABLE_LLMS = [
    { name: "MiniChat 2-3B", key: "minichat" }
    // { name: "Qwen 2-7B", key: "qwen" },
    // { name: "GPT-5.1", key: "gpt-5.1" },
    // { name: "Claude 3.7", key: "claude-3.7" },
    // { name: "Gemini 2.0 Flash", key: "gemini-2.0" },
  ];


  // Feedback states
  const [rating, setRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState<{ rating: number; comments: string } | null>(null);

  
  const [faqs] = useState([
    {
      question: 'What is PathFinder?',
      answer:
        'PathFinder recommends three suitable college programs for Senior High School (SHS) graduates based on their personality, knowledge, and scholastic records.',
    },
    {
      question: 'Who can use PathFinder?',
      answer: 'PathFinder is for SHS graduates from the ABM, STEM, and HUMSS strands.',
    },
  ]);
    useEffect(() => {
      const saved = localStorage.getItem("darkMode");
      if (saved) setIsDarkMode(saved === "true");
    }, []);

    useEffect(() => {
      localStorage.setItem("darkMode", isDarkMode.toString());
    }, [isDarkMode]);

    useEffect(() => {
      const stored = localStorage.getItem("preferredLLM");
      if (stored) setSelectedLLM(stored);
    }, []);

  useEffect(() => {
    localStorage.setItem("preferredLLM", selectedLLM);
  }, [selectedLLM]);


  // 🟤 Fetch Profile, Result, and Feedback
    useEffect(() => {
    const fetchProfileData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // ✅ Handle expired or invalid token
        if (res.status === 401) {
          console.warn('⚠️ Token expired or invalid. Logging out...');
          logout();
          alert('Your session has expired. Please log in again.');
          onClose(); // Close ProfileModal
          return;
        }

        if (!res.ok) {
          console.error('Failed to fetch profile:', res.statusText);
          return;
        }

        const data = await res.json();
        setUser(data.user);
        setRecommendedPrograms(data.recommended_programs || []);

        // Personality list (array)
        setPersonalityType(data.personalities || []);

        // Strong Knowledge Area (top 3 array)
        if (Array.isArray(data.strong_knowledge_area)) {
          setKnowledgeScore(data.strong_knowledge_area);
        } else {
          setKnowledgeScore([]);
        }

        // ✅ Fetch feedback if exists
        if (data.user?.user_id) {
          const feedbackRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/feedback/${data.user.user_id}`
          );
          if (feedbackRes.ok) {
            const feedbackData = await feedbackRes.json();
            if (feedbackData?.has_feedback) {
              setSubmittedFeedback({
                rating: feedbackData.feedback,
                comments: feedbackData.comments || '',
              });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        // Optional: show a friendly alert if server is unreachable
        alert('Unable to connect to the server. Please try again later.');
      }
    };

    if (isOpen) fetchProfileData();
  }, [isOpen]);

  // 🔸 Toggle FAQ
  const toggleQuestion = (index: number) => {
    setActiveQuestion(activeQuestion === index ? null : index);
  };

  // 🔸 Fetch Program Description
  const fetchProgramDescription = async (programName: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/program-description?program_name=${encodeURIComponent(programName)}`
      );
      const data = await res.json();
      setSelectedProgram({ program_id: 0, program_name: programName, program_details: data.description });
    } catch (err) {
      console.error('Failed to fetch program description:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 backdrop-blur-sm">
        <div className="bg-gradient-to-b from-brown-1 to-gray-200 rounded-3xl shadow-2xl w-full h-full md:w-[75vw] md:h-[90vh] relative overflow-hidden flex flex-col md:flex-row border border-brown-3">
          {/* Sidebar */}
          <div className="bg-brown-6 dark:bg-brown-800 text-white flex flex-col md:w-1/3 w-full rounded-t-3xl md:rounded-l-3xl shadow-2xl overflow-hidden">

            {/* Profile Header */}
            <div className="flex flex-col md:flex-col items-center justify-center text-center bg-brown-6 py-6 md:py-10 px-4">
              <FaUserCircle className="text-[5rem] md:text-[8rem] text-white drop-shadow-md mb-2" />
              <h2 className="text-2xl md:text-3xl font-semibold tracking-wide">
                {user?.username ? `Hi, ${user.username}` : 'Loading...'}
              </h2>
              <p className="text-xs md:text-sm text-white/80">{user?.email || ''}</p>
            </div>

            {/* Navigation */}
            <div className="flex md:flex-col justify-center md:justify-start items-center md:items-stretch gap-2 md:gap-3 px-3 py-3 md:p-6 bg-brown-5/20 backdrop-blur-sm overflow-x-auto md:overflow-visible">
              {['Profile', 'Result', 'Settings', 'Feedback', 'Help'].map((section) => {
                const icons: any = {
                  Profile: <FaUser className="text-lg md:text-2xl" />,
                  Result: <FaFileAlt className="text-lg md:text-2xl" />,
                  Settings: <FaCog className="text-lg md:text-2xl" />,
                  Feedback: <FaPencilAlt className="text-lg md:text-2xl" />,
                  Help: <FaQuestionCircle className="text-lg md:text-2xl" />,
                };
                return (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl font-medium text-sm md:text-lg whitespace-nowrap transition-all duration-200 ${
                      activeSection === section
                        ? 'bg-white text-brown-6 shadow-md'
                        : 'hover:bg-brown-5 hover:text-white'
                    }`}
                  >
                    {icons[section]} {section}
                  </button>
                );
              })}
            </div>

            {/* Logout Button */}
            <div className="mt-auto px-4 py-4 bg-brown-5/10 backdrop-blur-sm border-t border-brown-4/40">
              <button
                onClick={() => setIsLogoutConfirmationOpen(true)}
                className="flex items-center justify-center gap-2 bg-brown-5 hover:bg-brown-4 text-white py-3 rounded-xl w-full font-semibold text-sm md:text-base transition-all duration-200"
              >
                <FaSignOutAlt className="text-base md:text-lg" /> Logout
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 relative overflow-y-auto bg-white dark:bg-gray-800 p-4 md:p-8 rounded-b-3xl md:rounded-r-3xl">
            <button className="absolute top-4 right-4 text-brown-6 hover:text-brown-4 transition-all" onClick={onClose}>
              <FaTimes size={24} />
            </button>

            {/* Profile Section */}
            {activeSection === 'Profile' && (
              <div className="flex flex-col items-center px-4">
                {/* Title */}
                <h2 className="text-3xl md:text-5xl font-bold text-center text-brown-6 mt-6 md:mt-10 mb-6 md:mb-8">
                  Profile
                </h2>

                {/* Wrapper for clean width on small screens */}
                <div className="w-full max-w-xl md:max-w-3xl text-sm md:text-base">
                  <div className="bg-[#FDF6EF] p-6 md:p-10 rounded-3xl shadow-lg border border-[#CBB197]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-10 md:gap-y-8">
                      {/* Email */}
                      <div className="flex flex-col col-span-2">
                        <label className="text-[#7B5A3C] font-semibold text-base md:text-lg mb-2">
                          Email Address
                        </label>
                        <input
                          value={user?.email || ''}
                          disabled
                          className="p-3 md:p-4 rounded-xl border border-[#CBB197] bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-medium shadow-sm focus:ring-2 focus:ring-[#B08968] transition-all"
                        />
                      </div>

                      {/* Username */}
                      <div className="flex flex-col col-span-2">
                        <label className="text-[#7B5A3C] font-semibold text-base md:text-lg mb-2">
                          Username
                        </label>
                        <input
                          value={user?.username || ''}
                          disabled
                          className="p-3 md:p-4 rounded-xl border border-[#CBB197] bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-medium shadow-sm focus:ring-2 focus:ring-[#B08968] transition-all"
                        />
                      </div>

                      {/* First Name */}
                      <div className="flex flex-col">
                        <label className="text-[#7B5A3C] font-semibold text-base md:text-lg mb-2">
                          First Name
                        </label>
                        <input
                          value={user?.first_name || ''}
                          disabled
                         className="p-3 md:p-4 rounded-xl border border-[#CBB197] bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-medium shadow-sm focus:ring-2 focus:ring-[#B08968] transition-all"
                        />
                      </div>

                      {/* Middle Name */}
                      <div className="flex flex-col">
                        <label className="text-[#7B5A3C] font-semibold text-base md:text-lg mb-2">
                          Middle Name
                        </label>
                        <input
                          value={user?.middle_name || ''}
                          disabled
                        className="p-3 md:p-4 rounded-xl border border-[#CBB197] bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-medium shadow-sm focus:ring-2 focus:ring-[#B08968] transition-all"
                        />
                      </div>

                      {/* Last Name */}
                      <div className="flex flex-col col-span-2">
                        <label className="text-[#7B5A3C] font-semibold text-base md:text-lg mb-2">
                          Last Name
                        </label>
                        <input
                          value={user?.last_name || ''}
                          disabled
                         className="p-3 md:p-4 rounded-xl border border-[#CBB197] bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-medium shadow-sm focus:ring-2 focus:ring-[#B08968] transition-all"
                        />
                      </div>
                    </div>

                    {/* Divider line */}
                    <div className="border-t border-[#CBB197] mt-8 md:mt-10 mb-4 md:mb-6"></div>

                    {/* Footer */}
                    <div className="text-center">
                      <p className="text-lg md:text-xl font-semibold text-[#7B5A3C]">
                        {user?.first_name && user?.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user?.username || 'User'}
                      </p>
                      <p className="text-gray-600">{user?.email || ''}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Result Section */}
            {activeSection === 'Result' && (
              <div className="flex flex-col items-center mt-14 px-4">
                {!selectedProgram ? (
                  <>
                    {/* Header */}
                    <h2 className="text-5xl font-extrabold text-[#6B4226] mb-14 tracking-wide drop-shadow-sm">
                      Your Results
                    </h2>

                    {/* Recommended Programs */}
                    <div className="flex flex-col items-center w-full max-w-2xl gap-6 mb-20">
                      {recommendedPrograms.length > 0 ? (
                        recommendedPrograms.map((p) => (
                          <div
                            key={p.program_id}
                            onClick={() => fetchProgramDescription(p.program_name)}
                            className="cursor-pointer w-full bg-gradient-to-br from-[#FDF6EF] to-[#FAEEE3] hover:from-[#FAEEE3] hover:to-[#FDF6EF] border border-[#D3BDA3] rounded-3xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-300 text-center py-6"
                          >
                            <h3 className="text-3xl font-bold text-[#5C3D2E] tracking-tight">
                              {p.program_name}
                            </h3>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-lg italic">
                          No recommended programs found.
                        </p>
                      )}
                    </div>

                    {/* Personality Type & Knowledge */}
                    <div className="flex flex-col md:flex-row justify-center items-stretch gap-10 w-full max-w-4xl">
                      
                      {/* Personality Card */}
                      <div className="flex flex-col flex-1 items-center bg-white/70 dark:bg-gray-700/70 backdrop-blur-md p-8 rounded-3xl border border-[#E1C9A7] shadow-lg hover:shadow-xl transition-all duration-300">
                        <p className="text-lg font-medium text-[#6B4226] mb-4 uppercase tracking-wide">
                          Personality Type
                        </p>

                        <div className="flex flex-col items-center gap-3">
                          {Array.isArray(personalityType) && personalityType.length > 0 ? (
                            personalityType.map((type, idx) => (
                              <div
                                key={idx}
                                className="bg-[#E7D4C0] px-8 py-3 rounded-full text-[#5C3D2E] 
                                          text-xl font-bold shadow-inner border border-[#CBB197]"
                              >
                                {type}
                              </div>
                            ))
                          ) : (
                            <div className="text-xl text-[#5C3D2E]">N/A</div>
                          )}
                        </div>
                      </div>

                      {/* Strong Knowledge Card */}
                      <div className="flex flex-col flex-1 items-center bg-white/70 dark:bg-gray-700/70 backdrop-blur-md p-8 rounded-3xl border border-[#E1C9A7] shadow-lg hover:shadow-xl transition-all duration-300">
                        <p className="text-lg font-medium text-[#6B4226] mb-4 uppercase tracking-wide">
                          Strong Knowledge Area
                        </p>

                        <div className="flex flex-col items-center gap-3">
                          {Array.isArray(knowledgeScore) && knowledgeScore.length > 0 ? (
                            knowledgeScore.map((k, idx) => (
                              <div
                                key={idx}
                                className="bg-[#E7D4C0] px-8 py-3 rounded-full text-[#5C3D2E] 
                                          text-xl font-bold shadow-inner border border-[#CBB197]"
                              >
                                {k.subject} ({k.score}%)
                              </div>
                            ))
                          ) : (
                            <div className="text-xl text-[#5C3D2E]">N/A</div>
                          )}
                        </div>
                      </div>

                    </div>
                  </>
                ) : (
                  // Program Details View
                  <div className="flex flex-col items-center mt-10 w-full max-w-2xl">
                    <h2 className="text-4xl font-extrabold text-center text-[#6B4226] mb-8">
                      {selectedProgram.program_name}
                    </h2>
                    <div className="bg-gradient-to-br from-[#FFF9ED] to-[#FAF4E6] text-[#4A3B2C] text-lg leading-relaxed rounded-3xl shadow-lg border border-[#D3BDA3] p-10 w-full whitespace-pre-line">
                      {selectedProgram.program_details || 'No description available.'}
                    </div>

                    <button
                      onClick={() => setSelectedProgram(null)}
                      className="mt-10 px-8 py-3 bg-[#6B4226] hover:bg-[#52311D] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      ← Back to Results
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Feedback Section */}
            {activeSection === 'Feedback' && (
              <div>
                <h2 className="text-5xl font-bold text-center text-brown-6 mt-10 mb-8">Feedback</h2>
                <div className="flex flex-col items-center gap-6">
                  {submittedFeedback ? (
                    <div className="bg-brown-1 p-6 rounded-3xl shadow-xl w-full max-w-lg text-center">
                      <h3 className="text-3xl font-semibold mb-4 text-brown-8">Your Feedback</h3>
                      <div className="flex justify-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FaStar
                            key={star}
                            className={`text-3xl ${star <= submittedFeedback.rating ? 'text-brown-6' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-800 dark:text-gray-100 italic">
                        “{submittedFeedback.comments || 'No comment provided.'}”
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={`text-4xl ${rating && rating >= star ? 'text-brown-6' : 'text-gray-400'}`}
                          >
                            <FaStar />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="w-full max-w-lg h-40 p-4 border rounded-2xl shadow-xl bg-white text-gray-900"
                        placeholder="Write your feedback here..."
                      />
                      <button
                        onClick={async () => {
                          if (!rating) return alert('Please select a rating.');
                          const userId = user?.user_id;
                          if (!userId) return alert('User not found.');

                          try {
                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/feedback`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ user_id: userId, feedback: rating, comments }),
                            });
                            if (!res.ok) throw new Error('Failed to submit feedback');
                            setSubmittedFeedback({ rating, comments });
                            alert('Thank you for your feedback!');
                          } catch (err) {
                            console.error(err);
                            alert('Error submitting feedback.');
                          }
                        }}
                        className="px-6 py-3 bg-brown-6 dark:bg-brown-800 text-white rounded-xl hover:bg-brown-7 transition-all"
                      >
                        Submit Feedback
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Settings Section */}
            {activeSection === 'Settings' && (
              <div>
                <h2 className="text-5xl font-bold text-center text-brown-6 mt-10 mb-8">Settings</h2>
                <div className="flex flex-col items-center gap-5">
                  <button
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="w-[500px] h-20 bg-brown-1 hover:bg-brown-2 shadow-md text-gray-900 font-semibold rounded-2xl flex justify-center items-center transition-transform hover:scale-105"
                  >
                    Change Password
                  </button>
                  <label className="w-[500px] h-20 bg-brown-1 shadow-md text-gray-900 font-semibold rounded-2xl flex justify-between items-center px-6 hover:scale-105 transition-transform">
                    Dark Mode
                    <input type="checkbox" checked={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)} />
                  </label>
                    <div className="w-[500px] bg-brown-1 shadow-md text-gray-900 font-semibold rounded-2xl px-6 py-4 hover:scale-105 transition-transform">
                      <button
                        onClick={() => setIsLLMOpen(!isLLMOpen)}
                        className="w-full flex justify-between items-center text-lg"
                      >
                        Large Language Model
                        <FaChevronDown
                          className={`transition-transform ${isLLMOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isLLMOpen && (
                        <div className="mt-3 bg-white rounded-xl border border-brown-3 shadow-inner p-3 flex flex-col gap-3">

                          {AVAILABLE_LLMS.map((model) => (
                            <button
                              key={model.key}
                              onClick={() => {
                                setSelectedLLM(model.key); // store backend key
                                setIsLLMOpen(false);
                              }}
                              className={`px-4 py-2 rounded-xl text-left transition-all ${
                                selectedLLM === model.key
                                  ? "bg-brown-2 text-brown-8 font-bold"
                                  : "hover:bg-brown-1"
                              }`}
                            >
                              {model.name} {/* display name */}
                            </button>
                          ))}

                        </div>
                      )}

                      {/* Selected model display */}
                      <p className="mt-2 text-brown-8 text-sm">
                        Selected Model: <span className="font-bold">
                          {AVAILABLE_LLMS.find(m => m.key === selectedLLM)?.name || selectedLLM}
                        </span>
                      </p>
                    </div>
                </div>
              </div>
            )}

            {/* Help Section */}
            {activeSection === 'Help' && (
              <div>
                <h2 className="text-5xl font-bold text-center text-brown-6 mt-10 mb-8">Help & FAQs</h2>
                <div className="flex flex-col items-center gap-4">
                  {faqs.map((faq, i) => (
                    <div key={i} className="w-full max-w-xl">
                      <button
                        onClick={() => toggleQuestion(i)}
                        className="w-full flex justify-between items-center bg-brown-1 text-gray-900 font-semibold text-lg p-4 rounded-2xl shadow-md hover:scale-105 transition-all"
                      >
                        {faq.question}
                        <FaChevronDown
                          className={`transition-transform ${activeQuestion === i ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {activeQuestion === i && (
                        <div className="mt-2 bg-white border-l-4 border-brown-6 p-4 rounded-2xl text-gray-700 shadow-inner">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modals */}
            <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
            <LogoutConfirmationModal
              isOpen={isLogoutConfirmationOpen}
              onClose={() => setIsLogoutConfirmationOpen(false)}
              onConfirm={() => {
                logout();
                setIsLogoutConfirmationOpen(false);
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
