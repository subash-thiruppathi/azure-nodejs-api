const { BlobServiceClient } = require('@azure/storage-blob');

class StorageService {
  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString) {
      console.log('Azure Storage not configured - missing connection string');
      this.isConfigured = false;
      return;
    }

    try {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      this.containerName = 'learning-azure';
      this.isConfigured = true;
      console.log('Azure Storage service initialized');
    } catch (error) {
      console.error('Error initializing Azure Storage:', error.message);
      this.isConfigured = false;
    }
  }

  async uploadFile(file) {
    if (!this.isConfigured) {
      throw new Error('Storage service not configured');
    }

    try {
      // Get container client
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Create unique blob name
      const timestamp = Date.now();
      const blobName = `${timestamp}-${file.originalname}`;
      
      // Get block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Upload file
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype
        }
      });
      
      // Return blob URL
      return {
        fileName: blobName,
        originalName: file.originalname,
        url: blockBlobClient.url,
        size: file.size,
        contentType: file.mimetype,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async listFiles() {
    if (!this.isConfigured) {
      throw new Error('Storage service not configured');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const files = [];

      for await (const blob of containerClient.listBlobsFlat()) {
        files.push({
          name: blob.name,
          size: blob.properties.contentLength,
          contentType: blob.properties.contentType,
          createdOn: blob.properties.createdOn,
          url: `${containerClient.url}/${blob.name}`
        });
      }

      return files;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }
}

module.exports = new StorageService();