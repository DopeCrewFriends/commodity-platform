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
DB_PATH = 'setl.db'

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
            username TEXT,
            created_at TEXT NOT NULL,
            last_updated TEXT NOT NULL
        )
    ''')
    
    # Create contacts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_wallet_address TEXT NOT NULL,
            contact_wallet_address TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            company TEXT,
            location TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(user_wallet_address, contact_wallet_address),
            FOREIGN KEY (user_wallet_address) REFERENCES profiles(wallet_address)
        )
    ''')
    
    # Create indexes for faster searches
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_name ON profiles(name)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_username ON profiles(username)
    ''')
    # Create unique constraint for username (SQLite doesn't support partial unique indexes the same way)
    # We'll handle uniqueness in application logic, but create a regular index
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_username_unique ON profiles(username)
        WHERE username IS NOT NULL AND username != ''
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_user_wallet ON contacts(user_wallet_address)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_contact_wallet ON contacts(contact_wallet_address)
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
        username = data.get('username', '').strip()
        
        # Validate wallet address (basic Solana address validation)
        if not wallet_address or len(wallet_address) < 32:
            return jsonify({'error': 'Invalid wallet address'}), 400
        
        # Validate username if provided
        if username:
            # Username validation: alphanumeric and underscores only, 3-20 characters
            if not username.replace('_', '').replace('-', '').isalnum() or len(username) < 3 or len(username) > 20:
                return jsonify({'error': 'Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens'}), 400
        
        now = datetime.utcnow().isoformat()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if profile exists
        cursor.execute('SELECT wallet_address FROM profiles WHERE wallet_address = ?', (wallet_address,))
        exists = cursor.fetchone()
        
        # Check for username uniqueness if username is provided (case-insensitive)
        if username:
            username_lower = username.lower().strip()
            cursor.execute('''
                SELECT wallet_address, username FROM profiles 
                WHERE wallet_address != ?
            ''', (wallet_address,))
            all_profiles = cursor.fetchall()
            
            # Check if any existing profile has the same username (case-insensitive)
            for profile in all_profiles:
                if profile['username'] and profile['username'].lower().strip() == username_lower:
                    conn.close()
                    return jsonify({'error': 'Username already taken'}), 409
        
        if exists:
            # Update existing profile
            created_at = cursor.execute('SELECT created_at FROM profiles WHERE wallet_address = ?', (wallet_address,)).fetchone()
            created_at = created_at['created_at'] if created_at else now
            
            # Normalize username to lowercase for storage
            username_normalized = username.lower().strip() if username else None
            cursor.execute('''
                UPDATE profiles 
                SET name = ?, email = ?, company = ?, location = ?, 
                    avatar_image = ?, username = ?, last_updated = ?
                WHERE wallet_address = ?
            ''', (name, email, company, location, avatar_image, username_normalized, now, wallet_address))
        else:
            # Insert new profile
            # Normalize username to lowercase for storage
            username_normalized = username.lower().strip() if username else None
            cursor.execute('''
                INSERT INTO profiles 
                (wallet_address, name, email, company, location, avatar_image, username, created_at, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (wallet_address, name, email, company, location, avatar_image, username_normalized, now, now))
        
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
            'username': row['username'],
            'createdAt': row['created_at'],
            'lastUpdated': row['last_updated']
        }
        
        return jsonify(profile), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/search', methods=['GET'])
def search_profiles():
    """Search profiles by name or username."""
    try:
        query = request.args.get('q', '').strip()
        exclude_wallet = request.args.get('exclude', '').strip()
        
        if not query:
            return jsonify({'users': []}), 200
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Search by name or username (case-insensitive)
        search_pattern = f'%{query}%'
        
        if exclude_wallet:
            cursor.execute('''
                SELECT * FROM profiles 
                WHERE (name LIKE ? OR username LIKE ?) 
                AND wallet_address != ?
                ORDER BY 
                    CASE WHEN username LIKE ? THEN 1 ELSE 2 END,
                    name ASC
                LIMIT 50
            ''', (search_pattern, search_pattern, exclude_wallet, search_pattern))
        else:
            cursor.execute('''
                SELECT * FROM profiles 
                WHERE name LIKE ? OR username LIKE ?
                ORDER BY 
                    CASE WHEN username LIKE ? THEN 1 ELSE 2 END,
                    name ASC
                LIMIT 50
            ''', (search_pattern, search_pattern, search_pattern))
        
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
                'avatarImage': row['avatar_image'],
                'username': row['username']
            })
        
        return jsonify({'users': users}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/username/<username>', methods=['GET'])
def get_profile_by_username(username: str):
    """Get a user profile by username."""
    try:
        username = username.strip()
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM profiles WHERE username = ?', (username,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'User not found'}), 404
        
        profile = {
            'walletAddress': row['wallet_address'],
            'name': row['name'],
            'email': row['email'],
            'company': row['company'],
            'location': row['location'],
            'avatarImage': row['avatar_image'],
            'username': row['username'],
            'createdAt': row['created_at'],
            'lastUpdated': row['last_updated']
        }
        
        return jsonify(profile), 200
        
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
                'avatarImage': row['avatar_image'],
                'username': row['username']
            })
        
        return jsonify({'users': users}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    """Get all contacts for a user."""
    try:
        user_wallet = request.args.get('user_wallet', '').strip()
        
        if not user_wallet:
            return jsonify({'error': 'User wallet address is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM contacts 
            WHERE user_wallet_address = ?
            ORDER BY name ASC
        ''', (user_wallet,))
        
        rows = cursor.fetchall()
        conn.close()
        
        contacts = []
        for row in rows:
            contacts.append({
                'id': str(row['id']),
                'name': row['name'],
                'email': row['email'],
                'walletAddress': row['contact_wallet_address'],
                'company': row['company'],
                'location': row['location']
            })
        
        return jsonify({'contacts': contacts}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contacts', methods=['POST'])
def add_contact():
    """Add a new contact for a user."""
    try:
        data = request.get_json()
        
        if not data or 'userWallet' not in data or 'contact' not in data:
            return jsonify({'error': 'User wallet and contact data are required'}), 400
        
        user_wallet = data['userWallet'].strip()
        contact = data['contact']
        
        if not user_wallet:
            return jsonify({'error': 'User wallet address is required'}), 400
        
        if not contact.get('walletAddress') or not contact.get('name') or not contact.get('email'):
            return jsonify({'error': 'Contact wallet address, name, and email are required'}), 400
        
        contact_wallet = contact['walletAddress'].strip()
        name = contact['name'].strip()
        email = contact['email'].strip()
        company = contact.get('company', '').strip()
        location = contact.get('location', '').strip()
        
        # Don't allow adding yourself as a contact
        if user_wallet == contact_wallet:
            return jsonify({'error': 'Cannot add yourself as a contact'}), 400
        
        now = datetime.utcnow().isoformat()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if contact already exists
        cursor.execute('''
            SELECT id FROM contacts 
            WHERE user_wallet_address = ? AND contact_wallet_address = ?
        ''', (user_wallet, contact_wallet))
        
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Contact already exists'}), 409
        
        # Insert new contact
        cursor.execute('''
            INSERT INTO contacts 
            (user_wallet_address, contact_wallet_address, name, email, company, location, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_wallet, contact_wallet, name, email, company, location, now))
        
        conn.commit()
        contact_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Contact added successfully',
            'contact': {
                'id': str(contact_id),
                'name': name,
                'email': email,
                'walletAddress': contact_wallet,
                'company': company,
                'location': location
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contacts/<contact_wallet>', methods=['DELETE'])
def delete_contact(contact_wallet: str):
    """Delete a contact for a user."""
    try:
        user_wallet = request.args.get('user_wallet', '').strip()
        contact_wallet = contact_wallet.strip()
        
        if not user_wallet or not contact_wallet:
            return jsonify({'error': 'User wallet and contact wallet are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            DELETE FROM contacts 
            WHERE user_wallet_address = ? AND contact_wallet_address = ?
        ''', (user_wallet, contact_wallet))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Contact not found'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Contact deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize database on startup
    init_db()
    
    print("\n" + "="*50)
    print("🚀 SETL API Server Starting...")
    print("="*50)
    print(f"📊 Database: {DB_PATH}")
    print("🌐 API Endpoints:")
    print("   GET  /api/health - Health check")
    print("   POST /api/profiles - Save/update profile")
    print("   GET  /api/profiles/<wallet> - Get profile")
    print("   GET  /api/profiles/search?q=<query> - Search profiles by name/username")
    print("   GET  /api/profiles/username/<username> - Get profile by username")
    print("   GET  /api/profiles/all - Get all profiles")
    print("   GET  /api/contacts?user_wallet=<wallet> - Get user contacts")
    print("   POST /api/contacts - Add contact")
    print("   DELETE /api/contacts/<wallet>?user_wallet=<wallet> - Delete contact")
    print("="*50)
    print("\n⚡ Server running on http://localhost:5000")
    print("📝 API documentation: http://localhost:5000/api/health\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)



