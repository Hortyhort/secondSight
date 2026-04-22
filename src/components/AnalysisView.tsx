import React, { useState } from 'react';
import { EventRecord } from '../types';
import { AlertCircle, FileText, CheckCircle2, ChevronRight, Share, Calendar, CheckSquare, MoreHorizontal, Archive, ArchiveRestore, Trash2, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateRecord, deleteRecord } from '../lib/storage';
import { analyzeSituation } from '../lib/gemini';

interface AnalysisViewProps {
  record: EventRecord;
  onClose: () => void;
  onUpdateRecord?: (record: EventRecord) => void;
}

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(timestamp));
};

export function AnalysisView({ record, onClose, onUpdateRecord }: AnalysisViewProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Re-analysis state
  const [isReanalyzingMode, setIsReanalyzingMode] = useState(false);
  const [newPrompt, setNewPrompt] = useState(record.userPrompt || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);

  const an = record.analysis;
  if (!an) return null;

  const handleToggleArchive = async () => {
    setIsMenuOpen(false);
    const updated = { ...record, isArchived: !record.isArchived };
    await updateRecord(record.id, { isArchived: !record.isArchived });
    if (onUpdateRecord) onUpdateRecord(updated);
  };

  const executeDelete = async () => {
    setShowDeleteConfirm(false);
    await deleteRecord(record.id);
    onClose();
  };
  
  const handleReanalyzeMode = () => {
    setIsMenuOpen(false);
    setIsReanalyzingMode(true);
  };
  
  const confirmReanalyze = () => {
    // If the record was previously analyzed, warn them it will be replaced.
    // If it was just an empty default framework without analysis, skip warning.
    if (an.summary || an.whatMatters.length > 0) {
      setShowReanalyzeConfirm(true);
    } else {
      executeReanalyze();
    }
  };

  const executeReanalyze = async () => {
    setShowReanalyzeConfirm(false);
    setIsAnalyzing(true);
    setReanalyzeError(null);
    try {
      if (!navigator.onLine) {
        throw new Error('offline');
      }
      const mimeType = record.imageData.substring(5, record.imageData.indexOf(';'));
      const newAnalysis = await analyzeSituation(record.imageData, mimeType, newPrompt);
      
      const updated = {
        ...record,
        userPrompt: newPrompt,
        analysis: newAnalysis
      };
      
      await updateRecord(record.id, { userPrompt: newPrompt, analysis: newAnalysis });
      if (onUpdateRecord) onUpdateRecord(updated);
      setIsReanalyzingMode(false);
    } catch (err: any) {
      console.error(err);
      let msg = "Analysis couldn't be completed.";
      if (err.message === 'offline') {
        msg = "No internet connection detected.";
      } else if (err.message?.includes('safety') || err.message?.includes('blocked')) {
        msg = "Image couldn't be processed due to safety guidelines.";
      }
      setReanalyzeError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-md mx-auto w-full relative">
      <div className="flex-1 overflow-y-auto pb-12 pt-[64px] space-y-4">
        {/* Visual Header */}
        <div className="relative h-48 sm:h-64 rounded-3xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.1)] flex-shrink-0 border border-slate-200/60 bg-slate-100 mx-4">
          <img src={record.imageData} alt="Record" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent pointer-events-none"></div>
          
          <div className="absolute top-4 left-4 z-10 text-white shadow-sm rounded-full flex overflow-hidden backdrop-blur-md border border-white/20 bg-slate-900/50 hover:bg-slate-900/70 transition">
             <button 
               onClick={isReanalyzingMode ? () => setIsReanalyzingMode(false) : onClose}
               className="w-9 h-9 flex items-center justify-center"
               aria-label={isReanalyzingMode ? "Cancel" : "Close record"}
             >
               {isReanalyzingMode ? (
                 <svg className="w-4 h-4 mr-0.5" fill="none" strokeWidth="2.5" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
               ) : (
                 <svg className="w-4 h-4 mr-0.5" fill="none" strokeWidth="2.5" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
               )}
             </button>
          </div>
          
          {!isReanalyzingMode && (
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-900/50 backdrop-blur-md text-white border border-white/20 hover:bg-slate-900/70 transition shadow-sm"
                aria-label="Record actions"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute top-11 right-0 w-48 bg-white border border-slate-200/70 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden py-1 z-50 origin-top-right"
                    >
                      <button 
                        onClick={handleReanalyzeMode}
                        className="w-full flex items-center px-4 py-2.5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <RefreshCw className="w-[15px] h-[15px] mr-2.5 text-slate-400" />
                        Re-analyze Image
                      </button>
                      <button 
                        onClick={handleToggleArchive}
                        className="w-full flex items-center px-4 py-2.5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                      >
                        {record.isArchived ? (
                          <ArchiveRestore className="w-[15px] h-[15px] mr-2.5 text-slate-400" />
                        ) : (
                          <Archive className="w-[15px] h-[15px] mr-2.5 text-slate-400" />
                        )}
                        {record.isArchived ? 'Restore record' : 'Archive record'}
                      </button>
                      <button 
                        onClick={() => { setIsMenuOpen(false); setShowDeleteConfirm(true); }}
                        className="w-full flex items-center px-4 py-2.5 text-[13.5px] font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                      >
                        <Trash2 className="w-[15px] h-[15px] mr-2.5 text-red-500" />
                        Delete record
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {isReanalyzingMode ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 pb-8 space-y-6"
          >
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Re-analyze Image</h1>
              <p className="text-[13.5px] text-slate-500">Add or edit your question for the AI.</p>
            </div>
            
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="What should I know?" 
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-[14px] shadow-sm"
                disabled={isAnalyzing}
              />
              
              {reanalyzeError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-[13px] text-red-800">
                  {reanalyzeError}
                </div>
              )}
              
              <button 
                onClick={confirmReanalyze} 
                disabled={isAnalyzing}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium text-[14px] flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-opacity"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Analyze Image</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 pb-8 space-y-7"
          >
            <div className="space-y-3 mt-1">
              <h1 className="text-[24px] font-semibold text-slate-900 leading-tight tracking-tight">
                {an.title || record.userPrompt || "Saved Image"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-slate-500">
                  {formatDate(record.timestamp)}
                </span>
                {an.status && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-[12px] font-medium text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-sm">
                      {an.status}
                    </span>
                  </>
                )}
              </div>
            </div>

            {an.isUncertain && (
              <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 flex items-start space-x-3 text-orange-900">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
                <div>
                  <p className="font-semibold text-[11px] uppercase tracking-wide text-orange-700">Notice</p>
                  <p className="text-[13px] mt-0.5 leading-relaxed text-orange-800/90">{an.uncertaintyReason}</p>
                </div>
              </div>
            )}

            {/* Interpretation */}
            {an.summary && (
              <section>
                <p className="text-[15px] leading-relaxed text-slate-700">{an.summary}</p>
              </section>
            )}

            {/* Prioritization */}
            {an.whatMatters && an.whatMatters.length > 0 && (
              <section>
                <h2 className="text-[12px] font-medium text-slate-400 mb-3 block">Key details</h2>
                <ul className="space-y-2.5">
                  {an.whatMatters.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 bg-slate-800 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-slate-700 text-[15px] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Next Actions */}
            {an.nextActions && an.nextActions.length > 0 && (
              <section>
                <h2 className="text-[12px] font-medium text-slate-400 mb-3 block">Suggested steps</h2>
                <div className="space-y-2">
                  {an.nextActions.map((action, idx) => (
                    <div key={idx} className="bg-transparent border border-slate-200/50 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3 pr-4">
                        <ActionIcon type={action.type} />
                        <span className="font-medium text-[14px] text-slate-700 leading-snug">{action.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            
            {/* If it's an unanalyzed record without next actions, give a prompt hint */}
            {an.whatMatters.length === 0 && an.nextActions.length === 0 && (
              <div className="pt-4 border-t border-slate-100 flex justify-center">
                 <button 
                  onClick={handleReanalyzeMode}
                  className="text-[13px] font-medium text-slate-500 hover:text-slate-800 transition"
                 >
                   Need to process this image? <span className="underline underline-offset-2 ml-1">Run Analysis</span>
                 </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Record</h3>
                <p className="text-[14px] text-slate-600 leading-relaxed">
                  Are you sure you want to delete this moment? This action cannot be undone.
                </p>
              </div>
              <div className="px-6 py-4 bg-slate-50 flex gap-3 justify-end border-t border-slate-100">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-2.5 px-4 rounded-xl text-[13.5px] font-medium text-slate-600 hover:bg-slate-200/50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  className="py-2.5 px-4 rounded-xl text-[13.5px] font-medium bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all shadow-sm"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-analyze Confirmation Modal */}
      <AnimatePresence>
        {showReanalyzeConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Replace Analysis?</h3>
                <p className="text-[14px] text-slate-600 leading-relaxed">
                  Running a new analysis will permanently overwrite the current interpretation and suggested steps for this record.
                </p>
              </div>
              <div className="px-6 py-4 bg-slate-50 flex gap-3 justify-end border-t border-slate-100">
                <button 
                  onClick={() => setShowReanalyzeConfirm(false)}
                  className="py-2.5 px-4 rounded-xl text-[13.5px] font-medium text-slate-600 hover:bg-slate-200/50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeReanalyze}
                  className="py-2.5 px-4 rounded-xl text-[13.5px] font-medium bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
                >
                  Confirm & Replace
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionIcon({ type }: { type: string }) {
  switch(type) {
    case 'reminder': return <Calendar className="w-5 h-5 text-slate-400" />;
    case 'export': return <Share className="w-5 h-5 text-slate-400" />;
    case 'note': return <FileText className="w-5 h-5 text-slate-400" />;
    default: return <CheckSquare className="w-5 h-5 text-slate-400" />;
  }
}
