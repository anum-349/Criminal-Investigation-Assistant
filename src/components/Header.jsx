import { Search, Bell, ChevronDown, Link } from "lucide-react";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/DropdownMenu";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/Avatar";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "File", items: ["New Case", "Import Data", "Export", "Print"] },
  { label: "Cases", items: ["All Cases", "Active", "Closed", "Archived"] },
  { label: "Reports", items: ["Generate Report", "Templates", "History"] },
  { label: "Analytics", items: ["Dashboard", "Trends", "Predictions"] },
  { label: "Settings", items: ["Profile", "Preferences", "Security", "Help"] },
];

const Header = () => {
  return (
    <header className="bg-[#1B3C53] text-header-foreground">
      {/* Navigation bar */}
      <nav className="bg-nav px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <div>
              <button className={"text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-400 flex items-center"}>
                {item.label}
                <ChevronDown className="ml-1 h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
            <Input
              placeholder="search case, evidence, suspect"
              className="pl-9 w-md h-9 border-white text-white placeholder:text-gray-300 focus:border-white"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
          >
            <Bell className="h-7 w-7 text-white" />
            <span className="absolute -top-1 right-0 w-2 h-2 bg-red-700 rounded-full" />
          </Button>
            <img src="/dist/profile.jpg" className="rounded-full w-10 h-10 object-cover" />
        </div>
      </nav>
    </header>
  );
};

export default Header;
