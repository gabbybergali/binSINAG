import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtsigningkey123!';

export const register = async (req: AuthenticatedRequest, res: Response) => {
  const { username, email, password, role, first_name, last_name, phone_number, address, barangay } = req.body;

  if (!username || !email || !password || !role || !first_name || !last_name) {
    return res.status(400).json({ message: 'Missing required signup fields' });
  }

  if (!['Admin', 'Driver', 'Citizen'].includes(role)) {
    return res.status(400).json({ message: 'Invalid user role' });
  }

  try {
    // 1. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Start transaction
    await query('BEGIN');

    // 3. Insert User
    const userRes = await query(
      `INSERT INTO users (username, email, password_hash, role, phone_number, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, role, first_name, last_name`,
      [username, email, passwordHash, role, phone_number, first_name, last_name]
    );

    const newUser = userRes.rows[0];

    // 4. Create profile if Citizen
    if (role === 'Citizen') {
      // Generate a unique 12-char alphanumeric household QR code identifier
      const qrCodeIdentifier = 'QR-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      
      await query(
        `INSERT INTO citizen_profiles (user_id, qr_code_identifier, points_balance, address, barangay)
         VALUES ($1, $2, $3, $4, $5)`,
        [newUser.id, qrCodeIdentifier, 0, address || '', barangay || '']
      );
    }

    await query('COMMIT');

    // 5. Generate token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: newUser,
    });
  } catch (err: any) {
    await query('ROLLBACK');
    console.error('Registration error:', err);
    if (err.constraint === 'users_username_key') {
      return res.status(400).json({ message: 'Username is already taken' });
    }
    if (err.constraint === 'users_email_key') {
      return res.status(400).json({ message: 'Email is already registered' });
    }
    return res.status(500).json({ message: 'Server registration error' });
  }
};

export const login = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Fetch additional citizen profile info if applicable
    let profile = null;
    if (user.role === 'Citizen') {
      const profileRes = await query('SELECT * FROM citizen_profiles WHERE user_id = $1', [user.id]);
      profile = profileRes.rows[0];
    }

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        profile,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server login error' });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userRes = await query(
      'SELECT id, username, email, role, phone_number, first_name, last_name FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRes.rows[0];
    let profile = null;

    if (user.role === 'Citizen') {
      const profileRes = await query('SELECT * FROM citizen_profiles WHERE user_id = $1', [user.id]);
      profile = profileRes.rows[0];
    }

    return res.status(200).json({
      ...user,
      profile,
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ message: 'Server error retrieving profile' });
  }
};
