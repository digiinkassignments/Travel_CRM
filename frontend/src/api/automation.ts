import { apiClient } from "./client";
import {
  AutomationRule,
  AutomationLog,
  WorkflowTriggerOption,
  WorkflowActionOption,
  WorkflowPlaceholder,
} from "../types/automation";

export interface AutomationOptionsResponse {
  triggerTypes: WorkflowTriggerOption[];
  actionTypes: WorkflowActionOption[];
  defaultRecipes: any[];
  placeholders: WorkflowPlaceholder[];
}

export async function getAutomationOptions(): Promise<AutomationOptionsResponse> {
  const res = await apiClient.get("/automation/options");
  return res.data.data;
}

export async function getAutomationRules(): Promise<AutomationRule[]> {
  const res = await apiClient.get("/automation/rules");
  return res.data.data ?? [];
}

export async function seedAutomationRecipes(): Promise<AutomationRule[]> {
  const res = await apiClient.post("/automation/rules/seed-recipes");
  return res.data.data ?? [];
}

export async function createAutomationRule(data: Partial<AutomationRule>): Promise<AutomationRule> {
  const res = await apiClient.post("/automation/rules", data);
  return res.data.data;
}

export async function updateAutomationRule(id: string, data: Partial<AutomationRule>): Promise<AutomationRule> {
  const res = await apiClient.patch(`/automation/rules/${id}`, data);
  return res.data.data;
}

export async function deleteAutomationRule(id: string): Promise<void> {
  await apiClient.delete(`/automation/rules/${id}`);
}

export async function testAutomationRule(
  id: string,
  payload: { testPhone?: string; testEmail?: string; targetId?: string }
): Promise<{ targetType: string; targetId: string }> {
  const res = await apiClient.post(`/automation/rules/${id}/test`, payload);
  return res.data.data;
}

export async function getAutomationLogs(params?: {
  ruleId?: string;
  channel?: string;
  status?: string;
  search?: string;
  limit?: number;
}): Promise<AutomationLog[]> {
  const res = await apiClient.get("/automation/logs", { params });
  return res.data.data ?? [];
}
