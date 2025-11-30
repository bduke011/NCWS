import React, { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { VibePage } from './pages/VibePage';
import { DashboardPage } from './pages/DashboardPage';
import { getCurrentUser } from './services/api';
import { User, Website } from './types';

type AppState = 'landing' | 'dashboard' | 'editor';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>('landing');
  const [selectedWebsite, setSelectedWebsite] = useState<Website | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setAppState('dashboard');
    } catch (e) {
      console.error(e);
      alert("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
      setUser(null);
      setAppState('landing');
      setSelectedWebsite(undefined);
  };

  const handleCreateNew = () => {
      setSelectedWebsite(undefined);
      setAppState('editor');
  };

  const handleEditWebsite = (website: Website) => {
      setSelectedWebsite(website);
      setAppState('editor');
  };

  const handleBackToDashboard = () => {
      setAppState('dashboard');
      setSelectedWebsite(undefined);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      {!user || appState === 'landing' ? (
        <LandingPage onLogin={handleLogin} />
      ) : appState === 'dashboard' ? (
        <DashboardPage 
            user={user} 
            onCreateNew={handleCreateNew}
            onEdit={handleEditWebsite}
            onLogout={handleLogout}
        />
      ) : (
        <VibePage 
            user={user} 
            initialWebsite={selectedWebsite}
            onBack={handleBackToDashboard}
        />
      )}
    </>
  );
}