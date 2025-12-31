// Vercel serverless function for getting all profiles
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

  const { exclude } = req.query;

  try {
    if (supabase) {
      let queryBuilder = supabase
        .from('profiles')
        .select('*')
        .not('username', 'is', null)
        .neq('username', '')
        .limit(100)
        .order('username', { ascending: true });

      if (exclude) {
        queryBuilder = queryBuilder.neq('wallet_address', exclude);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      const users = (data || []).map(row => ({
        walletAddress: row.wallet_address,
        name: row.name,
        email: row.email,
        company: row.company,
        location: row.location,
        avatarImage: row.avatar_image,
        username: row.username
      }));

      return res.status(200).json({ users });
    } else {
      return res.status(503).json({ error: 'Database not configured' });
    }
  } catch (error) {
    console.error('Get all profiles error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

