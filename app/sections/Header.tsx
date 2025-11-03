import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import LoginModal from '../components/LoginModal';
import RegisterModal from '../components/RegisterModal';
import OTPModal from '../components/OTPModal';
import ProfileModal from '@/app/components/ProfileModal'; // Corrected import path for ProfileModal
import LogoutConfirmationModal from '@/app/components/LogoutConfirmationModal'; // Import LogoutConfirmationModal
import { FaCog, FaUser, FaQuestionCircle, FaSignOutAlt } from 'react-icons/fa'; // Import necessary icons
import PathfinderLogo from '@/public/PATHFINDER-logo-edited.png'; // Corrected path to the PathFinder logo

const Header = () => {
  const [userEmail, setUserEmail] = useState<string>('');
  const { isLoggedIn, username, login, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false); // State for LogoutConfirmationModal
  const [showSettingsModal, setShowSettingsModal] = useState(false); // State for SettingsModal
  const [showHelpModal, setShowHelpModal] = useState(false); // State for HelpModal
  const [activeSectionInProfileModal, setActiveSectionInProfileModal] = useState('Profile'); // Track active section in ProfileModal

  const handleProfileClick = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    }
  };

  const handleLoginSuccess = (username: string) => {
    login(username);
    setShowLoginModal(false);
  };

  const openRegisterModal = () => {
    console.log('Register modal opened'); // Debugging log
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const closeRegisterModal = () => setShowRegisterModal(false);

  const openOTPModal = (email: string) => {
    console.log('OTP modal opened with email:', email);
    setUserEmail(email); // ✅ store the email
    setShowRegisterModal(false);
    setShowOTPModal(true);
  };

  const closeOTPModal = () => setShowOTPModal(false);

  const openProfileModal = () => {
    console.log('Profile modal opened'); // Debugging log
    setShowProfileModal(true);
  };

  const closeProfileModal = () => setShowProfileModal(false);

  const openLogoutModal = () => {
    console.log('Logout confirmation modal opened'); // Debugging log
    setShowLogoutModal(true);
  };

  const closeLogoutModal = () => setShowLogoutModal(false);

  const openSettingsModal = () => {
    console.log('Settings modal opened'); // Debugging log
    setShowSettingsModal(true);
  };

  const closeSettingsModal = () => setShowSettingsModal(false);

  const openHelpModal = () => {
    console.log('Help modal opened'); // Debugging log
    setShowHelpModal(true);
  };

  const closeHelpModal = () => setShowHelpModal(false);

  const openProfileModalWithSettings = () => {
    console.log('Profile modal opened with Settings section'); // Debugging log
    setShowProfileModal(true);
    setActiveSectionInProfileModal('Settings'); // Set the active section to "Settings"
  };

  const openProfileModalWithHelp = () => {
    console.log('Profile modal opened with Help section'); // Debugging log
    setShowProfileModal(true);
    setActiveSectionInProfileModal('Help'); // Set the active section to "Help"
  };

  return (
    <header className='fixed top-2 w-full z-50 backdrop-blur-xm pl-4 pr-4 sm:pl-10 sm:pr-10'>
      <div></div>
      <div className="flex justify-center items-center text-lg text-white navbar bg-brown-6 rounded-md p-10 sm:p-8 h-16 md:h-20 lg:h-24">
        <div className="flex-1 flex items-center">
          {/* Logo with white background extending to the far left edge */}
          <div className="bg-brown-6 p-[4px] rounded-l-md flex justify-start absolute left-12 top- h-full">
            <img src="/PATHFINDER-logo-edited.png" alt="PathFinder Logo" className="h-10 sm:h-12 md:h-16 lg:h-20" />
          </div>
          {/* Divider line */}
          {/* PathFinder label */}
          <a className="btn btn-ghost text-3xl sm:text-[30px] absolute top-5 left-3 ml-[90px]">PathFinder</a>
        </div>
        <div className="flex-none gap-2 md:gap-3 lg:gap-4">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar" onClick={handleProfileClick}>
              <div className="">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className=" gap-6 size-8 lg:size-8">
                  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {isLoggedIn ? (
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content bg-brown-6 rounded-lg absolute z-[1] mt-8 w-48 sm:w-64 md:w-96 lg:w-[28rem] p-2 sm:p-4 shadow">
                <li className="mb-2"> {/* Add spacing */}
                  <div>
                    <FaUser className="size-5 sm:size-7 md:size-9 lg:size-14 md:m-2 lg:m-3" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 30 }} /> {/* Profile icon */}
                    <p className='flex md:pl-4 lg:pl-5 text-sm md:text-xl lg:text-2xl'>{username}</p>
                  </div>
                  <hr />
                </li>
                <li className="mb-2 w-full"> {/* Centered buttons */}
                  <button
                    className="flex items-center w-full text-left p-4"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent dropdown interference
                      setActiveSectionInProfileModal('Profile'); // Set the active section to "Profile"
                      openProfileModal(); // Open the ProfileModal
                    }}
                  >
                    <FaUser className="size-5 sm:size-7 md:size-9 lg:size-10" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 30 }} /> {/* Profile icon */}
                    <div className="flex pl-2 md:pl-4 lg:pl-5 text-md md:text-xl lg:text-2xl">
                      Profile
                    </div>
                  </button>
                </li>
                <li className="mb-2"> {/* Add spacing */}
                  <button
                    className="flex items-center w-full text-left p-4"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent dropdown interference
                      openProfileModalWithSettings(); // Open ProfileModal with "Settings" section active
                    }}
                  >
                    <FaCog className="size-5 sm:size-7 md:size-9 lg:size-10" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 30 }} /> {/* Settings icon */}
                    <div className="flex pl-2 md:pl-4 lg:pl-5 text-md md:text-xl lg:text-2xl">
                      Settings
                    </div>
                  </button>
                </li>
                <li className="mb-2"> {/* Add spacing */}
                  <button
                    className="flex items-center w-full text-left p-4"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent dropdown interference
                      openProfileModalWithHelp(); // Open ProfileModal with "Help" section active
                    }}
                  >
                    <FaQuestionCircle className="size-5 sm:size-7 md:size-9 lg:size-10" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 30 }} /> {/* Help icon */}
                    <div className="flex pl-2 md:pl-4 lg:pl-5 text-md md:text-xl lg:text-2xl">
                      FAQ
                    </div>
                  </button>
                </li>
                <li> {/* No spacing needed after the last button */}
                  <button
                    className="flex items-center w-full text-left p-4"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent dropdown interference
                      setShowLogoutModal(true); // Correctly toggle the modal state
                    }}
                  >
                    <FaSignOutAlt className="size-5 sm:size-7 md:size-9 lg:size-10" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 30 }} /> {/* Logout icon */}
                    <div className="flex pl-2 md:pl-4 lg:pl-5 text-md md:text-xl lg:text-2xl">
                      Log Out
                    </div>
                  </button>
                </li>
              </ul>
            ) : (
              <>
                {showLoginModal && <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSwitchToRegister={openRegisterModal} onLoginSuccess={handleLoginSuccess} />}
                {showRegisterModal && <RegisterModal isOpen={showRegisterModal} onClose={closeRegisterModal} onSwitchToLogin={() => setShowLoginModal(true)} onSwitchToOTP={openOTPModal} />}
                {showOTPModal && (
                  <OTPModal
                    isOpen={showOTPModal}
                    onClose={closeOTPModal}
                    email={userEmail} // ✅ Fix: Pass required email prop
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={closeProfileModal}
          initialSection={activeSectionInProfileModal} // Pass the active section to ProfileModal
        />
      )}
      {showLogoutModal && <LogoutConfirmationModal isOpen={showLogoutModal} onClose={closeLogoutModal} onConfirm={logout} />}
     
    </header>
  );
};

export default Header;