// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRomeCPI
 * @notice Interfaces for Rome Protocol Precompiles
 * Precompile Addresses:
 * - CPI_PROGRAM: 0xFF00000000000000000000000000000000000008
 * - SYSTEM_PROGRAM: 0xFF00000000000000000000000000000000000007
 * - HELPER_PROGRAM: 0xFF00000000000000000000000000000000000009
 */

interface ICrossProgramInvocation {
    struct AccountMeta {
        bytes32 pubkey;
        bool isSigner;
        bool isWritable;
    }

    /**
     * @notice Execute an unsigned Cross-Program Invocation to a Solana program
     * @param programId 32-byte Solana program ID (e.g., Pyth, Switchboard, Jupiter)
     * @param accounts Array of account metadata required by the Solana program
     * @param instructionData Raw Borsh or binary encoded instruction payload
     * @return result Returned data from the Solana program
     */
    function invoke(
        bytes32 programId,
        AccountMeta[] calldata accounts,
        bytes calldata instructionData
    ) external returns (bytes memory);

    /**
     * @notice Execute a signed CPI signed by the EVM contract's derived PDA
     * @param programId 32-byte Solana program ID
     * @param accounts Array of account metadata
     * @param instructionData Raw instruction payload
     * @param seeds Array of seed byte slices for PDA signer derivation
     * @return result Returned data from the Solana program
     */
    function invoke_signed(
        bytes32 programId,
        AccountMeta[] calldata accounts,
        bytes calldata instructionData,
        bytes32[][] calldata seeds
    ) external returns (bytes memory);
}

interface ISystemProgram {
    function createAccount(
        bytes32 from,
        bytes32 to,
        uint64 lamports,
        uint64 space,
        bytes32 owner
    ) external;
}

interface IHelperProgram {
    function transferSol(bytes32 to, uint64 lamports) external;
    function transferSpl(bytes32 from, bytes32 to, bytes32 mint, uint64 amount) external;
}
