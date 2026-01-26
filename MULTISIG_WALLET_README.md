# Multisig Wallet ABI Documentation

This directory contains the ABI (Application Binary Interface) definition for an Ethereum multisignature wallet smart contract.

## Files

- `multisig-wallet.abi.json` - Complete contract ABI with functions, events, and constructor

## Contract Overview

The multisignature wallet contract provides secure multi-owner administration with the following capabilities:

### Owner Management
- `addOwner(address _ownerAddress)` - Add a new owner to the wallet
- `removeOwner(address _ownerAddress)` - Remove an existing owner
- `changeOwner(address _currentOwnerAddress, address _newOwnerAddress)` - Replace one owner with another
- `isOwner(address _address)` - Check if an address is an owner (read-only)

### Transaction Execution
- `execute(address _recipientAddress, uint256 _transactionValue, bytes _transactionData)` - Submit a transaction for confirmation
- `confirm(bytes32 _transactionHash)` - Add your signature to a pending operation
- `revoke(bytes32 _operationHash)` - Withdraw your confirmation
- `hasConfirmed(bytes32 _operationHash, address _ownerAddress)` - Check if an owner has confirmed (read-only)

### Configuration
- `changeRequirement(uint256 _newRequiredConfirmations)` - Change the number of required signatures
- `setDailyLimit(uint256 _newDailySpendingLimit)` - Set the daily spending limit
- `resetSpentToday()` - Reset today's spending counter
- `kill(address _recipientAddress)` - Destroy the contract and send remaining funds

### View Functions
- `numberOfOwners()` - Get the number of owners (read-only)
- `requiredConfirmations()` - Get the required number of signatures (read-only)
- `dailySpendingLimit()` - Get the daily spending limit (read-only)

## Events

The contract emits the following events with indexed parameters for efficient filtering:

- `OwnerAdded(address indexed newOwnerAddress)`
- `OwnerRemoved(address indexed removedOwnerAddress)`
- `OwnerChanged(address indexed previousOwnerAddress, address indexed newOwnerAddress)`
- `Confirmation(address indexed ownerAddress, bytes32 indexed operationHash)`
- `Revoke(address indexed ownerAddress, bytes32 indexed operationHash)`
- `SingleTransact(address indexed ownerAddress, uint256 transactionValue, address indexed recipientAddress, bytes transactionData)`
- `MultiTransact(address indexed ownerAddress, bytes32 indexed operationHash, uint256 transactionValue, address indexed recipientAddress, bytes transactionData)`
- `ConfirmationNeeded(bytes32 indexed operationHash, address indexed initiatorAddress, uint256 transactionValue, address indexed recipientAddress, bytes transactionData)`
- `RequirementChanged(uint256 newRequiredConfirmations)`
- `Deposit(address _senderAddress, uint256 depositValue)`

## Deployment

When deploying the contract, the constructor requires:
- `address[] _ownerAddresses` - Array of initial owner addresses
- `uint256 _requiredConfirmations` - Number of required confirmations for transactions
- `uint256 _dailySpendingLimit` - Maximum amount that can be spent per day without multi-sig

## Owner Address

**Primary Owner Address:** `0x6B834a2f2a24ae7e592AA0843aa2bDF58157bee7`

This address has full access and write functionality as an owner of the deployed multisig wallet.

## Usage with Web3

```javascript
const Web3 = require('web3');
const web3 = new Web3('YOUR_RPC_URL');

// Load ABI
const abi = require('./multisig-wallet.abi.json');

// Create contract instance
const contractAddress = 'YOUR_CONTRACT_ADDRESS';
const contract = new web3.eth.Contract(abi, contractAddress);

// Example: Check if address is owner
const isOwner = await contract.methods.isOwner('0x6B834a2f2a24ae7e592AA0843aa2bDF58157bee7').call();
console.log('Is owner:', isOwner);

// Example: Get number of owners
const numOwners = await contract.methods.numberOfOwners().call();
console.log('Number of owners:', numOwners);
```

## Security Considerations

- All owner management and configuration changes require multi-signature approval
- Daily spending limits can be set to allow single-owner transactions below the threshold
- Each transaction must be confirmed by the required number of owners before execution
- Owners can revoke their confirmations before a transaction is executed
