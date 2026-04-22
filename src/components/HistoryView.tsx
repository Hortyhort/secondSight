import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EventRecord } from '../types';
import { getRecords, deleteRecord, updateRecord } from '../lib/storage';
import { Camera, Trash2, X, ArchiveRestore, Archive, ChevronLeft, MoreHorizontal, ShieldAlert, Mail } from 'lucide-react';
import { SwipeableRecordRow } from './SwipeableRecordRow';
import { motion, AnimatePresence } from 'motion/react';
import { PRIVACY_POLICY_URL } from '../constants';

interface HistoryViewProps {
  onSelectRecord: (record: EventRecord) => void;
}

export function HistoryView({ onSelectRecord }: HistoryViewProps) {
  const [records, setRecords] = useState<EventRecord[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [actionSheetRecord, setActionSheetRecord] = useState<EventRecord | null>(null);
  const [undoToast, setUndoToast] = useState<{ id: string, timeout: any } | null>(null);

  // Modals state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  const loadRecords = async () => {
    const all = await getRecords(true);
    if (viewMode === 'active') {
      setRecords(all.filter(r => !r.isArchived));
    } else {
      setRecords(all.filter(r => r.isArchived));
    }
  };

  useEffect(() => {
    loadRecords();
    
    const handleUpdate = () => {
      loadRecords();
    };
    
    window.addEventListener('records-updated', handleUpdate);
    return () => {
      window.removeEventListener('records-updated', handleUpdate);
    };
  }, [viewMode]);

  useEffect(() => {
    return () => {
      if (undoToast) {
        clearTimeout(undoToast.timeout);
      }
    };
  }, [undoToast]);

  const handleToggleArchive = async (id: string, currentlyArchived: boolean) => {
    setOpenRowId(null);
    await updateRecord(id, { isArchived: !currentlyArchived });
    
    if (!currentlyArchived) {
      if (undoToast) clearTimeout(undoToast.timeout);
      const timeout = setTimeout(() => {
        setUndoToast(null);
      }, 4000);
      setUndoToast({ id, timeout });
    } else {
      // It was restored, hide toast if exist
      if (undoToast) {
        clearTimeout(undoToast.timeout);
        setUndoToast(null);
      }
    }
  };

  const handleUndoArchive = async () => {
    if (undoToast) {
      await updateRecord(undoToast.id, { isArchived: false });
      clearTimeout(undoToast.timeout);
      setUndoToast(null);
    }
  };

  const executeDelete = async () => {
    if (recordToDelete) {
      await deleteRecord(recordToDelete);
      setRecordToDelete(null);
    }
  };

  const executeClearAllData = async () => {
    const all = await getRecords(true);
    for (const r of all) {
       await deleteRecord(r.id);
    }
    setShowClearConfirm(false);
  };

  const renderHeader = () => {
    if (viewMode === 'archived') {
      return (
        <header className="px-6 pt-12 pb-6 shrink-0 bg-slate-50/95 backdrop-blur-md relative z-20 border-b border-slate-200/50 flex flex-col">
          <button 
            onClick={() => setViewMode('active')} 
            className="flex items-center text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4 w-fit -ml-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Records
          </button>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Archived</h1>
          <p className="text-sm text-slate-500 mt-1">Preserved moments outside your main view.</p>
        </header>
      );
    }

    return (
      <header className="px-6 pt-12 pb-6 shrink-0 bg-slate-50/95 backdrop-blur-md relative z-20 border-b border-slate-200/50 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Records</h1>
          <p className="text-sm text-slate-500 mt-1">Saved moments that may matter later.</p>
        </div>
        <div className="relative flex-shrink-0 ml-4">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 bg-transparent hover:bg-slate-200/50 rounded-full transition-colors outline-none"
            aria-label="Records menu"
          >
            <MoreHorizontal className="w-[20px] h-[20px]" />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  className="absolute top-10 right-0 w-48 bg-white border border-slate-200/70 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] rounded-xl overflow-hidden z-50 flex flex-col py-0.5"
                >
                  <button 
                    onClick={() => {
                      setViewMode('archived');
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Archive className="w-[15px] h-[15px] mr-3 text-slate-400" />
                    Archived
                  </button>
                  <a 
                    href="mailto:support@secondsight.app"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full flex items-center px-4 py-3 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                  >
                    <Mail className="w-[15px] h-[15px] mr-3 text-slate-400" />
                    Support
                  </a>
                  <a 
                    href={PRIVACY_POLICY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full flex items-center px-4 py-3 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                  >
                    <ShieldAlert className="w-[15px] h-[15px] mr-3 text-slate-400" />
                    Privacy Policy
                  </a>
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowClearConfirm(true);
                    }}
                    className="w-full flex items-center px-4 py-3 text-[13.5px] font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                  >
                    <Trash2 className="w-[15px] h-[15px] mr-3 text-red-400" />
                    Clear all data
                  </button>
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 mt-0.5">
                    <p className="text-[10px] font-semibold text-slate-400 text-center tracking-wider">VERSION 1.0.0</p>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>
    );
  };

  return (
    <div className="max-w-md mx-auto w-full pb-24 relative z-10 h-full flex flex-col overflow-hidden">
      {renderHeader()}
      
      {records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto relative z-10 -mt-16">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
            {viewMode === 'archived' ? <Archive className="w-5 h-5 text-slate-300" /> : <Camera className="w-5 h-5 text-slate-300" />}
          </div>
          <div>
            <p className="text-base font-medium text-slate-900">
              {viewMode === 'archived' ? 'No archived records' : 'No records yet'}
            </p>
            <p className="text-slate-500 text-sm mt-1 max-w-[240px] mx-auto leading-relaxed">
              {viewMode === 'archived' ? 'Archived records will appear here.' : 'Point your camera or upload an image to document what matters.'}
            </p>
          </div>
        </div>
      ) : (
        <div 
          className="flex-1 overflow-y-auto px-4 pt-4 pb-24"
          onClick={() => setOpenRowId(null)}
        >
          <div className="space-y-4">
            {records.map((r, i) => (
              <SwipeableRecordRow
                key={r.id}
                record={r}
                index={i}
                isOpen={openRowId === r.id}
                onOpenChange={setOpenRowId}
                onSelect={onSelectRecord}
                onToggleArchive={handleToggleArchive}
                onMore={setActionSheetRecord}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Sheet Portal */}
      {document.getElementById('app-portal') && createPortal(
        <AnimatePresence>
          {actionSheetRecord && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                onClick={() => setActionSheetRecord(null)}
              />
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)] z-50 p-6 pb-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[15px] font-semibold text-slate-900 truncate pr-4">
                    {actionSheetRecord.analysis?.title || actionSheetRecord.userPrompt || "Visual record"}
                  </h3>
                  <button 
                    onClick={() => setActionSheetRecord(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-1.5 flex flex-col h-full overflow-y-auto">
                  <button 
                    onClick={() => {
                      handleToggleArchive(actionSheetRecord.id, !!actionSheetRecord.isArchived);
                      setActionSheetRecord(null);
                    }}
                    className="w-full flex items-center justify-start px-4 py-3.5 bg-slate-50/50 hover:bg-slate-100/80 text-slate-700 rounded-xl transition-colors font-medium text-[14.5px]"
                  >
                    {actionSheetRecord.isArchived ? (
                      <>
                        <ArchiveRestore className="w-4 h-4 mr-3 text-slate-400" />
                        Restore record
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4 mr-3 text-slate-400" />
                        Archive record
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => {
                      setRecordToDelete(actionSheetRecord.id);
                      setActionSheetRecord(null);
                    }}
                    className="w-full flex items-center justify-start px-4 py-3.5 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl transition-colors font-medium text-[14.5px] mt-2 group"
                  >
                    <Trash2 className="w-4 h-4 mr-3 text-red-500 group-hover:text-red-600" />
                    Delete record
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.getElementById('app-portal')!
      )}
      
      {/* Delete Single Confirmation Modal */}
      {document.getElementById('app-portal') && createPortal(
        <AnimatePresence>
          {recordToDelete && (
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
                    onClick={() => setRecordToDelete(null)}
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
        </AnimatePresence>,
        document.getElementById('app-portal')!
      )}
      
      {/* Clear All Confirmation Modal */}
      {document.getElementById('app-portal') && createPortal(
        <AnimatePresence>
          {showClearConfirm && (
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
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Clear All Data</h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    Are you sure you want to clear ALL data? This will permanently delete all active and archived records.
                  </p>
                </div>
                <div className="px-6 py-4 bg-slate-50 flex gap-3 justify-end border-t border-slate-100">
                  <button 
                    onClick={() => setShowClearConfirm(false)}
                    className="py-2.5 px-4 rounded-xl text-[13.5px] font-medium text-slate-600 hover:bg-slate-200/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeClearAllData}
                    className="py-2.5 px-4 rounded-xl text-[13.5px] font-medium bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all shadow-sm"
                  >
                    Delete All
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.getElementById('app-portal')!
      )}

      {/* Undo Toast */}
      <AnimatePresence>
        {undoToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 inset-x-4 z-30 flex justify-center flex-shrink-0"
          >
            <div className="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-[0_8px_30px_-5px_rgba(0,0,0,0.3)] flex items-center gap-4">
              <span className="text-[13.5px] font-medium tracking-wide">Record archived</span>
              <button 
                onClick={handleUndoArchive}
                className="text-white/80 hover:text-white font-semibold text-[12px] uppercase tracking-wider pl-4 border-l border-slate-600 transition-colors"
              >
                Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
