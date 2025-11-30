import React, { useState, useCallback } from 'react';
import { ChatInterface } from '../components/ChatInterface';
import { PreviewPane } from '../components/PreviewPane';
import { Button } from '../components/Button';
import { Message, User } from '../types';
import { generateWebsite } from '../services/gemini';
import { saveWebsiteVersion, connectDomain } from '../services/api';

interface VibePageProps {
  user: User;
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

export const VibePage: React.FC<VibePageProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi ${user.name.split(' ')[0]}! I'm ready to build. What kind of website do you need today?`,
      timestamp: Date.now()
    }
  ]);
  
  const [htmlContent, setHtmlContent] = useState<string>(INITIAL_HTML);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Thinking...');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const handleSendMessage = async (text: string) => {
    // Add User Message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      const newHtml = await generateWebsite(text, htmlContent, (status) => setLoadingStatus(status));
      setHtmlContent(newHtml);
      
      // Save Version
      await saveWebsiteVersion(user.id, newHtml);

      // Add Assistant Response
      const assistantMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: "I've updated the design! Check out the preview on the right. You can ask for more changes or click 'Save & Edit' to refine specific boxes.", 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
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
    // Put a suggested prompt in the chat box would be nice, but for now we just instruct the user
    const instruction = `I want to edit Box ${boxId}. Change...`;
    // We can't easily auto-fill the input component from here without lifting state, 
    // so we'll just inform the user via a system toast or message
    alert(`Selected Box ${boxId}. Type "Change Box ${boxId} to..." in the chat!`);
  }, []);

  const handlePublish = () => {
      // Mock publish flow
      const url = `https://${user.name.toLowerCase().replace(/\s/g, '')}.vibebuilder.com`;
      alert(`Published successfully to ${url}!`);
      setShowPublishModal(false);
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
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-lg hidden md:block">{user.name}'s Project</h1>
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
               onClick={() => setShowPublishModal(true)}
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

      {/* Publish Modal (Simple) */}
      {showPublishModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl">
                  <h2 className="text-2xl font-bold mb-4">Publish your site</h2>
                  <p className="text-slate-400 mb-6">Choose how you want to go live.</p>
                  
                  <div className="space-y-4">
                      <button onClick={handlePublish} className="w-full p-4 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-left transition-colors">
                          <div className="font-bold text-white">Free Subdomain</div>
                          <div className="text-sm text-slate-400">username.vibebuilder.com</div>
                      </button>
                      
                      <button onClick={() => connectDomain("example.com").then(() => alert("Redirecting to GoDaddy Auth..."))} className="w-full p-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-left shadow-lg shadow-blue-900/50 transition-all">
                          <div className="font-bold text-white flex justify-between">
                              <span>Connect Custom Domain</span>
                              <span>🚀</span>
                          </div>
                          <div className="text-sm text-blue-100">Via GoDaddy (Get $10 Credit)</div>
                      </button>
                  </div>
                  
                  <Button variant="outline" className="w-full mt-6" onClick={() => setShowPublishModal(false)}>Cancel</Button>
              </div>
          </div>
      )}
    </div>
  );
};