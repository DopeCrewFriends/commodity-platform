// Vercel serverless function for deleting a contact
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contact_wallet } = req.query;
  const { user_wallet } = req.query;

  if (!user_wallet || !contact_wallet) {
    return res.status(400).json({ error: 'User wallet and contact wallet are required' });
  }

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('contacts')
        .delete()
        .eq('user_wallet_address', user_wallet)
        .eq('contact_wallet_address', contact_wallet)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Contact deleted successfully'
      });
    } else {
      return res.status(503).json({ error: 'Database not configured' });
    }
  } catch (error) {
    console.error('Delete contact error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

