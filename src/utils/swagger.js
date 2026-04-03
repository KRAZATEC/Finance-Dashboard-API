const swaggerJsdoc = require('swagger-jsdoc');
const { version } = require('../../package.json');

const options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Finance Dashboard API',
      version,
      description: 'A RESTful backend for a role-based financial management system.',
      contact: {
        name: 'API Support',
        url: 'https://example.com/support',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Current Environment',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Resource not found',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/app.js'], // paths to files containing annotations
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
