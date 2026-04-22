
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, User, TaskStatus, Priority, Attachment, SubTask } from '../types';
import { nexusOrchestrator } from '../services/geminiService';

interface MyWorkProps {
  user: User;
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  justOnboarded?: boolean;
  onDismissWelcome?: () => void;
}

interface TaskInsights {
  summary: string;
  sentiment: string;
  skills: string[];
}

interface AiSyncProposal {
  taskId: string;
  logEntry: string;
  progressDelta: number;
  interpretation: string;
  skillsIdentified: string[];
  sentiment: string;
}

const MyWork: React.FC<MyWorkProps> = ({ user, tasks, onUpdateTask, justOnboarded, onDismissWelcome }) => {
  const [filter, setFilter] = useState<'ALL' | 'FOCUS'>('ALL');
  const [reflexInput, setReflexInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showReflexModal, setShowReflexModal] = useState(false);
  const [syncProposal, setSyncProposal] = useState<AiSyncProposal | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [taskInsights, setTaskInsights] = useState<Record<string, TaskInsights>>({});
  const [loadingInsights, setLoadingInsights] = useState<Record<string, boolean>>({});
  const [showWelcome, setShowWelcome] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (justOnboarded) {
      setShowWelcome(true);
      const timer = setTimeout(() => {
        setShowWelcome(false);
        onDismissWelcome?.();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [justOnboarded, onDismissWelcome]);

  const myActiveTasks = useMemo(() => 
    tasks.filter(t => t.assigneeIds.includes(user.id) && t.status !== TaskStatus.COMPLETED),
  [tasks, user.id]);

  const displayTasks = useMemo(() => {
    if (filter === 'FOCUS') {
      const now = new Date();
      const next48 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      return myActiveTasks.filter(t => 
        t.priority === Priority.HIGH || 
        t.status === TaskStatus.IN_PROGRESS ||
        (t.deadline && new Date(t.deadline) <= next48)
      );
    }
    return myActiveTasks;
  }, [filter, myActiveTasks]);

  const groupedTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const groups = {
      OVERDUE: [] as Task[],
      TODAY: [] as Task[],
      UPCOMING: [] as Task[],
    };

    displayTasks.forEach(task => {
      if (task.deadline < todayStr) {
        groups.OVERDUE.push(task);
      } else if (task.deadline === todayStr) {
        groups.TODAY.push(task);
      } else {
        groups.UPCOMING.push(task);
      }
    });

    return groups;
  }, [displayTasks]);

  const fetchTaskInsights = async (task: Task) => {
    if (taskInsights[task.id] || loadingInsights[task.id]) return;
    
    setLoadingInsights(prev => ({ ...prev, [task.id]: true }));
    try {
      const insights = await nexusOrchestrator('GET_TASK_DNA', task);
      setTaskInsights(prev => ({ ...prev, [task.id]: insights }));
    } catch (e) {
      console.error("Failed to fetch task DNA", e);
    } finally {
      setLoadingInsights(prev => ({ ...prev, [task.id]: false }));
    }
  };

  const toggleExpand = (task: Task) => {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(task.id);
      fetchTaskInsights(task);
    }
  };

  const handleFileUpload = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Use Promise.all to handle multiple files atomically and prevent race conditions with onUpdateTask
    const newAttachmentsPromises = (Array.from(files) as File[]).map((f: File) => {
      return new Promise<Attachment>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            id: `att-${Date.now()}-${f.name}-${Math.random().toString(36).substr(2, 5)}`,
            name: f.name,
            type: f.type,
            url: event.target?.result as string,
            size: `${(f.size / 1024).toFixed(1)} KB`,
            uploadedAt: Date.now()
          });
        };
        reader.readAsDataURL(f);
      });
    });

    const newAttachments = await Promise.all(newAttachmentsPromises);

    onUpdateTask(taskId, {
      attachments: [...(task.attachments || []), ...newAttachments]
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInitializeReflex = async () => {
    if (!reflexInput) return;
    setIsSyncing(true);
    setSyncProposal(null);
    try {
      const result = await nexusOrchestrator('DAILY_SUMMARY', { 
        input: reflexInput, 
        tasks: myActiveTasks.map(t => ({ id: t.id, title: t.title, progress: t.completionPercentage })) 
      });
      if (result) {
        setSyncProposal(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmProposal = () => {
    if (!syncProposal) return;
    const targetTask = tasks.find(t => t.id === syncProposal.taskId);
    if (targetTask) {
      onUpdateTask(syncProposal.taskId, { 
        completionPercentage: Math.min(100, (targetTask.completionPercentage || 0) + (syncProposal.progressDelta || 0)),
        progressEntries: [
            ...(targetTask.progressEntries || []),
            { id: `log-${Date.now()}`, text: syncProposal.logEntry, timestamp: Date.now(), userId: user.id }
        ]
      });
    }
    setShowReflexModal(false);
    setSyncProposal(null);
    setReflexInput('');
  };

  const handleManualSync = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !reflexInput) return;

    onUpdateTask(taskId, {
      progressEntries: [
        ...(task.progressEntries || []),
        { id: `log-${Date.now()}`, text: reflexInput, timestamp: Date.now(), userId: user.id }
      ]
    });
    setReflexInput('');
  };

  const isTaskBlocked = (task: Task) => {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some(depId => {
      const depTask = tasks.find(t => t.id === depId);
      return depTask && depTask.status !== TaskStatus.COMPLETED;
    });
  };

  const renderTaskCard = (task: Task) => {
    const blocked = isTaskBlocked(task);
    const isExpanded = expandedTaskId === task.id;
    const loading = loadingInsights[task.id];
    const prerequisites = (task.dependencies || []).map(depId => tasks.find(t => t.id === depId)).filter(Boolean) as Task[];
    const incompleteDependencies = prerequisites.filter(p => p.status !== TaskStatus.COMPLETED);

    return (
      <div key={task.id} className={`bg-white rounded-[50px] border-2 transition-all duration-500 shadow-xl overflow-hidden group relative ${
        isExpanded ? 'border-yellow-400 ring-8 ring-yellow-50 shadow-2xl' : 'border-gray-100 hover:border-yellow-200'
      } ${blocked ? 'border-red-100 bg-red-50/5' : ''}`}>
        
        {blocked && !isExpanded && (
          <div className="absolute top-8 right-8 z-10 animate-bounce">
            <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-xl border-4 border-white">
              <i className="fa-solid fa-lock text-sm"></i>
            </div>
          </div>
        )}

        <div className="p-10 cursor-pointer" onClick={() => toggleExpand(task)}>
          <div className="flex flex-col lg:flex-row justify-between items-start gap-10">
            <div className="flex-1 space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  task.priority === Priority.HIGH ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                }`}>
                  {task.priority} Priority
                </span>
                
                {prerequisites.length > 0 && (
                   <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                     blocked ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-100'
                   }`}>
                     <i className={`fa-solid ${blocked ? 'fa-link-slash' : 'fa-link'}`}></i>
                     <span>Chain: {prerequisites.length - incompleteDependencies.length}/{prerequisites.length} Verified</span>
                   </div>
                )}

                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  Due: {task.deadline}
                </span>
              </div>
              
              <div className="space-y-2">
                <h3 className={`text-4xl font-black tracking-tighter leading-tight transition-colors ${
                  blocked ? 'text-red-950' : 'text-[#111111]'
                }`}>
                  {task.title}
                </h3>
                <p className="text-gray-400 font-medium text-lg leading-relaxed line-clamp-1 group-hover:text-gray-600 transition-colors">
                  {task.description}
                </p>
              </div>
            </div>

            <div className="w-full lg:w-48 flex flex-col items-center justify-center p-6 bg-gray-50/50 rounded-[35px] border-2 border-transparent group-hover:border-yellow-100 transition-all">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Current Vector</span>
              <span className="text-5xl font-black text-[#111111]">{task.completionPercentage}%</span>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-6 overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 transition-all duration-1000 shadow-[0_0_10px_rgba(242,201,76,0.5)]" 
                  style={{ width: `${task.completionPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="bg-[#FAFAFA] border-t-2 border-gray-50 p-10 lg:p-14 space-y-16 animate-in slide-in-from-top-4 duration-500">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="w-16 h-16 border-8 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400">Loading Intelligence...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                  <div className="lg:col-span-7 space-y-12">
                    {blocked && (
                      <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[40px] flex items-start gap-6 animate-in slide-in-from-left duration-700">
                         <div className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-lg">
                           <i className="fa-solid fa-link-slash"></i>
                         </div>
                         <div className="space-y-2">
                           <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-red-600">Protocol Lockdown</h4>
                           <p className="text-sm font-bold text-red-900 leading-relaxed">
                             This mission is currently tethered to {incompleteDependencies.length} incomplete prerequisite sorties. Impact cannot be captured until the chain is stabilized.
                           </p>
                         </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400">Impact Synchronization</h4>
                         <span className="text-[9px] font-bold text-yellow-600 uppercase tracking-widest">Update daily for command oversight</span>
                      </div>
                      <div className="bg-white p-8 rounded-[45px] border border-gray-100 shadow-xl space-y-6">
                         <textarea 
                          placeholder="Log today's action..." 
                          className="w-full bg-gray-50 border-none rounded-[30px] p-6 text-lg font-medium outline-none focus:ring-2 focus:ring-yellow-400 min-h-[120px] transition-all"
                          value={reflexInput}
                          onChange={e => setReflexInput(e.target.value)}
                         />
                         <div className="flex flex-col space-y-4">
                            <div className="flex items-center justify-between gap-4">
                               <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                               >
                                <i className="fa-solid fa-paperclip"></i>
                                Upload Assets
                               </button>
                               <button 
                                onClick={() => handleManualSync(task.id)}
                                disabled={!reflexInput}
                                className="flex-1 px-6 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all disabled:opacity-30"
                               >
                                Push Daily Log
                               </button>
                               <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => handleFileUpload(task.id, e)} />
                            </div>
                            
                            {/* Attachment List */}
                            {task.attachments && task.attachments.length > 0 && (
                              <div className="pt-4 space-y-3">
                                <h5 className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-2">Archived Mission Assets ({task.attachments.length})</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   {task.attachments.map(att => (
                                     <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-yellow-200 hover:bg-white transition-all group">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-gray-400 group-hover:text-yellow-500 transition-colors">
                                           <i className={`fa-solid ${att.type.startsWith('image/') ? 'fa-image' : 'fa-file-lines'}`}></i>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                           <p className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tight">{att.name}</p>
                                           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{att.size}</p>
                                        </div>
                                        <i className="fa-solid fa-arrow-up-right-from-square text-[8px] text-gray-300 group-hover:text-black"></i>
                                     </a>
                                   ))}
                                </div>
                              </div>
                            )}
                         </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 px-4">Reflex Timeline</h4>
                       <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 scrollbar-hide">
                          {task.progressEntries.length > 0 ? [...task.progressEntries].reverse().map(entry => (
                             <div key={entry.id} className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                   <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{new Date(entry.timestamp).toLocaleString()}</p>
                                   <i className="fa-solid fa-circle-check text-green-500 text-[10px]"></i>
                                </div>
                                <p className="text-sm font-bold text-gray-700 italic">"{entry.text}"</p>
                             </div>
                          )) : (
                             <p className="text-center py-10 text-gray-300 font-bold uppercase text-[9px] tracking-widest">No entries archived in the timeline.</p>
                          )}
                       </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-12">
                    {prerequisites.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                           <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400">Strategic Precedence</h4>
                           <i className="fa-solid fa-diagram-next text-gray-300"></i>
                        </div>
                        <div className="space-y-4 relative">
                           <div className="absolute left-7 top-6 bottom-6 w-0.5 bg-gray-100"></div>
                           {prerequisites.map((p, idx) => (
                             <div key={p.id} className={`relative flex items-center gap-6 p-6 rounded-[30px] border-2 transition-all ${
                               p.status === TaskStatus.COMPLETED ? 'bg-green-50/50 border-green-100' : 'bg-white border-gray-100'
                             }`}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 z-10 shadow-sm border-4 border-white ${
                                  p.status === TaskStatus.COMPLETED ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                                }`}>
                                   <i className={`fa-solid ${p.status === TaskStatus.COMPLETED ? 'fa-circle-check' : 'fa-clock'} text-xl`}></i>
                                </div>
                                <div className="min-w-0 flex-1">
                                   <p className="text-[11px] font-black uppercase tracking-widest text-gray-900 truncate">{p.title}</p>
                                   <div className="flex items-center justify-between mt-2">
                                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{p.status}</p>
                                      <p className="text-[9px] font-black text-gray-900">{p.completionPercentage}%</p>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                         <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400">Vector Override</h4>
                         <span className="text-2xl font-black text-yellow-600">{task.completionPercentage}%</span>
                      </div>
                      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm text-center">
                        <input type="range" min="0" max="100" value={task.completionPercentage} onChange={(e) => onUpdateTask(task.id, { completionPercentage: parseInt(e.target.value) })} className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-yellow-400 mb-4" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Draw mission trajectory</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-12 border-t-4 border-gray-100 flex justify-end">
                   <button disabled={blocked} onClick={() => onUpdateTask(task.id, { status: TaskStatus.COMPLETED, completionPercentage: 100 })} className={`px-16 py-8 rounded-[35px] font-black uppercase tracking-[0.4em] text-[12px] transition-all shadow-2xl ${blocked ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50' : 'bg-black text-white hover:bg-yellow-400 hover:text-black hover:scale-105 active:scale-95'}`}>{blocked ? 'Chain Interrupted' : 'Capture Mission Impact'}</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTaskSection = (label: string, taskList: Task[], theme: 'OVERDUE' | 'TODAY' | 'UPCOMING') => {
    if (taskList.length === 0) return null;

    const themeStyles = {
      OVERDUE: { icon: 'fa-triangle-exclamation', color: 'text-red-500', bg: 'bg-red-50' },
      TODAY: { icon: 'fa-calendar-day', color: 'text-yellow-600', bg: 'bg-yellow-50' },
      UPCOMING: { icon: 'fa-calendar-arrow-up', color: 'text-gray-400', bg: 'bg-gray-50' }
    };
    const style = themeStyles[theme];

    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="flex items-center space-x-6 px-4">
          <div className={`w-14 h-14 rounded-[22px] ${style.bg} ${style.color} flex items-center justify-center shadow-xl border border-current/10`}><i className={`fa-solid ${style.icon} text-xl`}></i></div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-gray-400">{label}</h2>
          <div className="flex-1 h-px bg-gray-100"></div>
        </div>
        <div className="grid grid-cols-1 gap-10">{taskList.map(renderTaskCard)}</div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-20 pb-40 font-['Inter'] relative">
       {showWelcome && (
         <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-full max-w-2xl px-6 animate-in slide-in-from-top-12 duration-1000">
            <div className="bg-[#111111] text-white rounded-[45px] p-8 shadow-3xl border-4 border-yellow-400 flex items-center gap-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-125 group-hover:scale-150 transition-transform"><i className="fa-solid fa-bolt text-9xl text-yellow-400"></i></div>
               <div className="w-20 h-20 rounded-[28px] bg-yellow-400 text-black flex items-center justify-center shrink-0 shadow-2xl animate-bounce"><i className="fa-solid fa-user-astronaut text-3xl"></i></div>
               <div className="flex-1 space-y-2 relative z-10">
                  <h4 className="text-2xl font-black tracking-tighter">Protocol Activated.</h4>
                  <p className="text-gray-400 font-medium text-sm">Operative <span className="text-white font-black">{user.name}</span>, your mission grid is now active. Your contribution history has been synchronized.</p>
               </div>
               <button onClick={() => { setShowWelcome(false); onDismissWelcome?.(); }} className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all shrink-0"><i className="fa-solid fa-xmark"></i></button>
            </div>
         </div>
       )}

       <div className="bg-white p-12 lg:p-16 rounded-[70px] border-2 border-gray-100 shadow-3xl flex flex-col lg:flex-row justify-between items-center gap-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="space-y-4 relative z-10 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-4 text-yellow-600 font-black text-[12px] uppercase tracking-[0.5em]"><div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_#F2C94C]"></div><span>Operative Vector Control</span></div>
            <h1 className="text-6xl font-black tracking-tighter text-[#111111] leading-[0.85]">My Missions.</h1>
            <p className="text-gray-400 text-xl font-medium max-w-xl mx-auto lg:mx-0">Prioritized impact targets for your individual and team scope.</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 relative z-10">
             <div className="bg-gray-100/80 p-2 rounded-[35px] flex border-2 border-gray-100 shadow-inner">
               <button onClick={() => setFilter('ALL')} className={`px-10 py-4 rounded-[28px] text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'ALL' ? 'bg-white shadow-2xl text-black scale-105' : 'text-gray-400 hover:text-gray-600'}`}>All Sorties</button>
               <button onClick={() => setFilter('FOCUS')} className={`flex items-center gap-2 px-10 py-4 rounded-[28px] text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'FOCUS' ? 'bg-white shadow-2xl text-black scale-105 ring-2 ring-yellow-400/20' : 'text-gray-400 hover:text-gray-600'}`}>
                 <i className={`fa-solid fa-bullseye ${filter === 'FOCUS' ? 'text-yellow-500' : ''}`}></i>
                 <span>Focus Mode</span>
               </button>
             </div>
             <button onClick={() => { setShowReflexModal(true); setSyncProposal(null); }} className="px-12 py-6 bg-[#111111] text-white rounded-[32px] font-black uppercase tracking-[0.4em] text-xs hover:scale-105 transition-all shadow-3xl active:scale-95">Society Reflex</button>
          </div>
       </div>
       
       <div className="space-y-32">
          {filter === 'FOCUS' && (
            <div className="flex items-center space-x-4 px-6 py-4 bg-yellow-50 border-2 border-yellow-100 rounded-[30px] w-fit animate-in slide-in-from-left duration-500 relative z-20">
               <div className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center text-[10px] animate-pulse"><i className="fa-solid fa-shield-halved text-black"></i></div>
               <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">Focus Mode Protocol Active</p>
                  <p className="text-[9px] font-bold text-yellow-600 uppercase tracking-tighter">Hiding non-critical and completed sorties</p>
               </div>
            </div>
          )}
          {renderTaskSection('Critical Trajectory', groupedTasks.OVERDUE, 'OVERDUE')}
          {renderTaskSection('Priority Targets', groupedTasks.TODAY, 'TODAY')}
          {renderTaskSection('Upcoming Sorties', groupedTasks.UPCOMING, 'UPCOMING')}
          {displayTasks.length === 0 && (
            <div className="py-40 text-center space-y-10">
               <div className="w-32 h-32 bg-gray-50 rounded-[45px] border-4 border-dashed border-gray-100 flex items-center justify-center text-gray-200 mx-auto"><i className="fa-solid fa-wind text-5xl"></i></div>
               <p className="text-gray-400 text-lg font-medium uppercase tracking-widest">{filter === 'FOCUS' ? 'No priority targets in this sector.' : 'All Vectors Stabilized.'}</p>
            </div>
          )}
       </div>

       {showReflexModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[150] flex items-center justify-center p-8 animate-in fade-in duration-300">
             <div className="bg-white w-full max-w-4xl rounded-[90px] p-12 lg:p-24 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <button onClick={() => setShowReflexModal(false)} className="absolute top-16 right-16 text-gray-300 hover:text-black z-20 transition-colors"><i className="fa-solid fa-xmark text-4xl"></i></button>
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-16 py-4">
                  {!syncProposal ? (
                    <div className="space-y-16 text-center">
                      <div className="space-y-6">
                        <div className="w-20 h-20 bg-yellow-400 text-black rounded-[30px] flex items-center justify-center mx-auto text-2xl shadow-xl"><i className="fa-solid fa-brain"></i></div>
                        <h2 className="text-5xl font-black tracking-tighter text-[#111111]">Daily Impact Reflex</h2>
                        <p className="text-gray-400 text-xl font-medium max-w-lg mx-auto">Describe your entrepreneurial actions today. Our AI will synthesize this into mission-critical updates.</p>
                      </div>
                      <textarea className="w-full bg-gray-50 border-4 border-transparent focus:border-yellow-400 rounded-[50px] p-14 text-2xl font-bold outline-none min-h-[350px] shadow-inner text-[#111111]" placeholder="e.g., Conducted final R&D phase on KISS community project..." value={reflexInput} onChange={e => setReflexInput(e.target.value)} />
                      <button onClick={handleInitializeReflex} disabled={isSyncing || !reflexInput} className="w-full py-12 bg-black text-white rounded-[50px] font-black uppercase tracking-[0.5em] text-sm shadow-3xl hover:bg-yellow-400 hover:text-black transition-all disabled:opacity-30">{isSyncing ? <span className="flex items-center justify-center gap-4"><i className="fa-solid fa-circle-notch animate-spin"></i>Synthesizing Telemetry...</span> : "Analyze & Propose Sync"}</button>
                    </div>
                  ) : (
                    <div className="space-y-16 animate-in slide-in-from-bottom-8 duration-700">
                       <div className="text-center space-y-6 border-b border-gray-50 pb-12"><div className="flex items-center justify-center gap-4 mb-4"><div className="w-16 h-16 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><i className="fa-solid fa-check-double text-2xl"></i></div></div><h2 className="text-5xl font-black tracking-tighter text-[#111111]">Audit Verified</h2><p className="text-gray-400 text-xl font-medium max-w-2xl mx-auto italic">AI-Proposed Impact Vector for: <span className="text-black font-black">"{tasks.find(t => t.id === syncProposal.taskId)?.title}"</span></p></div>
                       <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
                          <div className="lg:col-span-4 space-y-8"><div className="bg-gray-50 p-10 rounded-[50px] border border-gray-100 text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-4">Velocity Bump</p><div className="text-7xl font-black text-yellow-600">+{syncProposal.progressDelta}%</div><p className="text-[9px] font-bold text-gray-400 uppercase mt-4">Calculated Impact</p></div><div className="bg-white border-2 border-yellow-400 p-8 rounded-[40px] shadow-xl shadow-yellow-50"><p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-2">Nexus Interpretation</p><p className="text-sm font-bold text-gray-800 leading-relaxed italic">"{syncProposal.interpretation}"</p></div></div>
                          <div className="lg:col-span-8 space-y-10"><div className="space-y-4"><h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.5em] px-4">Proposed Structured Log</h4><div className="bg-gray-50 p-10 rounded-[50px] border border-gray-100 italic text-2xl font-medium text-gray-700 leading-relaxed">"{syncProposal.logEntry}"</div></div><div className="flex flex-wrap gap-4 px-4">{syncProposal.skillsIdentified.map((skill, i) => <span key={i} className="px-5 py-2 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-widest">{skill}</span>)}</div><div className="pt-10 border-t border-gray-50 flex gap-6"><button onClick={() => setSyncProposal(null)} className="flex-1 py-10 bg-gray-100 text-gray-400 rounded-[45px] font-black uppercase tracking-[0.5em] text-xs hover:bg-gray-200 transition-all">Re-Draft</button><button onClick={handleConfirmProposal} className="flex-[2] py-10 bg-black text-white rounded-[45px] font-black uppercase tracking-[0.5em] text-xs hover:bg-yellow-400 hover:text-black shadow-3xl transition-all active:scale-95">Authorize & Sync Registry</button></div></div>
                       </div>
                    </div>
                  )}
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

export default MyWork;
