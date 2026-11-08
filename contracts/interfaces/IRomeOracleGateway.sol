// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRomeOracleGateway
 * @notice Interface for Rome Oracle Gateway & Pyth/Switchboard price feeds
 * Bridges Solana L1 oracle state to Rome EVM with sub-second latency
 */
interface IRomeOracleGateway {
    struct PriceData {
        int64 price;           // Price with exponent (e.g., 5000000000000 for $50,000.00 with expo -8)
        uint64 conf;           // Confidence interval
        int32 expo;            // Exponent (typically -8 for USD feeds)
        uint256 publishTime;   // Solana timestamp of feed update
    }

    /**
     * @notice Fetch latest normalized price for a given feed ID (e.g., BTC/USD or SOL/USD)
     * @param feedId 32-byte identifier for Pyth or Switchboard feed
     * @return price Price scaled to 8 decimals ($50,000 = 5000000000000)
     * @return conf Confidence spread
     * @return publishTime Timestamp of publication
     */
    function getLatestPrice(bytes32 feedId)
        external
        view
        returns (int64 price, uint64 conf, uint256 publishTime);

    /**
     * @notice Fetch raw price details including exponent
     */
    function getPriceDetails(bytes32 feedId)
        external
        view
        returns (PriceData memory);

    /**
     * @notice Check whether a price feed is fresh within maxStaleness
     */
    function isFeedFresh(bytes32 feedId, uint256 maxStaleness)
        external
        view
        returns (bool);
}
