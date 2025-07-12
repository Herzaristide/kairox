import React from 'react';
import { useQuery } from 'react-query';
import { inventoryApi } from '../services/api';
import { UserMonster } from '../types';
import {
  HeartIcon,
  SparklesIcon,
  ShieldCheckIcon,
  BoltIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const MonsterManagement: React.FC = () => {
  const {
    data: monsters,
    isLoading,
    refetch,
  } = useQuery('monsters', inventoryApi.getMonsters);

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common':
        return 'border-gray-400 bg-gray-500';
      case 'rare':
        return 'border-blue-400 bg-blue-500';
      case 'epic':
        return 'border-purple-400 bg-purple-500';
      case 'legendary':
        return 'border-yellow-400 bg-yellow-500';
      default:
        return 'border-gray-400 bg-gray-500';
    }
  };

  const getElementColor = (element: string) => {
    switch (element.toLowerCase()) {
      case 'fire':
        return 'text-red-400';
      case 'water':
        return 'text-blue-400';
      case 'earth':
        return 'text-green-400';
      case 'air':
        return 'text-cyan-400';
      case 'dark':
        return 'text-purple-400';
      case 'ice':
        return 'text-blue-200';
      case 'electric':
        return 'text-yellow-400';
      case 'crystal':
        return 'text-pink-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleToggleFavorite = async (
    monsterId: number,
    currentFavorite: boolean
  ) => {
    try {
      await inventoryApi.setMonsterFavorite(monsterId, !currentFavorite);
      toast.success(
        !currentFavorite ? 'Added to favorites!' : 'Removed from favorites'
      );
      refetch();
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  if (isLoading) {
    return (
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='min-h-screen flex items-center justify-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500'></div>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white mb-2'>
          Monster Management
        </h1>
        <p className='text-gray-400'>
          Manage your collected monsters, view their stats, and upgrade them.
        </p>
      </div>

      {!monsters || monsters.length === 0 ? (
        <div className='card p-8 text-center'>
          <SparklesIcon className='h-16 w-16 text-gray-400 mx-auto mb-4' />
          <h2 className='text-xl font-semibold text-white mb-2'>
            No Monsters Yet
          </h2>
          <p className='text-gray-400 mb-4'>
            You haven't collected any monsters yet. Visit the shop to get your
            first monster!
          </p>
          <button className='btn-primary'>Visit Shop</button>
        </div>
      ) : (
        <>
          <div className='mb-6 flex justify-between items-center'>
            <div className='text-sm text-gray-400'>
              Showing {monsters.length} monster
              {monsters.length !== 1 ? 's' : ''}
            </div>
            <div className='flex space-x-2'>
              <button className='btn-secondary text-sm'>Sort by Level</button>
              <button className='btn-secondary text-sm'>
                Filter by Element
              </button>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
            {monsters.map((monster: UserMonster) => (
              <div
                key={monster.id}
                className='card p-6 hover:bg-gray-800 transition-colors'
              >
                {/* Monster Image */}
                <div className='mb-4 flex justify-center'>
                  <div className='w-24 h-24 rounded-lg overflow-hidden bg-gray-700 border-2 border-gray-600 flex items-center justify-center'>
                    {monster.template.imageUrl ? (
                      <img
                        src={`http://localhost:3000${monster.template.imageUrl}`}
                        alt={monster.template.name}
                        className='w-full h-full object-cover'
                        onError={(e) => {
                          // Fallback to emoji if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      className={`text-2xl ${
                        monster.template.imageUrl ? 'hidden' : ''
                      }`}
                    >
                      {monster.template.element === 'fire' && '🔥'}
                      {monster.template.element === 'water' && '💧'}
                      {monster.template.element === 'earth' && '🌍'}
                      {monster.template.element === 'air' && '💨'}
                      {monster.template.element === 'dark' && '🌙'}
                      {monster.template.element === 'ice' && '❄️'}
                      {monster.template.element === 'electric' && '⚡'}
                      {monster.template.element === 'crystal' && '💎'}
                      {![
                        'fire',
                        'water',
                        'earth',
                        'air',
                        'dark',
                        'ice',
                        'electric',
                        'crystal',
                      ].includes(monster.template.element) && '👾'}
                    </div>
                  </div>
                </div>

                {/* Monster Header */}
                <div className='flex justify-between items-start mb-4'>
                  <div className='flex-1'>
                    <h3 className='text-lg font-semibold text-white mb-1'>
                      {monster.nickname || monster.template.name}
                    </h3>
                    <p className='text-sm text-gray-400'>
                      {monster.template.name}
                    </p>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <div
                      className={`w-3 h-3 rounded-full ${getRarityColor(
                        monster.template.rarity
                      )} border-2`}
                      title={monster.template.rarity}
                    ></div>
                    <button
                      onClick={() =>
                        handleToggleFavorite(monster.id, monster.is_favorite)
                      }
                      className='text-yellow-400 hover:text-yellow-300 transition-colors'
                    >
                      {monster.is_favorite ? (
                        <StarSolid className='h-5 w-5' />
                      ) : (
                        <StarIcon className='h-5 w-5' />
                      )}
                    </button>
                  </div>
                </div>

                {/* Element and Level */}
                <div className='flex justify-between items-center mb-4'>
                  <span
                    className={`text-sm font-medium ${getElementColor(
                      monster.template.element
                    )}`}
                  >
                    {monster.template.element.charAt(0).toUpperCase() +
                      monster.template.element.slice(1)}
                  </span>
                  <span className='text-sm font-medium text-primary-400'>
                    Level {monster.level}
                  </span>
                </div>

                {/* Stats */}
                <div className='grid grid-cols-2 gap-3 mb-4'>
                  <div className='flex items-center space-x-2'>
                    <HeartIcon className='h-4 w-4 text-red-400' />
                    <span className='text-sm text-gray-300'>{monster.hp}</span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <SparklesIcon className='h-4 w-4 text-orange-400' />
                    <span className='text-sm text-gray-300'>
                      {monster.strength}
                    </span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <BoltIcon className='h-4 w-4 text-yellow-400' />
                    <span className='text-sm text-gray-300'>
                      {monster.speed}
                    </span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <ShieldCheckIcon className='h-4 w-4 text-blue-400' />
                    <span className='text-sm text-gray-300'>
                      {monster.ability}
                    </span>
                  </div>
                </div>

                {/* Experience Bar */}
                <div className='mb-4'>
                  <div className='flex justify-between items-center mb-1'>
                    <span className='text-xs text-gray-400'>Experience</span>
                    <span className='text-xs text-gray-400'>
                      {monster.experience}/100
                    </span>
                  </div>
                  <div className='w-full bg-gray-700 rounded-full h-2'>
                    <div
                      className='bg-primary-500 h-2 rounded-full transition-all duration-300'
                      style={{
                        width: `${Math.min(
                          (monster.experience / 100) * 100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Description */}
                {monster.template.description && (
                  <p className='text-xs text-gray-500 mb-4 line-clamp-2'>
                    {monster.template.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className='flex space-x-2'>
                  <button className='btn-primary text-xs flex-1'>
                    Upgrade
                  </button>
                  <button className='btn-secondary text-xs flex-1'>
                    Equipment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MonsterManagement;
