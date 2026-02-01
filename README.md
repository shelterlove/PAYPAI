<div align="center">

<img src="./images/photo_2026-01-31_21-03-42.png" alt="PayPai Logo" width="200">

# PayPai - AI-Powered Smart Contract Wallet

**Your AI Companion for Effortless Blockchain Transactions** 🤖💰

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Kite AI](https://img.shields.io/badge/Built%20with-Kite%20AI-orange)](https://gokite.ai)
[![Powered by Qwen](https://img.shields.io/badge/AI-Qwen-green)](https://tongyi.aliyun.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

[English](README.md) | [中文](README_CN.md)

[🎯 Live Demo](#-demo) • [📖 Documentation](#-project-structure) • [🚀 Quick Start](#-quick-start) • [💡 Features](#-core-features)

</div>

---

## 🌟 Overview

**PayPai** is an innovative AI-powered Account Abstraction wallet that bridges the gap between natural language and blockchain transactions. Simply tell PayPai what you want to do in plain English, and watch as it handles the complex blockchain operations for you!

### 💡 The Problem

Traditional Web3 wallets are complex and intimidating for everyday users:
- ❌ Confusing transaction parameters (gas, nonce, hex data)
- ❌ Complex address management
- ❌ No intelligent spending controls
- ❌ Steep learning curve for newcomers

### ✨ Our Solution

PayPai transforms blockchain interaction through:
- ✅ **Natural Language Interface**: "Send 10 USDT to Alice" → Done!
- ✅ **AI-Powered Transaction Parsing**: Qwen API understands your intent
- ✅ **Smart Budget Management**: Automated spending rules and limits
- ✅ **Gasless Experience**: Account Abstraction simplifies transactions
- ✅ **User-Friendly**: No blockchain expertise required

### 🎯 Core Value

**Lower the barrier to Web3 adoption by making blockchain transactions as easy as chatting with a friend.**

---

## 🏆 Highlights & Innovation

### 🔥 Key Innovations

1. **AI + Web3 Fusion**
   - Seamless integration of Qwen AI with Kite AA SDK
   - Natural language processing for blockchain operations
   - Context-aware conversation handling

2. **Smart Contract Wallet with Spending Rules**
   - `ClientAgentVault`: UUPS upgradeable contract
   - Configurable budget limits and time windows
   - Whitelist/blacklist management for recipients

3. **True Account Abstraction**
   - Gasless transactions powered by Kite AI
   - No seed phrase management required
   - Multi-wallet connection support

4. **Intelligent AI Agent**
   - Multi-turn conversation support
   - Transaction parameter extraction
   - Safety validation before execution

### 🎨 User Experience

```
User: "Send 5 tokens to 0x1234...5678"
PayPai: "I'll send 5 ETH to 0x1234...5678. Confirm?"
User: "Yes"
PayPai: ✅ "Transaction sent! Hash: 0xabcd..."
```

---

## 🎯 Demo

> **Note**: This is a hackathon project. Below are planned demo materials.

### 📸 Screenshots

<!-- Add screenshots here -->
*Coming soon: UI screenshots showcasing the natural language interface*

### 🎥 Demo Video

<!-- Add demo video link here -->
*Coming soon: Full walkthrough video*

### 🔗 Live Demo

<!-- Add live demo link if available -->
*Coming soon: Deployed application link*

---

## 🛠️ Tech Stack

### 🏆 Sponsor Technologies

<table>
<tr>
<td width="50%">

**🔷 Kite AI SDK**
- Account Abstraction (ERC-4337)
- Gasless transactions
- Smart contract wallet deployment
- User operation bundling

</td>
<td width="50%">

**🤖 Qwen API**
- Natural language understanding
- Intent recognition
- Transaction parameter extraction
- Multi-turn conversation

</td>
</tr>
</table>

### 🏗️ Full Technology Stack

**Frontend**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- RainbowKit (Wallet Connection)

**Web3**
- Kite AA SDK (gokite-aa-sdk)
- ethers.js v6
- Wagmi v2
- Viem

**AI**
- Qwen API (阿里云千问)
- Natural Language Processing
- Intent Classification

**Smart Contracts**
- Solidity
- Hardhat
- UUPS Proxy Pattern
- ClientAgentVault

**Network**
- Kite Testnet

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│     (Natural Language Input + Wallet Management)         │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  AI Agent Layer                          │
│   Qwen API → Intent Recognition → Parameter Extraction   │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│            Account Abstraction Layer                     │
│   Kite AA SDK → User Operation → Bundler → Blockchain   │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Smart Contract Layer                        │
│  ClientAgentVault → Spending Rules → Automated Payments  │
└─────────────────────────────────────────────────────────┘
```

### Architecture Layers

1. **User Interface Layer**
   - Natural language command input
   - Wallet connection (RainbowKit)
   - Transaction history visualization
   - Dark/Light theme support

2. **AI Agent Layer**
   - Qwen API integration for NLP
   - Intent classification
   - Transaction parameter extraction
   - Safety validation

3. **Account Abstraction Layer**
   - Kite AA SDK integration
   - Gasless transaction handling
   - User operation bundling
   - Meta-transaction support

4. **Smart Contract Layer**
   - ClientAgentVault contract
   - Configurable spending rules
   - Budget management
   - Automated payment execution

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A wallet with Kite testnet tokens
- Qwen API key ([Get it here](https://dashscope.console.aliyun.com/))

### 1. Clone the Repository

```bash
git clone https://github.com/LuckDogGuan/PAYPAI.git
cd PAYPAI
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Update the following values in `.env.local`:

```env
# Required: Your Qwen API key for AI agent
QWEN_API_KEY=your_qwen_api_key_here

# Required: Deployed contract addresses (see deployment guide)
NEXT_PUBLIC_VAULT_FACTORY=0x...
NEXT_PUBLIC_VAULT_IMPLEMENTATION_ADDRESS=0x...

# Optional: For development testing
PRIVATE_KEY=your_development_private_key
EXECUTOR_PRIVATE_KEY=your_executor_private_key
NEXT_PUBLIC_EXECUTOR_ADDRESS=0x...
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Deploy Smart Contracts (Optional)

If you want to deploy your own contracts:

```bash
cd contracts
npm install
npx hardhat run scripts/deploy-factory.js --network kite_testnet
```

---

## 📁 Project Structure

<details>
<summary>Click to expand detailed project structure</summary>

```
PayPai/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── ai/               # AI agent endpoints
│   │   │   │   └── parse/        # Natural language parsing
│   │   │   ├── bundler/          # Kite bundler proxy
│   │   │   ├── vault/            # Vault management APIs
│   │   │   │   ├── deploy/       # Vault deployment
│   │   │   │   ├── configure/    # Spending rules config
│   │   │   │   └── query/        # Vault information
│   │   │   └── wallet/           # Wallet operations APIs
│   │   │       ├── create/       # AA wallet creation
│   │   │       ├── send/         # Transaction sending
│   │   │       └── balance/      # Balance queries
│   │   ├── globals.css           # Global styles + theme
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Main app page
│   ├── components/               # React Components
│   │   ├── ai/
│   │   │   └── AICommand.tsx     # NL command interface
│   │   ├── providers/
│   │   │   └── Providers.tsx     # Wagmi & RainbowKit
│   │   ├── vault/
│   │   │   ├── VaultManager.tsx  # Vault dashboard
│   │   │   ├── VaultDeploy.tsx   # Deployment UI
│   │   │   ├── VaultRules.tsx    # Rules configuration
│   │   │   └── VaultInfo.tsx     # Info display
│   │   ├── wallet/
│   │   │   ├── WalletConnect.tsx # Connection UI
│   │   │   ├── WalletInfo.tsx    # Balance & info
│   │   │   └── ActivityLog.tsx   # TX history
│   │   └── ThemeToggle.tsx       # Theme switcher
│   ├── lib/                      # Core Libraries
│   │   ├── ai-agent.ts           # Qwen AI integration
│   │   ├── kite.ts               # Kite SDK manager
│   │   ├── vault-service.ts      # Vault operations
│   │   ├── wallet-service.ts     # AA wallet service
│   │   ├── activity-db.ts        # Activity logging
│   │   └── wagmi.ts              # Wagmi config
│   └── types/
│       └── index.ts              # TypeScript types
├── contracts/                    # Smart Contracts
│   ├── contracts-src/
│   │   └── ClientAgentVault.sol  # Main vault contract
│   ├── scripts/
│   │   ├── deploy.js             # Deploy implementation
│   │   ├── deploy-factory.js     # Deploy factory
│   │   └── verify.js             # Verification
│   ├── hardhat.config.js
│   └── deployments.json
├── docs/                         # Documentation
│   ├── paypai_idea.md
│   ├── kite_ai_sdk_tutorial.md
│   └── prompt.md
└── public/                       # Static assets
    └── images/
```

</details>

---

## 🔑 Key Files Explained

### Core Services

| File | Purpose |
|------|---------|
| `src/lib/ai-agent.ts` | Qwen API integration, conversation parsing, intent recognition |
| `src/lib/kite.ts` | Kite SDK manager, configuration, singleton pattern |
| `src/lib/vault-service.ts` | Vault operations: deploy, configure, withdraw, query |
| `src/lib/wallet-service.ts` | AA wallet creation, user operations, transaction management |
| `src/lib/activity-db.ts` | Local transaction history tracking |

### API Endpoints

| Endpoint | Function |
|----------|----------|
| `/api/ai/parse` | Parse natural language → transaction params |
| `/api/bundler` | Proxy for Kite bundler (CORS handling) |
| `/api/vault/*` | Vault management (deploy, configure, query) |
| `/api/wallet/*` | Wallet operations (create, send, balance) |

### Smart Contracts

| Contract | Description |
|----------|-------------|
| `ClientAgentVault.sol` | UUPS upgradeable vault with spending rules, budget management, and automated payment execution |

---

## 💡 Core Features

### ✅ Implemented

- [x] **Account Abstraction Wallet Creation**
  - Kite AA SDK integration
  - Gasless transaction support
  
- [x] **Multi-Wallet Connection**
  - RainbowKit integration
  - MetaMask, WalletConnect, etc.
  
- [x] **ClientAgentVault Deployment**
  - UUPS upgradeable pattern
  - Factory-based deployment
  
- [x] **Spending Rules Configuration**
  - Time-based budgets
  - Whitelist/blacklist management
  - Automated enforcement
  
- [x] **Natural Language Transaction Processing**
  - Qwen AI integration
  - Intent recognition
  - Parameter extraction
  
- [x] **Dark/Light Theme**
  - System preference detection
  - Manual toggle
  
- [x] **Transaction History**
  - Local activity logging
  - Transaction details view

### 🚧 In Progress

- [ ] **ERC-20 Token Support**
  - Token transfer operations
  - Balance tracking
  
- [ ] **Enhanced AI Capabilities**
  - Multi-step transactions
  - Batch operations
  - Advanced intent understanding

### 📋 Planned

- [ ] **Multi-Chain Support**
  - Cross-chain transactions
  - Asset bridging
  
- [ ] **Mobile App**
  - React Native implementation
  - Mobile-optimized UI
  
- [ ] **Advanced Analytics**
  - Spending insights
  - Budget recommendations

---

## 🛣️ Roadmap

### Phase 1: MVP ✅ (Current)
- Basic natural language interface
- AA wallet creation and management
- Simple spending rules
- Kite testnet deployment

### Phase 2: Enhancement 🚧
- ERC-20 token support
- Improved AI conversation
- Advanced spending rules
- User dashboard

### Phase 3: Expansion 📋
- Multi-chain support
- Mobile application
- DeFi protocol integration
- Social recovery

---

## 🧪 Development & Testing

### Run Tests

```bash
# Frontend tests
npm test

# Smart contract tests
cd contracts
npx hardhat test
```

### Deploy to Testnet

```bash
cd contracts
npx hardhat run scripts/deploy-factory.js --network kite_testnet
```

### Environment Variables

**Required:**
- `QWEN_API_KEY`: Your Qwen API key
- `NEXT_PUBLIC_VAULT_FACTORY`: Factory contract address
- `NEXT_PUBLIC_VAULT_IMPLEMENTATION_ADDRESS`: Implementation address

**Optional:**
- `PRIVATE_KEY`: Development wallet private key
- `EXECUTOR_PRIVATE_KEY`: Server-side executor key
- `NEXT_PUBLIC_EXECUTOR_ADDRESS`: Executor address

---

## 📚 Documentation

- [Project Concept](docs/paypai_idea.md) - Initial design and architecture
- [Kite SDK Guide](docs/kite_ai_sdk_tutorial.md) - How to use Kite AA SDK
- [AI Prompts](docs/prompt.md) - Qwen API prompt engineering

---

## 🤝 Contributing

Contributions are welcome! This project was created for a hackathon, but we're happy to receive improvements.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

### Built With

- **[Kite AI](https://gokite.ai)** - Account Abstraction infrastructure
- **[Qwen](https://tongyi.aliyun.com/)** - Natural language AI
- **[Next.js](https://nextjs.org/)** - React framework
- **[RainbowKit](https://www.rainbowkit.com/)** - Wallet connection
- **[Hardhat](https://hardhat.org/)** - Ethereum development

### Hackathon

This project was built for the **SPARK AI Hackathon**, showcasing the power of combining AI with blockchain technology.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📧 Contact & Support

- **GitHub Issues**: [Report a bug](https://github.com/LuckDogGuan/PAYPAI/issues)
- **Discussions**: [Ask questions](https://github.com/LuckDogGuan/PAYPAI/discussions)

---

<div align="center">

**Made with ❤️ for the Web3 community**

[⬆ Back to Top](#paypai---ai-powered-smart-contract-wallet)

</div>
