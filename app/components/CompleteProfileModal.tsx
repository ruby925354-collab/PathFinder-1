'use client';
import React, { useState } from 'react';

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: { firstName: string; middleName?: string; lastName: string }) => void;
}

const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    onComplete({ firstName, middleName, lastName });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Complete Your Profile</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full p-2 mb-3 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Middle Name (optional)"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            className="w-full p-2 mb-3 border rounded"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full p-2 mb-4 border rounded"
            required
          />
          <button
            type="submit"
            className="w-full py-2 bg-brown-6 text-white rounded hover:bg-brown-700"
          >
            Complete Registration
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfileModal;
