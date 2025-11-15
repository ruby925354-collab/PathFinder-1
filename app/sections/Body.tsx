'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import LoginModal from '@/app/components/LoginModal';
import RegisterModal from '@/app/components/RegisterModal';
import OTPModal from '@/app/components/OTPModal';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiSend, FiMessageCircle, FiX } from 'react-icons/fi';
import axios from 'axios';

const Body = () => {
  const { isLoggedIn, login } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isOTPModalOpen, setIsOTPModalOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [lastSeenMessage, setLastSeenMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => setMounted(true), []);

  const openLoginModal = () => {
    setIsRegisterModalOpen(false);
    setIsLoginModalOpen(true);
  };
  const closeLoginModal = () => setIsLoginModalOpen(false);
  const openRegisterModal = () => {
    setIsLoginModalOpen(false);
    setIsRegisterModalOpen(true);
  };
  const closeRegisterModal = () => setIsRegisterModalOpen(false);
  const openOTPModal = (email: string) => {
    setIsRegisterModalOpen(false);
    setRegisteredEmail(email);
    setIsOTPModalOpen(true);
  };
  const closeOTPModal = () => setIsOTPModalOpen(false);

  const handleLoginSuccess = (username: string) => {
    login(username);
    closeLoginModal();

    setTimeout(() => {
      const roleId = localStorage.getItem('role_id');
      if (roleId === '1') router.push('/admin');
      else router.push('/Gradings');
    }, 300);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#F2E6D9] via-[#E7D2B8] to-[#CBB292] text-[#2E1C14]">
      {/* Background lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,_rgba(255,255,255,0.3),_transparent_70%),_radial-gradient(circle_at_75%_80%,_rgba(0,0,0,0.05),_transparent_70%)] pointer-events-none"></div>

      {/* Animated gradient glows */}
      <motion.div
        className="absolute w-96 h-96 bg-[#D7CCC8]/50 rounded-full blur-3xl top-[-100px] left-[-100px]"
        animate={{ y: [0, 30, 0], opacity: [0.8, 1, 0.8] }}
        transition={{ repeat: Infinity, duration: 9 }}
      />
      <motion.div
        className="absolute w-96 h-96 bg-[#BCAAA4]/40 rounded-full blur-3xl bottom-[-120px] right-[-80px]"
        animate={{ y: [0, -40, 0], opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 10 }}
      />

      {/* Hero Content */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 text-center px-6 md:px-10 max-w-5xl"
      >
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-[#3E2723] drop-shadow-lg leading-tight">
          Find Your <span className="text-[#6D4C41]">Right Career</span> Path
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="mt-8 text-lg md:text-2xl lg:text-3xl text-[#4E342E] leading-relaxed font-medium max-w-3xl mx-auto"
        >
          Are you a graduate of <span className="font-semibold text-[#3E2723]">STEM, ABM, or HUMSS</span>? <br />
          Discover your ideal college program with <span className="font-bold text-[#5D4037]">PathFinder</span> — 
          a smart recommendation system that analyzes your scholastic records, personality, and knowledge 
          to guide you toward your best-fit programs.
        </motion.p>

        {/* CTA */}
        <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }} className="mt-14">
          <button
            onClick={() => {
              if (isLoggedIn) {
                const roleId = localStorage.getItem('role_id');
                if (roleId === '1') router.push('/admin');
                else router.push('/Gradings');
              } else {
                openLoginModal();
              }
            }}
            className="bg-[#6D4C41] hover:bg-[#4E342E] text-white px-12 py-5 rounded-full text-2xl font-semibold shadow-lg transition-all duration-300"
          >
            Get Started
          </button>
        </motion.div>
      </motion.div>

      {/* Modals */}
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} onSwitchToRegister={openRegisterModal} onLoginSuccess={handleLoginSuccess} />
      <RegisterModal isOpen={isRegisterModalOpen} onClose={closeRegisterModal} onSwitchToLogin={openLoginModal} onSwitchToOTP={(email: string) => openOTPModal(email)} />
      <OTPModal isOpen={isOTPModalOpen} onClose={closeOTPModal} email={registeredEmail} />

      {/* 💬 Chatbot (only when logged in) */}
      {isLoggedIn && <FloatingChatbot />}
    </section>
  );
};
const FloatingChatbot: React.FC = () => {
  const [isQueued, setIsQueued] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [miniMessage, setMiniMessage] = useState<string | null>(null);
  const [showMiniBubble, setShowMiniBubble] = useState(false);
  const [isMiniTyping, setIsMiniTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userId = localStorage.getItem("user_id")
  const selectedLLM = localStorage.getItem("selectedLLM") || "minichat";


  // 🌟 Inject welcome message on mount (user just logged in)
  useEffect(() => {
    const timer = setTimeout(() => {
      const welcomeText = "Hello, Welcome to PathFinder! Ask here if you need some questions.";
      // Add bot message to chat
      setMessages((prev) => [...prev, { sender: 'bot', text: welcomeText }]);

      // Show mini-bubble if chat is closed
      if (!isOpen) {
        setMiniMessage(welcomeText);
        setShowMiniBubble(true);

        const miniTimer = setTimeout(() => setShowMiniBubble(false), 5000); // hide after 5 sec
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = miniTimer;
      }
    }, 1000); // delay 1 second after login
    return () => clearTimeout(timer);
  }, []);

  // 🧠 Send message
  const sendMessage = async () => {
    if (isLoading || isQueued) return;   // ✅ prevent sending again
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);

    // ✅ queued state
    setIsQueued(true);

  if (!isOpen) {
    if (isQueued) {
      setMiniMessage("Sending...");
    } else {
      setMiniMessage(userMessage);
    }
    setShowMiniBubble(true);
  }

    try {
      setIsLoading(true);

    const response = await axios.post(
      "https://toothy-cephalic-makena.ngrok-free.dev/chat",
      {
        user_id: userId,
        message: userMessage,
        // model: selectedLLM,   // ⭐ THIS DECIDES WHICH BACKEND TO USE
      }
    );

      // ✅ finished waiting, remove queued state
      setIsQueued(false);

      const botMessage = response.data.reply || "...";
      setMessages((prev) => [...prev, { sender: "bot", text: botMessage }]);

      if (!isOpen) {
        setMiniMessage(botMessage);
        setIsMiniTyping(false);
        setShowMiniBubble(true);

        const timerId = setTimeout(() => setShowMiniBubble(false), 6000);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = timerId;
      }
    } catch (err) {
      setIsQueued(false);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Server unavailable. Try later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCloseChat = () => {
    setIsOpen(false);
    if (isLoading) {
      setMiniMessage('...');
      setIsMiniTyping(true);
      setShowMiniBubble(true);
    }
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    setShowMiniBubble(false);
    setIsMiniTyping(false);
  };

  return (
    <>
      {/* 💬 Floating Button */}
      {!isOpen && (
        <motion.button
          onClick={handleOpenChat}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="
            fixed
            bottom-16    
            right-16    
            bg-gradient-to-r from-[#6D4C41] to-[#4E342E]
            text-white
            p-5
            rounded-full
            shadow-2xl
            hover:shadow-3xl
            transition-all
            duration-300
            z-50
          "
        >
          <FiMessageCircle size={36} />
        </motion.button>
      )}

    {/* 🟡 Mini Bubble */}
    {!isOpen && showMiniBubble && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        onClick={handleOpenChat}
        className="
          fixed 
          bottom-[95px] right-[40px]
          bg-white 
          shadow-lg 
          border border-[#E0D4C2] 
          rounded-2xl 
          px-6 py-4 
          max-w-[300px]
          text-[#3E2723] 
          text-base font-medium
          flex items-center gap-3 
          z-50 
          cursor-pointer
          text-lg
        "
      >
        {isMiniTyping ? (
          <div className="flex items-center space-x-1 text-gray-500 text-xl">
            <div className="animate-bounce">•</div>
            <div className="animate-bounce delay-100">•</div>
            <div className="animate-bounce delay-200">•</div>
          </div>
        ) : (
          <span className="truncate">{miniMessage}</span>
        )}

        {/* Tail */}
        <span
          className="
            absolute
            -bottom-3
            right-10
            w-0 h-0
            border-l-[10px] border-l-transparent
            border-r-[10px] border-r-transparent
            border-t-[10px] border-t-white
          "
        />
      </motion.div>
    )}


      {/* 🪟 Chat Window */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-6 right-6 w-[480px] md:w-[560px] h-[650px] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-[#E0D4C2] flex flex-col overflow-hidden z-50"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#6D4C41] to-[#4E342E] text-white p-5 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <img src="/PATHFINDER-logo-edited.png" alt="logo" className="w-10 h-10 object-contain" />
              <span className="font-semibold text-xl tracking-wide">Chat Assistant</span>
            </div>
            <button onClick={handleCloseChat} className="hover:text-gray-300 transition-colors">
              <FiX size={26} />
            </button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#FAF8F5]/90 scrollbar-thin scrollbar-thumb-[#C7B8A1] scrollbar-track-transparent space-y-5">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-base italic py-8">
                👋 Hi there! How can I help you today?
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`px-5 py-4 rounded-2xl max-w-[80%] text-lg leading-relaxed shadow ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#6D4C41] to-[#4E342E] text-white rounded-br-none'
                      : 'bg-[#EFE6DD] text-[#3E2723] rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </motion.div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-500 text-lg ml-2">
                <div className="animate-bounce">•</div>
                <div className="animate-bounce delay-100">•</div>
                <div className="animate-bounce delay-200">•</div>
              </div>
            )}
            {isQueued && !isLoading && (
              <div className="flex items-center space-x-2 text-gray-400 text-lg ml-2 italic">
                Sending...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-5 border-t border-gray-200 flex items-center gap-4 bg-white/95 backdrop-blur-sm">
            <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            placeholder="Type your message..."
            disabled={isLoading}
            className={`flex-1 px-5 py-4 text-lg border rounded-full placeholder:text-gray-400 bg-[#FDFBF9]
              ${isLoading ? "opacity-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"}
            `}
          />

          <motion.button
            onClick={!isLoading ? sendMessage : undefined}
            whileHover={!isLoading ? { scale: 1.1 } : {}}
            whileTap={!isLoading ? { scale: 0.95 } : {}}
            disabled={isLoading}
            className={`
              bg-[#6D4C41] text-white p-4 rounded-full shadow-md
              ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#4E342E]"}
            `}
          >
            <FiSend size={22} />
          </motion.button>
          </div>
        </motion.div>
      )}
    </>
  );
};


export default Body;
