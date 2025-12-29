// Vercel serverless function for searching profiles
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

  const { q: query, exclude } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(200).json({ users: [] });
  }

  try {
    if (supabase) {
      const searchPattern = `%${query.trim()}%`;
      
      let queryBuilder = supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.${searchPattern},username.ilike.${searchPattern}`)
        .limit(50);

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

      // Sort: username matches first
      users.sort((a, b) => {
        const aMatches = a.username?.toLowerCase().includes(query.toLowerCase());
        const bMatches = b.username?.toLowerCase().includes(query.toLowerCase());
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return a.name.localeCompare(b.name);
      });

      return res.status(200).json({ users });
    } else {
      return res.status(503).json({ error: 'Database not configured' });
    }
  } catch (error) {
    console.error('Search profiles error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

