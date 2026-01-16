# BITNINE x LIGHTER DEX INTEGRATION - PDR PROMPT FOR CLAUDE CODE OPUS 4.5

## 🎯 PROJECT CONTEXT

You are tasked with integrating Lighter DEX into the Bitnine trading platform. Bitnine is an AI-powered trading platform designed to revolutionize crypto trading through risk-first position sizing, AI learning, and zero-fee execution. The current platform has a beautiful UI but non-functional trading capabilities. Your mission is to make it FULLY FUNCTIONAL by integrating Lighter DEX.

**Current State:**
- ✅ Beautiful terminal UI (CIRCL design system)
- ✅ TradingView chart integration
- ✅ Order entry interface components
- ❌ No actual exchange connection
- ❌ Orders don't execute
- ❌ Balance shows 0.00
- ❌ Trading completely non-functional

**Desired End State:**
- ✅ Full Lighter DEX integration
- ✅ Real wallet connection (MetaMask/WalletConnect)
- ✅ Real order execution (market & limit orders)
- ✅ Real-time balance and position tracking
- ✅ Zero-fee trading operational
- ✅ WebSocket real-time updates
- ✅ Complete error handling

**Why Lighter DEX:**
- 0% trading fees for standard accounts (HUGE selling point!)
- ~300ms latency (CEX-comparable)
- 50x leverage on BTC/ETH
- Zero-knowledge rollup security (verifiable order matching)
- $340M TVL, $4.66B daily volume
- Strong backing: a16z, Lightspeed Ventures
- Ex-Citadel engineers
- Full API/SDK support

---

## 📋 TECHNICAL SPECIFICATIONS

### **Technology Stack:**

**Backend:**
- Python 3.11+
- FastAPI for REST API
- Lighter Python SDK (`lighter-sdk`)
- PostgreSQL/Supabase for database
- Redis for caching (optional)
- WebSocket support for real-time data
- Async/await throughout

**Frontend:**
- Next.js 14+ / React 18+
- TypeScript
- TailwindCSS (already configured)
- ethers.js for wallet connection
- WebSocket client for real-time updates
- Zustand/Redux for state management

**Infrastructure:**
- Lighter Mainnet: `https://mainnet.zklighter.elliot.ai`
- Lighter WebSocket: `wss://mainnet.zklighter.elliot.ai/ws`
- Arbitrum L2 (Ethereum)
- Supabase Vault for API key encryption

### **Key Lighter DEX Concepts:**

1. **Account Structure:**
   - Users have Lighter accounts indexed by integers
   - Each account can have up to 252 API keys (indexes 3-254)
   - Index 0 = desktop, 1 = mobile PWA, 2 = mobile app
   - Each API key has its own nonce counter

2. **Order Types:**
   - Market orders: Immediate execution at best price
   - Limit orders: Execute at specific price or better
   - TIF (Time in Force): Gtc (Good-til-cancel), Ioc (Immediate-or-cancel), Po (Post-only)

3. **Price/Size Format:**
   - Lighter requires integer representations
   - Multiply by 1e8 for proper decimal precision
   - Example: $95,710.50 → 9571050000000

4. **Fee Structure:**
   - Standard accounts: 0% fees! 🔥
   - Premium accounts: 0.2 bps maker / 2 bps taker
   - This is Bitnine's PRIMARY selling point

5. **Authentication:**
   - API keys required for trading
   - Auth tokens expire in 8 hours max
   - Read-only tokens available for data access
   - L1 private key needed for API key association

---

## 🏗️ IMPLEMENTATION ARCHITECTURE

```
BITNINE PLATFORM ARCHITECTURE

┌──────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                         │
├──────────────────────────────────────────────────────────┤
│  Components:                                              │
│  ├─ WalletConnect.tsx       (MetaMask/WalletConnect)     │
│  ├─ TradingTerminal.tsx     (Main trading interface)     │
│  ├─ OrderEntry.tsx          (Order placement UI)         │
│  ├─ PositionManager.tsx     (Position display/mgmt)      │
│  ├─ BalanceDisplay.tsx      (Account balance info)       │
│  ├─ OrderHistory.tsx        (Order history panel)        │
│  └─ OrderBook.tsx           (Real-time orderbook)        │
│                                                            │
│  Hooks:                                                    │
│  ├─ useLighter.ts           (Lighter state management)    │
│  ├─ useWallet.ts            (Wallet state)               │
│  └─ useWebSocket.ts         (Real-time updates)          │
│                                                            │
│  Services:                                                 │
│  ├─ lighterApi.ts           (API client)                 │
│  └─ walletService.ts        (Wallet operations)          │
└──────────────────────────────────────────────────────────┘
                            ↕ HTTP/WebSocket
┌──────────────────────────────────────────────────────────┐
│                    BACKEND LAYER                          │
├──────────────────────────────────────────────────────────┤
│  Services:                                                 │
│  ├─ lighter_service.py      (Lighter SDK wrapper)        │
│  ├─ wallet_service.py       (Wallet management)          │
│  ├─ order_service.py        (Order logic)                │
│  ├─ position_service.py     (Position tracking)          │
│  └─ websocket_service.py    (Real-time data)             │
│                                                            │
│  API Routes:                                               │
│  ├─ /api/lighter/connect-wallet                          │
│  ├─ /api/lighter/balances                                │
│  ├─ /api/lighter/positions                               │
│  ├─ /api/lighter/place-order                             │
│  ├─ /api/lighter/cancel-order                            │
│  ├─ /api/lighter/markets                                 │
│  ├─ /api/lighter/orderbook/{symbol}                      │
│  └─ /api/lighter/ws (WebSocket endpoint)                 │
│                                                            │
│  Models:                                                   │
│  ├─ User (with Lighter account info)                     │
│  ├─ Trade (order records)                                │
│  └─ Position (position tracking)                         │
└──────────────────────────────────────────────────────────┘
                            ↕ REST API / WebSocket
┌──────────────────────────────────────────────────────────┐
│                    LIGHTER DEX LAYER                      │
├──────────────────────────────────────────────────────────┤
│  ├─ REST API (mainnet.zklighter.elliot.ai)              │
│  ├─ WebSocket (real-time market data)                   │
│  ├─ Python SDK (lighter-sdk)                             │
│  └─ Smart Contracts (Arbitrum L2)                        │
└──────────────────────────────────────────────────────────┘
```

---

## 📝 IMPLEMENTATION PLAN (7-DAY TIMELINE)

### **PHASE 1: BACKEND FOUNDATION (Days 1-2)**

#### **1.1 Environment Setup**

**Create `.env` file:**
```bash
# Lighter Configuration
LIGHTER_API_URL=https://mainnet.zklighter.elliot.ai
LIGHTER_WS_URL=wss://mainnet.zklighter.elliot.ai/ws
LIGHTER_NETWORK=mainnet

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/bitnine
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Encryption (for API keys)
ENCRYPTION_KEY=<generate-secure-32-byte-key>

# API Settings
API_RATE_LIMIT=10  # requests per second
MAX_CONCURRENT_REQUESTS=5
```

**Install dependencies (`requirements.txt`):**
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
lighter-sdk==1.0.2
python-dotenv==1.0.0
asyncio==3.4.3
aiohttp==3.9.1
web3==6.15.0
eth-account==0.10.0
psycopg2-binary==2.9.9
sqlalchemy==2.0.25
pydantic==2.5.3
redis==5.0.1
websockets==12.0
cryptography==41.0.7
```

#### **1.2 Core Lighter Service**

**File: `backend/services/lighter_service.py`**

**Requirements:**
- Initialize Lighter SDK with user credentials
- Handle all API calls (accounts, orders, positions, markets)
- Implement proper error handling with custom exceptions
- Support async operations throughout
- Manage API key encryption/decryption
- Handle nonce management (tracked by SDK)
- Implement retry logic for failed requests
- Log all trading operations

**Key Methods:**
```python
class LighterService:
    # Initialization
    async def initialize(user_api_key, account_index)
    
    # Account Management
    async def get_account_info() -> Dict
    async def get_balances() -> Dict[str, float]
    async def create_api_key(eth_private_key) -> str
    
    # Position Management
    async def get_positions() -> List[Position]
    async def get_position(symbol) -> Optional[Position]
    async def close_position(symbol) -> Dict
    
    # Order Management
    async def place_market_order(symbol, side, size, reduce_only=False) -> Dict
    async def place_limit_order(symbol, side, size, price, post_only=False) -> Dict
    async def cancel_order(order_id, symbol) -> Dict
    async def cancel_all_orders(symbol=None) -> Dict
    async def modify_order(order_id, new_price, new_size) -> Dict
    
    # Order Queries
    async def get_active_orders() -> List[Order]
    async def get_order_history(limit=50) -> List[Order]
    async def get_order_status(order_id) -> Dict
    
    # Market Data
    async def get_markets() -> List[Market]
    async def get_market_info(symbol) -> Market
    async def get_orderbook(symbol, depth=20) -> OrderBook
    async def get_recent_trades(symbol, limit=50) -> List[Trade]
    async def get_ticker(symbol) -> Ticker
    
    # Utility
    async def close()
```

**Error Handling:**
```python
class LighterError(Exception):
    """Base exception for Lighter integration"""
    pass

class InsufficientBalanceError(LighterError):
    """Raised when user has insufficient balance"""
    pass

class OrderRejectedError(LighterError):
    """Raised when order is rejected by exchange"""
    pass

class InvalidSymbolError(LighterError):
    """Raised when trading pair doesn't exist"""
    pass

class RateLimitError(LighterError):
    """Raised when API rate limit exceeded"""
    pass

class APIKeyError(LighterError):
    """Raised when API key issues occur"""
    pass
```

#### **1.3 API Routes**

**File: `backend/api/lighter_routes.py`**

**Endpoints:**

```python
# Wallet & Account
POST   /api/lighter/connect-wallet
       Body: { wallet_address, signature }
       Returns: { success, account_index }

POST   /api/lighter/create-account
       Body: { eth_private_key }
       Returns: { success, account_index, api_key_index }

GET    /api/lighter/account
       Returns: { account_index, total_value, available_balance, margin_used }

# Balances & Positions
GET    /api/lighter/balances
       Returns: { total_value, available_balance, margin_used, unrealized_pnl }

GET    /api/lighter/positions
       Returns: [{ symbol, side, size, entry_price, mark_price, pnl, leverage }]

GET    /api/lighter/positions/{symbol}
       Returns: { symbol, side, size, entry_price, ... }

POST   /api/lighter/close-position
       Body: { symbol }
       Returns: { success, message, order_id }

# Orders
POST   /api/lighter/place-order
       Body: { symbol, side, size, order_type, price?, reduce_only?, post_only? }
       Returns: { success, order_id, status, message }

POST   /api/lighter/cancel-order
       Body: { order_id, symbol }
       Returns: { success, message }

POST   /api/lighter/cancel-all-orders
       Body: { symbol? }
       Returns: { success, cancelled_count, message }

GET    /api/lighter/active-orders
       Returns: [{ order_id, symbol, side, size, price, filled, status }]

GET    /api/lighter/order-history
       Query: ?limit=50
       Returns: [{ order_id, symbol, side, size, price, status, timestamp }]

# Market Data
GET    /api/lighter/markets
       Returns: [{ symbol, base_asset, quote_asset, min_size, max_leverage }]

GET    /api/lighter/orderbook/{symbol}
       Query: ?depth=20
       Returns: { symbol, bids: [[price, size]], asks: [[price, size]] }

GET    /api/lighter/trades/{symbol}
       Query: ?limit=50
       Returns: [{ price, size, side, timestamp }]

GET    /api/lighter/ticker/{symbol}
       Returns: { symbol, last_price, 24h_change, 24h_volume, high, low }
```

**Response Format:**
```python
# Success Response
{
    "success": true,
    "data": { ... },
    "message": "Order placed successfully"
}

# Error Response
{
    "success": false,
    "error": "InsufficientBalance",
    "message": "Insufficient balance. Need $1,000, have $500",
    "details": { "required": 1000, "available": 500 }
}
```

#### **1.4 Database Models**

**File: `backend/models/user.py`**

```python
class User(BaseModel):
    id: int
    email: str
    wallet_address: str
    
    # Lighter Integration
    lighter_account_index: int
    lighter_api_key_index: int
    lighter_api_key_encrypted: str  # Encrypted with ENCRYPTION_KEY
    lighter_wallet_address: str
    lighter_created_at: datetime
    lighter_last_sync: datetime
    
    # Settings
    is_premium: bool = False  # Premium Lighter account (paid fees)
    max_leverage: int = 10
    risk_tolerance: float = 0.02  # 2% per trade
```

**File: `backend/models/trade.py`**

```python
class Trade(BaseModel):
    id: int
    user_id: int
    order_id: str  # Lighter order ID
    symbol: str
    side: str  # 'buy' or 'sell'
    order_type: str  # 'market' or 'limit'
    size: float
    price: float
    filled_size: float
    filled_price: float
    status: str  # 'open', 'filled', 'cancelled', 'rejected'
    created_at: datetime
    updated_at: datetime
    filled_at: Optional[datetime]
```

**File: `backend/models/position.py`**

```python
class Position(BaseModel):
    id: int
    user_id: int
    symbol: str
    side: str  # 'long' or 'short'
    size: float
    entry_price: float
    current_price: float
    unrealized_pnl: float
    realized_pnl: float
    leverage: int
    liquidation_price: float
    margin_used: float
    opened_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime]
```

#### **1.5 WebSocket Service**

**File: `backend/services/websocket_service.py`**

**Purpose:** Real-time updates for prices, orders, positions

**Implementation:**
```python
class LighterWebSocketService:
    async def connect()
    async def disconnect()
    async def subscribe_to_market(symbol)
    async def subscribe_to_orders(account_index)
    async def subscribe_to_positions(account_index)
    async def handle_message(message)
    async def broadcast_to_clients(message)
```

**Message Types:**
```python
# Price Update
{
    "type": "price_update",
    "symbol": "BTC-USD",
    "price": 95710.50,
    "change_24h": 2.45,
    "volume_24h": 1234567890,
    "timestamp": 1705420800
}

# Order Update
{
    "type": "order_update",
    "order_id": "abc123",
    "status": "filled",
    "filled_size": 0.1,
    "filled_price": 95710.50,
    "timestamp": 1705420800
}

# Position Update
{
    "type": "position_update",
    "symbol": "BTC-USD",
    "unrealized_pnl": 490.50,
    "current_price": 96200.00,
    "timestamp": 1705420800
}
```

---

### **PHASE 2: FRONTEND INTEGRATION (Days 3-4)**

#### **2.1 Wallet Connection**

**File: `frontend/components/WalletConnect.tsx`**

**Requirements:**
- Support MetaMask, WalletConnect, Coinbase Wallet
- Verify user is on Arbitrum network
- Display connection status
- Handle wallet switching
- Show wallet address and balance
- Disconnect functionality

**UI Flow:**
```
Disconnected State:
┌────────────────────────────────┐
│  [🦊 Connect Wallet]           │
└────────────────────────────────┘

Connected State:
┌────────────────────────────────┐
│  0x1234...5678 | 1,234 USDC    │
│  [Disconnect]                   │
└────────────────────────────────┘
```

**Implementation:**
```typescript
interface WalletConnectProps {
    onConnect: (address: string) => void;
    onDisconnect: () => void;
}

// Functions needed:
async function connectWallet()
async function disconnectWallet()
async function switchToArbitrum()
function shortenAddress(address: string): string
async function getBalance(address: string): Promise<number>
```

#### **2.2 Lighter Onboarding Flow**

**File: `frontend/components/LighterOnboarding.tsx`**

**Steps:**
1. Check if user has Lighter account
2. If not, show onboarding modal
3. Guide through API key creation
4. Store API key securely in backend
5. Show success confirmation

**Modal Flow:**
```
Step 1: Welcome
┌─────────────────────────────────────────┐
│  🔥 Welcome to Zero-Fee Trading!        │
│                                          │
│  Bitnine uses Lighter DEX for:          │
│  ✅ 0% trading fees                     │
│  ✅ 50x leverage                        │
│  ✅ Instant execution                   │
│  ✅ Your keys, your coins               │
│                                          │
│  [Get Started] [Learn More]             │
└─────────────────────────────────────────┘

Step 2: Create Account
┌─────────────────────────────────────────┐
│  Creating your Lighter account...       │
│  [████████░░] 80%                       │
│                                          │
│  This takes about 30 seconds            │
└─────────────────────────────────────────┘

Step 3: Success
┌─────────────────────────────────────────┐
│  ✅ Account created successfully!       │
│                                          │
│  You're ready to trade with ZERO fees!  │
│                                          │
│  [Start Trading]                        │
└─────────────────────────────────────────┘
```

#### **2.3 Trading Terminal**

**File: `frontend/components/TradingTerminal.tsx`**

**Requirements:**
- Display real-time balance
- Show active positions
- Order entry form (market/limit)
- Real-time price updates
- Order confirmation modal
- Success/error notifications
- Position P&L display

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  BITNINE TERMINAL                    Balance: $10,234.56     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐  ┌────────────────────────────┐   │
│  │   TRADINGVIEW       │  │   ORDER ENTRY              │   │
│  │   CHART             │  │                             │   │
│  │                     │  │  Symbol: BTC-USD            │   │
│  │   [Chart Display]   │  │  Side: [Buy] [Sell]         │   │
│  │                     │  │  Type: [Market] [Limit]     │   │
│  │                     │  │  Size: 0.1 BTC              │   │
│  │                     │  │  Price: $95,710             │   │
│  │                     │  │                             │   │
│  │                     │  │  [Open Long] 🚀             │   │
│  └─────────────────────┘  └────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  OPEN POSITIONS                                      │   │
│  │  Symbol   Size   Entry    Current   PnL      ROE    │   │
│  │  BTC-USD  0.1   $95,710  $96,200  +$490   +5.1%    │   │
│  │  [Close Position] [Modify SL/TP]                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ACTIVE ORDERS                                       │   │
│  │  Symbol   Type   Side  Size   Price    Status       │   │
│  │  ETH-USD  Limit  Buy   2.0    $3,450   Open         │   │
│  │  [Cancel]                                            │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Order Entry Logic:**
```typescript
interface OrderForm {
    symbol: string;
    side: 'buy' | 'sell';
    orderType: 'market' | 'limit';
    size: number;
    price?: number;
    reduceOnly: boolean;
    postOnly: boolean;
}

async function placeOrder(form: OrderForm) {
    // 1. Validate inputs
    // 2. Show confirmation modal
    // 3. Submit to backend
    // 4. Handle response
    // 5. Update UI
    // 6. Show notification
}
```

#### **2.4 Position Management**

**File: `frontend/components/PositionManager.tsx`**

**Features:**
- Display all open positions
- Real-time P&L updates
- Close position button
- Modify position (add/reduce)
- Set stop-loss/take-profit
- Position details modal

**Position Card:**
```
┌─────────────────────────────────────────────────┐
│  BTC-USD  |  LONG  |  10x Leverage              │
├─────────────────────────────────────────────────┤
│  Size: 0.1 BTC                                  │
│  Entry: $95,710.00                              │
│  Current: $96,200.00                            │
│                                                  │
│  Unrealized P&L: +$490.00 (+5.1%)  🟢          │
│  Margin Used: $957.10                           │
│  Liq. Price: $86,139.00                         │
│                                                  │
│  [Close Position] [Modify] [Set SL/TP]         │
└─────────────────────────────────────────────────┘
```

#### **2.5 Order History**

**File: `frontend/components/OrderHistory.tsx`**

**Features:**
- List all past orders
- Filter by symbol/status/date
- Pagination
- Export to CSV
- Order details modal

**Table:**
```
┌──────────────────────────────────────────────────────────┐
│  ORDER HISTORY                                            │
├──────────────────────────────────────────────────────────┤
│  Time       Symbol   Type   Side  Size   Price   Status  │
│  10:34 AM   BTC-USD  Market Buy   0.1    $95,710 Filled  │
│  10:32 AM   ETH-USD  Limit  Sell  2.0    $3,520  Filled  │
│  10:30 AM   BTC-USD  Limit  Buy   0.1    $95,000 Cancel  │
│                                                            │
│  [← Prev] Page 1 of 5 [Next →]                           │
└──────────────────────────────────────────────────────────┘
```

#### **2.6 State Management**

**File: `frontend/hooks/useLighter.ts`**

**Purpose:** Central state management for Lighter data

```typescript
interface LighterState {
    // Connection
    connected: boolean;
    account: Account | null;
    
    // Balances
    balance: number;
    marginUsed: number;
    availableBalance: number;
    
    // Positions
    positions: Position[];
    totalPnL: number;
    
    // Orders
    activeOrders: Order[];
    orderHistory: Order[];
    
    // Market Data
    markets: Market[];
    selectedSymbol: string;
    currentPrice: number;
    orderbook: OrderBook | null;
}

// Actions
function useConnect()
function useDisconnect()
function usePlaceOrder()
function useCancelOrder()
function useClosePosition()
function useSubscribeToPrice(symbol: string)
```

**File: `frontend/hooks/useWebSocket.ts`**

**Purpose:** WebSocket connection management

```typescript
function useWebSocket(url: string) {
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    
    // Auto-reconnect on disconnect
    // Handle incoming messages
    // Broadcast to relevant components
    
    return { connected, messages, send };
}
```

---

### **PHASE 3: REAL-TIME FEATURES (Day 5)**

#### **3.1 Price Updates**

**Implementation:**
- WebSocket connection to Lighter
- Subscribe to ticker updates
- Update UI in real-time
- Show 24h change, volume, high/low
- Display in chart and order entry

#### **3.2 Order Status Updates**

**Implementation:**
- Subscribe to order events
- Update order status in real-time
- Show notifications for fills/cancels
- Update active orders list
- Update order history

#### **3.3 Position Updates**

**Implementation:**
- Subscribe to position events
- Real-time P&L calculation
- Update liquidation prices
- Show alerts for liquidation risk
- Update position list

#### **3.4 Orderbook Updates**

**Implementation:**
- WebSocket orderbook stream
- Real-time bid/ask updates
- Display depth chart
- Show spread
- Highlight large orders

---

### **PHASE 4: ERROR HANDLING & EDGE CASES (Day 5)**

#### **4.1 Comprehensive Error Handling**

**Error Categories:**

1. **Connection Errors:**
   - Wallet not connected
   - Wrong network (not Arbitrum)
   - MetaMask not installed
   - WebSocket disconnection

2. **Trading Errors:**
   - Insufficient balance
   - Invalid order size (below minimum)
   - Invalid price
   - Position already exists
   - Order rejected by exchange

3. **API Errors:**
   - Rate limit exceeded
   - API key invalid
   - Nonce error
   - Timeout
   - Server error

4. **User Errors:**
   - Invalid input
   - Position at liquidation risk
   - Maximum leverage exceeded
   - Market closed

**Error Messages:**
```typescript
const ERROR_MESSAGES = {
    'insufficient_balance': '💸 Insufficient balance. Deposit more USDC to trade.',
    'order_rejected': '❌ Order rejected. Check your position size and leverage.',
    'invalid_symbol': '🔍 Trading pair not found. Check the symbol.',
    'rate_limit': '⏱️ Too many requests. Please wait a moment.',
    'network_error': '🌐 Network error. Check your connection.',
    'wrong_network': '🔗 Please switch to Arbitrum network.',
    'wallet_not_connected': '🦊 Please connect your wallet first.',
    'liquidation_risk': '⚠️ Position at risk! Close or add margin.',
    'api_key_error': '🔑 API key error. Please reconnect your account.',
    'min_order_size': '📏 Order size below minimum. Increase size.',
    'max_leverage': '⚡ Leverage exceeds maximum. Reduce leverage.',
};
```

#### **4.2 User Notifications**

**Notification Types:**

```typescript
// Success
showNotification({
    type: 'success',
    title: '✅ Order Filled',
    message: 'Market buy 0.1 BTC @ $95,710',
    duration: 5000
});

// Warning
showNotification({
    type: 'warning',
    title: '⚠️ Liquidation Risk',
    message: 'BTC-USD position at 90% margin usage',
    duration: 10000,
    action: { label: 'Close Position', onClick: closePosition }
});

// Error
showNotification({
    type: 'error',
    title: '❌ Order Failed',
    message: 'Insufficient balance. Need $1,000, have $500',
    duration: 8000
});

// Info
showNotification({
    type: 'info',
    title: 'ℹ️ New Market',
    message: 'SOL-USD now available for trading!',
    duration: 6000
});
```

#### **4.3 Retry Logic**

**Implementation:**
```typescript
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
    }
    throw new Error('Max retries exceeded');
}

// Usage
const balance = await retryWithBackoff(() => lighterApi.getBalance());
```

---

### **PHASE 5: TESTING (Day 6)**

#### **5.1 Unit Tests**

**Backend Tests:**
```python
# test_lighter_service.py

async def test_service_initialization():
    """Test Lighter service initializes correctly"""
    pass

async def test_get_balance():
    """Test balance retrieval"""
    pass

async def test_place_market_order():
    """Test market order placement"""
    pass

async def test_place_limit_order():
    """Test limit order placement"""
    pass

async def test_cancel_order():
    """Test order cancellation"""
    pass

async def test_get_positions():
    """Test position retrieval"""
    pass

async def test_close_position():
    """Test position closing"""
    pass

async def test_error_handling():
    """Test error scenarios"""
    pass
```

**Frontend Tests:**
```typescript
// TradingTerminal.test.tsx

describe('TradingTerminal', () => {
    test('renders correctly when connected', () => {});
    test('displays balance correctly', () => {});
    test('handles order submission', () => {});
    test('shows error on invalid input', () => {});
    test('updates positions in real-time', () => {});
    test('handles WebSocket reconnection', () => {});
});
```

#### **5.2 Integration Tests**

**Complete Trading Flow:**
```python
async def test_complete_trading_flow():
    """Test entire trading workflow"""
    # 1. Initialize service
    service = LighterService()
    await service.initialize(test_api_key, 3)
    
    # 2. Check balance
    balance = await service.get_balances()
    assert balance['available_balance'] > 0
    
    # 3. Place market order
    order = await service.place_market_order('BTC-USD', 'buy', 0.001)
    assert order['success'] == True
    
    # 4. Verify position opened
    positions = await service.get_positions()
    assert len(positions) > 0
    
    # 5. Close position
    result = await service.close_position('BTC-USD')
    assert result['success'] == True
    
    # 6. Verify position closed
    positions = await service.get_positions()
    btc_position = next((p for p in positions if p['symbol'] == 'BTC-USD'), None)
    assert btc_position is None
    
    await service.close()
```

#### **5.3 Manual Testing Checklist**

**Critical Path:**
```
□ Wallet connection works (MetaMask)
□ Lighter account creation successful
□ Balance displays correctly
□ Market order executes immediately
□ Limit order appears in active orders
□ Order cancellation works
□ Position opens after order fill
□ P&L updates in real-time
□ Position closes correctly
□ Order history populates
□ WebSocket reconnects on disconnect
□ Error messages display properly
□ All notifications work
□ Mobile responsive
□ No console errors
□ Performance <500ms response time
```

**Edge Cases:**
```
□ Insufficient balance handled
□ Wrong network detection works
□ Wallet disconnection handled
□ API rate limit handled
□ Invalid symbol handled
□ Minimum order size enforced
□ Maximum leverage enforced
□ Liquidation warning shows
□ WebSocket disconnect handled
□ API key expiration handled
```

---

### **PHASE 6: DEPLOYMENT (Day 7)**

#### **6.1 Production Configuration**

**Environment Variables:**
```bash
# Production
LIGHTER_API_URL=https://mainnet.zklighter.elliot.ai
LIGHTER_WS_URL=wss://mainnet.zklighter.elliot.ai/ws
DATABASE_URL=<production-database>
REDIS_URL=<production-redis>
ENCRYPTION_KEY=<production-key>

# Security
CORS_ORIGINS=https://circl.pages.dev
RATE_LIMIT_ENABLED=true
API_KEY_EXPIRY_HOURS=8

# Monitoring
SENTRY_DSN=<sentry-dsn>
LOG_LEVEL=INFO
```

#### **6.2 Deployment Checklist**

```
PRE-DEPLOYMENT:
□ All tests passing
□ No console errors
□ Error tracking configured (Sentry)
□ Monitoring configured
□ Backup system active
□ SSL certificates valid
□ Environment variables set
□ API keys encrypted
□ Rate limiting enabled
□ CORS configured
□ Database migrations ready

DEPLOYMENT:
□ Deploy backend to production
□ Deploy frontend to production
□ Run database migrations
□ Verify all endpoints working
□ Check WebSocket connections
□ Test wallet connection
□ Test order placement
□ Monitor error rates
□ Check performance metrics

POST-DEPLOYMENT:
□ Monitor for 24 hours
□ Check error logs
□ Verify trading working
□ Monitor user feedback
□ Check performance
□ Document any issues
```

#### **6.3 Beta Launch**

**Target:** 10-20 beta testers in Week 1

**Launch Plan:**
```
Day 1-2: Invite beta testers
□ Create beta signup form
□ Reach out to crypto trading communities
□ Post on Twitter/Discord/Reddit
□ Offer early access incentive

Day 3-4: Onboarding
□ Send onboarding emails
□ Create video tutorial
□ Set up support channel (Discord/Telegram)
□ Monitor first trades closely

Day 5-7: Feedback & Iteration
□ Collect user feedback
□ Fix critical bugs within 24h
□ Monitor trading volume
□ Track key metrics
□ Improve based on feedback
```

**Success Metrics (Week 1):**
```
□ 50 wallet connections
□ 20 funded accounts
□ 10 successful trades
□ $10,000+ trading volume
□ 0 critical bugs
□ 4.5+ star rating
□ 90%+ uptime
```

---

## 🎯 CRITICAL SUCCESS FACTORS

### **Technical Excellence:**
1. ✅ Lighter SDK integration works flawlessly
2. ✅ Orders execute reliably (<500ms)
3. ✅ Real-time data updates smoothly (60fps)
4. ✅ Zero critical bugs in production
5. ✅ System handles 100+ concurrent users
6. ✅ WebSocket stays connected
7. ✅ API keys securely encrypted

### **User Experience:**
1. ✅ Wallet connection seamless (<30s)
2. ✅ Trading feels instant (<500ms latency)
3. ✅ Zero fees prominently displayed
4. ✅ UI intuitive (zero confusion)
5. ✅ Errors helpful, not cryptic
6. ✅ Mobile responsive
7. ✅ Professional appearance

### **Business Goals:**
1. ✅ 50 beta users in Week 1
2. ✅ 10+ active daily traders
3. ✅ $10k+ trading volume Week 1
4. ✅ Zero critical failures
5. ✅ Positive feedback (4+ stars)
6. ✅ Organic growth starting
7. ✅ Clear path to 500 users

---

## 🔥 CORE PRINCIPLES FOR IMPLEMENTATION

### **1. SECURITY FIRST:**
- Never store API keys in plaintext
- Always encrypt sensitive data
- Use Supabase Vault for key storage
- Validate all inputs
- Sanitize all outputs
- Implement rate limiting
- Use HTTPS everywhere
- Log security events

### **2. PERFORMANCE MATTERS:**
- Async/await throughout
- Cache frequently accessed data
- Optimize database queries
- Minimize API calls
- Use WebSocket for real-time data
- Lazy load components
- Compress responses
- CDN for static assets

### **3. USER EXPERIENCE:**
- Loading states everywhere
- Meaningful error messages
- Instant feedback (<100ms)
- Smooth animations
- Mobile-first design
- Keyboard shortcuts
- Accessibility (a11y)
- Dark mode support

### **4. CODE QUALITY:**
- Type hints (Python) / TypeScript
- Comprehensive error handling
- Unit tests (80%+ coverage)
- Integration tests
- Code documentation
- Meaningful variable names
- DRY principle
- SOLID principles

### **5. MONITORING & LOGGING:**
- Log all trading operations
- Track error rates
- Monitor API latency
- Alert on failures
- User analytics
- Performance metrics
- Business metrics
- Error tracking (Sentry)

---

## 💡 IMPLEMENTATION TIPS

### **Common Pitfalls to Avoid:**

```
❌ Don't hardcode API keys
❌ Don't skip error handling
❌ Don't ignore input validation
❌ Don't forget rate limits
❌ Don't expose secrets in logs
❌ Don't forget to close connections
❌ Don't assume orders always fill
❌ Don't ignore liquidation risk
❌ Don't skip testing
❌ Don't deploy without monitoring
```

### **Best Practices:**

```
✅ Encrypt all sensitive data
✅ Validate all user inputs
✅ Handle all edge cases
✅ Log errors with context
✅ Test thoroughly before deploy
✅ Document complex logic
✅ Monitor in production
✅ Have rollback plan
✅ Use meaningful names
✅ Keep functions small (<50 lines)
```

### **Performance Optimizations:**

```python
# Use connection pooling
# Cache market data (5 second TTL)
# Batch multiple orders
# Use WebSocket for real-time updates
# Lazy load order history
# Paginate large datasets
# Compress API responses
# Use CDN for static files
```

---

## 🚀 FINAL DELIVERABLES

### **By End of Day 7, You Should Have:**

**Backend:**
- ✅ Fully functional Lighter service
- ✅ All API endpoints working
- ✅ WebSocket real-time updates
- ✅ Database models created
- ✅ Error handling implemented
- ✅ Tests passing (80%+ coverage)
- ✅ Deployed to production

**Frontend:**
- ✅ Wallet connection working
- ✅ Trading terminal functional
- ✅ Order placement working
- ✅ Position management working
- ✅ Real-time updates working
- ✅ Error notifications working
- ✅ Mobile responsive
- ✅ Deployed to production

**Documentation:**
- ✅ API documentation
- ✅ Setup instructions
- ✅ User guide
- ✅ Deployment guide
- ✅ Troubleshooting guide

**Testing:**
- ✅ Unit tests passing
- ✅ Integration tests passing
- ✅ Manual testing completed
- ✅ Beta users onboarded

**Metrics:**
- ✅ 50 wallet connections
- ✅ 20 funded accounts
- ✅ 10 successful trades
- ✅ $10k+ volume
- ✅ 0 critical bugs
- ✅ 90%+ uptime

---

## 🎬 EXECUTION COMMAND

**This PDR prompt is ready for Claude Code Opus 4.5.**

**Expected timeline: 7 days**
**Expected outcome: Fully functional Bitnine trading platform with Lighter DEX integration**

**Key differentiator: ZERO TRADING FEES! 🔥**

---

*Version: 1.0*  
*Created: 2026-01-16*  
*Status: READY FOR EXECUTION*  
*Let's build a MOTHERFUCKING trading empire! 💎🚀*