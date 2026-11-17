import { Bot, LayoutDashboard, Megaphone, Phone, MessageSquare } from "lucide-react";

export type NavIconName = "dashboard" | "agent" | "campaigns" | "phone" | "templates";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/calling-agent", label: "Calling Agent", icon: "agent" },
  { href: "/campaigns", label: "Campaigns", icon: "campaigns" },
  { href: "/number-pool", label: "Number Pool", icon: "phone" },
  { href: "/templates", label: "Templates", icon: "templates" },
] satisfies Array<{ href: string; label: string; icon: NavIconName }>;

export const navIcons = {
  dashboard: LayoutDashboard,
  agent: Bot,
  campaigns: Megaphone,
  phone: Phone,
  templates: MessageSquare,
};
