'use client';
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FaChartLine,
  FaUtensils,
  FaPaintBrush,
  FaQuestionCircle,
  FaHeartbeat,
  FaBalanceScale,
  FaMicroscope,
  FaGlobe,
} from "react-icons/fa";
import {
  FaBars, FaHome, FaComment, FaCog, FaChevronDown, FaChevronUp, FaUser, FaComments,
  FaLaptopCode, FaBriefcase, FaCogs, FaDraftingCompass, FaStar, FaCoffee, FaSignOutAlt
} from 'react-icons/fa';
import Image from 'next/image';
import Logo from '@/public/PATHFINDER-logo-edited.png';
import axios from 'axios';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  LineElement, CategoryScale, LinearScale, BarElement, PointElement
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import LogoutConfirmationModal from '@/app/components/LogoutConfirmationModal';
import { Listbox, Portal } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';


ChartJS.register(
  ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, BarElement, PointElement
);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
// ⬆️ VERY TOP OF FILE

interface UserItem {
  user_id: number;
  fullname: string;
}

interface ChatMessage {
  id: number;
  sender: string;
  text: string;
}

export default function AdminDashboard() {
  // 🟢 New state for Category Type selection
  const [activeCategoryType, setActiveCategoryType] = useState<string | null>(null);
  const [selectedCategoryType, setSelectedCategoryType] = useState<string | null>(null);

  // 🟢 Predefined category types (Bloom’s taxonomy)
  const categoryTypes = [
    "Remembering",
    "Understanding",
    "Applying",
    "Analyzing",
    "Evaluating",
  ];
  const [feedbackChartData, setFeedbackChartData] = useState<number[]>([0, 0, 0, 0, 0]);
  const [loadingFeedbackChart, setLoadingFeedbackChart] = useState(true);
  const [feedbacks, setFeedbacks] = useState<
  { feedback_id: number; username: string; rating: number; comment: string; created_at: string }[]
  >([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const router = useRouter();
  const { logout } = useAuth();
  const [registeredUsers, setRegisteredUsers] = useState<
    {
      user_id: number;
      username: string;
      email: string;
      first_name: string;
      middle_name?: string | null;
      last_name: string;
      extension?: string | null;
      strand: string;
      top_3_knowledge: { subject: string; percentage: string }[];
      recommended_programs: { program_name: string; program_details: string; rank: number }[];
      top_3_personality?: { type: string; confidence: string }[]; // 🆕 add this
    }[]
  >([]);



  const [newKnowledgeTimer, setNewKnowledgeTimer] = useState<number>(0); // or null
  const [editedKnowledgeTimer, setEditedKnowledgeTimer] = useState<number>(30);

  // ------------------ 🧠 STATE VARIABLES ------------------
  const [originalOption, setOriginalOption] = useState(''); // option before edit
  const [updatedOption, setUpdatedOption] = useState('');   // new option value

  // consistent hook order
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [questions, setQuestions] = useState<
    { personality_test_id: number; personality_id: number; personality_type: string; questions: string }[]
  >([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar initially closed
  const [activePage, setActivePage] = useState('Dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<string>('');
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => () => {});
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [isAddCollegeFormVisible, setIsAddCollegeFormVisible] = useState(false);
  const [isAddProgramFormVisible, setIsAddProgramFormVisible] = useState(false);
  const [newCollege, setNewCollege] = useState('');
  const [newProgram, setNewProgram] = useState('');
  const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false); // Add state for logout modal
  const [knowledgeTestQuestions, setKnowledgeTestQuestions] = useState<
    Record<
      string,
      {
        id: number;
        text: string;
        options: string[];
        correctAnswer: string;
        knowledge_type: string;
        category: string;
        category_type?: string; // ✅ Add this line
        timer?: number;         // ✅ Optional but recommended
      }[]
    >
  >({});
  const [activeKnowledgeType, setActiveKnowledgeType] = useState<string | null>(null); // General or Specific
  const [activeKnowledgeCategory, setActiveKnowledgeCategory] = useState<string | null>(null);
  const [newKnowledgeQuestion, setNewKnowledgeQuestion] = useState<string>('');
  const [newKnowledgeOptions, setNewKnowledgeOptions] = useState<string[]>(['', '', '', '']);
  const [newKnowledgeCorrectAnswer, setNewKnowledgeCorrectAnswer] = useState<string>('');
  const [editingKnowledgeIndex, setEditingKnowledgeIndex] = useState<number | null>(null);
  const [editedKnowledgeQuestion, setEditedKnowledgeQuestion] = useState<string>('');
  const [editedKnowledgeOptions, setEditedKnowledgeOptions] = useState<string[]>(['', '', '', '']);
  const [editedKnowledgeCorrectAnswer, setEditedKnowledgeCorrectAnswer] = useState<string>('');

  const [selectedStrand, setSelectedStrand] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  interface SubjectRecord {
    subjects: string;
    categories: string[]; // ✅ now supports multiple categories
  }
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [newSubject, setNewSubject] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const subjectCategories = [
  'Mathematics',
  'English',
  'Filipino',
  'Science',
  'Reading_Comprehension',
  'Logical_Reasoning',
  'Technology',
  'Engineering',
  'Accountancy',
  'Business',
  'Management',
  'Humanities',
  'Social_Science',
];
  const [selectedFeedback, setSelectedFeedback] = useState<{
    feedback_id: number;
    username: string;
    rating: number;
    comment: string;
    created_at: string;
  } | null>(null);

  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [editedProgramDetails, setEditedProgramDetails] = useState<string>('');
  const [newPersonalityType, setNewPersonalityType] = useState<string>('');
  const [editedPersonalityType, setEditedPersonalityType] = useState<string>('');
  const [strandData, setStrandData] = useState<{ strand: string; user_count: number }[]>([]);
  const [loadingStrandData, setLoadingStrandData] = useState(true);
  const [userTimeline, setUserTimeline] = useState<{ date: string; total_users: number }[]>([]);
  const [topPrograms, setTopPrograms] = useState<
  { program_id: number; program_name: string; program_details: string | null; count: number }[]
>([]);
  const [loadingTopPrograms, setLoadingTopPrograms] = useState(true);
  // State and fetching logic

  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [chatConversationId, setChatConversationId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [conversations, setConversations] = useState<
    {
      conversation_id: number;
      user_id: number;
      fullname: string;
      last_message: string;
      last_sender: string;
    }[]
  >([]);
  const [isSending, setIsSending] = useState(false);
  const lastMessageIdRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  type TestStatsType = {
    finished: { [month: number]: number };
    unfinished: { [month: number]: number };
  };

  const [testStats, setTestStats] = useState<TestStatsType>({
    finished: {},
    unfinished: {}
  });

  const [loadingTestStats, setLoadingTestStats] = useState(true);


  useEffect(() => {
  const fetchTestStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-completion-stats`);
      const data = await res.json();
      setTestStats(data);
    } catch (err) {
      console.error("Failed to fetch test stats", err);
    } finally {
      setLoadingTestStats(false);
    }
  };

  fetchTestStats();
}, []);

  // AUTO SCROLL
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // LOAD CONVERSATION LIST ONCE
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/admin-chat/conversations`);
        setConversations(res.data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    fetchConversations();
  }, []);


  useEffect(() => {
    if (!chatConversationId) return;

    const interval = setInterval(async () => {
      try {
        const lastId = lastMessageIdRef.current;

        const res = await axios.get(
          `${API_BASE_URL}/admin-chat/check-new/${chatConversationId}/${lastId}`
        );

        if (res.data.new === true) {
          const msgRes = await axios.get(
            `${API_BASE_URL}/admin-chat/conversation/${chatConversationId}`
          );

          const messages = msgRes.data.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender,
            text: m.message,
            created_at: m.created_at,
          }));

          setChatMessages(messages);

          // Update persistent last ID
          lastMessageIdRef.current =
            messages.length > 0 ? messages[messages.length - 1].id : 0;
        }
      } catch (err) {
        console.error("Polling failed:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [chatConversationId]);

  useEffect(() => {
      const fetchTopPrograms = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/top-programs`);
          if (!res.ok) throw new Error("Failed to fetch top programs");
          const data = await res.json();
          setTopPrograms(data);
        } catch (error) {
          console.error("Error fetching top programs:", error);
        } finally {
          setLoadingTopPrograms(false);
        }
      };

      fetchTopPrograms();
    }, []);

  useEffect(() => {
    const fetchTopStrands = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/top-strands`);
        setStrandData(response.data || []);
      } catch (error) {
        console.error("Error fetching strand data:", error);
      } finally {
        setLoadingStrandData(false);
      }
    };

    fetchTopStrands();
  }, []);

  
  useEffect(() => {
    const fetchUserTimeline = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/total-users-timeline`);
        setUserTimeline(response.data);
      } catch (error) {
        console.error("Error fetching total user timeline:", error);
      }
    };
    fetchUserTimeline();
  }, []);

  

  // OPEN A CONVERSATION
  const openConversation = async (conversationId: number, userId: number) => {
    setSelectedUser(userId);
    setChatConversationId(conversationId);

    const res = await axios.get(
      `${API_BASE_URL}/admin-chat/conversation/${conversationId}`
    );

    const msgs = res.data.messages.map((m: any) => ({
      id: m.id,
      sender: m.sender,
      text: m.message,
      created_at: m.created_at,
    }));

    setChatMessages(msgs);

    // Update last ID
    lastMessageIdRef.current =
      msgs.length > 0 ? msgs[msgs.length - 1].id : 0;
  };

  const sendAdminMessage = async () => {
    if (!chatInput.trim() || !chatConversationId) return;

    const message = chatInput;
    setChatInput("");

    // Temporary ID (increment last ID)
    const tempId = Date.now();
    // Show UI message instantly
    setChatMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender: "admin",
        text: message,
        created_at: new Date().toISOString(),
      },
    ]);

    lastMessageIdRef.current = tempId;

    setIsSending(true);

    await axios.post(`${API_BASE_URL}/admin-chat/reply`, {
      conversation_id: chatConversationId,
      message,
    });

    setIsSending(false);
  };


  const totalUsersData = {
    labels: userTimeline.map((d) => d.date),
    datasets: [
      {
        label: 'Total Users',
        data: userTimeline.map((d) => d.total_users),
        fill: true,
        borderColor: '#8C5A3C',
        backgroundColor: 'rgba(140, 90, 60, 0.2)',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#8C5A3C',
      },
    ],
  };

  const handleConfirmAddPersonalityQuestion = async () => {
    if (!newPersonalityType || !newQuestion.trim()) {
      alert('Please fill in both personality type and question.');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE_URL}/api/personality-questions`, {
        personality_type: newPersonalityType,
        questions: newQuestion.trim(),
      });
      setQuestions([...questions, res.data]);
      setNewQuestion('');
      setNewPersonalityType('');
      setIsAddFormVisible(false);
      closeConfirmModal();
    } catch (error) {
      console.error('Failed to add question:', error);
    }
  };

  const handleSavePersonalityEdit = async () => {
    if (editingIndex === null) return;
    try {
      await axios.put(`${API_BASE_URL}/api/personality-questions/${editingIndex}`, {
        personality_type: editedPersonalityType,
        questions: editedQuestion,
      });
      setQuestions(
        questions.map((q) =>
          q.personality_test_id === editingIndex
            ? { ...q, personality_type: editedPersonalityType, questions: editedQuestion }
            : q
        )
      );
      setEditingIndex(null);
      closeConfirmModal();
    } catch (error) {
      console.error('Failed to save edit:', error);
    }
  };

  const handleDeletePersonalityQuestion = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/personality-questions/${id}`);
      setQuestions(questions.filter((q) => q.personality_test_id !== id));
      setEditingIndex(null);
      closeConfirmModal();
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };


  const pieData = {
    labels: ['STEM', 'ABM', 'HUMSS'], // Labels for the chart
    datasets: [
      {
        data: [40, 30, 30], // Example data
        backgroundColor: ['#6F4E37', '#A67B5B', '#E4C59E'], // STEM: Brown-700, ABM: Brown-6, HUMSS: Light Brown
      },
    ],
  };

  const pieOptions = {
    plugins: {
      legend: {
        position: 'left' as const, // Use 'as const' to fix TypeScript error
        labels: {
          usePointStyle: true, // Circular legend
          pointStyle: 'circle',
          boxWidth: 8, // Smaller circle size
          padding: 15, // Add spacing between legend items
          color: '#000', // Legend text color
        },
      },
    },
    maintainAspectRatio: false, // Allow resizing
  };

 const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul",
                     "Aug", "Sep", "Oct", "Nov", "Dec"];

  const finishedData = monthLabels.map((_, i) => (testStats.finished?.[i + 1] ?? 0));
  const unfinishedData = monthLabels.map((_, i) => (testStats.unfinished?.[i + 1] ?? 0));

  const stackedLineData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Finished Tests',
        data: finishedData,
        borderColor: '#6F4E37',
        backgroundColor: '#6F4E37',
      },
      {
        label: 'Unfinished Tests',
        data: unfinishedData,
        borderColor: '#A67B5B',
        backgroundColor: '#A67B5B',
      },
    ],
  };


  const stackedLineOptions = {
    plugins: {
      legend: {
        position: 'top' as const, // Use 'as const' to fix TypeScript error
        labels: {
          usePointStyle: true, // Use circular markers for legend
          pointStyle: 'circle',
          boxWidth: 8, // Smaller circle size
          padding: 15, // Add spacing between legend items
          color: '#000', // Legend text color
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'], // Example months
    datasets: [
      {
        label: 'Total Users',
        data: [100, 140, 150, 130, 180],
        borderColor: '#6F4E37',
        backgroundColor: '#6F4E37',
        fill: true,
      },
    ],
  };

  const barData = {
    labels: ['1', '2', '3', '4', '5'],
    datasets: [
      {
        label: 'Feedback Count',
        data: feedbackChartData,
        backgroundColor: ['#A67B5B', '#C89F75', '#E4C59E', '#EAD9B7', '#F5EEDC'],
        borderRadius: 6,
      },
    ],
  };
  interface FeedbackEntry {
    feedback_id: number;
    username: string;
    rating: number;
    comment: string;
    created_at: string;
  }

  useEffect(() => {
    const fetchFeedbackChart = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/feedback`);
        if (res.data.success && Array.isArray(res.data.feedback)) {
          const feedbackList: FeedbackEntry[] = res.data.feedback;

          // 🧮 Count number of ratings for each star (1–5)
          const counts = [1, 2, 3, 4, 5].map(
            (rating) => feedbackList.filter((f: FeedbackEntry) => f.rating === rating).length
          );

          setFeedbackChartData(counts);
        } else {
          console.warn("⚠️ Unexpected feedback API response:", res.data);
        }
      } catch (err) {
        console.error("❌ Failed to load feedback chart data:", err);
      } finally {
        setLoadingFeedbackChart(false);
      }
    };

    fetchFeedbackChart();
  }, []);

  useEffect(() => {
    if (activePage !== 'Feedback') return;

    const fetchFeedbacks = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/feedback`);
        if (res.data.success && Array.isArray(res.data.feedback)) {
          setFeedbacks(res.data.feedback);
        } else {
          setFeedbacks([]);
        }
      } catch (err) {
        console.error("❌ Error fetching feedbacks:", err);
        setFeedbacks([]);
      } finally {
        setLoadingFeedback(false);
      }
    };

    fetchFeedbacks();
  }, [activePage]);

  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/registered-users`);
        setRegisteredUsers(response.data);
      } catch (err) {
        console.error("❌ Failed to load registered users:", err);
      }
    };
    fetchRegisteredUsers();
  }, []);
  const [openKnowledgeDropdown, setOpenKnowledgeDropdown] = useState<number | null>(null);
  const [openProgramDropdown, setOpenProgramDropdown] = useState<number | null>(null);
  const [openPersonalityDropdown, setOpenPersonalityDropdown] = useState<number | null>(null);



  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/personality-questions`);
        if (response.status === 200 && Array.isArray(response.data)) {
          setQuestions(response.data);
        } else {
          console.error('Unexpected API response:', response);
          setQuestions([]);
        }
      } catch (error) {
        console.error('Failed to fetch personality questions:', error);
        setQuestions([]);
      }
    };
    fetchQuestions();
  }, []);

  useEffect(() => {
    const fetchKnowledgeQuestions = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/knowledge-questions`);
        const data = response.data;

        const categorizedData: Record<
          string,
          {
            id: number;
            text: string;
            options: string[];
            correctAnswer: string;
            knowledge_type: string;
            category: string;
            category_type?: string; // 🟢 Add this line
            timer?: number;
          }[]
        > = {};

        data.forEach((q: any) => {
          const key = `${q.knowledge_type} - ${q.category}`;
          if (!categorizedData[key]) categorizedData[key] = [];

         categorizedData[key].push({
          id: q.knowledge_id,
          text: q.question,
          options: q.options || [],
          correctAnswer: q.answer,
          knowledge_type: q.knowledge_type,
          category: q.category,
          category_type: q.category_type,
          timer: Number(q.timer) ?? 60, // ✅ make sure it's a number
        });

        console.log(`Loaded ${q.question}: timer=${q.timer}`);
        });

        setKnowledgeTestQuestions(categorizedData);
        console.log("✅ Loaded knowledge data:", categorizedData);
      } catch (err) {
        console.error("❌ Error fetching knowledge questions:", err);
      }
    };

    fetchKnowledgeQuestions();
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedStrand || !selectedSemester) {
        console.warn('No strand or semester selected. Skipping fetch.');
        return;
      }

      try {
        const [grade, sem] = selectedSemester.split(' - ');
        const gradeLevel = grade.includes('11') ? 11 : 12;
        const semester = sem.includes('First') ? 1 : 2;

        console.log('Fetching subjects with:', { strand: selectedStrand, grade_level: gradeLevel, semester });
 
        const response = await axios.get(`${API_BASE_URL}/api/scholastic-records`, {
          params: {
            strand: selectedStrand,
            grade_level: gradeLevel,
            semester: semester,
          },
        });

        if (response.status === 200 && Array.isArray(response.data)) {
          console.log('Subjects Fetched:', response.data);
          setSubjects(response.data); // Update subjects with data from the database
        } else {
          console.error('Unexpected API response:', response);
          setSubjects([]); // Set to an empty array if the response is invalid
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.error('API returned 404: Resource not found. Check backend route or database.');
          alert('No subjects found for the selected parameters. Please verify your selection.');
        } else {
          console.error('Failed to fetch subjects:', error);
          alert('Failed to fetch subjects. Please try again later.');
        }
        setSubjects([]); // Reset subjects to an empty array on error
      }
    };

    fetchSubjects();
  }, [selectedStrand, selectedSemester]);

  useEffect(() => {
    // Reset edit state when switching programs
    setIsEditingProgram(false);
    setEditedProgramDetails('');
  }, [activePage]);

    // ✅ Unified useEffect for all auth logic
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const roleId = localStorage.getItem('role_id');
    const email = localStorage.getItem('user_email') || localStorage.getItem('email');

    if (!token || roleId !== '1') {
      setIsAuthorized(false);
      return;
    }

    setAdminEmail(email || 'Administrator');
    setIsAuthorized(true);
  }, []);

  // Separate effect handles unauthorized redirect cleanly
// ✅ Single safe redirect handler
  useEffect(() => {
    if (isAuthorized === false) {
      const timeout = setTimeout(() => {
        alert('Access denied. Admins only.');
        router.push('/');
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isAuthorized, router]);

  // ⏳ Loading screen
  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-brown-1 text-brown-6 text-2xl font-semibold">
        Checking authentication...
      </div>
    );
  }

  // 🚷 Return nothing while redirecting unauthorized user
  if (isAuthorized === false) {
    return (
      <div className="flex items-center justify-center h-screen bg-brown-1 text-red-700 text-2xl font-semibold">
        Redirecting to homepage...
      </div>
    );
  }

  const resetState = () => {
    setEditingIndex(null);
    setEditedQuestion('');
    setNewQuestion('');
    setIsAddFormVisible(false);
    setEditingKnowledgeIndex(null);
    setEditedKnowledgeQuestion('');
    setEditedKnowledgeOptions(['', '', '', '']);
    setEditedKnowledgeCorrectAnswer('');
    setActiveKnowledgeType(null);
    setActiveKnowledgeCategory(null);
    setSelectedStrand(null);
    setSelectedSemester(null);
    setSubjects([]);
    setNewSubject('');
  };

  const handleSidebarClick = (page: string) => {
    resetState();
    setActivePage(page);
    if (page === 'Feedback') {
      setSelectedFeedback(null); // Reset feedback form to show buttons
    }
  };

  const toggleSidebar = () => {
    if (!isSidebarOpen) {
      setIsSettingsOpen(false);
    }
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleEditClick = (id: number) => {
    const questionToEdit = questions.find((q) => q.personality_test_id === id);
    if (questionToEdit) {
      setEditingIndex(id);
      setEditedQuestion(questionToEdit.questions);
      setEditedPersonalityType(questionToEdit.personality_type);
    }
  };

  const openConfirmModal = (action: () => void) => {
    setConfirmAction(() => action);
    setIsConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setConfirmAction(() => () => {});
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedQuestion('');
  };

  const handleAddKnowledgeQuestion = async () => {
    if (!activeKnowledgeCategory) return;

    if (
      !newKnowledgeQuestion.trim() ||
      newKnowledgeOptions.some((opt) => !opt.trim()) ||
      !newKnowledgeCorrectAnswer.trim()
    ) {
      alert("Question, all options, and the correct answer must be filled.");
      return;
    }

    if (!newKnowledgeOptions.includes(newKnowledgeCorrectAnswer)) {
      alert("The correct answer must match one of the options.");
      return;
    }

    const requestData = {
      knowledge_type: activeKnowledgeType,
      category: activeKnowledgeCategory?.split(" - ")[1] || activeKnowledgeCategory, // ✅ Extracts clean category
      category_type: activeCategoryType || selectedCategoryType,
      question: newKnowledgeQuestion.trim(),
      options: newKnowledgeOptions,
      answer: newKnowledgeCorrectAnswer,
      timer: newKnowledgeTimer || 60, // include timer
    };

    try {
      // 🟢 Add new question
      await axios.post(`${API_BASE_URL}/api/knowledge-questions`, requestData);

      // 🔁 Re-fetch updated list to refresh frontend
      const refreshed = await axios.get(`${API_BASE_URL}/api/knowledge-questions`);
      const data = refreshed.data;

      // 🔄 Rebuild grouped knowledge questions
      const categorizedData: Record<
        string,
        {
          id: number;
          text: string;
          options: string[];
          correctAnswer: string;
          knowledge_type: string;
          category: string;
          category_type: string; // 🟢 add this
          timer?: number;
        }[]
      > = {};

      data.forEach((q: any) => {
        const key = `${q.knowledge_type} - ${q.category}`;
        if (!categorizedData[key]) categorizedData[key] = [];

        categorizedData[key].push({
          id: q.knowledge_id,
          text: q.question,
          options: q.options || [],
          correctAnswer: q.answer,
          knowledge_type: q.knowledge_type,
          category: q.category,
          category_type: q.category_type, // 🟢 include this
          timer: q.timer,
        });

      });

      // Update UI
      setKnowledgeTestQuestions(categorizedData);
      setNewKnowledgeQuestion("");
      setNewKnowledgeOptions(["", "", "", ""]);
      setNewKnowledgeCorrectAnswer("");
      setNewKnowledgeTimer(0);
      setIsAddFormVisible(false);

      alert("Question added successfully!");
    } catch (error) {
      console.error("Failed to add question:", error);
      alert("Failed to add question. Please try again.");
    }
  };

  const handleConfirmAddKnowledgeQuestion = () => {
    handleAddKnowledgeQuestion();
    closeConfirmModal();
  };

  // 🧩 Handle when user clicks "Edit" on a question
  const handleEditKnowledgeQuestion = (category: string, index: number) => {
    const question = knowledgeTestQuestions[category][index];
    console.log("🧠 Editing question:", question);

    setActiveKnowledgeCategory(category);
    setEditingKnowledgeIndex(index);

    setEditedKnowledgeQuestion(question.text);
    setEditedKnowledgeOptions([...question.options]);
    setEditedKnowledgeCorrectAnswer(question.correctAnswer);
    setEditedKnowledgeTimer(question.timer ?? 60); // ✅ safe default
  };



  // 🧠 When user clicks on an option (to edit only that option)
  const handleOptionClick = (option: string) => {
    setOriginalOption(option);
    setUpdatedOption(option); // Prefill the field
  };

  
  // 💾 Save edited question or option
  const handleSaveKnowledgeEdit = async () => {
    if (!activeKnowledgeCategory || editingKnowledgeIndex === null) return;
    setIsSaving(true);
    try {
      const questionToEdit = knowledgeTestQuestions[activeKnowledgeCategory][editingKnowledgeIndex];

      // Prepare updated local question object
      const updatedQuestion = {
        ...questionToEdit,
        text: editedKnowledgeQuestion,
        options: editedKnowledgeOptions.map((opt) =>
          opt === originalOption ? updatedOption : opt
        ),
        correctAnswer: editedKnowledgeCorrectAnswer,
        timer: editedKnowledgeTimer, // ✅ include timer
      };

      try {
        await axios.put(`${API_BASE_URL}/api/knowledge-questions/${questionToEdit.id}`, {
          question: editedKnowledgeQuestion,
          answer: editedKnowledgeCorrectAnswer,
          old_option: originalOption || null,
          new_option: updatedOption || null,
          timer: editedKnowledgeTimer,
        });

        // Update frontend state
        setKnowledgeTestQuestions((prev) => ({
          ...prev,
          [activeKnowledgeCategory]: prev[activeKnowledgeCategory].map((q, index) =>
            index === editingKnowledgeIndex ? updatedQuestion : q
          ),
        }));

        // Reset everything
        setEditingKnowledgeIndex(null);
        setEditedKnowledgeQuestion('');
        setEditedKnowledgeOptions(['']);
        setEditedKnowledgeCorrectAnswer('');
        setEditedKnowledgeTimer(0); // ✅ reset timer field
        setOriginalOption('');
        setUpdatedOption('');

        alert('Question updated successfully!');
      } catch (error) {
        console.error('Failed to update question:', error);
        alert('Failed to update question. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };


  const handleConfirmSaveKnowledgeEdit = () => {
    handleSaveKnowledgeEdit();
    closeConfirmModal();
  };

  const handleDeleteKnowledgeQuestion = async (index: number) => {
    if (!activeKnowledgeCategory) return;
    const questionToDelete = knowledgeTestQuestions[activeKnowledgeCategory][index];
    try {
      await axios.delete(`${API_BASE_URL}/api/knowledge-questions?id=${questionToDelete.id}`);
      setKnowledgeTestQuestions((prev) => ({
        ...prev,
        [activeKnowledgeCategory]: prev[activeKnowledgeCategory].filter((_, i) => i !== index),
      }));
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const handleConfirmDeleteKnowledgeQuestion = (index: number) => {
    handleDeleteKnowledgeQuestion(index);
    setEditingKnowledgeIndex(null); // Close the edit form
    closeConfirmModal(); // Close the confirmation modal
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page refresh
    if (!newSubject.trim()) {
      alert('Subject cannot be empty.');
      return;
    }
  
    openConfirmModal(async () => {
      try {
        if (!selectedStrand || !selectedSemester) {
          throw new Error('Strand or semester is not selected.');
        }
  
        const gradeLevel = selectedSemester.includes('11') ? 11 : 12;
        const semester = selectedSemester.includes('First') ? 1 : 2;

        const response = await axios.post(`${API_BASE_URL}/api/scholastic-records`, {
          strand: selectedStrand,
          grade_level: gradeLevel,
          semester: semester,
          subject: newSubject.trim(),
          category: selectedCategories, // ✅ now an array
        });
        
        if (response.status === 201) {
          setSubjects([
            ...subjects,
            { subjects: newSubject.trim(), categories: selectedCategories },
          ]);
        }
      } catch (error) {
        console.error('Failed to add subject:', error);
        alert('Failed to add subject. Please try again.');
      }
      closeConfirmModal();
      setNewSubject(''); // Clear the input field after confirmation
      setSelectedCategories([]); // Clear the category selection
    });
  };
  
  const handleDeleteSubject = (index: number) => {
    openConfirmModal(async () => {
      try {
        if (!selectedStrand || !selectedSemester) {
          throw new Error('Strand or semester is not selected.');
        }
  
        const gradeLevel = selectedSemester.includes('11') ? 11 : 12;
        const semester = selectedSemester.includes('First') ? 1 : 2;

        const response = await axios.delete(`${API_BASE_URL}/api/scholastic-records`, {
          data: {
            strand: selectedStrand,
            grade_level: gradeLevel,
            semester: semester,
            subject: subjects[index].subjects,
          },
        });
  
        if (response.status === 204) {
          setSubjects(subjects.filter((_, i) => i !== index));
        }
      } catch (error) {
        console.error('Failed to delete subject:', error);
        alert('Failed to delete subject. Please try again.');
      }
      closeConfirmModal();
      setEditingIndex(null); // Close the edit form
      setNewSubject(''); // Clear the input field after deletion
    });
  };
  
  const handleEditSubject = (index: number) => {
    setEditingIndex(index);

    const subjectToEdit = subjects[index]; // ✅ object { subjects, category }
    setNewSubject(subjectToEdit.subjects); // ✅ only set the subject string
    setSelectedCategories(subjectToEdit.categories || []);
  };


  const closeEditSubjectForm = () => {
    setEditingIndex(null); // Close the edit form
    setNewSubject(''); // Clear the input field
  };
  
  const handleSaveEditedSubject = () => {
    if (!newSubject.trim()) {
      alert('Subject cannot be empty.');
      return;
    }
  
    openConfirmModal(async () => {
      try {
        if (!selectedStrand || !selectedSemester) {
          throw new Error('Strand or semester is not selected.');
        }
  
        const gradeLevel = selectedSemester.includes('11') ? 11 : 12;
        const semester = selectedSemester.includes('First') ? 1 : 2;

        const response = await axios.put(`${API_BASE_URL}/api/scholastic-records`, {
          strand: selectedStrand,
          grade_level: gradeLevel,
          semester: semester,
          oldSubject: subjects[editingIndex!].subjects,
          newSubject: newSubject.trim(),
          category: selectedCategories, // ✅ now an array
        });

  
        if (response.status === 200) {
          const updatedSubjects = [...subjects];
          updatedSubjects[editingIndex!] = {
            ...updatedSubjects[editingIndex!],
            subjects: newSubject.trim(),
            categories: selectedCategories,
          };
          setSubjects(updatedSubjects);
        }
      } catch (error) {
        console.error('Failed to edit subject:', error);
        alert('Failed to edit subject. Please try again.');
      }
      closeConfirmModal();
      setEditingIndex(null); // Close the edit form
      setNewSubject(''); // Clear the input field
      setSelectedCategories([]); // Clear the category selection
    });
  };

  const handleAddCollege = () => {
    if (!newCollege.trim()) {
      alert('College name cannot be empty.');
      return;
    }
    // Logic to add the new college (e.g., API call or state update)
    setNewCollege('');
    setIsAddCollegeFormVisible(false);
  };

  const handleAddProgram = () => {
    if (!newProgram.trim()) {
      alert('Program name cannot be empty.');
      return;
    }
    // Logic to add the new program (e.g., API call or state update)
    setNewProgram('');
    setIsAddProgramFormVisible(false);
  };

  const programDetails: Record<string, string> = {
    'Bachelor of Arts in Communication': 'This program focuses on developing communication skills in various media platforms.',
    'Bachelor of Arts in Political Science': 'This program provides an understanding of political systems and governance.',
    'Bachelor of Arts in Philippine Studies': 'This program explores Philippine culture, history, and society.',
    'Bachelor of Science in Social Work': 'This program prepares students for careers in social services and community development.',
    'Bachelor of Science in Psychology': 'This program studies human behavior and mental processes.',
    'Bachelor of Science in Accountancy': 'This program trains students in financial accounting and auditing.',
    'Bachelor of Science in Management Accounting': 'This program focuses on managerial accounting and decision-making.',
    // ...add details for other programs...
  };

  const renderProgramDetails = (program: string) => (
    <div className="flex flex-col items-center min-h-screen px-8">
      <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">{program}</h1>
      <form className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-4xl">
        <textarea
          value={isEditingProgram ? editedProgramDetails : programDetails[program]}
          onChange={(e) => setEditedProgramDetails(e.target.value)}
          readOnly={!isEditingProgram}
          className="w-full p-4 border rounded-lg bg-gray-200 text-black"
          rows={6}
        />
      </form>
      {isEditingProgram ? (
        <div className="flex gap-4 mt-4 justify-end w-full max-w-4xl">
          <button
            onClick={() => {
              setEditedProgramDetails(programDetails[program]); // Discard changes
              setIsEditingProgram(false);
            }}
            className="bg-brown-1 border border-brown-6 w-20 btn-md text-xs text-black rounded-lg shadow-lg hover:bg-brown-6 hover:text-white hover:scale-95 transition-transform duration-300 transform-gpu"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              programDetails[program] = editedProgramDetails; // Save changes
              setIsEditingProgram(false);
            }}
            className="bg-brown-6 text-white rounded-lg w-20 btn-md shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setEditedProgramDetails(programDetails[program]); // Initialize edit state
            setIsEditingProgram(true);
          }}
          className="fixed bottom-8 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
        >
          Edit
        </button>
      )}
      <button
        onClick={() => setActivePage('Arts and Humanities Programs')} // Navigate back to specific program list
        className="fixed bottom-8 right-8 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
      >
        Back
      </button>
    </div>
  );

  const renderKnowledgeTestContent = () => {
    if (!activeKnowledgeType) {
      // Step 1: Show General and Specific Knowledge buttons
      return (
        <div className="flex flex-col items-center min-h-screen px-8">
          <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
            Select Knowledge Type
          </h1>
          <form className="bg-brown-1 p-6 rounded-lg shadow-lg">
            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={() => setActiveKnowledgeType('General Knowledge')}
                className="bg-brown-6 text-white rounded-lg w-40 h-40 shadow-lg hover:bg-brown-700 flex items-center justify-center text-lg font-bold hover:scale-95 transition-transform duration-300 transform-gpu"
              >
                General Knowledge
              </button>
              <button
                onClick={() => setActiveKnowledgeType('Specific Knowledge')}
                className="bg-brown-6 text-white rounded-lg w-40 h-40 shadow-lg hover:bg-brown-700 flex items-center justify-center text-lg font-bold hover:scale-95 transition-transform duration-300 transform-gpu"
              >
                Specific Knowledge
              </button>
            </div>
          </form>
        </div>
      );
    }

    if (!activeKnowledgeCategory) {
      // Step 2: Show subcategories based on selected type
      const subcategories =
        activeKnowledgeType === 'General Knowledge'
          ? [
              'Mathematics',
              'Science',
              'English',
              'Filipino',
              'Reading Comprehension',
              'Logical Reasoning',
            ]
          : [
              'Technology',
              'Engineering',
              'Accountancy',
              'Business',
              'Management',
              'Humanities',
              'Social Sciences',
            ];

      return (
        <div className="flex flex-col items-center min-h-screen px-8 relative">
          <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
            {activeKnowledgeType}
          </h1>
          <form className="bg-brown-1 p-6 rounded-lg shadow-lg">
            <div className="grid grid-cols-2 gap-6">
              {subcategories.map((subcategory) => (
                <button
                  key={subcategory}
                  onClick={() =>
                    setActiveKnowledgeCategory(
                      `${activeKnowledgeType} - ${subcategory}`
                    )
                  }
                  className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                >
                  {subcategory}
                </button>
              ))}
            </div>
          </form>
          <button
            onClick={() => setActiveKnowledgeType(null)}
            className="absolute bottom-36 right-1 w-36 bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
          >
            Back
          </button>
        </div>
      );
    }
    if (activeKnowledgeCategory && !activeCategoryType) {
      const categoryTypes = [
        "Remembering",
        "Understanding",
        "Applying",
        "Analyzing",
        "Evaluating",
      ];

      return (
        <div className="flex flex-col items-center min-h-screen px-8 relative">
          <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
            {activeKnowledgeCategory}
          </h1>

          <form className="bg-brown-1 p-6 rounded-lg shadow-lg">
            <div className="grid grid-cols-2 gap-6">
              {categoryTypes.map((type) => (
                <button
                  key={type}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveCategoryType(type);
                  }}
                  className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                >
                  {type}
                </button>
              ))}
            </div>
          </form>

          <button
            onClick={() => setActiveKnowledgeCategory(null)}
            className="absolute bottom-36 right-1 w-36 bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
          >
            Back
          </button>
        </div>
      );
    }

    if (activeKnowledgeCategory && activeCategoryType) {
      // Step 3: Show questions for the selected category
      // 🔍 Filter by selected knowledge_type
      const filteredQuestions =
        knowledgeTestQuestions[activeKnowledgeCategory]?.filter(
          (q) =>
            q.knowledge_type === activeKnowledgeType &&
            q.category_type === activeCategoryType
        ) || [];

      return (
        <div className="flex flex-col items-center min-h-screen px-8 relative">
          <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
            {activeKnowledgeCategory}
          </h1>

          {/* 🧩 Question Buttons */}
          <form className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-2xl">
            <div className="grid grid-cols-10 gap-4 mb-1">
              {filteredQuestions.map((question, index) => (
                <button
                key={question.id}
                onClick={(event) => {
                  event.preventDefault();
                  setEditingKnowledgeIndex(index);
                  setEditedKnowledgeQuestion(question.text);
                  setEditedKnowledgeOptions(question.options);
                  setEditedKnowledgeCorrectAnswer(question.correctAnswer);
                  setEditedKnowledgeTimer(question.timer ?? 60); // ✅ FIXED
                }}
                  className="w-11 h-11 bg-white border-2 text-black rounded-lg shadow hover:bg-gray-200 transition-transform duration-300 transform-gpu hover:scale-95 text-sm flex items-center justify-center"
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </form>

          {/* 🧩 Action Buttons */}
          <div className="fixed bottom-8 right-8 flex gap-5">
            <button
              onClick={(event) => {
                event.preventDefault();
                setIsAddFormVisible(true);
              }}
              className="bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Add Question
            </button>
            <button
              onClick={(event) => {
                event.preventDefault();
                setActiveCategoryType(null);
              }}
              className="bg-transparent border-brown-6 border text-black rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:text-white hover:border-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>
          </div>
          {/* 🧩 Add/Edit Modals */}
          {isAddFormVisible && (
            <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
              <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-black">Add New Question</h2>
                <textarea
                  value={newKnowledgeQuestion}
                  onChange={(e) => setNewKnowledgeQuestion(e.target.value)}
                  placeholder="Enter a new question..."
                  className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                  rows={3}
                />
                <div className="mb-4">
                  <label className="block text-black font-bold mb-2">Category Type:</label>
                  <input
                    type="text"
                    value={activeCategoryType || ""}
                    readOnly
                    className="w-full p-2 border rounded-lg bg-gray-200 text-black"
                  />
                </div>

                <div className="mb-4">
                  {newKnowledgeOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const updatedOptions = [...newKnowledgeOptions];
                          updatedOptions[index] = e.target.value;
                          setNewKnowledgeOptions(updatedOptions);
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="w-full p-2 border rounded-lg bg-gray-200 text-black"
                      />
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="block text-black font-bold mb-2">Correct Answer:</label>
                  <select
                    value={newKnowledgeCorrectAnswer}
                    onChange={(e) => setNewKnowledgeCorrectAnswer(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-gray-200 text-black"
                  >
                    <option value="" disabled>
                    </option>
                    {newKnowledgeOptions.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-black font-bold mb-2">Timer (in seconds):</label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={newKnowledgeTimer}
                    onChange={(e) => setNewKnowledgeTimer(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-gray-200 text-black"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsAddFormVisible(false)}
                    className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                    style={{
                      height: '35px',
                      width: '80px',
                      minHeight: '10px',
                      maxHeight: '50px',
                      padding: '0 10px',
                      lineHeight: '25px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => openConfirmModal(handleConfirmAddKnowledgeQuestion)}
                    className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-7 py-2 hover:bg-brown-700 hover:border-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                    style={{
                      height: '35px',
                      width: '80px',
                      minHeight: '10px',
                      maxHeight: '50px',
                      padding: '0 10px',
                      lineHeight: '25px',
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
          {editingKnowledgeIndex !== null && (
            <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
              <div className="bg-brown-1 p-8 rounded-lg shadow-lg w-full max-w-md relative">
                <button
                  onClick={() => setEditingKnowledgeIndex(null)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
                <h2 className="text-2xl font-bold mb-4 text-black">Edit Question</h2>
                <textarea
                  value={editedKnowledgeQuestion}
                  onChange={(e) => setEditedKnowledgeQuestion(e.target.value)}
                  className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                  rows={4}
                />
                <div className="mb-4">
                  {editedKnowledgeOptions.map((opt, i) => (
                    <div key={i}>
                      <input
                        value={opt === originalOption ? updatedOption : opt}
                        onClick={() => handleOptionClick(opt)}
                        onChange={(e) => {
                          if (opt === originalOption) {
                            setUpdatedOption(e.target.value);
                          } else {
                            const newOpts = [...editedKnowledgeOptions];
                            newOpts[i] = e.target.value;
                            setEditedKnowledgeOptions(newOpts);
                          }
                        }}
                        className="w-full p-2 border rounded-lg bg-gray-200 text-black mb-2"
                      />
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="block text-black font-bold mb-2">Correct Answer:</label>
                  <select
                    value={editedKnowledgeCorrectAnswer}
                    onChange={(e) => setEditedKnowledgeCorrectAnswer(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-gray-200 text-black"
                  >
                    {editedKnowledgeOptions.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                {/* ⏱ Timer Input */}
                <div className="mb-4">
                  <label className="block text-black font-bold mb-2">Timer (in seconds):</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editedKnowledgeTimer}
                    onChange={(e) => setEditedKnowledgeTimer(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-gray-200 text-black"
                  />
                </div>
                <div className="flex justify-end gap-3">
                <button
                    onClick={() => openConfirmModal(() => handleConfirmDeleteKnowledgeQuestion(editingKnowledgeIndex))}
                    className="btn btn-danger border-brown-6 bg-transparent text-black rounded px-5 py-2 hover:bg-brown-700 hover:text-white hover:border-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                    style={{
                      height: '35px',
                      width: '80px',
                      minHeight: '10px',
                      maxHeight: '50px',
                      padding: '0 10px',
                      lineHeight: '25px',
                    }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => openConfirmModal(handleConfirmSaveKnowledgeEdit)}
                    disabled={isSaving}
                    className={`px-4 py-2 rounded text-white ${
                      isSaving ? 'bg-gray-400 cursor-not-allowed' : 'btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-7 py-2 hover:bg-brown-700 hover:border-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu'
                    }`}
                    style={{
                      height: '35px',
                      width: '80px',
                      minHeight: '10px',
                      maxHeight: '50px',
                      padding: '0 10px',
                      lineHeight: '25px',
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                 
                </div>
              </div>
            </div>
          )}
          {isConfirmModalOpen && (
           <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
           <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-sm">
             <h2 className="text-[19px] font-bold mb-8 items-center pr-0 text-black text-center pt-3">
               Are you sure you want to submit?
             </h2>
             <div className="flex justify-end gap-2">
               <button
                 onClick={closeConfirmModal}
                 className="bg-transparent border border-brown-6 text-black font-bold text-lg md:text-xl lg:text-xs rounded hover:bg-brown-700 hover:text-white hover:border-brown-700"
                 style={{
                   height: '30px',
                   width: '70px',
                   minHeight: '10px',
                   maxHeight: '50px',
                   padding: '0 10px',
                   lineHeight: '25px',
                 }}
               >
                 Cancel
               </button>
               <button
                 onClick={() => {
                   confirmAction();
                 }}
                 className="btn bg-brown-6 border-brown-6 text-white rounded text-sm md:text-xl lg:text-xs hover:bg-brown-700 hover:border-brown-700"
                 style={{
                   height: '30px',
                   width: '72px',
                   minHeight: '10px',
                   maxHeight: '50px',
                   padding: '0 10px',
                   lineHeight: '25px',
                 }}
               >
                 Confirm
               </button>
             </div>
           </div>
         </div>
          )}
        </div>
      );
    }
  };

  const renderScholasticRecordContent = () => {
    if (!selectedStrand) {
      return (
        <div className="flex flex-col items-center min-h-screen px-8">
          <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">Select Strand</h1>
          <form className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-sm">
            <div className="flex flex-col gap-4">
              {['STEM', 'ABM', 'HUMSS'].map((strand) => (
                <button
                  key={strand}
                  onClick={() => setSelectedStrand(strand)}
                  className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                >
                  {strand}
                </button>
              ))}
            </div>
          </form>
        </div>
      );
    }

    if (!selectedSemester) {
      return (
        <div className="flex flex-col items-center min-h-screen px-8">
          <h1 className="text-3xl font-bold mt-2 mb-4 text-center text-black">{selectedStrand}</h1>
          <form className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-xl">
            <div className="grid grid-cols-2 gap-6">
              {['Grade 11 - First Semester', 'Grade 11 - Second Semester', 'Grade 12 - First Semester', 'Grade 12 - Second Semester'].map((semester) => (
                <button
                  key={semester}
                  onClick={() => setSelectedSemester(semester)}
                  className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                >
                  {semester}
                </button>
              ))}
            </div>
          </form>
          <button
            onClick={() => setSelectedStrand(null)}
            className="fixed bottom-8 right-8 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
          >
            Back
          </button>
        </div>
      );
    }
    // Add a back button when a semester is selected
    return (
      <div className="flex flex-col items-center min-h-screen px-8">
        <h1 className="text-3xl font-bold text-center text-black">
          {selectedStrand} - {selectedSemester}
        </h1>
        <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-xl mt-4 mb-1 flex flex-col">
        {/* Scrollable list */}
        <div className="flex-1 max-h-[300px] overflow-y-auto overflow-visible relative z-0 space-y-2 mb-4">
          <ul>
            {subjects.map((subject, index) => (
              <li key={index} className="mb-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleEditSubject(index);
                  }}
                  className="w-full text-left bg-gray-200 text-black p-2 rounded-lg hover:bg-gray-300 flex justify-between"
                >
                  <span>{subject.subjects}</span>
                  {subject.categories && subject.categories.length > 0 && (
                    <span className="text-sm text-gray-600 italic">
                      {subject.categories.join(', ')}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Add form - always visible */}
        <form onSubmit={handleAddSubject} className="flex flex-col gap-2 sticky bottom-0 bg-brown-1 pt-3 pb-2">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Add a new subject..."
            className="w-full p-2 border rounded-lg bg-gray-200 text-black"
          />

          <div className="flex flex-col gap-2">
            <label className="text-black font-semibold">Select Categories</label>
            <div className="relative">
              <Listbox value={selectedCategories} onChange={setSelectedCategories} multiple>
                {({ open }) => (
                  <>
                    {/* Trigger Button */}
                    <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-gray-200 py-2 pl-3 pr-10 text-left border focus:outline-none focus:ring-2 focus:ring-brown-6">
                      <span className="block truncate text-black">
                        {selectedCategories.length > 0
                          ? selectedCategories.join(', ')
                          : 'Select categories...'}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className={`h-5 w-5 text-gray-500 transition-transform ${
                            open ? 'rotate-180' : ''
                          }`}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </span>
                    </Listbox.Button>

                    {/* Portal for dropdown */}
                    {open && (
                      <Portal>
                        <div className="fixed inset-0 z-[9999] flex items-start justify-center pointer-events-none">
                          <div
                            className="absolute z-[9999] w-[90%] max-w-[400px] bg-white shadow-lg rounded-lg mt-1 ring-1 ring-black ring-opacity-5 pointer-events-auto"
                            style={{
                              top: `${window.scrollY + 450}px`, // manually control dropdown Y position if needed
                            }}
                          >
                            <Listbox.Options className="max-h-60 overflow-auto py-1 text-base focus:outline-none sm:text-sm">
                              {subjectCategories.map((cat) => (
                                <Listbox.Option
                                  key={cat}
                                  value={cat}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                                      active ? 'bg-brown-100 text-brown-700' : 'text-gray-900'
                                    }`
                                  }
                                >
                                  {({ selected }) => (
                                    <>
                                      <span
                                        className={`block truncate ${
                                          selected ? 'font-medium' : 'font-normal'
                                        }`}
                                      >
                                        {cat}
                                      </span>
                                      {selected ? (
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brown-600">
                                          ✓
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </div>
                        </div>
                      </Portal>
                    )}
                  </>
                )}
              </Listbox>
            </div>

            {/* Tags below */}
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedCategories.map((cat) => (
                <span
                  key={cat}
                  className="flex items-center gap-1 bg-brown-6 text-white px-3 py-1 rounded-full text-sm"
                >
                  {cat}
                  <button
                    onClick={() => setSelectedCategories(selectedCategories.filter((c) => c !== cat))}
                    className="ml-1 text-white hover:text-red-400"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="bg-brown-6 text-white rounded-lg px-4 py-2 hover:bg-brown-700 hover:scale-95 transition-transform"
          >
            Add
          </button>
        </form>
      </div>

        <button
          onClick={() => setSelectedSemester(null)}
          className="fixed bottom-8 right-8 bg-brown-6 w-36 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
        >
          Back
        </button>

        {editingIndex !== null && (
          <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
            <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md relative">
              <button
                onClick={closeEditSubjectForm}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-4 text-black">Edit Subject</h2>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full p-2 border rounded-lg bg-gray-200 text-black mb-4"
              />
              {/* ✅ Category dropdown for editing */}
              <div className="flex flex-col gap-2">
                <label className="text-black font-semibold">Select Categories</label>
                <Listbox value={selectedCategories} onChange={setSelectedCategories} multiple>
                  <div className="relative">
                    <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-gray-200 py-2 pl-3 pr-10 text-left border focus:outline-none focus:ring-2 focus:ring-brown-6">
                      <span className="block truncate text-black">
                        {selectedCategories.length > 0
                          ? selectedCategories.join(', ')
                          : 'Select categories...'}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronUpDownIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                      </span>
                    </Listbox.Button>

                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {subjectCategories.map((cat) => (
                        <Listbox.Option
                          key={cat}
                          value={cat}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                              active ? 'bg-brown-100 text-brown-700' : 'text-gray-900'
                            }`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? 'font-medium' : 'font-normal'
                                }`}
                              >
                                {cat}
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brown-600">
                                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </div>
                </Listbox>

                {/* Tag display */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCategories.map((cat) => (
                    <span
                      key={cat}
                      className="flex items-center gap-1 bg-brown-6 text-white px-3 py-1 rounded-full text-sm"
                    >
                      {cat}
                      <button
                        onClick={() =>
                          setSelectedCategories(selectedCategories.filter((c) => c !== cat))
                        }
                        className="ml-1 text-white hover:text-red-400"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => handleDeleteSubject(editingIndex)}
                  className="btn btn-danger border-brown-6 bg-transparent text-black rounded px-5 py-2 hover:bg-brown-700 hover:text-white hover:border-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                    style={{
                      height: '35px',
                      width: '80px',
                      minHeight: '10px',
                      maxHeight: '50px',
                      padding: '0 10px',
                      lineHeight: '25px',
                    }}
                >
                  Delete
                </button>
                <button
                  onClick={handleSaveEditedSubject}
                  className="btn bg-brown-6 border-brown-6 text-white rounded text-sm md:text-xl lg:text-sm hover:bg-brown-700 hover:border-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                 style={{
                   height: '35px',
                   width: '80px',
                   minHeight: '10px',
                   maxHeight: '50px',
                   padding: '0 10px',
                   lineHeight: '25px',
                 }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
        {isConfirmModalOpen && (
          <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
            <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-sm">
              <h2 className="text-[19px] font-bold mb-8 items-center pr-0 text-black text-center pt-3">
                Are you sure you want to proceed?
              </h2>
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeConfirmModal}
                  className="bg-transparent border border-brown-6 text-black font-bold text-lg md:text-xl lg:text-xs rounded hover:bg-brown-700 hover:text-white hover:border-brown-700"
                  style={{
                    height: '30px',
                    width: '70px',
                    minHeight: '10px',
                    maxHeight: '50px',
                    padding: '0 10px',
                    lineHeight: '25px',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmAction();
                  }}
                  className="btn bg-brown-6 border-brown-6 text-white rounded text-sm md:text-xl lg:text-xs hover:bg-brown-700 hover:border-brown-700"
                  style={{
                    height: '30px',
                    width: '72px',
                    minHeight: '10px',
                    maxHeight: '50px',
                    padding: '0 10px',
                    lineHeight: '25px',
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDashboardContent = () => (
    <div className="grid grid-cols-10 gap-4 p-4">
      {/* Pie Chart */}
      <div className="bg-brown-1 p-3 rounded-lg shadow-lg col-span-3">
        <h2 className="text-base font-bold mb-3 text-black">Top Strand Users</h2>
        <div className="h-48 flex justify-center items-center">
          {loadingStrandData ? (
            <p className="text-gray-600">Loading strand data...</p>
          ) : strandData.length === 0 ? (
            <p className="text-gray-600 italic">No strand data available.</p>
          ) : (
            <Pie
              data={{
                labels: strandData.map((d) => d.strand),
                datasets: [
                  {
                    label: "Users per Strand",
                    data: strandData.map((d) => d.user_count),
                    backgroundColor: [
                      "#A67C52",
                      "#C4A484",
                      "#8C5A3C",
                      "#B08B66",
                      "#D9C3A6",
                      "#E6B17E",
                      "#F0C987",
                    ],
                    borderColor: "#ffffff",
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: { color: "#000", font: { size: 12 } },
                  },
                },
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          )}
        </div>
      </div>
      {/* Stacked Line Graph */}
      <div className="bg-brown-1 p-3 rounded-lg shadow-lg col-span-7">
        <h2 className="text-base font-bold mb-3 text-black">Test Completion</h2>
        <div className="h-52 flex justify-center items-center">
          {loadingTestStats ? (
            <p className="text-gray-600 italic">Loading test completion...</p>
          ) : (
            <Line data={stackedLineData} options={stackedLineOptions} />
          )}
        </div>
      </div>
      {/* Total Users */}
      <div className="bg-brown-1 p-4 rounded-lg shadow-lg col-span-5">
        <h2 className="text-base font-bold mb-3 text-black">Total Users Over Time</h2>
        <div className="h-56">
          {userTimeline.length === 0 ? (
            <p className="text-gray-600 text-center">No user data available.</p>
          ) : (
            <Line
              data={totalUsersData}
              options={{
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: { color: '#000', font: { size: 12 } },
                  },
                },
                scales: {
                  x: {
                    ticks: { color: '#000' },
                    title: { display: true, text: 'Date', color: '#000' },
                  },
                  y: {
                    ticks: { color: '#000', precision: 0 },
                    title: { display: true, text: 'Total Users', color: '#000' },
                    beginAtZero: true,
                  },
                },
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          )}
        </div>
      </div>
      {/* Feedback */}
      <div className="bg-brown-1 p-4 rounded-lg shadow-lg col-span-3">
        <h2 className="text-base font-bold mb-3 text-black">Feedback</h2>
        <div className="h-56 w-full flex justify-center items-center">
          {loadingFeedbackChart ? (
            <p className="text-gray-600">Loading feedback chart...</p>
          ) : (
            <Bar
              data={barData}
              options={{
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.raw} user${ctx.raw === 1 ? '' : 's'}`,
                    },
                  },
                },
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    title: { display: true, text: 'Rating (Stars)', color: '#000' },
                    ticks: { color: '#000' },
                  },
                  y: {
                    title: { display: true, text: 'Number of Users', color: '#000' },
                    ticks: { color: '#000', precision: 0 },
                    beginAtZero: true,
                  },
                },
              }}
            />
          )}
        </div>
      </div>
      {/* Recommended Top Programs */}
      <div className="col-span-2 flex flex-col gap-4">
        {loadingTopPrograms ? (
          <p className="text-gray-600 italic text-center">Loading top programs...</p>
        ) : topPrograms.length === 0 ? (
          <p className="text-gray-600 italic text-center">No recommended programs available.</p>
        ) : (
          topPrograms.map((program, index) => (
            <div
              key={program.program_id}
              className="bg-gradient-to-r from-brown-2 to-brown-3 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 transform-gpu"
            >
              <h3 className="text-lg font-bold text-brown-8">
                {index + 1}. {program.program_name}
              </h3>
              <p className="text-sm text-gray-800 mt-1">
                {program.program_details || "No description available."}
              </p>
              <p className="text-xs text-gray-600 mt-2 italic">
                Recommended {program.count} time{program.count > 1 ? "s" : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <FaStar
        key={index}
        className={`w-9 h-9 ${
          index < rating ? 'text-brown-6' : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderFeedbackContent = () => (
    <div className="flex flex-col items-center min-h-screen px-8">
      <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">User Feedback</h1>

      <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-lg relative">
        {loadingFeedback ? (
          <p className="text-center text-gray-600">Loading feedback...</p>
        ) : feedbacks.length === 0 ? (
          <p className="text-center text-gray-600">No feedback available yet.</p>
        ) : !selectedFeedback ? (
          <div
            className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-brown-6 scrollbar-track-brown-2"
            style={{
              maxHeight: '450px',
              scrollbarWidth: 'thin',
            }}
          >
            {feedbacks.map((feedback, index) => (
              <button
                key={feedback.feedback_id || index}
                onClick={() => setSelectedFeedback(feedback)}
                className="w-full flex justify-between items-center border border-brown-6 bg-brown-6 text-white p-4 rounded-lg hover:scale-95 transition-transform duration-300 transform-gpu"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="font-bold text-lg">{feedback.username}</span>
                  {feedback.comment ? (
                    <span className="text-sm italic text-gray-200 truncate max-w-[220px]">
                      “{feedback.comment}”
                    </span>
                  ) : (
                    <span className="text-sm italic text-gray-400">(No comment)</span>
                  )}
                </div>

                <span className="flex items-center gap-1">
                  <FaStar className="w-6 h-6 text-yellow-300" />
                  <span className="text-lg font-semibold text-white">{feedback.rating}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <form className="space-y-4 relative">
            <button
              onClick={() => setSelectedFeedback(null)}
              type="button"
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-4 text-black text-center">
              {selectedFeedback.username}
            </h2>

            {/* ⭐ Display stars visually */}
            <div className="flex justify-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                  key={star}
                  className={`w-8 h-8 ${
                    star <= selectedFeedback.rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>

            <div>
              <label className="block text-black font-bold mb-2">Comment:</label>
              <textarea
                value={selectedFeedback.comment || 'No comment provided.'}
                readOnly
                className="w-full p-2 border rounded-lg bg-gray-200 text-black"
                rows={4}
              />
            </div>

            <p className="text-sm text-gray-600 text-center">
              Submitted on{' '}
              {selectedFeedback.created_at
                ? new Date(selectedFeedback.created_at).toLocaleString()
                : 'Unknown date'}
            </p>
          </form>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activePage) {
      case 'Dashboard':
        return renderDashboardContent();
      case 'Registered Users':
        return (
          <div className="bg-brown-1 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-black">Registered Users</h2>

            <div className="max-h-[500px] overflow-y-auto rounded-lg border border-brown-300 shadow-inner">
              <table className="min-w-full text-left text-sm text-gray-800">
                <thead className="sticky top-0 z-10 bg-brown-6 text-white shadow">
                  <tr>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Username</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Full Name</th>
                    <th className="p-3 text-left">Strand</th>
                    <th className="p-3 text-left">Personality</th>
                    <th className="p-3 text-left">Knowledge</th>
                    <th className="p-3 text-left">Program</th>
                    <th className="p-3 text-left">%</th>
                  </tr>
                </thead>
                <tbody>
                  {registeredUsers.map((user) => (
                    <tr
                      key={user.user_id}
                      className="border-b border-gray-300 hover:bg-[#F9F5F2] transition-colors"
                    >
                      <td className="p-3">{user.user_id}</td>
                      <td className="p-3">{user.username}</td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">
                        {user.first_name} {user.middle_name || ''} {user.last_name || ''} {user.extension || ''}
                      </td>
                      <td className="p-3">{user.strand}</td>
                      {/* Personality Dropdown */}
                      <td className="p-3">
                        {Array.isArray(user.top_3_personality) && user.top_3_personality.length > 0 ? (
                          <div>
                            {/* Main top personality */}
                            <div
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() =>
                                setOpenPersonalityDropdown(openPersonalityDropdown === user.user_id ? null : user.user_id)
                              }
                            >
                              <span>
                                {user.top_3_personality[0].type} ({user.top_3_personality[0].confidence})
                              </span>
                              {openPersonalityDropdown === user.user_id ? <FaChevronUp /> : <FaChevronDown />}
                            </div>

                            {/* Other personalities */}
                            {openPersonalityDropdown === user.user_id && user.top_3_personality.length > 1 && (
                              <div className="mt-2 ml-2 text-gray-700 text-sm">
                                {user.top_3_personality.slice(1).map((p, idx) => (
                                  <div key={idx} className="border-l-2 border-brown-4 pl-2">
                                    {p.type} ({p.confidence})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No data</span>
                        )}
                      </td>


                      {/* Knowledge Dropdown */}
                      <td className="p-3">
                        {user.top_3_knowledge?.length > 0 ? (
                          <div>
                            <div
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() =>
                                setOpenKnowledgeDropdown(openKnowledgeDropdown === user.user_id ? null : user.user_id)
                              }
                            >
                              <span>
                                {user.top_3_knowledge[0].subject} ({user.top_3_knowledge[0].percentage})
                              </span>
                              {openKnowledgeDropdown === user.user_id ? <FaChevronUp /> : <FaChevronDown />}
                            </div>

                            {openKnowledgeDropdown === user.user_id && (
                              <div className="mt-2 ml-2 text-gray-700 text-sm">
                                {user.top_3_knowledge.slice(1).map((k, idx) => (
                                  <div key={idx} className="border-l-2 border-brown-4 pl-2">
                                    {k.subject} ({k.percentage})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No data</span>
                        )}
                      </td>

                      {/* Program Dropdown */}
                      <td className="p-3">
                        {user.recommended_programs?.length > 0 ? (
                          <div>
                            <div
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() =>
                                setOpenProgramDropdown(openProgramDropdown === user.user_id ? null : user.user_id)
                              }
                            >
                              <span>{user.recommended_programs[0].program_name}</span>
                              {openProgramDropdown === user.user_id ? <FaChevronUp /> : <FaChevronDown />}
                            </div>

                            {openProgramDropdown === user.user_id && (
                              <div className="mt-2 ml-2 text-gray-700 text-sm">
                                {user.recommended_programs.slice(1).map((p, idx) => (
                                  <div key={idx} className="border-l-2 border-brown-4 pl-2">
                                    {p.program_name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No data</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'Feedback':
        return renderFeedbackContent();
      case 'Settings':
        return <div>Manage your Settings here.</div>;
      case 'Scholastic Record':
        return renderScholasticRecordContent();
      case 'Personality Test':
          return (
            <div className="flex flex-col items-center min-h-screen px-8">
              <h1 className="text-3xl md:text-4xl lg:text-2xl font-bold mt-4 mb-4 text-center text-black">
                Edit Personality Test Questions
              </h1>

              {/* Fetch Questions */}
              {questions.length > 0 ? (
                <>
                  <form className="bg-brown-1 border-2 border-brown-1 p-3 rounded-lg shadow-lg w-full max-w-md mb-4">
                    <div className="grid grid-cols-8 gap-3">
                      {questions.map((question, index) => (
                        <button
                          key={`q-${question.personality_test_id}`} // ✅ unique key
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingIndex(question.personality_test_id);
                            setEditedQuestion(question.questions);
                            setEditedPersonalityType(question.personality_type);
                          }}
                          className="w-11 h-11 bg-white border-2 text-black rounded-lg shadow hover:bg-gray-200 text-sm flex items-center justify-center hover:scale-95 transition-transform duration-300 transform-gpu"
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </form>

                  {/* ➕ Add Question Button */}
                  <button
                    onClick={() => setIsAddFormVisible(true)}
                    className="fixed bottom-8 right-8 bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 transform hover:scale-95"
                  >
                    Add Question
                  </button>
                </>
              ) : (
                <p className="text-center text-gray-500">Loading questions...</p>
              )}

              {/* ➕ Add Question Modal */}
              {isAddFormVisible && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                  <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4 text-black">Add New Question</h2>

                    <select
                      value={newPersonalityType || ""}
                      onChange={(e) => setNewPersonalityType(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-gray-200 text-black mb-4"
                    >
                      <option value="">Select Personality Type</option>
                      <option value="Realistic">Realistic</option>
                      <option value="Investigative">Investigative</option>
                      <option value="Artistic">Artistic</option>
                      <option value="Social">Social</option>
                      <option value="Enterprising">Enterprising</option>
                      <option value="Conventional">Conventional</option>
                    </select>

                    <textarea
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Enter a new question..."
                      className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                      rows={3}
                    />

                    <div className="flex justify-end gap-4">
                      <button
                        onClick={() => setIsAddFormVisible(false)}
                        className="btn border border-brown-6 bg-transparent text-black rounded px-4 hover:bg-brown-700 hover:text-white"
                        style={{ height: '35px', width: '80px' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => openConfirmModal(handleConfirmAddPersonalityQuestion)}
                        className="btn bg-brown-6 text-white rounded px-5 hover:bg-brown-700"
                        style={{ height: '35px', width: '80px' }}
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ✏️ Edit Modal */}
              {editingIndex !== null && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                  <div className="bg-brown-1 p-8 rounded-lg shadow-lg w-full max-w-md relative">
                    <button
                      onClick={handleCancelEdit}
                      className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                    <h2 className="text-2xl font-bold mb-4 text-black">Edit Question</h2>

                    <select
                      value={editedPersonalityType || ""}
                      onChange={(e) => setEditedPersonalityType(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-gray-200 text-black mb-4"
                    >
                      <option value="">Select Personality Type</option>
                      <option value="Realistic">Realistic</option>
                      <option value="Investigative">Investigative</option>
                      <option value="Artistic">Artistic</option>
                      <option value="Social">Social</option>
                      <option value="Enterprising">Enterprising</option>
                      <option value="Conventional">Conventional</option>
                    </select>

                    <textarea
                      value={editedQuestion}
                      onChange={(e) => setEditedQuestion(e.target.value)}
                      className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                      rows={4}
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openConfirmModal(() => handleDeletePersonalityQuestion(editingIndex))}
                        className="btn border border-brown-6 bg-transparent text-black rounded px-4 hover:bg-brown-700 hover:text-white"
                        style={{ height: '35px', width: '80px' }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => openConfirmModal(handleSavePersonalityEdit)}
                        className="btn bg-brown-6 text-white rounded px-5 hover:bg-brown-700"
                        style={{ height: '35px', width: '80px' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 🧩 Confirmation Modal */}
              {isConfirmModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                  <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-sm">
                    <h2 className="text-[19px] font-bold mb-8 text-black text-center pt-3">
                      Are you sure you want to proceed?
                    </h2>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={closeConfirmModal}
                        className="border border-brown-6 bg-transparent text-black rounded hover:bg-brown-700 hover:text-white"
                        style={{ height: '30px', width: '70px' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => confirmAction()}
                        className="bg-brown-6 text-white rounded hover:bg-brown-700"
                        style={{ height: '30px', width: '72px' }}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );

      case 'Knowledge Test':
        return renderKnowledgeTestContent();
      case 'Feedback':
        return renderFeedbackContent();
      case 'Program Information':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">Discipline group</h1>
            <form className="bg-brown-1 p-6 h-[400px] rounded-lg shadow-lg w-full max-w-4xl">
              <div className="grid grid-cols-4 gap-8">
                {[
                  'Business, Commerce, and Related Fields',
                  'Architecture and Town Planning',
                  'Education Science and Teacher Training',
                  'Engineering and Technology',
                  'Humanities',
                  'IT-Related Disciplines',
                  'Mass Communication and Documentation',
                  'Medical and Allied',
                  'Natural Science',
                  'Other Disciplines',
                  'Service Trades',
                  'Social and Behavioral Sciences',
                ].map((college) => (
                  <button
                    key={college}
                    onClick={() => {
                      if (college === 'Business, Commerce, and Related Fields') {
                        setActivePage('Business, Commerce, and Related Fields Programs');
                      } else if (college === 'Architecture and Town Planning') {
                        setActivePage('Architecture and Town Planning Programs');
                      } else if (college === 'Education Science and Teacher Training') {
                        setActivePage('Education Science and Teacher Training Programs');
                      } else if (college === 'Engineering and Technology') {
                        setActivePage('Engineering and Technology Programs');
                      } else if (college === 'Humanities') {
                        setActivePage('Humanities Programs');
                      } else if (college === 'IT-Related Disciplines') {
                        setActivePage('IT-Related Disciplines Programs');
                      } else if (college === 'Mass Communication and Documentation') {
                        setActivePage('Mass Communication and Documentation Programs');
                      } else if (college === 'Medical and Allied') {
                        setActivePage('Medical and Allied Programs');
                      }
                        else if (college === 'Natural Science') {
                        setActivePage('Natural Science Programs');
                      } else if (college === 'Other Disciplines') {
                        setActivePage('Other Disciplines Programs');
                      } else if (college === 'Service Trades') {
                        setActivePage('Service Trades Programs');
                      } else if (college === 'Social and Behavioral Sciences') {
                        setActivePage('Social and Behavioral Sciences Programs');
                      }
                    }}
                    className="bg-brown-6 text-white w-full h-24  rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    {college}
                  </button>
                ))}
              </div>
            </form>
            <button
              onClick={() => setIsAddCollegeFormVisible(true)}
              className="fixed bottom-12 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Add
            </button>
            <button
              onClick={() => handleSidebarClick('Dashboard')}
              className="fixed bottom-12 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>
                
            {isAddCollegeFormVisible && (
              <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4 text-black">Add New Discipline</h2>
                  <textarea
                    value={newCollege}
                    onChange={(e) => setNewCollege(e.target.value)}
                    placeholder="Enter college name..."
                    className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                    rows={3}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsAddCollegeFormVisible(false)}
                      className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCollege}
                      className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'Program Selection':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">Programs</h1>
            <form className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-4xl">
              <div className="grid grid-cols-3 gap-6">
                {Object.keys(programDetails).map((program) => (
                  <button
                    key={program}
                    onClick={() => setActivePage(program)}
                    className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    {program}
                  </button>
                ))}
              </div>
            </form>
            <button
              onClick={() => setActivePage('Program Information')}
              className="fixed bottom-8 right-8 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>
          </div>
        );
      case 'Business, Commerce, and Related Fields Programs':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
              College of Arts and Humanities Programs
            </h1>
            <form className="bg-brown-1 h-96 p-6 rounded-lg shadow-lg w-full max-w-4xl">
              <div className="grid grid-cols-3 gap-6">
                {[
                  'Bachelor of Science in Accountancy',
                  'Bachelor of Science in Management Accounting',
                  'Bachelor of Science in Business Administration Major in Human Resource Management',
                  'Bachelor of Science in Business Administration Major in Business Economics',
                  'Bachelor of Science in Business Administration Major in Financial Management',
                  'Bachelor of Science in Business Administration Major in Marketing Management',
                  'Bachelor of Science in Entrepreneurship',
                ].map((program) => (
                  <button
                    key={program}
                    onClick={() => setActivePage(program)}
                    className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    {program}
                  </button>
                ))}
              </div>
            </form>
            <button
              onClick={() => setIsAddProgramFormVisible(true)}
              className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Add
            </button>
            <button
              onClick={() => setActivePage('Program Information')}
              className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>

            {isAddProgramFormVisible && (
              <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                  <textarea
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="Enter program name..."
                    className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                    rows={3}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsAddProgramFormVisible(false)}
                      className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProgram}
                      className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'Architecture and Town Planning Programs':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
              College of Business and Accountancy Programs
            </h1>
            <form className="bg-brown-1 h-96 p-6 rounded-lg shadow-lg w-full max-w-4xl">
              <div className="grid grid-cols-3 gap-6">
                {[
                  'Bachelor of Science in Architecture',
                ].map((program) => (
                  <button
                    key={program}
                    onClick={() => setActivePage(program)}
                    className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    {program}
                  </button>
                ))}
              </div>
            </form>
            <button
              onClick={() => setIsAddProgramFormVisible(true)}
              className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Add
            </button>
            <button
              onClick={() => setActivePage('Program Information')}
              className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>

            {isAddProgramFormVisible && (
              <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                  <textarea
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="Enter program name..."
                    className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                    rows={3}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsAddProgramFormVisible(false)}
                      className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProgram}
                      className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'Education Science and Teacher Training Programs':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
              College of Criminal Justice Education Programs
            </h1>
            <form className="bg-brown-1 h-96 p-6 rounded-lg shadow-lg w-full max-w-4xl">
              <div className="grid grid-cols-3 gap-6">
                {['Bachelor of Elementary Education',
                  'Bachelor of Secondary Education Major in English',
                  'Bachelor of Secondary Education Major in Filipino',
                  'Bachelor of Secondary Education Major in Mathematics',
                  'Bachelor of Secondary Education Major in Science',
                  'Bachelor of Secondary Education Major in Social Studies',
                  'Bachelor of Secondary Education Major in Values Education',
                  'Bachelor of Physical Education',].map((program) => (
                  <button
                    key={program}
                    onClick={() => setActivePage(program)}
                    className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    {program}
                  </button>
                ))}
              </div>
            </form>
            <button
              onClick={() => setIsAddProgramFormVisible(true)}
              className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Add
            </button>
            <button
              onClick={() => setActivePage('Program Information')}
              className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>

            {isAddProgramFormVisible && (
              <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                  <textarea
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="Enter program name..."
                    className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                    rows={3}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsAddProgramFormVisible(false)}
                      className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProgram}
                      className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'Engineering and Technology Programs':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
              College of Engineering Programs
            </h1>
            <form className="bg-brown-1 h-96 p-6 rounded-lg shadow-lg w-full max-w-4xl">
              <div className="grid grid-cols-3 gap-6">
                {[
                  'Bachelor of Science in Civil Engineering',
                  'Bachelor of Science in Electrical Engineering',
                  'Bachelor of Science in Mechanical Engineering',
                  'Bachelor of Science in Petroleum Engineering',
                ].map((program) => (
                  <button
                    key={program}
                    onClick={() => setActivePage(program)}
                    className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    {program}
                  </button>
                ))}
              </div>
            </form>
            <button
              onClick={() => setIsAddProgramFormVisible(true)}
              className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Add
            </button>
            <button
              onClick={() => setActivePage('Program Information')}
              className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>

            {isAddProgramFormVisible && (
              <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                  <textarea
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="Enter program name..."
                    className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                    rows={3}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsAddProgramFormVisible(false)}
                      className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProgram}
                      className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'Humanities Programs':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
              College of Hospitality Management and Tourism Programs
            </h1>
            <form className="bg-brown-1 h-96 p-6 rounded-lg shadow-lg w-full max-w-4xl">
              <div className="grid grid-cols-3 gap-6">
                {[
                  'Bachelor of Arts in Communication',
                  'Bachelor of Arts in Political Science',
                ].map((program) => (
                  <button
                    key={program}
                    onClick={() => setActivePage(program)}
                    className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    {program}
                  </button>
                ))}
              </div>
            </form>
            <button
              onClick={() => setIsAddProgramFormVisible(true)}
              className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Add
            </button>
            <button
              onClick={() => setActivePage('Program Information')}
              className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>

            {isAddProgramFormVisible && (
              <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                  <textarea
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="Enter program name..."
                    className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                    rows={3}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsAddProgramFormVisible(false)}
                      className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProgram}
                      className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'IT-Related Disciplines Programs':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
              College of Sciences Programs
            </h1>
            <form className="bg-brown-1 h-96 p-6 rounded-lg shadow-lg w-full max-w-4xl">
              <div className="grid grid-cols-3 gap-6">
                {[
                  'Bachelor of Science in Computer Science',
                  'Bachelor of Science in Information Technology',
                ].map((program) => (
                  <button
                    key={program}
                    onClick={() => setActivePage(program)}
                    className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    {program}
                  </button>
                ))}
              </div>
            </form>
            <button
              onClick={() => setIsAddProgramFormVisible(true)}
              className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Add
            </button>
            <button
              onClick={() => setActivePage('Program Information')}
              className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>

            {isAddProgramFormVisible && (
              <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                  <textarea
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="Enter program name..."
                    className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                    rows={3}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsAddProgramFormVisible(false)}
                      className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProgram}
                      className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'Mass Communication and Documentation Programs':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
              College of Nursing and Health Sciences Programs
            </h1>
            <form className="bg-brown-1 h-96 p-6 rounded-lg shadow-lg w-full max-w-4xl">
              <div className="grid grid-cols-3 gap-6">
                {[
                  'Bachelor of Arts in Communication',
                ].map((program) => (
                  <button
                    key={program}
                    onClick={() => setActivePage(program)}
                    className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    {program}
                  </button>
                ))}
              </div>
            </form>
            <button
              onClick={() => setIsAddProgramFormVisible(true)}
              className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Add
            </button>
            <button
              onClick={() => setActivePage('Program Information')}
              className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>

            {isAddProgramFormVisible && (
              <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                  <textarea
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="Enter program name..."
                    className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                    rows={3}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsAddProgramFormVisible(false)}
                      className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProgram}
                      className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'Medical and Allied Programs':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
              College of Teacher Education Programs
            </h1>
            <form className="bg-brown-1 h-96 p-6 rounded-lg shadow-lg w-full max-w-4xl">
              <div className="grid grid-cols-3 gap-6">
                {[
                  'Bachelor of Science in Nursing',
                  'Bachelor of Science in Midwifery',
                  'Bachelor of Science in Biology Major in Medical Biology',
                  'Bachelor of Science in Biology Major in Preparatory Medicine',
                ].map((program) => (
                  <button
                    key={program}
                    onClick={() => setActivePage(program)}
                    className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    {program}
                  </button>
                ))}
              </div>
            </form>
            <button
              onClick={() => setIsAddProgramFormVisible(true)}
              className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Add
            </button>
            <button
              onClick={() => setActivePage('Program Information')}
              className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>

            {isAddProgramFormVisible && (
              <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                  <textarea
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="Enter program name..."
                    className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                    rows={3}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsAddProgramFormVisible(false)}
                      className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProgram}
                      className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'Natural Science Programs':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
              College of Architecture and Design Programs
            </h1>
            <form className="bg-brown-1 p-6 h-96 rounded-lg shadow-lg w-full max-w-4xl">
              <div className="grid grid-cols-3 gap-6">
                {['Bachelor of Science in Environmental Science',
                  'Bachelor of Science in Marine Biology',
                  'Bachelor of Science in Biology Major in Medical Biology',
                  'Bachelor of Science in Biology Major in Preparatory Medicine',].map((program) => (
                  <button
                    key={program}
                    onClick={() => setActivePage(program)}
                    className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    {program}
                  </button>
                ))}
              </div>
            </form>
            <button
              onClick={() => setIsAddProgramFormVisible(true)}
              className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Add
            </button>
            <button
              onClick={() => setActivePage('Program Information')}
              className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
            >
              Back
            </button>

            {isAddProgramFormVisible && (
              <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                  <textarea
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="Enter program name..."
                    className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                    rows={3}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setIsAddProgramFormVisible(false)}
                      className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProgram}
                      className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                      style={{
                        height: '35px',
                        width: '80px',
                        minHeight: '10px',
                        maxHeight: '50px',
                        padding: '0 10px',
                        lineHeight: '25px',
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        );
        case 'Other Disciplines Programs':
          return (
            <div className="flex flex-col items-center min-h-screen px-8">
              <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
                College of Architecture and Design Programs
              </h1>
              <form className="bg-brown-1 p-6 h-96 rounded-lg shadow-lg w-full max-w-4xl">
                <div className="grid grid-cols-3 gap-6">
                  {['Bachelor of Science in Public Administration',
                    'Bachelor of Science in Criminology',
                    ].map((program) => (
                    <button
                      key={program}
                      onClick={() => setActivePage(program)}
                      className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                    >
                      {program}
                    </button>
                  ))}
                </div>
              </form>
              <button
                onClick={() => setIsAddProgramFormVisible(true)}
                className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
              >
                Add
              </button>
              <button
                onClick={() => setActivePage('Program Information')}
                className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
              >
                Back
              </button>
  
              {isAddProgramFormVisible && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                  <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                    <textarea
                      value={newProgram}
                      onChange={(e) => setNewProgram(e.target.value)}
                      placeholder="Enter program name..."
                      className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                      rows={3}
                    />
                    <div className="flex justify-end gap-4">
                      <button
                        onClick={() => setIsAddProgramFormVisible(false)}
                        className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                        style={{
                          height: '35px',
                          width: '80px',
                          minHeight: '10px',
                          maxHeight: '50px',
                          padding: '0 10px',
                          lineHeight: '25px',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddProgram}
                        className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                        style={{
                          height: '35px',
                          width: '80px',
                          minHeight: '10px',
                          maxHeight: '50px',
                          padding: '0 10px',
                          lineHeight: '25px',
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
          );
          case 'Service Trades Programs':
            return (
              <div className="flex flex-col items-center min-h-screen px-8">
                <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
                  College of Architecture and Design Programs
                </h1>
                <form className="bg-brown-1 p-6 h-96 rounded-lg shadow-lg w-full max-w-4xl">
                  <div className="grid grid-cols-3 gap-6">
                    {['Bachelor of Science in Hospitality Management',
                      'Bachelor of Science in Tourism Management',

                      ].map((program) => (
                      <button
                        key={program}
                        onClick={() => setActivePage(program)}
                        className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                      >
                        {program}
                      </button>
                    ))}
                  </div>
                </form>
                <button
                  onClick={() => setIsAddProgramFormVisible(true)}
                  className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                >
                  Add
                </button>
                <button
                  onClick={() => setActivePage('Program Information')}
                  className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                >
                  Back
                </button>
    
                {isAddProgramFormVisible && (
                  <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                    <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                      <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                      <textarea
                        value={newProgram}
                        onChange={(e) => setNewProgram(e.target.value)}
                        placeholder="Enter program name..."
                        className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                        rows={3}
                      />
                      <div className="flex justify-end gap-4">
                        <button
                          onClick={() => setIsAddProgramFormVisible(false)}
                          className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                          style={{
                            height: '35px',
                            width: '80px',
                            minHeight: '10px',
                            maxHeight: '50px',
                            padding: '0 10px',
                            lineHeight: '25px',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddProgram}
                          className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                          style={{
                            height: '35px',
                            width: '80px',
                            minHeight: '10px',
                            maxHeight: '50px',
                            padding: '0 10px',
                            lineHeight: '25px',
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
            );
            case 'Social and Behavioral Sciences Programs':
              return (
                <div className="flex flex-col items-center min-h-screen px-8">
                  <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">
                    College of Architecture and Design Programs
                  </h1>
                  <form className="bg-brown-1 p-6 h-96 rounded-lg shadow-lg w-full max-w-4xl">
                    <div className="grid grid-cols-3 gap-6">
                      {['Bachelor of Arts in Political Science',
                        'Bachelor of Science in Public Administration',
                        'Bachelor of Science in Criminology',

  
                        ].map((program) => (
                        <button
                          key={program}
                          onClick={() => setActivePage(program)}
                          className="bg-brown-6 text-white rounded-lg p-4 shadow-lg hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                        >
                          {program}
                        </button>
                      ))}
                    </div>
                  </form>
                  <button
                    onClick={() => setIsAddProgramFormVisible(true)}
                    className="fixed bottom-14 right-[350px] bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setActivePage('Program Information')}
                    className="fixed bottom-14 right-48 bg-brown-6 text-white rounded-lg p-4 shadow-lg w-36 hover:bg-brown-700 hover:scale-95 transition-transform duration-300 transform-gpu"
                  >
                    Back
                  </button>
      
                  {isAddProgramFormVisible && (
                    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                      <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4 text-black">Add New Program</h2>
                        <textarea
                          value={newProgram}
                          onChange={(e) => setNewProgram(e.target.value)}
                          placeholder="Enter program name..."
                          className="w-full p-4 border rounded-lg bg-gray-200 text-black mb-4"
                          rows={3}
                        />
                        <div className="flex justify-end gap-4">
                          <button
                            onClick={() => setIsAddProgramFormVisible(false)}
                            className="btn btn-danger border-1 border-brown-6 bg-transparent hover:text-white text-black rounded px-4 py-0 hover:bg-brown-700 hover:border-brown-700"
                            style={{
                              height: '35px',
                              width: '80px',
                              minHeight: '10px',
                              maxHeight: '50px',
                              padding: '0 10px',
                              lineHeight: '25px',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddProgram}
                            className="btn btn-primary border-brown-6 bg-brown-6 text-white rounded px-5 py-2 hover:bg-brown-700 hover:border-brown-700"
                            style={{
                              height: '35px',
                              width: '80px',
                              minHeight: '10px',
                              maxHeight: '50px',
                              padding: '0 10px',
                              lineHeight: '25px',
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
              );
          
          
      case 'Registered User':
        return (
          <div className="flex flex-col items-center min-h-screen px-8">
            <h1 className="text-3xl font-bold mt-4 mb-8 text-center text-black">Registered Users</h1>
            <div className="bg-brown-1 p-6 rounded-lg shadow-lg w-full max-w-4xl">
              <div className="overflow-y-auto max-h-[450px] rounded-lg">
                <table className="table-auto w-full border-collapse border border-gray-300 rounded-lg">
                  <thead>
                    <tr className="bg-brown-6 text-white">
                      <th className="border border-gray-300 px-4 py-2">Email</th>
                      <th className="border border-gray-300 px-4 py-2">Username</th>
                      <th className="border border-gray-300 px-4 py-2">Personality Score</th>
                      <th className="border border-gray-300 px-4 py-2">Knowledge Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Example data, replace with dynamic data */}
                    <tr className="bg-white text-black">
                      <td className="border border-gray-300 px-4 py-2">user1@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user1</td>
                      <td className="border border-gray-300 px-4 py-2">85</td>
                      <td className="border border-gray-300 px-4 py-2">90</td>
                    </tr>
                    <tr className="bg-gray-100 text-black">
                      <td className="border border-gray-300 px-4 py-2">user2@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user2</td>
                      <td className="border border-gray-300 px-4 py-2">78</td>
                      <td className="border border-gray-300 px-4 py-2">88</td>
                    </tr>
                    <tr className="bg-white text-black">
                      <td className="border border-gray-300 px-4 py-2">user1@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user1</td>
                      <td className="border border-gray-300 px-4 py-2">85</td>
                      <td className="border border-gray-300 px-4 py-2">90</td>
                    </tr>
                    <tr className="bg-gray-100 text-black">
                      <td className="border border-gray-300 px-4 py-2">user2@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user2</td>
                      <td className="border border-gray-300 px-4 py-2">78</td>
                      <td className="border border-gray-300 px-4 py-2">88</td>
                    </tr>
                    <tr className="bg-white text-black">
                      <td className="border border-gray-300 px-4 py-2">user1@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user1</td>
                      <td className="border border-gray-300 px-4 py-2">85</td>
                      <td className="border border-gray-300 px-4 py-2">90</td>
                    </tr>
                    <tr className="bg-gray-100 text-black">
                      <td className="border border-gray-300 px-4 py-2">user2@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user2</td>
                      <td className="border border-gray-300 px-4 py-2">78</td>
                      <td className="border border-gray-300 px-4 py-2">88</td>
                    </tr>
                    <tr className="bg-white text-black">
                      <td className="border border-gray-300 px-4 py-2">user1@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user1</td>
                      <td className="border border-gray-300 px-4 py-2">85</td>
                      <td className="border border-gray-300 px-4 py-2">90</td>
                    </tr>
                    <tr className="bg-gray-100 text-black">
                      <td className="border border-gray-300 px-4 py-2">user2@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user2</td>
                      <td className="border border-gray-300 px-4 py-2">78</td>
                      <td className="border border-gray-300 px-4 py-2">88</td>
                    </tr>
                    <tr className="bg-white text-black">
                      <td className="border border-gray-300 px-4 py-2">user1@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user1</td>
                      <td className="border border-gray-300 px-4 py-2">85</td>
                      <td className="border border-gray-300 px-4 py-2">90</td>
                    </tr>
                    <tr className="bg-gray-100 text-black">
                      <td className="border border-gray-300 px-4 py-2">user2@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user2</td>
                      <td className="border border-gray-300 px-4 py-2">78</td>
                      <td className="border border-gray-300 px-4 py-2">88</td>
                    </tr>
                    <tr className="bg-white text-black">
                      <td className="border border-gray-300 px-4 py-2">user1@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user1</td>
                      <td className="border border-gray-300 px-4 py-2">85</td>
                      <td className="border border-gray-300 px-4 py-2">90</td>
                    </tr>
                    <tr className="bg-gray-100 text-black">
                      <td className="border border-gray-300 px-4 py-2">user2@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user2</td>
                      <td className="border border-gray-300 px-4 py-2">78</td>
                      <td className="border border-gray-300 px-4 py-2">88</td>
                    </tr>
                    <tr className="bg-white text-black">
                      <td className="border border-gray-300 px-4 py-2">user1@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user1</td>
                      <td className="border border-gray-300 px-4 py-2">85</td>
                      <td className="border border-gray-300 px-4 py-2">90</td>
                    </tr>
                    <tr className="bg-gray-100 text-black">
                      <td className="border border-gray-300 px-4 py-2">user2@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user2</td>
                      <td className="border border-gray-300 px-4 py-2">78</td>
                      <td className="border border-gray-300 px-4 py-2">88</td>
                    </tr>
                    <tr className="bg-white text-black">
                      <td className="border border-gray-300 px-4 py-2">user1@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user1</td>
                      <td className="border border-gray-300 px-4 py-2">85</td>
                      <td className="border border-gray-300 px-4 py-2">90</td>
                    </tr>
                    <tr className="bg-gray-100 text-black">
                      <td className="border border-gray-300 px-4 py-2">user2@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user2</td>
                      <td className="border border-gray-300 px-4 py-2">78</td>
                      <td className="border border-gray-300 px-4 py-2">88</td>
                    </tr>
                    <tr className="bg-white text-black">
                      <td className="border border-gray-300 px-4 py-2">user1@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user1</td>
                      <td className="border border-gray-300 px-4 py-2">85</td>
                      <td className="border border-gray-300 px-4 py-2">90</td>
                    </tr>
                    <tr className="bg-gray-100 text-black">
                      <td className="border border-gray-300 px-4 py-2">user2@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user2</td>
                      <td className="border border-gray-300 px-4 py-2">78</td>
                      <td className="border border-gray-300 px-4 py-2">88</td>
                    </tr>
                    <tr className="bg-white text-black">
                      <td className="border border-gray-300 px-4 py-2">user1@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user1</td>
                      <td className="border border-gray-300 px-4 py-2">85</td>
                      <td className="border border-gray-300 px-4 py-2">90</td>
                    </tr>
                    <tr className="bg-gray-100 text-black">
                      <td className="border border-gray-300 px-4 py-2">user2@example.com</td>
                      <td className="border border-gray-300 px-4 py-2">user2</td>
                      <td className="border border-gray-300 px-4 py-2">78</td>
                      <td className="border border-gray-300 px-4 py-2">88</td>
                    </tr>
                    {/* Add more rows dynamically */}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case "Chats":
        return (
          <div className="w-full h-full flex bg-[#f6f0e9]">

            {/* LEFT USER LIST */}
            <div className="w-1/3 border-r border-[#c9b8a8] bg-[#fcfaf8] flex flex-col shadow-md">

              <h2 className="text-xl font-semibold p-4 border-b border-[#d8c7b9] text-[#5c452e] bg-[#f6f0e9]">
                Conversations
              </h2>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {conversations.map((c) => (
                  <div
                    key={c.conversation_id}
                    onClick={() => openConversation(c.conversation_id, c.user_id)}
                    className={`
                      px-4 py-3 cursor-pointer border-b border-[#e6ddd3]
                      transition-all duration-200 rounded-sm
                      ${
                        selectedUser === c.user_id
                          ? "bg-[#e9dfd5] text-[#4b3a28] shadow-inner"
                          : "bg-[#fcfaf8] hover:bg-[#f3ebe3]"
                      }
                    `}
                  >
                    <div className="font-semibold text-[#4b3a28]">
                      {c.fullname}
                    </div>
                    <div className="text-sm text-[#7b6a58] truncate">
                      {c.last_message || "No messages yet"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT CHAT AREA */}
            <div className="flex-1 flex flex-col bg-[#f6f0e9] min-h-0">

              {/* HEADER */}
              <div className="p-4 border-b border-[#d8c7b9] bg-[#fcfaf8] text-lg font-semibold text-[#5c452e] shadow-sm">
                {selectedUser
                  ? `Chat with ${
                      conversations.find((c) => c.user_id === selectedUser)?.fullname
                    }`
                  : "Select a user"}
              </div>

              {/* MESSAGES SCROLL AREA */}
              <div
                className="overflow-y-auto p-4 space-y-4 custom-scrollbar"
                style={{ height: "calc(100vh - 300px)" }}  // your working height formula
              >
                {selectedUser ? (
                  <>
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${
                          msg.sender === "admin" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`
                            px-4 py-3 rounded-xl max-w-xs shadow-md text-sm leading-relaxed
                            ${
                              msg.sender === "admin"
                                ? "bg-gradient-to-br from-[#7b5e36] to-[#60472c] text-white rounded-br-none"
                                : "bg-white text-[#4b3a28] border border-[#e0d5c8] rounded-bl-none"
                            }
                          `}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {isSending && (
                      <div className="flex justify-end pr-3">
                        <div className="text-xs italic text-[#7b6a58]">Sending…</div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div className="text-[#9c8b7a] text-center mt-20">
                    Select a user to start chatting
                  </div>
                )}
              </div>

              {/* INPUT BAR */}
              {selectedUser && (
                <div className="p-4 border-t border-[#d8c7b9] bg-[#fcfaf8] flex items-center gap-3 shadow-inner">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendAdminMessage()}
                    className="flex-1 border border-[#c9b8a8] rounded-lg px-4 py-2 bg-white text-[#4b3a28]
                                placeholder-[#a18d7d] focus:outline-none focus:ring-2 focus:ring-[#b2947b]"
                    placeholder="Type your message…"
                  />
                  <button
                    onClick={sendAdminMessage}
                    className="px-5 py-2 bg-[#7b5e36] text-white rounded-lg shadow-md
                                hover:bg-[#6a4f2d] active:scale-95 transition-all"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      case 'Bachelor of Arts in Communication':
      case 'Bachelor of Arts in Political Science':
      case 'Bachelor of Arts in Philippine Studies':
      case 'Bachelor of Science in Social Work':
      case 'Bachelor of Science in Psychology':
      case 'Bachelor of Science in Accountancy':
      case 'Bachelor of Science in Management Accounting':
        // ...add cases for other programs...
        return renderProgramDetails(activePage);
      default:
        return <div>Select a menu item to view content.</div>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-300">
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-brown-1 text-black transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-16'
        } z-10 flex flex-col`}
      >
        <div
          className={`p-4 mt-4 flex items-center cursor-pointer ${
            isSidebarOpen ? 'justify-start' : 'justify-center'
          }`}
          onClick={toggleSidebar}
        >
          {isSidebarOpen ? (
            <>
              <Image src={Logo} alt="PathFinder Logo" width={50} height={50} />
              <span className="ml-4 text-xl font-bold">PathFinder</span>
              <FaBars className="ml-auto" size={20} />
            </>
          ) : (
            <FaBars size={20} />
          )}
        </div>
        <ul className={`flex-1 ${isSidebarOpen ? 'space-y-1' : 'space-y-4'}`}>
          <li
            className={`flex items-center cursor-pointer rounded mx-2 ${
              activePage === 'Dashboard' ? 'bg-brown-6 text-white' : 'hover:bg-brown-6 hover:text-white'
            } ${isSidebarOpen ? 'p-4' : 'p-3'}`}
            onClick={() => handleSidebarClick('Dashboard')}
          >
            <div
              className={`flex items-center ${
                isSidebarOpen ? 'justify-start' : 'justify-center'
              } w-full`}
            >
              <FaHome size={20} />
              {isSidebarOpen && <span className="ml-4 text-left">Dashboard</span>}
            </div>
          </li>
          <li
            className={`flex items-center cursor-pointer rounded mx-2 ${
              activePage === 'Registered Users' ? 'bg-brown-6 text-white' : 'hover:bg-brown-6 hover:text-white'
            } ${isSidebarOpen ? 'p-4' : 'p-3'}`}
            onClick={() => handleSidebarClick('Registered Users')}
          >
            <div
              className={`flex items-center ${
                isSidebarOpen ? 'justify-start' : 'justify-center'
              } w-full`}
            >
              <FaUser size={20} />
              {isSidebarOpen && <span className="ml-4 text-left">Registered Users</span>}
            </div>
          </li>
          <li
            className={`flex items-center cursor-pointer rounded mx-2 ${
              activePage === 'Chats' ? 'bg-brown-6 text-white' : 'hover:bg-brown-6 hover:text-white'
            } ${isSidebarOpen ? 'p-4' : 'p-3'}`}
            onClick={() => handleSidebarClick('Chats')}
          >
            <div
              className={`flex items-center ${
                isSidebarOpen ? 'justify-start' : 'justify-center'
              } w-full`}
            >
              <FaComments size={20} /> {/* Changed icon to FaFileAlt */}
              {isSidebarOpen && <span className="ml-4 text-left">Chats</span>}
            </div>
          </li>
          <li
            className={`flex items-center cursor-pointer rounded mx-2 ${
              activePage === 'Feedback' ? 'bg-brown-6 text-white' : 'hover:bg-brown-6 hover:text-white'
            } ${isSidebarOpen ? 'p-4' : 'p-3'}`}
            onClick={() => handleSidebarClick('Feedback')}
          >
            <div
              className={`flex items-center ${
                isSidebarOpen ? 'justify-start' : 'justify-center'
              } w-full`}
            >
              <FaCoffee size={20} />
              {isSidebarOpen && <span className="ml-4 text-left">Feedback</span>}
            </div>
          </li>
          <li>
            <div
              className={`flex items-center cursor-pointer rounded mx-2 hover:bg-brown-6 hover:text-white ${
                isSidebarOpen ? 'p-4' : 'p-3'
              }`}
              onClick={() => {
                setIsSidebarOpen(true);
                setIsSettingsOpen(!isSettingsOpen);
              }}
            >
              <div
                className={`flex items-center ${
                  isSidebarOpen ? 'justify-start' : 'justify-center'
                } w-full`}
              >
                <FaCog size={20} />
                {isSidebarOpen && <span className="ml-4 text-left">Settings</span>}
                {isSidebarOpen &&
                  (isSettingsOpen ? (
                    <FaChevronUp className="ml-auto text-xs" />
                  ) : (
                    <FaChevronDown className="ml-auto text-xs" />
                  ))}
              </div>
            </div>
            {isSidebarOpen && isSettingsOpen && (
              <ul className="ml-6 mt-2 space-y-1">
                <li
                  className={`flex justify-between items-center cursor-pointer rounded mx-2 hover:bg-brown-6 hover:text-white ${
                    isSidebarOpen ? 'p-3' : 'p-3'
                  }`}
                  onClick={() => setIsQuestionsOpen(!isQuestionsOpen)}
                >
                  <span>Questions</span>
                  {isQuestionsOpen ? (
                    <FaChevronUp className="text-xs" />
                  ) : (
                    <FaChevronDown className="text-xs" />
                  )}
                </li>
                {isQuestionsOpen && (
                  <ul className="ml-4 mt-2 space-y-1">
                    <li
                      className={`cursor-pointer rounded mx-2 ${
                        activePage === 'Scholastic Record' ? 'bg-brown-6 text-white' : 'hover:bg-brown-6 hover:text-white'
                      } ${isSidebarOpen ? 'p-3' : 'p-3'}`}
                      onClick={() => handleSidebarClick('Scholastic Record')}
                    >
                      Scholastic Record
                    </li>
                    <li
                      className={`cursor-pointer rounded mx-2 ${
                        activePage === 'Personality Test' ? 'bg-brown-6 text-white' : 'hover:bg-brown-6 hover:text-white'
                      } ${isSidebarOpen ? 'p-3' : 'p-3'}`}
                      onClick={() => handleSidebarClick('Personality Test')}
                    >
                      Personality Test
                    </li>
                    <li
                      className={`cursor-pointer rounded mx-2 ${
                        activePage === 'Knowledge Test' ? 'bg-brown-6 text-white' : 'hover:bg-brown-6 hover:text-white'
                      } ${isSidebarOpen ? 'p-3' : 'p-3'}`}
                      onClick={() => handleSidebarClick('Knowledge Test')}
                    >
                      Knowledge Test
                    </li>
                  </ul>
                )}
                <div className="mt-2"></div>
                <li
                  className={`cursor-pointer rounded mx-2 ${
                    activePage === 'Program Information' ? 'bg-brown-6 text-white' : 'hover:bg-brown-6 hover:text-white'
                  } ${isSidebarOpen ? 'p-3' : 'p-3'}`}
                  onClick={() => handleSidebarClick('Program Information')}
                >
                  Program Information
                </li>
              </ul>
            )}
          </li>
        </ul>
        <li
            className={`py-6 px-6 text-left w-full flex items-center gap-4 rounded-lg hover:scale-95 transition duration-200 bg-transparent hover:bg-transparent ${
              activePage === 'Registered User' ? 'bg-brown-6 text-white' : 'hover:bg-brown-6 hover:text-black'
            } ${isSidebarOpen ? 'p-3' : 'p-3'}`}
            onClick={() => setIsLogoutConfirmationOpen(true)}
          >
            <div
              className={`flex items-center ${
                isSidebarOpen ? 'justify-start' : 'justify-center'
              } w-full`}
            >
              <FaSignOutAlt size={20} /> {/* Changed icon to FaUser */}
              {isSidebarOpen && <span className="ml-4 text-left">Logout</span>}
            </div>
          </li>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        {/* Top Navigation */}
        <div className="bg-gray-300 text-white p-4 flex justify-center items-center">
          <div className="flex items-center">
            <Image src={Logo} alt="PathFinder Logo" width={80} height={80} />
            <h1 className="text-4xl text-black font-bold ml-4">PathFinder</h1>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="p-6">{renderContent()}</div>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmationOpen && (
        <LogoutConfirmationModal
          isOpen={isLogoutConfirmationOpen}
          onClose={() => setIsLogoutConfirmationOpen(false)}
          onConfirm={() => {
            logout(); // ✅ Use AuthContext logout
            setIsLogoutConfirmationOpen(false);
            router.push('/'); // ✅ Redirect back to home after logout
          }}
        />
      )}
    </div>
  );
}

