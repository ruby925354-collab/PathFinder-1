'use client';
import React, { useState, useEffect } from 'react';
import { FaTimes, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | ''>('');
  const [resendTimer, setResendTimer] = useState(0); // ⏳ countdown state

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
      setPasswordStrength('');
      setResendTimer(0);
    }
  }, [isOpen]);

  // Handle countdown tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  const handleFetch = async (url: string, body: any) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || 'Unexpected response from server');
      }

      if (!res.ok) throw new Error(data.detail || 'Request failed');
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Network error');
    }
  };

  const handleSendOtp = async () => {
    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await handleFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/request-password-reset`, { email });
      setStep(2);
      setSuccess('OTP sent to your email!');
      setResendTimer(30); // start countdown after first send
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return; // prevent spam
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await handleFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/request-password-reset`, { email });
      setSuccess('A new OTP has been sent to your email!');
      setResendTimer(30); // restart countdown
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await handleFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/verify-reset-otp`, { email, otp });
      setStep(3);
      setSuccess('OTP verified!\n You can now reset your password.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const evaluatePasswordStrength = (password: string) => {
    const hasLetters = /[A-Za-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasMinLength = password.length >= 8;

    if (hasLetters && hasNumbers && hasSpecial && hasMinLength) return 'strong';
    if ((hasLetters && hasNumbers) || (hasLetters && hasSpecial) || (hasNumbers && hasSpecial)) return 'medium';
    return 'weak';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || '';
    setNewPassword(value);
    setPasswordStrength(value ? evaluatePasswordStrength(value) : '');
    if (confirmPassword && value !== confirmPassword) {
      setError('Passwords do not match');
    } else {
      setError('');
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || '';
    setConfirmPassword(value);
    if (newPassword && value !== newPassword) {
      setError('Passwords do not match');
    } else {
      setError('');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await handleFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reset-password`, {
        email,
        otp,
        new_password: newPassword,
      });
      setSuccess('Password changed successfully! Closing...');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50">
      <div className="bg-brown-1 p-6 md:p-12 lg:p-20 rounded-lg shadow-lg w-full max-w-md md:max-w-lg lg:max-w-2xl flex flex-col relative z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition duration-300"
        >
          <FaTimes size={24} />
        </button>

        {error && <p className="text-brown-6 text-xl mb-4 text-center">{error}</p>}
        {success && <p className="text-brown-6 text-3xl mb-4 text-center">{success}</p>}

        {step === 1 && (
          <div>
            <h2 className="text-3xl font-semibold mb-8 text-center text-black">Forgot Password</h2>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-4 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-700 bg-white text-black mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={handleSendOtp}
              disabled={!email || loading}
              className={`w-full py-4 rounded-lg transition duration-300 mb-4 ${
                !email || loading
                  ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                  : 'bg-brown-6 hover:bg-brown-700 text-white'
              }`}
            >
              {loading ? 'Sending...' : 'Next'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <input
              type="text"
              placeholder="Enter OTP"
              className="w-full p-4 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-700 bg-white text-black mb-4"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button
              onClick={handleVerifyOtp}
              disabled={!otp || loading}
              className={`w-full py-4 rounded-lg transition duration-300 mb-2 ${
                !otp || loading
                  ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                  : 'bg-brown-6 hover:bg-brown-700 text-white'
              }`}
            >
              {loading ? 'Verifying...' : 'Next'}
            </button>

            {/* Resend OTP with countdown */}
            <button
              onClick={handleResendOtp}
              disabled={loading || resendTimer > 0}
              className="w-full py-2 text-xl text-brown-700 underline hover:text-brown-900 disabled:text-gray-500"
            >
              {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-3xl font-semibold mb-8 text-center text-black">Reset Password</h2>
            <div className="relative mb-4">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="New Password"
                className="w-full p-4 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-700 bg-white text-black"
                value={newPassword}
                onChange={handlePasswordChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-4 flex items-center text-black"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {newPassword ? (showNewPassword ? <FaEye /> : <FaEyeSlash />) : <FaLock />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {passwordStrength && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <p
                    className={`text-sm font-medium ${
                      passwordStrength === 'weak'
                        ? 'text-red-500'
                        : passwordStrength === 'medium'
                        ? 'text-yellow-500'
                        : 'text-green-600'
                    }`}
                  >
                    {passwordStrength === 'weak'
                      ? 'Weak'
                      : passwordStrength === 'medium'
                      ? 'Medium'
                      : 'Strong'}
                  </p>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength === 'weak'
                        ? 'w-1/3 bg-red-500'
                        : passwordStrength === 'medium'
                        ? 'w-2/3 bg-yellow-500'
                        : 'w-full bg-green-600'
                    }`}
                  />
                </div>
              </div>
            )}

            <div className="relative mb-4">
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full p-4 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-700 bg-white text-black"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
              />
              <div className="absolute inset-y-0 right-4 flex items-center text-black">
                <FaLock />
              </div>
            </div>
            <button
              onClick={handleResetPassword}
              disabled={!newPassword || !confirmPassword || loading}
              className={`w-full py-4 rounded-lg transition duration-300 mb-4 ${
                !newPassword || !confirmPassword || loading
                  ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                  : 'bg-brown-6 hover:bg-brown-700 text-white'
              }`}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
