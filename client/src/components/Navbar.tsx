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
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16'>
          <div className='flex items-center'>
            <Link to='/dashboard' className='flex items-center'>
              <h1 className='text-2xl font-bold text-white'>Kairox</h1>
            </Link>

            <div className='hidden md:block ml-10'>
              <div className='flex items-baseline space-x-4'>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <Icon className='h-4 w-4 mr-2' />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className='flex items-center space-x-4'>
            {/* User info */}
            <div className='flex items-center space-x-3'>
              <div className='text-right hidden sm:block'>
                <p className='text-sm font-medium text-white'>
                  {user?.username}
                </p>
                <p className='text-xs text-gray-400'>Level {user?.level}</p>
              </div>

              <div className='flex items-center space-x-2 text-yellow-400'>
                <span className='text-sm font-medium'>
                  {user?.coins?.toLocaleString()}
                </span>
                <span className='text-xs'>coins</span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              className='flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors'
            >
              <ArrowLeftOnRectangleIcon className='h-4 w-4 mr-2' />
              <span className='hidden sm:inline'>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className='md:hidden'>
        <div className='px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-700'>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className='h-5 w-5 mr-3' />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
