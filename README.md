<div align="center">

<img src="./images/photo_2026-01-31_21-03-42.png" alt="PayPai Logo" width="200">

# PayPai - AI-Powered Smart Contract Wallet

**Your AI Companion for Effortless Blockchain Transactions** 🤖💰

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Kite AI](https://img.shields.io/badge/Built%20with-Kite%20AI-orange)](https://gokite.ai)
[![Powered by Qwen](https://img.shields.io/badge/AI-Qwen-green)](https://tongyi.aliyun.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

[English](README.md) | [中文](README_CN.md)

[🎥 Demo Video](https://youtu.be/bNBuSJotYtc) • [🎯 Live Demo](#-demo) • [📖 Documentation](#-project-structure) • [🚀 Quick Start](#-quick-start) • [💡 Features](#-core-features)

</div>

---

## 🌟 Overview

**PayPai** is an AI‑native smart wallet built for the next generation of on‑chain payments. It turns natural language into safe, programmable transactions, combining Account Abstraction with policy‑based spending control and a conversational agent.

**Vision:** make on‑chain spending as intuitive as chat, while giving users and teams granular control over budgets, rules, and automation.

### ⚡ 1‑Minute Quick Experience

1. Connect your wallet (MetaMask/RainbowKit)
2. Deploy AA wallet
3. Fund AA wallet with KITE or USDT
4. Create & authorize Vault
5. Approve Vault allowance
6. Ask the AI agent to send a payment

> Tip: You can use the KITE faucet to get test tokens before funding the AA wallet.

### 🎯 Core Value

PayPai lowers the friction of Web3 adoption by combining:
- **Natural Language Payments** with AI intent parsing
- **Account Abstraction** for safer, flexible execution
- **Policy‑Based Spending** (budgets, time windows, allow/deny lists)
- **Agent‑Assisted Automation** for recurring and high‑volume workflows

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

3. **Programmable Spending Control**
   - Time‑boxed budgets and policy checks
   - Clear auditability for agent‑initiated actions
   - Extensible for team approvals and limits

4. **Intelligent AI Agent**
   - Multi-turn conversation support
   - Transaction parameter extraction
   - Safety validation before execution

### 🎨 User Experience

```
User: "Send 5 USDT to 0x1234...5678"
PayPai: "I'll send 5 USDT to 0x1234...5678. Confirm?"
User: "Yes"
PayPai: ✅ "Transaction sent! Hash: 0xabcd..."
```

---

## 🎯 Demo

### 🎥 Demo Video

```text
https://youtu.be/bNBuSJotYtc
```

### 🔗 Live Demo

*Coming soon: Deployed application link*

### 🧪 Testnet Helpers

- KITE Faucet: https://faucet.gokite.ai/
- KiteScan Explorer (Testnet): https://testnet.kitescan.ai/

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

# Required: Deployed contract addresses (see deployment guide / deployments.json)
NEXT_PUBLIC_VAULT_FACTORY=0x...
NEXT_PUBLIC_VAULT_IMPLEMENTATION_ADDRESS=0x...

# Optional: For development testing
PRIVATE_KEY=your_development_private_key
EXECUTOR_PRIVATE_KEY=your_executor_private_key
NEXT_PUBLIC_EXECUTOR_ADDRESS=0x...
```

**Required vs Optional**

- **Required**: `QWEN_API_KEY`, `NEXT_PUBLIC_VAULT_FACTORY`, `NEXT_PUBLIC_VAULT_IMPLEMENTATION_ADDRESS`
- **Optional** (dev only): `PRIVATE_KEY`, `EXECUTOR_PRIVATE_KEY`, `NEXT_PUBLIC_EXECUTOR_ADDRESS`

> Security note: Only use test keys and test assets. Do **not** import real private keys or mainnet funds.

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

## 📄 Smart Contracts

- Core contract: `ClientAgentVault.sol` (UUPS upgradeable)
- Deployment addresses: see `contracts/deployments.json` and your `.env.local`
- Verify on KiteScan: use Hardhat verify script in `contracts/scripts/verify.js`

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

## 🛣️ Roadmap & Future Applications

### Near Term
- Multi‑asset payments and richer token routing
- More powerful intent understanding (batch, split, schedule)
- Team workflows with approvals and roles

### Mid Term
- Merchant checkout flows and invoice automation
- Agent‑driven treasury operations for DAOs and startups
- Risk controls: anomaly detection, limits by category

### Long Term
- Multi‑chain payments and asset abstraction
- Consumer‑grade “autopay” for subscriptions
- Embedded wallet SDK for apps and marketplaces

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
