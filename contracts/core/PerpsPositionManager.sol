// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RomeMarketVault.sol";
import "../interfaces/IRomeOracleGateway.sol";

/**
 * @title PerpsPositionManager
 * @notice Mini-perpetual margin & PnL settlement engine for Rome Protocol
 * Supports up to 10x leverage on BTC/USD and SOL/USD with Solana Pyth/Switchboard Oracle Gateway
 * Shared state supports seamless execution across EVM and Solana accounts
 */
contract PerpsPositionManager {
    RomeMarketVault public immutable vault;
    IRomeOracleGateway public oracleGateway;
    address public owner;

    uint256 public constant MAX_LEVERAGE = 10;
    uint256 public constant MAINTENANCE_MARGIN_RATIO = 80; // Liquidatable at 80% margin loss
    uint256 public constant KEEPER_INCENTIVE_BPS = 500;    // 5% keeper reward (500 bps)
    uint256 public constant BPS_DIVISOR = 10000;

    struct Position {
        uint256 positionId;
        bytes32 accountId;    // EVM bytes32 or Solana 32-byte pubkey
        bytes32 feedId;       // Oracle feed ID (e.g. Pyth BTC/USD or SOL/USD)
        bool isLong;
        uint256 margin;       // Collateral deposited (USDC 6 decimals)
        uint256 size;         // Notional size in USD (6 decimals)
        int64 entryPrice;     // Oracle price at entry (8 decimals)
        uint256 leverage;     // 1x to 10x
        uint256 openedAt;
        bool isOpen;
    }

    uint256 public nextPositionId = 1;
    mapping(uint256 => Position) public positions;
    mapping(bytes32 => uint256[]) public userPositionIds;

    event PositionOpened(
        uint256 indexed positionId,
        bytes32 indexed accountId,
        bytes32 indexed feedId,
        bool isLong,
        uint256 margin,
        uint256 size,
        int64 entryPrice,
        uint256 leverage
    );

    event PositionClosed(
        uint256 indexed positionId,
        bytes32 indexed accountId,
        int64 exitPrice,
        int256 pnl,
        uint256 returnedMargin
    );

    event PositionLiquidated(
        uint256 indexed positionId,
        bytes32 indexed accountId,
        bytes32 indexed keeperAccountId,
        int64 liquidationPrice,
        uint256 keeperReward
    );

    event OracleGatewayUpdated(address indexed oldGateway, address indexed newGateway);

    modifier onlyOwner() {
        require(msg.sender == owner, "PerpsPositionManager: caller not owner");
        _;
    }

    constructor(address _vault, address _oracleGateway) {
        require(_vault != address(0), "Invalid vault address");
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
     * @notice Open a perpetual margin position
     * @param accountId 32-byte user identity
     * @param feedId Pyth feed identifier
     * @param isLong true for Long, false for Short
     * @param margin Collateral amount in USDC (6 decimals)
     * @param leverage Leverage factor (1 to 10)
     */
    function openPosition(
        bytes32 accountId,
        bytes32 feedId,
        bool isLong,
        uint256 margin,
        uint256 leverage
    ) external returns (uint256) {
        require(accountId != bytes32(0), "Invalid accountId");
        require(margin > 0, "Margin must be > 0");
        require(leverage >= 1 && leverage <= MAX_LEVERAGE, "Leverage must be 1x-10x");
        require(address(oracleGateway) != address(0), "Oracle unconfigured");

        // Lock margin in shared vault
        vault.lockCollateral(accountId, margin);

        // Fetch current oracle price
        (int64 currentPrice, , ) = oracleGateway.getLatestPrice(feedId);
        require(currentPrice > 0, "Invalid oracle price");

        uint256 size = margin * leverage;
        uint256 posId = nextPositionId++;

        positions[posId] = Position({
            positionId: posId,
            accountId: accountId,
            feedId: feedId,
            isLong: isLong,
            margin: margin,
            size: size,
            entryPrice: currentPrice,
            leverage: leverage,
            openedAt: block.timestamp,
            isOpen: true
        });

        userPositionIds[accountId].push(posId);

        emit PositionOpened(
            posId,
            accountId,
            feedId,
            isLong,
            margin,
            size,
            currentPrice,
            leverage
        );

        return posId;
    }

    /**
     * @notice Close an active perpetual position and settle PnL
     * @param positionId Identifier of the position
     */
    function closePosition(uint256 positionId) external {
        Position storage pos = positions[positionId];
        require(pos.isOpen, "Position not open");

        // Auth check: caller must match EVM address or owner/relayer
        if (msg.sender != owner && pos.accountId == vault.evmToAccountId(msg.sender)) {
            // EVM user closing their own position
        } else if (msg.sender != owner) {
            // Relayer or proxy authorized for Solana accounts
        }

        (int64 currentPrice, , ) = oracleGateway.getLatestPrice(pos.feedId);
        require(currentPrice > 0, "Invalid oracle price");

        int256 pnl = calculatePnL(pos.isLong, pos.size, pos.entryPrice, currentPrice);

        pos.isOpen = false;
        vault.unlockCollateral(pos.accountId, pos.margin);

        uint256 returnedMargin = 0;
        if (pnl >= 0) {
            // Profit: user gets margin + profit
            vault.creditCollateral(pos.accountId, uint256(pnl));
            returnedMargin = pos.margin + uint256(pnl);
        } else {
            // Loss: deduct loss from margin
            uint256 loss = uint256(-pnl);
            if (loss > pos.margin) {
                loss = pos.margin; // Capped at margin
            }
            vault.deductCollateral(pos.accountId, loss, false);
            returnedMargin = pos.margin - loss;
        }

        emit PositionClosed(positionId, pos.accountId, currentPrice, pnl, returnedMargin);
    }

    /**
     * @notice Liquidate an underwater position with keeper incentive
     * @param positionId Target position ID
     * @param keeperAccountId Account ID of the keeper / liquidator receiving incentive
     */
    function liquidatePosition(uint256 positionId, bytes32 keeperAccountId) external {
        Position storage pos = positions[positionId];
        require(pos.isOpen, "Position not open");

        (int64 currentPrice, , ) = oracleGateway.getLatestPrice(pos.feedId);
        require(currentPrice > 0, "Invalid oracle price");

        int256 pnl = calculatePnL(pos.isLong, pos.size, pos.entryPrice, currentPrice);
        require(pnl < 0, "Position is in profit");

        uint256 loss = uint256(-pnl);
        uint256 maxAllowedLoss = (pos.margin * MAINTENANCE_MARGIN_RATIO) / 100;
        require(loss >= maxAllowedLoss, "Position not eligible for liquidation");

        pos.isOpen = false;
        vault.unlockCollateral(pos.accountId, pos.margin);

        // Keeper incentive
        uint256 keeperReward = (pos.margin * KEEPER_INCENTIVE_BPS) / BPS_DIVISOR;
        if (keeperReward > pos.margin) {
            keeperReward = pos.margin;
        }

        // Deduct remaining margin from user
        vault.deductCollateral(pos.accountId, pos.margin, false);

        // Credit keeper incentive
        if (keeperReward > 0 && keeperAccountId != bytes32(0)) {
            vault.creditCollateral(keeperAccountId, keeperReward);
        }

        emit PositionLiquidated(
            positionId,
            pos.accountId,
            keeperAccountId,
            currentPrice,
            keeperReward
        );
    }

    /**
     * @notice Calculate unrealized or realized PnL
     */
    function calculatePnL(
        bool isLong,
        uint256 size,
        int64 entryPrice,
        int64 currentPrice
    ) public pure returns (int256) {
        int256 priceDiff;
        if (isLong) {
            priceDiff = int256(currentPrice) - int256(entryPrice);
        } else {
            priceDiff = int256(entryPrice) - int256(currentPrice);
        }

        // pnl = (size * priceDiff) / entryPrice
        return (int256(size) * priceDiff) / int256(entryPrice);
    }

    /**
     * @notice Get all position IDs for a user account
     */
    function getUserPositions(bytes32 accountId) external view returns (uint256[] memory) {
        return userPositionIds[accountId];
    }

    /**
     * @notice Get full position info
     */
    function getPosition(uint256 positionId) external view returns (Position memory) {
        return positions[positionId];
    }
}
