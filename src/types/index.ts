export interface User {
  id: number;
  username: string;
  email: string;
  level: number;
  experience: number;
  coins: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonsterTemplate {
  id: number;
  name: string;
  baseHp: number;
  baseStrength: number;
  baseSpeed: number;
  baseAbility: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  element: 'fire' | 'water' | 'earth' | 'air' | 'dark' | 'light';
  skills: Skill[];
}

export interface Skill {
  id: number;
  name: string;
  description: string;
  damage: number;
  cooldown: number;
  effectType: 'damage' | 'heal' | 'buff' | 'debuff';
  effectValue: number;
  element: string;
}

export interface EquipmentTemplate {
  id: number;
  name: string;
  type: 'weapon' | 'armor' | 'accessory';
  slot:
    | 'main_hand'
    | 'off_hand'
    | 'head'
    | 'chest'
    | 'legs'
    | 'feet'
    | 'ring'
    | 'necklace';
  hpBonus: number;
  strengthBonus: number;
  speedBonus: number;
  abilityBonus: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: number;
}

export interface UserMonster {
  id: number;
  userId: number;
  monsterTemplateId: number;
  nickname?: string;
  level: number;
  experience: number;
  hp: number;
  strength: number;
  speed: number;
  ability: number;
  isFavorite: boolean;
  template: MonsterTemplate;
  equipment: UserEquipment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserEquipment {
  id: number;
  userId: number;
  equipmentTemplateId: number;
  equippedMonsterId?: number;
  enhancementLevel: number;
  template: EquipmentTemplate;
  createdAt: Date;
}

export interface Match {
  id: number;
  player1Id: number;
  player2Id: number;
  winnerId?: number;
  status: 'waiting' | 'in_progress' | 'completed' | 'abandoned';
  matchData?: any;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  participants: MatchParticipant[];
}

export interface MatchParticipant {
  id: number;
  matchId: number;
  userId: number;
  monsterId: number;
  position: 1 | 2 | 3;
  hpRemaining: number;
  monster: UserMonster;
}

// Combat-specific interfaces
export interface BattleState {
  matchId: number;
  player1: BattlePlayer;
  player2: BattlePlayer;
  currentTurn: number;
  turnStartTime: number;
  phase: 'preparation' | 'combat' | 'finished';
  turnOrder: BattleMonster[];
  currentMonsterIndex: number;
  winner?: number;
}

export interface BattlePlayer {
  userId: number;
  username: string;
  monsters: BattleMonster[];
  selectedMonsters: number[]; // monster IDs for this battle
}

export interface BattleMonster {
  id: number;
  userId: number;
  templateId: number;
  name: string;
  nickname?: string;
  level: number;
  maxHp: number;
  currentHp: number;
  strength: number;
  speed: number;
  ability: number;
  skills: BattleSkill[];
  equipment: UserEquipment[];
  position: number;
  isAlive: boolean;
}

export interface BattleSkill extends Skill {
  lastUsedTurn: number;
  isOnCooldown: boolean;
  remainingCooldown: number;
}

export interface CombatAction {
  type: 'skill' | 'timeout';
  userId: number;
  monsterId: number;
  skillId?: number;
  targetId?: number;
  turn: number;
  timestamp: number;
}

export interface CombatEvent {
  type:
    | 'damage'
    | 'heal'
    | 'skill_used'
    | 'monster_defeated'
    | 'turn_change'
    | 'battle_end';
  sourceId?: number;
  targetId?: number;
  value?: number;
  skillId?: number;
  turn: number;
  timestamp: number;
  message: string;
}

// WebSocket message types
export interface SocketMessage {
  type: string;
  payload: any;
}

export interface JoinLobbyMessage {
  type: 'join_lobby';
  payload: {
    userId: number;
    username: string;
  };
}

export interface SelectMonstersMessage {
  type: 'select_monsters';
  payload: {
    monsterIds: number[];
  };
}

export interface UseSkillMessage {
  type: 'use_skill';
  payload: {
    skillId: number;
    targetId?: number;
  };
}

export interface MatchFoundMessage {
  type: 'match_found';
  payload: {
    matchId: number;
    opponent: {
      id: number;
      username: string;
    };
  };
}

export interface BattleUpdateMessage {
  type: 'battle_update';
  payload: {
    battleState: BattleState;
    events: CombatEvent[];
  };
}

// API Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'passwordHash'>;
}

export interface UpgradeMonsterRequest {
  monsterId: number;
  upgradeType: 'level' | 'equipment';
  equipmentId?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
