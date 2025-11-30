import React from 'react';
import { Button } from '../components/Button';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Nav */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          VibeBuilder AI
        </h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onLogin}>Log In</Button>
          <Button onClick={onLogin}>Get Started</Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-8">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-sm font-medium">
            ✨ Build websites like sending a text message
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Your website, created in <br />
            <span className="text-blue-500">seconds.</span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            No drag-and-drop. No complex menus. Just talk to the AI, and watch your professional site come to life.
            It's like the old big-button cell phone, but for web design.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button onClick={onLogin} className="px-8 py-4 text-lg rounded-full">
              Create My Site Now
            </Button>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-8 pt-16 text-left">
            <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mb-4">
                💬
              </div>
              <h3 className="text-lg font-semibold mb-2">Chat to Build</h3>
              <p className="text-slate-400 text-sm">Describe what you want: "A BBQ joint with a red theme." We handle the code.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 mb-4">
                ✏️
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Edits</h3>
              <p className="text-slate-400 text-sm">Need to change text? Just say "Change Box 3 to say Hello". Simple.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400 mb-4">
                🚀
              </div>
              <h3 className="text-lg font-semibold mb-2">Instant Publish</h3>
              <p className="text-slate-400 text-sm">One click to publish on our subdomain or connect your GoDaddy domain.</p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer / Affiliate */}
      <footer className="p-6 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>Partnered with GoDaddy for seamless domain integration.</p>
      </footer>
    </div>
  );
};