
import React, { useState, useEffect } from 'react';
import Onboarding from './pages/Onboarding';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MyWork from './pages/MyWork';
import AdminBoard from './pages/AdminBoard';
import Insights from './pages/Insights';
import Profile from './pages/Profile';
import { User, Task, Project, TaskStatus } from './types';
import { MOCK_PROJECTS, MOCK_TASKS, MOCK_USERS } from './mockData';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [adminTab, setAdminTab] = useState<'COMMAND' | 'LAB' | 'PEOPLE' | 'HANDOVER'>('COMMAND');
  const [justOnboarded, setJustOnboarded] = useState(false);
  
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('enactus_tasks');
    return saved ? JSON.parse(saved) : MOCK_TASKS;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('enactus_projects');
    return saved ? JSON.parse(saved) : MOCK_PROJECTS;
  });

  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('enactus_registry');
    if (!saved) return MOCK_USERS;
    const parsedSaved: User[] = JSON.parse(saved);
    const merged = [...parsedSaved];
    MOCK_USERS.forEach(mockUser => {
      if (!merged.find(u => u.id === mockUser.id)) {
        merged.push(mockUser);
      }
    });
    return merged;
  });

  useEffect(() => {
    const updatedProjects = projects.map(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      if (projectTasks.length === 0) return { ...project, progress: 0 };
      const totalCompletion = projectTasks.reduce((acc, t) => acc + t.completionPercentage, 0);
      const avgProgress = Math.round(totalCompletion / projectTasks.length);
      let health: 'HEALTHY' | 'AT_RISK' | 'STALLED' = 'HEALTHY';
      const hasStalled = projectTasks.some(t => t.status !== TaskStatus.COMPLETED && t.deadline && new Date(t.deadline) < new Date());
      if (hasStalled) health = 'AT_RISK';
      return { ...project, progress: avgProgress, healthStatus: health };
    });
    const hasChanged = JSON.stringify(updatedProjects) !== JSON.stringify(projects);
    if (hasChanged) {
      setProjects(updatedProjects);
    }
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('enactus_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('enactus_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('enactus_registry', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    const savedUser = localStorage.getItem('enactus_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      const verified = registeredUsers.find(u => u.id === parsedUser.id);
      if (verified && verified.isRegistered) {
        setCurrentUser(verified);
        if (verified.role === 'MEMBER' && (activeView === 'admin' || activeView === 'insights')) {
          setActiveView('tasks');
        }
      } else {
        localStorage.removeItem('enactus_user');
      }
    }
  }, [registeredUsers]);

  const handleLogin = (user: User, isNew: boolean = false) => {
    const updatedUsers = registeredUsers.map(u => 
      u.email.toLowerCase() === user.email.toLowerCase() 
        ? { ...u, ...user, isRegistered: true, registeredAt: u.registeredAt || Date.now() } 
        : u
    );
    setRegisteredUsers(updatedUsers);
    
    const finalUser = { ...user, isRegistered: true };
    setCurrentUser(finalUser);
    localStorage.setItem('enactus_user', JSON.stringify(finalUser));
    
    if (isNew) {
      setJustOnboarded(true);
    }

    if (finalUser.role === 'MEMBER') {
      setActiveView('tasks');
    } else {
      setActiveView('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('enactus_user');
    setJustOnboarded(false);
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setRegisteredUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    if (currentUser?.id === userId) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      localStorage.setItem('enactus_user', JSON.stringify(updatedUser));
    }
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = { ...t, ...updates };
        if (updated.completionPercentage >= 100) {
          updated.status = TaskStatus.COMPLETED;
        } else if (updated.completionPercentage > 0 && updated.status === TaskStatus.TODO) {
          updated.status = TaskStatus.IN_PROGRESS;
        }
        return updated;
      }
      return t;
    }));
  };

  const addTask = (task: Task) => setTasks(prev => [task, ...prev]);
  const deleteTask = (taskId: string) => setTasks(prev => prev.filter(t => t.id !== taskId));
  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
  };
  const addProject = (project: Project) => setProjects(prev => [project, ...prev]);

  const terminateMember = (userId: string) => {
    setRegisteredUsers(prev => prev.map(u => u.id === userId ? { ...u, isRegistered: false } : u));
    setTasks(prev => prev.map(t => ({
      ...t,
      assigneeIds: t.assigneeIds.filter(id => id !== userId)
    })));
    if (currentUser?.id === userId) {
      handleLogout();
    }
  };

  const handleOpenLab = () => {
    setActiveView('admin');
    setAdminTab('LAB');
  };

  if (!currentUser) return <Onboarding onLogin={handleLogin} users={registeredUsers} />;

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard user={currentUser} tasks={tasks} projects={projects} onOpenLab={handleOpenLab} />;
      case 'tasks': return <MyWork user={currentUser} tasks={tasks} onUpdateTask={updateTask} justOnboarded={justOnboarded} onDismissWelcome={() => setJustOnboarded(false)} />;
      case 'admin': return currentUser.role === 'ADMIN' ? (
        <AdminBoard 
          currentUser={currentUser}
          tasks={tasks} 
          projects={projects} 
          users={registeredUsers} 
          onUpdateTask={updateTask} 
          onAddTask={addTask} 
          onDeleteTask={deleteTask}
          onUpdateProject={updateProject} 
          onAddProject={addProject}
          onTerminateMember={terminateMember}
          onUpdateUser={updateUser}
          initialTab={adminTab}
        />
      ) : <RedirectToTasks />;
      case 'insights': return currentUser.role === 'ADMIN' ? (
        <Insights user={currentUser} tasks={tasks} projects={projects} users={registeredUsers} />
      ) : <RedirectToTasks />;
      case 'profile': return <Profile user={currentUser} tasks={tasks} onUpdateUser={updateUser} />;
      default: return <Dashboard user={currentUser} tasks={tasks} projects={projects} onOpenLab={handleOpenLab} />;
    }
  };

  return (
    <Layout user={currentUser} onLogout={handleLogout} activeView={activeView} setActiveView={setActiveView}>
      <div className="h-full">{renderContent()}</div>
    </Layout>
  );
};

const RedirectToTasks = () => (
  <div className="flex flex-col items-center justify-center h-full py-40 text-center">
    <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl mb-6 shadow-xl"><i className="fa-solid fa-lock"></i></div>
    <h2 className="text-3xl font-black tracking-tighter">Governance Restriction</h2>
    <p className="text-gray-400 mt-2 max-w-sm font-medium">This zone is restricted to Society Executives. Focus on your assigned impact missions.</p>
  </div>
);

export default App;
