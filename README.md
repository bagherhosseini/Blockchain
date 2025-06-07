# BitcoinChain - Production-Ready Blockchain Implementation

A Node.js blockchain application implementing Proof-of-Work consensus with complex object storage and comprehensive validation.

## 🚀 Features

- **Proof-of-Work Mining** - Configurable difficulty blockchain mining
- **Complex Objects** - Store User and Transaction instances with full validation
- **REST API** - Complete API for blockchain operations
- **MVC Architecture** - Clean separation of concerns
- **Centralized Error Handling** - Professional error management
- **JSON Persistence** - Blockchain data persists between restarts
- **Test-Driven Development** - Comprehensive test coverage
- **Security First** - Helmet.js, CORS, input validation
- **ES6 Modules** - Modern JavaScript implementation

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0

## 🛠️ Setup & Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd uppgift2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

4. **Run tests**
   ```bash
   # Run all tests
   npm test
   
   # Run tests in watch mode
   npm run test:watch
   ```

## 🌐 API Endpoints

The server runs on `http://localhost:3000` by default.

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API documentation and welcome |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/blocks` | Create new block with complex objects |
| `GET` | `/api/blocks` | Get all blocks in blockchain |
| `GET` | `/api/blocks/:index` | Get specific block by index |
| `GET` | `/api/blocks/type/:type` | Get blocks containing specific object type |
| `GET` | `/api/objects/:id` | Find object by ID across blockchain |
| `GET` | `/api/blockchain/stats` | Get blockchain statistics |
| `GET` | `/api/blockchain/validate` | Validate entire blockchain |
| `POST` | `/api/blockchain/backup` | Create blockchain backup |

## 📝 Usage Examples

### Creating a Block with Complex Objects

```bash
curl -X POST http://localhost:3000/api/blocks \
  -H "Content-Type: application/json" \
  -d '{
    "complexObjects": [
      {
        "type": "User",
        "id": "user-123",
        "name": "John Doe",
        "email": "john@example.com",
        "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "balance": 1000,
        "metadata": {"role": "admin"}
      },
      {
        "type": "Transaction",
        "id": "tx-456",
        "fromAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "toAddress": "0xfedcba0987654321fedcba0987654321fedcba09",
        "amount": 100,
        "transactionType": "transfer",
        "metadata": {"purpose": "payment"}
      }
    ],
    "difficulty": 2
  }'
```

### Getting All Blocks

```bash
curl http://localhost:3000/api/blocks
```

### Validating Blockchain

```bash
curl http://localhost:3000/api/blockchain/validate
```

## 🗂️ Project Structure

```
uppgift2/
├── src/
│   ├── controllers/          # Request handlers (MVC Controllers)
│   │   └── BlockchainController.js
│   ├── middleware/           # Express middleware
│   │   └── errorHandler.js
│   ├── models/              # Data models (MVC Models)
│   │   ├── Block.js
│   │   ├── User.js
│   │   └── Transaction.js
│   ├── routes/              # API routes (MVC Views)
│   │   └── blockchainRoutes.js
│   ├── services/            # Business logic services
│   │   └── BlockchainService.js
│   ├── tests/               # TDD test files
│   │   ├── Block.test.js
│   │   └── setup.js
│   └── utils/               # Utility functions
├── data/                    # JSON persistence
│   └── blockchain.json
├── server.js                # Main application entry point
├── package.json
└── jest.config.js
```

## 🧪 Testing

The project uses Jest for testing with comprehensive coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode for development
npm run test:watch
```

**Test Coverage:**
- Block creation and validation
- Proof-of-Work mining
- Complex object handling
- Hash calculation and verification
- Blockchain integrity validation

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
HOST=localhost
NODE_ENV=development
CORS_ORIGIN=*
```

### Mining Difficulty

Default mining difficulty is 4. You can adjust it when creating blocks:

```json
{
  "complexObjects": [...],
  "difficulty": 2
}
```

## 🏗️ Architecture

### MVC Pattern Implementation

- **Models** (`src/models/`): Data structures and validation logic
- **Views** (`src/routes/`): API endpoints and request routing
- **Controllers** (`src/controllers/`): Business logic coordination

### Complex Objects

The blockchain stores instances of:

- **User**: Complete user profiles with wallet addresses and balances
- **Transaction**: Financial transactions with validation and metadata

### Error Handling

Centralized error handling with:
- Custom error types (`BlockchainError`, `ValidationError`, etc.)
- Consistent error response format
- Proper HTTP status codes
- Development vs production error details

## 📊 Performance

- **Mining Performance**: Configurable difficulty for different environments
- **Memory Management**: Efficient object serialization and validation
- **Error Recovery**: Graceful handling of invalid blocks and data corruption

## 🔒 Security

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing configuration
- **Input Validation**: Joi schema validation
- **Rate Limiting**: Prepared for production rate limiting
- **Proof-of-Work**: Prevents blockchain manipulation

## 🚀 Deployment

For production deployment:

1. Set environment variables
2. Use process manager (PM2 recommended)
3. Configure reverse proxy (Nginx)
4. Set up monitoring and logging

```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name blockchain-api
```

## 📈 Monitoring

- Health check endpoint: `GET /api/health`
- Blockchain statistics: `GET /api/blockchain/stats`
- Mining progress logging
- Error tracking and reporting

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Run tests: `npm test`
4. Commit changes: `git commit -m 'Add feature'`
5. Push to branch: `git push origin feature-name`
6. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with:** Node.js, Express.js, Jest, Joi, Helmet.js 