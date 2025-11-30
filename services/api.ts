
import { User, Website, WebsiteVersion } from '../types';

// Use relative path to allow Vite proxy to handle the routing
const API_URL = '/api';

// Fallback Mock Data (Only used if the backend server is not running)
let mockUser: User = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // UUID
  email: 'demo@vibebuilder.com',
  name: 'Demo User',
  credits: 10,
  avatarUrl: 'https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff'
};

// --- User Services ---
export const getCurrentUser = async (): Promise<User> => {
  try {
    // Health check first
    try {
        await fetch(`${API_URL}/health`);
    } catch (e) {
        throw new Error("Backend unavailable");
    }

    const encodedEmail = encodeURIComponent('demo@vibebuilder.com');
    const res = await fetch(`${API_URL}/users/${encodedEmail}`);
    
    if (!res.ok) {
        if(res.status === 404) console.warn("User endpoint not found");
        throw new Error('Server returned error');
    }
    
    const data = await res.json();
    console.log("Connected to Backend Database as:", data.name);
    
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      credits: data.credits,
      avatarUrl: data.avatar_url || mockUser.avatarUrl
    };
  } catch (e) {
    console.warn("Backend unavailable. Using Mock Data. (Make sure 'node server.js' is running)", e);
    return new Promise(resolve => setTimeout(() => resolve(mockUser), 500));
  }
};

export const loginWithGoogle = async (): Promise<User> => {
    return getCurrentUser();
};

// --- Website Services ---

export const getUserWebsites = async (userId: string): Promise<Website[]> => {
    try {
        const res = await fetch(`${API_URL}/websites/user/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch websites");
        return await res.json();
    } catch (e) {
        console.warn("Using mock websites (Backend likely down)");
        return [];
    }
};

export const deleteWebsite = async (siteId: string): Promise<boolean> => {
    try {
        await fetch(`${API_URL}/websites/${siteId}`, { method: 'DELETE' });
        return true;
    } catch (e) {
        return false;
    }
};

export const toggleWebsiteStatus = async (siteId: string, isPublished: boolean): Promise<boolean> => {
    try {
        await fetch(`${API_URL}/websites/${siteId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPublished })
        });
        return true;
    } catch (e) {
        return false;
    }
};

export const saveWebsiteVersion = async (userId: string, html: string, existingSiteId?: string, title?: string): Promise<Website> => {
  try {
    const res = await fetch(`${API_URL}/websites/version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          userId, 
          siteId: existingSiteId, 
          htmlContent: html, 
          subdomain: `site-${userId.split('-')[0]}-${Date.now()}`,
          title: title
      })
    });
    
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save to DB');
    }
    
    const data = await res.json();
    console.log("Saved version to Database. Version ID:", data.version.id);
    
    return {
      id: data.siteId,
      userId,
      title: data.title || title || 'Untitled Project',
      subdomain: data.subdomain || `site-${userId}`, 
      currentVersionId: data.version.id,
      versions: [data.version],
      isPublished: false,
      updatedAt: new Date().toISOString()
    };
  } catch (e) {
    console.error("Auto-save failed", e);
    throw e;
  }
};

// --- GoDaddy / Domain Services ---
export const connectDomain = async (userId: string, domain: string, method: 'auto' | 'manual'): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}/domains/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, domain, method })
    });
    if (!res.ok) throw new Error('Failed to connect in DB');
    return true;
  } catch (e) {
    console.warn("Backend connect failed.", e);
    return false;
  }
};

// --- Stripe Integration (Mock) ---
export const createCheckoutSession = async (priceId: string): Promise<string> => {
  console.log(`Creating Stripe session for ${priceId}`);
  return "https://checkout.stripe.com/mock-session";
};
