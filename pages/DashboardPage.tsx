
import React, { useEffect, useState } from 'react';
import { User, Website } from '../types';
import { getUserWebsites, deleteWebsite, toggleWebsiteStatus } from '../services/api';
import { Button } from '../components/Button';

interface DashboardPageProps {
  user: User;
  onEdit: (website: Website) => void;
  onCreateNew: () => void;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onEdit, onCreateNew, onLogout }) => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWebsites();
  }, [user.id]);

  const loadWebsites = async () => {
    setIsLoading(true);
    const sites = await getUserWebsites(user.id);
    setWebsites(sites);
    setIsLoading(false);
  };

  const handleDelete = async (siteId: string) => {
    if (confirm("Are you sure you want to delete this website? This cannot be undone.")) {
        await deleteWebsite(siteId);
        loadWebsites();
    }
  };

  const handleToggleStatus = async (site: Website) => {
      const newStatus = !site.isPublished;
      await toggleWebsiteStatus(site.id, newStatus);
      loadWebsites();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <nav className="border-b border-slate-800 bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg">
                    VB
                </div>
                <h1 className="text-xl font-bold">VibeBuilder Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                     <img src={user.avatarUrl} className="w-8 h-8 rounded-full border border-slate-700" alt="Profile" />
                     <span className="text-sm font-medium">{user.name}</span>
                </div>
                <Button variant="secondary" className="!py-1 !text-xs" onClick={onLogout}>Logout</Button>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">My Websites</h2>
              <Button onClick={onCreateNew} className="shadow-lg shadow-blue-900/40">
                  <span className="text-xl mr-2">+</span> Create New Site
              </Button>
          </div>

          {isLoading ? (
              <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
          ) : websites.length === 0 ? (
              <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-slate-800 border-dashed">
                  <h3 className="text-xl text-slate-300 font-medium mb-2">No websites yet</h3>
                  <p className="text-slate-500 mb-6">Start by chatting with our AI to build your first masterpiece.</p>
                  <Button onClick={onCreateNew}>Create Website</Button>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {websites.map((site) => (
                      <div key={site.id} className="group bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/20">
                          {/* Preview / Thumbnail */}
                          <div className="h-48 bg-slate-900 relative overflow-hidden">
                              <iframe 
                                srcDoc={site.htmlContent || '<body style="background:#0f172a; color:#475569; display:flex; align-items:center; justify-content:center;">No Preview</body>'}
                                className="w-[200%] h-[200%] origin-top-left transform scale-50 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity"
                                tabIndex={-1}
                              />
                              <div className="absolute top-3 right-3 flex gap-2">
                                  {site.isPublished ? (
                                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-lg border border-green-500/30 backdrop-blur-sm">
                                          PUBLISHED
                                      </span>
                                  ) : (
                                    <span className="px-2 py-1 bg-slate-700/80 text-slate-300 text-xs font-bold rounded-lg backdrop-blur-sm border border-slate-600">
                                        DRAFT
                                    </span>
                                  )}
                              </div>
                          </div>

                          {/* Details */}
                          <div className="p-5">
                              <h3 className="font-bold text-lg text-white mb-1 truncate">
                                  {site.title || site.subdomain}
                              </h3>
                              <p className="text-xs text-slate-400 mb-4 font-mono">
                                  {site.customDomain || `${site.subdomain}.vibebuilder.com`}
                              </p>

                              <div className="grid grid-cols-2 gap-2">
                                  <Button onClick={() => onEdit(site)} variant="primary" className="w-full justify-center">
                                      Edit
                                  </Button>
                                  <Button onClick={() => window.open(`/api/preview/${site.id}`, '_blank')} variant="secondary" className="w-full justify-center">
                                      Preview
                                  </Button>
                              </div>
                              
                              <div className="mt-4 flex justify-between pt-4 border-t border-slate-700/50">
                                  <button 
                                    onClick={() => handleToggleStatus(site)}
                                    className={`text-xs font-medium ${site.isPublished ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}`}
                                  >
                                      {site.isPublished ? 'Deactivate' : 'Publish'}
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(site.id)}
                                    className="text-xs font-medium text-red-400 hover:text-red-300"
                                  >
                                      Delete
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </main>
    </div>
  );
};
