import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers'; 

const FaucetBalance = ({ contract, refresh }) => {
    const [balance, setBalance] = useState('0');

    useEffect(() => {
        const loadBalance = async () => {
            if (contract) {
                try {
                    const balance = await contract.getFaucetBalance(); 
                    const formattedBalance = ethers.formatEther(balance); 
                    setBalance(parseFloat(formattedBalance).toFixed(4)); 
                } catch (error) {
                    console.error("Error fetching faucet balance:", error);
                    setBalance('0'); 
                }
            }
        };

        loadBalance(); 
    }, [contract, refresh]);

    return <p className="faucet-balance">💰 Faucet Balance: {balance} ETH</p>;
};

export default FaucetBalance;
