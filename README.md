# Azure Node.js API

A Node.js API application designed for Azure deployment.

## Project Structure

```
azure-nodejs-api/
├── src/
│   ├── app.js       # Express application setup
│   └── server.js    # Server entry point
├── .gitignore
├── package.json
└── README.md
```

## Installation

```bash
npm install
```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api` - Sample API endpoint

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
```

## Deployment to Azure

This application is ready for deployment to Azure App Service or Azure Container Apps.

## License

ISC
