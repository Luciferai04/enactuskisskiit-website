
import React from 'react';
import { Task, Project, User, TaskStatus, ProjectLifecycle } from '../types';

interface DashboardProps {
  user: User;
  tasks: Task[];
  projects: Project[];
  onOpenLab?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, tasks, projects, onOpenLab }) => {
  const userTasks = user.role === 'ADMIN' ? tasks : tasks.filter(t => t.assigneeIds.includes(user.id));
  const completedTasks = userTasks.filter(t => t.status === TaskStatus.COMPLETED);
  const pendingTasks = userTasks.filter(t => t.status !== TaskStatus.COMPLETED);
  
  const totalImpact = userTasks.reduce((acc, t) => acc + (t.status === TaskStatus.COMPLETED ? t.impactScore : 0), 0);
  const averageClarity = userTasks.length > 0 
    ? Math.round(userTasks.reduce((acc, t) => acc + (t.clarityScore || 85), 0) / userTasks.length) 
    : 0;

  const nexusStats = [
    { label: 'Impact Points', value: totalImpact, icon: 'fa-seedling', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Task Clarity', value: userTasks.length > 0 ? `${averageClarity}%` : '---', icon: 'fa-wand-magic-sparkles', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Active Missions', value: pendingTasks.length, icon: 'fa-rocket', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Chapter Pulse', value: projects.length > 0 ? 'Optimal' : 'Standby', icon: 'fa-bolt', color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const getLifecycleStyles = (lifecycle: ProjectLifecycle) => {
    switch (lifecycle) {
      case 'ARCHIVED': return 'bg-gray-100 text-gray-500 border-gray-200';
      case 'LEGACY': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-green-50 text-green-600 border-green-100';
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto font-['Inter'] animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className="w-8 h-px bg-yellow-400"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Executive Briefing</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-[#111111]">Nexus Command</h1>
          <p className="text-gray-500 mt-3 text-lg font-medium">Welcome back, {user.name}. {projects.length > 0 ? 'Your contribution is scaling.' : 'The system is ready for mission initialization.'}</p>
        </div>
        <div className="flex items-center space-x-4 bg-white border enactus-border px-6 py-3 rounded-2xl shadow-sm">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#111111]">KISS-KIIT HUB: BHUBANESWAR</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {nexusStats.map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[40px] border-2 border-transparent hover:border-yellow-200 shadow-sm transition-all group cursor-default">
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-sm`}>
              <i className={`fa-solid ${stat.icon} text-2xl`}></i>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-4xl font-black mt-2 text-[#111111]">{stat.value}</p>
          </div>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-[70px] border-2 border-dashed border-gray-100 p-20 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-200 mb-4">
              <i className="fa-solid fa-folder-open text-5xl"></i>
           </div>
           <div className="space-y-4 max-w-lg">
             <h2 className="text-3xl font-black tracking-tight text-[#111111]">No Missions In Orbit</h2>
             <p className="text-gray-400 text-lg font-medium leading-relaxed">The society project pipeline is currently clear. Leadership must initialize new initiatives in the <span className="text-[#111111] font-bold">Control Board</span> to begin impact tracking.</p>
           </div>
           {user.role === 'ADMIN' && (
             <button className="px-12 py-5 bg-[#111111] text-white rounded-[30px] font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-2xl">
               Initialize First Initiative
             </button>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight">Active Initiatives</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {projects.map(project => (
                <div key={project.id} className="bg-white p-10 rounded-[50px] border-2 enactus-border hover:border-yellow-200 hover:shadow-xl transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-12 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none text-green-500 rotate-12">
                     <i className="fa-solid fa-leaf text-[200px]"></i>
                  </div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10 relative z-10">
                    <div className="max-w-md">
                      <div className="flex items-center space-x-3 mb-3">
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                           project.healthStatus === 'STALLED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
                         }`}>
                           {project.healthStatus || 'Healthy'}
                         </span>
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getLifecycleStyles(project.lifecycle || 'ACTIVE')}`}>
                           {project.lifecycle || 'ACTIVE'}
                         </span>
                      </div>
                      <h4 className="font-black text-3xl text-[#111111] tracking-tighter mb-4">{project.name}</h4>
                      <p className="text-gray-500 font-medium leading-relaxed">{project.description}</p>
                    </div>
                    <div className="flex -space-x-3 self-end md:self-start">
                      {project.memberIds.slice(0, 3).map((id, i) => (
                        <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`} className="w-12 h-12 rounded-full border-4 border-white bg-gray-50" alt="member" />
                      ))}
                    </div>
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex mb-4 items-end justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Mission Progress</span>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-[#111111]">
                          {project.progress}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-4 rounded-full bg-gray-100 shadow-inner">
                      <div 
                        style={{ width: `${project.progress}%` }} 
                        className="h-full bg-yellow-400 transition-all duration-1000 ease-out rounded-full"
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight">Intelligence</h3>
            </div>
            
            <div className="bg-[#111111] rounded-[50px] p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-wand-magic-sparkles text-[150px]"></i>
              </div>
              
              <div className="relative z-10 space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-yellow-400">
                    <i className="fa-solid fa-sparkles text-xs"></i>
                    <span className="text-[10px] font-black uppercase tracking-widest">Nexus Advice</span>
                  </div>
                  <p className="text-lg font-bold leading-relaxed">
                    {userTasks.length > 0 ? "Focus on high-clarity missions. Your velocity is optimal." : "Initialize your first mission reflex to see AI advice."}
                  </p>
                </div>
                
                <div className="h-px bg-white/10"></div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-green-400">
                    <i className="fa-solid fa-chart-line text-xs"></i>
                    <span className="text-[10px] font-black uppercase tracking-widest">Impact Pulse</span>
                  </div>
                  <p className="text-sm text-gray-400 font-medium leading-relaxed">
                    Society-wide entrepreneurial action is currently scaling.
                  </p>
                </div>

                <button 
                  onClick={onOpenLab}
                  className="w-full py-5 bg-white text-[#111111] rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-yellow-400 shadow-xl"
                >
                  Open Strategy Lab
                </button>
              </div>
            </div>

            <div className="bg-white border-2 enactus-border rounded-[50px] p-10 space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-[#111111]">Chapter Announcements</h4>
              <div className="space-y-6">
                <div className="border-l-4 border-yellow-400 pl-6 py-1">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-tighter">NEW HUB OPEN</p>
                  <p className="text-sm font-bold text-[#111111] mt-1">Enactus Flow OS v2.5 is now live for KISS-KIIT.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
