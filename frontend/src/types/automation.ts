export interface WorkflowTriggerOption {
  type: string;
  category: string;
  label: string;
  description: string;
  isRealTime: boolean;
}

export interface WorkflowActionOption {
  type: string;
  label: string;
  channel: "WHATSAPP" | "EMAIL" | "BOTH" | "INTERNAL";
}

export interface WorkflowPlaceholder {
  tag: string;
  label: string;
  example: string;
}

export interface AutomationRule {
  id: string;
  clientId: string;
  name: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig: Record<string, any>;
  actionType: string;
  actionConfig: {
    messageTemplate?: string;
    emailSubject?: string;
    emailBody?: string;
    recipient?: string;
    userId?: string;
    toUserId?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AutomationLog {
  id: string;
  clientId: string;
  ruleId?: string | null;
  targetType: string;
  targetId: string;
  channel: "WHATSAPP" | "EMAIL" | "INTERNAL";
  status: "SENT" | "SIMULATED" | "FAILED";
  recipient?: string | null;
  message?: string | null;
  createdAt: string;
  rule?: {
    name: string;
    triggerType: string;
    actionType: string;
  } | null;
}
