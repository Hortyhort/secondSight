import React, { useEffect } from 'react';
import { EventRecord } from '../types';
import { ChevronRight, Archive, ArchiveRestore, MoreHorizontal } from 'lucide-react';
import { motion, useMotionValue, animate, PanInfo } from 'motion/react';

interface SwipeableRecordRowProps {
  key?: string;
  record: EventRecord;
  onSelect: (record: EventRecord) => void;
  onToggleArchive: (id: string, isArchived: boolean) => void;
  onMore: (record: EventRecord) => void;
  isOpen: boolean;
  onOpenChange: (id: string | null) => void;
  index: number;
}

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
};

const PARTIAL_SWIPE_THRESHOLD = -140; // width of two buttons (70px each)
const FULL_SWIPE_THRESHOLD = -200; // Trigger archive

export function SwipeableRecordRow({
  record,
  onSelect,
  onToggleArchive,
  onMore,
  isOpen,
  onOpenChange,
  index
}: SwipeableRecordRowProps) {
  const x = useMotionValue(0);
  const isArchived = !!record.isArchived;

  useEffect(() => {
    if (!isOpen) {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }
  }, [isOpen, x]);

  const handleDragEnd = (e: any, info: PanInfo) => {
    const currentX = x.get();
    const velocity = info.velocity.x;

    // Full swipe triggering primary action Action (Archive/Restore)
    if (currentX < FULL_SWIPE_THRESHOLD || (velocity < -500 && currentX < -100)) {
      animate(x, -500, { duration: 0.2 }).then(() => {
        onToggleArchive(record.id, isArchived);
      });
      return;
    }

    // Partial swipe revealing actions
    if (currentX < -70 || velocity < -100) {
      animate(x, PARTIAL_SWIPE_THRESHOLD, { type: 'spring', stiffness: 400, damping: 35 });
      onOpenChange(record.id);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });
      onOpenChange(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative w-full rounded-2xl bg-slate-100 overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-200"
    >
      {/* Background Actions */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={() => {
            onOpenChange(null);
            onMore(record);
          }}
          className="w-[70px] flex flex-col items-center justify-center bg-slate-200 text-slate-600 transition-colors hover:bg-slate-300"
          aria-label="More options"
        >
          <MoreHorizontal className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">More</span>
        </button>
        <button
          onClick={() => {
            onToggleArchive(record.id, isArchived);
          }}
          className="w-[70px] flex flex-col items-center justify-center bg-slate-500 text-white transition-colors hover:bg-slate-600"
          aria-label={isArchived ? "Restore record" : "Archive record"}
        >
          {isArchived ? <ArchiveRestore className="w-5 h-5 mb-1" /> : <Archive className="w-5 h-5 mb-1" />}
          <span className="text-[10px] font-medium">{isArchived ? "Restore" : "Archive"}</span>
        </button>
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: PARTIAL_SWIPE_THRESHOLD, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (isOpen) {
            onOpenChange(null);
          } else {
            onSelect(record);
          }
        }}
        className="relative bg-white rounded-2xl w-full z-10 border border-transparent shadow-sm flex items-center p-3 cursor-pointer select-none"
      >
        <div className="w-[46px] h-[46px] rounded-md overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200/60 z-10 pointer-events-none">
          <img src={record.imageData} alt="Thumbnail" className="w-full h-full object-cover" draggable={false} />
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col pl-3.5 justify-center h-full z-10 pointer-events-none">
          <h3 className="text-[14.5px] font-semibold text-slate-900 truncate tracking-tight">
            {record.analysis?.title || record.userPrompt || "Visual record"}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11.5px] text-slate-500 font-medium">
              {formatDate(record.timestamp)}
            </span>
            {record.analysis?.status && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[10.5px] font-medium text-slate-600 bg-slate-100/80 px-1.5 py-[2px] rounded-sm truncate">
                  {record.analysis.status}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center pr-1 pl-2 z-10 relative pointer-events-none">
          <ChevronRight className="w-[15px] h-[15px] text-slate-300/80 transition" />
        </div>
      </motion.div>
    </motion.div>
  );
}
