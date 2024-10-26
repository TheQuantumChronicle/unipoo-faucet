// src/App.js

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import FaucetBalance from './components/FaucetBalance';
import Background from './components/Background';
import contractABI from './contractABI.json';
import './App.css';

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [remainingTime, setRemainingTime] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessageClaim, setSuccessMessageClaim] = useState(null);
  const [successMessageContribute, setSuccessMessageContribute] = useState(null);
  const [isContributing, setIsContributing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const [claimedTimes, setClaimedTimes] = useState(0);
  const [totalContributed, setTotalContributed] = useState(0);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [currentTask, setCurrentTask] = useState(1);
  const [twitterConfirmed, setTwitterConfirmed] = useState(false);

  // hCaptcha State
  const [captchaToken, setCaptchaToken] = useState('');
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);

  // Environment Variables
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  const rpcUrl = process.env.REACT_APP_RPC_URL;
  const blockExplorerUrl = process.env.REACT_APP_BLOCK_EXPLORER_URL;
  const twitterProfileUrl = process.env.REACT_APP_TWITTER_PROFILE_URL;
  const xProfileUrl = process.env.REACT_APP_X_PROFILE_URL;
  const unichainWebsiteUrl = process.env.REACT_APP_UNICHAIN_WEBSITE_URL;
  const cooldownDuration = 86400; 

  const shortenAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const setErrorMessageWithTimeout = (message) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage(null);
    }, 5000);
  };

  const calculateRemainingTime = (lastClaimTime) => {
    if (lastClaimTime === 0) {
      return 0;
    }
    const currentTime = Math.floor(Date.now() / 1000);
    const remaining = lastClaimTime + cooldownDuration - currentTime;
    return remaining > 0 ? remaining : 0;
  };

  const checkUserData = async () => {
    if (contract && account) {
      try {
        const user = await contract.users(account);
        const lastClaimTime = Number(user.lastClaimTime);
        const remaining = calculateRemainingTime(lastClaimTime);
        setRemainingTime(remaining);
        setIsWhitelisted(user.isWhitelisted);

        const filter = contract.filters.Withdraw(account);
        const events = await contract.queryFilter(filter, 0, 'latest');
        const claimsCount = events.length;
        setClaimedTimes(claimsCount);

        const totalContributedWei = user.totalContributed;
        const totalContributedEth = ethers.formatEther(totalContributedWei);
        setTotalContributed(totalContributedEth);

        if (claimsCount >= 7) {
          if (parseFloat(totalContributedEth) >= 0.1) {
            setCurrentTask(3);
          } else {
            setCurrentTask(2);
          }
        } else {
          setCurrentTask(1);
        }
      } catch (error) {
        console.error("Error checking user data:", error);
        setErrorMessageWithTimeout('Failed to fetch user data. Please try again.');
      }
    }
  };

  useEffect(() => {
    const checkIfWalletConnected = async () => {
      if (window.ethereum) {
        try {
          const _provider = new ethers.BrowserProvider(window.ethereum);
          const network = await _provider.getNetwork();

          const targetChainId = BigInt(1301);

          if (network.chainId === targetChainId) {
            const signer = await _provider.getSigner();
            const _contract = new ethers.Contract(contractAddress, contractABI, signer);
            setContract(_contract);
            setProvider(_provider);

            const address = await signer.getAddress();
            setAccount(address);
            setNetworkError(false);
            setErrorMessage(null);

            await checkUserData();
          } else {
            setNetworkError(true);
            setErrorMessageWithTimeout('Please switch to the Unichain Sepolia Testnet.');
          }
        } catch (error) {
          console.error("Error loading blockchain data:", error);
          setErrorMessageWithTimeout('Failed to load blockchain data.');
          setNetworkError(true);
        }
      } else {
        setErrorMessageWithTimeout('MetaMask is not installed. Please install it to use this app.');
        setNetworkError(true);
      }
      setIsLoading(false);
    };

    checkIfWalletConnected();
  }, []);

  const switchToUnichainSepolia = async () => {
    if (!window.ethereum) {
      setErrorMessageWithTimeout("MetaMask is not installed. Please install it to switch networks.");
      return;
    }

    const hexChainId = `0x${(1301).toString(16)}`;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }]
      });
      setNetworkError(false);
      setErrorMessage(null);
      await checkUserData();
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: hexChainId,
              chainName: 'Unichain Sepolia Testnet',
              rpcUrls: [rpcUrl],
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: [blockExplorerUrl],
            }]
          });
          setNetworkError(false);
          setErrorMessage(null);
          await checkUserData();
        } catch (addError) {
          console.error('Failed to add the chain:', addError);
          setErrorMessageWithTimeout('Failed to add the Unichain Sepolia network.');
        }
      } else {
        console.error('Failed to switch network:', error);
        setErrorMessageWithTimeout('Failed to switch to the Unichain Sepolia network.');
      }
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        await _provider.send("eth_requestAccounts", []);
        const network = await _provider.getNetwork();

        const targetChainId = BigInt(1301);

        if (network.chainId !== targetChainId) {
          setNetworkError(true);
          setErrorMessageWithTimeout('Please switch to the Unichain Sepolia Testnet.');
          return;
        }

        const signer = await _provider.getSigner();
        const _contract = new ethers.Contract(contractAddress, contractABI, signer);
        setContract(_contract);
        setProvider(_provider);

        const address = await signer.getAddress();
        setAccount(address);
        setNetworkError(false);
        setErrorMessage(null);

        await checkUserData();
      } catch (error) {
        console.error("Error connecting to wallet:", error);
        setErrorMessageWithTimeout('Failed to connect wallet. Please try again.');
      }
    } else {
      setErrorMessageWithTimeout("Please install MetaMask!");
    }
  };

  const handleChangeWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
      } catch (error) {
        console.error('Error changing wallet:', error);
        setErrorMessageWithTimeout('Failed to change wallet.');
      }
    } else {
      setErrorMessageWithTimeout("Please install MetaMask!");
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          connectWallet();
        } else {
          setAccount(null);
          setContract(null);
          setProvider(null);
          setNetworkError(true);
          setErrorMessageWithTimeout('Please connect to MetaMask.');
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  useEffect(() => {
    checkUserData();
  }, [contract, account]);

  useEffect(() => {
    if (remainingTime > 0) {
      const interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [remainingTime]);

  useEffect(() => {
    if (currentTask === 3 && twitterConfirmed) {
      setCurrentTask(4);
    }
  }, [twitterConfirmed, currentTask]);

  const contributeToFaucet = async () => {
    setErrorMessage(null);
    setSuccessMessageContribute(null);
    setSuccessMessageClaim(null);

    if (!contract || !provider) {
      setErrorMessageWithTimeout('Wallet not connected or contract not loaded.');
      return;
    }
    try {
      setIsContributing(true);
      const parsedAmount = ethers.parseEther(contributeAmount);
      const user = await contract.users(account);

      if (!user.isWhitelisted && parsedAmount < ethers.parseEther('0.01')) {
        setErrorMessageWithTimeout("You must contribute at least 0.01 ETH to be whitelisted.");
        setIsContributing(false);
        return;
      } else if (user.isWhitelisted && parsedAmount < ethers.parseEther('0.01')) {
        setErrorMessageWithTimeout("You must contribute at least 0.01 ETH.");
        setIsContributing(false);
        return;
      }

      const tx = await contract.contribute({ value: parsedAmount });
      await tx.wait();

      setSuccessMessageContribute('🎉 Thanks for contributing!');
      setAnimationClass('success-animation');

      setTimeout(() => {
        setSuccessMessageContribute(null);
        setAnimationClass('');
      }, 5000);

      setContributeAmount('');
      await checkUserData();
    } catch (error) {
      console.error('Contribution failed:', error);
      const errorMsg = error.reason || error.message || 'Transaction failed.';
      setErrorMessageWithTimeout(`❌ Contribution failed: ${errorMsg}`);
      setAnimationClass('failure-animation');

      setTimeout(() => {
        setAnimationClass('');
      }, 3000);
    } finally {
      setIsContributing(false);
    }
  };

  const claimETH = async () => {
    setErrorMessage(null);
    setSuccessMessageClaim(null);
    setSuccessMessageContribute(null);

    if (!isWhitelisted) {
      setErrorMessageWithTimeout('🔒 You need to be whitelisted to claim.');
      return;
    }

    if (contract && remainingTime === 0 && isCaptchaVerified) { 
      try {
        setIsClaiming(true);
        const tx = await contract.withdraw();
        await tx.wait();

        setSuccessMessageClaim('💸 Claim successful!');
        setAnimationClass('success-animation');

        // Reset CAPTCHA
        setCaptchaToken('');
        setIsCaptchaVerified(false);

        setTimeout(() => {
          setSuccessMessageClaim(null);
          setAnimationClass('');
        }, 5000);

        await checkUserData();
      } catch (error) {
        console.error('Error claiming ETH:', error);
        const errorMsg = error.reason || error.message || 'Transaction failed.';
        setErrorMessageWithTimeout(`❌ Claim failed: ${errorMsg}`);
        setAnimationClass('failure-animation');

        setTimeout(() => {
          setAnimationClass('');
        }, 3000);
      } finally {
        setIsClaiming(false);
      }
    } else {
      console.warn("Claim attempted but still on cooldown or contract not ready.");
      setErrorMessageWithTimeout("⏳ Claim is on cooldown. Please wait.");
    }
  };

  const handleContributeAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,4}$/.test(value)) {
      setContributeAmount(value);
    }
  };

  // hCaptcha Handlers
  const handleCaptchaVerify = (token) => {
    setCaptchaToken(token);
    setIsCaptchaVerified(true);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken('');
    setIsCaptchaVerified(false);
  };

  return (
    <div className="App">
      <Background />

      <header className="app-header">
        <img src="/logo.png" alt="Unipoo Faucet Logo" className="app-logo" />
        <h1 className="app-title">
          <img src="/logo.png" alt="Logo" className="title-logo" />
          Uni-Poo Faucet
          <img src="/logo.png" alt="Logo" className="title-logo" />
        </h1>
        <p className="app-subtitle">Get your daily rainbow-filled</p>
        <p>.01e Unichain Sepolia ETH per Day</p>
      </header>

      {isLoading ? (
        <div className="loading-spinner"></div>
      ) : (
        <>
          {networkError && (
            <div className="network-error-container">
              <p className="network-error-message">
                🌪 Please switch to the Unichain Sepolia Testnet 🌪
              </p>
              <button className="switch-network-btn" onClick={switchToUnichainSepolia}>
                Switch Network
              </button>
            </div>
          )}

          {!networkError && account && (
            <div className={`task-container task-${currentTask}`}>
              <div className="account-info">
                <p className="connected-account">🌈 {shortenAddress(account)}</p>
                <button className="change-wallet-btn" onClick={handleChangeWallet}>
                  Change Wallet
                </button>
              </div>

              <button
                className="claim-btn"
                onClick={claimETH}
                disabled={!isWhitelisted || remainingTime > 0 || isClaiming || !isCaptchaVerified}
                title={
                  !isWhitelisted
                    ? 'Contribute at least 0.01 ETH to get whitelisted'
                    : 'Please complete the CAPTCHA to claim'
                }
              >
                {isClaiming ? 'Claiming...' : 'Claim'}
              </button>

              <div className="captcha-container">
                <HCaptcha
                  sitekey={process.env.REACT_APP_HCAPTCHA_SITEKEY}
                  theme="light"
                  size="compact"
                  onVerify={handleCaptchaVerify}
                  onExpire={handleCaptchaExpire}
                />
              </div>

              {successMessageClaim && (
                <p className={`success-message ${animationClass}`}>{successMessageClaim}</p>
              )}

              <p className="claims-tracker">Claims: {claimedTimes}/7</p>

              {remainingTime > 0 ? (
                <p className="cooldown-timer">
                  ⏳ Next Claim In... {Math.floor(remainingTime / 3600)}h{' '}
                  {Math.floor((remainingTime % 3600) / 60)}m {remainingTime % 60}s
                </p>
              ) : (
                <p className="no-cooldown-message">No cooldown. You can claim now! 🎉</p>
              )}

              <div className="contribute-section">
                <input
                  type="text"
                  className="contribute-input"
                  placeholder="Amount in ETH"
                  value={contributeAmount}
                  onChange={handleContributeAmountChange}
                />
                <button
                  className="contribute-btn"
                  onClick={contributeToFaucet}
                  disabled={isContributing}
                >
                  {isContributing ? 'Contributing...' : '✨ Contribute 💸'}
                  <span className="tooltip-text">🔮 contribute more... 🎁</span>
                  <span className="tooltip-text">Contribute .01 to get WL'd and begin claiming daily</span>
                </button>
              </div>

              {successMessageContribute && (
                <p className={`success-message ${animationClass}`}>{successMessageContribute}</p>
              )}

              <p className="total-contributed">
                Total Contributed: <strong>{totalContributed} ETH</strong>
              </p>
              <FaucetBalance contract={contract} />

              {errorMessage && <p className="error-message">{errorMessage}</p>}

              {currentTask >= 2 && (
                <div className="new-task">
                  {currentTask === 2 && (
                    <div>
                      <p>🎉 You've reached 7 claims!</p>
                      <p>Next, contribute at least 0.1 ETH to unlock the final task.</p>
                    </div>
                  )}
                  {currentTask === 3 && (
                    <div>
                      <p>🎉 Great job!</p>
                      <p>
                        For the final task, follow us on X (Twitter) and make a post saying:
                      </p>
                      <p>
                        "I got my daily rainbow-filled at @yourxaccount 🦄 🌈💩"
                      </p>
                      <a
                        href={twitterProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Follow us on X
                      </a>
                      <div className="twitter-confirmation">
                        <input
                          type="checkbox"
                          id="twitterConfirmed"
                          checked={twitterConfirmed}
                          onChange={(e) => setTwitterConfirmed(e.target.checked)}
                        />
                        <label htmlFor="twitterConfirmed">
                          I have followed and made the post
                        </label>
                      </div>
                    </div>
                  )}
                  {currentTask === 4 && (
                    <div>
                      <p>🎉 Congratulations! You've completed all tasks!</p>
                      <p>Thank you for your support!</p>
                    </div>
                  )}
                </div>
              )}

              <div className="social-share">
                <a
                  href={xProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-share-btn"
                >
                  <img src="/xlogo.svg" alt="Follow us on X" className="social-logo x-logo" />
                </a>

                <a
                  href={unichainWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-share-btn"
                >
                  <img src="/ulogo.svg" alt="Visit Unichain" className="social-logo u-logo" />
                </a>
              </div>

              {(isContributing || isClaiming) && (
                <div className="progress-bar-container">
                  <div className="progress-bar"></div>
                </div>
              )}

              {animationClass === 'success-animation' && (
                <div className="animation-container">
                  {[...Array(25)].map((_, index) => {
                    const randomLeft = Math.floor(Math.random() * 100);
                    const randomDelay = Math.random() * 0.5;
                    const randomRotation = Math.floor(Math.random() * 360);

                    const style = {
                      left: `${randomLeft}%`,
                      animationDelay: `${randomDelay}s`,
                      transform: `rotate(${randomRotation}deg)`,
                    };

                    return <div key={index} className="confetti-piece" style={style}></div>;
                  })}
                </div>
              )}

              {animationClass === 'failure-animation' && (
                <div className="animation-container">
                  <div className="shake"></div>
                </div>
              )}
            </div>
          )}

          {!networkError && !account && (
            <button className="connect-wallet-btn" onClick={connectWallet}>
              <img src="/logo.png" alt="Logo" className="button-logo" />
              Connect Wallet
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default App;
