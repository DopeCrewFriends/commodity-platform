// Vercel serverless function for getting profile by wallet address
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', wallet)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      return res.status(200).json({
        walletAddress: data.wallet_address,
        name: data.name,
        email: data.email,
        company: data.company,
        location: data.location,
        avatarImage: data.avatar_image,
        username: data.username,
        createdAt: data.created_at,
        lastUpdated: data.last_updated
      });
    } else {
      return res.status(503).json({ error: 'Database not configured' });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}


