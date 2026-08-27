import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import http from 'http';

const OSRM_URL = process.env.OSRM_URL || 'http://localhost:5000';

// Helper to query OSRM HTTP service
const queryOSRM = (coordinates: [number, number][]): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Format: lon,lat;lon,lat;...
    const coordsStr = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
    const url = `${OSRM_URL}/trip/v1/driving/${coordsStr}?source=first&destination=any&roundtrip=true&overview=full&geometries=geojson`;

    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`OSRM returned status ${res.statusCode}: ${data}`));
        } else {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// Fallback simple distance-based TSP heuristic (Nearest Neighbor) if OSRM is offline
const nearestNeighborSort = (start: [number, number], points: any[]): any[] => {
  const result: any[] = [];
  const unvisited = [...points];
  let currentLoc = start;

  while (unvisited.length > 0) {
    let bestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const pt = unvisited[i];
      const dist = Math.hypot(pt.longitude - currentLoc[0], pt.latitude - currentLoc[1]);
      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = i;
      }
    }

    const nextPt = unvisited.splice(bestIndex, 1)[0];
    result.push(nextPt);
    currentLoc = [nextPt.longitude, nextPt.latitude];
  }

  return result;
};

export const getOptimizedRoute = async (req: AuthenticatedRequest, res: Response) => {
  // Start location of driver depot (default: Manila area coordinates)
  const startLon = parseFloat(req.query.start_lon as string) || 120.9842;
  const startLat = parseFloat(req.query.start_lat as string) || 14.5995;

  try {
    // 1. Fetch bins that need collection (fill level >= 80% or status = 'Overflowing')
    const binsRes = await query(`
      SELECT 
        id, 
        bin_code, 
        ST_X(location)::float AS longitude, 
        ST_Y(location)::float AS latitude, 
        fill_level, 
        weight_kg, 
        status
      FROM bins
      WHERE fill_level >= 80.0 OR status = 'Overflowing'
    `);

    const fullBins = binsRes.rows;

    if (fullBins.length === 0) {
      return res.status(200).json({
        message: 'No bins currently require collection.',
        waypoints: [],
        geometry: null,
        duration_sec: 0,
        distance_meters: 0
      });
    }

    // 2. Try OSRM Optimization
    try {
      const coordinates: [number, number][] = [[startLon, startLat]];
      fullBins.forEach(bin => coordinates.push([bin.longitude, bin.latitude]));

      const osrmResult = await queryOSRM(coordinates);
      
      // OSRM Trip endpoint returns:
      // osrmResult.waypoints -> match input coordinates
      // osrmResult.trips[0] -> path summary containing geometry, duration, distance
      const trip = osrmResult.trips?.[0];
      const osrmWaypoints = osrmResult.waypoints || [];

      // Map back to our bin structure based on matching indices
      // OSRM waypoint waypoint_index maps back to our input coords (0 is start, 1..N are bins)
      const orderedBins: any[] = [];
      osrmWaypoints.forEach((wp: any) => {
        if (wp.waypoint_index > 0) {
          const binIndex = wp.waypoint_index - 1;
          orderedBins.push(fullBins[binIndex]);
        }
      });

      return res.status(200).json({
        engine: 'OSRM',
        waypoints: orderedBins,
        geometry: trip?.geometry || null,
        duration_sec: trip?.duration || 0,
        distance_meters: trip?.distance || 0
      });

    } catch (osrmError) {
      console.warn('OSRM service failed, falling back to heuristic sorting:', osrmError);

      // Fallback Nearest Neighbor Sort
      const sortedBins = nearestNeighborSort([startLon, startLat], fullBins);

      return res.status(200).json({
        engine: 'Fallback Nearest-Neighbor (OSRM Offline)',
        waypoints: sortedBins,
        geometry: null, // Client Leaflet/Mapbox can draw straight lines or request standard client routing
        duration_sec: sortedBins.length * 600, // rough estimate: 10 mins per bin
        distance_meters: sortedBins.length * 1500 // rough estimate: 1.5km per bin
      });
    }

  } catch (err) {
    console.error('Route optimization error:', err);
    return res.status(500).json({ message: 'Error calculating optimized route' });
  }
};

export const recordCollection = async (req: AuthenticatedRequest, res: Response) => {
  const { bin_id, verification_method, weight_collected_kg, fill_level_before } = req.body;
  const driverId = req.user?.id;

  if (!bin_id || !verification_method || fill_level_before === undefined) {
    return res.status(400).json({ message: 'Missing bin_id, verification_method, or fill_level_before' });
  }

  try {
    await query('BEGIN');

    // 1. Fetch current status of the bin to confirm existence and log
    const binCheck = await query('SELECT fill_level, weight_kg FROM bins WHERE id = $1', [bin_id]);
    if (binCheck.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'Smart bin not found' });
    }

    const currentWeight = binCheck.rows[0].weight_kg;

    // 2. Insert Collection Transaction Record
    const collectionRes = await query(`
      INSERT INTO collections (bin_id, driver_id, verification_method, weight_collected_kg, fill_level_before, collected_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, bin_id, collected_at
    `, [bin_id, driverId, verification_method, weight_collected_kg || currentWeight, fill_level_before]);

    // 3. Reset Bin telemetry metrics to 0
    await query(`
      UPDATE bins
      SET fill_level = 0.00, weight_kg = 0.00, status = 'Normal', last_telemetry_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [bin_id]);

    await query('COMMIT');

    return res.status(201).json({
      message: 'Waste collection successfully recorded. Bin metrics reset.',
      collection: collectionRes.rows[0]
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Record collection error:', err);
    return res.status(500).json({ message: 'Failed to record collection transaction' });
  }
};
