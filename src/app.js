const express = require('express');
const app = express();

app.use(express.json());

// Get environment variables
const API_VERSION = process.env.API_VERSION || '1.0.0';
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';
const MAX_TASKS = parseInt(process.env.MAX_TASKS) || 10;

// Get Application Insights client
let appInsights;
try {
  appInsights = require('applicationinsights');
} catch (e) {
  console.log('Application Insights not available');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  // Track custom event
  if (appInsights && appInsights.defaultClient) {
    appInsights.defaultClient.trackEvent({
      name: 'HealthCheckCalled',
      properties: {
        environment: ENVIRONMENT,
        version: API_VERSION
      }
    });
  }
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: ENVIRONMENT,
    version: API_VERSION,
    monitoring: appInsights && appInsights.defaultClient ? 'enabled' : 'disabled'
  });
});

// Get all tasks (limited by MAX_TASKS)
app.get('/api/tasks', (req, res) => {
  const startTime = Date.now();
  
  const allTasks = [
    { id: 1, title: 'Learn Azure App Service', completed: false },
    { id: 2, title: 'Deploy to Azure', completed: true },
    { id: 3, title: 'Master DevOps', completed: false },
    { id: 4, title: 'Configure Environment Variables', completed: true },
    { id: 5, title: 'Add Application Insights', completed: false }
  ];
  
  // Limit tasks based on MAX_TASKS environment variable
  const tasks = allTasks.slice(0, MAX_TASKS);
  
  // Track custom metric
  if (appInsights && appInsights.defaultClient) {
    const duration = Date.now() - startTime;
    appInsights.defaultClient.trackMetric({
      name: 'TasksRetrievalTime',
      value: duration
    });
    
    appInsights.defaultClient.trackEvent({
      name: 'TasksRetrieved',
      properties: {
        count: tasks.length,
        maxAllowed: MAX_TASKS
      }
    });
  }
  
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
  
  // Track the task ID being requested
  if (appInsights && appInsights.defaultClient) {
    appInsights.defaultClient.trackEvent({
      name: 'TaskByIdRequested',
      properties: {
        taskId: taskId
      }
    });
  }
  
  const task = { id: taskId, title: `Task ${taskId}`, completed: false };
  res.json(task);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Azure Node.js API',
    version: API_VERSION,
    environment: ENVIRONMENT,
    endpoints: ['/api/health', '/api/tasks'],
    monitoring: appInsights && appInsights.defaultClient ? 'Application Insights enabled' : 'No monitoring'
  });
});

module.exports = app;