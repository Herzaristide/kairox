import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { MonsterRepository } from '../repositories/MonsterRepository';
import { EquipmentRepository } from '../repositories/EquipmentRepository';
import { UserRepository } from '../repositories/UserRepository';
import { ApiResponse } from '../types';

const router = Router();
const monsterRepo = new MonsterRepository();
const equipmentRepo = new EquipmentRepository();
const userRepo = new UserRepository();

// GET /inventory/monsters
router.get(
  '/monsters',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const monsters = await monsterRepo.getUserMonsters(userId);

      // Populate equipment for each monster
      for (const monster of monsters) {
        monster.equipment = await equipmentRepo.getMonsterEquipment(monster.id);
      }

      res.json({
        success: true,
        data: monsters,
      } as ApiResponse);
    } catch (error) {
      console.error('Get monsters error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// GET /inventory/equipment
router.get(
  '/equipment',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const equipment = await equipmentRepo.getUserEquipment(userId);

      res.json({
        success: true,
        data: equipment,
      } as ApiResponse);
    } catch (error) {
      console.error('Get equipment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// POST /inventory/monsters/:id/favorite
router.post(
  '/monsters/:id/favorite',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const monsterId = parseInt(req.params.id);
      const { isFavorite } = req.body;

      // Verify monster belongs to user
      const monster = await monsterRepo.getUserMonster(userId, monsterId);
      if (!monster) {
        res.status(404).json({
          success: false,
          error: 'Monster not found',
        } as ApiResponse);
        return;
      }

      // Update favorite status
      await monsterRepo.setMonsterFavorite(monsterId, isFavorite);

      res.json({
        success: true,
        message: isFavorite ? 'Added to favorites' : 'Removed from favorites',
      } as ApiResponse);
    } catch (error) {
      console.error('Set monster favorite error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// POST /inventory/equipment/:id/equip
router.post(
  '/equipment/:id/equip',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const { monsterId } = req.body;

      // Verify equipment belongs to user
      const userEquipment = await equipmentRepo.getUserEquipment(req.user!.id);
      const equipment = userEquipment.find((e) => e.id === equipmentId);

      if (!equipment) {
        res.status(404).json({
          success: false,
          error: 'Equipment not found',
        } as ApiResponse);
        return;
      }

      // Verify monster belongs to user
      const monster = await monsterRepo.getMonsterById(monsterId);
      if (!monster || monster.userId !== req.user!.id) {
        res.status(404).json({
          success: false,
          error: 'Monster not found',
        } as ApiResponse);
        return;
      }

      await equipmentRepo.equipItem(equipmentId, monsterId);

      res.json({
        success: true,
        message: 'Equipment equipped successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Equip item error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// POST /inventory/equipment/:id/unequip
router.post(
  '/equipment/:id/unequip',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const equipmentId = parseInt(req.params.id);

      // Verify equipment belongs to user
      const userEquipment = await equipmentRepo.getUserEquipment(req.user!.id);
      const equipment = userEquipment.find((e) => e.id === equipmentId);

      if (!equipment) {
        res.status(404).json({
          success: false,
          error: 'Equipment not found',
        } as ApiResponse);
        return;
      }

      await equipmentRepo.unequipItem(equipmentId);

      res.json({
        success: true,
        message: 'Equipment unequipped successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Unequip item error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// GET /inventory/shop/monsters
router.get(
  '/shop/monsters',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const templates = await monsterRepo.getAvailableMonsterTemplates();

      res.json({
        success: true,
        data: templates,
      } as ApiResponse);
    } catch (error) {
      console.error('Get monster templates error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// GET /inventory/shop/equipment
router.get(
  '/shop/equipment',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const templates = await equipmentRepo.getAvailableEquipmentTemplates();

      res.json({
        success: true,
        data: templates,
      } as ApiResponse);
    } catch (error) {
      console.error('Get equipment templates error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

// POST /inventory/shop/equipment/:id/buy
router.post(
  '/shop/equipment/:id/buy',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Get equipment template and user
      const templates = await equipmentRepo.getAvailableEquipmentTemplates();
      const template = templates.find((t) => t.id === templateId);
      const user = await userRepo.findById(userId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Equipment not found',
        } as ApiResponse);
        return;
      }

      if (!user || user.coins < template.price) {
        res.status(400).json({
          success: false,
          error: 'Insufficient coins',
        } as ApiResponse);
        return;
      }

      // Purchase equipment
      const newEquipment = await equipmentRepo.purchaseEquipment(
        userId,
        templateId
      );
      await userRepo.updateCoins(userId, user.coins - template.price);

      res.json({
        success: true,
        data: newEquipment,
        message: 'Equipment purchased successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Purchase equipment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as ApiResponse);
    }
  }
);

export default router;
