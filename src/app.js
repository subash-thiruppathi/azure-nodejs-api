const express = require('express');
const multer = require('multer');
const storageService = require('./storageService');
const databaseService = require('./databaseService');

const app = express();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
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

// Get Application Insights client
let appInsights;
try {
  appInsights = require('applicationinsights');
} catch (e) {
  console.log('Application Insights not available');
}

// Initialize database tables on startup
if (databaseService.isConfigured) {
  databaseService.initializeTables().catch(err => {
    console.error('Failed to initialize database tables:', err);
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
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
    storage: storageService.isConfigured ? 'enabled' : 'disabled',
    database: databaseService.isConfigured ? 'enabled' : 'disabled'
  });
});

// ==================== DATABASE TASK ENDPOINTS ====================

// Get all tasks from database
app.get('/api/db/tasks', async (req, res) => {
  try {
    if (!databaseService.isConfigured) {
      return res.status(503).json({ 
        error: 'Database not configured',
        message: 'DATABASE_URL environment variable is missing'
      });
    }

    const tasks = await databaseService.getAllTasks();

    if (appInsights && appInsights.defaultClient) {
      appInsights.defaultClient.trackEvent({
        name: 'DatabaseTasksRetrieved',
        properties: { count: tasks.length }
      });
    }

    res.json({
      success: true,
      count: tasks.length,
      tasks: tasks
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    
    if (appInsights && appInsights.defaultClient) {
      appInsights.defaultClient.trackException({ exception: error });
    }

    res.status(500).json({ 
      error: 'Failed to retrieve tasks',
      message: error.message 
    });
  }
});

// Get single task by ID
app.get('/api/db/tasks/:id', async (req, res) => {
  try {
    if (!databaseService.isConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const task = await databaseService.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({ 
        error: 'Task not found',
        id: req.params.id 
      });
    }

    res.json({
      success: true,
      task: task
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve task',
      message: error.message 
    });
  }
});

// Create new task
app.post('/api/db/tasks', async (req, res) => {
  try {
    if (!databaseService.isConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Title is required' 
      });
    }

    const task = await databaseService.createTask(title, description);

    if (appInsights && appInsights.defaultClient) {
      appInsights.defaultClient.trackEvent({
        name: 'TaskCreated',
        properties: { taskId: task.id }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: task
    });

  } catch (error) {
    console.error('Create task error:', error);
    
    if (appInsights && appInsights.defaultClient) {
      appInsights.defaultClient.trackException({ exception: error });
    }

    res.status(500).json({ 
      error: 'Failed to create task',
      message: error.message 
    });
  }
});

// Update task
app.put('/api/db/tasks/:id', async (req, res) => {
  try {
    if (!databaseService.isConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { title, description, completed } = req.body;
    const id = req.params.id;

    if (!title) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Title is required' 
      });
    }

    const task = await databaseService.updateTask(
      id, 
      title, 
      description || '', 
      completed !== undefined ? completed : false
    );

    if (!task) {
      return res.status(404).json({ 
        error: 'Task not found',
        id: id 
      });
    }

    if (appInsights && appInsights.defaultClient) {
      appInsights.defaultClient.trackEvent({
        name: 'TaskUpdated',
        properties: { taskId: task.id }
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: task
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ 
      error: 'Failed to update task',
      message: error.message 
    });
  }
});

// Delete task
app.delete('/api/db/tasks/:id', async (req, res) => {
  try {
    if (!databaseService.isConfigured) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const task = await databaseService.deleteTask(req.params.id);

    if (!task) {
      return res.status(404).json({ 
        error: 'Task not found',
        id: req.params.id 
      });
    }

    if (appInsights && appInsights.defaultClient) {
      appInsights.defaultClient.trackEvent({
        name: 'TaskDeleted',
        properties: { taskId: task.id }
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
      task: task
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ 
      error: 'Failed to delete task',
      message: error.message 
    });
  }
});

// ==================== FILE UPLOAD ENDPOINTS ====================

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

    const result = await storageService.uploadFile(req.file);

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
    
    if (appInsights && appInsights.defaultClient) {
      appInsights.defaultClient.trackException({ exception: error });
    }

    res.status(500).json({ 
      error: 'Failed to upload file',
      message: error.message 
    });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    if (!storageService.isConfigured) {
      return res.status(503).json({ error: 'Storage service not configured' });
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

// ==================== ROOT ENDPOINT ====================

app.get('/', (req, res) => {
  res.json({
    message: 'Azure Node.js API with PostgreSQL',
    version: API_VERSION,
    environment: ENVIRONMENT,
    endpoints: [
      '/api/health',
      '/api/db/tasks (GET, POST)',
      '/api/db/tasks/:id (GET, PUT, DELETE)',
      '/api/upload (POST)',
      '/api/files'
    ],
    monitoring: appInsights && appInsights.defaultClient ? 'Application Insights enabled' : 'No monitoring',
    storage: storageService.isConfigured ? 'Azure Blob Storage enabled' : 'Storage not configured',
    database: databaseService.isConfigured ? 'PostgreSQL enabled' : 'Database not configured'
  });
});

module.exports = app;