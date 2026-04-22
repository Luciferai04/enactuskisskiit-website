
import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskStatus, Project, User, Priority, NexusInsight, ProgressEntry, Attachment } from '../types';
import { nexusOrchestrator } from '../services/geminiService';

interface AdminBoardProps {
  currentUser: User;
  tasks: Task[];
  projects: Project[];
  users: User[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onAddProject: (project: Project) => void;
  onTerminateMember: (userId: string) => void;
  onUpdateUser?: (userId: string, updates: Partial<User>) => void;
  initialTab?: 'COMMAND' | 'LAB' | 'PEOPLE' | 'HANDOVER';
}

const PRESET_ROLES = [
  'Project Lead',
  'Technical Architect',
  'Marketing Head',
  'Operations Manager',
  'Research Analyst',
  'Content Lead',
  'Community Liaison',
  'Finance Coordinator'
];

const AdminBoard: React.FC<AdminBoardProps> = ({ 
  currentUser, tasks, projects, users, onUpdateTask, onAddTask, onDeleteTask, onUpdateProject, onAddProject, onTerminateMember, onUpdateUser, initialTab = 'COMMAND'
}) => {
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'LAB' | 'PEOPLE' | 'HANDOVER'>(initialTab);
  const [viewMode, setViewMode] = useState<'GRID' | 'KANBAN'>('KANBAN');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [activeAudit, setActiveAudit] = useState<{task: Task, insight?: NexusInsight} | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isApplyingPatch, setIsApplyingPatch] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempPosition, setTempPosition] = useState('');

  const [newTaskData, setNewTaskData] = useState({ 
    title: '', description: '', projectId: '', assigneeIds: [] as string[], priority: Priority.MEDIUM,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dependencyIds: [] as string[]
  });

  const [newProjectData, setNewProjectData] = useState({
    name: '', description: '', deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], address: ''
  });

  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  
  const registeredPersonnel = useMemo(() => users.filter(u => u.isRegistered), [users]);
  const personnelWithWorkload = useMemo(() => {
    return registeredPersonnel.map(u => {
      const myTasks = tasks.filter(t => t.assigneeIds.includes(u.id));
      const activeTasks = myTasks.filter(t => t.status !== TaskStatus.COMPLETED);
      return { 
        ...u, 
        workloadPercentage: Math.min(100, (activeTasks.length / 5) * 100), 
        activeTasksCount: activeTasks.length,
        assignedTasks: myTasks
      };
    });
  }, [registeredPersonnel, tasks]);

  const runTaskAudit = async (task: Task) => {
    setIsAuditing(true);
    setActiveAudit({ task });
    setIsAuditModalOpen(true);
    try {
      const insights = await nexusOrchestrator('ANALYZE_TASK', task);
      if (insights && insights.length > 0) {
        setActiveAudit({ task, insight: insights[0] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleApplyPatch = async () => {
    if (!activeAudit?.insight?.details?.suggestion || !activeAudit.task) return;
    setIsApplyingPatch(true);
    try {
      onUpdateTask(activeAudit.task.id, { 
        description: activeAudit.insight.details.suggestion,
        clarityScore: activeAudit.insight.score
      });
      setTimeout(() => {
        setIsAuditModalOpen(false);
        setActiveAudit(null);
        setIsApplyingPatch(false);
      }, 1200);
    } catch (e) {
      setIsApplyingPatch(false);
    }
  };

  const handleCreateProject = () => {
    const project: Project = {
      id: `p-${Date.now()}`,
      name: newProjectData.name,
      description: newProjectData.description,
      leadId: currentUser.id,
      memberIds: [currentUser.id],
      createdAt: Date.now(),
      deadline: newProjectData.deadline,
      progress: 0,
      healthStatus: 'HEALTHY',
      lifecycle: 'ACTIVE',
      location: { lat: 0, lng: 0, address: newProjectData.address },
      reflections: [],
      milestones: []
    };
    onAddProject(project);
    setIsProjectModalOpen(false);
    setNewProjectData({ name: '', description: '', deadline: '', address: '' });
  };

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    onUpdateTask(taskId, { status: newStatus });
  };

  const KanbanColumn = ({ status, label, icon }: { status: TaskStatus, label: string, icon: string }) => {
    const columnTasks = tasks.filter(t => t.status === status);
    
    return (
      <div className="flex-1 min-w-[340px] bg-gray-50/50 backdrop-blur-xl p-6 rounded-[40px] border border-gray-100 flex flex-col space-y-6 max-h-[850px] shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-4 pb-2">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm text-gray-400">
               <i className={`fa-solid ${icon} text-[12px]`}></i>
             </div>
             <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">{label}</h4>
          </div>
          <span className="bg-white border border-gray-100 px-3 py-1 rounded-full text-[10px] font-black text-gray-400 shadow-sm">{columnTasks.length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-5 px-1 pb-4 scrollbar-hide">
          {columnTasks.map(task => {
            const projectName = projects.find(p => p.id === task.projectId)?.name || 'Unknown Project';
            return (
              <div key={task.id} className="bg-white p-7 rounded-[35px] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group relative animate-in zoom-in duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col gap-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit ${task.priority === Priority.HIGH ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                      {task.priority}
                    </span>
                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest ml-1">{projectName}</span>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => runTaskAudit(task)} className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:scale-110 shadow-sm">
                      <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                    </button>
                    <button onClick={() => onDeleteTask(task.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:scale-110 shadow-sm">
                      <i className="fa-solid fa-trash text-[10px]"></i>
                    </button>
                  </div>
                </div>
                
                <h5 className="font-black text-lg text-gray-900 mb-3 leading-tight tracking-tight group-hover:text-yellow-600 transition-colors cursor-pointer" onClick={() => runTaskAudit(task)}>{task.title}</h5>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-300">
                    <span>Impact Velocity</span>
                    <span className="text-gray-900">{task.completionPercentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-yellow-400 transition-all duration-1000" 
                      style={{ width: `${task.completionPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-gray-50">
                   <div className="flex items-center -space-x-2">
                     {task.assigneeIds.slice(0, 3).map((id) => (
                       <img key={id} src={users.find(u => u.id === id)?.avatar} title={users.find(u => u.id === id)?.name} className="w-7 h-7 rounded-full shadow-sm border-2 border-white bg-white" alt="avatar" />
                     ))}
                   </div>
                   
                   <div className="flex gap-1">
                      {status !== TaskStatus.TODO && (
                        <button onClick={() => moveTask(task.id, TaskStatus.TODO)} className="w-6 h-6 rounded-lg bg-gray-50 text-gray-300 hover:text-gray-900 flex items-center justify-center transition-colors">
                          <i className="fa-solid fa-backward-step text-[8px]"></i>
                        </button>
                      )}
                      {status === TaskStatus.TODO && (
                        <button onClick={() => moveTask(task.id, TaskStatus.IN_PROGRESS)} className="w-6 h-6 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-400 hover:text-black flex items-center justify-center transition-all">
                          <i className="fa-solid fa-play text-[8px]"></i>
                        </button>
                      )}
                      {status === TaskStatus.IN_PROGRESS && (
                        <button onClick={() => moveTask(task.id, TaskStatus.REVIEW)} className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-500 hover:text-white flex items-center justify-center transition-all">
                          <i className="fa-solid fa-eye text-[8px]"></i>
                        </button>
                      )}
                      {status === TaskStatus.REVIEW && (
                        <button onClick={() => moveTask(task.id, TaskStatus.COMPLETED)} className="w-6 h-6 rounded-lg bg-green-50 text-green-600 hover:bg-green-500 hover:text-white flex items-center justify-center transition-all">
                          <i className="fa-solid fa-check text-[8px]"></i>
                        </button>
                      )}
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleToggleAssignee = (userId: string) => {
    setNewTaskData(prev => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(userId) 
        ? prev.assigneeIds.filter(id => id !== userId)
        : [...prev.assigneeIds, userId]
    }));
  };

  const handleStartEditPosition = (user: User) => {
    setEditingUserId(user.id);
    setTempPosition(user.position || '');
  };

  const handleSavePosition = () => {
    if (editingUserId && onUpdateUser) {
      onUpdateUser(editingUserId, { position: tempPosition });
      setEditingUserId(null);
    }
  };

  const handleQuickDispatch = (userId: string) => {
    setNewTaskData(prev => ({ ...prev, assigneeIds: [userId] }));
    setIsTaskModalOpen(true);
  };

  return (
    <div className="space-y-16 max-w-[1600px] mx-auto font-['Inter'] animate-in fade-in duration-700 pb-32">
      <div className="bg-white p-12 lg:p-16 rounded-[70px] border-2 border-gray-100 shadow-3xl flex flex-col lg:flex-row justify-between items-center gap-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="space-y-4 relative z-10 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start space-x-4 text-yellow-600 font-black text-[12px] uppercase tracking-[0.5em]">
            <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_#F2C94C]"></div>
            <span>Strategic Command Protocol</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-gray-900 leading-[0.85]">Nexus Board.</h1>
          <p className="text-gray-400 text-xl font-medium max-w-xl mx-auto lg:mx-0">Administrative interface for chapter mission orchestration and tactical oversight.</p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-8 relative z-10">
          <div className="bg-gray-100/50 p-2 rounded-[35px] flex border-2 border-gray-100 shadow-inner">
            {['COMMAND', 'PEOPLE', 'HANDOVER'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)} 
                className={`px-10 py-4 rounded-[28px] text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === tab ? 'bg-black text-white shadow-2xl scale-105' : 'text-gray-400 hover:text-gray-900'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-4">
            <button onClick={() => setIsProjectModalOpen(true)} className="px-10 py-5 bg-white border-2 border-black text-black rounded-[30px] text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-lg active:scale-95">New Initiative +</button>
            <button 
              onClick={() => setIsTaskModalOpen(true)} 
              disabled={projects.length === 0} 
              className="px-10 py-5 bg-yellow-400 text-black rounded-[30px] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-yellow-200 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
            >
              Assign Mission +
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'COMMAND' && (
        <div className="animate-in slide-in-from-bottom-12 duration-700 space-y-12">
          {projects.length > 0 && (
            <div className="flex justify-center mb-4">
               <div className="bg-white border-2 border-gray-100 p-1.5 rounded-[25px] flex shadow-sm">
                  <button onClick={() => setViewMode('GRID')} className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'GRID' ? 'bg-gray-900 text-white' : 'text-gray-400'}`}>Initiatives</button>
                  <button onClick={() => setViewMode('KANBAN')} className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'KANBAN' ? 'bg-gray-900 text-white' : 'text-gray-400'}`}>The Board</button>
               </div>
            </div>
          )}

          {projects.length === 0 ? (
            <div className="py-40 text-center space-y-10 bg-white rounded-[80px] border-4 border-dashed border-gray-100 shadow-inner max-w-5xl mx-auto flex flex-col items-center justify-center p-20">
               <i className="fa-solid fa-folder-plus text-5xl text-gray-200"></i>
               <h2 className="text-4xl font-black tracking-tighter text-gray-900">System Standby.</h2>
               <button onClick={() => setIsProjectModalOpen(true)} className="px-16 py-7 bg-black text-white rounded-[40px] font-black uppercase tracking-[0.4em] text-xs shadow-3xl hover:bg-yellow-400 hover:text-black transition-all">Initialize Project</button>
            </div>
          ) : (
            viewMode === 'GRID' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                 {projects.map(p => (
                   <div key={p.id} className="bg-white p-12 rounded-[65px] border-2 border-gray-100 shadow-xl hover:shadow-3xl transition-all group relative overflow-hidden flex flex-col justify-between h-[450px]">
                      <div className="space-y-6 relative z-10">
                        <span className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border bg-green-50 text-green-600 border-green-100">{p.lifecycle}</span>
                        <h3 className="text-3xl font-black tracking-tighter text-gray-900 group-hover:text-yellow-600 transition-colors">{p.name}</h3>
                        <p className="text-gray-400 font-medium line-clamp-3 leading-relaxed">{p.description}</p>
                      </div>
                      <div className="space-y-8 relative z-10">
                         <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-yellow-400 rounded-full transition-all duration-1000" style={{ width: `${p.progress}%` }}></div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
            ) : (
              <div className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide px-4 min-h-[900px]">
                 <KanbanColumn status={TaskStatus.TODO} label="Mission Pipeline" icon="fa-list-ul" />
                 <KanbanColumn status={TaskStatus.IN_PROGRESS} label="Active Sortie" icon="fa-bolt" />
                 <KanbanColumn status={TaskStatus.REVIEW} label="Audit Matrix" icon="fa-microscope" />
                 <KanbanColumn status={TaskStatus.COMPLETED} label="Impact Captured" icon="fa-trophy" />
              </div>
            )
          )}
        </div>
      )}

      {isAuditModalOpen && activeAudit && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[250] flex items-center justify-center p-4 lg:p-8 animate-in zoom-in duration-300">
           <div className="bg-white w-full max-w-7xl rounded-[80px] p-10 lg:p-20 shadow-2xl relative max-h-[95vh] overflow-hidden flex flex-col">
              <button onClick={() => { setIsAuditModalOpen(false); setActiveAudit(null); }} className="absolute top-12 right-12 text-gray-300 hover:text-black z-20">
                <i className="fa-solid fa-xmark text-4xl"></i>
              </button>

              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-16">
                 <div className="text-center space-y-6 border-b border-gray-50 pb-12">
                    <div className="flex items-center justify-center gap-4 mb-4">
                       {activeAudit.task.assigneeIds.map(id => (
                          <img key={id} src={users.find(u => u.id === id)?.avatar} className="w-16 h-16 rounded-full border-4 border-white shadow-xl" alt="avatar" />
                       ))}
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter text-[#111111]">{activeAudit.task.title}</h2>
                    <p className="text-gray-400 text-xl font-medium max-w-2xl mx-auto italic">Operational Directive Oversight: {activeAudit.task.id}</p>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    <div className="lg:col-span-7 space-y-12">
                       <div className="flex items-center justify-between px-4">
                          <h4 className="text-[12px] font-black uppercase tracking-[0.6em] text-gray-400">Mission Intelligence Log</h4>
                          <span className="text-[10px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-4 py-1.5 rounded-full">Telemetry Active</span>
                       </div>
                       
                       <div className="space-y-8">
                          {activeAudit.task.progressEntries.length > 0 ? [...activeAudit.task.progressEntries].reverse().map((entry, i) => (
                             <div key={entry.id} className="relative pl-12 group animate-in slide-in-from-left duration-500">
                                <div className="absolute left-0 top-2 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-[10px] font-black z-10 border-4 border-white shadow-md">
                                   {activeAudit.task.progressEntries.length - i}
                                </div>
                                <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 hover:border-yellow-200 transition-all shadow-sm">
                                   <div className="flex justify-between items-center mb-4">
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(entry.timestamp).toLocaleString()}</p>
                                   </div>
                                   <p className="text-lg font-medium text-gray-800 leading-relaxed italic">"{entry.text}"</p>
                                </div>
                             </div>
                          )) : (
                             <div className="py-20 text-center bg-gray-50 rounded-[50px] border-2 border-dashed border-gray-100">
                                <i className="fa-solid fa-radar text-4xl text-gray-200 mb-4"></i>
                                <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No active reflex entries recorded.</p>
                             </div>
                          )}
                       </div>
                       
                       {/* ADMIN VIEW: Assets Section */}
                       <div className="pt-8 space-y-8">
                          <div className="flex items-center justify-between px-4">
                             <h4 className="text-[12px] font-black uppercase tracking-[0.6em] text-gray-400">Asset Registry</h4>
                             <i className="fa-solid fa-box-archive text-gray-300"></i>
                          </div>
                          
                          {activeAudit.task.attachments && activeAudit.task.attachments.length > 0 ? (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {activeAudit.task.attachments.map(att => (
                                  <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-6 bg-white p-6 rounded-[35px] border-2 border-gray-50 hover:border-yellow-200 transition-all shadow-sm group">
                                     <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-xl text-gray-400 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-all">
                                        <i className={`fa-solid ${att.type.startsWith('image/') ? 'fa-image' : 'fa-file-lines'}`}></i>
                                     </div>
                                     <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">{att.name}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{att.size} • Archived {new Date(att.uploadedAt).toLocaleDateString()}</p>
                                     </div>
                                     <i className="fa-solid fa-download text-gray-300 group-hover:text-black"></i>
                                  </a>
                                ))}
                             </div>
                          ) : (
                             <div className="py-12 text-center bg-gray-50 rounded-[50px] border-2 border-dashed border-gray-100">
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No operational assets archived for this mission.</p>
                             </div>
                          )}
                       </div>
                    </div>

                    <div className="lg:col-span-5 space-y-12">
                       <div className="flex items-center justify-between px-4">
                          <h4 className="text-[12px] font-black uppercase tracking-[0.6em] text-gray-400">Nexus Strategic Audit</h4>
                          <button onClick={() => runTaskAudit(activeAudit.task)} className="text-[10px] font-black text-yellow-600 uppercase tracking-widest hover:underline">Recalibrate Audit</button>
                       </div>
                       
                       <div className="bg-[#111111] text-white rounded-[50px] p-10 lg:p-12 shadow-3xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 group-hover:scale-110 transition-transform">
                             <i className="fa-solid fa-brain text-[200px]"></i>
                          </div>
                          
                          {isAuditing ? (
                             <div className="py-16 text-center space-y-6">
                                <i className="fa-solid fa-circle-notch animate-spin text-4xl text-yellow-400"></i>
                                <div className="space-y-2">
                                  <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-500">Synthesizing SMART Telemetry...</p>
                                </div>
                             </div>
                          ) : activeAudit.insight?.details ? (
                             <div className="space-y-12 relative z-10">
                                <div className="flex items-center justify-between border-b border-white/10 pb-8">
                                   <div className="space-y-1">
                                      <p className="text-[10px] font-black text-yellow-400/50 uppercase tracking-[0.4em]">Clarity Protocol</p>
                                      <div className="text-6xl font-black text-white tracking-tighter">{activeAudit.insight.score}%</div>
                                   </div>
                                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-lg ${
                                     (activeAudit.insight.score || 0) > 80 ? 'bg-green-500 text-white' : 'bg-yellow-400 text-black'
                                   }`}>
                                      <i className="fa-solid fa-wand-magic-sparkles"></i>
                                   </div>
                                </div>

                                <div className="space-y-6">
                                   <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">SMART Alignment Checklist</h5>
                                   <div className="grid grid-cols-1 gap-4">
                                      {Object.entries(activeAudit.insight.details.smart || {}).map(([key, value]) => (
                                        <div key={key} className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group/item">
                                           <div className="flex items-center gap-3 mb-2">
                                              <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest w-24">{key}</span>
                                              <div className="flex-1 h-px bg-white/10 group-hover/item:bg-white/20 transition-all"></div>
                                           </div>
                                           <p className="text-xs font-medium text-gray-400 leading-relaxed italic">"{value}"</p>
                                        </div>
                                      ))}
                                   </div>
                                </div>

                                <div className="space-y-6 bg-white/5 p-8 rounded-[40px] border border-white/5">
                                   <h5 className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.4em]">Refinement Interrogations</h5>
                                   <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Ask these questions to clarify mission objectives:</p>
                                   <div className="space-y-4">
                                      {(activeAudit.insight.details.questions || []).map((q, i) => (
                                        <div key={i} className="flex gap-4 group/q cursor-default">
                                           <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-600 group-hover/q:text-yellow-400 transition-colors shrink-0">{i+1}</div>
                                           <p className="text-sm font-medium text-gray-300 leading-snug">{q}</p>
                                        </div>
                                      ))}
                                   </div>
                                </div>

                                <div className="space-y-6">
                                   <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">High-Resolution Directive Patch</h5>
                                   <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] relative overflow-hidden group/patch">
                                      <p className="text-sm font-bold text-gray-400 leading-relaxed mb-8 italic">"{activeAudit.insight.details.suggestion}"</p>
                                      <button 
                                        onClick={handleApplyPatch}
                                        disabled={isApplyingPatch}
                                        className="w-full py-6 bg-yellow-400 text-black rounded-[25px] font-black uppercase tracking-[0.4em] text-[10px] shadow-3xl shadow-yellow-400/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                      >
                                        {isApplyingPatch ? (
                                          <i className="fa-solid fa-circle-notch animate-spin"></i>
                                        ) : (
                                          <>
                                            <i className="fa-solid fa-check-double mr-3"></i>
                                            Authorize Directive Patch
                                          </>
                                        )}
                                      </button>
                                   </div>
                                </div>
                             </div>
                          ) : (
                             <div className="py-20 text-center">
                                <p className="text-gray-600 font-bold italic">Audit engine standby. Recruit AI to analyze SMART alignment.</p>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'PEOPLE' && (
        <div className="animate-in slide-in-from-bottom-12 duration-700">
           <div className="bg-white rounded-[80px] p-16 border-2 border-gray-100 shadow-3xl space-y-12">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-2">
                  <h2 className="text-4xl font-black tracking-tighter">Operative Registry</h2>
                  <p className="text-gray-400 text-sm font-medium">Assign roles and manage mission scopes for authorised personnel.</p>
                </div>
                <div className="bg-gray-100 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400">
                   {personnelWithWorkload.length} AUTHORIZED PERSONNEL
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {personnelWithWorkload.map(u => (
                  <div key={u.id} className="p-10 rounded-[55px] bg-gray-50 border-2 border-transparent hover:border-yellow-200 transition-all group flex flex-col justify-between min-h-[550px] shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform"><i className="fa-solid fa-user-astronaut text-8xl"></i></div>
                     
                     <div className="space-y-8 relative z-10">
                        <div className="flex items-center gap-6">
                           <div className="relative">
                              <img src={u.avatar} className="w-20 h-20 rounded-[30px] shadow-2xl border-4 border-white transition-transform group-hover:scale-110" alt={u.name} />
                              <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl border-4 border-white flex items-center justify-center shadow-lg ${u.role === 'ADMIN' ? 'bg-yellow-400 text-black' : 'bg-black text-white'}`}>
                                 <i className={`fa-solid ${u.role === 'ADMIN' ? 'fa-crown' : 'fa-bolt'} text-[10px]`}></i>
                              </div>
                           </div>
                           <div>
                              <p className="text-2xl font-black tracking-tight text-gray-900 leading-none">{u.name}</p>
                              <div className="mt-3 relative">
                                 {editingUserId === u.id ? (
                                   <div className="space-y-3">
                                      <select 
                                        autoFocus
                                        value={tempPosition}
                                        onChange={e => {
                                          setTempPosition(e.target.value);
                                          if (onUpdateUser) onUpdateUser(u.id, { position: e.target.value });
                                          setEditingUserId(null);
                                        }}
                                        onBlur={() => setEditingUserId(null)}
                                        className="w-full bg-white border-2 border-yellow-400 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none shadow-xl"
                                      >
                                        <option value="">Select Role</option>
                                        {PRESET_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                                        <option value="Custom">Other...</option>
                                      </select>
                                   </div>
                                 ) : (
                                   <div className="flex items-center gap-3 cursor-pointer group/role" onClick={() => handleStartEditPosition(u)}>
                                      <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest bg-yellow-400/10 px-3 py-1.5 rounded-xl border border-yellow-400/10 group-hover/role:bg-yellow-400 group-hover/role:text-black transition-all">
                                        {u.position || 'Mission Operative'}
                                      </p>
                                      <i className="fa-solid fa-pen-to-square text-[10px] text-gray-300 opacity-0 group-hover/role:opacity-100 transition-all"></i>
                                   </div>
                                 )}
                              </div>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex justify-between items-center px-1">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sortie Saturation</span>
                              <span className={`text-[11px] font-black ${u.workloadPercentage > 80 ? 'text-red-500' : 'text-gray-900'}`}>{Math.round(u.workloadPercentage)}% Load</span>
                           </div>
                           <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                              <div className={`h-full transition-all duration-700 ${u.workloadPercentage > 80 ? 'bg-red-500' : 'bg-yellow-400'}`} style={{ width: `${u.workloadPercentage}%` }}></div>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center justify-between px-1">
                              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Mission Matrix</h5>
                              <button 
                                onClick={() => handleQuickDispatch(u.id)}
                                className="w-7 h-7 bg-white text-gray-400 hover:bg-black hover:text-white rounded-lg flex items-center justify-center transition-all shadow-sm border border-gray-100"
                                title="Dispatch Mission"
                              >
                                <i className="fa-solid fa-plus text-[10px]"></i>
                              </button>
                           </div>
                           <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 scrollbar-hide">
                              {u.assignedTasks && u.assignedTasks.filter(t => t.status !== TaskStatus.COMPLETED).length > 0 ? (
                                u.assignedTasks.filter(t => t.status !== TaskStatus.COMPLETED).map(t => (
                                  <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group/task transition-all hover:border-yellow-100 hover:shadow-md">
                                     <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-800 truncate pr-4">{t.title}</p>
                                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-tighter mt-1">
                                          {projects.find(p => p.id === t.projectId)?.name || 'Generic'}
                                        </p>
                                     </div>
                                     <span className="text-[8px] font-black uppercase tracking-tighter text-gray-400 bg-gray-50 px-2 py-1 rounded-md whitespace-nowrap">{t.status}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="py-8 text-center bg-white/50 border border-dashed border-gray-200 rounded-[30px]">
                                   <p className="text-[9px] font-bold text-gray-300 italic">No active missions detected.</p>
                                </div>
                              )}
                           </div>
                        </div>
                     </div>

                     <div className="flex gap-4 pt-8 relative z-10 border-t border-gray-100 mt-4">
                        <button onClick={() => onTerminateMember(u.id)} className="flex-1 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95">Deauthorize</button>
                        <button className="flex-1 py-4 bg-black text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all active:scale-95 shadow-xl">Handover Pack</button>
                     </div>
                  </div>
                ))}
             </div>
           </div>
        </div>
      )}

      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-8 animate-in zoom-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[90px] p-12 lg:p-24 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide">
              <button onClick={() => setIsProjectModalOpen(false)} className="absolute top-16 right-16 text-gray-300 hover:text-black transition-all">
                <i className="fa-solid fa-xmark text-4xl"></i>
              </button>
              <div className="space-y-16">
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-yellow-50 text-yellow-500 rounded-[35px] flex items-center justify-center mx-auto text-3xl shadow-xl border border-yellow-100 mb-8">
                    <i className="fa-solid fa-seedling"></i>
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter text-gray-900">Initialize Initiative</h2>
                  <p className="text-gray-400 text-xl font-medium max-w-lg mx-auto leading-relaxed italic">Drafting mission architecture.</p>
                </div>
                
                <div className="space-y-12">
                   <div className="space-y-4">
                      <label className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] ml-6">Initiative Name</label>
                      <input 
                        type="text" 
                        placeholder="Project Zephyr" 
                        className="w-full bg-gray-50 border-4 border-transparent focus:border-yellow-400 rounded-[40px] px-12 py-8 text-2xl font-black outline-none transition-all shadow-inner"
                        value={newProjectData.name}
                        onChange={e => setNewProjectData({...newProjectData, name: e.target.value})}
                      />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] ml-6">Strategic Objective</label>
                      <textarea 
                        placeholder="Expanding social equity via..." 
                        className="w-full bg-gray-50 border-4 border-transparent focus:border-yellow-400 rounded-[50px] px-12 py-8 text-lg font-bold outline-none transition-all shadow-inner min-h-[200px]"
                        value={newProjectData.description}
                        onChange={e => setNewProjectData({...newProjectData, description: e.target.value})}
                      />
                   </div>
                </div>
                
                <button 
                  disabled={!newProjectData.name || !newProjectData.description}
                  onClick={handleCreateProject}
                  className="w-full py-12 bg-black text-white rounded-[50px] font-black uppercase tracking-[0.5em] text-sm shadow-3xl hover:bg-yellow-400 hover:text-black transition-all disabled:opacity-30 active:scale-95"
                >
                  Authorize Mission Initialization
                </button>
              </div>
           </div>
        </div>
      )}

      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-8 animate-in zoom-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[90px] p-12 lg:p-24 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide">
              <button onClick={() => setIsTaskModalOpen(false)} className="absolute top-16 right-16 text-gray-300 hover:text-black transition-all">
                <i className="fa-solid fa-xmark text-4xl"></i>
              </button>
              <div className="space-y-16">
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-black text-yellow-400 rounded-[35px] flex items-center justify-center mx-auto text-3xl shadow-2xl mb-8">
                    <i className="fa-solid fa-bolt"></i>
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter text-gray-900">Assign Mission</h2>
                  <p className="text-gray-400 text-xl font-medium max-w-lg mx-auto leading-relaxed italic">Dispatched via Nexus Command.</p>
                </div>
                
                <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <label className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] ml-6">Target Initiative</label>
                       <select 
                         className="w-full bg-gray-50 rounded-[35px] px-10 py-7 font-black outline-none border-4 border-transparent focus:border-yellow-400 shadow-inner appearance-none cursor-pointer" 
                         value={newTaskData.projectId} 
                         onChange={e => setNewTaskData({...newTaskData, projectId: e.target.value, dependencyIds: []})}
                        >
                          <option value="">Select Protocol</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] ml-6">Directive Expiry</label>
                       <input type="date" className="w-full bg-gray-50 rounded-[35px] px-10 py-7 font-black outline-none border-4 border-transparent focus:border-yellow-400 shadow-inner" value={newTaskData.deadline} onChange={e => setNewTaskData({...newTaskData, deadline: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] ml-6">Mission Directive</label>
                     <input 
                       type="text" 
                       placeholder="Community Engagement Phase A"
                       className="w-full bg-gray-50 border-4 border-transparent focus:border-yellow-400 rounded-[40px] px-12 py-8 text-xl font-black outline-none transition-all shadow-inner" 
                       value={newTaskData.title} 
                       onChange={e => setNewTaskData({...newTaskData, title: e.target.value})} 
                      />
                  </div>

                  <div className="space-y-4">
                       <label className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] ml-6">Operative Assignment</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 p-8 rounded-[45px] max-h-[300px] overflow-y-auto shadow-inner">
                          {personnelWithWorkload.map(u => (
                            <div 
                              key={u.id} 
                              onClick={() => handleToggleAssignee(u.id)}
                              className={`flex items-center space-x-4 cursor-pointer group p-4 rounded-[30px] border-2 transition-all ${newTaskData.assigneeIds.includes(u.id) ? 'bg-white border-yellow-400 shadow-lg' : 'bg-transparent border-transparent hover:border-gray-100 hover:bg-white/50'}`}
                            >
                              <img src={u.avatar} className="w-10 h-10 rounded-2xl shadow-sm" alt="avatar" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-black text-gray-900 truncate uppercase tracking-widest leading-none">{u.name}</p>
                                <p className={`text-[9px] font-bold mt-1 ${u.workloadPercentage > 80 ? 'text-red-500' : 'text-gray-400'}`}>{Math.round(u.workloadPercentage)}% Load</p>
                              </div>
                            </div>
                          ))}
                       </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <label className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] ml-6">Priority Level</label>
                       <select className="w-full bg-gray-50 rounded-[35px] px-10 py-7 font-black outline-none border-4 border-transparent focus:border-yellow-400 shadow-inner appearance-none cursor-pointer" value={newTaskData.priority} onChange={e => setNewTaskData({...newTaskData, priority: e.target.value as Priority})}>
                          {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                    </div>
                  </div>
                </div>
                
                <button 
                  disabled={!newTaskData.title || !newTaskData.projectId || newTaskData.assigneeIds.length === 0}
                  onClick={() => {
                    onAddTask({ 
                      id: `t-${Date.now()}`, 
                      projectId: newTaskData.projectId, 
                      title: newTaskData.title, 
                      description: newTaskData.description, 
                      assigneeIds: newTaskData.assigneeIds, 
                      status: TaskStatus.TODO, 
                      priority: newTaskData.priority, 
                      deadline: newTaskData.deadline, 
                      completionPercentage: 0, 
                      subtasks: [], 
                      attachments: [], 
                      progressEntries: [], 
                      impactScore: 25, 
                      dependencies: [] 
                    });
                    setIsTaskModalOpen(false);
                    setNewTaskData({ title: '', description: '', projectId: '', assigneeIds: [], priority: Priority.MEDIUM, deadline: '', dependencyIds: [] });
                  }}
                  className="w-full py-12 bg-black text-white rounded-[50px] font-black uppercase tracking-[0.5em] text-sm shadow-3xl hover:bg-yellow-400 hover:text-black transition-all disabled:opacity-30 active:scale-95"
                >
                  Authorize Mission Dispatch
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminBoard;
