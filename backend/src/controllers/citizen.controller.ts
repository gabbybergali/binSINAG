import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getLeaderboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Household leaderboard
    const householdsRes = await query(`
      SELECT 
        u.first_name, 
        u.last_name, 
        cp.barangay, 
        cp.points_balance
      FROM citizen_profiles cp
      JOIN users u ON cp.user_id = u.id
      ORDER BY cp.points_balance DESC
      LIMIT 20
    `);

    // Barangay leaderboard aggregates
    const barangaysRes = await query(`
      SELECT 
        cp.barangay, 
        SUM(cp.points_balance)::int AS total_points,
        COUNT(cp.user_id)::int AS active_households
      FROM citizen_profiles cp
      WHERE cp.barangay IS NOT NULL AND cp.barangay != ''
      GROUP BY cp.barangay
      ORDER BY total_points DESC
    `);

    return res.status(200).json({
      households: householdsRes.rows,
      barangays: barangaysRes.rows
    });
  } catch (err) {
    console.error('Fetch leaderboard error:', err);
    return res.status(500).json({ message: 'Error retrieving system leaderboards' });
  }
};

export const getRewardsCatalog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const catalogRes = await query('SELECT * FROM rewards_catalog WHERE stock > 0 ORDER BY points_cost ASC');
    return res.status(200).json(catalogRes.rows);
  } catch (err) {
    console.error('Fetch catalog error:', err);
    return res.status(500).json({ message: 'Error retrieving rewards catalog' });
  }
};

export const redeemReward = async (req: AuthenticatedRequest, res: Response) => {
  const { reward_id } = req.body;
  const citizenId = req.user?.id;

  if (!reward_id || !citizenId) {
    return res.status(400).json({ message: 'Reward ID is required' });
  }

  try {
    await query('BEGIN');

    // 1. Check reward points cost and stock availability
    const rewardRes = await query('SELECT title, points_cost, stock FROM rewards_catalog WHERE id = $1', [reward_id]);
    if (rewardRes.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'Reward not found' });
    }

    const reward = rewardRes.rows[0];
    if (reward.stock <= 0) {
      await query('ROLLBACK');
      return res.status(400).json({ message: 'Reward is out of stock' });
    }

    // 2. Check citizen points balance
    const profileRes = await query('SELECT points_balance FROM citizen_profiles WHERE user_id = $1', [citizenId]);
    if (profileRes.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(400).json({ message: 'Citizen profile not found' });
    }

    const currentPoints = profileRes.rows[0].points_balance;
    if (currentPoints < reward.points_cost) {
      await query('ROLLBACK');
      return res.status(400).json({
        message: `Insufficient points. You need ${reward.points_cost} points, but only have ${currentPoints}.`
      });
    }

    // 3. Deduct points from profile
    await query(`
      UPDATE citizen_profiles 
      SET points_balance = points_balance - $1 
      WHERE user_id = $2
    `, [reward.points_cost, citizenId]);

    // 4. Reduce reward catalog stock by 1
    await query('UPDATE rewards_catalog SET stock = stock - 1 WHERE id = $1', [reward_id]);

    // 5. Insert transaction log (negative points for redemption)
    await query(`
      INSERT INTO rewards_and_transactions (citizen_id, transaction_type, points, details)
      VALUES ($1, 'REDEEMED_REWARD', $2, $3)
    `, [citizenId, -reward.points_cost, JSON.stringify({ reward_id, title: reward.title })]);

    await query('COMMIT');

    return res.status(200).json({
      message: `Successfully redeemed: ${reward.title}`,
      deducted_points: reward.points_cost,
      remaining_points: currentPoints - reward.points_cost
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Reward redemption error:', err);
    return res.status(500).json({ message: 'Failed to complete reward redemption transaction' });
  }
};

// Simulated household disposal for easy testing/demo
export const simulateDisposal = async (req: AuthenticatedRequest, res: Response) => {
  const { qr_code_identifier, waste_category, weight_kg } = req.body;

  if (!qr_code_identifier || !waste_category || !weight_kg) {
    return res.status(400).json({ message: 'Missing qr_code_identifier, waste_category, or weight_kg' });
  }

  // Define points per kg structure
  let pointsPerKg = 5;
  if (waste_category === 'recyclable') pointsPerKg = 15;
  if (waste_category === 'biodegradable') pointsPerKg = 8;
  const calculatedPoints = Math.round(weight_kg * pointsPerKg);

  try {
    await query('BEGIN');

    // 1. Find citizen by QR Code
    const profileRes = await query('SELECT user_id, points_balance FROM citizen_profiles WHERE qr_code_identifier = $1', [qr_code_identifier]);
    if (profileRes.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'No household found matching this QR code.' });
    }

    const citizenId = profileRes.rows[0].user_id;

    // 2. Add points
    await query(`
      UPDATE citizen_profiles 
      SET points_balance = points_balance + $1 
      WHERE user_id = $2
    `, [calculatedPoints, citizenId]);

    // 3. Log transaction
    await query(`
      INSERT INTO rewards_and_transactions (citizen_id, transaction_type, points, details)
      VALUES ($1, 'EARNED_DISPOSAL', $2, $3)
    `, [citizenId, calculatedPoints, JSON.stringify({ waste_category, weight_kg })]);

    await query('COMMIT');

    return res.status(200).json({
      message: 'Proper segregation verified! Points awarded.',
      points_earned: calculatedPoints,
      new_balance: profileRes.rows[0].points_balance + calculatedPoints
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Simulated disposal error:', err);
    return res.status(500).json({ message: 'Failed to process points reward' });
  }
};
