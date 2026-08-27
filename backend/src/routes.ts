import { Router } from 'express';
import { register, login, getProfile } from './controllers/auth.controller';
import { getBins, registerBin, getTelemetryHistory, getWasteStats } from './controllers/bin.controller';
import { getOptimizedRoute, recordCollection } from './controllers/route.controller';
import { getLeaderboard, getRewardsCatalog, redeemReward, simulateDisposal } from './controllers/citizen.controller';
import { authenticateToken, requireRole } from './middleware/auth.middleware';

const router = Router();

// 1. Authentication & Users
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/users/profile', authenticateToken, getProfile);

// 2. Smart Bins Management & Analytics
router.get('/bins', getBins);
router.post('/bins', authenticateToken, requireRole(['Admin']), registerBin);
router.get('/bins/:id/history', authenticateToken, getTelemetryHistory);
router.get('/analytics/waste-stats', getWasteStats);

// 3. Driver Routing & Pickups
router.get('/routes/optimize', authenticateToken, requireRole(['Driver', 'Admin']), getOptimizedRoute);
router.post('/collections/record', authenticateToken, requireRole(['Driver']), recordCollection);

// 4. Citizen Gamification
router.get('/leaderboard', getLeaderboard);
router.get('/rewards/catalog', authenticateToken, getRewardsCatalog);
router.post('/rewards/redeem', authenticateToken, requireRole(['Citizen']), redeemReward);
router.post('/citizens/dispose/simulate', simulateDisposal);

export default router;
