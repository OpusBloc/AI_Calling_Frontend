export const LANGUAGES: Record<string, string> = {
  "as-IN": "Assamese", "bn-IN": "Bengali", "en-IN": "English (India)",
  "gu-IN": "Gujarati", "hi-IN": "Hindi", "kn-IN": "Kannada",
  "ml-IN": "Malayalam", "mr-IN": "Marathi", "od-IN": "Odia",
  "pa-IN": "Punjabi", "ta-IN": "Tamil", "te-IN": "Telugu",
};
export const languageName = (code: string) => LANGUAGES[code] ?? code;
export const voiceCatalogKey = ["voice-catalog"];
export const customVoicesKey = ["custom-voices"];
export const samplesKey = ["voice-samples"];
export const SAMPLE_NAME = "Rahul";
export const FALLBACK_TEXT = "Hello, this is a quick sample of how I sound on a call.";
export const NAME_PLACEHOLDER = /\{\{\s*@?\s*name\s*\}\}/gi;
export const CLIP_MIN_SECONDS = 10;
export const CLIP_MAX_SECONDS = 15;
export const SPEECH_SAMPLE_RATES = [8000, 16000, 22050, 24000] as const;
export type SpeechSampleRate = (typeof SPEECH_SAMPLE_RATES)[number];
