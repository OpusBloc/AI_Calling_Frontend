export type TableColumnConfig = {
  label: string;
  width: string;
  kind?: "text" | "subtitle" | "status" | "avatar" | "number" | "date" | "actions" | "content";
};

export const CAMPAIGN_COLUMNS: TableColumnConfig[] = [
  { label: "Campaign", width: "22%", kind: "subtitle" },
  { label: "Status", width: "12%", kind: "status" },
  { label: "Agent", width: "17%", kind: "avatar" },
  { label: "Calling window", width: "18%", kind: "text" },
  { label: "Concurrency", width: "10%", kind: "number" },
  { label: "Start", width: "15%", kind: "date" },
  { label: "", width: "6%", kind: "actions" },
];

export const DASHBOARD_CAMPAIGN_COLUMNS: TableColumnConfig[] = [
  { label: "Campaign", width: "35%", kind: "text" },
  { label: "Status", width: "16%", kind: "status" },
  { label: "Calling hours", width: "27%", kind: "text" },
  { label: "Updated", width: "22%", kind: "date" },
];

export const AGENT_COLUMNS: TableColumnConfig[] = [
  { label: "Name", width: "20%", kind: "subtitle" },
  { label: "LLM model", width: "19%", kind: "text" },
  { label: "Speech-to-text model", width: "22%", kind: "text" },
  { label: "Voice", width: "14%", kind: "text" },
  { label: "Updated", width: "19%", kind: "date" },
  { label: "", width: "6%", kind: "actions" },
];

export const REPRESENTATIVE_COLUMNS: TableColumnConfig[] = [
  { label: "Name", width: "27%", kind: "text" },
  { label: "Phone", width: "22%", kind: "text" },
  { label: "Status", width: "17%", kind: "status" },
  { label: "Updated", width: "26%", kind: "date" },
  { label: "", width: "8%", kind: "actions" },
];

export const POOL_COLUMNS: TableColumnConfig[] = [
  { label: "Pool", width: "30%", kind: "text" },
  { label: "Status", width: "20%", kind: "status" },
  { label: "Numbers", width: "20%", kind: "number" },
  { label: "Created", width: "30%", kind: "date" },
];

export const TEMPLATE_COLUMNS: TableColumnConfig[] = [
  { label: "Name", width: "34%", kind: "text" },
  { label: "Template ID", width: "33%", kind: "text" },
  { label: "Updated", width: "33%", kind: "date" },
];

export const CALL_COLUMNS: TableColumnConfig[] = [
  { label: "Lead", width: "16%", kind: "subtitle" },
  { label: "Phone", width: "13%", kind: "text" },
  { label: "Status", width: "10%", kind: "status" },
  { label: "Transfer", width: "14%", kind: "text" },
  { label: "Initiation time", width: "16%", kind: "date" },
  { label: "Talk time", width: "10%", kind: "number" },
  { label: "Plivo cost", width: "11%", kind: "number" },
  { label: "AI cost", width: "11%", kind: "number" },
  { label: "Total cost", width: "13%", kind: "number" },
];

export const COST_CALL_COLUMNS: TableColumnConfig[] = [
  { label: "Lead", width: "20%", kind: "text" },
  { label: "Mobile number", width: "18%", kind: "text" },
  { label: "When", width: "20%", kind: "date" },
  { label: "Duration", width: "12%", kind: "number" },
  { label: "AI cost", width: "10%", kind: "number" },
  { label: "Plivo cost", width: "10%", kind: "number" },
  { label: "Total cost", width: "10%", kind: "number" },
];

export const CLASSIFICATION_COLUMNS: TableColumnConfig[] = [
  { label: "Name", width: "20%", kind: "text" },
  { label: "Description", width: "36%", kind: "content" },
  { label: "Calls", width: "10%", kind: "number" },
  { label: "Updated", width: "14%", kind: "date" },
  { label: "", width: "20%", kind: "actions" },
];
