import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { MonsterRepository } from '../repositories/MonsterRepository';
import { EquipmentRepository } from '../repositories/EquipmentRepository';
import { UserRepository } from '../repositories/UserRepository';
import { ApiResponse, UpgradeMonsterRequest } from '../types';
import { z } from 'zod';

const router = Router();
const monsterRepo = new MonsterRepository();
const equipmentRepo = new EquipmentRepository();
const userRepo = new UserRepository();

// Validation schemas
const upgradeMonsterSchema = z.object({
  monsterId: z.number(),
  upgradeType: z.enum(['level', 'equipment']),
  equipmentId: z.number().optional(),
});

// POST /monsters/upgrade
router.post(
  '/upgrade',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const validation = upgradeMonsterSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
        } as ApiResponse);
        return;
      }

      const { monsterId, upgradeType, equipmentId } = validation.data;
      const userId = req.user!.id;

      // Verify monster belongs to user
      const monster = await monsterRepo.getMonsterById(monsterId);
      if (!monster || monster.userId !== userId) {
        res.status(404).json({
          success: false,
          error: 'Monster not found',
        } as ApiResponse);
        return;
      }

      if (upgradeType === 'level') {
        await upgradeMonsternLevel(monster, userId, res);
      } else if (upgradeType === 'equipment' && equipmentId) {
        await equipMonsterWithItem(monster, equipmentId, userId, res);
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid upgrade type or missing equipment ID',
        } as ApiResponse);
      }
    } catch (error) {
      console.error('Upgrade monster error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

async function upgradeMonsternLevel(monster: any, userId: number, res: any) {
  const currentLevel = monster.level;
  const experienceNeeded = calculateExperienceNeeded(currentLevel);
  const coinsNeeded = calculateUpgradeCost(currentLevel);

  const user = await userRepo.findById(userId);
  if (!user || user.coins < coinsNeeded) {
    res.status(400).json({
      success: false,
      error: 'Insufficient coins for upgrade',
    } as ApiResponse);
    return;
  }

  // Calculate new stats
  const newLevel = currentLevel + 1;
  const statIncrease = Math.floor(newLevel * 0.1); // 10% increase per level

  const newStats = {
    hp: Math.floor(monster.hp * 1.1),
    strength: Math.floor(monster.strength * 1.1),
    speed: Math.floor(monster.speed * 1.1),
    ability: Math.floor(monster.ability * 1.1),
    experience: monster.experience + experienceNeeded,
  };

  // Update monster and deduct coins
  await monsterRepo.upgradeMonster(monster.id, newLevel, newStats);
  await userRepo.updateCoins(userId, user.coins - coinsNeeded);

  res.json({
    success: true,
    message: `Monster upgraded to level ${newLevel}`,
    data: {
      newLevel,
      newStats,
      coinsSpent: coinsNeeded,
    },
  } as ApiResponse);
}

async function equipMonsterWithItem(
  monster: any,
  equipmentId: number,
  userId: number,
  res: any
) {
  // Verify equipment belongs to user
  const userEquipment = await equipmentRepo.getUserEquipment(userId);
  const equipment = userEquipment.find((e) => e.id === equipmentId);

  if (!equipment) {
    res.status(404).json({
      success: false,
      error: 'Equipment not found',
    } as ApiResponse);
    return;
  }

  if (equipment.equippedMonsterId) {
    res.status(400).json({
      success: false,
      error: 'Equipment is already equipped',
    } as ApiResponse);
    return;
  }

  await equipmentRepo.equipItem(equipmentId, monster.id);

  res.json({
    success: true,
    message: 'Equipment equipped successfully',
    data: {
      monsterId: monster.id,
      equipmentId: equipmentId,
      equipmentName: equipment.template.name,
    },
  } as ApiResponse);
}

// GET /monsters/:id/stats
router.get(
  '/:id/stats',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const monsterId = parseInt(req.params.id);
      const userId = req.user!.id;

      const monster = await monsterRepo.getMonsterById(monsterId);
      if (!monster || monster.userId !== userId) {
        res.status(404).json({
          success: false,
          error: 'Monster not found',
        } as ApiResponse);
        return;
      }

      // Get equipped items and calculate total stats
      const equipment = await equipmentRepo.getMonsterEquipment(monsterId);

      const totalStats = {
        hp: monster.hp,
        strength: monster.strength,
        speed: monster.speed,
        ability: monster.ability,
      };

      // Add equipment bonuses
      for (const item of equipment) {
        const bonus = calculateEquipmentBonus(
          item.template,
          item.enhancementLevel
        );
        totalStats.hp += bonus.hp;
        totalStats.strength += bonus.strength;
        totalStats.speed += bonus.speed;
        totalStats.ability += bonus.ability;
      }

      res.json({
        success: true,
        data: {
          monster,
          equipment,
          baseStats: {
            hp: monster.hp,
            strength: monster.strength,
            speed: monster.speed,
            ability: monster.ability,
          },
          totalStats,
          nextLevelCost: calculateUpgradeCost(monster.level),
        },
      } as ApiResponse);
    } catch (error) {
      console.error('Get monster stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// POST /monsters/:id/enhance-equipment/:equipmentId
router.post(
  '/:id/enhance-equipment/:equipmentId',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const monsterId = parseInt(req.params.id);
      const equipmentId = parseInt(req.params.equipmentId);
      const userId = req.user!.id;

      // Verify monster and equipment
      const monster = await monsterRepo.getMonsterById(monsterId);
      if (!monster || monster.userId !== userId) {
        res.status(404).json({
          success: false,
          error: 'Monster not found',
        } as ApiResponse);
        return;
      }

      const userEquipment = await equipmentRepo.getUserEquipment(userId);
      const equipment = userEquipment.find((e) => e.id === equipmentId);

      if (!equipment || equipment.equippedMonsterId !== monsterId) {
        res.status(404).json({
          success: false,
          error: 'Equipment not found or not equipped to this monster',
        } as ApiResponse);
        return;
      }

      const enhancementCost = calculateEnhancementCost(
        equipment.enhancementLevel
      );
      const user = await userRepo.findById(userId);

      if (!user || user.coins < enhancementCost) {
        res.status(400).json({
          success: false,
          error: 'Insufficient coins for enhancement',
        } as ApiResponse);
        return;
      }

      const newLevel = equipment.enhancementLevel + 1;
      await equipmentRepo.enhanceEquipment(equipmentId, newLevel);
      await userRepo.updateCoins(userId, user.coins - enhancementCost);

      res.json({
        success: true,
        message: `Equipment enhanced to level ${newLevel}`,
        data: {
          equipmentId,
          newLevel,
          coinsSpent: enhancementCost,
        },
      } as ApiResponse);
    } catch (error) {
      console.error('Enhance equipment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// Helper functions
function calculateExperienceNeeded(level: number): number {
  return level * 100;
}

function calculateUpgradeCost(level: number): number {
  return level * 50;
}

function calculateEnhancementCost(currentLevel: number): number {
  return (currentLevel + 1) * 100;
}

function calculateEquipmentBonus(template: any, enhancementLevel: number): any {
  const multiplier = 1 + enhancementLevel * 0.1; // 10% bonus per enhancement level

  return {
    hp: Math.floor(template.hpBonus * multiplier),
    strength: Math.floor(template.strengthBonus * multiplier),
    speed: Math.floor(template.speedBonus * multiplier),
    ability: Math.floor(template.abilityBonus * multiplier),
  };
}

export default router;
