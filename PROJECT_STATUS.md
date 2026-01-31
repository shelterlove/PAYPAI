# PayPai 项目状态文档

## 项目概述

**PayPai** 是一个为 Kite AI Chain 黑客松构建的 AI 驱动智能钱包应用。

### 当前目标（Hackathon MVP）
- 用户连接钱包（MetaMask/RainbowKit）
- 部署 AA 钱包并充值
- 部署 Vault（可配置限额/规则）
- 由 AI 或 UI 通过 Vault 执行交易（无需再次签名）
- 准备 Demo 物料与演示流程

---

## ✅ 已完成功能（近期更新）

### 1) 钱包与链路
- ✅ Next.js 15 + TypeScript + Tailwind CSS
- ✅ ethers.js v6 集成
- ✅ gokite-aa-sdk 集成
- ✅ Wagmi + RainbowKit 钱包连接
- ✅ Kite Testnet 网络配置与 bundler 代理

### 2) AA 钱包核心能力
- ✅ AA 钱包地址计算/展示
- ✅ AA 钱包部署（首笔 UserOp 自动部署）
- ✅ 余额查询（AA 钱包 + EOA）
- ✅ ETH 转账（AA 钱包）
- ✅ ERC20 发送（AA 钱包 API 已支持）

### 3) Vault 体系（重点）
- ✅ VaultFactory + ClientAgentVault 合约更新：
  - Vault 由 EOA（admin）部署
  - **SpendingAccount = AA 钱包**
  - Vault 执行交易时从 AA 钱包 `transferFrom`
- ✅ Vault 管理界面：部署 / 配置 / 查询 / 提款
- ✅ Vault Executor 授权
- ✅ Vault Allowance 与 AA 余额展示
- ✅ 一键转入 AA 钱包 + Approve Vault 的 UI
- ✅ 显示完整 Vault 地址（支持 Copy）

### 4) AI 交互
- ✅ 千问 Qwen API 集成
- ✅ AI 命令解析（地址/金额/代币）
- ✅ AI 命令 UI
- ✅ **AI 对话分流**：仅在识别到交易意图时进入交易解析/确认流程
- ✅ 交易确认卡（Transaction Review）+ 成功/失败状态卡
- ✅ 交易 Hash：中间省略 + 复制 + 浏览器跳转
- ✅ 聊天输入 UX：回车发送 + “正在回答”提示
- ✅ AI/用户头像显示（images/agent_profile.png / images/user_profile.png）

### 5) 测试代币与验证
- ✅ PayPaiTestToken（PPT）支持 `mint` + `faucetMint`
- ✅ Hardhat Verify 支持 Kite Testnet（Blockscout）
- ✅ 默认 PPT 代币环境参数

### 6) 交易历史与缓存
- ✅ Recent Activity 进入 Wallet 面板（可折叠）
- ✅ 交易记录缓存到本地 JSON（data/wallet-activity.json）
- ✅ 同步 txlist + tokentx，默认 5 分钟刷新间隔（支持手动刷新）
- ✅ 同步超时与错误提示优化

### 7) UI/UX 细节优化
- ✅ Setup Steps 逻辑修正（增加 Fund / Approve Allowance 步骤）
- ✅ Wallet/Vault 刷新与设置图标放大
- ✅ Vault Debug 信息折叠隐藏
- ✅ Fund 支持弹窗输入金额（KITE/USDT）
- ✅ Hackathon 致谢区块与 Logo（SPARK AI Hackathon / Kite AI / ETH Panda / LX Dao）

---

## 🔁 当前产品流程（已确认）

1) 用户连接钱包（EOA）
2) 部署 AA 钱包（AA 合约账户）
3) 给 AA 钱包充值（KITE + PPT）
4) 部署 Vault（选择 token / 限额 / 时间窗口 / 黑白名单）
5) **Vault 需要从 AA 钱包进行 `approve`** 才能执行
6) AI 或 UI 执行交易 → Vault 检查规则 → 从 AA 钱包扣款

> ✅ 资金放在 AA 钱包，Vault 只通过 allowance 消耗。

---

## ❌ 未完成功能

### 1) Paymaster / Gasless 完整体验
- 当前 **AA approve 在启用 Paymaster 时会 AA33**
- 已添加 “Disable paymaster (debug)” 开关：
  - 关闭 Paymaster 后可成功
  - 需要 AA 钱包自付 gas（KITE）
- 需要与 Kite 官方确认签名 / paymaster 要求

### 2) ERC-20 功能完善
- ERC20 发送接口已支持，但 UI/UX 仍需完善
- AI 代币识别与自定义代币列表仍需改进

### 3) AI 与 Vault 深度联动
- AI 自动部署 Vault + 自动配置规则
- AI 根据预算 / 白名单执行动作

### 4) 交易历史与权限系统
- 交易历史完善（目前只做了最近 100 条聚合展示）
- 白名单/黑名单管理与审计
- 角色/权限管理

### 5) 测试与演示
- 单元测试、集成测试、E2E
- Demo 脚本 / PPT / 演示视频

---

## ⚠️ 已知问题与重要结论

1) **Bundler 不支持 eth_call**
   - 需要用 RPC (`https://rpc-testnet.gokite.ai`) 做 `eth_call`

2) **AA33 错误定位结果**
   - MetaMask 签名（personal_sign）校验 OK
   - 在启用 Paymaster 时 UserOp 会 AA33
   - 关闭 Paymaster 后可成功发送
   - 结论：问题在 Paymaster / 签名格式兼容

3) **MetaMask 自动连接**
   - RainbowKit 默认 autoConnect，会自动恢复上次连接
   - 如需关闭，需要在 wagmi config 设置 `autoConnect: false`

4) **AI 对话需严格区分“聊天 vs 交易”**
   - 仅当识别到动作意图（send/transfer/pay + 金额/地址）才触发交易确认
   - 普通问答统一走 chat 模式

---

## 📁 关键文件

- `src/components/vault/VaultApproval.tsx`
  - Approve Vault + AA 余额充值 + Debug
- `src/components/vault/VaultInfo.tsx`
  - Vault 详情 + 全地址展示
- `src/lib/wallet-client.ts`
  - MetaMask 签名适配（v=27/28）
- `src/app/api/wallet/approve-erc20/route.ts`
- `src/app/api/wallet/send-erc20-eoa/route.ts`
- `src/app/api/wallet/activity/route.ts`
- `src/lib/activity-db.ts`
- `contracts/contracts-src/ClientAgentVault.sol`
- `contracts/contracts-src/VaultFactory.sol`
- `src/components/ai/AICommand.tsx`
- `src/components/vault/RecentActivity.tsx`
- `src/components/wallet/WalletInfo.tsx`
- `src/components/vault/VaultApproval.tsx`
- `src/components/vault/VaultInfo.tsx`
- `src/app/page.tsx`

---

## 🔧 关键环境变量（示例）

```bash
NEXT_PUBLIC_KITE_NETWORK=kite_testnet
NEXT_PUBLIC_KITE_RPC_URL=https://rpc-testnet.gokite.ai
KITE_RPC_TIMEOUT_MS=20000
NEXT_PUBLIC_BUNDLER_PROXY_URL=/api/bundler
KITE_BUNDLER_URL=https://bundler-service.staging.gokite.ai/rpc/
NEXT_PUBLIC_KITE_BUNDLER_URL=https://bundler-service.staging.gokite.ai/rpc/

NEXT_PUBLIC_VAULT_FACTORY=0x8cBCfCDc9B7E8dDa4f36E70b2E144c3BeedF07Ae
NEXT_PUBLIC_VAULT_IMPLEMENTATION=0xfc4f62951837D372C843CA7Dc490Ba613Ffc6603

NEXT_PUBLIC_SETTLEMENT_TOKEN_ADDRESS=0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63
NEXT_PUBLIC_SETTLEMENT_TOKEN_SYMBOL=USDT
NEXT_PUBLIC_SETTLEMENT_TOKEN_DECIMALS=18

NEXT_PUBLIC_DEFAULT_VAULT_TOKEN_ADDRESS=<OPTIONAL>
NEXT_PUBLIC_DEFAULT_VAULT_TOKEN_SYMBOL=<OPTIONAL>
NEXT_PUBLIC_DEFAULT_VAULT_TOKEN_DECIMALS=<OPTIONAL>

NEXT_PUBLIC_EXECUTOR_ADDRESS=<YOUR_EXECUTOR_ADDRESS>
EXECUTOR_PRIVATE_KEY=<YOUR_EXECUTOR_KEY>

NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<YOUR_PROJECT_ID>
QWEN_API_KEY=<YOUR_QWEN_KEY>
```

---

## 📌 当前进度总结

- ✅ Vault 资金流从 **AA 钱包 → Vault 授权 → 执行** 已跑通
- ✅ Vault UI 能展示 allowance / AA 余额 / 规则
- ✅ AI 交互已区分聊天/交易意图（非交易问题不会触发确认）
- ✅ 交易历史缓存 + Recent Activity 展示
- ✅ Setup Steps 与 Approve Allowance 状态正确
- ❌ Paymaster 模式仍无法通过 AA33 校验

**最后更新：2026-01-31**

---

## ✅ 新对话 Prompt（建议复制）

你是 Codex，负责 PayPai（Kite AI Chain 黑客松项目）。当前目标：
1) 完成 AA 钱包 + Vault 的完整自动化交易流程（资金在 AA 钱包，Vault 通过 allowance 执行）
2) 解决 Paymaster 模式下 AA33 验证失败问题（目前关闭 paymaster 可成功）
3) 完善 ERC20 交易与 AI-Vault 联动
4) 准备 Demo（演示流程、PPT）

当前状态要点：
- Vault 合约已更新：spendingAccount = AA 钱包，executeSpend 调用 transferFrom
- Approve 操作对 token 合约调用 approve（spender=Vault）
- MetaMask personal_sign 校验 OK，但启用 paymaster 会 AA33
- 关闭 paymaster（debug）+ AA 钱包自付 gas 可成功
- Bundler 不支持 eth_call，所有 call 用 RPC
- 交易历史本地缓存：data/wallet-activity.json（最近 100 条）
- AI 交易确认卡保留在对话历史中
- 默认 Settlement Token：0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63（USDT）
- 最近修改文件：AICommand / RecentActivity / WalletInfo / activity-db / vault-info

请先阅读 PROJECT_STATUS.md，再继续任务。
