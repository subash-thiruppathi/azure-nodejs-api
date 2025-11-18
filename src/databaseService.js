const { Pool } = require('pg');

class DatabaseService {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.log('Database not configured - missing DATABASE_URL');
      this.isConfigured = false;
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: connectionString,
        ssl: {
          rejectUnauthorized: false // Required for Azure PostgreSQL
        }
      });
      
      this.isConfigured = true;
      console.log('Database service initialized');
      
      // Test connection
      this.testConnection();
    } catch (error) {
      console.error('Error initializing database:', error.message);
      this.isConfigured = false;
    }
  }

  async testConnection() {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('Database connected successfully at:', result.rows[0].now);
    } catch (error) {
      console.error('Database connection test failed:', error.message);
    }
  }

  async initializeTables() {
    if (!this.isConfigured) {
      throw new Error('Database not configured');
    }

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await this.pool.query(createTableQuery);
      console.log('Tasks table initialized');
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }

  async getAllTasks() {
    if (!this.isConfigured) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async getTaskById(id) {
    if (!this.isConfigured) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async createTask(title, description = '') {
    if (!this.isConfigured) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
      [title, description]
    );
    return result.rows[0];
  }

  async updateTask(id, title, description, completed) {
    if (!this.isConfigured) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      `UPDATE tasks 
       SET title = $1, description = $2, completed = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      [title, description, completed, id]
    );
    return result.rows[0];
  }

  async deleteTask(id) {
    if (!this.isConfigured) {
      throw new Error('Database not configured');
    }

    const result = await this.pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection closed');
    }
  }
}

module.exports = new DatabaseService();