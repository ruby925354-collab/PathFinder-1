'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { FaTimes, FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
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
  onLoginSuccess
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [email, setEmail] = useState('');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [error, setError] = useState(false); // ✅ NEW: track error state
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      clearInputs();
      setError(false);
    } else {
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [isOpen]);

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
      clearInputs();
      setError(false);
    }
  };

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleLogin = async () => {
    if (!email.trim() || !passwordValue.trim()) {
      alert('Please enter both email and password');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: passwordValue }),
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (!response.ok) {
        // ❌ Instead of clearing, just show red highlight
        setError(true);
        return;
      }

      // ✅ Clear error if success
      setError(false);

      // Save JWT + user info
      if (data.access_token) localStorage.setItem("access_token", data.access_token);
      if (data.user_id) localStorage.setItem("user_id", data.user_id);
      if (data.role_id) localStorage.setItem("role_id", data.role_id);

      alert('Login Successful');
      onLoginSuccess(data.email || email);

      const role = Number(data.role_id);
      setTimeout(() => {
        if (role === 1) router.push('/admin');
      }, 200);

    } catch (err) {
      console.error('Login error:', err);
      setError(true);
    }
  };

  const clearInputs = () => {
    setEmail('');
    setPasswordValue('');
  };

  const handleForgotPassword = () => {
    setIsChangePasswordOpen(true);
  };

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`fixed inset-0 bg-black bg-opacity-0 transition-all duration-300 ${
          isOpen ? 'backdrop-blur-md' : 'backdrop-blur-none'
        }`}
        onClick={handleBackgroundClick}
      />
      {isVisible && (
        <div className="flex justify-center items-center h-full mt-20">
          <div className="bg-brown-1 p-8 md:p-12 lg:p-16 rounded-lg shadow-lg w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-7xl flex relative z-10 transition-all duration-500">
            <button
              onClick={() => { onClose(); clearInputs(); setError(false); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition duration-300"
            >
              <FaTimes size={24} />
            </button>
            <div className="w-full md:w-full lg:w-1/2 p-8 md:p-10 lg:p-12 bg-brown-1 md:border-2 md:border-brown-6 rounded-lg">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold mb-10 text-center text-black">
                PathFinder
              </h2>
              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} autoComplete="off">
                <div className="mb-8 relative">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full p-5 pr-12 border-2 rounded-lg focus:outline-none focus:ring-2 ${
                      error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-brown-700'
                    } bg-brown-1 text-black transition-colors duration-300`}
                    autoComplete="off"
                    required
                  />
                  <FaUser className={`absolute right-4 top-5 ${error ? 'text-red-500' : 'text-black'}`} />
                </div>
                <div className="mb-4 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    className={`w-full p-5 pr-12 border-2 rounded-lg focus:outline-none focus:ring-2 ${
                      error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-brown-700'
                    } bg-brown-1 text-black transition-colors duration-300`}
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className={`absolute right-4 top-5 ${error ? 'text-red-500' : 'text-black'}`}
                  >
                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
                {error && (
                  <p className="text-red-500 text-center mb-4 text-sm">
                    Invalid email or password. Please try again.
                  </p>
                )}
                <div className="text-right mb-4">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-brown-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-brown-6 text-white rounded-lg hover:bg-brown-700 transition duration-300"
                >
                  Login
                </button>
              </form>
              <div className="mt-8 text-center">
                <p className="text-xl text-black">
                  Don't have an account?{' '}
                  <button onClick={onSwitchToRegister} className="text-brown-700 hover:underline">
                    Sign up
                  </button>
                </p>
              </div>
            </div>
            <div className="hidden lg:flex lg:w-1/2 justify-center items-center bg-brown-1">
              <Image src={Logo} alt="Company Logo" />
            </div>
          </div>
        </div>
      )}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export default LoginModal;
