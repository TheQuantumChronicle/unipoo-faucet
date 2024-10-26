// src/networkConfig.js

const NETWORK_CONFIG = {
    UNICHAIN_SEPOLIA: {
        chainId: 1301,
        chainName: 'Unichain Sepolia Testnet',
        rpcUrls: ['https://rpc.sepolia.org/'], 
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
        },
        blockExplorerUrls: ['https://sepolia.uniscan.xyz/'],
        contractAddress: process.env.REACT_APP_CONTRACT_ADDRESS,
    },
};

export default NETWORK_CONFIG;
