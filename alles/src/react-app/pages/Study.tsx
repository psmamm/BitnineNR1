import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  ArrowRight,
  CheckCircle,
  Play,
  ChevronLeft,
  TrendingUp,
  Shield,
  Target,
  BarChart3,
  Brain,
  Clock,
  Layers,
  Zap,
  Gauge,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  BookOpen,
  DollarSign,
  Wallet,
  CreditCard,
  PieChart,
  TrendingUpDown,
  LineChart,
  Coins,
  Bitcoin,
  Hexagon,
  Banknote,
  CandlestickChart,
  Volume2,
  BarChart,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/react-app/components/DashboardLayout';

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  keyPoints: string[];
  icon: React.ElementType;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  completed: boolean;
}

interface Category {
  id: string;
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Final';
  chapterNumber?: number;
  icon: React.ElementType;
  lessons: Lesson[];
  color: string;
}

const studyData: Category[] = [
  // Beginner Section
  {
    id: 'trading-101',
    name: 'Trading 101',
    level: 'Beginner',
    icon: BookOpen,
    color: '#10B981',
    lessons: [
      {
        id: 'what-is-trading',
        title: 'What is Trading?',
        description: 'Understanding the fundamentals of trading and financial markets',
        content: `Trading means buying and selling financial assets like Bitcoin, Ethereum, or stocks in order to profit from short‑term price changes.

- Goal: Make profit from market volatility (buy low → sell high, or short sell).
- Time Frame: Minutes, hours, or a few days (not years).
- Focus: Technical analysis — charts, indicators, patterns.
- Activity: Requires active monitoring and frequent trades.
- Risk/Reward: Higher risk than long‑term investing, but potential for larger gains.

👉 In short: Trading = fast, short‑term, active, high risk and high reward.`,
        keyPoints: [
          'Trading involves buying and selling assets for short-term profit',
          'Different trading styles suit different personalities and schedules',
          'Education and risk management are crucial for success',
          'Start small and only risk what you can afford to lose',
          'Market analysis helps predict price movements'
        ],
        icon: TrendingUp,
        difficulty: 'Beginner',
        duration: '8 min',
        completed: false
      },
      {
        id: 'trading-vs-investing',
        title: 'Trading vs. Investing',
        description: 'Key differences between trading and long-term investing strategies',
        content: `Trading and investing are two different approaches to making money in financial markets.

Trading focuses on short‑term price movements. Traders use technical analysis, charts and patterns, and take advantage of volatility. It requires active monitoring, frequent trades, and carries higher risks but also the potential for higher returns.

Investing focuses on long‑term value growth. Investors buy and hold assets for months or years, relying on fundamentals like company strength, adoption, or technology. It requires patience, fewer trades, and usually offers lower risk but steady returns over time.

In short:
👉 Trading = fast, active, risky, short‑term.
👉 Investing = patient, steady, long‑term wealth building.`,
        keyPoints: [
          'Trading focuses on short-term price movements',
          'Investing targets long-term wealth building',
          'Trading requires active monitoring and analysis',
          'Investing uses buy-and-hold strategy',
          'Choose based on goals, risk tolerance, and time availability'
        ],
        icon: BarChart3,
        difficulty: 'Beginner',
        duration: '10 min',
        completed: false
      },
      {
        id: 'what-is-bitcoin',
        title: 'What is Bitcoin?',
        description: 'Introduction to Bitcoin, the first and largest cryptocurrency',
        content: `Bitcoin is the first decentralized digital currency.

• Definition: Bitcoin is money that exists only digitally. It is not controlled by any bank or government.
• Blockchain: All transactions are recorded on a public, transparent, and tamper-proof ledger called the blockchain.
• Limited Supply: There will only ever be 21 million Bitcoin. This scarcity makes it valuable, like digital gold.
• Mining: New Bitcoin is created through mining, where computers solve puzzles to secure transactions.
• Use Case: Bitcoin can be used for payments, transferring value, or as a store of value.

👉 In short: Bitcoin = digital money, decentralized, scarce, and secure.`,
        keyPoints: [
          'Bitcoin is the first and largest cryptocurrency',
          'Decentralized system with no central authority',
          'Limited supply of 21 million coins creates scarcity',
          'Operates on blockchain technology',
          'High volatility but potential store of value'
        ],
        icon: Bitcoin,
        difficulty: 'Beginner',
        duration: '12 min',
        completed: false
      },
      {
        id: 'what-is-blockchain',
        title: 'What is Blockchain?',
        description: 'Understanding blockchain technology and how it powers cryptocurrencies',
        content: `A blockchain is a special kind of database that stores information in blocks, which are linked together in order, forming a chain.

- Ledger: A distributed ledger, no single bank or government controls it. Everyone shares copies.
- Blocks: Transactions are grouped into blocks. Each block has data, a timestamp, and a hash linking to the previous block.
- Security: Because blocks are linked, altering one would mean altering all, making blockchains secure and tamper‑resistant.
- Transparency: Anyone can check and verify transactions, making it open.
- Use Case: Blockchain powers cryptocurrencies like Bitcoin, but also supply chains, voting systems, and more.

👉 In short: Blockchain = secure, decentralized, transparent chain of blocks.`,
        keyPoints: [
          'Blockchain is a distributed digital ledger',
          'Data is stored in connected blocks across many computers',
          'Immutable and transparent by design',
          'Eliminates need for central authorities',
          'Powers cryptocurrencies and many other applications'
        ],
        icon: Layers,
        difficulty: 'Beginner',
        duration: '15 min',
        completed: false
      },
      {
        id: 'what-are-cryptocurrencies',
        title: 'What are Cryptocurrencies?',
        description: 'Introduction to digital currencies and the crypto ecosystem',
        content: `Cryptocurrencies are digital currencies that use decentralized blockchain technology. 
They allow peer-to-peer transactions globally without banks. 
Bitcoin was the first cryptocurrency (2009). 
Now thousands exist (Ethereum, Solana, ADA). 
Key features: decentralized, transparent, global, fast. 

👉 In short: Cryptos = digital and decentralized money.`,
        keyPoints: [
          'Digital currencies secured by cryptography',
          'Operate independently of central banks',
          'Use blockchain technology for transparency',
          'Enable global, 24/7 transactions',
          'High potential but also high volatility'
        ],
        icon: Coins,
        difficulty: 'Beginner',
        duration: '13 min',
        completed: false
      },
      {
        id: 'altcoins-vs-bitcoin',
        title: 'Altcoins vs. Bitcoin',
        description: 'Understanding alternative cryptocurrencies and their differences from Bitcoin',
        content: `Bitcoin is the first cryptocurrency, trusted and limited to 21 million. 
Altcoins are every other crypto besides Bitcoin. 
Altcoins explore new tech like smart contracts, DeFi, or NFTs. 
Bitcoin is more stable, altcoins are riskier but can offer bigger gains. 

👉 In short: Bitcoin = digital gold. Altcoins = innovation, higher risk.`,
        keyPoints: [
          'Altcoins are all cryptocurrencies except Bitcoin',
          'Different altcoins serve various purposes and use cases',
          'Bitcoin has first-mover advantage and institutional adoption',
          'Altcoins often innovate with new features',
          'Both have roles in a diversified crypto portfolio'
        ],
        icon: PieChart,
        difficulty: 'Beginner',
        duration: '11 min',
        completed: false
      },
      {
        id: 'what-is-ethereum',
        title: 'What is Ethereum? (Smart Contracts explained)',
        description: 'Understanding Ethereum blockchain and smart contract functionality',
        content: `Ethereum is the second-largest crypto after Bitcoin. 
It introduced smart contracts, code that runs automatically on blockchain. 
Developers use it to build DeFi, NFTs, and dApps. 
ETH is the currency to pay gas fees. 

👉 In short: Ethereum = a global decentralized computer with smart contracts.`,
        keyPoints: [
          'Ethereum is a programmable blockchain platform',
          'Smart contracts execute automatically when conditions are met',
          'Powers DeFi, NFTs, and dApps',
          'Uses Ether (ETH) for transaction fees',
          'Transitioned to Proof of Stake for efficiency'
        ],
        icon: Hexagon,
        difficulty: 'Beginner',
        duration: '14 min',
        completed: false
      },
      {
        id: 'crypto-wallets',
        title: 'Wallets (Hot vs Cold, seed phrases)',
        description: 'Understanding cryptocurrency storage and wallet security',
        content: `Wallets store your crypto. 
Hot wallets: online, convenient but less secure (MetaMask, apps). 
Cold wallets: offline hardware wallets, very secure but less convenient. 
Seed phrase: 12–24 backup words that give access. If lost, funds are gone. 

👉 In short: Hot = easy, Cold = secure, Seed phrase = your key.`,
        keyPoints: [
          'Wallets store private keys, not actual cryptocurrencies',
          'Hot wallets are convenient but less secure',
          'Cold wallets provide maximum security for storage',
          'Seed phrases are crucial backups - keep them safe',
          'Use combination of both wallet types for optimal security'
        ],
        icon: Wallet,
        difficulty: 'Beginner',
        duration: '12 min',
        completed: false
      },
      {
        id: 'exchanges-cex-vs-dex',
        title: 'Exchanges (CEX vs DEX)',
        description: 'Understanding centralized and decentralized cryptocurrency exchanges',
        content: `CEX = centralized exchanges like Binance or Coinbase. Easy but requires trust. 
DEX = decentralized exchanges (Uniswap, PancakeSwap). No middleman, peer-to-peer. 
CEX is user-friendly; DEX gives users more control. 

👉 In short: CEX = easy but centralized. DEX = decentralized and advanced.`,
        keyPoints: [
          'CEXs are traditional company-operated exchanges',
          'DEXs enable direct peer-to-peer trading',
          'CEXs offer convenience and liquidity',
          'DEXs provide control and privacy',
          'Choose based on your trading needs and experience'
        ],
        icon: CreditCard,
        difficulty: 'Beginner',
        duration: '13 min',
        completed: false
      },
      {
        id: 'stablecoins-explained',
        title: 'Stablecoins explained',
        description: 'Understanding stable-value cryptocurrencies and their importance',
        content: `Stablecoins are cryptos pegged to stable assets, usually US Dollar. 
Examples: USDT, USDC, DAI. 
They hold $1 value. 
Used in trading and DeFi for stability. 
Risks: centralized custody or algorithmic failure. 

👉 In short: Stablecoins = digital dollars.`,
        keyPoints: [
          'Stablecoins maintain stable value through various mechanisms',
          'Fiat-backed are most common and stable',
          'Crypto-backed offer decentralization',
          'Algorithmic attempt stability without collateral',
          'Essential for trading, DeFi, and payments'
        ],
        icon: Banknote,
        difficulty: 'Beginner',
        duration: '11 min',
        completed: false
      },
      {
        id: 'trading-fees',
        title: 'Trading Fees (Maker/Taker)',
        description: 'Understanding different types of trading fees and how they work',
        content: `Exchanges charge fees. 
Maker: adds liquidity, lower fee. 
Taker: removes liquidity, higher fee. 
Fees vary across exchanges, often 0.1–0.3%. 

👉 In short: Maker = add liquidity (lower fees), Taker = remove liquidity (higher fees).`,
        keyPoints: [
          'Maker orders add liquidity, taker orders remove it',
          'Makers typically pay lower fees than takers',
          'Higher trading volumes often reduce fees',
          'Exchange tokens can provide fee discounts',
          'Consider all costs: trading, spread, and withdrawal fees'
        ],
        icon: DollarSign,
        difficulty: 'Beginner',
        duration: '10 min',
        completed: false
      },
      {
        id: 'risk-basics',
        title: 'Risk Basics (only invest what you can afford to lose)',
        description: 'Fundamental risk management principles for crypto trading',
        content: `Crypto is volatile. 
Golden Rule: only invest what you can afford to lose. 
Diversify, don't go all-in on one coin. 
Never invest rent money. 

👉 In short: Protect yourself; manage risk wisely.`,
        keyPoints: [
          'Never invest more than you can afford to lose completely',
          'Risk only 1-3% of capital per trade',
          'Use stop losses to limit downside',
          'Maintain at least 1:2 risk-reward ratios',
          'Control emotions and stick to your plan'
        ],
        icon: Shield,
        difficulty: 'Beginner',
        duration: '12 min',
        completed: false
      }
    ]
  },

  // Intermediate Section
  {
    id: 'intermediate-analysis',
    name: 'Technical Analysis Fundamentals',
    level: 'Intermediate',
    icon: BarChart3,
    color: '#F59E0B',
    lessons: [
      {
        id: 'candlestick-basics',
        title: 'Candlestick Basics',
        description: 'Understanding candlestick charts and basic patterns',
        content: `Candlestick charts are the most popular way to display price data in trading, providing more information than simple line charts.

Candlestick Anatomy:
Each candlestick represents price action over a specific time period (1 minute, 1 hour, 1 day, etc.).

Components:
- Body: Area between opening and closing prices
- Wicks/Shadows: Lines extending from body showing high/low prices
- Open: First price of the period
- Close: Last price of the period
- High: Highest price during the period
- Low: Lowest price during the period

Color Coding:
- Green/White Candle: Close higher than open (bullish)
- Red/Black Candle: Close lower than open (bearish)

Basic Candlestick Patterns:

Single Candle Patterns:

Doji:
- Open and close are nearly equal
- Indicates indecision in the market
- Potential reversal signal at key levels

Hammer:
- Small body at top of candle
- Long lower wick (2x body size)
- Bullish reversal signal at support

Shooting Star:
- Small body at bottom of candle
- Long upper wick (2x body size)
- Bearish reversal signal at resistance

Engulfing Patterns:

Bullish Engulfing:
- Large green candle completely engulfs previous red candle
- Strong bullish reversal signal
- More powerful at support levels

Bearish Engulfing:
- Large red candle completely engulfs previous green candle
- Strong bearish reversal signal
- More powerful at resistance levels

Reading Market Sentiment:
- Long green bodies: Strong buying pressure
- Long red bodies: Strong selling pressure
- Long wicks: Rejection of prices in that direction
- Small bodies: Indecision or consolidation

Time Frames:
- 1m-15m: Scalping and very short-term trades
- 1h-4h: Day trading and swing entries
- Daily: Swing trading and position entries
- Weekly: Long-term trend analysis`,
        keyPoints: [
          'Candlesticks show open, high, low, close for each period',
          'Green candles are bullish, red candles are bearish',
          'Doji patterns indicate market indecision',
          'Engulfing patterns signal potential reversals',
          'Wick length shows rejection of price levels'
        ],
        icon: CandlestickChart,
        difficulty: 'Intermediate',
        duration: '15 min',
        completed: false
      },
      {
        id: 'support-resistance',
        title: 'Support & Resistance',
        description: 'Identifying key price levels where price tends to react',
        content: `Support and resistance are horizontal price levels where price tends to reverse or consolidate, forming the foundation of technical analysis.

Support Levels:
Support is a price level where buying interest is strong enough to prevent price from falling further.

Characteristics:
- Price bounces higher from support levels
- Represents areas where buyers step in
- Previous lows often become support
- Psychological round numbers (e.g., $30,000 for Bitcoin)

Resistance Levels:
Resistance is a price level where selling pressure prevents price from rising further.

Characteristics:
- Price reverses lower from resistance levels
- Represents areas where sellers step in
- Previous highs often become resistance
- Key psychological levels act as resistance

Types of Support and Resistance:

1. Horizontal Levels:
- Previous significant highs and lows
- Round psychological numbers
- Previous breakout/breakdown points

2. Dynamic Levels:
- Moving averages (50, 100, 200 periods)
- Trendlines and channels
- Fibonacci retracement levels

3. Volume-Based Levels:
- High volume nodes from volume profile
- Areas of significant trading activity
- Value area highs and lows

Role Reversal:
When support or resistance is broken with conviction:
- Broken Support becomes Resistance
- Broken Resistance becomes Support

This happens because traders who bought at previous support now want to sell at breakeven when price returns.

Strength Factors:
Levels become stronger when they have:
- Multiple touches: More tests = stronger level
- High volume: Significant trading at the level
- Time significance: Longer holding periods
- Round numbers: Psychological importance
- Confluence: Multiple indicators aligning

Trading Support and Resistance:

Buy at Support:
- Look for bounce signals (hammer, bullish engulfing)
- Place stop loss below support
- Target next resistance level

Sell at Resistance:
- Look for rejection signals (shooting star, bearish engulfing)
- Place stop loss above resistance
- Target next support level

Breakout Trading:
- Wait for convincing break with volume
- Look for retest of broken level as new support/resistance
- Target next significant level`,
        keyPoints: [
          'Support prevents price from falling, resistance prevents rising',
          'Previous highs/lows and round numbers are key levels',
          'Broken support becomes resistance and vice versa',
          'Multiple touches and high volume strengthen levels',
          'Use for entry/exit points and stop loss placement'
        ],
        icon: BarChart,
        difficulty: 'Intermediate',
        duration: '14 min',
        completed: false
      },
      {
        id: 'trendlines-channels',
        title: 'Trendlines & Channels',
        description: 'Drawing and using trendlines to identify market direction',
        content: `Trendlines and channels help identify market direction and provide dynamic support and resistance levels for trading decisions.

Trendlines Basics:
A trendline is a straight line connecting two or more price points that extends into the future to act as a line of support or resistance.

Drawing Trendlines:

Uptrend Lines (Support):
- Connect two or more rising lows
- Line should slope upward
- Price should respect the line as support
- Draw from bottom-left to top-right

Downtrend Lines (Resistance):
- Connect two or more declining highs
- Line should slope downward
- Price should respect the line as resistance
- Draw from top-left to bottom-right

Trendline Rules:
1. Minimum two points needed to draw a line
2. Third touch confirms the validity
3. More touches = stronger trendline
4. Steeper lines break easier than gradual ones
5. Longer timeframes = more significant

Trend Channels:
Channels are formed by drawing parallel lines to contain price movement.

Channel Components:
- Lower trendline: Support in uptrend, main trend in downtrend
- Upper trendline: Resistance in uptrend, main trend in downtrend
- Channel width: Distance between parallel lines

Types of Channels:

1. Ascending Channel (Uptrend):
- Higher highs and higher lows
- Both lines slope upward
- Buy at channel bottom, sell at channel top

2. Descending Channel (Downtrend):
- Lower highs and lower lows
- Both lines slope downward
- Sell at channel top, buy at channel bottom

3. Horizontal Channel (Sideways):
- Flat support and resistance levels
- Price oscillates between levels
- Range-bound trading strategy

Trading Trendlines and Channels:

Trend Following:
- Buy when price bounces off uptrend line
- Sell when price rejects from downtrend line
- Use trendline as dynamic stop loss

Breakout Trading:
- Wait for convincing break with volume
- False breaks are common, wait for confirmation
- Target measuring move based on channel width

Channel Trading:
- Buy at channel support in uptrends
- Sell at channel resistance in downtrends
- Take profits at opposite channel line

Trendline Breaks:
When a significant trendline breaks:
- Often signals trend change
- Look for retest of broken line
- New trend may emerge in opposite direction

Common Mistakes:
- Forcing trendlines through price action
- Drawing too many lines (chart clutter)
- Ignoring false breaks
- Not waiting for confirmation`,
        keyPoints: [
          'Connect two or more highs/lows to draw trendlines',
          'Uptrend lines provide support, downtrend lines resistance',
          'Channels contain price between parallel trendlines',
          'More touches make trendlines stronger',
          'Breaks often signal trend changes'
        ],
        icon: TrendingUpDown,
        difficulty: 'Intermediate',
        duration: '13 min',
        completed: false
      },
      {
        id: 'technical-indicators',
        title: 'Indicators: SMA, EMA, RSI, MACD, Bollinger Bands',
        description: 'Understanding and using popular technical indicators',
        content: `Technical indicators are mathematical calculations based on price and volume data that help traders identify trends, momentum, and potential reversal points.

Moving Averages:

Simple Moving Average (SMA):
- Arithmetic mean of prices over specified periods
- Equal weight to all periods
- Slower to react to price changes
- Common periods: 20, 50, 100, 200

Exponential Moving Average (EMA):
- Gives more weight to recent prices
- Faster response to price changes
- Preferred for short-term trading
- Same common periods as SMA

Moving Average Uses:
- Trend Direction: Price above MA = uptrend, below = downtrend
- Dynamic Support/Resistance: MAs act as support in uptrends
- Crossovers: Fast MA crossing slow MA signals trend change
- Golden Cross: 50 MA above 200 MA (bullish)
- Death Cross: 50 MA below 200 MA (bearish)

Relative Strength Index (RSI):
RSI measures momentum by comparing recent gains to losses on a scale of 0-100.

RSI Interpretation:
- Above 70: Potentially overbought (sell signal)
- Below 30: Potentially oversold (buy signal)
- 50 Level: Midline between bullish/bearish momentum
- Divergence: Price vs RSI moving in opposite directions

RSI Trading Strategies:
- Buy when RSI crosses above 30 from oversold
- Sell when RSI crosses below 70 from overbought
- Look for bullish divergence at support levels
- Look for bearish divergence at resistance levels

MACD (Moving Average Convergence Divergence):
MACD shows the relationship between two moving averages of a security's price.

MACD Components:
- MACD Line: 12 EMA - 26 EMA
- Signal Line: 9 EMA of MACD line
- Histogram: MACD line - signal line

MACD Signals:
- Bullish: MACD crosses above signal line
- Bearish: MACD crosses below signal line
- Zero Line: MACD above/below indicates trend direction
- Divergence: Price vs MACD moving opposite directions

Bollinger Bands:
Three lines: middle (20 SMA), upper (+2 standard deviations), lower (-2 standard deviations).

Bollinger Band Interpretation:
- Band Width: Volatility measure (wide = high volatility)
- Band Squeeze: Low volatility, potential breakout coming
- Price at Upper Band: Potentially overbought
- Price at Lower Band: Potentially oversold
- Bollinger Bounce: Price bouncing between bands

Bollinger Band Strategies:
- Mean Reversion: Buy at lower band, sell at upper band
- Breakout: Price outside bands may continue trending
- Squeeze Play: Expect expansion after contraction

Combining Indicators:
- Trend + Momentum: MA direction + RSI confirmation
- Multiple Timeframes: Daily trend + hourly entry
- Confluence: Multiple indicators agreeing
- Avoid Overcomplication: 2-3 indicators maximum`,
        keyPoints: [
          'Moving averages identify trend direction and support/resistance',
          'RSI measures momentum and overbought/oversold conditions',
          'MACD shows relationship between moving averages',
          'Bollinger Bands measure volatility and price extremes',
          'Combine indicators for confirmation, avoid overcomplication'
        ],
        icon: LineChart,
        difficulty: 'Intermediate',
        duration: '18 min',
        completed: false
      },
      {
        id: 'timeframes',
        title: 'Timeframes (1m, 1h, Daily, Weekly)',
        description: 'Understanding different timeframes and their trading applications',
        content: `Different timeframes provide different perspectives on market action. Understanding how to use multiple timeframes is crucial for successful trading.

Timeframe Categories:

Ultra Short-term (1m, 5m):
- Use Cases: Scalping, quick entries/exits
- Characteristics: High noise, frequent signals
- Pros: Quick profits, many opportunities
- Cons: High stress, higher fees, more false signals

Short-term (15m, 1h):
- Use Cases: Day trading, intraday moves
- Characteristics: Good signal-to-noise ratio
- Pros: Multiple daily opportunities, manageable stress
- Cons: Requires constant monitoring

Medium-term (4h, Daily):
- Use Cases: Swing trading, trend following
- Characteristics: Cleaner signals, less noise
- Pros: Better risk/reward, less time intensive
- Cons: Fewer opportunities, overnight risk

Long-term (Weekly, Monthly):
- Use Cases: Position trading, long-term investing
- Characteristics: Very reliable signals
- Pros: Highest probability setups, minimal monitoring
- Cons: Very few signals, requires patience

Multiple Timeframe Analysis:

Top-Down Approach:
1. Higher Timeframe: Identify overall trend (Daily/Weekly)
2. Medium Timeframe: Find entry zones (4h/1h)
3. Lower Timeframe: Fine-tune entry and exit (15m/5m)

Example Analysis:
- Weekly: BTC in uptrend above 200 MA
- Daily: Pullback to 50 MA support level
- 1h: Bullish divergence at support
- 15m: Entry on break above resistance

Timeframe Rules:

Rule 1: Trend Alignment
- Trade in direction of higher timeframe trend
- Never fight the daily trend on lower timeframes
- Use pullbacks in trends for entries

Rule 2: Support/Resistance Hierarchy
- Weekly levels stronger than daily
- Daily levels stronger than hourly
- Respect higher timeframe levels

Rule 3: Signal Strength
- Signals on higher timeframes more reliable
- Lower timeframe signals for timing only
- Wait for higher timeframe confirmation

Timeframe Selection by Trading Style:

Scalpers (1m-15m):
- Multiple trades per day
- Quick profits, tight stops
- High win rate, small risk/reward

Day Traders (15m-4h):
- 1-5 trades per day
- Balanced approach
- Moderate risk/reward ratios

Swing Traders (4h-Weekly):
- 1-5 trades per week
- Capture major moves
- High risk/reward ratios

Position Traders (Daily-Monthly):
- Few trades per month
- Long-term trend following
- Highest risk/reward ratios

Common Timeframe Mistakes:
- Switching timeframes during trades
- Ignoring higher timeframe context
- Using wrong timeframe for strategy
- Overanalyzing on too many timeframes`,
        keyPoints: [
          'Different timeframes suit different trading styles',
          'Higher timeframes provide trend context',
          'Lower timeframes used for precise entry timing',
          'Always respect higher timeframe levels',
          'Use top-down analysis for best results'
        ],
        icon: Clock,
        difficulty: 'Intermediate',
        duration: '14 min',
        completed: false
      },
      {
        id: 'volume-analysis',
        title: 'Volume Analysis Basics',
        description: 'Understanding volume and its role in confirming price movements',
        content: `Volume is the number of shares or contracts traded during a specific period. It's a crucial indicator that confirms price movements and reveals market sentiment.

Why Volume Matters:
Volume represents the strength behind price movements. High volume confirms moves, while low volume suggests weakness or lack of conviction.

Basic Volume Principles:

1. Volume Confirms Trends:
- Uptrend: Rising prices with increasing volume
- Downtrend: Falling prices with increasing volume
- Weak Trend: Price movement with declining volume

2. Volume Precedes Price:
- Unusual volume often occurs before significant moves
- Institutional accumulation/distribution shows in volume
- Smart money leaves footprints through volume

Volume Patterns:

Climax Volume:
- Extremely high volume at trend extremes
- Often marks trend reversals
- Panic selling or euphoric buying
- Look for exhaustion patterns

Breakout Volume:
- Significant increase during level breaks
- Confirms validity of breakouts
- Low volume breakouts often fail
- Volume should be 1.5-2x average

Volume Dry-Up:
- Decreasing volume during consolidation
- Indicates building pressure
- Often precedes significant moves
- Spring-loading effect

Volume Analysis Techniques:

1. Volume Moving Average:
- Compare current volume to average
- Above average = institutional interest
- Below average = retail/algorithm driven

2. Volume Oscillators:
- On-Balance Volume (OBV)
- Volume Rate of Change (VROC)
- Accumulation/Distribution Line

3. Volume Profile:
- Shows volume traded at each price level
- Identifies high volume nodes (HVN)
- Identifies low volume nodes (LVN)
- Value Area and Point of Control (POC)

Volume in Different Market Phases:

Accumulation Phase:
- Rising volume with sideways price
- Smart money building positions
- Low volatility, high volume

Markup Phase:
- Increasing volume with rising prices
- Public participation increases
- Trend acceleration

Distribution Phase:
- High volume with sideways price
- Smart money selling to public
- Price struggles to advance

Markdown Phase:
- Increasing volume with falling prices
- Panic selling emerges
- Capitulation at extremes

Volume Divergence:
When price and volume move in opposite directions:

Bullish Divergence:
- Price makes lower lows
- Volume makes higher lows
- Suggests selling pressure weakening

Bearish Divergence:
- Price makes higher highs
- Volume makes lower highs
- Suggests buying pressure weakening

Trading with Volume:
- Confirm breakouts with volume spikes
- Identify reversals at volume climaxes
- Spot accumulation during volume increases
- Avoid low volume environments
- Use volume as stop loss guide`,
        keyPoints: [
          'Volume confirms the strength of price movements',
          'High volume validates breakouts and reversals',
          'Volume often leads price action',
          'Look for volume divergences with price',
          'Different market phases show distinct volume patterns'
        ],
        icon: Volume2,
        difficulty: 'Intermediate',
        duration: '16 min',
        completed: false
      }
    ]
  },

  // Advanced Section (existing content)
  {
    id: 'market-structure',
    name: 'Market Structure',
    level: 'Advanced',
    chapterNumber: 1,
    icon: Layers,
    color: '#6A3DF4',
    lessons: [
      {
        id: 'manipulation-displacement',
        title: 'Manipulation & Displacement Theory',
        description: 'Understanding how smart money manipulates price and creates displacement',
        content: `Market manipulation is a deliberate attempt by large institutions (smart money) to move prices in their favor before executing large trades. Understanding this concept is crucial for retail traders.

Manipulation Phase:
Smart money creates false moves to trick retail traders into taking the wrong positions. They accumulate or distribute positions during periods of low volatility before making their real move.

Displacement Theory:
After manipulation, smart money creates a strong directional move (displacement) that breaks significant levels. This displacement reveals the true intention of institutional traders.

Key Concepts:
- Liquidity grabs above/below key levels
- False breakouts to trigger stop losses
- Accumulation/distribution phases
- Institutional order flow vs retail sentiment`,
        keyPoints: [
          'Smart money manipulates price before major moves',
          'Displacement shows the true institutional direction',
          'Look for liquidity grabs at key levels',
          'False moves often precede real directional moves',
          'Retail sentiment is usually opposite to smart money'
        ],
        icon: Zap,
        difficulty: 'Advanced',
        duration: '15 min',
        completed: false
      },
      {
        id: 'impulse-structure',
        title: 'Impulse Structure',
        description: 'Identifying and trading impulse moves in the market',
        content: `Impulse structure represents the strong directional moves that smart money creates after manipulation phases. These moves show the true institutional bias.

Characteristics of Impulse Moves:
- Strong momentum with minimal retracements
- High volume and volatility
- Breaks through multiple levels quickly
- Often occurs after periods of consolidation

Trading Impulse Structure:
1. Identify the manipulation phase (consolidation/range)
2. Wait for the impulse break (displacement)
3. Look for retracement opportunities to join the move
4. Target the next institutional levels

Structure Types:
- Bullish Impulse: Strong move higher after manipulation low
- Bearish Impulse: Strong move lower after manipulation high`,
        keyPoints: [
          'Impulse moves show institutional direction',
          'Follow strong momentum after manipulation',
          'Trade retracements, not initial breakouts',
          'High volume confirms genuine impulse',
          'Target next institutional levels'
        ],
        icon: TrendingUp,
        difficulty: 'Advanced',
        duration: '12 min',
        completed: false
      },
      {
        id: 'premium-discount',
        title: 'Premium & Discount Theory',
        description: 'Understanding premium and discount pricing in market structure',
        content: `Premium and Discount Theory helps traders identify whether an asset is trading at a premium (expensive) or discount (cheap) relative to a key level or range.

Premium Zones:
- Price is trading in the upper portion of a range
- Usually above the 50% level of a significant move
- Selling opportunities are more favorable
- Look for rejection and bearish order flow

Discount Zones:
- Price is trading in the lower portion of a range
- Usually below the 50% level of a significant move  
- Buying opportunities are more favorable
- Look for support and bullish order flow

Equilibrium:
- The midpoint (50%) between premium and discount
- Often acts as support/resistance
- Key decision point for price direction

Application:
Use this theory to determine the best direction to trade and risk-reward opportunities.`,
        keyPoints: [
          'Premium = upper range, favor selling',
          'Discount = lower range, favor buying',
          'Equilibrium at 50% is key decision point',
          'Better risk-reward at discount levels',
          'Combine with market structure for entries'
        ],
        icon: Gauge,
        difficulty: 'Advanced',
        duration: '10 min',
        completed: false
      }
    ]
  },

  // Final Section
  {
    id: 'putting-together',
    name: 'Putting it All Together',
    level: 'Final',
    icon: CheckSquare,
    color: '#10B981',
    lessons: [
      {
        id: 'putting-together',
        title: 'Putting it All Together',
        description: 'Comprehensive framework combining all learned concepts',
        content: `Now that you've learned all the individual concepts, it's time to create a comprehensive trading framework that combines everything into a systematic approach.

The Complete Trading Framework:

Phase 1: Higher Timeframe Analysis (Daily/4H)
1. Market Structure: Identify overall trend and key levels
2. Liquidity Analysis: Mark significant liquidity pools
3. Premium/Discount: Determine price positioning
4. Bias Determination: Use IRL/ERL and alignment factors

Phase 2: Session Planning (Pre-Market)
1. Overnight Review: Analyze what happened during off-hours
2. Key Level Updates: Adjust levels based on new price action
3. Scenario Planning: Prepare for both bullish and bearish scenarios
4. Economic Calendar: Check for high-impact news events

Phase 3: Execution Phase (Entry Timeframe)
1. Zone Identification: Wait for price to reach predetermined zones
2. Confluence Factors: Look for multiple confirmations
3. Entry Triggers: Use FVGs, Order Blocks, or Breaker Blocks
4. Risk Management: Define stop loss and position size

Phase 4: Management Phase
1. Structure Monitoring: Watch for structure breaks or holds
2. Target Management: Take profits at institutional levels
3. Trail Stops: Use market structure for stop adjustments
4. Exit Strategy: Close before major reversal zones

Integration Checklist:
✓ HTF bias confirmed across multiple factors
✓ Session plan prepared with clear scenarios
✓ Entry zone identified with multiple confluence
✓ Risk/reward ratio calculated and acceptable
✓ Management plan defined before entry`,
        keyPoints: [
          'Combine all concepts into systematic framework',
          'Start with higher timeframe, work down to execution',
          'Multiple confluence factors increase probability',
          'Always have a management plan before entry',
          'Consistency in application leads to success'
        ],
        icon: CheckSquare,
        difficulty: 'Advanced',
        duration: '20 min',
        completed: false
      },
      {
        id: 'entry-checklist',
        title: 'Entry Checklist',
        description: 'Complete checklist to validate trade entries',
        content: `A systematic entry checklist ensures consistency and removes emotional decision-making from your trading process.

Pre-Entry Checklist:

Market Structure Analysis:
□ Higher timeframe trend identified
□ Key support/resistance levels marked
□ Recent structure breaks noted
□ Overall bias direction confirmed

Liquidity Analysis:
□ Significant liquidity pools identified
□ Recent liquidity sweeps analyzed
□ Potential target liquidity marked
□ Price positioning relative to liquidity

Inefficiency Analysis:
□ Valid FVGs identified and marked
□ Order blocks located and confirmed
□ Breaker blocks checked for relevance
□ Premium/discount zones identified

Time and Session Analysis:
□ Current session characteristics understood
□ Killzone timing considered
□ Economic events checked
□ Volume patterns analyzed

Entry Confluence:
□ Multiple factors align in same direction
□ Entry zone clearly defined
□ Risk/reward ratio calculated (minimum 1:2)
□ Stop loss placement logical and tight

Risk Management:
□ Position size calculated based on account risk
□ Maximum risk per trade not exceeded (1-2%)
□ Multiple positions won't exceed total risk limit
□ Stop loss level won't cause emotional stress

Execution Readiness:
□ Entry trigger clearly defined
□ Stop loss level predetermined
□ Profit targets identified
□ Management plan prepared

Final Confirmation:
□ All major factors align
□ Confident in analysis
□ Ready to execute without hesitation
□ Prepared for both success and failure outcomes`,
        keyPoints: [
          'Use checklist for every potential trade',
          'All major factors must align before entry',
          'Risk management planned before execution',
          'Clear triggers and management plan ready',
          'Confidence in analysis before committing capital'
        ],
        icon: CheckCircle,
        difficulty: 'Advanced',
        duration: '12 min',
        completed: false
      },
      {
        id: 'risk-management-final',
        title: 'Risk Management',
        description: 'Advanced risk management techniques for consistent profitability',
        content: `Advanced risk management is the foundation of successful trading. It's not about being right all the time, but about managing losses and maximizing profits systematically.

Core Risk Management Principles:

1. Position Sizing Rules:
- Never risk more than 1-2% per trade
- Calculate position size based on stop distance
- Formula: Risk Amount ÷ (Entry Price - Stop Loss) = Position Size
- Reduce size during drawdown periods
- Increase size only with consistent profits

2. Stop Loss Management:
- Always use stops - no exceptions
- Place stops beyond key structure levels
- Use tight stops with larger position sizes
- Never move stops against you
- Trail stops using market structure

3. Profit Taking Strategy:
- Take partial profits at key resistance/support
- Trail remainder using structure levels
- Target institutional levels and liquidity pools
- Scale out of winners systematically
- Never let winners become losers

4. Portfolio Risk Management:
- Maximum 6% total risk across all open positions
- Diversify across different setups and timeframes
- Avoid overconcentration in correlated pairs
- Monitor correlation risk during high volatility
- Adjust overall exposure based on market conditions

Advanced Techniques:

Dynamic Position Sizing:
- Increase size when multiple factors align strongly
- Reduce size when confluence is weak
- Consider market volatility in sizing decisions
- Adjust based on recent performance

Correlation Management:
- Don't trade highly correlated pairs simultaneously
- Monitor USD strength across multiple pairs
- Consider sector correlation in stock trades
- Adjust positions during high correlation periods

Psychological Risk Management:
- Never risk money you can't afford to lose
- Take breaks after significant losses
- Maintain consistent routine and process
- Keep detailed trading journal for analysis`,
        keyPoints: [
          'Never risk more than 1-2% per trade',
          'Always use stops and trail using structure',
          'Take partial profits at key levels',
          'Maximum 6% total portfolio risk',
          'Manage psychological and correlation risks'
        ],
        icon: Shield,
        difficulty: 'Advanced',
        duration: '15 min',
        completed: false
      }
    ]
  }
];

// Quiz interface
interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

const tradingVsInvestingQuiz: QuizQuestion[] = [
  {
    question: "What is the main focus of trading?",
    options: [
      "Fundamentals over decades",
      "Short‑term price movements",
      "Passive income with low activity"
    ],
    correctAnswer: 1
  },
  {
    question: "Which strategy usually involves fewer transactions?",
    options: [
      "Trading",
      "Investing",
      "Scalping"
    ],
    correctAnswer: 1
  },
  {
    question: "Which one is generally considered riskier?",
    options: [
      "Trading",
      "Investing",
      "Both are the same"
    ],
    correctAnswer: 0
  }
];

const whatIsTradingQuiz: QuizQuestion[] = [
  {
    question: "What is the goal of trading?",
    options: [
      "To profit from short‑term price changes",
      "To hold assets for decades",
      "To avoid market volatility"
    ],
    correctAnswer: 0
  },
  {
    question: "What kind of analysis is mostly used in trading?",
    options: [
      "Fundamental analysis",
      "Technical analysis",
      "Political sentiment"
    ],
    correctAnswer: 1
  },
  {
    question: "Which statement about trading is correct?",
    options: [
      "It requires active monitoring and frequent trades",
      "It is always risk‑free",
      "It guarantees profits over time"
    ],
    correctAnswer: 0
  }
];

const whatIsBitcoinQuiz: QuizQuestion[] = [
  {
    question: "What is Bitcoin?",
    options: [
      "A digital decentralized currency",
      "A company owned by banks",
      "Unlimited internet money"
    ],
    correctAnswer: 0
  },
  {
    question: "How many Bitcoins will ever exist?",
    options: [
      "100 million",
      "50 million", 
      "21 million"
    ],
    correctAnswer: 2
  },
  {
    question: "Where are all Bitcoin transactions recorded?",
    options: [
      "A bank's private database",
      "The blockchain",
      "A government server"
    ],
    correctAnswer: 1
  }
];

const whatIsBlockchainQuiz: QuizQuestion[] = [
  {
    question: "What type of ledger is a blockchain?",
    options: [
      "Controlled by one company",
      "Distributed and shared",
      "Hidden and private only"
    ],
    correctAnswer: 1
  },
  {
    question: "What makes a blockchain secure?",
    options: [
      "Centralized server",
      "Linked blocks with hashes",
      "Secret government control"
    ],
    correctAnswer: 1
  },
  {
    question: "What is one main feature of blockchain?",
    options: [
      "Transactions can't be verified",
      "It is transparent and tamper‑resistant",
      "It stores only gold and silver data"
    ],
    correctAnswer: 1
  }
];

const whatAreCryptocurrenciesQuiz: QuizQuestion[] = [
  {
    question: "What was the first cryptocurrency?",
    options: [
      "Ethereum",
      "Bitcoin",
      "Solana"
    ],
    correctAnswer: 1
  },
  {
    question: "What technology powers cryptocurrencies?",
    options: [
      "Blockchain",
      "Bank servers",
      "Government databases"
    ],
    correctAnswer: 0
  },
  {
    question: "What is a core feature of crypto?",
    options: [
      "Decentralization",
      "Unlimited supply",
      "Controlled by banks"
    ],
    correctAnswer: 0
  }
];

const altcoinsVsBitcoinQuiz: QuizQuestion[] = [
  {
    question: "How many Bitcoins will ever exist?",
    options: [
      "Unlimited",
      "21 million",
      "50 million"
    ],
    correctAnswer: 1
  },
  {
    question: "What are altcoins?",
    options: [
      "Only meme coins",
      "Every crypto except Bitcoin",
      "Bitcoin forks only"
    ],
    correctAnswer: 1
  },
  {
    question: "Which one is safer?",
    options: [
      "Bitcoin",
      "Altcoins",
      "Both same"
    ],
    correctAnswer: 0
  }
];

const whatIsEthereumQuiz: QuizQuestion[] = [
  {
    question: "What makes Ethereum special?",
    options: [
      "Smart contracts",
      "Unlimited supply",
      "No blockchain"
    ],
    correctAnswer: 0
  },
  {
    question: "ETH is mainly used for?",
    options: [
      "Paying gas/fees",
      "Buying pizzas",
      "Real estate"
    ],
    correctAnswer: 0
  },
  {
    question: "What can be built on Ethereum?",
    options: [
      "DeFi & NFTs",
      "Banks",
      "Gmail"
    ],
    correctAnswer: 0
  }
];

const cryptoWalletsQuiz: QuizQuestion[] = [
  {
    question: "Which wallet is offline?",
    options: [
      "Hot",
      "Cold",
      "Exchange"
    ],
    correctAnswer: 1
  },
  {
    question: "What protects wallet access?",
    options: [
      "Seed phrase",
      "Username",
      "Email"
    ],
    correctAnswer: 0
  },
  {
    question: "Best for large holdings?",
    options: [
      "Hot wallet",
      "Cold wallet",
      "Paper notes"
    ],
    correctAnswer: 1
  }
];

const exchangesCexVsDexQuiz: QuizQuestion[] = [
  {
    question: "Example of CEX?",
    options: [
      "Binance",
      "Uniswap",
      "MetaMask"
    ],
    correctAnswer: 0
  },
  {
    question: "Example of DEX?",
    options: [
      "Coinbase",
      "Uniswap",
      "Kraken"
    ],
    correctAnswer: 1
  },
  {
    question: "Who executes trades on a DEX?",
    options: [
      "Exchange company",
      "Wallet to wallet",
      "Government"
    ],
    correctAnswer: 1
  }
];

const stablecoinsQuiz: QuizQuestion[] = [
  {
    question: "Stablecoins are usually pegged to?",
    options: [
      "NFTs",
      "Fiat currencies (USD)",
      "Gold only"
    ],
    correctAnswer: 1
  },
  {
    question: "Which is a stablecoin?",
    options: [
      "ETH",
      "USDT",
      "BNB"
    ],
    correctAnswer: 1
  },
  {
    question: "Why use stablecoins?",
    options: [
      "For stability",
      "For gambling only",
      "For mining"
    ],
    correctAnswer: 0
  }
];

const tradingFeesQuiz: QuizQuestion[] = [
  {
    question: "Who pays lower fees?",
    options: [
      "Maker",
      "Taker",
      "Both equal"
    ],
    correctAnswer: 0
  },
  {
    question: "Who removes liquidity?",
    options: [
      "Maker",
      "Taker",
      "Miner"
    ],
    correctAnswer: 1
  },
  {
    question: "How are fees measured?",
    options: [
      "% of trade",
      "Fixed $500",
      "Random"
    ],
    correctAnswer: 0
  }
];

const riskBasicsQuiz: QuizQuestion[] = [
  {
    question: "What is the golden rule of crypto?",
    options: [
      "Always invest rent money",
      "Only invest what you can afford to lose",
      "Borrow leverage"
    ],
    correctAnswer: 1
  },
  {
    question: "How do you reduce risk?",
    options: [
      "Diversification",
      "Bet it all on one coin",
      "Ignore losses"
    ],
    correctAnswer: 0
  },
  {
    question: "Should you invest money for bills?",
    options: [
      "Yes",
      "No",
      "Sometimes"
    ],
    correctAnswer: 1
  }
];

export default function StudyPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(studyData[0]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [progress, setProgress] = useState(5); // Mock progress
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [selectedLevel, setSelectedLevel] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced' | 'Final'>('All');
  
  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [currentQuizType, setCurrentQuizType] = useState<'trading-vs-investing' | 'what-is-trading' | 'what-is-bitcoin' | 'what-is-blockchain' | 'what-are-cryptocurrencies' | 'altcoins-vs-bitcoin' | 'what-is-ethereum' | 'crypto-wallets' | 'exchanges-cex-vs-dex' | 'stablecoins-explained' | 'trading-fees' | 'risk-basics'>('trading-vs-investing');

  // Filter lessons based on search and level across all categories
  const getFilteredResults = () => {
    let filteredCategories = studyData;
    
    // Filter by level
    if (selectedLevel !== 'All') {
      filteredCategories = studyData.filter(category => category.level === selectedLevel);
    }
    
    // Filter by search term
    if (searchTerm) {
      filteredCategories = filteredCategories.map(category => ({
        ...category,
        lessons: category.lessons.filter(lesson =>
          lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lesson.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(category => category.lessons.length > 0);
    }
    
    const totalLessons = searchTerm 
      ? filteredCategories.reduce((sum, cat) => sum + cat.lessons.length, 0)
      : selectedCategory.lessons.length;
    
    return { categories: filteredCategories, totalLessons };
  };

  const { categories: displayCategories, totalLessons } = getFilteredResults();
  const filteredLessons = searchTerm ? [] : selectedCategory.lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartLearning = () => {
    setSelectedLesson(studyData[0].lessons[0]);
  };

  const handleTryDemo = () => {
    navigate('/dashboard');
  };

  const handleTakeQuiz = (quizType: 'trading-vs-investing' | 'what-is-trading' | 'what-is-bitcoin' | 'what-is-blockchain' | 'what-are-cryptocurrencies' | 'altcoins-vs-bitcoin' | 'what-is-ethereum' | 'crypto-wallets' | 'exchanges-cex-vs-dex' | 'stablecoins-explained' | 'trading-fees' | 'risk-basics' = 'trading-vs-investing') => {
    setCurrentQuizType(quizType);
    setShowQuiz(true);
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
  };

  const handleQuizAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const getCurrentQuiz = () => {
    switch (currentQuizType) {
      case 'trading-vs-investing': return tradingVsInvestingQuiz;
      case 'what-is-trading': return whatIsTradingQuiz;
      case 'what-is-bitcoin': return whatIsBitcoinQuiz;
      case 'what-is-blockchain': return whatIsBlockchainQuiz;
      case 'what-are-cryptocurrencies': return whatAreCryptocurrenciesQuiz;
      case 'altcoins-vs-bitcoin': return altcoinsVsBitcoinQuiz;
      case 'what-is-ethereum': return whatIsEthereumQuiz;
      case 'crypto-wallets': return cryptoWalletsQuiz;
      case 'exchanges-cex-vs-dex': return exchangesCexVsDexQuiz;
      case 'stablecoins-explained': return stablecoinsQuiz;
      case 'trading-fees': return tradingFeesQuiz;
      case 'risk-basics': return riskBasicsQuiz;
      default: return tradingVsInvestingQuiz;
    }
  };

  const handleNextQuestion = () => {
    const currentQuiz = getCurrentQuiz();
    if (currentQuestion < currentQuiz.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleQuizRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
  };

  const handleQuizClose = () => {
    setShowQuiz(false);
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
  };

  const getQuizScore = () => {
    const currentQuiz = getCurrentQuiz();
    return selectedAnswers.reduce((score, answer, index) => {
      return score + (answer === currentQuiz[index].correctAnswer ? 1 : 0);
    }, 0);
  };

  const getNextLesson = (currentLesson: Lesson) => {
    for (const category of studyData) {
      const currentIndex = category.lessons.findIndex(lesson => lesson.id === currentLesson.id);
      if (currentIndex !== -1) {
        // Try next lesson in same category
        if (currentIndex + 1 < category.lessons.length) {
          return category.lessons[currentIndex + 1];
        }
        // Try first lesson of next category
        const categoryIndex = studyData.findIndex(cat => cat.id === category.id);
        if (categoryIndex + 1 < studyData.length) {
          return studyData[categoryIndex + 1].lessons[0];
        }
      }
    }
    return null;
  };

  const toggleChapterExpansion = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <AnimatePresence mode="wait">
          {!selectedLesson ? (
            // Main Study Page
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {/* Hero Section */}
              <div className="mb-8">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-[#AAB0C0]">Learning Progress</span>
                    <span className="text-sm font-bold text-[#6A3DF4]">{progress}%</span>
                  </div>
                  <div className="w-full bg-[#2A2F42] rounded-full h-2">
                    <motion.div 
                      className="bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <div className="text-center mb-12">
                  <motion.h1 
                    className="text-4xl md:text-6xl font-bold text-white mb-4"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Learn Crypto & Trading
                  </motion.h1>
                  <motion.p 
                    className="text-xl text-[#AAB0C0] mb-8"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    From basics to professional strategies
                  </motion.p>
                  <motion.button
                    onClick={handleStartLearning}
                    className="bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-center space-x-2">
                      <Play className="w-5 h-5" />
                      <span>Start Learning</span>
                    </div>
                  </motion.button>
                </div>

                {/* Level Filter */}
                <motion.div 
                  className="flex flex-wrap justify-center gap-2 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {['All', 'Beginner', 'Intermediate', 'Advanced', 'Final'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level as any)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        selectedLevel === level
                          ? 'bg-[#6A3DF4] text-white'
                          : 'bg-[#1E2232] text-[#AAB0C0] hover:bg-[#2A2F42] hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </motion.div>

                {/* Search */}
                <motion.div 
                  className="max-w-2xl mx-auto mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#AAB0C0] w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search Topics"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[#1E2232] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-[#AAB0C0] focus:outline-none focus:border-[#6A3DF4] focus:ring-2 focus:ring-[#6A3DF4]/20 transition-all"
                    />
                  </div>
                </motion.div>
              </div>

              <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <motion.div 
                  className="lg:w-80 space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  {(selectedLevel === 'All' ? studyData : studyData.filter(cat => cat.level === selectedLevel)).map((category) => {
                    const completedLessons = category.lessons.filter(lesson => lesson.completed).length;
                    const totalLessons = category.lessons.length;
                    const categoryProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
                    const isExpanded = expandedChapters.has(category.id);
                    
                    return (
                      <div key={category.id}>
                        {/* Main Category */}
                        <motion.div
                          className={`w-full flex items-center space-x-4 p-4 rounded-xl text-left transition-all duration-200 group cursor-pointer ${
                            selectedCategory.id === category.id && !searchTerm
                              ? 'bg-[#6A3DF4] text-white shadow-lg'
                              : 'bg-[#1E2232] text-[#AAB0C0] hover:bg-[#2A2F42] hover:text-white border border-white/5 hover:border-white/10'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (!searchTerm) {
                              setSelectedCategory(category);
                              setSearchTerm('');
                            }
                            toggleChapterExpansion(category.id);
                          }}
                        >
                          <div className={`p-3 rounded-xl flex-shrink-0 ${
                            selectedCategory.id === category.id && !searchTerm
                              ? 'bg-white/20'
                              : 'bg-[#2A2F42] group-hover:bg-[#6A3DF4]/20'
                          }`}>
                            <category.icon className={`w-6 h-6 ${
                              selectedCategory.id === category.id && !searchTerm
                                ? 'text-white' 
                                : 'text-[#BDC3C7] group-hover:text-[#6A3DF4]'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base mb-1 flex items-center flex-wrap gap-2">
                              {category.chapterNumber && (
                                <span className="text-sm bg-white/10 px-2 py-0.5 rounded-md flex-shrink-0">
                                  {category.chapterNumber}
                                </span>
                              )}
                              <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-white/10 text-white/80 flex-shrink-0">
                                {category.level}
                              </span>
                              <span className="truncate">{category.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-sm opacity-80">
                                {completedLessons}/{totalLessons} completed
                              </div>
                              {categoryProgress > 0 && (
                                <div className="flex-1 bg-black/20 rounded-full h-1 max-w-20">
                                  <div 
                                    className="bg-white/60 h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${categoryProgress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          {category.lessons.length > 1 && (
                            <div className="transition-transform">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </div>
                          )}
                        </motion.div>

                        {/* Sub-lessons */}
                        <AnimatePresence>
                          {isExpanded && category.lessons.length > 1 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="pl-8 space-y-1 mt-2">
                                {category.lessons.map((lesson) => (
                                  <button
                                    key={lesson.id}
                                    onClick={() => setSelectedLesson(lesson)}
                                    className="w-full flex items-center space-x-3 p-3 rounded-lg text-left text-sm hover:bg-[#2A2F42] hover:text-white transition-all group"
                                  >
                                    <div className="bg-[#6A3DF4]/20 p-2 rounded-lg group-hover:bg-[#6A3DF4]/30 transition-colors">
                                      <lesson.icon className="w-4 h-4 text-[#6A3DF4]" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium">{lesson.title}</div>
                                      <div className="text-xs text-[#AAB0C0] opacity-80">{lesson.duration}</div>
                                    </div>
                                    {lesson.completed && (
                                      <CheckCircle className="w-4 h-4 text-[#10B981]" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>

                {/* Main Content Area */}
                <motion.div 
                  className="flex-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="mb-6">
                    {searchTerm ? (
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center space-x-3">
                          <Search className="w-8 h-8 text-[#6A3DF4]" />
                          <span>Search Results</span>
                        </h2>
                        <p className="text-[#AAB0C0]">
                          {totalLessons} lesson{totalLessons !== 1 ? 's' : ''} found for "{searchTerm}"
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center flex-wrap gap-3">
                          <selectedCategory.icon className="w-8 h-8 text-[#6A3DF4] flex-shrink-0" />
                          {selectedCategory.chapterNumber && (
                            <span className="text-xl bg-[#6A3DF4]/20 text-[#6A3DF4] px-3 py-1 rounded-lg font-bold flex-shrink-0">
                              {selectedCategory.chapterNumber}
                            </span>
                          )}
                          <span className="text-sm px-3 py-1 rounded-lg font-medium bg-white/10 text-white/80 flex-shrink-0">
                            {selectedCategory.level}
                          </span>
                          <span className="break-words">{selectedCategory.name}</span>
                        </h2>
                        <p className="text-[#AAB0C0]">
                          {filteredLessons.length} lesson{filteredLessons.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Lesson Cards */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {searchTerm ? (
                      // Search Results
                      displayCategories.map(category =>
                        category.lessons.map((lesson, index) => (
                          <motion.button
                            key={lesson.id}
                            onClick={() => setSelectedLesson(lesson)}
                            className="bg-[#1E2232] border border-white/5 rounded-xl p-6 text-left hover:border-white/10 hover:bg-[#252A3D] transition-all duration-200 group relative overflow-hidden"
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            {lesson.completed && (
                              <div className="absolute top-3 right-3">
                                <CheckCircle className="w-5 h-5 text-[#10B981]" />
                              </div>
                            )}
                            
                            <div className="flex items-start space-x-4">
                              <div className="bg-[#6A3DF4]/20 p-3 rounded-xl group-hover:bg-[#6A3DF4]/30 transition-colors">
                                <lesson.icon className="w-6 h-6 text-[#6A3DF4]" />
                              </div>
                              <div className="flex-1">
                                <div className="text-xs mb-1 font-medium flex items-center space-x-2">
                                  <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-white/10 text-white/80">
                                    {category.level}
                                  </span>
                                  <span className="text-[#6A3DF4]">
                                    {category.chapterNumber && `${category.chapterNumber}. `}{category.name}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-white text-lg mb-2 group-hover:text-[#6A3DF4] transition-colors">
                                  {lesson.title}
                                </h3>
                                <p className="text-[#AAB0C0] text-sm mb-4 leading-relaxed">
                                  {lesson.description}
                                </p>
                                <div className="flex items-center space-x-4 text-xs">
                                  <span className="px-2 py-1 rounded-lg font-medium bg-white/10 text-white/80">
                                    {lesson.difficulty}
                                  </span>
                                  <span className="text-[#AAB0C0] flex items-center space-x-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{lesson.duration}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        ))
                      )
                    ) : (
                      // Category Lessons
                      filteredLessons.map((lesson, index) => (
                        <motion.button
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className="bg-[#1E2232] border border-white/5 rounded-xl p-6 text-left hover:border-white/10 hover:bg-[#252A3D] transition-all duration-200 group relative overflow-hidden"
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          {lesson.completed && (
                            <div className="absolute top-3 right-3">
                              <CheckCircle className="w-5 h-5 text-[#10B981]" />
                            </div>
                          )}
                          
                          <div className="flex items-start space-x-4">
                            <div className="bg-[#6A3DF4]/20 p-3 rounded-xl group-hover:bg-[#6A3DF4]/30 transition-colors">
                              <lesson.icon className="w-6 h-6 text-[#6A3DF4]" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white text-lg mb-2 group-hover:text-[#6A3DF4] transition-colors">
                                {lesson.title}
                              </h3>
                              <p className="text-[#AAB0C0] text-sm mb-4 leading-relaxed">
                                {lesson.description}
                              </p>
                              <div className="flex items-center space-x-4 text-xs">
                                <span className="px-2 py-1 rounded-lg font-medium bg-white/10 text-white/80">
                                  {lesson.difficulty}
                                </span>
                                <span className="text-[#AAB0C0] flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{lesson.duration}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))
                    )}
                  </div>

                  {(searchTerm ? totalLessons === 0 : filteredLessons.length === 0) && (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 text-[#AAB0C0] mx-auto mb-4" />
                      <p className="text-[#AAB0C0]">No lessons found for "{searchTerm}"</p>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          ) : (
            // Lesson Detail View
            <motion.div
              key="lesson"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl"
            >
              {/* Back Button */}
              <motion.button
                onClick={() => setSelectedLesson(null)}
                className="flex items-center space-x-2 text-[#AAB0C0] hover:text-white mb-8 group transition-colors"
                whileHover={{ x: -5 }}
              >
                <ChevronLeft className="w-5 h-5 group-hover:text-[#6A3DF4] transition-colors" />
                <span>Back to Lessons</span>
              </motion.button>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Lesson Content */}
                <div className="lg:col-span-2">
                  <motion.div 
                    className="bg-[#1E2232] border border-white/5 rounded-xl p-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="bg-[#6A3DF4]/20 p-3 rounded-xl">
                        <selectedLesson.icon className="w-8 h-8 text-[#6A3DF4]" />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{selectedLesson.title}</h1>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="px-3 py-1 rounded-lg font-medium bg-white/10 text-white/80">
                            {selectedLesson.difficulty}
                          </span>
                          <span className="text-[#AAB0C0] flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{selectedLesson.duration}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="prose prose-invert max-w-none mb-8">
                      <div className="text-[#AAB0C0] leading-relaxed whitespace-pre-line">
                        {selectedLesson.content}
                      </div>
                    </div>

                    {/* Key Points or Video */}
                    {selectedLesson.id === 'trading-vs-investing' ? (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Watch: Trading vs Investing Explained</span>
                        </h3>
                        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/xVvazoMc3dI"
                            title="Trading vs Investing Explained"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : selectedLesson.id === 'what-is-trading' ? (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Video Lesson</span>
                        </h3>
                        <div className="relative w-full h-64">
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/PFyZv4OFfvs?start=34"
                            title="What is Trading?"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : selectedLesson.id === 'what-is-bitcoin' ? (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Video Lesson</span>
                        </h3>
                        <div className="relative w-full" style={{ height: '280px' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/Gc2en3nHxA4"
                            title="What is Bitcoin?"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : selectedLesson.id === 'what-is-blockchain' ? (
                      <div className="bg-[#1E2232] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Video Lesson</span>
                        </h3>
                        <div className="relative w-full" style={{ height: '275px' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/yubzJw0uiE4"
                            title="What is Blockchain?"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : selectedLesson.id === 'what-are-cryptocurrencies' ? (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Video Lesson</span>
                        </h3>
                        <div className="relative w-full" style={{ height: '275px' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/8RjHAcSMbhQ"
                            title="What are Cryptocurrencies?"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : selectedLesson.id === 'altcoins-vs-bitcoin' ? (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Video Lesson</span>
                        </h3>
                        <div className="relative w-full" style={{ height: '275px' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/owFY_z5fF-Y"
                            title="Altcoins vs Bitcoin"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : selectedLesson.id === 'what-is-ethereum' ? (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Video Lesson</span>
                        </h3>
                        <div className="relative w-full" style={{ height: '275px' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/1Hu8lzoi0Tw"
                            title="What is Ethereum?"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : selectedLesson.id === 'crypto-wallets' ? (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Video Lesson</span>
                        </h3>
                        <div className="relative w-full" style={{ height: '275px' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/kf28zqP_F2s"
                            title="Crypto Wallets"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : selectedLesson.id === 'exchanges-cex-vs-dex' ? (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Video Lesson</span>
                        </h3>
                        <div className="relative w-full" style={{ height: '275px' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/OVyn07EmEAw"
                            title="CEX vs DEX"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : selectedLesson.id === 'stablecoins-explained' ? (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Video Lesson</span>
                        </h3>
                        <div className="relative w-full" style={{ height: '275px' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/8XX421H5NtU"
                            title="Stablecoins Explained"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : selectedLesson.id === 'trading-fees' ? (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Video Lesson</span>
                        </h3>
                        <div className="relative w-full" style={{ height: '275px' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/8T4JFaXMqo4"
                            title="Trading Fees"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : selectedLesson.id === 'risk-basics' ? (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Play className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Video Lesson</span>
                        </h3>
                        <div className="relative w-full" style={{ height: '275px' }}>
                          <iframe
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                            src="https://www.youtube.com/embed/BLAEuVSAlVM"
                            title="Risk Management"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#0D0F18] border border-white/5 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                          <Target className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Key Points</span>
                        </h3>
                        <ul className="space-y-3">
                          {selectedLesson.keyPoints.map((point, index) => (
                            <motion.li 
                              key={index}
                              className="flex items-start space-x-3"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 + index * 0.1 }}
                            >
                              <div className="bg-[#6A3DF4]/20 rounded-full p-1 mt-0.5">
                                <CheckCircle className="w-3 h-3 text-[#6A3DF4]" />
                              </div>
                              <span className="text-[#AAB0C0] leading-relaxed">{point}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 mt-8">
                      <motion.button
                        onClick={selectedLesson.id === 'trading-vs-investing' ? () => handleTakeQuiz('trading-vs-investing') : 
                                 selectedLesson.id === 'what-is-trading' ? () => handleTakeQuiz('what-is-trading') :
                                 selectedLesson.id === 'what-is-bitcoin' ? () => handleTakeQuiz('what-is-bitcoin') :
                                 selectedLesson.id === 'what-is-blockchain' ? () => handleTakeQuiz('what-is-blockchain') :
                                 selectedLesson.id === 'what-are-cryptocurrencies' ? () => handleTakeQuiz('what-are-cryptocurrencies') :
                                 selectedLesson.id === 'altcoins-vs-bitcoin' ? () => handleTakeQuiz('altcoins-vs-bitcoin') :
                                 selectedLesson.id === 'what-is-ethereum' ? () => handleTakeQuiz('what-is-ethereum') :
                                 selectedLesson.id === 'crypto-wallets' ? () => handleTakeQuiz('crypto-wallets') :
                                 selectedLesson.id === 'exchanges-cex-vs-dex' ? () => handleTakeQuiz('exchanges-cex-vs-dex') :
                                 selectedLesson.id === 'stablecoins-explained' ? () => handleTakeQuiz('stablecoins-explained') :
                                 selectedLesson.id === 'trading-fees' ? () => handleTakeQuiz('trading-fees') :
                                 selectedLesson.id === 'risk-basics' ? () => handleTakeQuiz('risk-basics') :
                                 handleTryDemo}
                        className="flex-1 bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] hover:from-[#8A5CFF] hover:to-[#6A3DF4] text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          {['trading-vs-investing', 'what-is-trading', 'what-is-bitcoin', 'what-is-blockchain', 'what-are-cryptocurrencies', 'altcoins-vs-bitcoin', 'what-is-ethereum', 'crypto-wallets', 'exchanges-cex-vs-dex', 'stablecoins-explained', 'trading-fees', 'risk-basics'].includes(selectedLesson.id) ? (
                            <>
                              <HelpCircle className="w-5 h-5" />
                              <span>Take Quiz</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5" />
                              <span>Try it out</span>
                            </>
                          )}
                        </div>
                      </motion.button>
                      
                      {!selectedLesson.completed && (
                        <motion.button
                          onClick={() => {
                            // Mark as completed (in real app, save to backend)
                            selectedLesson.completed = true;
                            setProgress(prev => Math.min(prev + 2, 100));
                          }}
                          className="flex-1 bg-[#2ECC71] hover:bg-[#27AE60] text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <CheckCircle className="w-5 h-5" />
                            <span>Mark Complete</span>
                          </div>
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Sidebar */}
                <motion.div 
                  className="space-y-6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {/* Next Lesson */}
                  {(() => {
                    const nextLesson = getNextLesson(selectedLesson);
                    return nextLesson && (
                      <div className="bg-[#1E2232] border border-white/5 rounded-xl p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center space-x-2">
                          <ArrowRight className="w-5 h-5 text-[#6A3DF4]" />
                          <span>Next Lesson</span>
                        </h3>
                        <button
                          onClick={() => setSelectedLesson(nextLesson)}
                          className="w-full text-left p-4 bg-[#0D0F18] hover:bg-[#6A3DF4]/10 border border-white/5 hover:border-[#6A3DF4]/30 rounded-xl transition-all group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="bg-[#6A3DF4]/20 p-2 rounded-lg group-hover:bg-[#6A3DF4]/30 transition-colors">
                              <nextLesson.icon className="w-4 h-4 text-[#6A3DF4]" />
                            </div>
                            <div>
                              <div className="font-medium text-white text-sm mb-1">{nextLesson.title}</div>
                              <div className="text-xs text-[#AAB0C0]">{nextLesson.duration}</div>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Progress in Category */}
                  <div className="bg-[#1E2232] border border-white/5 rounded-xl p-6">
                    <h3 className="font-semibold text-white mb-4">Chapter Progress</h3>
                    {(() => {
                      const category = studyData.find(cat => 
                        cat.lessons.some(lesson => lesson.id === selectedLesson.id)
                      );
                      if (!category) return null;
                      
                      const completedLessons = category.lessons.filter(lesson => lesson.completed).length;
                      const totalLessons = category.lessons.length;
                      const categoryProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
                      
                      return (
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-[#AAB0C0]">
                              {category.chapterNumber && `${category.chapterNumber}. `}{category.name}
                            </span>
                            <span className="text-[#6A3DF4] font-medium">{completedLessons}/{totalLessons}</span>
                          </div>
                          <div className="w-full bg-[#2A2F42] rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${categoryProgress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Study Tips */}
                  <div className="bg-[#1E2232] border border-white/5 rounded-xl p-6">
                    <h3 className="font-semibold text-white mb-4 flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-[#6A3DF4]" />
                      <span>Study Tip</span>
                    </h3>
                    <div className="bg-[#6A3DF4]/10 border border-[#6A3DF4]/20 rounded-xl p-4">
                      <p className="text-sm text-[#AAB0C0]">
                        Practice what you learn! Try implementing these concepts on the demo trading platform before risking real money.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Quiz Modal */}
              <AnimatePresence>
                {showQuiz && ['trading-vs-investing', 'what-is-trading', 'what-is-bitcoin', 'what-is-blockchain', 'what-are-cryptocurrencies', 'altcoins-vs-bitcoin', 'what-is-ethereum', 'crypto-wallets', 'exchanges-cex-vs-dex', 'stablecoins-explained', 'trading-fees', 'risk-basics'].includes(selectedLesson?.id || '') && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={handleQuizClose}
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-[#1E2232] border border-white/10 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!showResults ? (
                        <div>
                          <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">
                              Quiz: {currentQuizType === 'trading-vs-investing' ? 'Trading vs. Investing' : 
                                     currentQuizType === 'what-is-trading' ? 'What is Trading?' : 
                                     currentQuizType === 'what-is-bitcoin' ? 'What is Bitcoin?' : 
                                     currentQuizType === 'what-is-blockchain' ? 'What is Blockchain?' :
                                     currentQuizType === 'what-are-cryptocurrencies' ? 'What are Cryptocurrencies?' :
                                     currentQuizType === 'altcoins-vs-bitcoin' ? 'Altcoins vs. Bitcoin' :
                                     currentQuizType === 'what-is-ethereum' ? 'What is Ethereum?' :
                                     currentQuizType === 'crypto-wallets' ? 'Crypto Wallets' :
                                     currentQuizType === 'exchanges-cex-vs-dex' ? 'CEX vs DEX' :
                                     currentQuizType === 'stablecoins-explained' ? 'Stablecoins' :
                                     currentQuizType === 'trading-fees' ? 'Trading Fees' : 'Risk Management'}
                            </h2>
                            <button
                              onClick={handleQuizClose}
                              className="text-[#AAB0C0] hover:text-white transition-colors"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="mb-6">
                            <div className="flex justify-between text-sm text-[#AAB0C0] mb-2">
                              <span>Question {currentQuestion + 1} of {getCurrentQuiz().length}</span>
                              <span>{Math.round(((currentQuestion + 1) / getCurrentQuiz().length) * 100)}%</span>
                            </div>
                            <div className="w-full bg-[#2A2F42] rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((currentQuestion + 1) / getCurrentQuiz().length) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div className="mb-8">
                            <h3 className="text-xl font-semibold text-white mb-6">
                              {getCurrentQuiz()[currentQuestion].question}
                            </h3>
                            <div className="space-y-3">
                              {getCurrentQuiz()[currentQuestion].options.map((option, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleQuizAnswer(index)}
                                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                                    selectedAnswers[currentQuestion] === index
                                      ? 'bg-[#6A3DF4]/20 border-[#6A3DF4] text-white'
                                      : 'bg-[#6A3DF4]/10 border-[#6A3DF4]/30 text-[#AAB0C0] hover:border-[#6A3DF4]/50 hover:bg-[#6A3DF4]/20'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                      selectedAnswers[currentQuestion] === index
                                        ? 'border-[#6A3DF4] bg-[#6A3DF4]'
                                        : 'border-[#AAB0C0]'
                                    }`}>
                                      {selectedAnswers[currentQuestion] === index && (
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                      )}
                                    </div>
                                    <span className="text-base font-medium">
                                      {String.fromCharCode(65 + index)}) {option}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              onClick={handleNextQuestion}
                              disabled={selectedAnswers[currentQuestion] === undefined}
                              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                                selectedAnswers[currentQuestion] !== undefined
                                  ? 'bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] text-white hover:from-[#8A5CFF] hover:to-[#6A3DF4]'
                                  : 'bg-[#2A2F42] text-[#AAB0C0] cursor-not-allowed'
                              }`}
                            >
                              {currentQuestion === getCurrentQuiz().length - 1 ? 'Finish Quiz' : 'Next Question'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Quiz Results</h2>
                            <button
                              onClick={handleQuizClose}
                              className="text-[#AAB0C0] hover:text-white transition-colors"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="mb-8">
                            <div className="text-6xl font-bold text-[#6A3DF4] mb-4">
                              {getQuizScore()}/{getCurrentQuiz().length}
                            </div>
                            <div className="text-xl text-white mb-2">
                              {getQuizScore() === getCurrentQuiz().length ? 'Perfect Score!' :
                               getQuizScore() >= 2 ? 'Great Job!' : 'Keep Learning!'}
                            </div>
                            <div className="text-[#AAB0C0]">
                              You got {Math.round((getQuizScore() / getCurrentQuiz().length) * 100)}% correct
                            </div>
                          </div>

                          <div className="space-y-4 mb-8">
                            {getCurrentQuiz().map((question, qIndex) => (
                              <div key={qIndex} className="bg-[#0D0F18] border border-white/5 rounded-xl p-4 text-left">
                                <div className="font-medium text-white mb-2">
                                  Q{qIndex + 1}: {question.question}
                                </div>
                                <div className="space-y-2">
                                  {question.options.map((option, oIndex) => (
                                    <div key={oIndex} className={`text-sm p-2 rounded ${
                                      oIndex === question.correctAnswer
                                        ? 'bg-[#2ECC71]/20 text-[#2ECC71] border border-[#2ECC71]/30'
                                        : selectedAnswers[qIndex] === oIndex && oIndex !== question.correctAnswer
                                        ? 'bg-[#E74C3C]/20 text-[#E74C3C] border border-[#E74C3C]/30'
                                        : 'text-[#AAB0C0]'
                                    }`}>
                                      {String.fromCharCode(65 + oIndex)}) {option}
                                      {oIndex === question.correctAnswer && ' ✅'}
                                      {selectedAnswers[qIndex] === oIndex && oIndex !== question.correctAnswer && ' ❌'}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-4 justify-center">
                            <button
                              onClick={handleQuizRestart}
                              className="px-6 py-3 bg-[#2A2F42] hover:bg-[#6A3DF4]/20 text-white rounded-xl font-semibold transition-all"
                            >
                              Retake Quiz
                            </button>
                            <button
                              onClick={handleQuizClose}
                              className="px-6 py-3 bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] text-white rounded-xl font-semibold transition-all"
                            >
                              Continue Learning
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
