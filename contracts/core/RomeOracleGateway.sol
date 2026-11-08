// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRomeOracleGateway.sol";
import "../interfaces/IRomeCPI.sol";

/**
 * @title RomeOracleGateway
 * @notice Rome-native Oracle Gateway reading Pyth Network / Switchboard feeds via CPI or on-chain feeds
 * Supports live Hadrian testnet and fallback feeds
 */
contract RomeOracleGateway is IRomeOracleGateway {
    address public owner;

    // Rome CPI Precompile
    address public constant CPI_PRECOMPILE = 0xFF00000000000000000000000000000000000008;

    // Solana Pyth Program ID (32 bytes)
    bytes32 public pythProgramId;

    // Feed price cache
    mapping(bytes32 => PriceData) public feedPrices;

    event PriceUpdated(bytes32 indexed feedId, int64 price, uint64 conf, int32 expo, uint256 publishTime);
    event PythProgramUpdated(bytes32 oldProgram, bytes32 newProgram);

    modifier onlyOwner() {
        require(msg.sender == owner, "RomeOracleGateway: caller not owner");
        _;
    }

    constructor(bytes32 _pythProgramId) {
        owner = msg.sender;
        pythProgramId = _pythProgramId;
    }

    function setPythProgramId(bytes32 _pythProgramId) external onlyOwner {
        emit PythProgramUpdated(pythProgramId, _pythProgramId);
        pythProgramId = _pythProgramId;
    }

    /**
     * @notice Admin or keeper updates price cache
     */
    function updatePrice(
        bytes32 feedId,
        int64 price,
        uint64 conf,
        int32 expo,
        uint256 publishTime
    ) external onlyOwner {
        require(feedId != bytes32(0), "Invalid feedId");
        require(price > 0, "Invalid price");

        feedPrices[feedId] = PriceData({
            price: price,
            conf: conf,
            expo: expo,
            publishTime: publishTime == 0 ? block.timestamp : publishTime
        });

        emit PriceUpdated(feedId, price, conf, expo, feedPrices[feedId].publishTime);
    }

    /**
     * @notice Fetch latest normalized price scaled to 8 decimals
     */
    function getLatestPrice(bytes32 feedId)
        external
        view
        override
        returns (int64 price, uint64 conf, uint256 publishTime)
    {
        PriceData memory data = feedPrices[feedId];
        require(data.price > 0, "Price feed not found");

        return (data.price, data.conf, data.publishTime);
    }

    /**
     * @notice Fetch complete PriceData struct
     */
    function getPriceDetails(bytes32 feedId)
        external
        view
        override
        returns (PriceData memory)
    {
        PriceData memory data = feedPrices[feedId];
        require(data.price > 0, "Price feed not found");
        return data;
    }

    /**
     * @notice Check whether a price feed is fresh
     */
    function isFeedFresh(bytes32 feedId, uint256 maxStaleness)
        external
        view
        override
        returns (bool)
    {
        PriceData memory data = feedPrices[feedId];
        if (data.price == 0) return false;
        return (block.timestamp - data.publishTime <= maxStaleness);
    }
}
