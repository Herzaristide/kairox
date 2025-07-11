import React, { useState, useEffect } from 'react';
import { gameSocket } from '../services/socket';
import { inventoryApi } from '../services/api';
import { UserMonster, BattleState, CombatEvent } from '../types';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  ShieldCheckIcon,
  HeartIcon,
  BoltIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const Battle: React.FC = () => {
  const [gameState, setGameState] = useState<
    'lobby' | 'selecting' | 'waiting' | 'battle' | 'finished'
  >('lobby');
  const [selectedMonsters, setSelectedMonsters] = useState<number[]>([]);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [combatEvents, setCombatEvents] = useState<CombatEvent[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [opponent, setOpponent] = useState<any>(null);
  const [lobbyData, setLobbyData] = useState<any>(null);
  const [lobbyMessage, setLobbyMessage] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);

  const { data: monsters, isLoading } = useQuery(
    'monsters',
    inventoryApi.getMonsters
  );

  useEffect(() => {
    // Check initial connection state
    setIsSocketConnected(gameSocket.isConnected());

    // Setup socket event listeners
    gameSocket.on('connected', () => {
      console.log('🔗 Socket connected');
      setIsSocketConnected(true);
    });

    gameSocket.on('disconnected', () => {
      console.log('🔌 Socket disconnected');
      setIsSocketConnected(false);
    });

    gameSocket.on('connection_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
      setIsSocketConnected(false);
      toast.error('Failed to connect to game server');
    });

    gameSocket.on('lobby_joined', (data: any) => {
      toast.success(data.message);
      setGameState('selecting');
      if (data.lobbyData) {
        setLobbyData(data.lobbyData);
      }
    });

    gameSocket.on('lobby_update', (data: any) => {
      setLobbyData(data);
    });

    gameSocket.on('lobby_message', (data: any) => {
      setLobbyMessage(data.message);
      toast(data.message);
    });

    gameSocket.on('match_found', (data: any) => {
      toast.success('Match found!');
      setOpponent(data.opponent);
      setGameState('waiting');
    });

    gameSocket.on('preparation_phase', (data: any) => {
      toast(data.message);
      setTimeRemaining(Math.floor((data.deadline - Date.now()) / 1000));
    });

    gameSocket.on('battle_start', (data: any) => {
      console.log('🔥 Battle started!', data);
      setBattleState(data.battleState);
      setGameState('battle');
      toast.success('Battle begins!');
    });

    gameSocket.on('turn_start', (data: any) => {
      console.log('🎯 Turn started:', data);
      setBattleState(data.battleState);
      setTimeRemaining(Math.floor((data.turnDeadline - Date.now()) / 1000));
    });

    gameSocket.on('battle_update', (data: any) => {
      setBattleState(data.battleState);
      setCombatEvents((prev) => [...prev, ...data.events]);
    });

    gameSocket.on('battle_end', (data: any) => {
      setBattleState(data.battleState);
      setGameState('finished');
      toast.success(`Battle ended! Winner: ${data.winnerUsername}`);
    });

    gameSocket.on('error', (data: any) => {
      toast.error(data.message);
    });

    // Cleanup
    return () => {
      gameSocket.off('connected');
      gameSocket.off('disconnected');
      gameSocket.off('connection_error');
      gameSocket.off('lobby_joined');
      gameSocket.off('lobby_update');
      gameSocket.off('lobby_message');
      gameSocket.off('match_found');
      gameSocket.off('battle_start');
      gameSocket.off('preparation_phase');
      gameSocket.off('turn_start');
      gameSocket.off('battle_update');
      gameSocket.off('battle_end');
      gameSocket.off('error');
    };
  }, []);

  useEffect(() => {
    // Timer countdown
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  // Effect to ensure socket connection on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !isSocketConnected) {
      console.log('🔄 Attempting to connect socket with stored token...');
      try {
        gameSocket.connect(token);
      } catch (error) {
        console.error('Socket connection failed:', error);
      }
    }
  }, [isSocketConnected]);

  const handleJoinLobby = () => {
    if (!isSocketConnected) {
      toast.error('Not connected to game server');
      return;
    }
    console.log('🎮 Joining lobby...');
    gameSocket.joinLobby();
  };

  const handleLeaveLobby = () => {
    gameSocket.leaveLobby();
    setGameState('lobby');
    setSelectedMonsters([]);
    setOpponent(null);
  };

  const handleMonsterSelection = (monsterId: number) => {
    setSelectedMonsters((prev) => {
      if (prev.includes(monsterId)) {
        return prev.filter((id) => id !== monsterId);
      } else if (prev.length < 3) {
        return [...prev, monsterId];
      }
      return prev;
    });
  };

  const handleConfirmSelection = () => {
    if (selectedMonsters.length === 0) {
      toast.error('Please select at least one monster');
      return;
    }
    gameSocket.selectMonsters(selectedMonsters);
    toast('Monsters selected! Waiting for opponent...');
  };

  const handleSkillUse = (skillId: number) => {
    if (!selectedTarget || !battleState) {
      toast.error('Please select a target first');
      return;
    }

    const currentMonster =
      battleState.turnOrder[battleState.currentMonsterIndex];
    if (!currentMonster) {
      toast.error('No active monster');
      return;
    }

    console.log(
      `🎯 Using skill ${skillId} with monster ${currentMonster.id} on target ${selectedTarget}`
    );

    // Use the public useSkill method
    gameSocket.useSkill(skillId, selectedTarget, currentMonster.id);

    // Reset target selection
    setSelectedTarget(null);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-400';
      case 'rare':
        return 'border-blue-400';
      case 'epic':
        return 'border-purple-400';
      case 'legendary':
        return 'border-yellow-400';
      default:
        return 'border-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-96'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500'></div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white mb-2'>Battle Arena</h1>
        <p className='text-gray-400'>Fight other players with your monsters!</p>
      </div>

      {/* Lobby State */}
      {gameState === 'lobby' && (
        <div className='max-w-2xl mx-auto text-center'>
          <div className='card p-8'>
            <SparklesIcon className='h-16 w-16 text-primary-400 mx-auto mb-4' />
            <h2 className='text-2xl font-bold text-white mb-4'>
              Ready to Battle?
            </h2>
            <p className='text-gray-400 mb-6'>
              Join the matchmaking queue to find an opponent and start battling!
            </p>
            <button
              onClick={handleJoinLobby}
              className='btn-primary text-lg px-8 py-3'
              disabled={!isSocketConnected}
            >
              {isSocketConnected ? 'Join Battle Lobby' : 'Connecting...'}
            </button>
          </div>
        </div>
      )}

      {/* Monster Selection State with Lobby Display */}
      {gameState === 'selecting' && (
        <div>
          {/* Lobby Information */}
          {lobbyData && (
            <div className='mb-8'>
              <div className='card p-6'>
                <div className='flex justify-between items-center mb-4'>
                  <h3 className='text-xl font-semibold text-white'>
                    Battle Lobby
                  </h3>
                  <button
                    onClick={handleLeaveLobby}
                    className='btn-secondary text-sm'
                  >
                    Leave Lobby
                  </button>
                </div>

                {/* Players in Lobby */}
                <div className='mb-4'>
                  <h4 className='text-lg text-gray-300 mb-2'>
                    Players ({lobbyData.players?.length || 0})
                  </h4>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    {lobbyData.players?.map((player: any, index: number) => (
                      <div
                        key={player.userId}
                        className='bg-gray-800 rounded-lg p-3 flex items-center justify-between'
                      >
                        <div>
                          <div className='font-medium text-white'>
                            {player.username}
                          </div>
                          <div className='text-sm text-gray-400'>
                            {player.monstersSelected
                              ? '✅ Ready'
                              : '⏳ Selecting monsters...'}
                          </div>
                        </div>
                        <div className='text-xs text-gray-500'>
                          Joined{' '}
                          {Math.floor((Date.now() - player.joinedAt) / 1000)}s
                          ago
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Countdown Display */}
                {lobbyData.canStart && lobbyData.countdown < 30 && (
                  <div className='bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-lg p-4 text-center'>
                    <div className='flex items-center justify-center space-x-2 mb-2'>
                      <ClockIcon className='h-6 w-6 text-red-400' />
                      <span className='text-xl font-bold text-white'>
                        Battle starting in {lobbyData.countdown}s
                      </span>
                    </div>
                    <p className='text-sm text-gray-300'>
                      Get ready! The battle will begin automatically.
                    </p>
                  </div>
                )}

                {/* Lobby Message */}
                {lobbyMessage && (
                  <div className='mt-3 text-center text-lg font-medium text-primary-400'>
                    {lobbyMessage}
                  </div>
                )}

                {/* Status Message */}
                {!lobbyData.canStart && (
                  <div className='text-center text-gray-400'>
                    <ClockIcon className='h-8 w-8 mx-auto mb-2 text-gray-500' />
                    Waiting for more players to join...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className='mb-6 flex justify-between items-center'>
            <h2 className='text-2xl font-bold text-white'>
              Select Your Battle Team
            </h2>
            <div className='flex items-center space-x-4'>
              <span className='text-gray-400'>
                Selected: {selectedMonsters.length}/3
              </span>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
            {monsters?.map((monster: UserMonster) => (
              <div
                key={monster.id}
                className={`monster-card ${
                  selectedMonsters.includes(monster.id) ? 'selected' : ''
                }`}
                onClick={() => handleMonsterSelection(monster.id)}
              >
                <div className='flex justify-between items-start mb-3'>
                  <div>
                    <h3 className='font-semibold text-white'>
                      {monster.nickname || monster.template.name}
                    </h3>
                    <p className='text-sm text-gray-400'>
                      Level {monster.level}
                    </p>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${getRarityColor(
                      monster.template.rarity
                    )} border-2`}
                  ></div>
                </div>

                <div className='grid grid-cols-2 gap-2 text-xs text-gray-400'>
                  <div className='flex items-center'>
                    <HeartIcon className='h-3 w-3 mr-1' />
                    {monster.hp}
                  </div>
                  <div className='flex items-center'>
                    <SparklesIcon className='h-3 w-3 mr-1' />
                    {monster.strength}
                  </div>
                  <div className='flex items-center'>
                    <BoltIcon className='h-3 w-3 mr-1' />
                    {monster.speed}
                  </div>
                  <div className='flex items-center'>
                    <ShieldCheckIcon className='h-3 w-3 mr-1' />
                    {monster.ability}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedMonsters.length > 0 && (
            <div className='text-center'>
              <button
                onClick={handleConfirmSelection}
                className='btn-primary text-lg px-8 py-3'
              >
                Confirm Selection ({selectedMonsters.length} monsters)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Waiting State */}
      {gameState === 'waiting' && (
        <div className='max-w-2xl mx-auto text-center'>
          <div className='card p-8'>
            <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4'></div>
            <h2 className='text-2xl font-bold text-white mb-4'>Match Found!</h2>
            <p className='text-gray-400 mb-4'>
              Opponent:{' '}
              <span className='text-white font-semibold'>
                {opponent?.username}
              </span>
            </p>
            <p className='text-gray-500'>Preparing for battle...</p>
            {timeRemaining > 0 && (
              <p className='text-yellow-400 mt-2'>
                Battle starts in: {timeRemaining}s
              </p>
            )}
          </div>
        </div>
      )}

      {/* Battle State */}
      {gameState === 'battle' && battleState && (
        <div className='max-w-7xl mx-auto'>
          {/* Battle Header */}
          <div className='card p-4 mb-6'>
            <div className='flex justify-between items-center'>
              <h3 className='text-xl font-bold text-white'>
                {battleState.player1.username} vs {battleState.player2.username}
              </h3>
              <div className='flex items-center space-x-4'>
                <span className='text-yellow-400'>
                  Turn: {battleState.currentTurn}
                </span>
                {timeRemaining > 0 && (
                  <div className='flex items-center text-red-400'>
                    <ClockIcon className='h-4 w-4 mr-1' />
                    {timeRemaining}s
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Battle Field */}
          <div className='grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6'>
            {/* Your Monsters (Left Side) */}
            <div className='lg:col-span-2'>
              <h4 className='text-lg font-semibold text-white mb-3 text-center'>
                Your Monsters
              </h4>
              <div className='space-y-4'>
                {battleState.player1.monsters.map((monster) => (
                  <div
                    key={monster.id}
                    className={`card p-4 transition-all ${
                      monster.currentHp > 0
                        ? 'bg-gray-800'
                        : 'bg-gray-900 opacity-50'
                    } ${
                      battleState.turnOrder[battleState.currentMonsterIndex]
                        ?.id === monster.id
                        ? 'ring-2 ring-blue-400 bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <div>
                        <h5 className='font-medium text-white'>
                          {monster.name}
                        </h5>
                        <p className='text-sm text-gray-400'>
                          Level {monster.level}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-sm text-gray-400'>
                          Speed: {monster.speed}
                        </p>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            monster.currentHp > 0
                              ? 'bg-green-400'
                              : 'bg-red-400'
                          }`}
                        ></div>
                      </div>
                    </div>

                    {/* HP Bar */}
                    <div className='mb-2'>
                      <div className='flex justify-between text-sm mb-1'>
                        <span className='text-gray-400'>HP</span>
                        <span className='text-white'>
                          {monster.currentHp}/{monster.hp}
                        </span>
                      </div>
                      <div className='w-full bg-gray-700 rounded-full h-2'>
                        <div
                          className='bg-red-500 h-2 rounded-full transition-all'
                          style={{
                            width: `${Math.max(
                              0,
                              (monster.currentHp / monster.hp) * 100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className='grid grid-cols-3 gap-2 text-xs text-gray-400'>
                      <div>STR: {monster.strength}</div>
                      <div>SPD: {monster.speed}</div>
                      <div>ABL: {monster.ability}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Battle Center */}
            <div className='lg:col-span-1 flex flex-col justify-center items-center'>
              <div className='text-center'>
                <div className='text-4xl mb-4'>⚔️</div>
                <div className='text-sm text-gray-400 mb-2'>Current Turn</div>
                {battleState.turnOrder[battleState.currentMonsterIndex] && (
                  <div className='text-lg font-semibold text-yellow-400'>
                    {
                      battleState.turnOrder[battleState.currentMonsterIndex]
                        .name
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Opponent Monsters (Right Side) */}
            <div className='lg:col-span-2'>
              <h4 className='text-lg font-semibold text-white mb-3 text-center'>
                {battleState.player2.username}'s Monsters
              </h4>
              <div className='space-y-4'>
                {battleState.player2.monsters.map((monster) => (
                  <div
                    key={monster.id}
                    className={`card p-4 transition-all cursor-pointer ${
                      monster.currentHp > 0
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-gray-900 opacity-50'
                    } ${
                      battleState.turnOrder[battleState.currentMonsterIndex]
                        ?.id === monster.id
                        ? 'ring-2 ring-red-400 bg-red-900/20'
                        : ''
                    }`}
                    onClick={() => {
                      if (monster.currentHp > 0) {
                        setSelectedTarget(monster.id);
                      }
                    }}
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <div>
                        <h5 className='font-medium text-white'>
                          {monster.name}
                        </h5>
                        <p className='text-sm text-gray-400'>
                          Level {monster.level}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-sm text-gray-400'>
                          Speed: {monster.speed}
                        </p>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            monster.currentHp > 0
                              ? 'bg-green-400'
                              : 'bg-red-400'
                          }`}
                        ></div>
                      </div>
                    </div>

                    {/* HP Bar */}
                    <div className='mb-2'>
                      <div className='flex justify-between text-sm mb-1'>
                        <span className='text-gray-400'>HP</span>
                        <span className='text-white'>
                          {monster.currentHp}/{monster.hp}
                        </span>
                      </div>
                      <div className='w-full bg-gray-700 rounded-full h-2'>
                        <div
                          className='bg-red-500 h-2 rounded-full transition-all'
                          style={{
                            width: `${Math.max(
                              0,
                              (monster.currentHp / monster.hp) * 100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className='grid grid-cols-3 gap-2 text-xs text-gray-400'>
                      <div>STR: {monster.strength}</div>
                      <div>SPD: {monster.speed}</div>
                      <div>ABL: {monster.ability}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skills Panel */}
          {battleState.turnOrder[battleState.currentMonsterIndex] && (
            <div className='card p-6'>
              <h4 className='text-lg font-semibold text-white mb-4'>
                {battleState.turnOrder[battleState.currentMonsterIndex].name}'s
                Skills
              </h4>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                {battleState.turnOrder[
                  battleState.currentMonsterIndex
                ].skills?.map((skill) => (
                  <button
                    key={skill.id}
                    className='btn-primary p-4 text-left'
                    onClick={() => handleSkillUse(skill.id)}
                    disabled={!selectedTarget || timeRemaining <= 0}
                  >
                    <div className='font-semibold mb-1'>{skill.name}</div>
                    <div className='text-sm text-gray-300 mb-2'>
                      {skill.description}
                    </div>
                    <div className='text-xs text-yellow-400'>
                      DMG: {skill.damage}
                    </div>
                  </button>
                ))}
              </div>

              {selectedTarget && (
                <div className='mt-4 text-center text-sm text-gray-400'>
                  Target selected. Choose a skill to attack!
                </div>
              )}

              {!selectedTarget && (
                <div className='mt-4 text-center text-sm text-gray-400'>
                  Click on an enemy monster to select target, then choose a
                  skill.
                </div>
              )}
            </div>
          )}

          {/* Combat Log */}
          {combatEvents.length > 0 && (
            <div className='card p-6 mt-6'>
              <h4 className='text-lg font-semibold text-white mb-4'>
                Combat Log
              </h4>
              <div className='max-h-32 overflow-y-auto space-y-2'>
                {combatEvents.slice(-5).map((event) => (
                  <div
                    key={event.id}
                    className={`text-sm p-2 rounded ${
                      event.isAutoAction
                        ? 'bg-gray-800 text-gray-300'
                        : 'bg-blue-900/30 text-blue-200'
                    }`}
                  >
                    {event.description}
                    {event.isAutoAction && (
                      <span className='text-yellow-400 ml-2'>(Auto)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Finished State */}
      {gameState === 'finished' && (
        <div className='max-w-2xl mx-auto text-center'>
          <div className='card p-8'>
            <h2 className='text-2xl font-bold text-white mb-4'>
              Battle Complete!
            </h2>
            <p className='text-gray-400 mb-6'>
              The battle has ended. Check your rewards and stats.
            </p>
            <button
              onClick={() => {
                setGameState('lobby');
                setBattleState(null);
                setCombatEvents([]);
                setSelectedMonsters([]);
              }}
              className='btn-primary text-lg px-8 py-3'
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Battle;
