Use the following `forge` command to verify the contract on Etherscan (chain ID 2201). Replace the placeholders with your contract address, contract path/name, and API key:

```bash
forge verify-contract <CONTRACT_ADDRESS> <PATH_TO_CONTRACT>:<CONTRACT_NAME> --verifier etherscan --verifier-url "https://api.etherscan.io/v2/api?chainid=2201" --etherscan-api-key <YOUR_ETHERSCAN_API_KEY> --watch
```
