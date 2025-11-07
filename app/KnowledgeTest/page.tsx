'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import Image from "next/image"; 
import axios from 'axios';

interface KnowledgeQuestion {
  id: number;
  question: string;
  choices: string[];
  category?: string;
  timer?: number; // seconds per question
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const KnowledgeTest = () => {
  const router = useRouter();
  const [questions, setQuestions] = useState<KnowledgeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(true);
  const [showPreStart, setShowPreStart] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0); // seconds for current question
  const [finished, setFinished] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [gifPosition, setGifPosition] = useState({ top: 0, left: 0 });

useEffect(() => {
  if (boxRef.current) {
    const rect = boxRef.current.getBoundingClientRect();
    // Adjust offsets slightly if you want the cat to “peek”
    setGifPosition({
      top: rect.top - 30, // slightly above the box
      left: rect.left - 30, // slightly to the left
    });
  }
}, [questions, currentQuestionIndex]);


  useEffect(() => {
    setUserId(localStorage.getItem('user_id'));
  }, []);
    // 🚫 Restrict access if not logged in or personality test not completed
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const id = localStorage.getItem('user_id');

    if (!token || !id) {
      alert('You must be logged in to access the Knowledge Test.');
      localStorage.clear();
      router.replace('/');
      return;
    }

    const checkPersonalityCompletion = async () => {
      try {
        const res = await axios.get(`${API}/api/personality/questions/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // 🧩 Check if there are any unanswered personality questions
        const unanswered = res.data.some((q: any) => !q.answered);
        if (unanswered) {
          alert('Please complete your Personality Test before taking the Knowledge Test.');
          router.replace('/PersonalityTest');
        }
      } catch (error) {
        console.error('Error verifying personality completion:', error);
        alert('Unable to verify your personality test status. Please log in again.');
        localStorage.clear();
        router.replace('/');
      }
    };

    checkPersonalityCompletion();
  }, [router]);


  // fetch questions from backend (unanswered selection logic handled server-side)
  const fetchQuestions = async () => {
    try {
      if (!userId) throw new Error('User not logged in');
      const response = await axios.get(`${API}/api/knowledge/questions/${userId}`);
      if (response.data.completed) {
        setFinished(true);
        return;
      }
      const q: any[] = response.data.questions || [];
      // Map backend shape to KnowledgeQuestion shape if needed (backend returns id/choices/timer)
      const mapped = q.map((item: any) => ({
        id: item.id ?? item.knowledge_id,
        question: item.question,
        choices: item.choices ?? item.options ?? [],
        category: item.category,
        timer: item.timer ?? 60,
      })) as KnowledgeQuestion[];

      setQuestions(mapped);
      setAnswers(Array(mapped.length).fill(null));
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);

      // set timer for first question
      const firstTimer = mapped[0]?.timer ?? 60;
      setTimeLeft(Number(firstTimer) || 60);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      setErrorMsg('Failed to load questions. Please try again.');
      setQuestions([]);
      setAnswers([]);
    }
  };

  // start per-question countdown
  useEffect(() => {
    if (finished) return;
    // clear old
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // only start if there's a current question with timeLeft > 0
    if (questions.length === 0) return;

    // ensure timeLeft is set (for newly selected question)
    if (timeLeft <= 0) {
      // If somehow 0 -> trigger auto-skip flow immediately
      handleTimeoutAutoSave();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // will reach zero; clear interval here and trigger timeout handling
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // We return 0 and then separately call the timeout handler (use setTimeout to avoid state race)
          setTimeout(() => handleTimeoutAutoSave(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, questions, timeLeft, finished]);

  // ensure selectedAnswer follows stored answers when indexing changes
// ensure selectedAnswer follows stored answers when indexing changes
useEffect(() => {
  setSelectedAnswer(answers[currentQuestionIndex] ?? null);
}, [currentQuestionIndex, answers]);

// ⌨️ Trigger "Next" when pressing Enter
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === 'Enter' &&
        !showNotification &&
        !showPreStart &&
        !showConfirmation &&
        !finished &&
        selectedAnswer &&
        !saving
      ) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showNotification, showPreStart, showConfirmation, finished, selectedAnswer, saving]);

  const handleAnswerSelection = (answer: string) => setSelectedAnswer(answer);

  // Save single answer helper
  const saveAnswer = async (knowledgeId: number, answerToSave: string | null) => {
    if (!userId) throw new Error('User not logged in');
    try {
      await axios.post(`${API}/api/knowledge/save-answer`, {
        knowledge_id: knowledgeId,
        user_id: parseInt(userId),
        answer: answerToSave ?? '',
      });
    } catch (err) {
      console.error('Failed to save answer:', err);
      // don't rethrow; we want test to continue even if saving fails
    }
  };

  const handleNext = async () => {
    if (!selectedAnswer || saving) return;
    setSaving(true);
    try {
      if (!userId) throw new Error('User not logged in');
      const q = questions[currentQuestionIndex];
      await saveAnswer(q.id, selectedAnswer);

      const updated = [...answers];
      updated[currentQuestionIndex] = selectedAnswer;
      setAnswers(updated);
      setToast('Answer saved!');
      setTimeout(() => setToast(null), 2000);

      // move to next question (or finish)
      if (currentQuestionIndex < questions.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        setSelectedAnswer(updated[nextIndex] ?? null);
        // set new timer from that question's timer (default 60)
        const nextTimer = questions[nextIndex]?.timer ?? 60;
        setTimeLeft(Number(nextTimer) || 60);
      } else {
        // finished local list -> ask confirm
        setShowConfirmation(true);
      }
    } catch (err) {
      console.error('Failed to save answer:', err);
      setErrorMsg('Failed to save answer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Called when a question's timer reaches 0
  const handleTimeoutAutoSave = async () => {
    try {
      // mark current as unanswered (empty answer -> saved as incorrect)
      const q = questions[currentQuestionIndex];
      if (q) {
        await saveAnswer(q.id, '');
        const updated = [...answers];
        updated[currentQuestionIndex] = null; // explicit null for unanswered
        setAnswers(updated);
      }

      // move to next question or finish
      if (currentQuestionIndex < questions.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        setSelectedAnswer(answers[nextIndex] ?? null);
        const nextTimer = questions[nextIndex]?.timer ?? 60;
        setTimeLeft(Number(nextTimer) || 60);
      } else {
        // finished
        setShowConfirmation(true);
      }
    } catch (err) {
      console.error('Error in timeout auto-save:', err);
      // still advance to next to avoid locking user
      if (currentQuestionIndex < questions.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        setSelectedAnswer(answers[nextIndex] ?? null);
        const nextTimer = questions[nextIndex]?.timer ?? 60;
        setTimeLeft(Number(nextTimer) || 60);
      } else {
        setShowConfirmation(true);
      }
    }
  };

  // finish test -> compute & show "See Result" behavior
  const handleConfirmFinish = async () => {
    setShowConfirmation(false);
    setLoading(true);
    try {
      if (!userId) throw new Error('User not logged in');

      // ensure we request results endpoint (which also returns status)
      await axios.get(`${API}/api/knowledge-result/${userId}`);
      setFinished(true);

      // compute normalized scores server-side
      try {
        const computeRes = await axios.post(`${API}/api/compute-user-scholastic-knowledge/${userId}`);
        console.log('Computation complete:', computeRes.data);
      } catch (computeError) {
        console.error('Failed to compute normalized scores:', computeError);
      }

      setToast('Test completed successfully!');
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error('Failed to finish test:', err);
      setErrorMsg('Failed to finish test.');
    } finally {
      setLoading(false);
    }
  };

  // format seconds to mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#FAF7F2] to-[#EDE3D7] text-[#3B2F2F] relative overflow-hidden px-4 py-6 md:px-10 md:py-12">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-5 py-2 rounded-lg shadow-lg animate-fadeIn">
          {toast}
        </div>
      )}

      {/* Error or Loading */}
      {loading && <p className="text-gray-500 mb-4">Submitting your answers...</p>}
      {errorMsg && <p className="text-red-600 mb-4">{errorMsg}</p>}

      {/* Modals */}
      {showNotification && (
        <div className="fixed inset-0 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-white/90 border border-[#E6D3BA] rounded-2xl p-10 w-full max-w-lg shadow-2xl text-center animate-fadeIn">
            <h2 className="text-3xl font-extrabold mb-8 text-[#5C4033]">Steps to Complete</h2>
            <ul className="text-left text-lg mb-8 space-y-3 text-[#3B2F2F]">
              <li className="flex items-center gap-3"><FaCheckCircle className="text-green-600" /> Step 1: Scholastic Record</li>
              <li className="flex items-center gap-3"><FaCheckCircle className="text-green-600" /> Step 2: Personality Test</li>
              <li className="flex items-center gap-3 font-semibold text-[#5C4033]">Step 3: Knowledge Test</li>
            </ul>
            <button
              onClick={() => {
                setShowNotification(false);
                setShowPreStart(true);
              }}
              className="px-6 py-2 bg-[#7B4F2C] text-white font-semibold rounded-lg hover:bg-[#684029] transition-all"
            >
              Start
            </button>
          </div>
        </div>
      )}

      {showPreStart && (
        <div className="fixed inset-0 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-white/95 border border-[#E6D3BA] p-10 rounded-2xl shadow-2xl w-full max-w-md text-center animate-fadeIn">
            <h2 className="text-2xl font-bold mb-4 text-[#5C4033]">Before You Proceed</h2>
            <p className="text-gray-600 mb-6">
              Make sure you have a <span className="font-semibold text-black">stable internet connection</span>.<br /> NOTE: Each Question have Specific TIMER.
            </p>
            <button
              onClick={async () => {
                setShowPreStart(false);
                try {
                  if (!userId) throw new Error('User not logged in');
                  await axios.post(`${API}/api/knowledge/start/${userId}`);
                } catch (err) {
                  console.warn('start session failed (ok if dev):', err);
                }
                await fetchQuestions();
              }}
              className="px-6 py-2 bg-[#7B4F2C] text-white rounded-lg hover:bg-[#684029] transition"
            >
              Proceed
            </button>
          </div>
        </div>
      )}

      {/* Finished View */}
      {finished ? (
        <div className="bg-white/95 border border-[#E6D3BA] p-10 rounded-2xl shadow-xl w-full max-w-lg text-center relative">
          {/* 🔄 Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-50">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#7B4F2C] border-opacity-80 mb-4"></div>
              <p className="text-[#5C4033] font-semibold text-lg">
                Generating your personalized recommendations...
              </p>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-6 text-[#5C4033]">
            Knowledge Test Completed!
          </h2>
          <p className="mb-8 text-gray-700">
            Your answers have been submitted and processed successfully.
          </p>
          <button
            onClick={async () => {
              try {
                if (!userId) throw new Error('User not logged in');
                setLoading(true);

                // Step 1️⃣: Compute normalized scholastic scores
                await axios.post(`${API}/api/compute-user-scholastic-knowledge/${userId}`);

                // Step 2️⃣: Trigger prediction (don’t await full response)
                try {
                  await axios.post(`${API}/predict/${userId}`);
                  console.log('Prediction triggered successfully');
                } catch (predictErr) {
                  console.warn('Prediction request failed (will still continue):', predictErr);
                }

                // Step 3️⃣: Wait briefly then go to results
                setTimeout(() => {
                  setLoading(false);
                  router.push('/result');
                }, 3000); // adjust delay if your prediction takes longer
              } catch (err) {
                console.error('Failed to compute results:', err);
                setErrorMsg('Failed to compute results. Please try again.');
                setLoading(false);
              }
            }}
            className="bg-[#7B4F2C] text-white px-6 py-3 rounded-lg hover:bg-[#684029] transition relative z-10"
          >
            Proceed
          </button>
        </div>
      ) : (
        // Active Question
        questions.length > 0 && (
          <form onSubmit={(e) => e.preventDefault()} className="w-full max-w-screen-md animate-fadeIn">
            <div className="flex justify-center items-center gap-3 md:gap-4 mb-6 md:mb-10">
                {/* 🧠 Image or GIF beside title */}
                <div className="relative mb-6 md:mb-10">

                  {/* Title */}
                  <h2 className="text-2xl md:text-3xl font-bold text-center text-[#5C4033]">
                    Knowledge Test
                  </h2>
                </div>


              </div>
            <div
                ref={boxRef}
                className="relative bg-white/95 border border-[#E6D3BA] p-6 md:p-10 rounded-3xl shadow-2xl"
              >
              {/* Top info */}
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-medium text-[#5C4033] bg-[#F5E9DD] px-4 py-1 rounded-full shadow-sm">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="font-semibold text-red-600 bg-[#FCEDEA] px-3 py-1 rounded-full text-sm">
                  {formatTime(timeLeft)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#F1E7DC] h-2 rounded-full mb-6">
                <div
                  className="bg-[#7B4F2C] h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>

              <p className="text-sm text-gray-600 mb-4 text-center">
                Category: <span className="font-medium text-[#5C4033]">{questions[currentQuestionIndex]?.category}</span>
              </p>

              <h1 className="text-lg md:text-xl font-semibold mb-6 text-center text-[#3B2F2F] leading-snug">
                {questions[currentQuestionIndex]?.question}
              </h1>

              <div className="flex flex-col gap-3 md:gap-4 mb-8 md:mb-10">
                {(questions[currentQuestionIndex]?.choices || []).map((choice, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-3 md:p-4 border rounded-xl transition cursor-pointer ${
                      selectedAnswer === choice
                        ? 'border-[#7B4F2C] bg-[#F8F2EB] shadow-md'
                        : 'border-gray-300 hover:border-[#C1A78F] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQuestionIndex}`}
                      value={choice}
                      checked={selectedAnswer === choice}
                      onChange={() => handleAnswerSelection(choice)}
                      className="w-5 h-5 accent-[#7B4F2C]"
                    />
                    <span className="text-gray-800">{choice}</span>
                  </label>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 mt-8">
                <button
                  type="button"
                  disabled
                  className="w-full md:w-auto px-6 py-3 bg-[#7B4F2C] text-white font-medium rounded-lg hover:bg-[#684029] disabled:opacity-50 transition-all"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!selectedAnswer}
                  className="w-full md:w-auto px-6 py-3 bg-[#7B4F2C] text-white font-medium rounded-lg hover:bg-[#684029] disabled:opacity-50 transition-all"
                >
                  {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </form>
        )
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-white/95 border border-[#E6D3BA] p-8 rounded-2xl shadow-2xl max-w-sm text-center animate-fadeIn">
            <h2 className="text-xl font-bold mb-6 text-[#5C4033]">Submit Test?</h2>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="bg-gray-300 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFinish}
                className="bg-[#7B4F2C] text-white px-4 py-2 rounded-lg hover:bg-[#684029] transition"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      {gifPosition && (
        <Image
          src="/Cat Working Sticker by Pusheen.gif"
          alt="Peeking Cat"
          width={105}
          height={105}
          style={{
            position: 'absolute',
            top: gifPosition.top -50,
            left: gifPosition.left + 40,
            pointerEvents: 'none',
          }}
          className="object-contain"
          priority
        />
      )}
    </div>
  );
};

export default KnowledgeTest;

