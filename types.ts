export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  credits: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isThinking?: boolean; // For the "dots" animation
}

export interface WebsiteVersion {
  id: string;
  versionNumber: number;
  htmlContent: string;
  createdAt: number;
  thumbnailUrl?: string;
}

export interface Website {
  id: string;
  userId: string;
  subdomain: string; // e.g., "mysite" in mysite.vibebuilder.com
  customDomain?: string; // e.g., "mybusiness.com"
  currentVersionId: string;
  versions: WebsiteVersion[];
}

export enum AgentType {
  PLANNER = 'Planner',
  DESIGNER = 'Designer',
  CODER = 'Coder',
  ARTIST = 'Artist'
}

export interface AgentStatus {
  agent: AgentType;
  message: string;
  status: 'idle' | 'working' | 'done' | 'error';
}
