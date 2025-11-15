'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import LoginModal from '@/app/components/LoginModal';
import RegisterModal from '@/app/components/RegisterModal';
import OTPModal from '@/app/components/OTPModal';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiSend, FiMessageCircle, FiX } from 'react-icons/fi';
import { Variants } from "framer-motion";
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
  const [input, setInput] = useState('');
  const [miniMessage, setMiniMessage] = useState<string | null>(null);
  const [showMiniBubble, setShowMiniBubble] = useState(false);
  const [isMiniTyping, setIsMiniTyping] = useState(false);
  // const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);// Loading the history from db (Admin tab)
  const [isAdminLoadingHistory, setIsAdminLoadingHistory] = useState(false);

  // Sending messages
  const [isSendingBot, setIsSendingBot] = useState(false);
  const [isSendingAdmin, setIsSendingAdmin] = useState(false);


  const [userId, setUserId] = useState<string | null>(null);
  const selectedLLM = localStorage.getItem("selectedLLM") || "minichat";

  // 🔥 MUST BE DEFINED BEFORE USING messages/setMessages
  const [activeChat, setActiveChat] = useState<'bot' | 'admin'>('bot');
  const [botMessages, setBotMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [adminMessages, setAdminMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const shakeAnimation = {
    shake: {
      rotate: [0, -14, 14, -14, 14, 0],
      transition: {
        duration: 0.6,
        ease: "easeInOut"
      }
    }
  } as const satisfies Variants;

  const [shake, setShake] = useState(false);
  const [shakeTopLogo, setShakeTopLogo] = useState(false);


  // 🔥 NOW WE CAN SAFELY COMPUTE WHICH CONVO TO SHOW
  const messages = activeChat === 'bot' ? botMessages : adminMessages;
  const setMessages = activeChat === 'bot' ? setBotMessages : setAdminMessages;
  const [adminConversationId, setAdminConversationId] = useState<number | null>(null);
  const lastAdminMsgIdRef = useRef<number>(0);
  useEffect(() => {
    if (activeChat !== "bot") return;
    if (isOpen) return;

    const last = botMessages[botMessages.length - 1];
    if (!last) return;

    // Only trigger for bot replies
    if (last.sender !== "bot") return;

    // STOP the typing indicator
    setIsMiniTyping(false);

    // Show the bot response
    setMiniMessage(last.text);
    setShowMiniBubble(true);
    setShake(true);
    setTimeout(() => setShake(false), 400);
    setShakeTopLogo(true);
    setTimeout(() => setShakeTopLogo(false), 400);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowMiniBubble(false);
    }, 5000);
  }, [botMessages, isOpen, activeChat]);

  useEffect(() => {
    setUserId(localStorage.getItem("user_id"));
  }, []);


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
        // 🔥 Trigger shake on floating chatbot image
        setShake(true);
        setTimeout(() => setShake(false), 400);
        setShakeTopLogo(true);
        setTimeout(() => setShakeTopLogo(false), 400);
        const miniTimer = setTimeout(() => setShowMiniBubble(false), 5000); // hide after 5 sec
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = miniTimer;
      }
    }, 1000); // delay 1 second after login
    return () => clearTimeout(timer);
  }, []);

    useEffect(() => {
      if (activeChat === "admin") {
        loadAdminMessages();
      }
    }, [activeChat]);

  // 🔄 AUTO-REFRESH ADMIN CHAT WHEN NEW MESSAGE ARRIVES
  useEffect(() => {
  if (!adminConversationId) return;
  // 🔥 FIX BOT MINI-BUBBLE: Trigger when bot sends a new message & chat is CLOSED

  const interval = setInterval(async () => {
    try {
      const lastId = lastAdminMsgIdRef.current;

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin-chat/check-new/${adminConversationId}/${lastId}`
      );

      if (res.data.new === true) {
        // Reload all admin messages
        const msgRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/admin-chat/conversation/${adminConversationId}`
        );

        const msgs = msgRes.data.messages.map((m: any) => ({
          id: m.id,
          sender: m.sender === "admin" ? "bot" : "user",
          text: m.message,
        }));

        setAdminMessages(msgs);

        // update last known id
        lastAdminMsgIdRef.current = msgs[msgs.length - 1].id;

        // 🔥 SHOW MINI-BUBBLE IF CHAT IS CLOSED OR USER NOT IN ADMIN TAB
        if (!isOpen || activeChat !== "admin") {
          const latest = msgs[msgs.length - 1];

          setMiniMessage(latest.text);
          setIsMiniTyping(false);
          setShowMiniBubble(true);
          // Trigger shake on floating chatbot image
          setShake(true);
          setTimeout(() => setShake(false), 400);
          setShakeTopLogo(true);
          setTimeout(() => setShakeTopLogo(false), 400);
          // auto hide after 5s
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          hideTimerRef.current = setTimeout(
            () => setShowMiniBubble(false),
            5000
          );
        }
      }
    } catch (err) {
      console.log("User polling failed:", err);
    }
  }, 1500);

  return () => clearInterval(interval);
}, [adminConversationId, activeChat, isOpen]);


 const loadAdminMessages = async () => {
    setIsAdminLoadingHistory(true);

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin-chat/${userId}`
      );

      const msgs = res.data.messages.map((msg: any) => ({
        id: msg.id,                 // <-- ADD THIS
        sender: msg.sender === "admin" ? "bot" : "user",
        text: msg.message
      }));

      setAdminMessages(msgs);
      setAdminConversationId(res.data.conversation_id);

      // 💾 Store last admin message id
      lastAdminMsgIdRef.current =
        msgs.length > 0 ? msgs[msgs.length - 1].id : 0;

    } finally {
      setIsAdminLoadingHistory(false);
    }
  };



  // 🧠 Send message
  const sendMessage = async () => {
    // normalize input
    if (!input.trim()) return;
    const userMessage = input.trim();

    // Prevent duplicate sends for the active chat
    if (activeChat === "bot" && isSendingBot) return;
    if (activeChat === "admin" && isSendingAdmin) return;

    // Add user message to UI and clear input immediately
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');

    // Set appropriate sending flag
    if (activeChat === "bot") setIsSendingBot(true);
    else setIsSendingAdmin(true);

    try {
      let botMessage = "";

      if (activeChat === "bot") {
        // Replace with your bot endpoint
        const response = await axios.post(
          "https://toothy-cephalic-makena.ngrok-free.dev/chat",
          { user_id: userId, message: userMessage }
        );
        botMessage = response.data.reply || "...";
        
        // 🔥 If bot replied while chatbox is CLOSED → show mini-bubble
        if (!isOpen && activeChat === "bot") {
          setMiniMessage(botMessage);
          setIsMiniTyping(false);
          setShowMiniBubble(true);
          // 🔥 Trigger shake on floating chatbot image
          setShake(true);
          setTimeout(() => setShake(false), 400);
          setShakeTopLogo(true);
          setTimeout(() => setShakeTopLogo(false), 400);
          // auto hide after 5 seconds
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          hideTimerRef.current = setTimeout(() => setShowMiniBubble(false), 5000);
        }

      } else {
        // Admin endpoint - this expects conversation_id OR will create one
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/admin-chat/`,
          {
            user_id: userId,
            conversation_id: adminConversationId ?? undefined,
            message: userMessage,
          }
        );

        // Save returned conversation id if present
        if (response.data.conversation_id) {
          setAdminConversationId(response.data.conversation_id);
        }

        botMessage = response.data.reply || "Message sent to admin.";
      }

      // Append reply to UI
      setMessages(prev => [...prev, { sender: 'bot', text: botMessage }]);
    } catch (err) {
      // append error message
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: "⚠️ Server unavailable. Try later." }
      ]);
    } finally {
      // clear sending flag for the active chat
      if (activeChat === "bot") setIsSendingBot(false);
      else setIsSendingAdmin(false);
    }
  };



  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCloseChat = () => {
    setIsOpen(false);

    // Show typing mini bubble only if the CURRENT CHAT is sending
    const isSending = activeChat === "bot" ? isSendingBot : isSendingAdmin;

    if (isSending) {
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

  useEffect(() => {
  // restore correct convo on tab switch
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [activeChat]);

  // ✅ Scroll to newest message whenever chat opens or tab switches
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 50);
    }
  }, [isOpen, activeChat]);

  return (
    <>
      {/* 💬 Floating Button */}
      {!isOpen && (
        <motion.div
          onClick={handleOpenChat}
          className="fixed bottom-16 right-16 z-50 cursor-pointer"
        >
          <motion.img
          src="/PATHFINDER-logo-edited.png"
          alt="Chatbot"
          className="w-24 h-24 object-contain drop-shadow-xl"
          variants={shakeAnimation}
          animate={
            isOpen
              ? { scale: 0, opacity: 0, y: -50 }
              : shake
              ? "shake"
              : { scale: 1, opacity: 1, y: 0 }
          }
          transition={{ duration: 0.25, ease: "easeInOut" }}
          draggable={false}
        />
        </motion.div>
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
        <>
          {/* 🌟 EXPANDING LOGO ABOVE THE CHATBOX */}
          <motion.img
            src="/PATHFINDER-logo-edited.png"
            alt="Chatbot Logo"
            initial={{ scale: 0.3, opacity: 0, y: 20 }}
            animate={shakeTopLogo ? "shake" : { scale: 1, opacity: 1, y: 0 }}
            variants={shakeAnimation}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute bottom-[580px] right-25 md:bottom-[555px] md:right-[535px] w-32 h-32 z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-0 right-0 left-0 md:bottom-6 md:right-6 md:left-auto 
            w-full md:w-[480px] lg:w-[560px] 
            h-[85vh] md:h-[560px] 
            bg-white/95 backdrop-blur-md rounded-none md:rounded-3xl shadow-2xl border border-[#E0D4C2] flex flex-col overflow-hidden z-50"

          >

          {/* Header */}
          <div className="bg-gradient-to-r from-[#6D4C41] to-[#4E342E] text-white p-5 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex gap-3">
              <button
                onClick={() => setActiveChat('bot')}
                className={`px-3 py-1 rounded-lg text-lg ${
                  activeChat === 'bot' ? 'bg-white text-[#4E342E]' : 'text-gray-200'
                }`}
              >
                Chatbot
              </button>

              <button
                onClick={() => setActiveChat('admin')}
                className={`px-3 py-1 rounded-lg text-lg ${
                  activeChat === 'admin' ? 'bg-white text-[#4E342E]' : 'text-gray-200'
                }`}
              >
                Admin
              </button>
            </div>
            </div>
            <button onClick={handleCloseChat} className="hover:text-gray-300 transition-colors">
              <FiX size={26} />
            </button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#FAF8F5]/90 scrollbar-thin scrollbar-thumb-[#C7B8A1] scrollbar-track-transparent space-y-5">

            {/* Admin history loading */}
            {activeChat === "admin" && isAdminLoadingHistory && (
              <div className="text-center text-gray-500 py-8 text-lg">
                Fetching conversation…
                <div className="flex justify-center mt-3 space-x-1">
                  <div className="animate-bounce">•</div>
                  <div className="animate-bounce delay-100">•</div>
                  <div className="animate-bounce delay-200">•</div>
                </div>
              </div>
            )}

            {!(activeChat === "admin" && isAdminLoadingHistory) && (
              <>
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
              </>
            )}

            {/* SENDING… indicator shown BELOW user's message */}
            {activeChat === "bot" && isSendingBot && (
              <div className="text-right text-gray-500 text-sm italic pr-3">
                Sending…
              </div>
            )}

            {activeChat === "admin" && isSendingAdmin && (
              <div className="text-right text-gray-500 text-sm italic pr-3">
                Sending to admin…
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
              onKeyDown={(e) => e.key === 'Enter' && !(activeChat === "bot" ? isSendingBot : isSendingAdmin) && sendMessage()}
              placeholder="Type your message..."
              disabled={activeChat === "bot" ? isSendingBot : isSendingAdmin}
              className={`flex-1 px-5 py-4 text-lg border rounded-full placeholder:text-gray-400 bg-[#FDFBF9]
                ${(activeChat === "bot" ? isSendingBot : isSendingAdmin)
                  ? "opacity-50 cursor-not-allowed"
                  : "focus:outline-none focus:ring-2 focus:ring-[#6D4C41]"}
              `}
            />

            <motion.button
              onClick={!(activeChat === "bot" ? isSendingBot : isSendingAdmin) ? sendMessage : undefined}
              whileHover={!(activeChat === "bot" ? isSendingBot : isSendingAdmin) ? { scale: 1.05 } : {}}
              whileTap={!(activeChat === "bot" ? isSendingBot : isSendingAdmin) ? { scale: 0.95 } : {}}
              disabled={activeChat === "bot" ? isSendingBot : isSendingAdmin}
              className={`
                bg-[#6D4C41] text-white p-4 rounded-full shadow-md
                ${(activeChat === "bot" ? isSendingBot : isSendingAdmin) ? "opacity-50 cursor-not-allowed" : "hover:bg-[#4E342E]"}
              `}
            >
            <FiSend size={22} />
          </motion.button>
        </div>
        </motion.div>
      </>
      )}
    </>
  );
};


export default Body;
