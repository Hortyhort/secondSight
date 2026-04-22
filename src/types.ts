export interface EventRecord {
  id: string;
  timestamp: number;
  imageData: string; // Base64 JPEG
  userPrompt: string;
  analysis: RecordAnalysis | null;
  isArchived?: boolean;
}

export interface RecordAnalysis {
  title: string;
  status: string;
  summary: string;
  whatMatters: string[];
  nextActions: ActionItem[];
  isUncertain: boolean;
  uncertaintyReason?: string;
}

export interface ActionItem {
  id: string;
  description: string;
  type: 'reminder' | 'export' | 'note' | 'none';
}
