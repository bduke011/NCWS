
import React, { useState, useCallback, useEffect } from 'react';
import { ChatInterface } from '../components/ChatInterface';
import { PreviewPane } from '../components/PreviewPane';
import { Button } from '../components/Button';
import { Message, User, Website } from '../types';
import { generateWebsite } from '../services/gemini';
import { saveWebsiteVersion, connectDomain } from '../services/api';

interface VibePageProps {
  user: User;
  initialWebsite?: Website;
  onBack: () => void;
}

const INITIAL_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 flex items-center justify-center min-h-screen">
    <div class="text-center p-8" data-vibe-box="1">
        <h1 class="text-4xl font-bold text-gray-800 mb-4" data-vibe-box="2">Welcome to your new site</h1>
        <p class="text-gray-600 mb-8" data-vibe-box="3">Tell the AI on the left what you want to build!</p>
        <button class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition" data-vibe-box="4">Get Started</button>
    </div>
</body>
</html>
`;

export const VibePage: React.FC<VibePageProps> = ({ user, initialWebsite, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: initialWebsite 
        ? `Welcome back! I've loaded ${initialWebsite.title}. What would you like to change?`
        : `Hi ${user.name.split(' ')[0]}! I'm ready to build. What kind of website do you need today?`,
      timestamp: Date.now()
    }
  ]);
  
  const [htmlContent, setHtmlContent] = useState<string>(initialWebsite?.htmlContent || INITIAL_HTML);
  const [currentWebsite, setCurrentWebsite] = useState<Website | undefined>(initialWebsite);
  const [siteTitle, setSiteTitle] = useState(initialWebsite?.title || 'Untitled Project');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Thinking...');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  // Custom Domain State
  const [customDomain, setCustomDomain] = useState(initialWebsite?.customDomain || '');
  const [domainStep, setDomainStep] = useState<'input' | 'choice' | 'manual'>('input');

  // Auto-save on initial load if it's a new site
  useEffect(() => {
    if (!initialWebsite) {
        performSave(INITIAL_HTML, 'Untitled Project');
    }
  }, []);

  const performSave = async (html: string, title: string) => {
      setSaveStatus('saving');
      try {
          const updatedSite = await saveWebsiteVersion(user.id, html, currentWebsite?.id, title);
          setCurrentWebsite(updatedSite);
          setSaveStatus('saved');
      } catch (e) {
          console.error("Save failed", e);
          setSaveStatus('error');
      }
  };

  const handleTitleBlur = () => {
      if (siteTitle !== currentWebsite?.title) {
          performSave(htmlContent, siteTitle);
      }
  };

  const handleSendMessage = async (text: string) => {
    // Add User Message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      const newHtml = await generateWebsite(text, htmlContent, (status) => setLoadingStatus(status));
      setHtmlContent(newHtml);
      
      // Save Version
      await performSave(newHtml, siteTitle);

      // Add Assistant Response
      const assistantMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: "I've updated the design! Check out the preview on the right.", 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
      const errorMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: "Sorry, I hit a snag generating the code. Please try again or check your API key.", 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBoxSelect = useCallback((boxId: string) => {
    const instruction = `I want to edit Box ${boxId}. Change...`;
    alert(`Selected Box ${boxId}. Type "Change Box ${boxId} to..." in the chat!`);
  }, []);

  const handlePublishFree = () => {
      const url = `https://${user.name.toLowerCase().replace(/\s/g, '')}.vibebuilder.com`;
      alert(`Published successfully to ${url}!`);
      setShowPublishModal(false);
  };

  const handleConnectDomainAuto = async () => {
      const spid = "VIBEBUILDER_DNS_SERVICE"; 
      const connectUrl = `https://dcc.godaddy.com/manage/properties?domain=${customDomain}&spid=${spid}&namespace=vibebuilder`;
      await connectDomain(user.id, customDomain, 'auto');
      window.open(connectUrl, '_blank');
      alert("Opened GoDaddy. Please approve the connection there, then come back here.");
      setShowPublishModal(false);
  };

  const handleConnectDomainManual = async () => {
      await connectDomain(user.id, customDomain, 'manual');
      setDomainStep('manual');
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-white">
      {/* Sidebar / Chat (Left) */}
      <div className="w-[400px] flex-shrink-0 h-full border-r border-slate-800 z-10 shadow-2xl">
        <ChatInterface 
            messages={messages} 
            onSendMessage={handleSendMessage}
            isGenerating={isGenerating}
            loadingStatus={loadingStatus}
        />
      </div>

      {/* Main Content (Right) */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1">
            <Button variant="outline" className="!py-1 !px-2 border-slate-700 text-slate-400" onClick={onBack}>
              ← Back
            </Button>
            
            {/* Editable Title */}
            <div className="flex flex-col">
                <input 
                    type="text" 
                    value={siteTitle} 
                    onChange={(e) => setSiteTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    className="bg-transparent font-bold text-lg border-b border-transparent hover:border-slate-700 focus:border-blue-500 outline-none transition-colors w-64"
                    placeholder="Project Name"
                />
                <span className="text-xs text-slate-500">
                    {currentWebsite?.subdomain ? `${currentWebsite.subdomain}.vibebuilder.com` : 'Draft'}
                </span>
            </div>

            {/* Auto-Save Indicator */}
            <div className="flex items-center gap-2 ml-4">
                 {saveStatus === 'saving' && (
                     <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-medium border border-yellow-500/20 animate-pulse">
                         <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                         Saving...
                     </div>
                 )}
                 {saveStatus === 'saved' && (
                     <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-medium border border-green-500/20">
                         <div className="w-2 h-2 rounded-full bg-green-500"></div>
                         Saved
                     </div>
                 )}
                 {saveStatus === 'error' && (
                     <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-medium border border-red-500/20">
                         <div className="w-2 h-2 rounded-full bg-red-500"></div>
                         Save Failed
                     </div>
                 )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <Button 
               variant={isEditMode ? 'primary' : 'outline'} 
               onClick={() => setIsEditMode(!isEditMode)}
             >
               {isEditMode ? 'Done Editing' : 'Edit Boxes'}
             </Button>
             
             <Button 
               variant="primary" 
               className="bg-green-600 hover:bg-green-500 shadow-green-900/50"
               onClick={() => {
                   setDomainStep('input');
                   setShowPublishModal(true);
               }}
             >
               Publish
             </Button>
             
             <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600 ml-2">
                <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover"/>
             </div>
          </div>
        </header>

        {/* Preview Area */}
        <main className="flex-1 overflow-hidden relative">
          <PreviewPane 
            htmlContent={htmlContent} 
            isEditMode={isEditMode}
            onBoxSelect={handleBoxSelect}
          />
        </main>
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-lg w-full shadow-2xl">
                  <h2 className="text-2xl font-bold mb-4">Publish your site</h2>
                  
                  {domainStep === 'input' && (
                    <div className="space-y-4">
                      <p className="text-slate-400 mb-2">Choose how you want to go live.</p>
                      
                      {/* Free Option */}
                      <button onClick={handlePublishFree} className="w-full p-4 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-left transition-colors">
                          <div className="font-bold text-white">Free Subdomain</div>
                          <div className="text-sm text-slate-400">{currentWebsite ? currentWebsite.subdomain : user.name.toLowerCase()}.vibebuilder.com</div>
                      </button>
                      
                      {/* Custom Domain Input */}
                      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-600 space-y-3">
                          <div className="font-bold text-white">Connect Custom Domain</div>
                          <input 
                            type="text" 
                            placeholder="example.com" 
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                          />
                          <Button 
                            variant="primary" 
                            className="w-full"
                            disabled={!customDomain.includes('.')}
                            onClick={() => setDomainStep('choice')}
                          >
                            Next
                          </Button>
                      </div>
                    </div>
                  )}

                  {domainStep === 'choice' && (
                      <div className="space-y-4">
                           <h3 className="text-lg font-semibold">Configuring {customDomain}</h3>
                           <p className="text-slate-400 text-sm">How would you like to connect your domain?</p>
                           
                           <button onClick={handleConnectDomainAuto} className="w-full p-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-left shadow-lg shadow-blue-900/50 transition-all">
                              <div className="font-bold text-white flex justify-between items-center">
                                  <span>Auto-Connect (GoDaddy)</span>
                                  <span className="text-xl">🚀</span>
                              </div>
                              <div className="text-sm text-blue-100 mt-1">
                                  Best for GoDaddy domains. We'll handle the DNS settings for you via Domain Connect.
                              </div>
                           </button>

                           <button onClick={handleConnectDomainManual} className="w-full p-4 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-left transition-colors">
                              <div className="font-bold text-white">Manual DNS Setup</div>
                              <div className="text-sm text-slate-400 mt-1">
                                  For Namecheap, Cloudflare, or other registrars.
                              </div>
                           </button>
                           
                           <Button variant="outline" className="w-full mt-2" onClick={() => setDomainStep('input')}>Back</Button>
                      </div>
                  )}

                  {domainStep === 'manual' && (
                      <div className="space-y-4">
                          <h3 className="text-lg font-semibold">DNS Settings for {customDomain}</h3>
                          <p className="text-slate-400 text-sm">Log in to your registrar and add these records:</p>
                          
                          <div className="bg-slate-900 p-4 rounded-lg font-mono text-sm space-y-2">
                              <div className="flex justify-between border-b border-slate-800 pb-2">
                                  <span className="text-slate-500">Type</span>
                                  <span className="text-slate-500">Name</span>
                                  <span className="text-slate-500">Value</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-blue-400">A</span>
                                  <span>@</span>
                                  <span>76.76.21.21</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-blue-400">CNAME</span>
                                  <span>www</span>
                                  <span>cname.vibebuilder.com</span>
                              </div>
                          </div>

                          <Button variant="primary" className="w-full" onClick={() => {
                              alert("We're checking your DNS... Check back in 5 minutes!");
                              setShowPublishModal(false);
                          }}>
                              Verify Connection
                          </Button>
                          <Button variant="outline" className="w-full" onClick={() => setDomainStep('choice')}>Back</Button>
                      </div>
                  )}
                  
                  {domainStep === 'input' && (
                    <Button variant="outline" className="w-full mt-6" onClick={() => setShowPublishModal(false)}>Cancel</Button>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
