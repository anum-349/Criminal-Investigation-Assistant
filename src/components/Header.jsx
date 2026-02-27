import { Search, Bell, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/Button";
import { NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { label: "File", items: ["New Case", "Import Data", "Export", "Print"] },
  { label: "Cases", items: ["All Cases", "Active", "Closed", "Archived"] },
  { label: "Reports", items: ["Generate Report", "Templates", "History"] },
  { label: "Analytics", items: ["Dashboard", "Trends", "Predictions"] },
  { label: "Settings", items: ["Profile", "Preferences", "Security", "Help"] },
];

const NotificationsDropdown = ({ notifications, setNotifications }) => {
  return (
    <div className="fixed top-14 right-0 
                    w-80 
                    h-[calc(100vh-56px)] 
                    bg-white 
                    shadow-xl 
                    z-50 
                    border-l border-gray-200
                    animate-slide-in">

      <div className="flex justify-between items-center 
                    px-4 py-2 border-b">
        <span className="font-semibold text-sm">
          Notifications
        </span>
        <button
          onClick={() =>
            setNotifications(
              notifications.map(n => ({ ...n, read: true }))
            )
          }
          className="text-xs text-slate-blue hover:underline"
        >
          Mark all as read
        </button>
      </div>


      <div className={`max-h-60 overflow-y-auto transition-all hover:translate-x-1 cursor-pointer`}>
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() =>
              setNotifications(
                notifications.map(item =>
                  item.id === n.id
                    ? { ...item, read: true }
                    : item
                )
              )
            }
            className={`px-4 py-3 text-sm cursor-pointer 
            ${n.read ? "bg-white" : "bg-cool-silver  rounded-md bg-accent border-l-4 border-l-deep-ocean-900"}
            hover:bg-gray-200 my-2`}
          >
            {n.text}
          </div>
        ))}
      </div>

    </div>
  )
}

const Header = () => {
  const [openMenu, setOpenMenu] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef();

  const [notifications, setNotifications] = useState([
    { id: 1, text: "New case assigned", read: false },
    { id: 2, text: "Report generated successfully", read: false },
    { id: 3, text: "Evidence uploaded", read: true },
  ]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="fixed top-0 left-0 w-full h-14 z-40 bg-deep-ocean">        {/* Navigation bar */}
        <nav className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-1" ref={menuRef}>
            {navItems.map((item) => (
              <div key={item.label} className="relative">
                <button className={`text-sm font-medium hover:bg-gray-400 ${openMenu === item.label ? "bg-cool-silver text-gray-700" : "text-white"} rounded-md px-3 py-2 flex items-center`} onClick={() =>
                  setOpenMenu(openMenu === item.label ? null : item.label)
                }>
                  {item.label}
                  {openMenu === item.label ? <ChevronDown className="ml-1 h-3 w-3 transform rotate-180" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                </button>

                {openMenu === item.label && (
                  <div className="absolute left-0 w-48 text-nowrap bg-cool-silver rounded-md border-deep-ocean border shadow-lg z-20">
                    {item.items.map((subItem) => (
                      <NavLink
                        key={subItem}
                        to={`/${subItem.toLowerCase().replace(/\s+/g, "-")}`}
                        onClick={() => setOpenMenu(null)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:rounded-md"
                      >
                        {subItem}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                type="text"
                placeholder="search case, evidence, suspect"
                className="pl-9 w-md h-9 border-white text-white px-4 py-2 border focus:outline-none transition-colors placeholder:text-gray-300 focus:border-white rounded-full"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`${showNotifications ? "bg-slate-blue" : ""} hover:bg-slate-blue relative border-0 p-2 rounded-full transition ease-in-out`}
            >
              <Bell className="h-7 w-7 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 
                       bg-red-600 text-white 
                       text-xs w-5 h-5 
                       flex items-center justify-center 
                       rounded-full">
                  {unreadCount} </span>
              )}
            </Button>
            <img src="/profile.jpg" className="rounded-full w-10 h-10 object-cover" />
          </div>
        </nav>
      </header >
      {showNotifications && (
        <NotificationsDropdown notifications={notifications} setNotifications={setNotifications} />
      )}
    </>
  );
};

export default Header;
