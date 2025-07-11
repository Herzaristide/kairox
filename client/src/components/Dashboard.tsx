import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { inventoryApi } from '../services/api';
import { UserMonster } from '../types';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import {
  HeartIcon,
  StarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedMonster, setSelectedMonster] = useState<UserMonster | null>(
    null
  );

  const {
    data: monsters,
    isLoading: monstersLoading,
    refetch: refetchMonsters,
  } = useQuery('monsters', inventoryApi.getMonsters, {
    staleTime: 30000, // 30 seconds
  });

  const { data: equipment, isLoading: equipmentLoading } = useQuery(
    'equipment',
    inventoryApi.getEquipment,
    {
      staleTime: 30000,
    }
  );

  const handleSetFavorite = async (monsterId: number, isFavorite: boolean) => {
    try {
      await inventoryApi.setMonsterFavorite(monsterId, isFavorite);
      refetchMonsters();
      toast.success(
        `Monster ${isFavorite ? 'added to' : 'removed from'} favorites`
      );
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'text-gray-400 border-gray-400';
      case 'rare':
        return 'text-blue-400 border-blue-400';
      case 'epic':
        return 'text-purple-400 border-purple-400';
      case 'legendary':
        return 'text-yellow-400 border-yellow-400';
      default:
        return 'text-gray-400 border-gray-400';
    }
  };

  const getElementColor = (element: string) => {
    switch (element) {
      case 'fire':
        return 'text-red-400';
      case 'water':
        return 'text-blue-400';
      case 'earth':
        return 'text-yellow-600';
      case 'air':
        return 'text-cyan-400';
      case 'dark':
        return 'text-purple-400';
      case 'light':
        return 'text-yellow-300';
      default:
        return 'text-gray-400';
    }
  };

  const calculateTotalStats = (monster: UserMonster) => {
    let totalStats = {
      hp: monster.hp,
      strength: monster.strength,
      speed: monster.speed,
      ability: monster.ability,
    };

    // Add equipment bonuses
    monster.equipment?.forEach((item) => {
      const multiplier = 1 + item.enhancementLevel * 0.1;
      totalStats.hp += Math.floor(item.template.hpBonus * multiplier);
      totalStats.strength += Math.floor(
        item.template.strengthBonus * multiplier
      );
      totalStats.speed += Math.floor(item.template.speedBonus * multiplier);
      totalStats.ability += Math.floor(item.template.abilityBonus * multiplier);
    });

    return totalStats;
  };

  if (monstersLoading) {
    return (
      <div className='flex items-center justify-center min-h-96'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500'></div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      {/* Welcome Section */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white mb-2'>
          Welcome back, {user?.username}!
        </h1>
        <div className='flex items-center space-x-6 text-gray-300'>
          <div className='flex items-center space-x-2'>
            <StarIcon className='h-5 w-5 text-yellow-400' />
            <span>Level {user?.level}</span>
          </div>
          <div className='flex items-center space-x-2'>
            <span>⚡ {user?.experience} XP</span>
          </div>
          <div className='flex items-center space-x-2'>
            <span>🪙 {user?.coins?.toLocaleString()} coins</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        <div className='card p-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>
            Your Monsters
          </h3>
          <p className='text-3xl font-bold text-primary-400'>
            {monsters?.length || 0}
          </p>
          <p className='text-gray-400 text-sm'>Total collected</p>
        </div>

        <div className='card p-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>Equipment</h3>
          <p className='text-3xl font-bold text-green-400'>
            {equipment?.length || 0}
          </p>
          <p className='text-gray-400 text-sm'>Items owned</p>
        </div>

        <div className='card p-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>Battles Won</h3>
          <p className='text-3xl font-bold text-yellow-400'>0</p>
          <p className='text-gray-400 text-sm'>Victory count</p>
        </div>
      </div>

      {/* Monster Collection */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Monster List */}
        <div className='lg:col-span-2'>
          <h2 className='text-2xl font-bold text-white mb-6'>Your Monsters</h2>

          {!monsters || monsters.length === 0 ? (
            <div className='card p-8 text-center'>
              <p className='text-gray-400 mb-4'>
                You don't have any monsters yet.
              </p>
              <p className='text-gray-500 text-sm'>
                Visit the shop to get your first monster!
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {monsters.map((monster: UserMonster) => {
                const totalStats = calculateTotalStats(monster);

                return (
                  <div
                    key={monster.id}
                    className={`monster-card ${
                      selectedMonster?.id === monster.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedMonster(monster)}
                  >
                    <div className='flex justify-between items-start mb-3'>
                      <div>
                        <h3 className='font-semibold text-white'>
                          {monster.nickname || monster.template.name}
                        </h3>
                        <p
                          className={`text-sm ${getRarityColor(
                            monster.template.rarity
                          )}`}
                        >
                          {monster.template.rarity.charAt(0).toUpperCase() +
                            monster.template.rarity.slice(1)}
                        </p>
                      </div>

                      <div className='flex items-center space-x-2'>
                        <span
                          className={`text-sm ${getElementColor(
                            monster.template.element
                          )}`}
                        >
                          {monster.template.element}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetFavorite(monster.id, !monster.isFavorite);
                          }}
                          className='text-gray-400 hover:text-red-400 transition-colors'
                        >
                          {monster.isFavorite ? (
                            <HeartSolidIcon className='h-5 w-5 text-red-400' />
                          ) : (
                            <HeartIcon className='h-5 w-5' />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className='flex items-center justify-between text-sm text-gray-300 mb-3'>
                      <span>Level {monster.level}</span>
                      <span>HP: {totalStats.hp}</span>
                    </div>

                    <div className='grid grid-cols-2 gap-2 text-xs text-gray-400'>
                      <div>STR: {totalStats.strength}</div>
                      <div>SPD: {totalStats.speed}</div>
                      <div>ABL: {totalStats.ability}</div>
                      <div className='flex items-center'>
                        <ShieldCheckIcon className='h-3 w-3 mr-1' />
                        {monster.equipment?.length || 0}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monster Details */}
        <div className='lg:col-span-1'>
          <h2 className='text-2xl font-bold text-white mb-6'>
            Monster Details
          </h2>

          {selectedMonster ? (
            <div className='card p-6'>
              <div className='text-center mb-6'>
                <h3 className='text-xl font-bold text-white mb-2'>
                  {selectedMonster.nickname || selectedMonster.template.name}
                </h3>
                <div className='flex justify-center items-center space-x-4 text-sm'>
                  <span
                    className={getRarityColor(selectedMonster.template.rarity)}
                  >
                    {selectedMonster.template.rarity}
                  </span>
                  <span
                    className={getElementColor(
                      selectedMonster.template.element
                    )}
                  >
                    {selectedMonster.template.element}
                  </span>
                  <span className='text-gray-400'>
                    Level {selectedMonster.level}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className='space-y-3 mb-6'>
                <h4 className='font-semibold text-white'>Stats</h4>
                {(() => {
                  const totalStats = calculateTotalStats(selectedMonster);
                  return (
                    <div className='space-y-2'>
                      <div className='flex justify-between'>
                        <span className='text-gray-400'>HP</span>
                        <span className='text-white'>{totalStats.hp}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-400'>Strength</span>
                        <span className='text-white'>
                          {totalStats.strength}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-400'>Speed</span>
                        <span className='text-white'>{totalStats.speed}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-400'>Ability</span>
                        <span className='text-white'>{totalStats.ability}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Skills */}
              <div className='space-y-3 mb-6'>
                <h4 className='font-semibold text-white'>Skills</h4>
                <div className='space-y-2'>
                  {selectedMonster.template.skills.map((skill, index) => (
                    <div key={skill.id} className='bg-gray-700 rounded p-3'>
                      <div className='flex justify-between items-start mb-1'>
                        <span className='font-medium text-white'>
                          {skill.name}
                        </span>
                        <span className='text-xs text-gray-400'>
                          CD: {skill.cooldown}
                        </span>
                      </div>
                      <p className='text-xs text-gray-400 mb-1'>
                        {skill.description}
                      </p>
                      {skill.damage > 0 && (
                        <p className='text-xs text-red-400'>
                          Damage: {skill.damage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              {selectedMonster.equipment &&
                selectedMonster.equipment.length > 0 && (
                  <div className='space-y-3'>
                    <h4 className='font-semibold text-white'>Equipment</h4>
                    <div className='space-y-2'>
                      {selectedMonster.equipment.map((item) => (
                        <div key={item.id} className='bg-gray-700 rounded p-3'>
                          <div className='flex justify-between items-start'>
                            <span className='font-medium text-white'>
                              {item.template.name}
                            </span>
                            <span className='text-xs text-gray-400'>
                              +{item.enhancementLevel}
                            </span>
                          </div>
                          <p className='text-xs text-gray-400'>
                            {item.template.slot}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className='card p-6 text-center'>
              <p className='text-gray-400'>Select a monster to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
