import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const MOCK_BINS = [
  { id: '1', bin_code: 'BIN-MNL-001', latitude: 14.5995, longitude: 120.9842, fill_level: 45.5, weight_kg: 18.2, battery_level: 98, status: 'Normal', last_telemetry_at: new Date().toISOString() },
  { id: '2', bin_code: 'BIN-MNL-002', latitude: 14.6015, longitude: 120.9892, fill_level: 86.3, weight_kg: 38.5, battery_level: 89, status: 'Overflowing', last_telemetry_at: new Date().toISOString() },
  { id: '3', bin_code: 'BIN-MNL-003', latitude: 14.5935, longitude: 120.9752, fill_level: 12.0, weight_kg: 4.8, battery_level: 92, status: 'Normal', last_telemetry_at: new Date().toISOString() },
  { id: '4', bin_code: 'BIN-MNL-004', latitude: 14.6075, longitude: 120.9822, fill_level: 74.0, weight_kg: 29.4, battery_level: 78, status: 'Warning', last_telemetry_at: new Date().toISOString() },
  { id: '5', bin_code: 'BIN-MNL-005', latitude: 14.5885, longitude: 120.9922, fill_level: 92.0, weight_kg: 48.0, battery_level: 74, status: 'Overflowing', last_telemetry_at: new Date().toISOString() }
];

export const getBins = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const binsRes = await query(`
      SELECT 
        id, 
        bin_code, 
        ST_X(location)::float AS longitude, 
        ST_Y(location)::float AS latitude, 
        fill_level, 
        weight_kg, 
        battery_level, 
        status, 
        last_telemetry_at 
      FROM bins
      ORDER BY bin_code ASC
    `);
    return res.status(200).json(binsRes.rows);
  } catch (err) {
    console.warn('PostgreSQL database offline. Serving mock smart bins array.');
    return res.status(200).json(MOCK_BINS);
  }
};

export const registerBin = async (req: AuthenticatedRequest, res: Response) => {
  const { bin_code, longitude, latitude } = req.body;

  if (!bin_code || longitude === undefined || latitude === undefined) {
    return res.status(400).json({ message: 'Missing bin_code, longitude, or latitude' });
  }

  try {
    const checkRes = await query('SELECT id FROM bins WHERE bin_code = $1', [bin_code]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ message: 'Bin code already registered' });
    }

    const insertRes = await query(`
      INSERT INTO bins (bin_code, location, fill_level, weight_kg, battery_level, status)
      VALUES ($1, ST_SetSRID(ST_Point($2, $3), 4326), 0.00, 0.00, 100.00, 'Normal')
      RETURNING id, bin_code, ST_X(location)::float AS longitude, ST_Y(location)::float AS latitude, status
    `, [bin_code, longitude, latitude]);

    return res.status(201).json({
      message: 'Smart bin registered successfully',
      bin: insertRes.rows[0],
    });
  } catch (err) {
    console.error('Bin registration error:', err);
    return res.status(500).json({ message: 'Server error registering bin' });
  }
};

export const getTelemetryHistory = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const historyRes = await query(`
      SELECT 
        id, 
        fill_level, 
        weight_kg, 
        battery_level, 
        organic_count, 
        non_organic_count, 
        recyclable_count, 
        logged_at 
      FROM telemetry_logs
      WHERE bin_id = $1
      ORDER BY logged_at DESC
      LIMIT $2
    `, [id, limit]);

    return res.status(200).json(historyRes.rows.reverse()); // return in chronological order
  } catch (err) {
    console.error('Fetch telemetry history error:', err);
    return res.status(500).json({ message: 'Error retrieving telemetry history' });
  }
};

export const getWasteStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Aggregated counts from telemetry logs
    const statsRes = await query(`
      SELECT 
        SUM(organic_count)::int AS total_organic,
        SUM(non_organic_count)::int AS total_non_organic,
        SUM(recyclable_count)::int AS total_recyclable,
        COUNT(id)::int AS total_reports
      FROM telemetry_logs
    `);

    // Total collections count and volume collected
    const collectionsRes = await query(`
      SELECT 
        COUNT(id)::int AS total_collections,
        COALESCE(SUM(weight_collected_kg), 0)::float AS total_weight_collected_kg
      FROM collections
    `);

    return res.status(200).json({
      telemetry_aggregates: statsRes.rows[0] || { total_organic: 0, total_non_organic: 0, total_recyclable: 0, total_reports: 0 },
      collection_aggregates: collectionsRes.rows[0] || { total_collections: 0, total_weight_collected_kg: 0 }
    });
  } catch (err) {
    console.error('Fetch waste stats error:', err);
    return res.status(500).json({ message: 'Error retrieving system waste metrics' });
  }
};
