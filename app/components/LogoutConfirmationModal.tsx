'use client';
import React from 'react';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null; // Ensure modal is not rendered when closed

  const handleConfirm = async () => {
    await onConfirm(); // Await if onConfirm is asynchronous
    onClose(); // Close the modal after confirming
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center text-black bg-black bg-opacity-50">
      <div className="bg-white pt-16 pb-10 pl-12 pr-10 rounded-lg shadow-md w-full max-w-lg md:max-w-xl lg:max-w-xl">
        <h2 className="text-3xl font-bold mb-8 items-center pr-0">Are you sure you want to log out?</h2>
        <div className="flex justify-end gap-5">
          <button
            onClick={onClose}
            className="btn btn-secondary bg-transparent border border-brown-6 text-black text-lg md:text-xl lg:text-xl rounded px-8 py-2 w-28 hover:bg-brown-700 hover:text-white hover:border-brown-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-primary bg-brown-6 border-brown-6 text-white rounded-lg text-lg md:text-xl lg:text-xl px-8 py-2 w-28 hover:bg-brown-700 hover:border-brown-700"
          >
            confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmationModal;
