// Utility for fetching cryptocurrency logos with multiple fallback sources

// Comprehensive CoinGecko ID mapping for common coins (fallback)
const coinGeckoIdMap: Record<string, string> = {
  'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin', 'SOL': 'solana', 'XRP': 'ripple',
  'DOGE': 'dogecoin', 'ADA': 'cardano', 'TRX': 'tron', 'AVAX': 'avalanche-2', 'TON': 'the-open-network',
  'SHIB': 'shiba-inu', 'DOT': 'polkadot', 'BCH': 'bitcoin-cash', 'LINK': 'chainlink', 'NEAR': 'near',
  'MATIC': 'matic-network', 'UNI': 'uniswap', 'LTC': 'litecoin', 'PEPE': 'pepe', 'ICP': 'internet-computer',
  'ETC': 'ethereum-classic', 'APT': 'aptos', 'SUI': 'sui', 'CRO': 'crypto-com-chain', 'ATOM': 'cosmos',
  'FIL': 'filecoin', 'OP': 'optimism', 'ARB': 'arbitrum', 'INJ': 'injective-protocol', 'STX': 'blockstack',
  'IMX': 'immutable-x', 'TAO': 'bittensor', 'RENDER': 'render-token', 'LUNA': 'terra-luna',
  'VTHO': 'vethor-token', 'ASR': 'as-roma-fan-token', 'BANK': 'bankless-dao', 'AT': 'artemis-token',
  'ASTER': 'aster', 'VIRTUAL': 'virtual-protocol', 'USDT': 'tether', 'USDC': 'usd-coin', 'DAI': 'dai',
  'TUSD': 'true-usd', 'BUSD': 'binance-usd', 'FDUSD': 'first-digital-usd', 'PAX': 'paxos-standard',
  'USDP': 'paxos-standard', 'WBTC': 'wrapped-bitcoin', 'WETH': 'weth',
  'AAVE': 'aave', 'ALGO': 'algorand', 'AXS': 'axie-infinity', 'BAT': 'basic-attention-token',
  'COMP': 'compound-governance-token', 'CRV': 'curve-dao-token', 'ENJ': 'enjincoin', 'GRT': 'the-graph',
  'MANA': 'decentraland', 'MKR': 'maker', 'SAND': 'the-sandbox', 'SNX': 'havven', 'YFI': 'yearn-finance',
  'ZEC': 'zcash', 'ZIL': 'zilliqa', '1INCH': '1inch', 'ALPHA': 'alpha-finance',
  'ANKR': 'ankr', 'AUDIO': 'audius', 'AUTO': 'auto', 'BAND': 'band-protocol', 'BETA': 'beta-finance',
  'CAKE': 'pancakeswap-token', 'CHR': 'chromia', 'CHZ': 'chiliz', 'COTI': 'coti', 'CTK': 'certik',
  'CTSI': 'cartesi', 'DEGO': 'dego-finance', 'DENT': 'dent', 'DODO': 'dodo', 'DUSK': 'dusk-network',
  'EGLD': 'elrond-erd-2', 'FLM': 'flamingo-finance-token', 'FOR': 'the-force-protocol', 'FRONT': 'frontier-token',
  'FUN': 'funfair', 'GALA': 'gala', 'GTC': 'gitcoin', 'HARD': 'hard-protocol', 'HOT': 'holo',
  'ILV': 'illuvium', 'KLAY': 'klay-token', 'KMD': 'komodo', 'KNC': 'kyber-network-crystal',
  'LINA': 'linear', 'LIT': 'litentry', 'LRC': 'loopring', 'LUNC': 'terra-luna', 'MASK': 'mask-network',
  'MIR': 'mirror-protocol', 'MTL': 'metal', 'OGN': 'origin-protocol', 'OMG': 'omisego', 'ONT': 'ontology',
  'PERP': 'perpetual-protocol', 'POLS': 'polkastarter', 'POND': 'marinade-staked-sol', 'POWR': 'power-ledger',
  'QTUM': 'qtum', 'REEF': 'reef-finance', 'REN': 'republic-protocol', 'ROSE': 'oasis-network',
  'RUNE': 'thorchain', 'SFP': 'safepal', 'SKL': 'skale', 'SLP': 'smooth-love-potion',
  'SUSHI': 'sushi', 'SXP': 'swipe', 'THETA': 'theta-token', 'TLM': 'alien-worlds', 'TRU': 'truefi',
  'TWT': 'trust-wallet-token', 'UFT': 'unlend-finance', 'UNFI': 'unifi-protocol', 'VET': 'vechain',
  'VIDT': 'vidt-dao', 'WAVES': 'waves', 'WING': 'wing-finance', 'XEM': 'nem', 'XVS': 'venus',
  'YFII': 'yfii-finance', 'ZEN': 'zencash'
};

// Get logo URL with CoinGecko as primary source
export function getLogoUrl(baseAsset: string): string {
  // Priority 1: GitHub CDN (most reliable, direct image URLs)
  // CoinGecko's /image endpoint returns JSON/redirects which causes issues
  // Using GitHub CDN as primary for reliability, CoinGecko as fallback
  const baseAssetLower = baseAsset.toLowerCase();
  return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${baseAssetLower}.png`;
}

// Get all possible logo URLs for a coin (for fallback chain) - synchronous version
export function getLogoUrls(baseAsset: string): string[] {
  const baseAssetLower = baseAsset.toLowerCase();
  const urls: string[] = [];
  
  // 1. GitHub CDN - spothq (128px) - PRIMARY (most reliable, direct image URLs)
  // CoinGecko's /image endpoint returns JSON/redirects which causes issues with <img> tags
  urls.push(`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${baseAssetLower}.png`);
  
  // 2. GitHub CDN - spothq (32px) - reliable fallback
  urls.push(`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${baseAssetLower}.png`);
  
  // 3. CoinGecko API endpoint (fallback - may redirect or return JSON on error)
  // Note: This endpoint redirects to the actual image, but may return JSON on error
  // Using as fallback since user wants CoinGecko support
  const coinGeckoId = coinGeckoIdMap[baseAsset] || baseAssetLower;
  urls.push(`https://api.coingecko.com/api/v3/coins/${coinGeckoId}/image`);
  
  // 4. Binance CDN (as fallback)
  urls.push(`https://bin.bnbstatic.com/image/cms/crypto/${baseAssetLower}.png`);
  
  // 5. GitHub CDN - alternative repository
  urls.push(`https://raw.githubusercontent.com/cjdowner/cryptocurrency-icons/master/32/color/${baseAssetLower}.png`);
  
  // 6. Logo.dev API (free tier)
  urls.push(`https://logo.dev/${baseAssetLower}?fallback=false`);
  
  return urls;
}

