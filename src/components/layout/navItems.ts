import { Bot, LayoutDashboard, Megaphone, Phone, MessageSquare } from "lucide-react";

export type NavIconName = "dashboard" | "agent" | "campaigns" | "phone" | "templates";
export type NavSectionId = "dashboard" | "calling-agent" | "campaigns" | "number-pool" | "templates";

export const navItems = [
  { id: "dashboard", href: "/?tab=dashboard", basePath: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "calling-agent", href: "/?tab=calling-agent", basePath: "/calling-agent", label: "Calling Agent", icon: "agent" },
  { id: "campaigns", href: "/?tab=campaigns", basePath: "/campaigns", label: "Campaigns", icon: "campaigns" },
  { id: "number-pool", href: "/?tab=number-pool", basePath: "/number-pool", label: "Number Pool", icon: "phone" },
  { id: "templates", href: "/?tab=templates", basePath: "/templates", label: "Templates", icon: "templates" },
] satisfies Array<{ id: NavSectionId; href: string; basePath: string; label: string; icon: NavIconName }>;

export const navIcons = {
  dashboard: LayoutDashboard,
  agent: Bot,
  campaigns: Megaphone,
  phone: Phone,
  templates: MessageSquare,
};
