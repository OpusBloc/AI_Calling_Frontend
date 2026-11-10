import SidebarToggle, { ThemeToggle } from "@/components/SidebarToggle";
import { CurrentPageTitle } from "@/components/NavLink";

export default function Topbar() {
  return (
    <header className="ob-topbar">
      <div className="ob-topbar-start">
        <SidebarToggle mobileOnly />
        <CurrentPageTitle />
      </div>
      <ThemeToggle />
    </header>
  );
}
