// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IERC20.sol";
import "../interfaces/IRomeCPI.sol";

/**
 * @title RomeMarketVault
 * @notice Unified collateral vault and dual-lane shared-state accounting for Rome Protocol
 * Supports seamless deposits and balance management for both EVM addresses and Solana public keys.
 */
contract RomeMarketVault {
    // Collateral token (e.g. USDC, 6 decimals)
    IERC20 public immutable collateralToken;

    // Rome Precompiles
    address public constant CPI_PRECOMPILE = 0xFF00000000000000000000000000000000000008;
    address public constant HELPER_PRECOMPILE = 0xff00000000000000000000000000000000000009;

    address public owner;

    // Authorized markets (PredictionEngine & PerpsPositionManager)
    mapping(address => bool) public isAuthorizedMarket;

    // Shared State: bytes32 accountId => Collateral balance (USDC 6 decimals)
    // EVM: bytes32(uint256(uint160(evmAddress)))
    // Solana: 32-byte Ed25519 Pubkey
    mapping(bytes32 => uint256) public collateralBalances;
    mapping(bytes32 => uint256) public lockedBalances;

    event CollateralDeposited(bytes32 indexed accountId, address indexed depositor, uint256 amount);
    event CollateralWithdrawn(bytes32 indexed accountId, address indexed recipient, uint256 amount);
    event CollateralLocked(bytes32 indexed accountId, address indexed market, uint256 amount);
    event CollateralUnlocked(bytes32 indexed accountId, address indexed market, uint256 amount);
    event CollateralSettled(bytes32 indexed fromAccount, bytes32 indexed toAccount, uint256 amount);
    event MarketAuthorizationChanged(address indexed market, bool authorized);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "RomeMarketVault: caller is not the owner");
        _;
    }

    modifier onlyAuthorizedMarket() {
        require(isAuthorizedMarket[msg.sender], "RomeMarketVault: caller not authorized market");
        _;
    }

    constructor(address _collateralToken) {
        require(_collateralToken != address(0), "Invalid token address");
        collateralToken = IERC20(_collateralToken);
        owner = msg.sender;
    }

    /**
     * @notice Helper to convert EVM address to 32-byte accountId
     */
    function evmToAccountId(address evmAddr) public pure returns (bytes32) {
        return bytes32(uint256(uint160(evmAddr)));
    }

    /**
     * @notice Authorize or deauthorize a market contract (Prediction or Perps)
     */
    function setMarketAuthorization(address market, bool authorized) external onlyOwner {
        require(market != address(0), "Invalid market address");
        isAuthorizedMarket[market] = authorized;
        emit MarketAuthorizationChanged(market, authorized);
    }

    /**
     * @notice Deposit collateral into unified vault for any accountId (EVM or Solana)
     * @param accountId 32-byte abstract identity
     * @param amount Amount of collateral tokens (6 decimals)
     */
    function depositCollateral(bytes32 accountId, uint256 amount) external {
        require(accountId != bytes32(0), "Invalid accountId");
        require(amount > 0, "Amount must be > 0");

        // Transfer tokens from sender to vault
        bool success = collateralToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Collateral transfer failed");

        collateralBalances[accountId] += amount;
        emit CollateralDeposited(accountId, msg.sender, amount);
    }

    /**
     * @notice Convenience deposit for EVM msg.sender
     */
    function deposit(uint256 amount) external {
        bytes32 accountId = evmToAccountId(msg.sender);
        require(amount > 0, "Amount must be > 0");

        bool success = collateralToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Collateral transfer failed");

        collateralBalances[accountId] += amount;
        emit CollateralDeposited(accountId, msg.sender, amount);
    }

    /**
     * @notice Withdraw free collateral to an EVM address
     * @param accountId 32-byte abstract identity
     * @param amount Amount to withdraw
     * @param recipient Target EVM address
     */
    function withdrawCollateral(bytes32 accountId, uint256 amount, address recipient) external {
        require(recipient != address(0), "Invalid recipient");
        // Access control: EVM sender must match accountId, or accountId must have authorized caller
        if (msg.sender != owner && !isAuthorizedMarket[msg.sender]) {
            require(evmToAccountId(msg.sender) == accountId, "Not authorized to withdraw this account");
        }

        uint256 freeBalance = getAvailableCollateral(accountId);
        require(freeBalance >= amount, "Insufficient free collateral");

        collateralBalances[accountId] -= amount;
        bool success = collateralToken.transfer(recipient, amount);
        require(success, "Token withdrawal failed");

        emit CollateralWithdrawn(accountId, recipient, amount);
    }

    /**
     * @notice Lock collateral for an active position or market trade
     */
    function lockCollateral(bytes32 accountId, uint256 amount) external onlyAuthorizedMarket {
        uint256 available = getAvailableCollateral(accountId);
        require(available >= amount, "Insufficient available collateral to lock");
        lockedBalances[accountId] += amount;
        emit CollateralLocked(accountId, msg.sender, amount);
    }

    /**
     * @notice Unlock collateral upon trade settlement or cancellation
     */
    function unlockCollateral(bytes32 accountId, uint256 amount) external onlyAuthorizedMarket {
        require(lockedBalances[accountId] >= amount, "Cannot unlock more than locked");
        lockedBalances[accountId] -= amount;
        emit CollateralUnlocked(accountId, msg.sender, amount);
    }

    /**
     * @notice Transfer collateral between account IDs during settlement or liquidation
     */
    function settleCollateralTransfer(
        bytes32 fromAccount,
        bytes32 toAccount,
        uint256 amount,
        bool deductFromLocked
    ) external onlyAuthorizedMarket {
        require(collateralBalances[fromAccount] >= amount, "Insufficient source balance");
        if (deductFromLocked) {
            require(lockedBalances[fromAccount] >= amount, "Insufficient locked balance");
            lockedBalances[fromAccount] -= amount;
        }

        collateralBalances[fromAccount] -= amount;
        collateralBalances[toAccount] += amount;

        emit CollateralSettled(fromAccount, toAccount, amount);
    }

    /**
     * @notice Burn / deduct collateral from account (for market losses / protocol fees)
     */
    function deductCollateral(
        bytes32 accountId,
        uint256 amount,
        bool deductFromLocked
    ) external onlyAuthorizedMarket {
        require(collateralBalances[accountId] >= amount, "Insufficient balance to deduct");
        if (deductFromLocked) {
            require(lockedBalances[accountId] >= amount, "Insufficient locked to deduct");
            lockedBalances[accountId] -= amount;
        }
        collateralBalances[accountId] -= amount;
    }

    /**
     * @notice Credit collateral to account (for market winnings / fee distribution)
     */
    function creditCollateral(bytes32 accountId, uint256 amount) external onlyAuthorizedMarket {
        collateralBalances[accountId] += amount;
    }

    /**
     * @notice Get available (unlocked) collateral balance
     */
    function getAvailableCollateral(bytes32 accountId) public view returns (uint256) {
        if (collateralBalances[accountId] <= lockedBalances[accountId]) {
            return 0;
        }
        return collateralBalances[accountId] - lockedBalances[accountId];
    }

    /**
     * @notice Transfer ownership of the vault
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
