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
import {
  whatTriggers,
  howTriggers,
  whyTriggers,
  whoTriggers,
} from "@/app/chatbot/index.js";
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

  // 🔥 NOW WE CAN SAFELY COMPUTE WHICH CONVO TO SHOW
  const messages = activeChat === 'bot' ? botMessages : adminMessages;
  const setMessages = activeChat === 'bot' ? setBotMessages : setAdminMessages;
  const [adminConversationId, setAdminConversationId] = useState<number | null>(null);
  const lastAdminMsgIdRef = useRef<number>(0);
  const [randomPrompts, setRandomPrompts] = useState<string[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [showCommandPopup, setShowCommandPopup] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<typeof COMMANDS>([]);

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

      // Show typing animation
      setIsBotTyping(true);

      setTimeout(() => {
        setIsBotTyping(false);
        setMessages(prev => [...prev, { sender: "bot", text: welcomeText }]);
      }, 1200);

      // Mini bubble when chat is closed
      if (!isOpen) {
        setMiniMessage(welcomeText);
        setShowMiniBubble(true);
        setShake(true);
        setTimeout(() => setShake(false), 400);

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setShowMiniBubble(false), 5000);
      }
    }, 1000);

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

const COMMANDS = [
  { cmd: "/find", description: "Search user info by 12-digit ID" },
  { cmd: "/me", description: "Search your own info about /me scholastic, /me knowledge, /me personality" },
];


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

      // Store last admin message id
      lastAdminMsgIdRef.current =
        msgs.length > 0 ? msgs[msgs.length - 1].id : 0;

    } finally {
      setIsAdminLoadingHistory(false);
    }
  };



  // 🧠 Send message
  const sendMessage = async (overrideMessage?: string) => {
  const text = overrideMessage ?? input.trim();
  if (!text) return;

  const userMessage = text;

  // Prevent duplicate sends
  if (activeChat === "bot" && isSendingBot) return;
  if (activeChat === "admin" && isSendingAdmin) return;

  // Add user message instantly
  setMessages(prev => [...prev, { sender: "user", text: userMessage }]);
  setInput("");

  // Activate correct sending flag
  if (activeChat === "bot") setIsSendingBot(true);
  else setIsSendingAdmin(true);

  try {
    let reply = "";

    const normalized = userMessage.toLowerCase().trim();
// ---------------------------------------------
//  CHECK FOR /find COMMAND WITH 12-DIGIT ID
// ---------------------------------------------
if (normalized.startsWith("/find ")) {
  const inputId = normalized.replace("/find", "").trim();

  // Must be exactly 12 digits numeric
  if (!/^\d{12}$/.test(inputId)) {
    if (activeChat === "bot") setIsSendingBot(false);

    setMessages(prev => [
      ...prev,
      { sender: "bot", text: "❌ Invalid format.\nUse: /find 000000000001" }
    ]);
    return;
  }

  // Convert padded number to real integer
  const realId = parseInt(inputId, 10);

  try {
    // Step 1 — Get user_id from information table
    const infoRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/information/${realId}`
    );

    const userIdFromInfo = infoRes.data.user_id;

    // Step 2 — Fetch their full report-data
    const reportRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/${userIdFromInfo}/report-data`
    );

    const data = reportRes.data;
    // Fetch user's visibility
    const visRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/${userIdFromInfo}/visibility`
    );
    const visibility = visRes.data.visibility;

    // CENSOR IF PRIVATE
    const displayName = visibility === "private"
      ? "*************"
      : data.full_name;

    const displayEmail = visibility === "private"
      ? "*************"
      : data.email;

    // Empty data → no personality/test/programs yet
    if (!data || Object.keys(data).length === 0) {
      setMessages(prev => [
        ...prev,
        { sender: "bot", text: "ℹ️ No info available for this user yet." }
      ]);

      if (activeChat === "bot") setIsSendingBot(false);
      return;
    }

    // Build scholastic records text
  let scholasticText = "📘 **Scholastic Record:**\n";

let hasScholastic = false;

for (let i = 1; i <= 40; i++) {
  const subj = data[`subject${i}`];
  const sem = data[`semester${i}`];
  const grade = data[`grades${i}`];

  // Skip empty rows
  if (!subj && !sem && !grade) continue;

  hasScholastic = true;

  scholasticText += `\n• **${subj || "N/A"}** | Semester: ${sem || "N/A"} | Grade: ${grade || "N/A"}`;
}

if (!hasScholastic) scholasticText += "\nNo scholastic data available.\n";

// FINAL RESPONSE WITH SCHOLASTIC SECTION INCLUDED
const responseText =
  `**User Information Found**\n\n` +
` **Name:** ${displayName}\n` +
` **Email:** ${displayEmail}\n` +
  `**Strand:** ${data.strand || "N/A"}\n\n` +
  `**Personality Scores:**\n` +
  `R: ${data.r_score}, I: ${data.i_score}, A: ${data.a_score}, S: ${data.s_score}, E: ${data.e_score}, C: ${data.c_score}\n\n` +
  `**Knowledge Test Summary:**\n` +
  `Math: ${data.math_score}\nEnglish: ${data.english_score}\nScience: ${data.science_score}\nFilipino: ${data.filipino_score}\n
  Logical Reasoning: ${data.lr_score}\nReading Comprehension: ${data.rc_score}\nTechnology: ${data.tech_score}\nEngineering: ${data.engineer_score}\n
  Business: ${data.business_score}\nManagement: ${data.manage_score}\nHumanities: ${data.human_score}\nAccountancy: ${data.acc_score}\nSocial Science: ${data.ss_score}\n` + 
  `**Recommended Programs:**\n` +
  `1. ${data.program1}\n` +
  `2. ${data.program2}\n` +
  `3. ${data.program3}\n\n` +
  scholasticText;


    // stop sending indicator
    if (activeChat === "bot") setIsSendingBot(false);

    // simulate typing
    setIsBotTyping(true);
    await new Promise(res => setTimeout(res, 8000));
    setIsBotTyping(false);

    setMessages(prev => [...prev, { sender: "bot", text: responseText }]);
  } catch (err: any) {
    if (activeChat === "bot") setIsSendingBot(false);

    if (err.response?.status === 404) {
      setMessages(prev => [
        ...prev,
        { sender: "bot", text: "❌ Invalid information ID." }
      ]);
    } else {
      setMessages(prev => [
        ...prev,
        { sender: "bot", text: "⚠️ Error fetching information." }
      ]);
    }
  }

  return; // stop execution
}
// ---------------------------------------------
//  /me COMMAND (fetch current user's own data)
// ---------------------------------------------
if (normalized === "/me") {
  try {
    const myUserId = userId; // already stored in state / localStorage

    if (!myUserId) {
      setMessages(prev => [
        ...prev,
        { sender: "bot", text: "⚠️ You are not logged in." }
      ]);
      return;
    }

    // Step 1 — Fetch user report data
    const reportRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/${myUserId}/report-data`
    );
    const data = reportRes.data;

    // Step 2 — Fetch visibility
    const visRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/${myUserId}/visibility`
    );
    const visibility = visRes.data.visibility;

    const displayName = visibility === "private"
      ? "*************"
      : data.full_name;

    const displayEmail = visibility === "private"
      ? "*************"
      : data.email;

    // Scholastic Record
    let scholasticText = "**Scholastic Record:**\n";
    let hasScholastic = false;

    for (let i = 1; i <= 40; i++) {
      const subj = data[`subject${i}`];
      const sem = data[`semester${i}`];
      const grade = data[`grades${i}`];

      if (!subj && !sem && !grade) continue;

      hasScholastic = true;
      scholasticText += `\n• **${subj || "N/A"}** | Semester: ${sem || "N/A"} | Grade: ${grade || "N/A"}`;
    }

    if (!hasScholastic) scholasticText += "\nNo scholastic data available.\n";

    const responseText =
      `**Your Profile Information**\n\n` +
      `**Name:** ${displayName}\n` +
      `**Email:** ${displayEmail}\n` +
      `**Strand:** ${data.strand || "N/A"}\n\n` +
      `**Personality Scores:**\n` +
      `R: ${data.r_score}, I: ${data.i_score}, A: ${data.a_score}, S: ${data.s_score}, E: ${data.e_score}, C: ${data.c_score}\n\n` +
      `**Knowledge Test Summary:**\n` +
      `Math: ${data.math_score}\nEnglish: ${data.english_score}\nScience: ${data.science_score}\nFilipino: ${data.filipino_score}\n` +
      `Logical Reasoning: ${data.lr_score}\nReading Comprehension: ${data.rc_score}\nTechnology: ${data.tech_score}\nEngineering: ${data.engineer_score}\n` +
      `Business: ${data.business_score}\nManagement: ${data.manage_score}\nHumanities: ${data.human_score}\nAccountancy: ${data.acc_score}\nSocial Science: ${data.ss_score}\n\n` +
      `**Recommended Programs:**\n` +
      `1. ${data.program1}\n` +
      `2. ${data.program2}\n` +
      `3. ${data.program3}\n\n` +
      scholasticText;

    // Typing animation
    if (activeChat === "bot") setIsSendingBot(false);

    setIsBotTyping(true);
    await new Promise(res => setTimeout(res, 5000));
    setIsBotTyping(false);

    setMessages(prev => [...prev, { sender: "bot", text: responseText }]);

  } catch (err) {
    setMessages(prev => [
      ...prev,
      { sender: "bot", text: "⚠️ Could not fetch your profile." }
    ]);
  }

  return;
}
// ---------------------------------------------
//  /me scholastic  (show only user's scholastic record)
// ---------------------------------------------
if (normalized === "/me scholastic") {
  try {
    const myUserId = userId;

    if (!myUserId) {
      setMessages(prev => [
        ...prev, { sender: "bot", text: "⚠️ You are not logged in." }
      ]);
      return;
    }

    // Step 1 — fetch report data
    const reportRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/${myUserId}/report-data`
    );
    const data = reportRes.data;

    // Step 2 — visibility check
    const visRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/${myUserId}/visibility`
    );
    const visibility = visRes.data.visibility;

    const displayName = visibility === "private"
      ? "*************"
      : data.full_name;

    // Build scholastic record
    let scholasticText =
      `📘 **Scholastic Record for ${displayName}**\n`;

    let hasScholastic = false;

    for (let i = 1; i <= 40; i++) {
      const subj = data[`subject${i}`];
      const sem = data[`semester${i}`];
      const grade = data[`grades${i}`];

      if (!subj && !sem && !grade) continue;

      hasScholastic = true;
      scholasticText += `\n• **${subj || "N/A"}** — Semester: ${sem || "N/A"}, Grade: ${grade || "N/A"}`;
    }

    if (!hasScholastic) {
      scholasticText += "\n\nNo scholastic data available.";
    }

    // Typing animation
    if (activeChat === "bot") setIsSendingBot(false);

    setIsBotTyping(true);
    await new Promise(res => setTimeout(res, 5000));
    setIsBotTyping(false);

    setMessages(prev => [...prev, { sender: "bot", text: scholasticText }]);

  } catch (err) {
    setMessages(prev => [
      ...prev,
      { sender: "bot", text: "⚠️ Could not fetch your scholastic record." }
    ]);
  }

  return;
}
// ---------------------------------------------
//  /me personality  (show only user's personality/RIASEC scores)
// ---------------------------------------------
if (normalized === "/me personality") {
  try {
    const myUserId = userId;

    if (!myUserId) {
      setMessages(prev => [
        ...prev, { sender: "bot", text: "⚠️ You are not logged in." }
      ]);
      return;
    }

    // Fetch data
    const reportRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/${myUserId}/report-data`
    );
    const data = reportRes.data;

    const visRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/${myUserId}/visibility`
    );
    const visibility = visRes.data.visibility;

    const displayName = visibility === "private"
      ? "*************"
      : data.full_name;

    const responseText =
      `**Personality Scores for ${displayName}**\n\n` +
      `R (Realistic): ${data.r_score}\n` +
      `I (Investigative): ${data.i_score}\n` +
      `A (Artistic): ${data.a_score}\n` +
      `S (Social): ${data.s_score}\n` +
      `E (Enterprising): ${data.e_score}\n` +
      `C (Conventional): ${data.c_score}`;

    // Typing animation
    if (activeChat === "bot") setIsSendingBot(false);
    setIsBotTyping(true);
    await new Promise(res => setTimeout(res, 5000));
    setIsBotTyping(false);

    setMessages(prev => [...prev, { sender: "bot", text: responseText }]);

  } catch (err) {
    setMessages(prev => [
      ...prev,
      { sender: "bot", text: "⚠️ Could not fetch your personality scores." }
    ]);
  }

  return;
}
// ---------------------------------------------
//  /me knowledge  (show only user's knowledge test scores)
// ---------------------------------------------
if (normalized === "/me knowledge") {
  try {
    const myUserId = userId;

    if (!myUserId) {
      setMessages(prev => [
        ...prev, { sender: "bot", text: "⚠️ You are not logged in." }
      ]);
      return;
    }

    // Fetch data
    const reportRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/${myUserId}/report-data`
    );
    const data = reportRes.data;

    const visRes = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/${myUserId}/visibility`
    );
    const visibility = visRes.data.visibility;

    const displayName = visibility === "private"
      ? "*************"
      : data.full_name;

    const responseText =
      `**Knowledge Test Scores for ${displayName}**\n\n` +
      `Math: ${data.math_score}\n` +
      `English: ${data.english_score}\n` +
      `Science: ${data.science_score}\n` +
      `Filipino: ${data.filipino_score}\n` +
      `Logical Reasoning: ${data.lr_score}\n` +
      `Reading Comprehension: ${data.rc_score}\n` +
      `Technology: ${data.tech_score}\n` +
      `Engineering: ${data.engineer_score}\n` +
      `Business: ${data.business_score}\n` +
      `Management: ${data.manage_score}\n` +
      `Humanities: ${data.human_score}\n` +
      `Accountancy: ${data.acc_score}\n` +
      `Social Science: ${data.ss_score}`;

    // Typing animation
    if (activeChat === "bot") setIsSendingBot(false);
    setIsBotTyping(true);
    await new Promise(res => setTimeout(res, 5000));
    setIsBotTyping(false);

    setMessages(prev => [...prev, { sender: "bot", text: responseText }]);

  } catch (err) {
    setMessages(prev => [
      ...prev,
      { sender: "bot", text: "⚠️ Could not fetch your knowledge test scores." }
    ]);
  }

  return;
}
      
    if (normalized.includes("what is pathfinder" ) || normalized.includes("what's pathfinder") || normalized.includes("define pathfinder") 
      || normalized.includes("what pathfinder") || normalized.includes("explain pathfinder") || normalized.includes("tell me about pathfinder")
    || normalized.includes("pathfinder is") || normalized.includes("what is this system")) {
      const reply = "PathFinder recommends three suitable college programs for Senior High School (SHS) graduates based on their personality, knowledge, and scholastic records.";

      if (activeChat === "bot") setIsSendingBot(false);
      else setIsSendingAdmin(false);

      setIsBotTyping(true);
      await new Promise(res => setTimeout(res, 6000));
      setIsBotTyping(false);

      setMessages(prev => [...prev, { sender: "bot", text: reply }]);
      return;
    }

    // Groups of accepted exact phrases
    const faq = [
      {
        triggers: whatTriggers,
        reply: "PathFinder recommends three suitable college programs for Senior High School (SHS) graduates based on their personality, knowledge, and scholastic records."
      },
      {
        triggers: howTriggers,
        reply: "You can use PathFinder by simply asking a question. The chatbot will respond instantly or forward your query to an admin."
      },
      {
        triggers: whyTriggers,
        reply: "PathFinder exists to make support simple, fast, and always available for users who need help."
      },
      {
        triggers: whoTriggers,
        reply: "PathFinder is developed by a researcher named Engilbert Ollero Sarino, Bryanjohn Vistar, Jerone Louise Velebrado and Andrew Garcia with the guidance of their adviser, Cloie May Beatrize Estiandan"
      }
    ];

    // Check each FAQ group
    for (const f of faq) {
      if (f.triggers.includes(normalized)) {
        const reply = f.reply;

        // Stop sending… indicator
        if (activeChat === "bot") setIsSendingBot(false);
        else setIsSendingAdmin(false);

        // Show typing
        setIsBotTyping(true);
        await new Promise(res => setTimeout(res, 6000));
        setIsBotTyping(false);

        // Push reply to chat
        setMessages(prev => [...prev, { sender: "bot", text: reply }]);

        return; // ⛔ STOP — NO API CALL
      }
    }

    // -----------------------------
    // BOT CHAT (API)
    // -----------------------------
    if (activeChat === "bot") {
      const response = await axios.post(
        "https://toothy-cephalic-makena.ngrok-free.dev/chat",
        { user_id: userId, message: userMessage }
      );

      reply = response.data.reply || "...";

      // End Sending…
      setIsSendingBot(false);

      // Show typing dots
      setIsBotTyping(true);
      await new Promise(res => setTimeout(res, 900));
      setIsBotTyping(false);

      setMessages(prev => [...prev, { sender: "bot", text: reply }]);

      // Mini bubble if chat is closed
      if (!isOpen) {
        setMiniMessage(reply);
        setShowMiniBubble(true);
        setShake(true);
        setTimeout(() => setShake(false), 400);

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setShowMiniBubble(false), 5000);
      }

      return;
    }

    // -----------------------------
    // ADMIN CHAT
    // -----------------------------
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/admin-chat/`,
      {
        user_id: userId,
        conversation_id: adminConversationId ?? undefined,
        message: userMessage
      }
    );

    if (res.data.conversation_id) {
      setAdminConversationId(res.data.conversation_id);
    }

    reply = res.data.reply || "Message sent to admin.";

    setIsSendingAdmin(false);

    // Admin does NOT use typing delay
    setMessages(prev => [...prev, { sender: "bot", text: reply }]);
  } catch (err) {
    if (activeChat === "bot") setIsSendingBot(false);
    else setIsSendingAdmin(false);

    setMessages(prev => [
      ...prev,
      { sender: "bot", text: "⚠️ Server unavailable. Try later." }
    ]);
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
    // ⭐ Pick 3 random unique prompts
    const shuffled = [...SUGGESTED_PROMPTS].sort(() => 0.5 - Math.random());
    setRandomPrompts(shuffled.slice(0, 3));
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

  const SUGGESTED_PROMPTS = [
    "What is Pathfinder?",
    "How does Pathfinder work?",
    "Who is involved in Pathfinder?",
    "Why should I use Pathfinder?",
    "How to use this system?",
    "What is this system about?",
    "What can you do?",
  ];
  // ONLY send suggested prompts to the BOT, never to admin
  const sendSuggested = (msg: string) => {
    if (activeChat !== "bot") {
      // force switch to bot tab if needed
      setActiveChat("bot");
    }

    setInput(""); // clear input box
    sendMessage(msg); // instantly execute send (bot-only)
  };

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
            animate={shake ? "shake" : ""}
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
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25 }}
           className="fixed bottom-0 right-0 left-0 md:bottom-6 md:right-6 md:left-auto 
            w-full md:w-[480px] lg:w-[560px] 
            h-[85vh] md:h-[580px] 
            bg-white/95 backdrop-blur-md rounded-none md:rounded-3xl shadow-2xl border border-[#E0D4C2] flex flex-col overflow-hidden z-50"

          >

          {/* Header */}
          <div className="bg-gradient-to-r from-[#6D4C41] to-[#4E342E] text-white p-5 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex gap-3">
              <button
                onClick={() => setActiveChat('bot')}
                className={`px-3 py-2 rounded-lg text-xl ${
                  activeChat === 'bot' ? 'bg-white text-[#4E342E]' : 'text-gray-200'
                }`}
              >
                Chatbot
              </button>

              <button
                onClick={() => setActiveChat('admin')}
                className={`px-3 py-2 rounded-lg text-xl ${
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
            {/* BOT TYPING INDICATOR (after sending indicator finishes) */}
            {activeChat === "bot" && isBotTyping && (
              <div className="flex justify-start">
                <div className="px-5 py-3 rounded-2xl bg-[#EFE6DD] text-[#3E2723] shadow text-lg flex gap-2">
                  <span className="animate-bounce">•</span>
                  <span className="animate-bounce delay-100">•</span>
                  <span className="animate-bounce delay-200">•</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {activeChat === "bot" && (
            <div className="px-5 pb-2 pt-3 bg-white/90 flex flex-wrap gap-2 z-50">
              {randomPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendSuggested(prompt)}
                  className="
                    text-sm px-3 py-2 rounded-full
                    bg-[#EFE6DD] text-[#3E2723]
                    border border-[#D6C7B2]
                    hover:bg-[#E0D4C2]
                    transition-all shadow-sm
                  "
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          {/* Slash Command Popup */}
          {showCommandPopup && filteredCommands.length > 0 && activeChat === "bot" && (
            <div className="absolute bottom-28 left-0 w-full px-6 z-[999]">
              <div className="bg-white border border-gray-300 rounded-xl shadow-lg p-3">
                {filteredCommands.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(c.cmd + " ");
                      setShowCommandPopup(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 flex flex-col"
                  >
                    <span className="font-semibold">{c.cmd}</span>
                    <span className="text-gray-600 text-sm">{c.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
         {/* Input */}
          <div className="p-5 border-t border-gray-200 flex items-center gap-4 bg-white/95 backdrop-blur-sm">
            <input
              type="text"
              value={input}
              onChange={(e) => {
              const val = e.target.value;
              setInput(val);

              if (val.startsWith("/")) {
                const filter = val.toLowerCase();
                setFilteredCommands(
                  COMMANDS.filter(c => c.cmd.startsWith(filter))
                );
                setShowCommandPopup(true);
              } else {
                setShowCommandPopup(false);
              }
            }}

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
              onClick={
                !(activeChat === "bot" ? isSendingBot : isSendingAdmin)
                  ? () => sendMessage()
                  : undefined
              }
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

