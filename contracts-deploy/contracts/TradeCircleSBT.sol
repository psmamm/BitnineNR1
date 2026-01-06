// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TradeCircleSBT
 * @dev ERC-5192 Minimal Soulbound Token for TradeCircle On-Chain Resume
 * 
 * This contract implements a fälschungssichere (tamper-proof) on-chain resume
 * for TradeCircle users. Tokens are permanently locked to wallets and cannot
 * be transferred, ensuring authenticity of verified trading metrics.
 * 
 * Features:
 * - ERC-5192 compliant (locked tokens)
 * - IssuerOnly minting (only TradeCircle validation node can mint)
 * - Badge metadata for verified metrics (Max Drawdown, Profit Factor, R-Multiple)
 */
contract TradeCircleSBT is ERC721, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    // Issuer address - only this address can mint SBTs
    address public issuer;
    
    // Mapping from token ID to badge data
    mapping(uint256 => TraderBadge) public badges;
    
    // Mapping from user address to token ID
    mapping(address => uint256) public userTokenId;
    
    // Mapping from user address to badge count
    mapping(address => uint256) public badgeCount;
    
    // Mapping from token ID to array of badge indices
    mapping(uint256 => uint256[]) public tokenBadges;
    
    /**
     * @dev Badge structure for verified trading metrics
     * All values are stored in basis points (10000 = 100%) for precision
     */
    struct TraderBadge {
        string achievement;      // e.g., "6_months_profitable", "prop_firm_challenge_passed"
        uint256 timestamp;        // When badge was earned
        uint256 maxDrawdown;      // Basis Points (10000 = 100%)
        uint256 profitFactor;     // Scaled (10000 = 1.00)
        uint256 rMultiple;        // Scaled (10000 = 1.00)
        bool verified;            // Issuer verification flag
    }
    
    event BadgeAdded(uint256 indexed tokenId, address indexed user, string achievement);
    event IssuerUpdated(address indexed oldIssuer, address indexed newIssuer);
    
    /**
     * @dev Modifier to ensure only issuer can mint
     */
    modifier onlyIssuer() {
        require(msg.sender == issuer, "TradeCircleSBT: Only issuer can mint");
        _;
    }
    
    /**
     * @dev Constructor sets the issuer address
     */
    constructor(address _issuer) ERC721("TradeCircle SBT", "TCSBT") Ownable(msg.sender) {
        require(_issuer != address(0), "TradeCircleSBT: Issuer cannot be zero address");
        issuer = _issuer;
    }
    
    /**
     * @dev ERC-5192: Returns true if token is locked (non-transferable)
     * All SBTs are permanently locked
     */
    function locked(uint256 tokenId) external pure returns (bool) {
        return true; // All tokens are permanently locked
    }
    
    /**
     * @dev Override transfer functions to prevent transfers (SBT standard)
     */
    function transferFrom(address, address, uint256) public pure override {
        revert("TradeCircleSBT: Token is locked and non-transferable");
    }
    
    function safeTransferFrom(address, address, uint256) public pure override {
        revert("TradeCircleSBT: Token is locked and non-transferable");
    }
    
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("TradeCircleSBT: Token is locked and non-transferable");
    }
    
    /**
     * @dev Mint a new SBT for a user (only issuer)
     * If user already has a token, add badge to existing token
     */
    function mint(address to, string memory achievement, uint256 maxDrawdown, uint256 profitFactor, uint256 rMultiple) 
        external 
        onlyIssuer 
    {
        require(to != address(0), "TradeCircleSBT: Cannot mint to zero address");
        
        uint256 tokenId;
        
        // Check if user already has a token
        if (userTokenId[to] != 0) {
            tokenId = userTokenId[to];
        } else {
            // Mint new token
            tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(to, tokenId);
            userTokenId[to] = tokenId;
        }
        
        // Add badge
        addBadge(tokenId, achievement, maxDrawdown, profitFactor, rMultiple);
    }
    
    /**
     * @dev Add a verified badge to an existing token
     */
    function addBadge(
        uint256 tokenId,
        string memory achievement,
        uint256 maxDrawdown,
        uint256 profitFactor,
        uint256 rMultiple
    ) 
        public 
        onlyIssuer 
    {
        require(_ownerOf(tokenId) != address(0), "TradeCircleSBT: Token does not exist");
        
        uint256 badgeIndex = badgeCount[_ownerOf(tokenId)];
        
        badges[tokenId] = TraderBadge({
            achievement: achievement,
            timestamp: block.timestamp,
            maxDrawdown: maxDrawdown,
            profitFactor: profitFactor,
            rMultiple: rMultiple,
            verified: true
        });
        
        tokenBadges[tokenId].push(badgeIndex);
        badgeCount[_ownerOf(tokenId)]++;
        
        emit BadgeAdded(tokenId, _ownerOf(tokenId), achievement);
    }
    
    /**
     * @dev Get all badges for a user's token
     */
    function getBadges(address user) external view returns (TraderBadge memory) {
        uint256 tokenId = userTokenId[user];
        require(tokenId != 0, "TradeCircleSBT: User has no token");
        return badges[tokenId];
    }
    
    /**
     * @dev Get badge data for a specific token
     */
    function getBadge(uint256 tokenId) external view returns (TraderBadge memory) {
        require(_ownerOf(tokenId) != address(0), "TradeCircleSBT: Token does not exist");
        return badges[tokenId];
    }
    
    /**
     * @dev Update issuer address (only owner)
     */
    function setIssuer(address _issuer) external onlyOwner {
        require(_issuer != address(0), "TradeCircleSBT: Issuer cannot be zero address");
        address oldIssuer = issuer;
        issuer = _issuer;
        emit IssuerUpdated(oldIssuer, _issuer);
    }
    
    /**
     * @dev Check if user has a token
     */
    function hasToken(address user) external view returns (bool) {
        return userTokenId[user] != 0;
    }
    
    /**
     * @dev Get token ID for a user
     */
    function getTokenId(address user) external view returns (uint256) {
        return userTokenId[user];
    }
}
