import { io, Socket } from 'socket.io-client';
import { BattleState, CombatEvent } from '../types';

export class GameSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    const SOCKET_URL =
      process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to game server');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from game server');
      this.emit('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.emit('connection_error', error);
    });

    // Game events
    this.socket.on('lobby_joined', (data) => {
      this.emit('lobby_joined', data);
    });

    this.socket.on('lobby_update', (data) => {
      this.emit('lobby_update', data);
    });

    this.socket.on('lobby_message', (data) => {
      this.emit('lobby_message', data);
    });

    this.socket.on('match_found', (data) => {
      this.emit('match_found', data);
    });

    this.socket.on('battle_start', (data) => {
      this.emit('battle_start', data);
    });

    this.socket.on('preparation_phase', (data) => {
      this.emit('preparation_phase', data);
    });

    this.socket.on('monsters_selected', (data) => {
      this.emit('monsters_selected', data);
    });

    this.socket.on('turn_start', (data) => {
      this.emit('turn_start', data);
    });

    this.socket.on('battle_update', (data) => {
      this.emit('battle_update', data);
    });

    this.socket.on('battle_end', (data) => {
      this.emit('battle_end', data);
    });

    this.socket.on('error', (data) => {
      this.emit('error', data);
    });
  }

  // Event listener management
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  // Game actions
  joinLobby(): void {
    if (this.socket?.connected) {
      this.socket.emit('join_lobby');
    }
  }

  leaveLobby(): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_lobby');
    }
  }

  selectMonsters(monsterIds: number[]): void {
    if (this.socket?.connected) {
      this.socket.emit('select_monsters', { monsterIds });
    }
  }

  useSkill(skillId: number, targetId?: number, monsterId?: number): void {
    if (this.socket?.connected) {
      this.socket.emit('use_skill', { skillId, targetId, monsterId });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const gameSocket = new GameSocketService();
