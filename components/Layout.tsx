
import React, { useState } from 'react';
import { User } from '../types';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeView, setActiveView }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavClick = (view: string) => {
    setActiveView(view);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-white font-['Inter'] relative overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 border-r enactus-border flex flex-col bg-white z-[70] transition-transform duration-300 transform
        lg:translate-x-0 lg:static lg:block
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 pb-4 flex justify-between items-center">
          <Logo size="sm" />
          <button 
            className="lg:hidden p-2 text-gray-400 hover:text-black"
            onClick={() => setIsSidebarOpen(false)}
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>
        
        <div className="px-8 flex items-center space-x-2 mt-1">
           <span className="h-1.5 w-1.5 rounded-full bg-yellow-400"></span>
           <p className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">KISS-KIIT Chapter</p>
        </div>

        <nav className="flex-1 px-6 space-y-1.5 mt-8 overflow-y-auto">
          <NavItem 
            icon="fa-compass" 
            label="Nexus Command" 
            active={activeView === 'dashboard'} 
            onClick={() => handleNavClick('dashboard')} 
          />
          {user.role === 'ADMIN' && (
            <>
              <NavItem 
                icon="fa-diagram-project" 
                label="Control Board" 
                active={activeView === 'admin'} 
                onClick={() => handleNavClick('admin')} 
              />
              <NavItem 
                icon="fa-wand-magic-sparkles" 
                label="AI Insights" 
                active={activeView === 'insights'} 
                onClick={() => handleNavClick('insights')} 
              />
            </>
          )}
          <NavItem 
            icon="fa-rocket" 
            label="My Missions" 
            active={activeView === 'tasks'} 
            onClick={() => handleNavClick('tasks')} 
          />
          <NavItem 
            icon="fa-user-astronaut" 
            label="My Profile" 
            active={activeView === 'profile'} 
            onClick={() => handleNavClick('profile')} 
          />
        </nav>

        <div className="p-6 border-t enactus-border bg-white">
          <div 
            onClick={() => handleNavClick('profile')}
            className="bg-gray-50 rounded-3xl p-4 flex items-center space-x-3 group cursor-pointer transition-all hover:bg-yellow-50 border border-transparent hover:border-yellow-200"
          >
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-2xl border-2 border-white shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-gray-900">{user.name}</p>
              <p className="text-[9px] font-black text-yellow-600 uppercase tracking-tighter">KIIT OPERATIVE</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onLogout(); }} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
              <i className="fa-solid fa-power-off text-xs"></i>
            </button>
          </div>
          <div className="mt-4 px-4 py-2 border border-gray-100 rounded-xl flex justify-between items-center text-[8px] font-black text-gray-300 uppercase tracking-widest">
            <span>Command Palette</span>
            <span className="bg-gray-100 px-1.5 py-0.5 rounded-md">⌘ K</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA] relative overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b enactus-border flex items-center justify-between px-6 lg:px-10 sticky top-0 z-50">
          <div className="flex items-center space-x-4 lg:space-x-8 flex-1">
            <button 
              className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-black"
              onClick={() => setIsSidebarOpen(true)}
            >
              <i className="fa-solid fa-bars-staggered text-xl"></i>
            </button>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">
              {activeView.replace('-', ' ')}
            </h2>
            <div className="relative w-full max-w-md hidden md:block">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
              <input 
                type="text" 
                placeholder="Search missions, assets, or logs..." 
                className="w-full bg-gray-50 border border-transparent focus:border-yellow-400 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4 lg:space-x-6">
            <div className="hidden sm:flex items-center space-x-2 text-xs font-bold text-gray-400">
              <i className="fa-solid fa-location-dot"></i>
              <span>KIIT Campus</span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-gray-100"></div>
            <button className="relative p-2 text-gray-400 hover:text-yellow-500 transition-colors">
              <i className="fa-regular fa-bell text-lg"></i>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-yellow-400 rounded-full ring-2 ring-white"></span>
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl text-xs font-bold transition-all duration-300 ${
      active 
        ? 'bg-black text-white shadow-xl shadow-gray-200' 
        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <i className={`fa-solid ${icon} w-5 text-sm`}></i>
    <span className="tracking-wide uppercase">{label}</span>
  </button>
);

export default Layout;
