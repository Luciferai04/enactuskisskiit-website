
import React, { useState, useRef } from 'react';
import { User, Task, TaskStatus } from '../types';

interface ProfileProps {
  user: User;
  tasks: Task[];
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, tasks, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: user.name,
    bio: user.bio || '',
    linkedin: user.linkedin || '',
    whatsapp: user.whatsapp || '',
    major: user.major || '',
    roll: user.roll || '',
    year: user.year || '',
    avatar: user.avatar
  });

  const myTasks = tasks.filter(t => t.assigneeIds.includes(user.id));
  const completedTasks = myTasks.filter(t => t.status === TaskStatus.COMPLETED);
  const pendingTasks = myTasks.filter(t => t.status !== TaskStatus.COMPLETED);
  const totalImpact = completedTasks.reduce((acc, t) => acc + (t.impactScore || 0), 0);
  const avgCompletion = myTasks.length > 0 
    ? Math.round(myTasks.reduce((acc, t) => acc + t.completionPercentage, 0) / myTasks.length) 
    : 0;

  const handleSave = () => {
    onUpdateUser(user.id, formData);
    setIsEditing(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 font-['Inter'] animate-in fade-in duration-700">
      {/* 
        The 'capture' attribute combined with accept="image/*" suggests 
        to mobile browsers that they should offer the camera directly.
      */}
      <input 
        type="file" 
        ref={photoInputRef} 
        className="hidden" 
        accept="image/*" 
        capture="user"
        onChange={handlePhotoUpload} 
      />
      
      {/* Profile Cover & Identity */}
      <div className="bg-white rounded-[60px] border-2 border-gray-100 shadow-2xl shadow-gray-200/40 overflow-hidden mb-12">
        <div className="h-56 bg-[#111111] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 scale-150">
             <i className="fa-solid fa-seedling text-[200px] text-yellow-400"></i>
          </div>
          <div className="absolute bottom-[-40px] left-12 flex items-end space-x-8">
            <div className="relative group">
               <img 
                 src={formData.avatar} 
                 alt={user.name} 
                 className="w-44 h-44 rounded-[45px] border-[10px] border-white shadow-2xl bg-white transition-transform group-hover:scale-105 object-cover"
               />
               {isEditing && (
                 <button 
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute bottom-3 right-3 w-12 h-12 bg-yellow-400 text-black rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-all border-4 border-white"
                  title="Capture via Camera or Gallery"
                 >
                   <i className="fa-solid fa-camera text-sm"></i>
                 </button>
               )}
            </div>
            <div className="mb-14 space-y-2">
              <div className="flex items-center space-x-3 text-yellow-400 font-black text-[10px] uppercase tracking-[0.4em]">
                <i className="fa-solid fa-crown text-[8px]"></i>
                <span>Operative Identity</span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter">{formData.name}</h1>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">
                {user.role} | {user.position || 'Mission Operative'}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-16 p-10 lg:p-14 flex flex-col lg:flex-row gap-16">
          <div className="flex-1 space-y-12">
            {!isEditing ? (
              <>
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Executive Dossier</h3>
                  <p className="text-xl font-medium text-gray-700 leading-relaxed italic max-w-3xl">
                    {user.bio || "No mission bio documented in the chapter registry yet."}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Academic Footprint</h4>
                    <div className="space-y-4">
                      <ProfileInfo icon="fa-id-card" label="Roll Number" value={user.roll} />
                      <ProfileInfo icon="fa-graduation-cap" label="Major" value={user.major} />
                      <ProfileInfo icon="fa-calendar" label="Standing" value={user.year} />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Digital Grid</h4>
                    <div className="space-y-4">
                      <ProfileInfo icon="fa-envelope" label="Primary Email" value={user.email} />
                      <ProfileInfo icon="fa-linkedin" label="LinkedIn" value={user.linkedin} isLink />
                      <ProfileInfo icon="fa-whatsapp" label="WhatsApp" value={user.whatsapp} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-10 animate-in slide-in-from-bottom-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Modify Dossier</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputGroup label="Display Name" value={formData.name || ''} onChange={val => setFormData({...formData, name: val})} />
                  <InputGroup label="Roll Number" value={formData.roll || ''} onChange={val => setFormData({...formData, roll: val})} />
                  <InputGroup label="Major" value={formData.major || ''} onChange={val => setFormData({...formData, major: val})} />
                  <InputGroup label="LinkedIn" value={formData.linkedin || ''} onChange={val => setFormData({...formData, linkedin: val})} />
                  <InputGroup label="WhatsApp" value={formData.whatsapp || ''} onChange={val => setFormData({...formData, whatsapp: val})} />
                  <InputGroup label="Year" value={formData.year || ''} onChange={val => setFormData({...formData, year: val})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Bio</label>
                  <textarea className="w-full bg-gray-50 border-4 border-transparent focus:border-yellow-400 rounded-[35px] px-8 py-6 text-lg font-bold outline-none transition-all min-h-[150px] shadow-inner" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:w-[320px] shrink-0 space-y-8">
            <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className={`w-full py-8 rounded-[40px] text-[11px] font-black uppercase tracking-[0.4em] transition-all shadow-2xl flex items-center justify-center gap-3 ${isEditing ? 'bg-black text-white' : 'bg-yellow-400 text-black shadow-yellow-100'}`}>
              <i className={`fa-solid ${isEditing ? 'fa-check-double' : 'fa-pen-to-square'}`}></i>
              {isEditing ? 'Verify Profile' : 'Edit Profile'}
            </button>
            {isEditing && (
              <button onClick={() => setIsEditing(false)} className="w-full py-2 text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors">Cancel Modifications</button>
            )}
            <div className="bg-gray-50 p-8 rounded-[45px] border-2 border-dashed border-gray-200 text-center space-y-4">
              <i className="fa-solid fa-shield-halved text-gray-300 text-2xl"></i>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Identity verification is mandatory for Enactus KISS-KIIT personnel.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Impact Metrics */}
      <div className="space-y-10">
        <h3 className="text-3xl font-black tracking-tighter text-gray-900 px-4">Impact Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <MetricCard label="Total Impact XP" value={totalImpact.toString()} sub="Verified points" icon="fa-seedling" color="text-green-600" bg="bg-green-50" />
          <MetricCard label="Victories" value={completedTasks.length.toString()} sub="Missions finished" icon="fa-trophy" color="text-yellow-600" bg="bg-yellow-50" />
          <MetricCard label="Assignments" value={pendingTasks.length.toString()} sub="Active backlog" icon="fa-rocket" color="text-blue-600" bg="bg-blue-50" />
          <MetricCard label="Execution" value={`${avgCompletion}%`} sub="Avg. completion" icon="fa-chart-line" color="text-purple-600" bg="bg-purple-50" />
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, sub, icon, color, bg }: { label: string, value: string, sub: string, icon: string, color: string, bg: string }) => (
  <div className="bg-white p-10 rounded-[50px] border-2 border-transparent hover:border-gray-100 hover:shadow-xl transition-all shadow-sm flex flex-col items-center text-center space-y-6 group">
    <div className={`w-16 h-16 rounded-2xl ${bg} ${color} flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110`}><i className={`fa-solid ${icon}`}></i></div>
    <div className="space-y-1">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-5xl font-black text-gray-900 tracking-tighter leading-none">{value}</p>
      <p className="text-[9px] font-bold text-gray-300 uppercase mt-2">{sub}</p>
    </div>
  </div>
);

const ProfileInfo = ({ icon, label, value, isLink }: { icon: string, label: string, value?: string, isLink?: boolean }) => (
  <div className="flex items-center space-x-6 group">
    <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-yellow-600 group-hover:bg-yellow-50 transition-all shrink-0">
      <i className={`fa-solid ${icon} text-sm`}></i>
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      {isLink && value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-gray-700 hover:text-yellow-600 truncate block transition-colors">{value}</a>
      ) : (
        <p className="text-sm font-bold text-gray-800 truncate">{value || '---'}</p>
      )}
    </div>
  </div>
);

const InputGroup = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">{label}</label>
    <input type="text" className="w-full bg-gray-50 border-4 border-transparent focus:border-yellow-400 rounded-[28px] px-8 py-5 text-sm font-bold outline-none shadow-inner transition-all" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default Profile;
