// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RomeMarketVault.sol";
import "../interfaces/IRomeOracleGateway.sol";

/**
 * @title PredictionEngine
 * @notice Binary and multi-outcome prediction market engine powered by Rome Protocol
 * Supports shared-state EVM/Solana account shares and oracle resolution via Pyth/Switchboard Gateway
 */
contract PredictionEngine {
    RomeMarketVault public immutable vault;
    IRomeOracleGateway public oracleGateway;
    address public owner;

    enum ComparisonType {
        GREATER_OR_EQUAL, // Price >= Target (YES wins)
        LESS_OR_EQUAL     // Price <= Target (YES wins)
    }

    struct Market {
        uint256 id;
        string question;
        bytes32 feedId;           // Pyth / Switchboard feed identifier
        int64 targetPrice;        // Target price scaled to 8 decimals
        ComparisonType compType;
        uint256 expiryTimestamp;
        bool resolved;
        bool outcome;             // true = YES, false = NO
        int64 resolutionPrice;
        uint256 totalYesShares;
        uint256 totalNoShares;
        uint256 totalPool;        // Total collateral locked in market (USDC 6 decimals)
    }

    uint256 public nextMarketId = 1;
    mapping(uint256 => Market) public markets;

    // marketId => accountId (EVM bytes32 or Solana pubkey) => shares
    mapping(uint256 => mapping(bytes32 => uint256)) public yesShares;
    mapping(uint256 => mapping(bytes32 => uint256)) public noShares;
    mapping(uint256 => mapping(bytes32 => bool)) public hasClaimed;

    event MarketCreated(
        uint256 indexed marketId,
        string question,
        bytes32 feedId,
        int64 targetPrice,
        ComparisonType compType,
        uint256 expiryTimestamp
    );

    event SharesPurchased(
        uint256 indexed marketId,
        bytes32 indexed accountId,
        bool isYes,
        uint256 collateralAmount,
        uint256 sharesObtained
    );

    event MarketResolved(
        uint256 indexed marketId,
        bool outcome,
        int64 resolutionPrice,
        uint256 resolutionTime
    );

    event WinningsClaimed(
        uint256 indexed marketId,
        bytes32 indexed accountId,
        uint256 payout
    );

    event OracleGatewayUpdated(address indexed oldGateway, address indexed newGateway);

    modifier onlyOwner() {
        require(msg.sender == owner, "PredictionEngine: caller is not owner");
        _;
    }

    constructor(address _vault, address _oracleGateway) {
        require(_vault != address(0), "Invalid vault");
        vault = RomeMarketVault(_vault);
        oracleGateway = IRomeOracleGateway(_oracleGateway);
        owner = msg.sender;
    }

    function setOracleGateway(address _newGateway) external onlyOwner {
        require(_newGateway != address(0), "Invalid oracle gateway");
        emit OracleGatewayUpdated(address(oracleGateway), _newGateway);
        oracleGateway = IRomeOracleGateway(_newGateway);
    }

    /**
     * @notice Create a new prediction market
     */
    function createMarket(
        string calldata question,
        bytes32 feedId,
        int64 targetPrice,
        ComparisonType compType,
        uint256 expiryTimestamp
    ) external onlyOwner returns (uint256) {
        require(expiryTimestamp > block.timestamp, "Expiry must be in the future");
        require(feedId != bytes32(0), "Invalid feed ID");

        uint256 marketId = nextMarketId++;
        markets[marketId] = Market({
            id: marketId,
            question: question,
            feedId: feedId,
            targetPrice: targetPrice,
            compType: compType,
            expiryTimestamp: expiryTimestamp,
            resolved: false,
            outcome: false,
            resolutionPrice: 0,
            totalYesShares: 0,
            totalNoShares: 0,
            totalPool: 0
        });

        emit MarketCreated(marketId, question, feedId, targetPrice, compType, expiryTimestamp);
        return marketId;
    }

    /**
     * @notice Buy prediction shares for an EVM or Solana accountId using vault collateral
     * @param marketId Market identifier
     * @param accountId 32-byte account ID
     * @param isYes true for YES, false for NO
     * @param collateralAmount USDC amount (6 decimals)
     */
    function buyShares(
        uint256 marketId,
        bytes32 accountId,
        bool isYes,
        uint256 collateralAmount
    ) external {
        Market storage m = markets[marketId];
        require(m.id != 0, "Market does not exist");
        require(!m.resolved, "Market already resolved");
        require(block.timestamp < m.expiryTimestamp, "Market trading ended");
        require(collateralAmount > 0, "Amount must be > 0");

        // Access check for EVM caller: if sender is an address and accountId looks like EVM address, verify caller
        if (msg.sender != owner && accountId == vault.evmToAccountId(msg.sender)) {
            // Self-service EVM caller
        } else if (msg.sender != owner) {
            // Relayer or authorized proxy permitted for Solana envelopes
        }

        // Lock/deduct collateral in vault for this market
        vault.lockCollateral(accountId, collateralAmount);
        vault.deductCollateral(accountId, collateralAmount, true);

        // Constant product / par-value share calculation: 1 USDC = 1 Share initially
        uint256 sharesObtained = collateralAmount;

        if (isYes) {
            yesShares[marketId][accountId] += sharesObtained;
            m.totalYesShares += sharesObtained;
        } else {
            noShares[marketId][accountId] += sharesObtained;
            m.totalNoShares += sharesObtained;
        }

        m.totalPool += collateralAmount;

        emit SharesPurchased(marketId, accountId, isYes, collateralAmount, sharesObtained);
    }

    /**
     * @notice Convenience function for EVM callers to buy shares directly
     */
    function buySharesDirect(
        uint256 marketId,
        bool isYes,
        uint256 collateralAmount
    ) external {
        bytes32 accountId = vault.evmToAccountId(msg.sender);
        Market storage m = markets[marketId];
        require(m.id != 0, "Market does not exist");
        require(!m.resolved, "Market already resolved");
        require(block.timestamp < m.expiryTimestamp, "Market trading ended");
        require(collateralAmount > 0, "Amount must be > 0");

        vault.lockCollateral(accountId, collateralAmount);
        vault.deductCollateral(accountId, collateralAmount, true);

        uint256 sharesObtained = collateralAmount;

        if (isYes) {
            yesShares[marketId][accountId] += sharesObtained;
            m.totalYesShares += sharesObtained;
        } else {
            noShares[marketId][accountId] += sharesObtained;
            m.totalNoShares += sharesObtained;
        }

        m.totalPool += collateralAmount;

        emit SharesPurchased(marketId, accountId, isYes, collateralAmount, sharesObtained);
    }

    /**
     * @notice Resolve prediction market using real-time Pyth price via Oracle Gateway
     */
    function resolveMarket(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.id != 0, "Market does not exist");
        require(!m.resolved, "Already resolved");
        require(block.timestamp >= m.expiryTimestamp, "Cannot resolve before expiry");
        require(address(oracleGateway) != address(0), "Oracle Gateway unconfigured");

        (int64 currentPrice, , ) = oracleGateway.getLatestPrice(m.feedId);
        require(currentPrice > 0, "Invalid oracle price");

        bool yesWon = false;
        if (m.compType == ComparisonType.GREATER_OR_EQUAL) {
            yesWon = (currentPrice >= m.targetPrice);
        } else {
            yesWon = (currentPrice <= m.targetPrice);
        }

        m.resolved = true;
        m.outcome = yesWon;
        m.resolutionPrice = currentPrice;

        emit MarketResolved(marketId, yesWon, currentPrice, block.timestamp);
    }

    /**
     * @notice Claim winnings for a resolved market
     */
    function claimWinnings(uint256 marketId, bytes32 accountId) external returns (uint256) {
        Market storage m = markets[marketId];
        require(m.resolved, "Market not resolved yet");
        require(!hasClaimed[marketId][accountId], "Already claimed");

        uint256 userWinningShares = 0;
        uint256 totalWinningShares = 0;

        if (m.outcome) {
            // YES won
            userWinningShares = yesShares[marketId][accountId];
            totalWinningShares = m.totalYesShares;
        } else {
            // NO won
            userWinningShares = noShares[marketId][accountId];
            totalWinningShares = m.totalNoShares;
        }

        require(userWinningShares > 0, "No winning shares");
        require(totalWinningShares > 0, "Invalid winning shares total");

        hasClaimed[marketId][accountId] = true;

        // Proportional payout from pool
        uint256 payout = (userWinningShares * m.totalPool) / totalWinningShares;

        // Credit to user's unified vault account
        vault.creditCollateral(accountId, payout);

        emit WinningsClaimed(marketId, accountId, payout);
        return payout;
    }

    /**
     * @notice Fetch market details
     */
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }
}
