import { pgPool } from '../database/connection';
import { UserMonster, MonsterTemplate, Skill } from '../types';

export class MonsterRepository {
  async getUserMonsters(userId: number): Promise<UserMonster[]> {
    const query = `
      SELECT 
        um.id, um.user_id, um.template_id, um.nickname, um.level, 
        um.experience, um.hp, um.strength, um.speed, um.ability, um.is_favorite,
        um.created_at, um.updated_at,
        mt.name as template_name, mt.base_hp, mt.base_strength, mt.base_speed, 
        mt.base_ability, mt.rarity, mt.element, mt.description, mt.image_url
      FROM user_monsters um
      JOIN monster_templates mt ON um.template_id = mt.id
      WHERE um.user_id = $1
      ORDER BY um.is_favorite DESC, um.level DESC, um.created_at DESC
    `;

    const result = await pgPool.query(query, [userId]);

    const monsters: UserMonster[] = [];
    for (const row of result.rows) {
      const skills = await this.getMonsterSkills(row.template_id);

      monsters.push({
        id: row.id,
        userId: row.user_id,
        monsterTemplateId: row.template_id,
        nickname: row.nickname,
        level: row.level,
        experience: row.experience,
        hp: row.hp,
        strength: row.strength,
        speed: row.speed,
        ability: row.ability,
        isFavorite: row.is_favorite,
        template: {
          id: row.template_id,
          name: row.template_name,
          baseHp: row.base_hp,
          baseStrength: row.base_strength,
          baseSpeed: row.base_speed,
          baseAbility: row.base_ability,
          rarity: row.rarity,
          element: row.element,
          description: row.description,
          imageUrl: row.image_url,
          skills,
        },
        equipment: [], // Will be populated separately if needed
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    return monsters;
  }

  async getMonsterById(monsterId: number): Promise<UserMonster | null> {
    const query = `
      SELECT 
        um.id, um.user_id, um.monster_template_id, um.nickname, um.level, 
        um.experience, um.hp, um.strength, um.speed, um.ability, um.is_favorite,
        um.created_at, um.updated_at,
        mt.name as template_name, mt.base_hp, mt.base_strength, mt.base_speed, 
        mt.base_ability, mt.rarity, mt.element
      FROM user_monsters um
      JOIN monster_templates mt ON um.monster_template_id = mt.id
      WHERE um.id = $1
    `;

    const result = await pgPool.query(query, [monsterId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const skills = await this.getMonsterSkills(row.monster_template_id);

    return {
      id: row.id,
      userId: row.user_id,
      monsterTemplateId: row.monster_template_id,
      nickname: row.nickname,
      level: row.level,
      experience: row.experience,
      hp: row.hp,
      strength: row.strength,
      speed: row.speed,
      ability: row.ability,
      isFavorite: row.is_favorite,
      template: {
        id: row.monster_template_id,
        name: row.template_name,
        baseHp: row.base_hp,
        baseStrength: row.base_strength,
        baseSpeed: row.base_speed,
        baseAbility: row.base_ability,
        rarity: row.rarity,
        element: row.element,
        skills,
      },
      equipment: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getUserMonster(
    userId: number,
    monsterId: number
  ): Promise<UserMonster | null> {
    const query = `
      SELECT 
        um.id, um.user_id, um.template_id, um.nickname, um.level, 
        um.experience, um.hp, um.strength, um.speed, um.ability, um.is_favorite,
        um.created_at, um.updated_at,
        mt.name as template_name, mt.base_hp, mt.base_strength, mt.base_speed, 
        mt.base_ability, mt.rarity, mt.element, mt.description, mt.image_url
      FROM user_monsters um
      JOIN monster_templates mt ON um.template_id = mt.id
      WHERE um.user_id = $1 AND um.id = $2
    `;

    const result = await pgPool.query(query, [userId, monsterId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const skills = await this.getMonsterSkills(row.template_id);

    return {
      id: row.id,
      userId: row.user_id,
      monsterTemplateId: row.template_id,
      nickname: row.nickname,
      level: row.level,
      experience: row.experience,
      hp: row.hp,
      strength: row.strength,
      speed: row.speed,
      ability: row.ability,
      isFavorite: row.is_favorite,
      template: {
        id: row.template_id,
        name: row.template_name,
        baseHp: row.base_hp,
        baseStrength: row.base_strength,
        baseSpeed: row.base_speed,
        baseAbility: row.base_ability,
        rarity: row.rarity,
        element: row.element,
        description: row.description,
        imageUrl: row.image_url,
        skills,
      },
      equipment: [], // Will be populated separately if needed
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getMonsterSkills(templateId: number): Promise<Skill[]> {
    const query = `
      SELECT s.id, s.name, s.description, s.damage, s.cooldown, 
             s.effect_type, s.effect_value, s.element
      FROM skills s
      JOIN monster_template_skills mts ON s.id = mts.skill_id
      WHERE mts.monster_template_id = $1
      ORDER BY mts.skill_slot
    `;

    const result = await pgPool.query(query, [templateId]);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      damage: row.damage,
      cooldown: row.cooldown,
      effectType: row.effect_type,
      effectValue: row.effect_value,
      element: row.element,
    }));
  }

  async createUserMonster(
    userId: number,
    templateId: number
  ): Promise<UserMonster> {
    // Get template data
    const templateQuery = `
      SELECT base_hp, base_strength, base_speed, base_ability
      FROM monster_templates
      WHERE id = $1
    `;
    const templateResult = await pgPool.query(templateQuery, [templateId]);
    const template = templateResult.rows[0];

    const insertQuery = `
      INSERT INTO user_monsters (
        user_id, monster_template_id, hp, strength, speed, ability
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, level, experience, is_favorite, created_at, updated_at
    `;

    const result = await pgPool.query(insertQuery, [
      userId,
      templateId,
      template.base_hp,
      template.base_strength,
      template.base_speed,
      template.base_ability,
    ]);

    const newMonster = result.rows[0];

    // Return the full monster data
    return this.getMonsterById(newMonster.id)!;
  }

  async upgradeMonster(
    monsterId: number,
    newLevel: number,
    newStats: {
      hp: number;
      strength: number;
      speed: number;
      ability: number;
      experience: number;
    }
  ): Promise<void> {
    const query = `
      UPDATE user_monsters
      SET level = $2, hp = $3, strength = $4, speed = $5, ability = $6, 
          experience = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await pgPool.query(query, [
      monsterId,
      newLevel,
      newStats.hp,
      newStats.strength,
      newStats.speed,
      newStats.ability,
      newStats.experience,
    ]);
  }

  async setFavorite(monsterId: number, isFavorite: boolean): Promise<void> {
    const query = `
      UPDATE user_monsters 
      SET is_favorite = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await pgPool.query(query, [monsterId, isFavorite]);
  }

  async setMonsterFavorite(
    monsterId: number,
    isFavorite: boolean
  ): Promise<void> {
    const query = `
      UPDATE user_monsters 
      SET is_favorite = $1 
      WHERE id = $2
    `;

    await pgPool.query(query, [isFavorite, monsterId]);
  }

  async getAvailableMonsterTemplates(): Promise<MonsterTemplate[]> {
    const query = `
      SELECT id, name, base_hp, base_strength, base_speed, base_ability, rarity, element, description, image_url
      FROM monster_templates
      ORDER BY rarity, name
    `;

    const result = await pgPool.query(query);

    const templates: MonsterTemplate[] = [];
    for (const row of result.rows) {
      const skills = await this.getMonsterSkills(row.id);

      templates.push({
        id: row.id,
        name: row.name,
        baseHp: row.base_hp,
        baseStrength: row.base_strength,
        baseSpeed: row.base_speed,
        baseAbility: row.base_ability,
        rarity: row.rarity,
        element: row.element,
        description: row.description,
        imageUrl: row.image_url,
        skills,
      });
    }

    return templates;
  }
}
