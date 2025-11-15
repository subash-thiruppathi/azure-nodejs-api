const express = require('express');
const app = express();

app.use(express.json());

// Get environment variables
const API_VERSION = process.env.API_VERSION || '1.0.0';
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';
const MAX_TASKS = parseInt(process.env.MAX_TASKS) || 10;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: ENVIRONMENT,
    version: API_VERSION
  });
});

// Get all tasks (limited by MAX_TASKS)
app.get('/api/tasks', (req, res) => {
  const allTasks = [
    { id: 1, title: 'Learn Azure App Service', completed: false },
    { id: 2, title: 'Deploy to Azure', completed: true },
    { id: 3, title: 'Master DevOps', completed: false },
    { id: 4, title: 'Configure Environment Variables', completed: false },
    { id: 5, title: 'Add Application Insights', completed: false }
  ];
  
  // Limit tasks based on MAX_TASKS environment variable
  const tasks = allTasks.slice(0, MAX_TASKS);
  
  res.json({
    tasks,
    total: tasks.length,
    maxAllowed: MAX_TASKS,
    environment: ENVIRONMENT
  });
});

// Get task by ID
app.get('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = { id: taskId, title: `Task ${taskId}`, completed: false };
  res.json(task);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Azure Node.js API',
    version: API_VERSION,
    environment: ENVIRONMENT,
    endpoints: ['/api/health', '/api/tasks']
  });
});

module.exports = app;