import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../middleware/auth';
import {
  BattleState,
  BattlePlayer,
  BattleMonster,
  CombatEvent,
} from '../types';
import { MonsterRepository } from '../repositories/MonsterRepository';
import { MatchRepository } from '../repositories/MatchRepository';
import { UserRepository } from '../repositories/UserRepository';
import { EquipmentRepository } from '../repositories/EquipmentRepository';

export class GameSocketServer {
  private io: SocketIOServer;
  private monsterRepo: MonsterRepository;
  private matchRepo: MatchRepository;
  private userRepo: UserRepository;
  private equipmentRepo: EquipmentRepository;
  private waitingPlayers: Map<string, any> = new Map();
  private activeBattles: Map<number, BattleState> = new Map();
  private playerSockets: Map<number, string> = new Map();
  private lobbyTimer: NodeJS.Timeout | null = null;
  private lobbyCountdown: number = 30; // 30 seconds
  private battleTimers: Map<number, NodeJS.Timeout> = new Map(); // For turn timers

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
        methods: ['GET', 'POST'],
      },
    });

    this.monsterRepo = new MonsterRepository();
    this.matchRepo = new MatchRepository();
    this.userRepo = new UserRepository();
    this.equipmentRepo = new EquipmentRepository();

    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.use(this.authenticateSocket);

    this.io.on('connection', (socket) => {
      console.log(`🎮 User ${socket.data.user.username} connected`);

      // Store socket reference
      this.playerSockets.set(socket.data.user.id, socket.id);

      // Join lobby
      socket.on('join_lobby', this.handleJoinLobby.bind(this, socket));

      // Select monsters for battle
      socket.on(
        'select_monsters',
        this.handleSelectMonsters.bind(this, socket)
      );

      // Use skill in combat
      socket.on('use_skill', this.handleUseSkill.bind(this, socket));

      // Leave lobby/match
      socket.on('leave_lobby', this.handleLeaveLobby.bind(this, socket));

      // Handle disconnection
      socket.on('disconnect', this.handleDisconnect.bind(this, socket));
    });
  }

  private authenticateSocket = async (socket: any, next: any) => {
    try {
      const token = socket.handshake.auth.token;
      console.log(
        '🔐 Authenticating socket with token:',
        token ? 'Present' : 'Missing'
      );

      if (!token) {
        console.error('❌ No token provided for socket authentication');
        return next(new Error('No token provided'));
      }

      const decoded = verifyToken(token);
      console.log('✅ Token decoded for user ID:', decoded.id);

      const user = await this.userRepo.findById(decoded.id);
      console.log('👤 User found:', user ? user.username : 'Not found');

      if (!user) {
        console.error('❌ User not found for ID:', decoded.id);
        return next(new Error('User not found'));
      }

      socket.data.user = user;
      console.log('🎮 Socket authenticated for user:', user.username);
      next();
    } catch (error) {
      console.error('❌ Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  };

  private handleJoinLobby = async (socket: any, data: any) => {
    const userId = socket.data.user.id;
    const username = socket.data.user.username;

    console.log(`🚪 ${username} joining lobby`);

    // Add player to waiting queue
    const playerData = {
      userId,
      username,
      socketId: socket.id,
      joinedAt: Date.now(),
      ready: false,
      selectedMonsters: [],
    };

    this.waitingPlayers.set(socket.id, playerData);

    // Send confirmation
    socket.emit('lobby_joined', {
      message: 'Joined battle lobby',
      lobbyData: this.getLobbyData(),
    });

    // Broadcast updated lobby to all players
    this.broadcastLobbyUpdate();

    // Check if we can start a match
    this.checkLobbyForMatch();
  };

  private handleSelectMonsters = async (socket: any, data: any) => {
    const { monsterIds } = data;
    const playerData = this.waitingPlayers.get(socket.id);

    if (playerData) {
      playerData.selectedMonsters = monsterIds;
      playerData.ready = true;

      socket.emit('monsters_selected', {
        message: 'Monsters selected successfully',
        selectedMonsters: monsterIds,
      });

      this.broadcastLobbyUpdate();
    }
  };

  private handleUseSkill = async (socket: any, data: any) => {
    const userId = socket.data.user.id;
    const { skillId, targetId, monsterId } = data;

    console.log(
      `🎯 ${userId} using skill ${skillId} with monster ${monsterId} on target ${targetId}`
    );

    // Find active battle for this user
    let matchId: number | null = null;
    let battle: BattleState | null = null;

    for (const [id, battleState] of this.activeBattles) {
      if (
        battleState.player1.userId === userId ||
        battleState.player2.userId === userId
      ) {
        matchId = id;
        battle = battleState;
        break;
      }
    }

    if (!matchId || !battle) {
      socket.emit('error', { message: 'No active battle found' });
      return;
    }

    // Check if it's this player's turn
    const currentMonster = battle.turnOrder[battle.currentMonsterIndex];
    if (!currentMonster) {
      socket.emit('error', { message: 'No current monster' });
      return;
    }

    // Verify the monster belongs to this player
    const isPlayer1Monster = battle.player1.monsters.some(
      (m) => m.id === monsterId
    );
    const isPlayer2Monster = battle.player2.monsters.some(
      (m) => m.id === monsterId
    );
    const playerOwnsMonster =
      (userId === battle.player1.userId && isPlayer1Monster) ||
      (userId === battle.player2.userId && isPlayer2Monster);

    if (!playerOwnsMonster || currentMonster.id !== monsterId) {
      socket.emit('error', { message: 'Not your turn or invalid monster' });
      return;
    }

    // Execute the skill
    this.executeSkill(matchId, monsterId, skillId, targetId, false);
  };

  private createMatch = async (player1: any, player2: any) => {
    try {
      console.log(
        `⚔️ Creating match between ${player1.username} and ${player2.username}`
      );

      // Get monsters for both players
      const player1Monsters = await this.monsterRepo.getUserMonsters(
        player1.userId
      );
      const player2Monsters = await this.monsterRepo.getUserMonsters(
        player2.userId
      );

      if (player1Monsters.length === 0 || player2Monsters.length === 0) {
        console.error('❌ One or both players have no monsters');
        return;
      }

      // Automatically select up to 3 monsters for each player
      const selectedP1Monsters = player1Monsters.slice(0, 3);
      const selectedP2Monsters = player2Monsters.slice(0, 3);

      // Create battle state
      const battleState: BattleState = {
        matchId: Date.now(), // Simple ID for demo
        player1: {
          userId: player1.userId,
          username: player1.username,
          monsters: selectedP1Monsters.map((m) =>
            this.convertToBattleMonster(m)
          ),
          selectedMonsters: selectedP1Monsters.map((m) => m.id),
        },
        player2: {
          userId: player2.userId,
          username: player2.username,
          monsters: selectedP2Monsters.map((m) =>
            this.convertToBattleMonster(m)
          ),
          selectedMonsters: selectedP2Monsters.map((m) => m.id),
        },
        currentTurn: 0,
        turnStartTime: Date.now(),
        phase: 'combat',
        turnOrder: [],
        currentMonsterIndex: 0,
        winner: undefined,
      };

      // Calculate turn order based on speed
      const allMonsters = [
        ...battleState.player1.monsters.map((m) => ({
          ...m,
          playerId: player1.userId,
        })),
        ...battleState.player2.monsters.map((m) => ({
          ...m,
          playerId: player2.userId,
        })),
      ];

      battleState.turnOrder = allMonsters
        .filter((m) => m.currentHp > 0)
        .sort((a, b) => b.speed - a.speed);

      // Store battle state
      this.activeBattles.set(battleState.matchId, battleState);

      // Get socket connections
      const player1Socket = this.io.sockets.sockets.get(player1.socketId);
      const player2Socket = this.io.sockets.sockets.get(player2.socketId);

      if (player1Socket && player2Socket) {
        // Join battle room
        const roomName = `battle:${battleState.matchId}`;
        player1Socket.join(roomName);
        player2Socket.join(roomName);

        // Send battle start event to both players
        this.io.to(roomName).emit('battle_start', {
          battleState,
          message: 'Battle begins!',
        });

        // Start the first turn
        this.startTurn(battleState.matchId);
      }
    } catch (error) {
      console.error('❌ Error creating match:', error);
    }
  };

  private convertToBattleMonster = (monster: any): BattleMonster => {
    return {
      id: monster.id,
      templateId: monster.monsterTemplateId || monster.template_id,
      name: monster.nickname || monster.template.name,
      level: monster.level,
      hp: monster.hp,
      currentHp: monster.hp,
      strength: monster.strength,
      speed: monster.speed,
      ability: monster.ability,
      element: monster.template.element,
      rarity: monster.template.rarity,
      skills: [
        {
          id: 1,
          name: 'Basic Attack',
          description: 'A simple physical attack',
          damage: Math.floor(monster.strength * 1.2),
          cooldown: 0,
          effectType: 'damage',
          effectValue: 0,
          element: monster.template.element,
        },
        {
          id: 2,
          name: 'Power Strike',
          description: 'A stronger attack with higher damage',
          damage: Math.floor(monster.strength * 1.8),
          cooldown: 2,
          effectType: 'damage',
          effectValue: 0,
          element: monster.template.element,
        },
      ],
      effects: [],
      equipment: [],
      skillCooldowns: {},
    };
  };

  private startTurn = (matchId: number) => {
    const battle = this.activeBattles.get(matchId);
    if (!battle) return;

    // Find the current monster's turn
    const currentMonster = battle.turnOrder[battle.currentMonsterIndex];
    if (!currentMonster || currentMonster.currentHp <= 0) {
      this.nextTurn(matchId);
      return;
    }

    // Find which player owns this monster
    const isPlayer1Turn = battle.player1.monsters.some(
      (m) => m.id === currentMonster.id
    );
    const currentUserId = isPlayer1Turn
      ? battle.player1.userId
      : battle.player2.userId;
    const currentUsername = isPlayer1Turn
      ? battle.player1.username
      : battle.player2.username;

    battle.turnStartTime = Date.now();
    battle.currentTurn++;

    console.log(
      `🎯 Turn ${battle.currentTurn}: ${currentUsername}'s ${currentMonster.name}`
    );

    // Notify all players about the turn
    this.io.to(`battle:${matchId}`).emit('turn_start', {
      battleState: battle,
      currentMonster,
      currentUserId,
      currentUsername,
      turnTimeLimit: 10000, // 10 seconds
      turnDeadline: Date.now() + 10000,
    });

    // Set auto-action timer (10 seconds)
    const timer = setTimeout(() => {
      this.autoAction(matchId, currentMonster.id);
    }, 10000);

    this.battleTimers.set(matchId, timer);
  };

  private autoAction = (matchId: number, monsterId: number) => {
    console.log(`⏰ Auto-action triggered for monster ${monsterId}`);

    const battle = this.activeBattles.get(matchId);
    if (!battle) return;

    // Find the monster
    const monster = battle.turnOrder.find((m) => m.id === monsterId);
    if (!monster) return;

    // Auto-use skill 1 (Basic Attack) on a random target
    const enemies = battle.turnOrder.filter(
      (m) =>
        m.currentHp > 0 &&
        ((battle.player1.monsters.some((p1m) => p1m.id === monster.id) &&
          battle.player2.monsters.some((p2m) => p2m.id === m.id)) ||
          (battle.player2.monsters.some((p2m) => p2m.id === monster.id) &&
            battle.player1.monsters.some((p1m) => p1m.id === m.id)))
    );

    if (enemies.length > 0) {
      const randomTarget = enemies[Math.floor(Math.random() * enemies.length)];
      this.executeSkill(matchId, monsterId, 1, randomTarget.id, true);
    } else {
      this.nextTurn(matchId);
    }
  };

  private executeSkill = (
    matchId: number,
    attackerId: number,
    skillId: number,
    targetId: number,
    isAuto: boolean = false
  ) => {
    const battle = this.activeBattles.get(matchId);
    if (!battle) return;

    // Clear turn timer
    const timer = this.battleTimers.get(matchId);
    if (timer) {
      clearTimeout(timer);
      this.battleTimers.delete(matchId);
    }

    // Find attacker and target
    const attacker = battle.turnOrder.find((m) => m.id === attackerId);
    const target = battle.turnOrder.find((m) => m.id === targetId);

    if (!attacker || !target) {
      console.error('❌ Invalid attacker or target');
      return;
    }

    // Find the skill
    const skill = attacker.skills.find((s) => s.id === skillId);
    if (!skill) {
      console.error('❌ Skill not found');
      return;
    }

    // Calculate damage
    const baseDamage = skill.damage;
    const randomFactor = 0.8 + Math.random() * 0.4; // 80% to 120%
    const finalDamage = Math.floor(baseDamage * randomFactor);

    // Apply damage
    target.currentHp = Math.max(0, target.currentHp - finalDamage);

    // Create combat event
    const combatEvent: CombatEvent = {
      id: Date.now(),
      type: 'skill_used',
      attackerId,
      targetId,
      skillId,
      damage: finalDamage,
      timestamp: Date.now(),
      description: `${attacker.name} used ${skill.name} on ${target.name} for ${finalDamage} damage!`,
      isAutoAction: isAuto,
      message: `${attacker.name} used ${skill.name} on ${target.name} for ${finalDamage} damage!`,
    };

    console.log(`💥 ${combatEvent.description}`);

    // Check if target is defeated
    if (target.currentHp <= 0) {
      combatEvent.description += ` ${target.name} is defeated!`;
    }

    // Update battle state in all relevant monsters
    this.updateMonsterInBattle(battle, attacker);
    this.updateMonsterInBattle(battle, target);

    // Broadcast battle update
    this.io.to(`battle:${matchId}`).emit('battle_update', {
      battleState: battle,
      events: [combatEvent],
    });

    // Check for battle end
    const player1Alive = battle.player1.monsters.some((m) => m.currentHp > 0);
    const player2Alive = battle.player2.monsters.some((m) => m.currentHp > 0);

    if (!player1Alive || !player2Alive) {
      this.endBattle(
        matchId,
        player1Alive ? battle.player1.userId : battle.player2.userId
      );
    } else {
      // Continue to next turn
      setTimeout(() => this.nextTurn(matchId), 2000);
    }
  };

  private updateMonsterInBattle = (
    battle: BattleState,
    monster: BattleMonster
  ) => {
    // Update in player1 monsters
    const p1Index = battle.player1.monsters.findIndex(
      (m) => m.id === monster.id
    );
    if (p1Index !== -1) {
      battle.player1.monsters[p1Index] = { ...monster };
    }

    // Update in player2 monsters
    const p2Index = battle.player2.monsters.findIndex(
      (m) => m.id === monster.id
    );
    if (p2Index !== -1) {
      battle.player2.monsters[p2Index] = { ...monster };
    }

    // Update in turn order
    const turnIndex = battle.turnOrder.findIndex((m) => m.id === monster.id);
    if (turnIndex !== -1) {
      battle.turnOrder[turnIndex] = { ...monster };
    }
  };

  private nextTurn = (matchId: number) => {
    const battle = this.activeBattles.get(matchId);
    if (!battle) return;

    // Move to next monster in turn order
    battle.currentMonsterIndex =
      (battle.currentMonsterIndex + 1) % battle.turnOrder.length;

    // Skip defeated monsters
    let attempts = 0;
    while (
      attempts < battle.turnOrder.length &&
      battle.turnOrder[battle.currentMonsterIndex].currentHp <= 0
    ) {
      battle.currentMonsterIndex =
        (battle.currentMonsterIndex + 1) % battle.turnOrder.length;
      attempts++;
    }

    if (attempts >= battle.turnOrder.length) {
      // No monsters left (shouldn't happen, but safety check)
      console.error('❌ No monsters available for turn');
      return;
    }

    // Start the next turn
    this.startTurn(matchId);
  };

  private endBattle = (matchId: number, winnerId: number) => {
    const battle = this.activeBattles.get(matchId);
    if (!battle) return;

    battle.phase = 'finished';
    battle.winner = winnerId;

    const winnerUsername =
      winnerId === battle.player1.userId
        ? battle.player1.username
        : battle.player2.username;

    console.log(`🏆 Battle ${matchId} ended! Winner: ${winnerUsername}`);

    // Clear any remaining timers
    const timer = this.battleTimers.get(matchId);
    if (timer) {
      clearTimeout(timer);
      this.battleTimers.delete(matchId);
    }

    // Notify all players
    this.io.to(`battle:${matchId}`).emit('battle_end', {
      battleState: battle,
      winnerId,
      winnerUsername,
      message: `${winnerUsername} wins the battle!`,
    });

    // Clean up
    this.activeBattles.delete(matchId);
  };

  private handleLeaveLobby = (socket: any) => {
    this.waitingPlayers.delete(socket.id);
    socket.emit('lobby_left', { message: 'Left lobby' });
    this.broadcastLobbyUpdate();
    this.checkLobbyForMatch();
  };

  private handleDisconnect = (socket: any) => {
    const userId = socket.data.user?.id;
    const username = socket.data.user?.username || 'unknown';

    if (userId) {
      this.playerSockets.delete(userId);
      this.waitingPlayers.delete(socket.id);

      // Update lobby after player leaves
      this.broadcastLobbyUpdate();
      this.checkLobbyForMatch();
    }

    console.log(`🚪 User ${username} disconnected`);
  };

  private getLobbyData = () => {
    const players = Array.from(this.waitingPlayers.values()).map((player) => ({
      userId: player.userId,
      username: player.username,
      joinedAt: player.joinedAt,
      ready: player.ready,
      monstersSelected: player.selectedMonsters.length > 0,
    }));

    return {
      players,
      countdown: this.lobbyCountdown,
      canStart: players.length >= 2,
    };
  };

  private broadcastLobbyUpdate = () => {
    const lobbyData = this.getLobbyData();

    // Send to all players in lobby
    this.waitingPlayers.forEach((player) => {
      const socket = this.io.sockets.sockets.get(player.socketId);
      if (socket) {
        socket.emit('lobby_update', lobbyData);
      }
    });
  };

  private checkLobbyForMatch = () => {
    const playerCount = this.waitingPlayers.size;

    if (playerCount >= 2) {
      if (!this.lobbyTimer) {
        console.log(
          `⏱️ Starting 30-second countdown for ${playerCount} players`
        );
        this.startLobbyCountdown();
      }
    } else {
      // Stop countdown if not enough players
      if (this.lobbyTimer) {
        console.log('⏹️ Stopping countdown - not enough players');
        clearInterval(this.lobbyTimer);
        this.lobbyTimer = null;
        this.lobbyCountdown = 30;
        this.broadcastLobbyUpdate();
      }
    }
  };

  private startLobbyCountdown = () => {
    this.lobbyCountdown = 30;

    this.lobbyTimer = setInterval(() => {
      this.lobbyCountdown--;

      if (this.lobbyCountdown <= 0) {
        // Time's up! Start the battle
        this.startBattleFromLobby();
      } else {
        // Broadcast countdown update
        this.broadcastLobbyUpdate();

        // Send countdown messages at specific intervals
        if (this.lobbyCountdown === 10) {
          this.broadcastToLobby('⏰ Battle starting in 10 seconds!');
        } else if (this.lobbyCountdown === 5) {
          this.broadcastToLobby('⚔️ Battle starting in 5 seconds!');
        } else if (this.lobbyCountdown <= 3 && this.lobbyCountdown > 0) {
          this.broadcastToLobby(`🔥 ${this.lobbyCountdown}...`);
        }
      }
    }, 1000);
  };

  private broadcastToLobby = (message: string) => {
    this.waitingPlayers.forEach((player) => {
      const socket = this.io.sockets.sockets.get(player.socketId);
      if (socket) {
        socket.emit('lobby_message', { message });
      }
    });
  };

  private startBattleFromLobby = async () => {
    // Stop the timer
    if (this.lobbyTimer) {
      clearInterval(this.lobbyTimer);
      this.lobbyTimer = null;
    }

    const players = Array.from(this.waitingPlayers.values());

    if (players.length < 2) {
      console.log('❌ Not enough players to start battle');
      this.lobbyCountdown = 30;
      this.broadcastLobbyUpdate();
      return;
    }

    // Take first 2 players
    const player1 = players[0];
    const player2 = players[1];

    console.log(
      `⚔️ Starting battle between ${player1.username} and ${player2.username}`
    );

    // Remove players from lobby
    this.waitingPlayers.delete(player1.socketId);
    this.waitingPlayers.delete(player2.socketId);

    try {
      await this.createMatch(player1, player2);
    } catch (error) {
      console.error('❌ Failed to create match:', error);

      // Return players to lobby on error
      this.waitingPlayers.set(player1.socketId, player1);
      this.waitingPlayers.set(player2.socketId, player2);
    }

    // Reset countdown for remaining players
    this.lobbyCountdown = 30;
    this.checkLobbyForMatch();
  };
}
