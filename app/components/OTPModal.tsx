'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Logo from '@/public/PATHFINDER-logo-edited.png'; // update this path if needed
import { X } from 'lucide-react';

interface OTPModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onVerificationSuccess?: () => void;
}

const OTPModal: React.FC<OTPModalProps> = ({
  isOpen,
  email,
  onClose,
  onVerificationSuccess,
}) => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleChange = (value: string, index: number) => {
    if (/^\d?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < 5) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter the full 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/verify-register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp: otpValue }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Account created successfully!');
        onClose();
        if (onVerificationSuccess) onVerificationSuccess();
      } else {
        toast.error(data.detail || 'Invalid OTP');
      }
    } catch {
      toast.error('Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/resend-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('OTP resent to your email!');
        setCooldown(30);
      } else {
        toast.error(data.detail || 'Failed to resend OTP');
      }
    } catch {
      toast.error('Error resending OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="
          max-w-xl w-full
          p-12
          bg-[#f6f2ea] /* dirty white */
          rounded-3xl
          shadow-2xl
          flex flex-col items-center
          space-y-6
        "
      >
        <button
          onClick={onClose}
          className="absolute top-7 right-1 p-2 rounded-full bg-[#4b3621] text-white hover:bg-[#6b4d33] shadow-md"
        >
          <X className="h-6 w-6" />
        </button>
        {/* Logo (slightly bigger now) */}
        <div className="w-28 h-28">
          <Image src={Logo} alt="Lock Icon" width={120} height={120} />
        </div>

        <DialogTitle className="text-3xl font-bold text-[#4b3621]">
          Enter OTP Code
        </DialogTitle>

        <p className="text-center text-xl text-[#6b4d33] max-w-[38rem]">
          We’ve sent a 6-digit OTP to{' '}
          <span className="font-semibold text-[#3b2a1f]">{email}</span>
        </p>

        {/* OTP Input */}
        <form onSubmit={handleVerify} className="w-full space-y-6">
          <div className="flex justify-center gap-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="
                  w-16 h-16 sm:w-18 sm:h-18
                  text-center text-2xl font-extrabold leading-6 text-[#2d1a0e]
                  border-2 border-[#c8a586] rounded-2xl
                  focus:outline-none focus:ring-4 focus:ring-[#4b3621]/30
                  bg-white shadow-sm
                "
              />
            ))}
          </div>

          {/* Verify button (taller) */}
          <Button
            type="submit"
            className="
              w-full h-16
              bg-[#4b3621] hover:bg-[#6b4d33]
              text-white text-lg font-semibold
              rounded-2xl shadow-md
              transition-all duration-200
            "
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
        </form>

        {/* Resend Code */}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="text-xl text-[#4b3621] hover:underline disabled:text-gray-400 font-medium"
        >
          {resending
            ? 'Resending...'
            : cooldown > 0
            ? `Resend Code in ${cooldown}s`
            : 'Resend Code'}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default OTPModal;
