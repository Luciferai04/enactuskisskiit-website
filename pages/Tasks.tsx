
import React, { useState } from 'react';
import { Task, TaskStatus, User } from '../types';

interface TasksProps {
  user: User;
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

const Tasks: React.FC<TasksProps> = ({ user, tasks, onUpdateTask }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  // Fixed: assigneeId changed to assigneeIds.includes(user.id)
  const userTasks = user.role === 'ADMIN' ? tasks : tasks.filter(t => t.assigneeIds.includes(user.id));

  const statusMap = {
    [TaskStatus.TODO]: 'To Do',
    [TaskStatus.IN_PROGRESS]: 'In Progress',
    [TaskStatus.REVIEW]: 'Review',
    [TaskStatus.COMPLETED]: 'Completed'
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED: return 'bg-green-100 text-green-700';
      case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700';
      case TaskStatus.REVIEW: return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border enactus-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Assigned Tasks</h1>
          <p className="text-sm text-gray-500">Only showing items under your scope of work.</p>
        </div>
        <div className="flex items-center space-x-2">
           <div className="flex border enactus-border rounded-lg overflow-hidden">
             <button className="px-4 py-2 bg-gray-50 text-xs font-bold border-r enactus-border">List</button>
             <button className="px-4 py-2 text-xs font-bold text-gray-400">Calendar</button>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border enactus-border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b enactus-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Task Name</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y enactus-border">
            {userTasks.map(task => (
              <tr 
                key={task.id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedTask(task)}
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{task.title}</span>
                    <span className="text-xs text-gray-400 mt-0.5">Project ID: {task.projectId}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusColor(task.status)}`}>
                    {statusMap[task.status]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-bold ${
                    task.priority === 'HIGH' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{task.deadline}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full enactus-yellow" 
                        style={{ width: `${task.completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500">{task.completionPercentage}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Task Modal - Mock Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-8 overflow-auto animate-slide-in-right">
            <div className="flex justify-between items-start mb-8">
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
              <div className="flex space-x-2">
                <button 
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-bold hover:bg-gray-200"
                  onClick={() => onUpdateTask(selectedTask.id, { status: TaskStatus.COMPLETED, completionPercentage: 100 })}
                >
                  Mark Complete
                </button>
                <button className="px-4 py-2 enactus-yellow text-white rounded-lg text-sm font-bold shadow-md">
                  Update
                </button>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedTask.projectId}</span>
                <h2 className="text-2xl font-bold mt-1">{selectedTask.title}</h2>
                <p className="text-gray-500 mt-4 leading-relaxed">{selectedTask.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 py-6 border-y enactus-border">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                  <p className="mt-1 font-semibold">{statusMap[selectedTask.status]}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Deadline</label>
                  <p className="mt-1 font-semibold">{selectedTask.deadline}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-4 flex items-center space-x-2">
                  <i className="fa-solid fa-list-check text-gray-400"></i>
                  <span>Subtasks</span>
                </h4>
                <div className="space-y-3">
                  {selectedTask.subtasks.map(st => (
                    <div key={st.id} className="flex items-center space-x-3 p-3 rounded-xl border border-dashed enactus-border hover:border-solid hover:bg-gray-50 transition-all">
                      <input type="checkbox" checked={st.isCompleted} className="rounded accent-[#F2C94C] w-4 h-4" />
                      <span className={`text-sm ${st.isCompleted ? 'line-through text-gray-400' : ''}`}>{st.title}</span>
                    </div>
                  ))}
                  <button className="text-xs font-bold enactus-yellow-text hover:underline mt-2">+ Add Subtask</button>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-4">Activity & Comments</h4>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <textarea 
                    placeholder="Add an update or comment... (use @ to mention)" 
                    className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 min-h-[100px]"
                  ></textarea>
                  <div className="mt-2 flex justify-between items-center">
                    <button className="text-xs text-gray-400"><i className="fa-solid fa-paperclip mr-1"></i> Attach file</button>
                    <button className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold">Post Update</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
