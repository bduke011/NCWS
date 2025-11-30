
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Improved Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Connection
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ZT2ABhPw9IkR@ep-aged-unit-a4in6bzc-pooler.us-east-1.aws.neon.tech/NCWS?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Database Schema Definition
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_description TEXT,
  target_audience TEXT,
  faqs JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Untitled Project',
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT,
  custom_domain_status TEXT DEFAULT 'none',
  current_version_id UUID,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  html_content TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  agent_name TEXT DEFAULT 'Support Bot',
  agent_persona TEXT,
  is_active BOOLEAN DEFAULT true
);
`;

// Initialize Database
const initDb = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon Postgres Database');
    
    const check = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')");
    
    if (!check.rows[0].exists) {
      console.log('⚡ Initializing Database Schema...');
      await client.query(SCHEMA);
      console.log('✅ Database Schema applied successfully');
    } else {
        // Migration: Add title column if it doesn't exist (for existing databases)
        try {
            await client.query("ALTER TABLE websites ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Untitled Project'");
            console.log('✅ Checked/Applied Schema Migrations');
        } catch (e) {
            console.error('Migration error:', e);
        }
    }
    
    client.release();
  } catch (err) {
    console.error('❌ Database connection error:', err);
  }
};

initDb();

// --- API Routes ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Get User
app.get('/api/users/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.log(`Creating new user for ${email}`);
      const newUser = await pool.query(
        'INSERT INTO users (email, name, credits, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *',
        [email, 'Demo User', 10, 'https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff']
      );
      await pool.query('INSERT INTO user_profiles (user_id) VALUES ($1)', [newUser.rows[0].id]);
      return res.json(newUser.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get User Websites (Dashboard)
app.get('/api/websites/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT w.*, v.html_content 
            FROM websites w
            LEFT JOIN website_versions v ON w.current_version_id = v.id
            WHERE w.user_id = $1
            ORDER BY w.updated_at DESC
        `;
        const result = await pool.query(query, [userId]);
        
        const websites = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            title: row.title,
            subdomain: row.subdomain,
            customDomain: row.custom_domain,
            currentVersionId: row.current_version_id,
            isPublished: row.is_published,
            updatedAt: row.updated_at,
            htmlContent: row.html_content, 
            versions: []
        }));
        
        res.json(websites);
    } catch (err) {
        console.error('Error fetching websites:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Toggle Publish Status
app.put('/api/websites/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { isPublished } = req.body;
        await pool.query('UPDATE websites SET is_published = $1, updated_at = NOW() WHERE id = $2', [isPublished, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete Website
app.delete('/api/websites/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM websites WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting website:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Save Website Version (Upsert)
app.post('/api/websites/version', async (req, res) => {
  const { userId, siteId, htmlContent, subdomain, title } = req.body;
  
  try {
    let targetSiteId = siteId;

    // 1. Create New Website if needed
    if (!targetSiteId) {
        const safeSubdomain = subdomain || `site-${Date.now()}`;
        const safeTitle = title || 'Untitled Project';
        
        const newSite = await pool.query(
          'INSERT INTO websites (user_id, title, subdomain, is_published) VALUES ($1, $2, $3, $4) RETURNING id',
          [userId, safeTitle, safeSubdomain, false]
        );
        targetSiteId = newSite.rows[0].id;
        
        await pool.query('INSERT INTO ai_agent_settings (website_id) VALUES ($1)', [targetSiteId]);
    } else if (title) {
        // Update Title if provided for existing site
        await pool.query('UPDATE websites SET title = $1, updated_at = NOW() WHERE id = $2', [title, targetSiteId]);
    }

    // 2. Create Version
    const versionResult = await pool.query(
      'INSERT INTO website_versions (website_id, html_content, version_number) VALUES ($1, $2, (SELECT COALESCE(MAX(version_number), 0) + 1 FROM website_versions WHERE website_id = $1)) RETURNING *',
      [targetSiteId, htmlContent]
    );

    // 3. Update Website Pointer
    await pool.query('UPDATE websites SET current_version_id = $1, updated_at = NOW() WHERE id = $2', [versionResult.rows[0].id, targetSiteId]);

    // Fetch updated site data to return
    const siteResult = await pool.query('SELECT * FROM websites WHERE id = $1', [targetSiteId]);
    const siteData = siteResult.rows[0];

    res.json({ 
        siteId: targetSiteId, 
        version: versionResult.rows[0],
        subdomain: siteData.subdomain,
        title: siteData.title
    });
  } catch (err) {
    console.error('Error saving version:', err);
    res.status(500).json({ error: 'Failed to save version' });
  }
});

// Connect Domain
app.post('/api/domains/connect', async (req, res) => {
  const { userId, domain, method } = req.body;
  try {
    await pool.query(
        'UPDATE websites SET custom_domain = $1, custom_domain_status = $2 WHERE user_id = $3', 
        [domain, 'pending', userId]
    );
    res.json({ success: true, domain, status: 'pending' });
  } catch (err) {
    console.error('Error connecting domain:', err);
    res.status(500).json({ error: 'Failed to connect domain' });
  }
});

// 404 Handler for API
app.use('/api/*', (req, res) => {
    console.warn(`404 Not Found: ${req.originalUrl}`);
    res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
