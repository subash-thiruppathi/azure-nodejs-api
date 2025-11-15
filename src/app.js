const express = require('express');
const app = express();

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  const tasks = [
    { id: 1, title: 'Learn Azure App Service', completed: false },
    { id: 2, title: 'Deploy to Azure', completed: false },
    { id: 3, title: 'Master DevOps', completed: false }
  ];
  res.json(tasks);
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
    version: '1.0.0',
    endpoints: ['/api/health', '/api/tasks']
  });
});

module.exports = app;