"use client";
import { useState, useEffect } from 'react';
import {
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming you have a shadcn button
import { Separator } from '@/components/ui/separator';
import { useNavigate } from "react-router-dom";

interface NavigationItem {
  name: string;
  icon: LucideIcon;
  value: string; // This will control the Tabs component
  badge?: string;
}

interface ModernSidebarProps {
  className?: string;
  tabs: NavigationItem[];
  user: { id: string; name: string; email: string; role: string };
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export function MSidebar({ className = "", tabs, user, activeTab, setActiveTab, onLogout }: ModernSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
        setIsCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const handleItemClick = (tabValue: string) => {
    setActiveTab(tabValue);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-lg bg-indigo-200  border border-indigo-300 md:hidden hover:bg-indigo-300 transition-all"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="h-5 w-5 text-slate-700" /> : <Menu className="h-5 w-5 text-slate-700" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-indigo-100 border-r border-slate-200 z-40 transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "w-20" : "w-72"}
          md:relative md:translate-x-0 md:z-auto
          ${className}
        `}
      >
        {/* Header with Logo and Collapse Button */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-300">
          {!isCollapsed ? (
            <img src="/images/DashMediaLogo.png" alt="Dash Media Logo" className="h-12 w-auto " />
          ) : (
            <div className="w-full flex justify-center pr-1">
             <h2 className='text-indigo-400 font-semibold'>DM</h2>
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-2 rounded-md text-white hover:bg-indigo-200"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4 text-slate-700" /> : <ChevronLeft className="h-4 w-4 text-slate-700" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {tabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;

              return (
                <li key={item.name}>
                  <button
                    onClick={() => handleItemClick(item.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all group ${isActive ? "bg-indigo-200 text-indigo-700" : "text-indigo-700 hover:bg-indigo-200"}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-indigo-500 group-hover:text-indigo-300"}`} />
                    {!isCollapsed && <span className={`text-sm ${isActive ? "font-semibold" : "font-normal"}`}>{item.name}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {!isCollapsed && (
            <>
              <Separator className="my-4 bg-indigo-300" />
              <Button
                variant="ghost"
                className="w-full justify-start font-semibold text-indigo-500 hover:text-indigo-500"
                onClick={() => {
                  navigate(`/details/${user.id}`);
                  if (window.innerWidth < 768) setIsOpen(false); // Close mobile menu on click
                }}
              >
                Additional Details
              </Button>
            </>
          )}
        </nav>

        {/* Bottom section with User Profile and Logout */}
        <div className="mt-auto border-t border-indigo-300 p-3">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                <div className="w-9 h-9 bg-indigo-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                )}
            </div>
            <button
                onClick={onLogout}
                className={`w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-md text-left transition-all group text-red-600 hover:bg-red-50`}
                title={isCollapsed ? "Logout" : undefined}
            >
                <LogOut className="h-5 w-5 text-red-500 group-hover:text-red-600" />
                {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
            </button>
        </div>
      </div>
    </>
  );
}