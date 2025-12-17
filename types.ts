export enum InputMode {
  TEXT = 'TEXT',
  FILE = 'FILE'
}

export interface UploadedFile {
  name: string;
  type: string;
  data: string; // Base64 string
}

export interface CVData {
  originalText: string;
  file: UploadedFile | null;
  templateInstructions: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}