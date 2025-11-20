'use client';
import React, { useState, useEffect } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const PersonalityTest = () => {
  const router = useRouter();
  const [hasCompletedAll, setHasCompletedAll] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<
    {
      personality_test_id: number;
      personality_id: number;
      personality_type: string;
      questions: string;
      answered?: boolean;
      answer_value?: number | null;
    }[]
  >([]);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultType, setResultType] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const [isClientReady, setIsClientReady] = useState(false);
  useEffect(() => {
  // prevents infinite reload loop
  if (!sessionStorage.getItem("pt_refreshed")) {
    sessionStorage.setItem("pt_refreshed", "yes");
    window.location.reload();
  }
}, []);


  useEffect(() => {
    // Ensure browser APIs like localStorage are ready
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      const allAnswered = questions.every(q => q.answered);
      setHasCompletedAll(allAnswered);
    }
  }, [questions]);


// Wait until the component is fully mounted
useEffect(() => {
  if (!isClientReady) return;

  const userId = localStorage.getItem('user_id');
  if (!userId) {
    alert('You must be logged in to access this page.');
    router.push('/');
  }
}, [isClientReady, router]);

useEffect(() => {
  if (!isClientReady) return;

  const checkScholasticCompletion = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) return;

      const strandRes = await axios.get(`${API_BASE_URL}/api/scholastic/user-strand/${userId}`);
      const recordRes = await axios.get(`${API_BASE_URL}/api/scholastic/records/${userId}`);

      const hasStrand = strandRes.data?.strand;
      const hasRecords = recordRes.data?.records?.length > 0;

      if (!hasStrand || !hasRecords) {
        alert('Please complete your Scholastic Record before taking the Personality Test.');
        router.replace('/Gradings');
      }
    } catch (err) {
      console.error('Error checking Scholastic completion:', err);
      alert('Unable to verify your scholastic record. Please try again.');
      router.replace('/ScholasticRecord');
    }
  };

  checkScholasticCompletion();
}, [API_BASE_URL, isClientReady, router]);

useEffect(() => {
  if (!isClientReady) return;

  const roleId = localStorage.getItem('role_id');
  if (roleId === '1') router.replace('/admin');
}, [isClientReady, router]);

useEffect(() => {
  if (!isClientReady) return;   // 🧠 FIXED LINE

  const fetchInitialData = async () => {
      try {
        const user_id = localStorage.getItem('user_id');
        if (!user_id) return;

        const qRes = await fetch(
          `${API_BASE_URL}/api/personality/questions/${user_id}`
        );
        if (!qRes.ok) throw new Error('Failed to fetch questions');
        const qData = await qRes.json();

        setQuestions(qData);

        const mappedAnswers = qData.map((q: any) =>
          q.answered ? (q.answer_value === 1 ? 'Agree' : 'Disagree') : null
        );
        setAnswers(mappedAnswers);

        if (qData.length > 0) {
          const firstQ = qData[0];
          setSelectedAnswer(firstQ.answered ? (firstQ.answer_value === 1 ? 'Agree' : 'Disagree') : null);
        }

        const allAnswered = qData.length > 0 && qData.every((q: any) => q.answered);
        setHasCompletedAll(allAnswered);
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to load data.');
      }
    };

    fetchInitialData();

    const seen = localStorage.getItem('seenPersonalityNotice');
    if (seen) setShowNotification(false);
  }, [API_BASE_URL, isClientReady]);

  const handleStart = () => {
    localStorage.setItem('seenPersonalityNotice', 'true');
    setShowNotification(false);
  };

  const handleAnswerSelection = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleNext = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const user_id = localStorage.getItem('user_id');
    if (!user_id) {
      setErrorMsg('User not logged in');
      return;
    }

    if (currentQuestion.answered) {
      nextQuestion();
      return;
    }

    if (!selectedAnswer) return;

    try {
      await fetch(`${API_BASE_URL}/api/personality/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(user_id),
          personality_test_id: currentQuestion.personality_test_id,
          answer: selectedAnswer,
        }),
      });

      const updatedAnswers = [...answers];
      updatedAnswers[currentQuestionIndex] = selectedAnswer;
      setAnswers(updatedAnswers);

      const updatedQuestions = [...questions];
      updatedQuestions[currentQuestionIndex].answered = true;
      updatedQuestions[currentQuestionIndex].answer_value = selectedAnswer === 'Agree' ? 1 : 0;
      setQuestions(updatedQuestions);

      nextQuestion();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save your answer. Please try again.');
    }
  };

  const nextQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      const nextQ = questions[nextIndex];
      setSelectedAnswer(nextQ.answered ? (nextQ.answer_value === 1 ? 'Agree' : 'Disagree') : null);
      return;
    }

    const allAnswered = questions.every(q => q.answered || answers[questions.indexOf(q)] !== null);
    if (allAnswered) {
      await handleAutoSubmit();
    } else {
      setErrorMsg('Please answer all questions before proceeding.');
    }
  };

  const handleAutoSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const user_id = localStorage.getItem('user_id');
      if (!user_id) throw new Error('User not logged in');

      const res = await fetch(`${API_BASE_URL}/api/personality-result/${user_id}`);
      const data = await res.json();

      if (data.success && data.type !== 'Unknown') {
        setResultType(data.type);
      } else if (data.message === 'Incomplete') {
        setErrorMsg(`You’ve only answered ${data.answered} out of ${data.total} questions.`);
      } else {
        setErrorMsg('Could not calculate your result.');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg('Failed to process your result.');
    } finally {
      setLoading(false);
    }
  };
  // ⬇️ AUTO REFRESH ON FIRST LOAD
useEffect(() => {
  if (!isClientReady) return;

  // Only refresh once per session
  if (!localStorage.getItem("personalityTestRefreshed")) {
    localStorage.setItem("personalityTestRefreshed", "true");
    window.location.reload();
  }
}, [isClientReady]);


  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = currentQuestion?.answered;
  // 🚀 Force refresh once on the first visit
  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadyRefreshed = sessionStorage.getItem("pt_refreshed");

    if (!alreadyRefreshed) {
      sessionStorage.setItem("pt_refreshed", "true");
      window.location.reload(); // FORCE REFRESH
    }
  }, []);


  return (
    <div className="flex flex-col justify-center items-center min-h-screen px-6 bg-[#F5E9DA]">
      {loading && <p className="text-[#4B2E2E] mb-4 animate-pulse">Processing your result...</p>}
      {errorMsg && (
        <div className="text-center mb-4">
          <p className="text-red-600">{errorMsg}</p>
          <button
            onClick={() => location.reload()}
            className="mt-2 px-4 py-2 bg-[#6B4F4F] text-white rounded-md hover:bg-[#5a403f] transition"
          >
            Retry
          </button>
        </div>
      )}

      {showNotification ? (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-lg w-full text-center animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-[#6B4F4F]">Steps to Complete</h2>
            <ul className="list-decimal pl-6 mb-8 text-left text-gray-700 text-lg space-y-3">
              <li className="flex items-center gap-2"><FaCheckCircle className="text-green-600" /> Step 1: Scholastic Record</li>
              <li>Step 2: Personality Test</li>
              <li>Step 3: Knowledge Test</li>
            </ul>
            <button
              onClick={handleStart}
              className="bg-[#6B4F4F] text-white px-8 py-2 rounded-lg hover:bg-[#5a403f] transition"
            >
              Start
            </button>
          </div>
        </div>
      ) : resultType ? (
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center">
          <h1 className="text-3xl font-bold mb-6 text-[#6B4F4F]">
            You are a <span className="text-[#4B2E2E]">{resultType}</span> person
          </h1>
          <button
            onClick={() => router.push('/KnowledgeTest')}
            className="bg-[#6B4F4F] text-white px-8 py-2 rounded-lg hover:bg-[#5a403f] transition"
          >
            Proceed
          </button>
        </div>
      ) : questions.length > 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full relative animate-fade-in">
          <h1 className="text-2xl font-bold text-center mb-6 text-[#6B4F4F]">Personality Test</h1>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
            <div
              className="bg-[#6B4F4F] h-3 rounded-full transition-all duration-500"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>

          <div className="absolute top-4 left-4 text-gray-600 text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>

          <p className="text-lg mb-10 text-center text-[#4B2E2E]">{currentQuestion.questions}</p>

          <div className="flex justify-center gap-10 mb-10">
            {['Agree', 'Disagree'].map((choice) => (
              <label
                key={choice}
                className="flex flex-col items-center text-[#4B2E2E] cursor-pointer select-none"
              >
                <input
                  type="radio"
                  name={`question-${currentQuestionIndex}`}
                  value={choice}
                  checked={selectedAnswer === choice}
                  onChange={() => setSelectedAnswer(choice)}
                  disabled={isAnswered}
                  className="appearance-none w-10 h-10 border-4 border-[#6B4F4F] rounded-full checked:bg-[#6B4F4F] checked:border-[#5a403f] transition-all duration-200 cursor-pointer disabled:opacity-70"
                />
                <span className="mt-2 text-base font-medium">{choice}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleNext}
              disabled={!selectedAnswer && !isAnswered}
              className={`px-5 py-2 rounded-lg text-white font-medium transition ${
                !selectedAnswer && !isAnswered
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-[#6B4F4F] hover:bg-[#5a403f]'
              }`}
            >
              {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
          {hasCompletedAll && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleAutoSubmit}
              className="text-[#6B4F4F] underline hover:text-[#4B2E2E] transition font-medium"
            >
              Skip to Results
            </button>
          </div>
        )}
        </div>
      ) : (
        <p className="text-gray-500">Loading questions...</p>
      )}
    </div>
  );
};

export default PersonalityTest;
