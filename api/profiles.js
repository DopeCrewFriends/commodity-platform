// Vercel serverless function for profile operations
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Helper to get database connection (fallback to in-memory for development)
let db = null;
if (!supabase) {
  // Fallback: Use a simple in-memory store (for development only)
  // In production, you MUST use Supabase or another database
  db = {
    profiles: new Map(),
    contacts: new Map()
  };
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const { wallet_address } = req.query;

  try {
    if (method === 'POST') {
      // Save or update profile
      const { walletAddress, name, email, company, location, avatarImage, username } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
      }

      if (walletAddress.length < 32) {
        return res.status(400).json({ error: 'Invalid wallet address' });
      }

      // Validate username if provided
      if (username) {
        if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
          return res.status(400).json({ 
            error: 'Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens' 
          });
        }
      }

      const now = new Date().toISOString();

      if (supabase) {
        // Use Supabase
        // Check if username is taken (if provided)
        if (username) {
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('wallet_address')
            .eq('username', username)
            .neq('wallet_address', walletAddress)
            .single();

          if (existingUser) {
            return res.status(409).json({ error: 'Username already taken' });
          }
        }

        // Check if profile exists
        const { data: existing } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('wallet_address', walletAddress)
          .single();

        if (existing) {
          // Update existing profile
          const { error } = await supabase
            .from('profiles')
            .update({
              name,
              email,
              company,
              location,
              avatar_image: avatarImage,
              username,
              last_updated: now
            })
            .eq('wallet_address', walletAddress);

          if (error) throw error;
        } else {
          // Insert new profile
          const { error } = await supabase
            .from('profiles')
            .insert({
              wallet_address: walletAddress,
              name,
              email,
              company,
              location,
              avatar_image: avatarImage,
              username,
              created_at: now,
              last_updated: now
            });

          if (error) throw error;
        }
      } else {
        // Fallback: in-memory storage (development only)
        const existing = db.profiles.get(walletAddress);
        
        if (username) {
          for (const [addr, profile] of db.profiles.entries()) {
            if (profile.username === username && addr !== walletAddress) {
              return res.status(409).json({ error: 'Username already taken' });
            }
          }
        }

        db.profiles.set(walletAddress, {
          wallet_address: walletAddress,
          name,
          email,
          company,
          location,
          avatar_image: avatarImage,
          username,
          created_at: existing?.created_at || now,
          last_updated: now
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Profile saved successfully',
        walletAddress
      });
    }

    if (method === 'GET' && wallet_address) {
      // Get profile by wallet address
      if (supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('wallet_address', wallet_address)
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
        // Fallback
        const profile = db.profiles.get(wallet_address);
        if (!profile) {
          return res.status(404).json({ error: 'Profile not found' });
        }
        return res.status(200).json({
          walletAddress: profile.wallet_address,
          name: profile.name,
          email: profile.email,
          company: profile.company,
          location: profile.location,
          avatarImage: profile.avatar_image,
          username: profile.username,
          createdAt: profile.created_at,
          lastUpdated: profile.last_updated
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Profile API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

