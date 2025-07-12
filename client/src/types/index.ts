export interface User {
  id: number;
  username: string;
  email: string;
  level: number;
  experience: number;
  coins: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonsterTemplate {
  id: number;
  name: string;
  baseHp: number;
  baseStrength: number;
  baseSpeed: number;
  baseAbility: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  element:
    | 'fire'
    | 'water'
    | 'earth'
    | 'air'
    | 'dark'
    | 'light'
    | 'ice'
    | 'electric'
    | 'crystal';
  description?: string;
  imageUrl?: string;
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
  is_favorite: boolean; // Backend uses snake_case
  template: MonsterTemplate;
  equipment: UserEquipment[];
  createdAt: string;
  updatedAt: string;
}

export interface UserEquipment {
  id: number;
  userId: number;
  equipmentTemplateId: number;
  equippedMonsterId?: number;
  enhancementLevel: number;
  template: EquipmentTemplate;
  createdAt: string;
}

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
  selectedMonsters: number[];
}

export interface BattleMonster {
  id: number;
  userId?: number;
  templateId: number;
  name: string;
  nickname?: string;
  level: number;
  maxHp?: number;
  hp?: number;
  currentHp: number;
  strength: number;
  speed: number;
  ability: number;
  element?: string;
  rarity?: string;
  skills: BattleSkill[];
  effects?: any[];
  equipment: UserEquipment[];
  skillCooldowns?: Record<number, number>;
  position?: number;
  isAlive?: boolean;
  template?: MonsterTemplate;
}

export interface BattleSkill {
  id: number;
  name: string;
  description: string;
  damage: number;
  cooldown: number;
  effectType: 'damage' | 'heal' | 'buff' | 'debuff';
  effectValue: number;
  element: string;
  lastUsedTurn?: number;
  isOnCooldown?: boolean;
  remainingCooldown?: number;
}

export interface CombatEvent {
  id: number;
  type:
    | 'damage'
    | 'heal'
    | 'skill_used'
    | 'monster_defeated'
    | 'turn_change'
    | 'battle_end';
  attackerId?: number;
  targetId?: number;
  skillId?: number;
  damage?: number;
  timestamp: number;
  description: string;
  isAutoAction?: boolean;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
