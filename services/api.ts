import { User, Website, WebsiteVersion } from '../types';

// Mock Data Storage
let currentUser: User = {
  id: 'user-1',
  email: 'demo@vibebuilder.com',
  name: 'Demo User',
  credits: 10,
  avatarUrl: 'https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff'
};

const websites: Website[] = [];

// --- User Services ---
export const getCurrentUser = async (): Promise<User> => {
  return new Promise(resolve => setTimeout(() => resolve(currentUser), 500));
};

export const loginWithGoogle = async (): Promise<User> => {
    // Simulate OAuth flow
    return new Promise(resolve => setTimeout(() => resolve(currentUser), 1000));
};

// --- Website Services ---
export const saveWebsiteVersion = async (userId: string, html: string): Promise<Website> => {
  // Simulate saving to Neon Postgres
  const versionId = `v-${Date.now()}`;
  const newVersion: WebsiteVersion = {
    id: versionId,
    versionNumber: Date.now(),
    htmlContent: html,
    createdAt: Date.now()
  };

  let site = websites.find(w => w.userId === userId);
  if (!site) {
    site = {
      id: `site-${Date.now()}`,
      userId,
      subdomain: `site-${Date.now().toString().slice(-4)}`,
      currentVersionId: versionId,
      versions: []
    };
    websites.push(site);
  }

  site.versions.push(newVersion);
  site.currentVersionId = versionId;

  return new Promise(resolve => setTimeout(() => resolve({ ...site }), 800));
};

// --- GoDaddy Integration (Mock) ---
export const connectDomain = async (domain: string): Promise<boolean> => {
  console.log(`Connecting domain ${domain} via GoDaddy API...`);
  // Would call backend -> GoDaddy API to update A Records
  return new Promise(resolve => setTimeout(() => resolve(true), 2000));
};

// --- Stripe Integration (Mock) ---
export const createCheckoutSession = async (priceId: string): Promise<string> => {
  console.log(`Creating Stripe session for ${priceId}`);
  return "https://checkout.stripe.com/mock-session";
};
