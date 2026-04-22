import { RecordAnalysis } from "../types";

export async function analyzeSituation(base64Image: string, mimeType: string, userPrompt: string): Promise<RecordAnalysis> {
  // Strip data:image/*;base64, prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  
  if (!navigator.onLine) {
    throw new Error('offline');
  }

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      base64Image: base64Data,
      mimeType,
      userPrompt
    })
  });

  if (!response.ok) {
    let errorMessage = "Analysis couldn't be completed.";
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // Ignore parsing errors for the error response
    }
    throw new Error(errorMessage);
  }

  const jsonStr = await response.text();
  
  try {
    const parsed = JSON.parse(jsonStr) as RecordAnalysis;
    return parsed;
  } catch (err) {
    console.error("Failed to parse backend output:", err, jsonStr);
    throw new Error("Could not parse AI response.");
  }
}
