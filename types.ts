
export type Role = 'ADMIN' | 'MEMBER';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export type ProjectLifecycle = 'ACTIVE' | 'ARCHIVED' | 'LEGACY';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  currentWorkload?: number; // 0-100
  isRegistered?: boolean;
  registeredAt?: number;
  // Profile Fields
  roll?: string;
  position?: string;
  bio?: string;
  linkedin?: string;
  whatsapp?: string;
  major?: string;
  year?: string;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: string;
  uploadedAt: number;
}

export interface ProgressEntry {
  id: string;
  text: string;
  timestamp: number;
  userId: string;
}

export interface Reflection {
  id: string;
  userId: string;
  text: string;
  category: 'SUCCESS' | 'FAILURE' | 'ADAPTATION';
  timestamp: number;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeIds: string[];
  status: TaskStatus;
  priority: Priority;
  deadline: string;
  completionPercentage: number;
  subtasks: SubTask[];
  attachments: Attachment[];
  progressEntries: ProgressEntry[];
  impactScore: number;
  clarityScore?: number;
  dependencies: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  leadId: string;
  memberIds: string[];
  createdAt: number;
  deadline: string;
  progress: number;
  healthStatus: 'HEALTHY' | 'AT_RISK' | 'STALLED';
  lifecycle: ProjectLifecycle;
  location?: { lat: number; lng: number; address: string };
  reflections: Reflection[];
  milestones: Milestone[];
}

export interface NexusInsight {
  type: 'CLARITY' | 'PROGRESS' | 'WORKLOAD' | 'IMPACT' | 'HANDOVER';
  message: string;
  actionable?: string;
  agentName: string;
  // Detailed audit fields
  score?: number;
  details?: {
    smart?: {
      specific: string;
      measurable: string;
      achievable: string;
      relevant: string;
      timeBound: string;
    };
    questions?: string[];
    suggestion?: string;
  };
}
