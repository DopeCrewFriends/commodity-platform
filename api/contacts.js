// Vercel serverless function for contacts operations
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const { user_wallet } = req.query;

  try {
    if (method === 'GET') {
      // Get all contacts for a user
      if (!user_wallet) {
        return res.status(400).json({ error: 'User wallet address is required' });
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_wallet_address', user_wallet)
          .order('name', { ascending: true });

        if (error) throw error;

        const contacts = (data || []).map(row => ({
          id: row.id.toString(),
          name: row.name,
          email: row.email,
          walletAddress: row.contact_wallet_address,
          company: row.company,
          location: row.location
        }));

        return res.status(200).json({ contacts });
      } else {
        return res.status(503).json({ error: 'Database not configured' });
      }
    }

    if (method === 'POST') {
      // Add a new contact
      const { userWallet, contact } = req.body;

      if (!userWallet || !contact) {
        return res.status(400).json({ error: 'User wallet and contact data are required' });
      }

      if (!contact.walletAddress || !contact.name || !contact.email) {
        return res.status(400).json({ error: 'Contact wallet address, name, and email are required' });
      }

      if (userWallet === contact.walletAddress) {
        return res.status(400).json({ error: 'Cannot add yourself as a contact' });
      }

      if (supabase) {
        // Check if contact already exists
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('user_wallet_address', userWallet)
          .eq('contact_wallet_address', contact.walletAddress)
          .single();

        if (existing) {
          return res.status(409).json({ error: 'Contact already exists' });
        }

        // Insert new contact
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            user_wallet_address: userWallet,
            contact_wallet_address: contact.walletAddress,
            name: contact.name,
            email: contact.email,
            company: contact.company || '',
            location: contact.location || ''
          })
          .select()
          .single();

        if (error) throw error;

        return res.status(201).json({
          success: true,
          message: 'Contact added successfully',
          contact: {
            id: data.id.toString(),
            name: data.name,
            email: data.email,
            walletAddress: data.contact_wallet_address,
            company: data.company,
            location: data.location
          }
        });
      } else {
        return res.status(503).json({ error: 'Database not configured' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Contacts API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}


