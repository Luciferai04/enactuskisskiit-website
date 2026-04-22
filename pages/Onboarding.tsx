
import React, { useState } from 'react';
import { Role, User } from '../types';
import Logo from '../components/Logo';

interface OnboardingProps {
  onLogin: (user: User, isNew?: boolean) => void;
  users: User[];
}

type OnboardingStep = 'CHOOSE_ROLE' | 'SETUP_PROFILE' | 'FINALIZE_PROFILE' | 'CONFIRM_REGISTRATION';

const Onboarding: React.FC<OnboardingProps> = ({ onLogin, users }) => {
  const [step, setStep] = useState<OnboardingStep>('CHOOSE_ROLE');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [extraData, setExtraData] = useState({ roll: '', major: '', year: '', bio: '' });
  const [error, setError] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setTimeout(() => {
      setStep('SETUP_PROFILE');
    }, 400);
  };

  const handleSubmitVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedRole || !formData.email) return;

    const normalizedEmail = formData.email.trim().toLowerCase();
    const registeredUser = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!registeredUser) {
      setError("ACCESS DENIED: Your email is not found in the Enactus KISS-KIIT Master Registry. Please contact your Chapter President.");
      return;
    }

    if (registeredUser.role !== selectedRole && registeredUser.role !== 'ADMIN') {
      setError(`AUTHORIZATION ERROR: Your registered identity is ${registeredUser.role}. Please select the correct protocol.`);
      return;
    }

    if (registeredUser.isRegistered) {
      onLogin(registeredUser);
      return;
    }

    setPendingUser({ 
      ...registeredUser, 
      name: formData.name || registeredUser.name,
      roll: registeredUser.roll || '',
      major: registeredUser.major || '',
      year: registeredUser.year || ''
    });
    
    // Automatically pre-fill extra data if it exists in registry
    setExtraData({
      roll: registeredUser.roll || '',
      major: registeredUser.major || '',
      year: registeredUser.year || '',
      bio: ''
    });

    setStep('FINALIZE_PROFILE');
  };

  const handleFinalEnrollment = () => {
    if (!pendingUser) return;
    const finalUser = { 
      ...pendingUser, 
      ...extraData,
      isRegistered: true, 
      registeredAt: Date.now() 
    };
    onLogin(finalUser, true);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row font-['Inter'] selection:bg-yellow-100 overflow-hidden">
      {/* Branding Side */}
      <div className="lg:w-[42%] bg-[#111111] p-10 lg:p-20 flex flex-col justify-between relative overflow-hidden shrink-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#F2C94C] rounded-full blur-[150px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-green-400 rounded-full blur-[150px] opacity-5"></div>
        
        <div className="relative z-10">
          <Logo className="mb-24 scale-110 origin-left" size="lg" variant="light" />
          <div className="space-y-6 animate-in slide-in-from-left duration-1000">
            <div className="inline-flex items-center space-x-3 px-5 py-2.5 bg-yellow-400/10 rounded-full border border-yellow-400/20">
              <div className="w-2.5 h-2.5 rounded-full bg-[#F2C94C] animate-pulse shadow-[0_0_10px_#F2C94C]"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400">Registry System v2.5</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[1.1] md:leading-[1.05]">
              Empowering <br/>Action at <br/><span className="text-[#F2C94C]">Scale.</span>
            </h1>
            
            <p className="text-gray-400 text-lg lg:text-xl font-medium max-w-sm leading-relaxed mt-6">
              Official mission control for KISS-KIIT Chapter operations. Entrepreneurial action starts here.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center space-x-10 mt-12">
           <div className="space-y-1">
             <p className="text-white font-black text-2xl">48+</p>
             <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">Active Missions</p>
           </div>
           <div className="w-px h-10 bg-gray-800"></div>
           <div className="space-y-1">
             <p className="text-white font-black text-2xl">1.2k</p>
             <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">Impact Points</p>
           </div>
        </div>
      </div>

      {/* Action Side */}
      <div className="flex-1 p-8 lg:p-20 flex flex-col justify-center items-center bg-[#FAFAFA] relative overflow-y-auto">
        <div className="max-w-xl w-full py-20">
          {step === 'CHOOSE_ROLE' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-700">
              <div className="text-center lg:text-left space-y-4">
                <h2 className="text-5xl font-black tracking-tighter text-[#111111]">Identity Protocol</h2>
                <p className="text-gray-400 text-lg font-medium">Select your operational tier to initialize your workspace.</p>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {[
                  { 
                    id: 'ADMIN' as Role, 
                    title: 'Chapter Executive', 
                    desc: 'Strategic governance, resource management, and mission orchestration.',
                    icon: 'fa-crown',
                    gradient: 'from-yellow-400/20 to-transparent',
                    borderColor: 'hover:border-yellow-400'
                  },
                  { 
                    id: 'MEMBER' as Role, 
                    title: 'Mission Operative', 
                    desc: 'Frontline execution, impact logging, and community engagement.',
                    icon: 'fa-bolt-lightning',
                    gradient: 'from-[#6FCF97]/20 to-transparent',
                    borderColor: 'hover:border-[#6FCF97]'
                  }
                ].map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    className={`group relative p-8 lg:p-10 rounded-[45px] border-4 bg-white border-transparent ${role.borderColor} shadow-2xl shadow-gray-200/40 transition-all text-left overflow-hidden active:scale-[0.98] hover:-translate-y-1`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-[100px] -mr-8 -mt-8 transition-colors group-hover:bg-yellow-50/50"></div>
                    
                    <div className="relative z-10 flex items-start gap-8">
                      <div className={`w-20 h-20 shrink-0 rounded-[28px] flex items-center justify-center text-2xl bg-gray-100 transition-all duration-500 shadow-sm ${role.id === 'ADMIN' ? 'group-hover:bg-yellow-400' : 'group-hover:bg-[#6FCF97]'} group-hover:scale-110 group-hover:rotate-3`}>
                        <i className={`fa-solid ${role.icon} ${selectedRole === role.id ? 'text-black' : 'text-gray-400 group-hover:text-black'}`}></i>
                      </div>
                      <div className="space-y-2 pt-2">
                        <h3 className="text-3xl font-black text-[#111111] tracking-tighter">{role.title}</h3>
                        <p className="text-gray-400 font-medium leading-relaxed max-w-sm">{role.desc}</p>
                      </div>
                      <div className="ml-auto self-center opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-500">
                        <i className={`fa-solid fa-arrow-right-long ${role.id === 'ADMIN' ? 'text-yellow-500' : 'text-[#6FCF97]'} text-xl`}></i>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="pt-8 text-center"><p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Official Onboarding Process KISS-KIIT 2024-25</p></div>
            </div>
          )}

          {step === 'SETUP_PROFILE' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-12 duration-700">
              <button onClick={() => setStep('CHOOSE_ROLE')} className="group inline-flex items-center space-x-3 text-gray-400 hover:text-black transition-colors">
                <div className="w-10 h-10 rounded-2xl border-2 border-gray-100 flex items-center justify-center group-hover:border-black group-hover:bg-black group-hover:text-white transition-all"><i className="fa-solid fa-arrow-left text-xs"></i></div>
                <span className="font-black text-[10px] uppercase tracking-[0.3em]">Protocol Re-selection</span>
              </button>
              
              <div className="space-y-4">
                <h2 className="text-5xl font-black tracking-tighter text-[#111111]">Verify Dossier</h2>
                <p className="text-gray-400 text-lg font-medium">Synchronize your identity with the Master Registry using institution credentials.</p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[40px] flex items-start space-x-5 animate-in shake duration-500">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0"><i className="fa-solid fa-circle-exclamation"></i></div>
                  <p className="text-red-700 font-bold text-sm leading-relaxed">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmitVerification} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Operative Name</label>
                  <input type="text" placeholder="Full Legal Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white border-2 border-gray-100 rounded-[35px] px-10 py-7 text-xl font-bold outline-none focus:border-yellow-400 shadow-sm transition-all placeholder:text-gray-200" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Registry Email Address</label>
                  <input required type="email" placeholder="name@kiit.ac.in" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-white border-2 border-gray-100 rounded-[35px] px-10 py-7 text-xl font-bold outline-none focus:border-yellow-400 shadow-sm transition-all placeholder:text-gray-200" />
                </div>
                <button type="submit" className="w-full py-10 bg-[#111111] text-white rounded-[40px] font-black uppercase tracking-[0.5em] text-xs shadow-3xl hover:bg-yellow-400 hover:text-black transition-all active:scale-[0.98]">Initiate Verification</button>
              </form>
            </div>
          )}

          {step === 'FINALIZE_PROFILE' && pendingUser && (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-12 duration-700">
              <div className="flex items-center space-x-6 mb-10">
                <div className="w-24 h-24 rounded-[30px] border-4 border-yellow-400 overflow-hidden shadow-xl shrink-0"><img src={pendingUser.avatar} className="w-full h-full object-cover" alt="avatar" /></div>
                <div>
                   <h2 className="text-4xl font-black tracking-tighter text-[#111111]">Verify Standing</h2>
                   <p className="text-yellow-600 font-bold uppercase tracking-widest text-[10px]">Registry Record Detected</p>
                </div>
              </div>

              <div className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Roll Number</label>
                      <input type="text" value={extraData.roll} onChange={e => setExtraData({...extraData, roll: e.target.value})} className="w-full bg-white border-2 border-gray-100 rounded-[30px] px-8 py-5 text-sm font-bold outline-none focus:border-yellow-400 transition-all shadow-sm" placeholder="e.g. 2205XXX" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Academic Major</label>
                      <input type="text" value={extraData.major} onChange={e => setExtraData({...extraData, major: e.target.value})} className="w-full bg-white border-2 border-gray-100 rounded-[30px] px-8 py-5 text-sm font-bold outline-none focus:border-yellow-400 transition-all shadow-sm" placeholder="e.g. B.Tech CS" />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-6">Brief Mission Bio</label>
                    <textarea value={extraData.bio} onChange={e => setExtraData({...extraData, bio: e.target.value})} className="w-full bg-white border-2 border-gray-100 rounded-[30px] px-8 py-5 text-sm font-bold outline-none focus:border-yellow-400 transition-all shadow-sm min-h-[120px]" placeholder="Tell the chapter about your entrepreneurial drive..." />
                 </div>
                 <div className="bg-yellow-50/50 border-2 border-yellow-100 p-8 rounded-[40px] space-y-3">
                   <p className="text-[9px] font-black text-yellow-700 uppercase tracking-[0.3em]">Operational Agreement</p>
                   <p className="text-xs font-medium text-gray-600 leading-relaxed">By finalizing, you acknowledge your role as a Mission Operative for Enactus KISS-KIIT and agree to log impact velocity daily.</p>
                 </div>
                 <button onClick={handleFinalEnrollment} className="w-full py-10 bg-black text-white rounded-[45px] font-black uppercase tracking-[0.5em] text-xs shadow-3xl hover:bg-yellow-400 hover:text-black transition-all active:scale-[0.98]">Finalize & Activate Protocol</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
