// Vercel serverless function for health check
import { createClient } from '@supabase/supabase-js';

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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  const health = {
    status: 'ok',
    message: 'API is running',
    database: {
      configured: !!(supabaseUrl && supabaseKey),
      connected: false
    }
  };

  // Test Supabase connection if configured
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      // Try a simple query to test connection
      const { error } = await supabase.from('profiles').select('wallet_address').limit(1);
      
      if (!error) {
        health.database.connected = true;
        health.message = 'API is running and database is connected';
      } else {
        health.database.connected = false;
        health.message = 'API is running but database connection failed';
        health.database.error = error.message;
      }
    } catch (error) {
      health.database.connected = false;
      health.message = 'API is running but database connection failed';
      health.database.error = error.message;
    }
  } else {
    health.message = 'API is running but database is not configured';
    health.database.error = 'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables';
  }

  return res.status(200).json(health);
}

