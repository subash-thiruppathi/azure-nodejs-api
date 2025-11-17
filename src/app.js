const express = require('express');
const multer = require('multer');
const storageService = require('./storageService');

const app = express();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and text files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, and TXT files are allowed.'));
    }
  }
});

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
    monitoring: appInsights && appInsights.defaultClient ? 'enabled' : 'disabled',
    storage: storageService.isConfigured ? 'enabled' : 'disabled'
  });
});

// Get all tasks (limited by MAX_TASKS)
app.get('/api/tasks', (req, res) => {
  const startTime = Date.now();
  
  const allTasks = [
    { id: 1, title: 'Learn Azure App Service', completed: true },
    { id: 2, title: 'Deploy to Azure', completed: true },
    { id: 3, title: 'Master DevOps', completed: false },
    { id: 4, title: 'Configure Environment Variables', completed: true },
    { id: 5, title: 'Add Application Insights', completed: true }
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

// Upload file endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!storageService.isConfigured) {
      return res.status(503).json({ 
        error: 'Storage service not configured',
        message: 'Azure Storage connection string is missing'
      });
    }

    // Upload to Azure Blob Storage
    const result = await storageService.uploadFile(req.file);

    // Track upload event
    if (appInsights && appInsights.defaultClient) {
      appInsights.defaultClient.trackEvent({
        name: 'FileUploaded',
        properties: {
          fileName: result.originalName,
          fileSize: result.size,
          contentType: result.contentType
        }
      });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: result
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Track error
    if (appInsights && appInsights.defaultClient) {
      appInsights.defaultClient.trackException({ exception: error });
    }

    res.status(500).json({ 
      error: 'Failed to upload file',
      message: error.message 
    });
  }
});

// List all uploaded files
app.get('/api/files', async (req, res) => {
  try {
    if (!storageService.isConfigured) {
      return res.status(503).json({ 
        error: 'Storage service not configured' 
      });
    }

    const files = await storageService.listFiles();

    res.json({
      success: true,
      count: files.length,
      files: files
    });

  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ 
      error: 'Failed to list files',
      message: error.message 
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Azure Node.js API',
    version: API_VERSION,
    environment: ENVIRONMENT,
    endpoints: [
      '/api/health',
      '/api/tasks',
      '/api/upload (POST)',
      '/api/files'
    ],
    monitoring: appInsights && appInsights.defaultClient ? 'Application Insights enabled' : 'No monitoring',
    storage: storageService.isConfigured ? 'Azure Blob Storage enabled' : 'Storage not configured'
  });
});

module.exports = app;