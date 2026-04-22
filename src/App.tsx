/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { Camera, List } from 'lucide-react';
import { CaptureView } from './components/CaptureView';
import { HistoryView } from './components/HistoryView';
import { AnalysisView } from './components/AnalysisView';
import { EventRecord } from './types';
import { cn } from './lib/utils';
import { AnimatePresence, motion } from 'motion/react';

type Tab = 'capture' | 'history';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('capture');
  const [selectedRecord, setSelectedRecord] = useState<EventRecord | null>(null);
  const [selectedRecordOrigin, setSelectedRecordOrigin] = useState<Tab>('capture');

  const handleRecordCreated = (record: EventRecord) => {
    setSelectedRecordOrigin('capture');
    setSelectedRecord(record);
  };

  const handleSelectHistoryRecord = (record: EventRecord) => {
    setSelectedRecordOrigin('history');
    setSelectedRecord(record);
  };

  const handleCloseRecord = () => {
    setSelectedRecord(null);
    setActiveTab(selectedRecordOrigin);
  };
  
  const handleUpdateRecord = (updated: EventRecord) => {
    setSelectedRecord(updated);
  };

  return (
    <div className="min-h-screen bg-slate-200 font-sans text-slate-900 flex items-center justify-center md:py-8">
      {/* Container acting like the smartphone mockup (on desktop) */}
      <main className="w-full h-[100dvh] md:h-[680px] md:w-[340px] md:rounded-[48px] md:border-[8px] md:border-slate-900 md:shadow-2xl overflow-hidden flex flex-col relative bg-slate-800">
        
        {/* Top Header Overlay (Only for Capture View) */}
        {activeTab === 'capture' && !selectedRecord && (
          <header className="absolute top-0 inset-x-0 h-16 px-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/50 to-transparent pt-safe pointer-events-none">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-semibold text-sm tracking-tight drop-shadow-md">Second Sight</h1>
            </div>
          </header>
        )}

        {/* Dynamic Content full bleed */}
        <div className="flex-1 w-full h-full relative z-10">
          {activeTab === 'capture' && (
            <div className="absolute inset-0 bg-slate-50 z-10">
              <CaptureView onRecordCreated={handleRecordCreated} />
            </div>
          )}
          
          <div className={cn("absolute inset-0 bg-slate-50 transition-opacity duration-300 z-0", activeTab === 'history' ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
             <HistoryView onSelectRecord={handleSelectHistoryRecord} />
          </div>

          <AnimatePresence>
            {selectedRecord && (
              <motion.div 
                initial={{ y: "100%", opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 1 }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className="absolute inset-0 bg-slate-50 z-20"
              >
                <AnalysisView record={selectedRecord} onClose={handleCloseRecord} onUpdateRecord={handleUpdateRecord} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation overlay */}
        {!selectedRecord && (
          <nav className={cn(
            "absolute bottom-0 inset-x-0 border-t flex items-center justify-around pb-safe px-4 z-20 shrink-0 h-20 transition-colors duration-300",
            activeTab === 'capture' ? "bg-slate-900/40 backdrop-blur-xl border-white/10" : "bg-white/90 backdrop-blur-xl border-slate-200/60"
          )}>
             <button 
                onClick={() => setActiveTab('capture')}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-all gap-1.5",
                  activeTab === 'capture' 
                    ? "text-white" 
                    : "text-slate-400 hover:text-slate-600"
                )}
             >
                <Camera className={cn("w-5 h-5", activeTab === 'capture' ? "opacity-100" : "opacity-80")} />
                <span className="text-[10px] font-medium tracking-wide">Capture</span>
             </button>

             <button 
                onClick={() => setActiveTab('history')}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-all gap-1.5",
                  activeTab === 'history' 
                    ? "text-slate-900" 
                    : (activeTab === 'capture' ? "text-white/50 hover:text-white/80" : "text-slate-400 hover:text-slate-600")
                )}
             >
                <List className={cn("w-5 h-5", activeTab === 'history' ? "opacity-100" : "opacity-80")} />
                <span className="text-[10px] font-medium tracking-wide">Records</span>
             </button>
          </nav>
        )}
        
        {/* Portal root for overlay sheets */}
        <div id="app-portal" className="absolute inset-0 z-50 pointer-events-none data-[has-children=true]:pointer-events-auto"></div>
      </main>
    </div>
  );
}
