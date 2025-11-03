'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type QuestionsContextType = {
  questions: string[];
  setQuestions: (newQuestions: string[]) => void;
};

const defaultQuestions = [
  "I enjoy setting goals for the future.",
  "I often seek out opportunities to influence others.",
  "I enjoy expressing myself through music.",
];

const MAX_QUESTIONS = 48; // Define the maximum number of questions

const QuestionsContext = createContext<QuestionsContextType | undefined>(undefined);

export const QuestionsProvider = ({ children }: { children: ReactNode }) => {
  const [questions, setQuestionsState] = useState<string[]>(defaultQuestions);

  const updateQuestions = (newQuestions: string[]) => {
    if (!Array.isArray(newQuestions) || newQuestions.some(q => typeof q !== 'string')) {
      console.error('Invalid questions format. Questions must be an array of strings.');
      return;
    }
    if (newQuestions.length > MAX_QUESTIONS) {
      console.error(`Too many questions. Maximum allowed is ${MAX_QUESTIONS}.`);
      return;
    }
    console.log('Updating questions:', newQuestions); // Debug log
    setQuestionsState(newQuestions); // Update state in memory
  };

  return (
    <QuestionsContext.Provider value={{ questions, setQuestions: updateQuestions }}>
      {children}
    </QuestionsContext.Provider>
  );
};

export const useQuestions = () => {
  const context = useContext(QuestionsContext);
  if (!context) {
    throw new Error('useQuestions must be used within a QuestionsProvider');
  }
  return context;
};
