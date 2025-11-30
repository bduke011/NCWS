import React, { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { VibePage } from './pages/VibePage';
import { getCurrentUser } from './services/api';
import { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      // Simulate API login
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (e) {
      console.error(e);
      alert("Login failed");
    } finally {
      setIsLoading(false);
    }
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
      {user ? (
        <VibePage user={user} />
      ) : (
        <LandingPage onLogin={handleLogin} />
      )}
    </>
  );
}