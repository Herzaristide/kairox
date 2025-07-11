import { pgPool } from '../database/connection';
import { Match, MatchParticipant } from '../types';

export class MatchRepository {
  async createMatch(player1Id: number, player2Id: number): Promise<Match> {
    const query = `
      INSERT INTO matches (player1_id, player2_id, status)
      VALUES ($1, $2, 'waiting')
      RETURNING id, player1_id, player2_id, status, created_at
    `;

    const result = await pgPool.query(query, [player1Id, player2Id]);
    const row = result.rows[0];

    return {
      id: row.id,
      player1Id: row.player1_id,
      player2Id: row.player2_id,
      status: row.status,
      createdAt: row.created_at,
      participants: [],
    };
  }

  async updateMatchStatus(
    matchId: number,
    status: 'waiting' | 'in_progress' | 'completed' | 'abandoned',
    winnerId?: number
  ): Promise<void> {
    let query = `
      UPDATE matches 
      SET status = $2, updated_at = CURRENT_TIMESTAMP
    `;
    const params: any[] = [matchId, status];

    if (status === 'in_progress') {
      query += `, started_at = CURRENT_TIMESTAMP`;
    } else if (status === 'completed' || status === 'abandoned') {
      query += `, ended_at = CURRENT_TIMESTAMP`;
      if (winnerId) {
        query += `, winner_id = $3`;
        params.push(winnerId);
      }
    }

    query += ` WHERE id = $1`;

    await pgPool.query(query, params);
  }

  async addMatchParticipant(
    matchId: number,
    userId: number,
    monsterId: number,
    position: 1 | 2 | 3
  ): Promise<void> {
    const query = `
      INSERT INTO match_participants (match_id, user_id, monster_id, position, hp_remaining)
      SELECT $1, $2, $3, $4, um.hp
      FROM user_monsters um
      WHERE um.id = $3
    `;

    await pgPool.query(query, [matchId, userId, monsterId, position]);
  }

  async updateParticipantHP(
    participantId: number,
    hpRemaining: number
  ): Promise<void> {
    const query = `
      UPDATE match_participants 
      SET hp_remaining = $2
      WHERE id = $1
    `;

    await pgPool.query(query, [participantId, hpRemaining]);
  }

  async getMatch(matchId: number): Promise<Match | null> {
    const matchQuery = `
      SELECT id, player1_id, player2_id, winner_id, status, match_data, 
             started_at, ended_at, created_at
      FROM matches
      WHERE id = $1
    `;

    const matchResult = await pgPool.query(matchQuery, [matchId]);
    if (matchResult.rows.length === 0) return null;

    const matchRow = matchResult.rows[0];

    // Get participants
    const participantsQuery = `
      SELECT mp.id, mp.match_id, mp.user_id, mp.monster_id, mp.position, mp.hp_remaining,
             um.nickname, um.level, um.hp as max_hp, um.strength, um.speed, um.ability,
             mt.name as template_name, mt.rarity, mt.element
      FROM match_participants mp
      JOIN user_monsters um ON mp.monster_id = um.id
      JOIN monster_templates mt ON um.monster_template_id = mt.id
      WHERE mp.match_id = $1
      ORDER BY mp.position
    `;

    const participantsResult = await pgPool.query(participantsQuery, [matchId]);

    const participants: MatchParticipant[] = participantsResult.rows.map(
      (row) => ({
        id: row.id,
        matchId: row.match_id,
        userId: row.user_id,
        monsterId: row.monster_id,
        position: row.position,
        hpRemaining: row.hp_remaining,
        monster: {
          id: row.monster_id,
          userId: row.user_id,
          monsterTemplateId: 0, // Not needed for match context
          nickname: row.nickname,
          level: row.level,
          experience: 0,
          hp: row.max_hp,
          strength: row.strength,
          speed: row.speed,
          ability: row.ability,
          isFavorite: false,
          template: {
            id: 0,
            name: row.template_name,
            baseHp: 0,
            baseStrength: 0,
            baseSpeed: 0,
            baseAbility: 0,
            rarity: row.rarity,
            element: row.element,
            skills: [],
          },
          equipment: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
    );

    return {
      id: matchRow.id,
      player1Id: matchRow.player1_id,
      player2Id: matchRow.player2_id,
      winnerId: matchRow.winner_id,
      status: matchRow.status,
      matchData: matchRow.match_data,
      startedAt: matchRow.started_at,
      endedAt: matchRow.ended_at,
      createdAt: matchRow.created_at,
      participants,
    };
  }

  async saveMatchData(matchId: number, matchData: any): Promise<void> {
    const query = `
      UPDATE matches 
      SET match_data = $2
      WHERE id = $1
    `;

    await pgPool.query(query, [matchId, JSON.stringify(matchData)]);
  }

  async getUserMatchHistory(
    userId: number,
    limit: number = 10
  ): Promise<Match[]> {
    const query = `
      SELECT id, player1_id, player2_id, winner_id, status, 
             started_at, ended_at, created_at
      FROM matches
      WHERE player1_id = $1 OR player2_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pgPool.query(query, [userId, limit]);

    return result.rows.map((row) => ({
      id: row.id,
      player1Id: row.player1_id,
      player2Id: row.player2_id,
      winnerId: row.winner_id,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      createdAt: row.created_at,
      participants: [], // Not loaded for history view
    }));
  }
}
