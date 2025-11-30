import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

interface PreviewPaneProps {
  htmlContent: string;
  isEditMode: boolean;
  onBoxSelect: (boxId: string) => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({ 
  htmlContent, 
  isEditMode,
  onBoxSelect 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Inject the editing script whenever HTML changes or Edit Mode toggles
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // We write the content to the iframe
    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent || '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#64748b;">Generating preview...</div>');
      
      // Inject Edit Mode CSS and Script
      if (isEditMode) {
        doc.write(`
          <style>
            [data-vibe-box] {
              position: relative;
              cursor: pointer;
              transition: all 0.2s;
            }
            [data-vibe-box]:hover {
              outline: 2px solid #3b82f6; /* Blue outline */
            }
            [data-vibe-box]::after {
              content: attr(data-vibe-box);
              position: absolute;
              top: 0;
              left: 0;
              background: #3b82f6;
              color: white;
              font-size: 12px;
              padding: 2px 6px;
              border-bottom-right-radius: 4px;
              z-index: 50;
              pointer-events: none;
            }
          </style>
          <script>
            document.body.addEventListener('click', function(e) {
              const target = e.target.closest('[data-vibe-box]');
              if (target) {
                e.preventDefault();
                e.stopPropagation();
                window.parent.postMessage({ type: 'BOX_SELECTED', id: target.getAttribute('data-vibe-box') }, '*');
              }
            }, true);
          </script>
        `);
      }
      doc.close();
    }
  }, [htmlContent, isEditMode]);

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'BOX_SELECTED') {
        onBoxSelect(event.data.id);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onBoxSelect]);

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Toolbar */}
      <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-slate-900">
        <div className="flex gap-2">
           <Button 
             variant={viewMode === 'desktop' ? 'primary' : 'secondary'} 
             onClick={() => setViewMode('desktop')}
             className="!py-1 !px-3 text-sm"
            >
             Desktop
           </Button>
           <Button 
             variant={viewMode === 'mobile' ? 'primary' : 'secondary'} 
             onClick={() => setViewMode('mobile')}
             className="!py-1 !px-3 text-sm"
            >
             Mobile
           </Button>
        </div>
        <div className="text-slate-400 text-xs">
            {isEditMode ? "EDIT MODE: Click a box to change it" : "PREVIEW MODE"}
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 flex justify-center bg-slate-950 overflow-hidden pt-4 pb-8">
        <div 
          className={`transition-all duration-300 bg-white shadow-2xl overflow-hidden ${
            viewMode === 'mobile' 
              ? 'w-[375px] h-[812px] rounded-[3rem] border-[8px] border-slate-800' 
              : 'w-full h-full'
          }`}
        >
          <iframe 
            ref={iframeRef}
            title="Website Preview"
            className="w-full h-full bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};