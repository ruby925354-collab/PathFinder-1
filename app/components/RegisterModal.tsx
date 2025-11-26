// RegisterModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { FaTimes, FaEnvelope, FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import Logo from '@/public/PATHFINDER-logo-edited.png';
import axios from 'axios';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSwitchToOTP: (email: string) => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
  onSwitchToOTP,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);

  const [fname, setFname] = useState('');
  const [mname, setMname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | ''>('');
  const [emailError, setEmailError] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState('');

  const [isNextLoading, setIsNextLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailValidated, setEmailValidated] = useState(false);

  const [passwordChecks, setPasswordChecks] = useState({
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    minLength: false,
  });
  const [showSpamModal, setShowSpamModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setTimeout(() => setIsVisible(false), 300);
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setStep(1);
    setFname('');
    setMname('');
    setLname('');
    setPasswordValue('');
    setConfirmPassword('');
    setEmail('');
    setUsername('');
    setPasswordStrength('');
    setEmailError('');
    setPasswordMatchError('');
    setShowPassword(false);
    setIsNextLoading(false);
    setIsRegisterLoading(false);
    setEmailValidating(false);
    setEmailValidated(false);
    setPasswordChecks({
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
      minLength: false,
    });
  };

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
      resetState();
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const evaluatePasswordStrength = (password: string) => {
    const hasLetters = /[A-Za-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasMinLength = password.length >= 8;
    if (hasLetters && hasNumbers && hasSpecial && hasMinLength) return 'strong';
    if ((hasLetters && hasNumbers) || (hasLetters && hasSpecial) || (hasNumbers && hasSpecial))
      return 'medium';
    return 'weak';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || '';
    setPasswordValue(value);

    setPasswordChecks({
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      minLength: value.length >= 8,
    });

    setPasswordStrength(value ? evaluatePasswordStrength(value) : '');
    setPasswordMatchError(confirmPassword && value !== confirmPassword ? 'Passwords do not match' : '');
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || '';
    setConfirmPassword(value);
    setPasswordMatchError(value && value !== passwordValue ? 'Passwords do not match' : '');
  };

    const checkEmailManually = async () => {
    if (!email) {
      setEmailError('Please enter an email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Invalid email format');
      return;
    }

    try {
      setEmailValidating(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const res = await axios.get(`${apiBase}/api/validate-email`, { params: { email } });

      const data = res.data;

      const isValidFormat = data.is_valid_format;
      const isDisposable = data.is_disposable_email;
      const isMalicious = data.is_malicious;
      const domainExists = data.domain_exists;
      const smtpValid = data.smtp_valid;
      const score = parseFloat(data.quality_score || "0");

      // ❌ Invalid format
      if (!isValidFormat) {
        setEmailError("Invalid email format.");
        setEmailValidated(false);
        return;
      }

      // ❌ Disposable email
      if (isDisposable) {
        setEmailError("Disposable or temporary emails are not allowed.");
        setEmailValidated(false);
        return;
      }

      // ❌ Malicious / dangerous email
      if (isMalicious) {
        setEmailError("This email is identified as malicious.");
        setEmailValidated(false);
        return;
      }

      // ❌ Domain does not exist
      if (!domainExists) {
        setEmailError("The email domain does not exist.");
        setEmailValidated(false);
        return;
      }

      // ❌ SMTP says it's probably invalid
      if (!smtpValid) {
        setEmailError("This email address may not exist.");
        setEmailValidated(false);
        return;
      }

      // ❌ Low reputation score
      if (score < 0.5) {
        setEmailError("This email has a low reputation score.");
        setEmailValidated(false);
        return;
      }

      // ✅ Valid
      setEmailError("");
      setEmailValidated(true);

    } catch (err) {
      // setEmailError("Could not validate email");
      setEmailValidated(true);
    } finally {
      setEmailValidating(false);
    }
  };
 const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailError || passwordMatchError || isRegisterLoading || !emailValidated) return;

    setIsRegisterLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiBase}/api/request-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: fname,
          middleName: mname || null,
          lastName: lname,
          email,
          username,
          password: passwordValue,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        if (response.status === 400) {
          alert(errData.detail || 'Email or username already exists');
        } else {
          alert(errData.detail || 'Failed to send OTP');
        }
        setIsRegisterLoading(false);
        return;
      }

      // ✅ ADD THIS PART
      alert(
        "We've sent an OTP to your email.\n\n" +
        "!!!please check your Spam or Junk folder if not found!!!"
      );

      onClose();
      onSwitchToOTP(email);
    } catch (error) {
      console.error('Error sending OTP:', error);
      alert('Failed to send OTP. Please try again.');
      setIsRegisterLoading(false);
    }
  };

  const isStep1Valid = fname.trim() !== '' && lname.trim() !== '';
  const isStep2Valid =
    Object.values(passwordChecks).every(Boolean) &&
    passwordValue === confirmPassword &&
    !emailError &&
    !passwordMatchError &&
    email.trim() !== '' &&
    username.trim() !== '' &&
    emailValidated; // ✅ require validated email

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`fixed inset-0 bg-black bg-opacity-0 transition-all duration-300 ${
          isOpen ? 'backdrop-blur-md' : 'backdrop-blur-none'
        }`}
        onClick={handleBackgroundClick}
      />
      {isVisible && (
        <div className="flex justify-center items-center h-full mt-10">
          <div className="bg-brown-1 p-6 md:p-10 lg:p-14 rounded-lg shadow-lg w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-7xl flex relative z-10 transition-all duration-500">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition duration-300"
            >
              <FaTimes size={24} />
            </button>

            {/* LEFT SIDE FORM */}
            <div className="w-full md:w-full lg:w-1/2 p-6 md:p-8 lg:p-10 bg-brown-1 md:border-2 md:border-brown-6 rounded-lg">
              {step === 1 ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!isStep1Valid) return;

                    setIsNextLoading(true);
                    setTimeout(() => {
                      setStep(2);
                      setIsNextLoading(false);
                    }, 600);
                  }}
                >
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold mt-6 mb-8 text-center text-black">
                    Personal Info
                  </h2>
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={fname}
                      onChange={(e) => setFname(e.target.value)}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-700 bg-brown-1 text-black"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Middle Name (Optional)"
                      value={mname}
                      onChange={(e) => setMname(e.target.value)}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-700 bg-brown-1 text-black"
                    />
                  </div>
                  <div className="mb-6">
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lname}
                      onChange={(e) => setLname(e.target.value)}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-700 bg-brown-1 text-black"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={`w-full py-3 rounded-lg transition duration-300 flex items-center justify-center gap-2 ${
                      isStep1Valid
                        ? 'bg-brown-6 text-white hover:bg-brown-700'
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                    disabled={!isStep1Valid || isNextLoading}
                  >
                    {isNextLoading ? 'Loading...' : 'Next'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister}>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold mt-6 mb-8 text-center text-black">
                    Register
                  </h2>

                  {/* ✅ Email with Check Button */}
                  <div className="mb-4 relative flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError('');
                          setEmailValidated(false);
                        }}
                        className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-700 bg-brown-1 text-black"
                        required
                      />
                      <FaEnvelope className="absolute right-3 top-3 text-black" />
                      {emailValidating && <p className="text-blue-500 text-sm mt-1">Checking email...</p>}
                      {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
                      {emailValidated && !emailError && (
                        <p className="text-green-600 text-sm mt-1">Email is valid ✅</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={checkEmailManually}
                      disabled={emailValidating}
                      className={`px-4 h-[42px] rounded-lg transition duration-300 flex items-center justify-center
                        ${!emailValidating
                          ? 'bg-brown-6 text-white hover:bg-brown-700'
                          : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        }`}
                    >
                      {emailValidating ? 'Checking...' : 'Check'}
                    </button>
                  </div>

                  <div className="mb-4 relative">
                    <input
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-700 bg-brown-1 text-black"
                      required
                    />
                    <FaUser className="absolute right-3 top-3 text-black" />
                  </div>

                  {/* Password fields unchanged */}
                  <div className="mb-2 relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-700 bg-brown-1 text-black"
                      value={passwordValue}
                      onChange={handlePasswordChange}
                      required
                    />
                    {passwordValue && (
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-3 top-3 text-black focus:outline-none"
                      >
                        {showPassword ? <FaEye /> : <FaEyeSlash />}
                      </button>
                    )}
                    {!passwordValue && <FaLock className="absolute right-3 top-3 text-black" />}
                  </div>

                  {/* Password Requirements */}
                  <div className="mb-4 text-sm text-black">
                    <label className="block font-semibold mb-1">Password must contain:</label>
                    <div className="flex flex-col gap-1">
                      <label
                        className={`flex items-center gap-2 ${
                          passwordChecks.uppercase ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        <input type="checkbox" readOnly checked={passwordChecks.uppercase} />
                        <span>At least 1 uppercase letter</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 ${
                          passwordChecks.lowercase ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        <input type="checkbox" readOnly checked={passwordChecks.lowercase} />
                        <span>At least 1 lowercase letter</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 ${
                          passwordChecks.number ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        <input type="checkbox" readOnly checked={passwordChecks.number} />
                        <span>At least 1 number</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 ${
                          passwordChecks.special ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        <input type="checkbox" readOnly checked={passwordChecks.special} />
                        <span>At least 1 special character</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 ${
                          passwordChecks.minLength ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        <input type="checkbox" readOnly checked={passwordChecks.minLength} />
                        <span>Minimum 8 characters</span>
                      </label>
                    </div>
                  </div>

                  {passwordStrength && (
                    <p
                      className={`text-sm mb-4 ${
                        passwordStrength === 'weak'
                          ? 'text-red-500'
                          : passwordStrength === 'medium'
                          ? 'text-yellow-500'
                          : 'text-green-500'
                      }`}
                    >
                      Password strength: {passwordStrength}
                    </p>
                  )}

                  <div className="mb-6 relative">
                    <input
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      className="w-full p-4 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-700 bg-brown-1 text-black"
                      required
                    />
                    <FaLock className="absolute right-4 top-4 text-black" />
                    {passwordMatchError && <p className="text-red-500 text-sm mt-1">{passwordMatchError}</p>}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/2 py-3 bg-gray-300 text-black rounded-lg hover:bg-gray-400 transition duration-300"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className={`w-1/2 py-3 rounded-lg transition duration-300 flex items-center justify-center gap-2 ${
                        isStep2Valid && !isRegisterLoading
                          ? 'bg-brown-6 text-white hover:bg-brown-700'
                          : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      }`}
                      // disabled={!isStep2Valid || isRegisterLoading}
                    >
                      {isRegisterLoading ? 'Registering...' : 'Register'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* RIGHT SIDE IMAGE */}
            <div className="hidden lg:flex lg:w-1/2 justify-center items-center">
              <Image
                src={Logo}
                alt="Pathfinder Logo"
                className="object-contain max-h-[500px] w-full"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterModal;


