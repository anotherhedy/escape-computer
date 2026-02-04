export enum FileType {
  FILE = 'FILE',
  DIRECTORY = 'DIRECTORY'
}

export interface FileNode {
  name: string;
  type: FileType;
  content?: string; // For files
  children?: FileNode[]; // For directories
  isHidden?: boolean;
  password?: string; // If set, requires password to enter/read
  isLocked?: boolean; // Runtime state for password
  isEvidence?: boolean; // If true, reading it copies it to /home/user
  scriptAction?: string; // Special identifier for script execution
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'monologue';
  content: string;
  path?: string;
}

export enum GameState {
  BOOT = 'BOOT',
  PLAYING = 'PLAYING',
  WIN = 'WIN',
  LOSE = 'LOSE',
}