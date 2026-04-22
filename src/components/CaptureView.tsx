import React, { useState, useEffect } from 'react';
import { Camera, Check, RefreshCw, Loader2, FileUp, Shield } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { analyzeSituation } from '../lib/gemini';
import { EventRecord } from '../types';
import { saveRecord } from '../lib/storage';
import { PRIVACY_POLICY_URL } from '../constants';

interface CaptureViewProps {
  onRecordCreated: (record: EventRecord) => void;
}

export function CaptureView({ onRecordCreated }: CaptureViewProps) {
  const [isOnboarded, setIsOnboarded] = useState<boolean>(
    () => localStorage.getItem('second-sight-onboarded') === 'true'
  );
  
  const { videoRef, startCamera, stopCamera, captureFrame, error: camError, hasCamera, stream } = useCamera();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Only try to start if we haven't captured an image and are onboarded
    if (!capturedImage && isOnboarded) {
      startCamera();
    }
  }, [capturedImage, startCamera, isOnboarded]);

  const handleGrantPermission = () => {
    localStorage.setItem('second-sight-onboarded', 'true');
    setIsOnboarded(true);
  };

  const handleCapture = () => {
    const frame = captureFrame();
    if (frame) {
      setCapturedImage(frame);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      
      // Downscale uploaded image
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
          stopCamera();
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setPrompt('');
    setErrorMsg(null);
    startCamera();
  };

  const handleSubmit = async () => {
    if (!capturedImage) return;
    setIsAnalyzing(true);
    setErrorMsg(null);

    const saveFallback = async (fallbackMsg: string) => {
      const newRecord: EventRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        imageData: capturedImage,
        userPrompt: prompt,
        analysis: {
          title: "Saved Image",
          summary: fallbackMsg,
          status: "Pending",
          whatMatters: [],
          nextActions: [],
          isUncertain: true,
          uncertaintyReason: "Analysis is pending."
        }
      };
      await saveRecord(newRecord);
      onRecordCreated(newRecord);
    };

    try {
      if (!navigator.onLine) {
        throw new Error('offline');
      }

      const mimeType = capturedImage.substring(5, capturedImage.indexOf(';'));
      const analysis = await analyzeSituation(capturedImage, mimeType, prompt);
      
      const newRecord: EventRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        imageData: capturedImage,
        userPrompt: prompt,
        analysis
      };

      await saveRecord(newRecord);
      onRecordCreated(newRecord);
      
    } catch (err: any) {
      console.error(err);
      
      let msg = "Analysis couldn't be completed.";
      let fallbackSummary = "Analysis failed or was skipped.";
      
      if (err.message === 'offline') {
        msg = "No internet connection detected.";
        fallbackSummary = "Saved offline. Connect to internet to re-analyze.";
      } else if (err.message?.includes('safety') || err.message?.includes('blocked')) {
        msg = "Image couldn't be processed due to safety guidelines.";
        fallbackSummary = "Analysis blocked due to safety guidelines.";
      }

      // Automatically save it locally so user doesn't lose the photo
      await saveFallback(fallbackSummary);
      setErrorMsg(msg); // Let it show in a subtle toast or log if we kept them on screen, but here we navigate away
      
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOnboarded) {
    return (
      <div className="flex flex-col h-full w-full relative bg-slate-50 items-center justify-center p-6 text-center z-50">
        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg mb-8">
          <Camera className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-3">Welcome to Second Sight</h2>
        <p className="text-slate-600 text-[15px] leading-relaxed mb-8 max-w-sm">
          Point your phone at anything confusing in the real world to understand it and securely save moments that matter.
        </p>
        <div className="bg-slate-100 rounded-xl p-4 mb-10 w-full max-w-xs text-left">
          <h3 className="text-[13px] font-semibold text-slate-900 flex items-center">
            <Shield className="w-4 h-4 mr-2 text-slate-500" />
            Camera Access
          </h3>
          <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed">
            Second Sight requires camera access to analyze your physical surroundings. Your camera is only active while on the capture screen.
          </p>
        </div>
        <button 
          onClick={handleGrantPermission}
          className="w-full max-w-xs py-3.5 bg-slate-900 text-white rounded-xl font-semibold text-[15px] shadow-md hover:bg-slate-800 transition active:scale-95"
        >
          Enable Camera
        </button>
        <div className="mt-8">
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">
            Privacy Policy
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative bg-slate-900">
      <div className="absolute inset-0 z-0">
        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            {!stream && hasCamera && !camError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
            {camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
                <p className="mb-4 text-[15px] font-medium max-w-xs">{camError}</p>
                <div className="flex flex-col items-center space-y-4">
                  <label className="bg-white text-slate-900 px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2 cursor-pointer shadow-md">
                    <FileUp className="w-5 h-5" />
                    Upload Photo Instead
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <button onClick={() => startCamera()} className="text-white/70 text-[13px] hover:text-white underline underline-offset-4">
                    Retry Camera
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Viewport Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-0 pointer-events-none"></div>

      <div className="absolute inset-x-0 bottom-24 p-6 z-10 flex flex-col justify-end">
        {!capturedImage && stream && (
          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={handleCapture}
              className="w-16 h-16 rounded-full border-4 border-white/50 bg-white/20 shadow-lg flex items-center justify-center active:scale-95 transition-transform backdrop-blur-md"
              aria-label="Take Photo"
            >
              <div className="w-12 h-12 bg-white rounded-full"></div>
            </button>
            <label className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-full font-medium inline-flex items-center gap-2 cursor-pointer backdrop-blur-md text-xs hover:bg-white/20 transition">
              <FileUp className="w-4 h-4" />
              Upload Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {capturedImage && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-white/20 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Analysis Request</span>
                <h4 className="text-lg font-semibold text-slate-900 mt-1">Review Image</h4>
              </div>
              {!isAnalyzing && (
                <button 
                  onClick={handleRetake}
                  className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              <input 
                id="promptInput"
                type="text" 
                placeholder="What should I know?" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full py-2 bg-transparent border-b border-slate-200 focus:outline-none focus:border-slate-400 text-sm placeholder-slate-400"
                disabled={isAnalyzing}
              />
            </div>

            {errorMsg && (
              <p className="text-red-500 text-xs font-medium">{errorMsg}</p>
            )}

            <button 
              onClick={handleSubmit} 
              disabled={isAnalyzing}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Understanding...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Understand</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
