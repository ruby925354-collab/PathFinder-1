'use client';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import { FaTimes, FaUser, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import Logo from '@/public/PATHFINDER-logo-edited.png';
import { useRouter } from 'next/navigation';
import ChangePasswordModal from './ChangePasswordModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
  onLoginSuccess: (username: string) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToRegister,
  onLoginSuccess,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [email, setEmail] = useState('');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      clearInputs();
      setError(false);
      setIsLoading(false);
    } else {
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [isOpen]);

  const clearInputs = () => {
    setEmail('');
    setPasswordValue('');
  };

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
      clearInputs();
      setError(false);
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleLogin = async () => {
    if (isLoading) return;
    if (!email.trim() || !passwordValue.trim()) {
      alert('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: passwordValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(true);
        return;
      }

      if (data.access_token) localStorage.setItem('access_token', data.access_token);
      if (data.user_id) localStorage.setItem('user_id', data.user_id);
      if (data.role_id) localStorage.setItem('role_id', data.role_id);

      alert('Login Successful');
      onLoginSuccess(data.email || email);

      const role = Number(data.role_id);
      setTimeout(() => {
        if (role === 1) router.push('/admin');
      }, 200);
    } catch (err) {
      console.error('Login error:', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => setIsChangePasswordOpen(true);

  const modalContent = isVisible ? (
    <div
      className={`fixed inset-0 z-[9999] transition-all duration-500 ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}
    >
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackgroundClick}
      />

      {/* Modal content */}
      <div className="flex justify-center items-center min-h-screen px-6">
        <div className="relative bg-[#f7f3ef] rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col lg:flex-row overflow-hidden transition-transform duration-300 scale-105">
          {/* Close Button */}
          <button
            onClick={() => {
              onClose();
              clearInputs();
              setError(false);
              setIsLoading(false);
            }}
            className="absolute top-6 right-6 text-[#5a4633] hover:text-[#2b2015] transition"
          >
            <FaTimes size={28} />
          </button>

          {/* Left Section - Form */}
          <div className="w-full lg:w-1/2 p-14 flex flex-col justify-center">
            <h2 className="text-5xl font-bold mb-12 text-center text-[#3a2e1f]">
              Welcome to <span className="text-[#a46b37]">PathFinder</span>
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              autoComplete="off"
              className="space-y-8"
            >
              {/* Email Input */}
              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-8 py-6 pr-14 text-xl border-2 rounded-2xl focus:outline-none transition duration-300 placeholder:text-[#7a6a57] ${
                    error
                      ? 'border-red-500 focus:ring-2 focus:ring-red-400'
                      : 'border-[#d6c3b3] focus:border-[#a46b37] focus:ring-2 focus:ring-[#dcbf9e]'
                  } bg-[#f7f3ef] text-[#2b2015]`}
                  required
                />
                <FaUser className="absolute right-5 top-6 text-[#a46b37] text-xl" />
              </div>

              {/* Password Input */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  className={`w-full px-8 py-6 pr-14 text-xl border-2 rounded-2xl focus:outline-none transition duration-300 placeholder:text-[#7a6a57] ${
                    error
                      ? 'border-red-500 focus:ring-2 focus:ring-red-400'
                      : 'border-[#d6c3b3] focus:border-[#a46b37] focus:ring-2 focus:ring-[#dcbf9e]'
                  } bg-[#f7f3ef] text-[#2b2015]`}
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-5 top-6 text-[#a46b37] hover:text-[#8c582c] transition"
                >
                  {showPassword ? <FaEyeSlash size={22} /> : <FaEye size={22} />}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <p className="text-lg text-center text-red-500">
                  Invalid email or password. Please try again.
                </p>
              )}

              {/* Forgot Password */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[#7b4f2c] hover:text-[#4a2c16] hover:underline text-lg font-medium"
                  disabled={isLoading}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-6 text-2xl rounded-2xl font-bold text-white shadow-md transition-all duration-300 flex items-center justify-center ${
                  isLoading
                    ? 'bg-[#d3b99a] cursor-not-allowed'
                    : 'bg-[#6D4C41] hover:bg-[#4E342E]'
                }`}
              >
                {isLoading ? (
                  <>
                    <FaSpinner className="animate-spin mr-3" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {/* Switch to Register */}
            <div className="mt-8 text-center">
              <p className="text-[#3a2e1f] text-xl">
                Don’t have an account?{' '}
                <button
                  onClick={onSwitchToRegister}
                  className="text-[#a46b37] font-semibold hover:text-[#8c582c] hover:underline"
                  disabled={isLoading}
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>

          {/* Right Section - Image */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#f0e5da] to-[#e6d5c3] justify-center items-center">
            <Image
              src={Logo}
              alt="PathFinder Logo"
              className="w-4/5 h-auto drop-shadow-lg"
              priority
            />
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  ) : null;

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(modalContent, document.body);
};

export default LoginModal;
