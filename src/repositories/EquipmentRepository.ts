import { pgPool } from '../database/connection';
import { UserEquipment, EquipmentTemplate } from '../types';

export class EquipmentRepository {
  async getUserEquipment(userId: number): Promise<UserEquipment[]> {
    const query = `
      SELECT 
        ue.id, ue.user_id, ue.equipment_template_id, ue.equipped_monster_id, 
        ue.enhancement_level, ue.created_at,
        et.name, et.type, et.slot, et.hp_bonus, et.strength_bonus, 
        et.speed_bonus, et.ability_bonus, et.rarity, et.price
      FROM user_equipment ue
      JOIN equipment_templates et ON ue.equipment_template_id = et.id
      WHERE ue.user_id = $1
      ORDER BY et.rarity DESC, et.name
    `;

    const result = await pgPool.query(query, [userId]);

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      equipmentTemplateId: row.equipment_template_id,
      equippedMonsterId: row.equipped_monster_id,
      enhancementLevel: row.enhancement_level,
      template: {
        id: row.equipment_template_id,
        name: row.name,
        type: row.type,
        slot: row.slot,
        hpBonus: row.hp_bonus,
        strengthBonus: row.strength_bonus,
        speedBonus: row.speed_bonus,
        abilityBonus: row.ability_bonus,
        rarity: row.rarity,
        price: row.price,
      },
      createdAt: row.created_at,
    }));
  }

  async getMonsterEquipment(monsterId: number): Promise<UserEquipment[]> {
    const query = `
      SELECT 
        ue.id, ue.user_id, ue.equipment_template_id, ue.equipped_monster_id, 
        ue.enhancement_level, ue.created_at,
        et.name, et.type, et.slot, et.hp_bonus, et.strength_bonus, 
        et.speed_bonus, et.ability_bonus, et.rarity, et.price
      FROM user_equipment ue
      JOIN equipment_templates et ON ue.equipment_template_id = et.id
      WHERE ue.equipped_monster_id = $1
    `;

    const result = await pgPool.query(query, [monsterId]);

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      equipmentTemplateId: row.equipment_template_id,
      equippedMonsterId: row.equipped_monster_id,
      enhancementLevel: row.enhancement_level,
      template: {
        id: row.equipment_template_id,
        name: row.name,
        type: row.type,
        slot: row.slot,
        hpBonus: row.hp_bonus,
        strengthBonus: row.strength_bonus,
        speedBonus: row.speed_bonus,
        abilityBonus: row.ability_bonus,
        rarity: row.rarity,
        price: row.price,
      },
      createdAt: row.created_at,
    }));
  }

  async equipItem(equipmentId: number, monsterId: number): Promise<void> {
    // First, unequip any item in the same slot
    const slotQuery = `
      SELECT et.slot
      FROM user_equipment ue
      JOIN equipment_templates et ON ue.equipment_template_id = et.id
      WHERE ue.id = $1
    `;
    const slotResult = await pgPool.query(slotQuery, [equipmentId]);
    const slot = slotResult.rows[0].slot;

    // Unequip existing item in the same slot
    const unequipQuery = `
      UPDATE user_equipment 
      SET equipped_monster_id = NULL 
      WHERE equipped_monster_id = $1 
      AND equipment_template_id IN (
        SELECT id FROM equipment_templates WHERE slot = $2
      )
    `;
    await pgPool.query(unequipQuery, [monsterId, slot]);

    // Equip the new item
    const equipQuery = `
      UPDATE user_equipment 
      SET equipped_monster_id = $2 
      WHERE id = $1
    `;
    await pgPool.query(equipQuery, [equipmentId, monsterId]);
  }

  async unequipItem(equipmentId: number): Promise<void> {
    const query = `
      UPDATE user_equipment 
      SET equipped_monster_id = NULL 
      WHERE id = $1
    `;
    await pgPool.query(query, [equipmentId]);
  }

  async enhanceEquipment(equipmentId: number, newLevel: number): Promise<void> {
    const query = `
      UPDATE user_equipment 
      SET enhancement_level = $2 
      WHERE id = $1
    `;
    await pgPool.query(query, [equipmentId, newLevel]);
  }

  async purchaseEquipment(
    userId: number,
    templateId: number
  ): Promise<UserEquipment> {
    const query = `
      INSERT INTO user_equipment (user_id, equipment_template_id)
      VALUES ($1, $2)
      RETURNING id, enhancement_level, created_at
    `;

    const result = await pgPool.query(query, [userId, templateId]);
    const newEquipment = result.rows[0];

    // Get the template data
    const templateQuery = `
      SELECT name, type, slot, hp_bonus, strength_bonus, speed_bonus, 
             ability_bonus, rarity, price
      FROM equipment_templates
      WHERE id = $1
    `;
    const templateResult = await pgPool.query(templateQuery, [templateId]);
    const template = templateResult.rows[0];

    return {
      id: newEquipment.id,
      userId,
      equipmentTemplateId: templateId,
      enhancementLevel: newEquipment.enhancement_level,
      template: {
        id: templateId,
        name: template.name,
        type: template.type,
        slot: template.slot,
        hpBonus: template.hp_bonus,
        strengthBonus: template.strength_bonus,
        speedBonus: template.speed_bonus,
        abilityBonus: template.ability_bonus,
        rarity: template.rarity,
        price: template.price,
      },
      createdAt: newEquipment.created_at,
    };
  }

  async getAvailableEquipmentTemplates(): Promise<EquipmentTemplate[]> {
    const query = `
      SELECT id, name, type, slot, hp_bonus, strength_bonus, speed_bonus, 
             ability_bonus, rarity, price
      FROM equipment_templates
      ORDER BY rarity, price, name
    `;

    const result = await pgPool.query(query);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      slot: row.slot,
      hpBonus: row.hp_bonus,
      strengthBonus: row.strength_bonus,
      speedBonus: row.speed_bonus,
      abilityBonus: row.ability_bonus,
      rarity: row.rarity,
      price: row.price,
    }));
  }
}
