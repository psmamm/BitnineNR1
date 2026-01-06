// Utility for fetching cryptocurrency logos with multiple fallback sources

// Comprehensive CoinGecko ID mapping for common coins
const coinGeckoIdMap: Record<string, string> = {
  'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin', 'SOL': 'solana', 'XRP': 'ripple',
  'DOGE': 'dogecoin', 'ADA': 'cardano', 'TRX': 'tron', 'AVAX': 'avalanche-2', 'TON': 'the-open-network',
  'SHIB': 'shiba-inu', 'DOT': 'polkadot', 'BCH': 'bitcoin-cash', 'LINK': 'chainlink', 'NEAR': 'near',
  'MATIC': 'matic-network', 'POL': 'matic-network', 'UNI': 'uniswap', 'LTC': 'litecoin', 'PEPE': 'pepe', 
  'ICP': 'internet-computer', 'ETC': 'ethereum-classic', 'APT': 'aptos', 'SUI': 'sui', 
  'CRO': 'crypto-com-chain', 'ATOM': 'cosmos', 'FIL': 'filecoin', 'OP': 'optimism', 'ARB': 'arbitrum', 
  'INJ': 'injective-protocol', 'STX': 'blockstack', 'IMX': 'immutable-x', 'TAO': 'bittensor', 
  'RENDER': 'render-token', 'RNDR': 'render-token', 'LUNA': 'terra-luna-2', 'LUNC': 'terra-luna',
  'VTHO': 'vethor-token', 'VET': 'vechain', 'USDT': 'tether', 'USDC': 'usd-coin', 'DAI': 'dai',
  'TUSD': 'true-usd', 'BUSD': 'binance-usd', 'FDUSD': 'first-digital-usd', 'PAX': 'paxos-standard',
  'USDP': 'paxos-standard', 'WBTC': 'wrapped-bitcoin', 'WETH': 'weth', 'HBAR': 'hedera-hashgraph',
  'AAVE': 'aave', 'ALGO': 'algorand', 'AXS': 'axie-infinity', 'BAT': 'basic-attention-token',
  'COMP': 'compound-governance-token', 'CRV': 'curve-dao-token', 'ENJ': 'enjincoin', 'GRT': 'the-graph',
  'MANA': 'decentraland', 'MKR': 'maker', 'SAND': 'the-sandbox', 'SNX': 'havven', 'YFI': 'yearn-finance',
  'ZEC': 'zcash', 'ZIL': 'zilliqa', '1INCH': '1inch', 'ALPHA': 'alpha-finance',
  'ANKR': 'ankr', 'AUDIO': 'audius', 'BAND': 'band-protocol', 'CAKE': 'pancakeswap-token', 
  'CHR': 'chromia', 'CHZ': 'chiliz', 'COTI': 'coti', 'CTSI': 'cartesi', 'DENT': 'dent', 'DODO': 'dodo',
  'EGLD': 'elrond-erd-2', 'FUN': 'funfair', 'GALA': 'gala', 'GTC': 'gitcoin', 'HOT': 'holo',
  'ILV': 'illuvium', 'KLAY': 'klay-token', 'KNC': 'kyber-network-crystal', 'LRC': 'loopring', 
  'MASK': 'mask-network', 'MTL': 'metal', 'OGN': 'origin-protocol', 'OMG': 'omisego', 'ONT': 'ontology',
  'PERP': 'perpetual-protocol', 'POLS': 'polkastarter', 'POWR': 'power-ledger', 'QTUM': 'qtum', 
  'REEF': 'reef-finance', 'REN': 'republic-protocol', 'ROSE': 'oasis-network', 'RUNE': 'thorchain', 
  'SFP': 'safepal', 'SKL': 'skale', 'SLP': 'smooth-love-potion', 'SUSHI': 'sushi', 'SXP': 'swipe', 
  'THETA': 'theta-token', 'TLM': 'alien-worlds', 'TWT': 'trust-wallet-token', 'WAVES': 'waves', 
  'XEM': 'nem', 'XVS': 'venus', 'ZEN': 'zencash', 'FET': 'fetch-ai', 'AGIX': 'singularitynet',
  'OCEAN': 'ocean-protocol', 'WIF': 'dogwifcoin', 'BONK': 'bonk', 'FLOKI': 'floki',
  'WLD': 'worldcoin-wld', 'SEI': 'sei-network', 'TIA': 'celestia', 'JUP': 'jupiter-exchange-solana',
  'PYTH': 'pyth-network', 'JTO': 'jito-governance-token', 'STRK': 'starknet', 'DYM': 'dymension',
  'PIXEL': 'pixels', 'PORTAL': 'portal-2', 'NOT': 'notcoin', 'IO': 'io-net', 'ZRO': 'layerzero',
  'ENA': 'ethena', 'PENDLE': 'pendle', 'ORDI': 'ordinals', 'BLUR': 'blur', 'MEME': 'memecoin-2',
  'GMT': 'stepn', 'GST': 'green-satoshi-token', 'MAGIC': 'magic', 'BEAMX': 'beam-2',
  'XAI': 'xai-blockchain', 'ACE': 'fusionist', 'AI': 'sleepless-ai', 'ALT': 'altlayer',
  'MANTA': 'manta-network', 'NFP': 'nfprompt', 'RONIN': 'ronin', 'RON': 'ronin',
  'AEVO': 'aevo-exchange', 'BOME': 'book-of-meme', 'SAGA': 'saga-2', 'TNSR': 'tensor',
  'BB': 'bouncebit', 'REZ': 'renzo', 'LISTA': 'lista-dao', 'ZK': 'zksync', 'POPCAT': 'popcat',
  'PEOPLE': 'constitutiondao', 'JASMY': 'jasmycoin', 'TURBO': 'turbo', 'NEIRO': 'neiro-on-eth',
  'DOGS': 'dogs-2', 'HMSTR': 'hamster-kombat', 'CATI': 'catizen', 'EIGEN': 'eigenlayer',
  'SCR': 'scroll', 'GRASS': 'grass', 'MOVE': 'movement', 'ME': 'magic-eden', 'USUAL': 'usual',
  'VANA': 'vana', 'BIO': 'bio-protocol', 'SONIC': 'sonic-svm', 'ANIME': 'anime',
  'XMR': 'monero', 'DASH': 'dash', 'NEO': 'neo', 'XLM': 'stellar',
  'EOS': 'eos', 'IOTA': 'iota', 'XTZ': 'tezos', 'KAVA': 'kava', 'FTM': 'fantom', 'ONE': 'harmony',
  'FLOW': 'flow', 'MINA': 'mina-protocol', 'GMX': 'gmx', 'LDO': 'lido-dao', 'RPL': 'rocket-pool',
  'SSV': 'ssv-network', 'FXS': 'frax-share', 'CVX': 'convex-finance', 'ASTR': 'astar',
  'GLMR': 'moonbeam', 'CELO': 'celo', 'CFX': 'conflux-token', 'KAS': 'kaspa', 'QNT': 'quant-network'
};

// Get logo URL - uses CoinMarketCap as primary with fallback to CryptoCompare
export function getLogoUrl(baseAsset: string): string {
  const baseAssetUpper = baseAsset.toUpperCase();
  const baseAssetLower = baseAsset.toLowerCase();
  const cmcId = getCMCId(baseAssetUpper);
  
  // If we have a CMC ID, use CoinMarketCap CDN
  if (cmcId > 0) {
    return `https://s2.coinmarketcap.com/static/img/coins/64x64/${cmcId}.png`;
  }
  
  // Fallback to CryptoCompare for unknown coins
  return `https://www.cryptocompare.com/media/37746238/${baseAssetLower}.png`;
}

// CoinMarketCap ID mapping for reliable icon fetching
const cmcIdMap: Record<string, number> = {
  'BTC': 1, 'ETH': 1027, 'BNB': 1839, 'SOL': 5426, 'XRP': 52, 'DOGE': 74, 'ADA': 2010,
  'TRX': 1958, 'AVAX': 5805, 'TON': 11419, 'SHIB': 5994, 'DOT': 6636, 'BCH': 1831,
  'LINK': 1975, 'NEAR': 6535, 'MATIC': 3890, 'POL': 3890, 'UNI': 7083, 'LTC': 2, 'PEPE': 24478,
  'ICP': 8916, 'ETC': 1321, 'APT': 21794, 'SUI': 20947, 'CRO': 3635, 'ATOM': 3794,
  'FIL': 2280, 'OP': 11840, 'ARB': 11841, 'INJ': 7226, 'STX': 4847, 'IMX': 10603,
  'TAO': 22974, 'RENDER': 5690, 'RNDR': 5690, 'LUNA': 20314, 'LUNC': 4172, 'VTHO': 3012,
  'VET': 3077, 'USDT': 825, 'USDC': 3408, 'DAI': 4943, 'TUSD': 2563, 'BUSD': 4687,
  'FDUSD': 26081, 'PAX': 3330, 'USDP': 3330, 'WBTC': 3717, 'WETH': 2396, 'HBAR': 4642,
  'AAVE': 7278, 'ALGO': 4030, 'AXS': 6783, 'BAT': 1697, 'COMP': 5692, 'CRV': 6538,
  'ENJ': 2130, 'GRT': 6719, 'MANA': 1966, 'MKR': 1518, 'SAND': 6210, 'SNX': 2586,
  'YFI': 5864, 'ZEC': 1437, 'ZIL': 2469, '1INCH': 8104, 'ALPHA': 7232, 'ANKR': 3783,
  'AUDIO': 7455, 'BAND': 4679, 'CAKE': 7186, 'CHR': 3978, 'CHZ': 4066, 'COTI': 3992,
  'CTSI': 5444, 'DENT': 1886, 'DODO': 7224, 'EGLD': 6892, 'FUN': 1757, 'GALA': 7080,
  'GTC': 10052, 'HOT': 2682, 'ILV': 8719, 'KLAY': 4256, 'KNC': 9444, 'LRC': 1934,
  'MASK': 8536, 'MTL': 1788, 'OGN': 5117, 'OMG': 1808, 'ONT': 2566, 'PERP': 6950,
  'POLS': 7208, 'POWR': 2132, 'QTUM': 1684, 'REEF': 6951, 'REN': 2539, 'ROSE': 7653,
  'RUNE': 4157, 'SFP': 8119, 'SKL': 5691, 'SLP': 5824, 'SUSHI': 6758, 'SXP': 4279,
  'THETA': 2416, 'TLM': 9119, 'TWT': 5964, 'WAVES': 1274, 'XEM': 873, 'XVS': 7288,
  'ZEN': 1698, 'FET': 3773, 'AGIX': 2424, 'OCEAN': 3911, 'WIF': 28752, 'BONK': 23095,
  'FLOKI': 10804, 'WLD': 13502, 'SEI': 23149, 'TIA': 22861, 'JUP': 29210, 'PYTH': 28177,
  'JTO': 28541, 'STRK': 22691, 'DYM': 28932, 'PIXEL': 29335, 'PORTAL': 29555, 'NOT': 28850,
  'IO': 30286, 'ZRO': 26997, 'ENA': 30171, 'PENDLE': 9481, 'ORDI': 25028, 'BLUR': 23121,
  'MEME': 28301, 'GMT': 18069, 'GST': 16352, 'MAGIC': 14783, 'BEAMX': 28298, 'XAI': 28934,
  'ACE': 29270, 'AI': 28700, 'ALT': 29476, 'MANTA': 29035, 'NFP': 29316, 'RON': 14101,
  'AEVO': 29676, 'BOME': 29870, 'SAGA': 29624, 'TNSR': 30240, 'BB': 30746, 'REZ': 30753,
  'LISTA': 31139, 'ZK': 24091, 'POPCAT': 28782, 'PEOPLE': 14806, 'JASMY': 8425, 'TURBO': 24911,
  'NEIRO': 32362, 'DOGS': 32698, 'HMSTR': 32646, 'CATI': 33028, 'EIGEN': 29968, 'SCR': 32947,
  'GRASS': 33135, 'MOVE': 32452, 'ME': 33536, 'USUAL': 33577, 'VANA': 35251, 'BIO': 33750,
  'SONIC': 32039, 'ANIME': 34703, 'XMR': 328, 'DASH': 131, 'NEO': 1376, 'XLM': 512,
  'EOS': 1765, 'IOTA': 1720, 'XTZ': 2011, 'KAVA': 4846, 'FTM': 3513, 'ONE': 3945,
  'FLOW': 4558, 'MINA': 8646, 'GMX': 11857, 'LDO': 8000, 'RPL': 2943, 'SSV': 12999,
  'FXS': 6953, 'CVX': 9903, 'ASTR': 12885, 'GLMR': 6836, 'CELO': 5567, 'CFX': 7334,
  'KAS': 20396, 'QNT': 3155, 'W': 29587, 'ONDO': 21159, 'RAY': 8526, 'CORE': 23254,
  'BRETT': 29743, 'ARKM': 27309, 'METIS': 9640, 'RDNT': 21106, 'RSR': 3964, 'CETUS': 25114,
  'SUPER': 8290, 'AKT': 7431, 'SPELL': 11289, 'HOOK': 21939, 'EDU': 26245, 'GNO': 1659,
  'DYDX': 28324, 'OSMO': 12220, 'TRB': 2420, 'ACH': 6958, 'STORJ': 1772, 'GLM': 1455,
  'GUN': 33755, 'COOKIE': 34750, 'D': 35282, 'TRUMP': 35336, 'MELANIA': 35347,
  'BNSOL': 32882, 'PUMP': 36166, 'BFUSD': 37760, 'ASTER': 36341, 'USDE': 29470,
  'USD1': 36148, 'WLFI': 33251, 'LAYER': 35701, 'BABY': 35843, 'TST': 35481,
  'KAITO': 35455, 'SHELL': 35439, 'BMT': 35862, 'NIL': 35920, 'PARTI': 35896,
  'BANANAS31': 35858, 'GPS': 35413, 'RED': 35378, 'SIGN': 35972, 'INIT': 35870,
  'BTTC': 16086, 'WBETH': 24760,
  'API3': 7737, 'CELR': 3814, 'CYBER': 27674, 'KEY': 2398, 'SNT': 1759, 'KDA': 5647,
  'SYN': 12147, 'VELO': 28661, 'ORN': 5765, 'MBL': 4038, 'PROM': 4120,
  'BADGER': 7859, 'AUCTION': 8602, 'ANT': 1680, 'C98': 10903, 'ARPA': 4039, 'BEL': 6928,
  'BURGER': 7158, 'QUICK': 8206, 'RARE': 11294, 'LOOM': 2588, 'VOXEL': 16641, 'AGLD': 11156,
  'FORTH': 9421, 'BOND': 8251, 'CLV': 8384, 'FIDA': 7978, 'EPX': 19766, 'HIGH': 11232,
  'MOB': 7878, 'ALCX': 8613, 'DREP': 4952, 'MIR': 7857, 'OAX': 1853, 'PUNDIX': 9040,
  'DF': 7758, 'WING': 7048, 'TROY': 4761, 'TKO': 9020, 'BETA': 10094, 'FARM': 6859,
  'MBOX': 9175, 'QI': 9288, 'DAR': 11374, 'MOVR': 9285, 'UTK': 2320, 'STMX': 2297,
  'SUN': 10529, 'BICO': 9543, 'DEXE': 7326, 'MULTI': 11012, 'OOKI': 17908, 'AMB': 2081,
  'UNFI': 7672, 'RAD': 6843, 'WAXP': 2300, 'FIRO': 1414, 'REQ': 2071, 'NKN': 2780,
  'DGB': 109, 'CVC': 1816, 'GNS': 13663, 'MDT': 2348, 'OXT': 5026, 'STEEM': 1230,
  'AERGO': 3637, 'LEVER': 19891, 'LTO': 3714, 'POND': 8748, 'IDEX': 3928, 'IRIS': 5135,
  'SCRT': 5604, 'SYS': 541, 'HARD': 6741, 'NULS': 2092, 'CTXC': 2638, 'ARK': 1586,
  'PIVX': 1169, 'CREAM': 6193, 'DOCK': 2675, 'VIB': 2019, 'FIS': 5882, 'NMR': 1732,
  'CHESS': 10974, 'ALPACA': 8707, 'FIO': 5865, 'GHST': 7046, 'FLUX': 3029, 'VITE': 2937,
  'KP3R': 7535, 'LOKA': 17145, 'BAKE': 7064, 'ALICE': 8766, 'DATA': 2143, 'IOTX': 2777,
  'PHA': 6841, 'TVK': 8037, 'QKC': 2840, 'MLN': 1552, 'COMBO': 2702, 'KSM': 5034,
  'BSW': 10746, 'T': 11659, 'DUSK': 4092, 'LIT': 6833, 'FLM': 6896,
  'LPT': 3640, 'BNT': 1727, 'WRX': 5161, 'JST': 5488, 'WIN': 4206,
  'BTT': 16086, 'PORTO': 13089, 'SANTOS': 13305, 'LAZIO': 12996, 'ATM': 12967,
  'ASR': 8573, 'ACM': 9442, 'BAR': 5765, 'JUV': 8548, 'PSG': 5765, 'CITY': 10049,
  'OG': 7722, 'ALPINE': 17705, 'VIDT': 6318, 'ONG': 3217, 'GAS': 1785
};

// Get CMC ID for a token - returns 0 if not found (will trigger fallback)
function getCMCId(symbol: string): number {
  return cmcIdMap[symbol] || 0;
}

// Get all possible logo URLs for a coin (for fallback chain)
export function getLogoUrls(baseAsset: string): string[] {
  const baseAssetUpper = baseAsset.toUpperCase();
  const baseAssetLower = baseAsset.toLowerCase();
  const urls: string[] = [];
  
  // 1. CoinMarketCap static CDN - BEST coverage for Binance coins
  const cmcId = cmcIdMap[baseAssetUpper];
  if (cmcId) {
    urls.push(`https://s2.coinmarketcap.com/static/img/coins/64x64/${cmcId}.png`);
  }
  
  // 2. CryptoCompare - excellent coverage
  urls.push(`https://www.cryptocompare.com/media/37746238/${baseAssetLower}.png`);
  urls.push(`https://www.cryptocompare.com/media/44082042/${baseAssetLower}.png`);
  
  // 3. Binance CDN
  urls.push(`https://bin.bnbstatic.com/image/admin_mgs_image_upload/20201110/87496d50-2408-43e1-ad4c-78b47b448a6a.png`);
  
  // 4. CoinGecko via GitHub (direct image URLs)
  const coinGeckoId = coinGeckoIdMap[baseAssetUpper] || baseAssetLower;
  urls.push(`https://assets.coingecko.com/coins/images/1/small/${coinGeckoId}.png`);
  
  // 5. GitHub CDN - spothq (128px)
  urls.push(`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${baseAssetLower}.png`);
  
  // 6. GitHub CDN - spothq (32px)
  urls.push(`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${baseAssetLower}.png`);
  
  // 7. TrustWallet assets
  urls.push(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/assets/${baseAssetUpper}/logo.png`);
  urls.push(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${baseAssetUpper}/logo.png`);
  
  return urls;
}

