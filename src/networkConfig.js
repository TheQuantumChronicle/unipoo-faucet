const NETWORK_CONFIG = {
    UNICHAIN_SEPOLIA: {
        chainId: 1301,
        chainName: 'Unichain Sepolia Testnet',
        rpcUrls: [process.env.REACT_APP_RPC_URL],
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
        },
        blockExplorerUrls: [process.env.REACT_APP_BLOCK_EXPLORER_URL],
        contractAddress: process.env.REACT_APP_CONTRACT_ADDRESS,
    },
};

export default NETWORK_CONFIG;
