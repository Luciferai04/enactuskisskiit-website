
import React, { useState, useEffect, useMemo } from 'react';
import { User, Task, Project, TaskStatus } from '../types';
import { generateWeeklyReport, getPerformanceInsights, nexusOrchestrator } from '../services/geminiService';

interface InsightsProps {
  user: User;
  tasks: Task[];
  projects: Project[];
  users: User[];
}

interface AuditReport {
  executiveSummary: string;
  accomplishments: string[];
  risks: { description: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' }[];
  nextSteps: string[];
  overallStatus: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
}

const Insights: React.FC<InsightsProps> = ({ user, tasks, projects, users }) => {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [personalInsights, setPersonalInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [pitchScript, setPitchScript] = useState<string | null>(null);
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);

  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId) || projects[0],
  [selectedProjectId, projects]);

  const societyStats = useMemo(() => {
    const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED);
    const totalXP = completed.reduce((sum, t) => sum + (t.impactScore || 0), 0);
    const avgImpact = tasks.length > 0 ? (totalXP / tasks.length).toFixed(1) : '0.0';
    return { totalXP, avgImpact };
  }, [tasks]);

  useEffect(() => {
    if (!selectedProject) return;
    const fetchInsights = async () => {
      setIsLoading(true);
      setPitchScript(null);
      try {
        // Fixed: assigneeId changed to assigneeIds.includes(user.id)
        const userTasks = tasks.filter(t => t.assigneeIds.includes(user.id));
        const insightsPromise = getPerformanceInsights(userTasks);
        const reportPromise = generateWeeklyReport(selectedProject, tasks.filter(t => t.projectId === selectedProject.id), users);
        
        const [insights, weeklyReport] = await Promise.all([insightsPromise, reportPromise]);
        
        setPersonalInsights(insights);
        setReport(weeklyReport);
      } catch (err) {
        console.error("Error fetching insights:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInsights();
  }, [selectedProject, user.id, tasks, users]);

  const handleGeneratePitch = async () => {
    if (!selectedProject) return;
    setIsGeneratingPitch(true);
    try {
      const script = await nexusOrchestrator('PITCH_SCRIPT', { project: selectedProject, tasks: tasks.filter(t => t.projectId === selectedProject.id) });
      setPitchScript(script);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string, text: string, label: string, icon: string }> = {
      'ON_TRACK': { bg: 'bg-green-50', text: 'text-green-700', label: 'Optimal Vector', icon: 'fa-circle-check' },
      'AT_RISK': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Caution Required', icon: 'fa-triangle-exclamation' },
      'CRITICAL': { bg: 'bg-red-50', text: 'text-red-700', label: 'System Crisis', icon: 'fa-radiation' }
    };
    const config = configs[status] || configs['ON_TRACK'];
    return (
      <div className={`flex items-center space-x-3 ${config.bg} ${config.text} px-8 py-3 rounded-full border border-current/20 shadow-sm transition-all hover:scale-105`}>
        <i className={`fa-solid ${config.icon} text-[10px]`}></i>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">{config.label}</span>
      </div>
    );
  };

  if (projects.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-40 text-center space-y-12 animate-in fade-in duration-700">
        <div className="w-40 h-40 bg-gray-50 rounded-[50px] border-4 border-dashed border-gray-100 flex items-center justify-center text-gray-200 mx-auto shadow-inner">
          <i className="fa-solid fa-brain text-6xl"></i>
        </div>
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter text-gray-900 leading-none">Intelligence Standby.</h2>
          <p className="text-gray-400 text-2xl font-medium max-w-xl mx-auto leading-relaxed">
            AI synthesis requires mission-critical data. Initialize initiatives in the <span className="text-black font-black">Nexus Board</span> to unlock automated impact auditing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-16 pb-40 font-['Inter'] animate-in fade-in duration-1000">
      {/* Premium Hero Section */}
      <div className="bg-white rounded-[80px] p-12 lg:p-24 border-2 border-gray-100 shadow-3xl flex flex-col lg:flex-row items-center gap-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-yellow-400/5 rounded-full blur-[160px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex-1 space-y-10 relative z-10 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start space-x-4 text-yellow-600 font-black text-xs uppercase tracking-[0.6em]">
            <i className="fa-solid fa-wand-magic-sparkles animate-pulse"></i>
            <span>Nexus Strategic Intelligence</span>
          </div>
          <h1 className="text-7xl lg:text-9xl font-black text-gray-900 tracking-tighter leading-[0.8] mb-6">Impact <br/>Matrix.</h1>
          <p className="text-gray-400 text-2xl lg:text-3xl font-medium max-w-3xl leading-relaxed mx-auto lg:mx-0">
            Automated chapter auditing and strategic forecasting. Deep analysis for Enactus KISS-KIIT.
          </p>
        </div>

        <div className="w-full lg:w-[500px] grid grid-cols-2 gap-8 relative z-10">
           <div className="bg-white rounded-[55px] p-12 border-2 border-gray-50 shadow-2xl flex flex-col items-center justify-center space-y-4 hover:border-yellow-200 transition-all group">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">Chapter XP</p>
              <div className="text-6xl font-black text-gray-900 tracking-tighter group-hover:scale-110 transition-transform">{societyStats.totalXP}</div>
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Growth Vector +12%</p>
           </div>
           <div className="bg-black rounded-[55px] p-12 border-2 border-gray-800 shadow-3xl flex flex-col items-center justify-center space-y-4 hover:scale-105 transition-all group">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">Avg Impact</p>
              <div className="text-6xl font-black text-yellow-400 tracking-tighter group-hover:scale-110 transition-transform">{societyStats.avgImpact}</div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mission Score</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Main Intelligence Feed */}
        <div className="lg:col-span-8 space-y-16">
          <div className="bg-white rounded-[85px] border-2 border-gray-100 shadow-3xl overflow-hidden transition-all">
            
            {/* Project Selector Bar */}
            <div className="p-12 lg:px-20 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-12 bg-gray-50/20 backdrop-blur-sm">
              <div className="space-y-2">
                <h3 className="text-4xl font-black tracking-tighter text-gray-900">Initiative Audit</h3>
                <div className="flex items-center space-x-3">
                   <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em]">Sentinel Monitoring Protocol</p>
                </div>
              </div>
              <div className="flex items-center space-x-8 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <select 
                    className="w-full sm:w-80 bg-white border-2 border-gray-100 rounded-[30px] px-10 py-5 text-[11px] font-black uppercase tracking-[0.2em] focus:outline-none focus:border-yellow-400 shadow-inner appearance-none cursor-pointer pr-16 transition-all hover:bg-gray-50"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-10 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"></i>
                </div>
                {report && getStatusBadge(report.overallStatus)}
              </div>
            </div>

            <div className="p-12 lg:p-24 space-y-24">
              {isLoading ? (
                <div className="space-y-16 animate-pulse">
                  <div className="h-64 bg-gray-50 rounded-[70px] w-full shadow-inner"></div>
                  <div className="grid grid-cols-2 gap-16">
                    <div className="h-96 bg-gray-50 rounded-[60px] shadow-inner"></div>
                    <div className="h-96 bg-gray-50 rounded-[60px] shadow-inner"></div>
                  </div>
                </div>
              ) : report ? (
                <div className="animate-in fade-in duration-1000 slide-in-from-bottom-12 space-y-32">
                  
                  {/* Executive Summary Section */}
                  <div className="relative">
                     <div className="absolute -left-12 top-0 bottom-0 w-1.5 bg-yellow-400/40 rounded-full"></div>
                     <div className="space-y-10">
                        <div className="flex items-center space-x-6">
                           <div className="w-14 h-14 bg-black text-yellow-400 rounded-[25px] flex items-center justify-center text-xl shadow-2xl"><i className="fa-solid fa-quote-left"></i></div>
                           <h4 className="text-[13px] font-black uppercase tracking-[0.6em] text-gray-400">Executive Synthesis</h4>
                        </div>
                        <div className="text-3xl lg:text-4xl font-medium leading-relaxed text-gray-800 max-w-5xl tracking-tight">
                          {report.executiveSummary}
                        </div>
                     </div>
                  </div>

                  {/* Impact & Victories Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    <div className="space-y-12">
                      <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 rounded-[28px] bg-green-50 text-green-600 flex items-center justify-center shadow-xl border border-green-100">
                          <i className="fa-solid fa-medal text-2xl"></i>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400">Captured Victories</h4>
                          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Mission Milestone Success</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        {report.accomplishments.map((item, idx) => (
                          <div key={idx} className="bg-white border-2 border-gray-50 p-10 rounded-[45px] flex items-start gap-8 hover:border-green-200 hover:bg-green-50/10 transition-all group shadow-sm">
                            <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-500 flex items-center justify-center shrink-0 border border-green-100 group-hover:rotate-12 transition-transform">
                              <i className="fa-solid fa-check text-xs"></i>
                            </div>
                            <p className="text-xl font-bold text-gray-800 leading-snug">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 rounded-[28px] bg-red-50 text-red-600 flex items-center justify-center shadow-xl border border-red-100">
                          <i className="fa-solid fa-shield-halved text-2xl"></i>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400">Strategic Frictions</h4>
                          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Audit Red Flags</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        {report.risks.map((risk, idx) => (
                          <div key={idx} className={`p-10 rounded-[45px] border-2 flex flex-col gap-6 transition-all group shadow-sm ${
                            risk.severity === 'HIGH' ? 'bg-red-50/20 border-red-100' : 'bg-yellow-50/20 border-yellow-100'
                          }`}>
                            <div className="flex justify-between items-center">
                               <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full ${
                                 risk.severity === 'HIGH' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-black'
                               }`}>{risk.severity} Severity Threat</span>
                            </div>
                            <p className="text-xl font-bold text-gray-800 leading-snug">{risk.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Narrative Architect Module */}
                  <div className="bg-black rounded-[70px] p-12 lg:p-24 shadow-3xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-24 opacity-5 rotate-12 group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-bullhorn text-[250px] text-white"></i>
                     </div>
                     <div className="relative z-10 space-y-16">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-16">
                           <div className="space-y-6">
                             <div className="flex items-center space-x-4 text-yellow-400 font-black text-[11px] uppercase tracking-[0.6em]">
                                <i className="fa-solid fa-bolt"></i>
                                <span>Narrative Synthesis Bureau</span>
                             </div>
                             <h3 className="text-5xl lg:text-6xl font-black text-white tracking-tighter max-w-xl leading-[0.9]">Regional Pitch Architect.</h3>
                             <p className="text-gray-400 text-xl font-medium max-w-2xl">Refining mission telemetry into high-impact scripts for competition judges.</p>
                           </div>
                           <button 
                             onClick={handleGeneratePitch}
                             disabled={isGeneratingPitch}
                             className="px-16 py-8 bg-yellow-400 text-black rounded-[40px] font-black uppercase tracking-[0.5em] text-[12px] shadow-3xl shadow-yellow-400/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-6 disabled:opacity-50 whitespace-nowrap"
                           >
                             {isGeneratingPitch ? (
                               <i className="fa-solid fa-circle-notch animate-spin"></i>
                             ) : (
                               <i className="fa-solid fa-sparkles"></i>
                             )}
                             <span>Synthesize Script</span>
                           </button>
                        </div>
                        {pitchScript && (
                          <div className="bg-white/5 backdrop-blur-3xl p-16 rounded-[60px] border border-white/10 shadow-3xl animate-in zoom-in duration-500">
                             <div className="text-gray-200 font-medium text-2xl leading-relaxed whitespace-pre-line prose prose-invert max-w-none italic">
                                "{pitchScript}"
                             </div>
                          </div>
                        )}
                     </div>
                  </div>

                  {/* Tactical Roadmaps Section */}
                  <div className="pt-24 border-t-2 border-gray-50 space-y-16">
                     <div className="flex items-center space-x-8 px-6">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-2xl border border-blue-100 shadow-xl"><i className="fa-solid fa-compass"></i></div>
                        <div className="space-y-1">
                           <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-gray-400">Strategic Roadmap</h4>
                           <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Next Operational Sortie</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {report.nextSteps.map((step, idx) => (
                          <div key={idx} className="bg-gray-50/50 p-12 rounded-[55px] border-2 border-transparent hover:border-blue-100 hover:bg-white transition-all group flex gap-10 shadow-sm">
                             <div className="text-6xl font-black text-gray-100 group-hover:text-blue-100 transition-all scale-110">0{idx + 1}</div>
                             <div className="space-y-3 pt-4">
                                <p className="text-2xl font-black text-gray-900 leading-tight">{step}</p>
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Mission Objective</p>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-40 text-center space-y-12 animate-in fade-in duration-700">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 shadow-inner">
                    <i className="fa-solid fa-chart-line text-4xl"></i>
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-400 font-black text-3xl tracking-tighter">Awaiting Nexus Telemetry...</p>
                    <p className="text-gray-300 font-bold uppercase tracking-[0.4em] text-[10px]">Initializing High-Res Audit</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Intelligence */}
        <div className="lg:col-span-4 space-y-16">
          {/* Leaders Section */}
          <div className="bg-white rounded-[70px] border-2 border-gray-100 shadow-3xl p-10 lg:p-16 space-y-16 transition-all hover:shadow-gray-200/50">
            <h3 className="text-3xl font-black flex items-center space-x-6 text-gray-900 tracking-tighter">
              <i className="fa-solid fa-trophy text-yellow-500 text-2xl animate-bounce"></i>
              <span>Impact Leaders</span>
            </h3>
            <div className="space-y-12">
              {users.slice(0, 5).map((u, idx) => (
                <div key={u.id} className="flex items-center space-x-8 group cursor-default">
                  <div className="w-10 h-10 flex items-center justify-center font-black text-gray-100 text-3xl group-hover:text-yellow-500 transition-colors">
                    {idx + 1}
                  </div>
                  <div className="relative">
                    <img src={u.avatar} className="w-20 h-20 rounded-[35px] shadow-2xl border-4 border-white transition-all group-hover:scale-110 group-hover:border-yellow-400 object-cover" alt={u.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-black text-gray-900 truncate tracking-tight">{u.name}</p>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-2">{u.role} TIER</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights Sidebar */}
          <div className="bg-[#111111] rounded-[70px] shadow-3xl p-10 lg:p-16 space-y-16 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-16 opacity-5 rotate-45 group-hover:scale-110 transition-transform">
               <i className="fa-solid fa-sparkles text-[200px] text-white"></i>
            </div>
            <h3 className="text-3xl font-black flex items-center space-x-6 text-white tracking-tighter relative z-10">
              <i className="fa-solid fa-bolt text-yellow-400 text-2xl"></i>
              <span>Nexus Feedback</span>
            </h3>
            <div className="space-y-10 relative z-10">
              {personalInsights.length > 0 ? personalInsights.map((insight, idx) => (
                <div key={idx} className="p-12 rounded-[55px] bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-[1.02] transition-all group shadow-2xl">
                  <div className="text-xl text-gray-400 font-medium leading-relaxed italic group-hover:text-white transition-colors">
                    "{insight}"
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center">
                  <p className="text-gray-600 italic font-medium text-xl leading-relaxed">System feedback pending Sortie completion.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
