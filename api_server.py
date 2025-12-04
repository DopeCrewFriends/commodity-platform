#!/usr/bin/env python3
"""
Flask API server for CommodityX platform.
Handles user profile storage and retrieval across devices.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import os
from datetime import datetime
from typing import Optional, Dict, List

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database file path
DB_PATH = 'commodityx.db'

def init_db():
    """Initialize the database with required tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create profiles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            wallet_address TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            company TEXT,
            location TEXT,
            avatar_image TEXT,
            created_at TEXT NOT NULL,
            last_updated TEXT NOT NULL
        )
    ''')
    
    # Create index for faster name searches
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_name ON profiles(name)
    ''')
    
    conn.commit()
    conn.close()
    print(f"✅ Database initialized at {DB_PATH}")

def get_db_connection():
    """Get a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'message': 'API is running'}), 200

@app.route('/api/profiles', methods=['POST'])
def save_profile():
    """Save or update a user profile."""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'walletAddress' not in data:
            return jsonify({'error': 'Wallet address is required'}), 400
        
        wallet_address = data['walletAddress']
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        company = data.get('company', '').strip()
        location = data.get('location', '').strip()
        avatar_image = data.get('avatarImage')
        
        # Validate wallet address (basic Solana address validation)
        if not wallet_address or len(wallet_address) < 32:
            return jsonify({'error': 'Invalid wallet address'}), 400
        
        now = datetime.utcnow().isoformat()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if profile exists
        cursor.execute('SELECT wallet_address FROM profiles WHERE wallet_address = ?', (wallet_address,))
        exists = cursor.fetchone()
        
        if exists:
            # Update existing profile
            created_at = cursor.execute('SELECT created_at FROM profiles WHERE wallet_address = ?', (wallet_address,)).fetchone()
            created_at = created_at['created_at'] if created_at else now
            
            cursor.execute('''
                UPDATE profiles 
                SET name = ?, email = ?, company = ?, location = ?, 
                    avatar_image = ?, last_updated = ?
                WHERE wallet_address = ?
            ''', (name, email, company, location, avatar_image, now, wallet_address))
        else:
            # Insert new profile
            cursor.execute('''
                INSERT INTO profiles 
                (wallet_address, name, email, company, location, avatar_image, created_at, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (wallet_address, name, email, company, location, avatar_image, now, now))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Profile saved successfully',
            'walletAddress': wallet_address
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/<wallet_address>', methods=['GET'])
def get_profile(wallet_address: str):
    """Get a user profile by wallet address."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM profiles WHERE wallet_address = ?', (wallet_address,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Profile not found'}), 404
        
        profile = {
            'walletAddress': row['wallet_address'],
            'name': row['name'],
            'email': row['email'],
            'company': row['company'],
            'location': row['location'],
            'avatarImage': row['avatar_image'],
            'createdAt': row['created_at'],
            'lastUpdated': row['last_updated']
        }
        
        return jsonify(profile), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/search', methods=['GET'])
def search_profiles():
    """Search profiles by name."""
    try:
        query = request.args.get('q', '').strip()
        exclude_wallet = request.args.get('exclude', '').strip()
        
        if not query:
            return jsonify({'users': []}), 200
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Search by name (case-insensitive)
        search_pattern = f'%{query}%'
        
        if exclude_wallet:
            cursor.execute('''
                SELECT * FROM profiles 
                WHERE name LIKE ? AND wallet_address != ?
                ORDER BY name ASC
                LIMIT 50
            ''', (search_pattern, exclude_wallet))
        else:
            cursor.execute('''
                SELECT * FROM profiles 
                WHERE name LIKE ?
                ORDER BY name ASC
                LIMIT 50
            ''', (search_pattern,))
        
        rows = cursor.fetchall()
        conn.close()
        
        users = []
        for row in rows:
            users.append({
                'walletAddress': row['wallet_address'],
                'name': row['name'],
                'email': row['email'],
                'company': row['company'],
                'location': row['location'],
                'avatarImage': row['avatar_image']
            })
        
        return jsonify({'users': users}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/all', methods=['GET'])
def get_all_profiles():
    """Get all profiles (for user directory)."""
    try:
        exclude_wallet = request.args.get('exclude', '').strip()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if exclude_wallet:
            cursor.execute('''
                SELECT * FROM profiles 
                WHERE wallet_address != ? AND name != '' AND name IS NOT NULL
                ORDER BY name ASC
                LIMIT 100
            ''', (exclude_wallet,))
        else:
            cursor.execute('''
                SELECT * FROM profiles 
                WHERE name != '' AND name IS NOT NULL
                ORDER BY name ASC
                LIMIT 100
            ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        users = []
        for row in rows:
            users.append({
                'walletAddress': row['wallet_address'],
                'name': row['name'],
                'email': row['email'],
                'company': row['company'],
                'location': row['location'],
                'avatarImage': row['avatar_image']
            })
        
        return jsonify({'users': users}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize database on startup
    init_db()
    
    print("\n" + "="*50)
    print("🚀 CommodityX API Server Starting...")
    print("="*50)
    print(f"📊 Database: {DB_PATH}")
    print("🌐 API Endpoints:")
    print("   GET  /api/health - Health check")
    print("   POST /api/profiles - Save/update profile")
    print("   GET  /api/profiles/<wallet> - Get profile")
    print("   GET  /api/profiles/search?q=<query> - Search profiles")
    print("   GET  /api/profiles/all - Get all profiles")
    print("="*50)
    print("\n⚡ Server running on http://localhost:5000")
    print("📝 API documentation: http://localhost:5000/api/health\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)

