

import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import './App.css'
import { motion } from "framer-motion"


function App() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [taskMeta, setTaskMeta] = useState({}) // Store priority & category client-side
  const [selectedPriority, setSelectedPriority] = useState('medium')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [demoMode, setDemoMode] = useState(false)
  const [nextId, setNextId] = useState(1)

  // 1. Récupérer les tâches au chargement
  useEffect(() => {
    fetchTasks()
    // Load metadata from localStorage
    const savedMeta = localStorage.getItem('taskMeta')
    if (savedMeta) {
      setTaskMeta(JSON.parse(savedMeta))
    }
    // Load demo mode tasks from localStorage if available
    const savedTasks = localStorage.getItem('demoTasks')
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
      setDemoMode(true)
    }
  }, [])

  // Save demo mode tasks to localStorage
  useEffect(() => {
    if (demoMode) {
      localStorage.setItem('demoTasks', JSON.stringify(tasks))
    }
  }, [tasks, demoMode])

  // Save metadata to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('taskMeta', JSON.stringify(taskMeta))
  }, [taskMeta])

  const fetchTasks = () => {
    axios.get('http://127.0.0.1:8000/api/main/')
      .then(res => {
        setTasks(res.data)
        setDemoMode(false)
        console.log('[v0] Successfully connected to Django backend')
      })
      .catch(err => {
        console.log('[v0] Error fetching tasks:', err.message)
        console.log('[v0] Backend not available - switching to demo mode')
        // Switch to demo mode with sample data
        setDemoMode(true)
        const demoTasks = [
          { id: 1, title: 'Complete project documentation', completed: false },
          { id: 2, title: 'Review pull requests', completed: true },
          { id: 3, title: 'Prepare presentation slides', completed: false }
        ]
        setTasks(demoTasks)
        setTaskMeta({
          1: { priority: 'high', category: 'Work' },
          2: { priority: 'medium', category: 'Development' },
          3: { priority: 'high', category: 'Work' }
        })
        setNextId(4)
      })
  }

  // 2. Ajouter une tâche
  const addTask = () => {
    if(!newTask.trim()) return;
    
    if (demoMode) {
      // Demo mode - add task locally
      const newTaskObj = {
        id: nextId,
        title: newTask,
        completed: false
      }
      setTasks([newTaskObj, ...tasks])
      setTaskMeta({
        ...taskMeta,
        [nextId]: {
          priority: selectedPriority,
          category: selectedCategory
        }
      })
      setNextId(nextId + 1)
      setNewTask('')
      setSelectedCategory('')
    } else {
      // Backend mode - make API call
      axios.post('http://127.0.0.1:8000/api/main/', {
        title: newTask,
        completed: false
      })
      .then(res => {
        setTasks([res.data, ...tasks])
        setTaskMeta({
          ...taskMeta,
          [res.data.id]: {
            priority: selectedPriority,
            category: selectedCategory
          }
        })
        setNewTask('')
        setSelectedCategory('')
      })
      .catch(err => {
        console.log('[v0] Error adding task:', err.message)
      })
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTask()
    }
  }

  // 3. Supprimer une tâche
  const deleteTask = (id) => {
    if (demoMode) {
      // Demo mode - delete locally
      setTasks(tasks.filter(t => t.id !== id))
      const newMeta = {...taskMeta}
      delete newMeta[id]
      setTaskMeta(newMeta)
    } else {
      // Backend mode - make API call
      axios.delete(`http://127.0.0.1:8000/api/main/${id}/`)
        .then(() => {
          setTasks(tasks.filter(t => t.id !== id))
          const newMeta = {...taskMeta}
          delete newMeta[id]
          setTaskMeta(newMeta)
        })
        .catch(err => {
          console.log('[v0] Error deleting task:', err.message)
        })
    }
  }

  // 4. Marquer comme fait (Update)
  const toggleTask = (task) => {
    if (demoMode) {
      // Demo mode - toggle locally
      setTasks(tasks.map(t => t.id === task.id ? {...t, completed: !t.completed} : t))
    } else {
      // Backend mode - make API call
      axios.put(`http://127.0.0.1:8000/api/main/${task.id}/`, {
        ...task,
        completed: !task.completed
      })
      .then(res => {
        setTasks(tasks.map(t => t.id === task.id ? res.data : t))
      })
      .catch(err => {
        console.log('[v0] Error toggling task:', err.message)
      })
    }
  }

  // 5. Change priority
  const changePriority = (taskId, priority) => {
    setTaskMeta({
      ...taskMeta,
      [taskId]: {
        ...taskMeta[taskId],
        priority
      }
    })
  }

  // Get priority info
  const getPriorityInfo = (priority) => {
    const priorities = {
      high: { label: 'High', color: '#ef4444', icon: '🔥' },
      medium: { label: 'Medium', color: '#f59e0b', icon: '⚡' },
      low: { label: 'Low', color: '#10b981', icon: '🕐' }
    }
    return priorities[priority] || priorities.medium
  }

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const meta = taskMeta[task.id] || { priority: 'medium', category: '' }
      
      // Search filter
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           meta.category?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Priority filter
      const matchesPriority = filterPriority === 'all' || meta.priority === filterPriority
      
      // Status filter
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'completed' && task.completed) ||
                           (filterStatus === 'active' && !task.completed)
      
      return matchesSearch && matchesPriority && matchesStatus
    })
  }, [tasks, taskMeta, searchQuery, filterPriority, filterStatus])

  // Statistics
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.completed).length
    const total = tasks.length
    const highPriority = tasks.filter(t => taskMeta[t.id]?.priority === 'high' && !t.completed).length
    
    return {
      total,
      completed,
      active: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      highPriority
    }
  }, [tasks, taskMeta])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set()
    Object.values(taskMeta).forEach(meta => {
      if (meta.category) cats.add(meta.category)
    })
    return Array.from(cats)
  }, [taskMeta])

  
  return (
    <div className="app-layout">
      <div className="app-shell">
  
        {/* HEADER */}
        <div className="app-container">
          <h1>Task Command Center</h1>
          <p className="subtitle">
            Organize, prioritize, and accomplish your goals
          </p>
        </div>
  
        {/* STATS */}
        <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.completionRate}%</div>
          <div className="stat-label">Completion Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active Tasks</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">{stats.highPriority}</div>
          <div className="stat-label">High Priority</div>
        </div>
        </div>
  
        {/* ADD TASK */}
        <div className="add-task-section">
        <div className="input-wrapper">
          <input 
            type="text" 
            value={newTask} 
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What needs to be done?" 
            className="task-input"
          />
          <input 
            type="text" 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            placeholder="Category (optional)" 
            className="category-input"
            list="categories"
          />
          <datalist id="categories">
            {categories.map(cat => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>
        
        <div className="priority-selector">
          <label>Priority:</label>
          <div className="priority-buttons">
            {['high', 'medium', 'low'].map(p => (
              <button
                key={p}
                className={`priority-btn ${selectedPriority === p ? 'active' : ''} priority-${p}`}
                onClick={() => setSelectedPriority(p)}
              >
                {getPriorityInfo(p).icon} {getPriorityInfo(p).label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={addTask} className="add-btn">
          Add Task
        </button>
      </div>
        
  
        {/* FILTERS */}
        <div className="filters-section">
        <div className="search-wrapper">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="search-input"
          />
        </div>

        <div className="filter-buttons">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Tasks</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>

          <select 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
        </div>
  
        {/* TASKS */}
        <div className="tasks-container">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <p>{searchQuery || filterPriority !== 'all' || filterStatus !== 'all' 
              ? 'No tasks match your filters' 
              : 'No tasks yet. Add one to get started!'}</p>
          </div>
        ) : (
          <div className="tasks-list">
            {filteredTasks.map(task => {
              const meta = taskMeta[task.id] || { priority: 'medium', category: '' }
              const priorityInfo = getPriorityInfo(meta.priority)
              
              return (
                <div 
                  key={task.id} 
                  className={`task-item ${task.completed ? 'completed' : ''} priority-${meta.priority}`}
                >
                  <div className="task-content">
                    <button 
                      className="checkbox"
                      onClick={() => toggleTask(task)}
                      aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {task.completed ? '✓' : ''}
                    </button>
                    
                    <div className="task-details">
                      <div className="task-title">{task.title}</div>
                      <div className="task-meta">
                        <span 
                          className="priority-badge"
                          style={{ backgroundColor: priorityInfo.color }}
                        >
                          {priorityInfo.icon} {priorityInfo.label}
                        </span>
                        {meta.category && (
                          <span className="category-badge">{meta.category}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="task-actions">
                    <select 
                      value={meta.priority}
                      onChange={(e) => changePriority(task.id, e.target.value)}
                      className="priority-dropdown"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="high">🔥 High</option>
                      <option value="medium">⚡ Medium</option>
                      <option value="low">🕐 Low</option>
                    </select>
                    
                    <button 
                      onClick={() => deleteTask(task.id)} 
                      className="delete-btn"
                      aria-label="Delete task"
                    >
                     ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
      </div>

      {/* images */}
      <div className="visual-right-layer">
        <motion.img
          src="/images/i3.png" 
          className="visual-img main"
          animate={{ y: [0, -14, 0], rotate: [-0.4, 0.4, -0.4] }}
          transition={{ duration: 7, ease: "easeInOut", repeat: Infinity }}
        />

        <motion.img
          src="/images/i3.png"
          className="visual-img secondary"
          animate={{ y: [0, 10, 0], rotate: [0.5, -0.3, 0.5] }}
          transition={{ duration: 5.5, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.img
          src="/images/i3.png"
          className="visual-img tertiary"
          animate={{ y: [0, -8, 0], rotate: [-0.3, 0.2, -0.3] }}
          transition={{ duration: 6.2, ease: "easeInOut", repeat: Infinity }}
        />























      </div>
    </div>
  )
}

export default App
