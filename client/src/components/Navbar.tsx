import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  CogIcon,
  ShoppingBagIcon,
  SparklesIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Monsters', href: '/monsters', icon: UserGroupIcon },
    { name: 'Battle', href: '/battle', icon: SparklesIcon },
    { name: 'Shop', href: '/shop', icon: ShoppingBagIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className='bg-gray-800 border-b border-gray-700'>
      <div className='max-w-7xl mx-auto px-2 sm:px-4 lg:px-8'>
        <div className='flex justify-between items-center h-14 sm:h-16'>
          <div className='flex items-center min-w-0 flex-1'>
            <Link to='/dashboard' className='flex items-center flex-shrink-0'>
              <h1 className='text-lg sm:text-2xl font-bold text-white'>
                Kairox
              </h1>
            </Link>

            <div className='ml-3 sm:ml-6 lg:ml-10 flex-1 min-w-0'>
              <div className='flex items-center justify-evenly space-x-1 sm:space-x-2 lg:space-x-4 overflow-x-auto'>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`px-1.5 sm:px-2 lg:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium flex items-center transition-colors flex-shrink-0 ${
                        isActive(item.href)
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <Icon className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                      <span className='hidden ml-1 lg:ml-2 whitespace-nowrap'>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className='flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0'>
            {/* User info */}
            <div className='flex items-center space-x-1 sm:space-x-2'>
              <div className='text-right hidden lg:block'>
                <p className='text-xs sm:text-sm font-medium text-white truncate'>
                  {user?.username}
                </p>
                <p className='text-xs text-gray-400'>Level {user?.level}</p>
              </div>

              <div className='flex items-center space-x-1 text-yellow-400'>
                <span className='text-xs sm:text-sm font-medium'>
                  {user?.coins?.toLocaleString()}
                </span>
                <span className='text-xs hidden sm:inline'>coins</span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              className='flex items-center px-1.5 sm:px-2 lg:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors flex-shrink-0'
            >
              <ArrowLeftOnRectangleIcon className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
              <span className='hidden lg:inline ml-1'>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
