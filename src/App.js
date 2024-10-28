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
  const [captchaToken, setCaptchaToken] = useState('');

  const [userBalance, setUserBalance] = useState('0');
  const MIN_BALANCE = 0.0099; 

  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  const rpcUrl = process.env.REACT_APP_RPC_URL;
  const blockExplorerUrl = process.env.REACT_APP_BLOCK_EXPLORER_URL;
  const hcaptchaSiteKey = process.env.REACT_APP_HCAPTCHA_SITEKEY;
  const twitterProfileUrl = process.env.REACT_APP_TWITTER_PROFILE_URL;
  const xProfileUrl = process.env.REACT_APP_X_PROFILE_URL;
  const unichainWebsiteUrl = process.env.REACT_APP_UNICHAIN_WEBSITE_URL;
  const cooldownDuration = 86400;
  const TARGET_CHAIN_ID = 1301; 

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

 
  const fetchUserBalance = async () => {
    if (provider && account) {
      try {
        const balance = await provider.getBalance(account);
        const formattedBalance = parseFloat(ethers.utils.formatEther(balance));
        setUserBalance(formattedBalance.toFixed(4)); 
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setErrorMessageWithTimeout('Failed to fetch wallet balance.');
      }
    }
  };

  useEffect(() => {
    const checkIfWalletConnected = async () => {
      if (window.ethereum) {
        try {
          const _provider = new ethers.providers.Web3Provider(window.ethereum);
          const accounts = await _provider.listAccounts();

          if (accounts.length > 0) {
            const signer = _provider.getSigner();
            const address = await signer.getAddress();
            setAccount(address);
            setProvider(_provider);

            const network = await _provider.getNetwork();

            if (network.chainId === TARGET_CHAIN_ID) {
              const _contract = new ethers.Contract(contractAddress, contractABI, signer);
              setContract(_contract);
              setNetworkError(false);
              setErrorMessage(null);
              fetchUserBalance(); 
            } else {
              setNetworkError(true);
              setErrorMessageWithTimeout('Please switch to the Unichain Sepolia Testnet.');
            }
          }
        } catch (error) {
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
  }, [contractAddress, TARGET_CHAIN_ID]);

  useEffect(() => {
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
          const totalContributedEth = ethers.utils.formatEther(totalContributedWei);
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

          fetchUserBalance(); 
        } catch (error) {
          setErrorMessageWithTimeout('Failed to fetch user data. Please try again.');
        }
      }
    };

    checkUserData();
  }, [contract, account]);

  const switchToUnichainSepolia = async () => {
    if (!window.ethereum) {
      setErrorMessageWithTimeout('MetaMask is not installed. Please install it to switch networks.');
      return;
    }

    const hexChainId = `0x${TARGET_CHAIN_ID.toString(16)}`;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
      setNetworkError(false);
      setErrorMessage(null);
      fetchUserBalance(); 
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: hexChainId,
                chainName: 'Unichain Sepolia Testnet',
                rpcUrls: [rpcUrl],
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: [blockExplorerUrl],
              },
            ],
          });
          setNetworkError(false);
          setErrorMessage(null);
          fetchUserBalance(); 
        } catch (addError) {
          setErrorMessageWithTimeout('Failed to add the Unichain Sepolia network.');
        }
      } else {
        setErrorMessageWithTimeout('Failed to switch to the Unichain Sepolia network.');
      }
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const _provider = new ethers.providers.Web3Provider(window.ethereum);
        await _provider.send('eth_requestAccounts', []);
        const signer = _provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        setProvider(_provider);

        const network = await _provider.getNetwork();

        if (network.chainId === TARGET_CHAIN_ID) {
          const _contract = new ethers.Contract(contractAddress, contractABI, signer);
          setContract(_contract);
          setNetworkError(false);
          setErrorMessage(null);
          fetchUserBalance(); 
        } else {
          setNetworkError(true);
          setErrorMessageWithTimeout('Please switch to the Unichain Sepolia Testnet.');
        }
      } catch (error) {
        setErrorMessageWithTimeout('Failed to connect wallet. Please try again.');
      }
    } else {
      setErrorMessageWithTimeout('Please install MetaMask!');
    }
  };

  const handleChangeWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
        await connectWallet();
      } catch (error) {
        setErrorMessageWithTimeout('Failed to change wallet.');
      }
    } else {
      setErrorMessageWithTimeout('Please install MetaMask!');
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

      const handleChainChanged = (chainId) => {
        if (parseInt(chainId, 16) === TARGET_CHAIN_ID) {
          setNetworkError(false);
          setErrorMessage(null);
          connectWallet();
        } else {
          setNetworkError(true);
          setErrorMessageWithTimeout('Please switch to the Unichain Sepolia Testnet.');
        }
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
  }, [TARGET_CHAIN_ID]);

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
      const parsedAmount = ethers.utils.parseEther(contributeAmount);
      const user = await contract.users(account);

      if (!user.isWhitelisted && parsedAmount.lt(ethers.utils.parseEther('0.01'))) {
        setErrorMessageWithTimeout('You must contribute at least 0.01 ETH to be whitelisted.');
        setIsContributing(false);
        return;
      } else if (user.isWhitelisted && parsedAmount.lt(ethers.utils.parseEther('0.01'))) {
        setErrorMessageWithTimeout('You must contribute at least 0.01 ETH.');
        setIsContributing(false);
        return;
      }

      const tx = await contract.contribute({ value: parsedAmount });
      await tx.wait();

      setSuccessMessageContribute('🎉 Thanks for contributing!');
      triggerSuccessAnimation();

      setContributeAmount('');
      const userData = await contract.users(account);
      setIsWhitelisted(userData.isWhitelisted);
      const totalContributedWei = userData.totalContributed;
      const totalContributedEth = ethers.utils.formatEther(totalContributedWei);
      setTotalContributed(totalContributedEth);
      fetchUserBalance(); 
    } catch (error) {
      const errorMsg = error.reason || error.message || 'Transaction failed.';
      setErrorMessageWithTimeout(`❌ Contribution failed: ${errorMsg}`);
      triggerFailureAnimation();
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

    if (remainingTime > 0) {
      setErrorMessageWithTimeout('⏳ Claim is on cooldown. Please wait.');
      return;
    }

    if (!captchaToken) {
      setErrorMessageWithTimeout('Please complete the hCaptcha.');
      return;
    }

    if (userBalance < MIN_BALANCE) {
      setErrorMessageWithTimeout('⚠️ Insufficient Sepolia ETH to cover gas fees. Please obtain more ETH.');
      return;
    }

    try {
      setIsClaiming(true);
      const tx = await contract.withdraw();
      await tx.wait();

      setSuccessMessageClaim('💸 Claim successful!');
      triggerSuccessAnimation();

      setCaptchaToken('');

      const user = await contract.users(account);
      const lastClaimTime = Number(user.lastClaimTime);
      const remaining = calculateRemainingTime(lastClaimTime);
      setRemainingTime(remaining);

      const filter = contract.filters.Withdraw(account);
      const events = await contract.queryFilter(filter, 0, 'latest');
      const claimsCount = events.length;
      setClaimedTimes(claimsCount);
      fetchUserBalance(); 
    } catch (error) {
      const errorMsg = error.reason || error.message || 'Transaction failed.';
      setErrorMessageWithTimeout(`❌ Claim failed: ${errorMsg}`);
      triggerFailureAnimation();
    } finally {
      setIsClaiming(false);
    }
  };

  const handleContributeAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,4}$/.test(value)) {
      setContributeAmount(value);
    }
  };

  const handleCaptchaVerify = (token) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken('');
  };

  const handleCaptchaError = (err) => {
    setErrorMessageWithTimeout('hCaptcha failed to load. Please refresh the page.');
  };

  const triggerSuccessAnimation = () => {
    if (animationClass !== 'success-animation') {
      setAnimationClass('success-animation');
      setTimeout(() => {
        setAnimationClass('');
      }, 5000);
    }
  };

  const triggerFailureAnimation = () => {
    if (animationClass !== 'failure-animation') {
      setAnimationClass('failure-animation');
      setTimeout(() => {
        setAnimationClass('');
      }, 3000);
    }
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
          <div className={`task-container task-${currentTask}`}>
            <div className="account-info">
              {account ? (
                <div className="account-details">
                  <p className="connected-account">
                    🌈 {shortenAddress(account)}
                    {isWhitelisted && (
                      <span className="whitelist-badge" title="Whitelisted User"></span>
                    )}
                  </p>
                  <button className="change-wallet-btn" onClick={handleChangeWallet}>
                    Change Wallet
                  </button>
                </div>
              ) : (
                <button className="connect-wallet-btn" onClick={connectWallet}>
                  <img src="/logo.png" alt="Logo" className="button-logo" />
                  Connect Wallet
                </button>
              )}
            </div>

            {account && parseFloat(userBalance) < MIN_BALANCE && (
              <div className="balance-warning">
                ⚠️ Your Unichain Sepolia ETH balance is below 0.0099 ETH. Please get Unichain Sepolia ETH to cover minimal gas fees before making daily claims and contributions.
              </div>
            )}

            {networkError && (
              <div className="network-error-container">
                <p className="network-error-message">
                  🌪 Please switch to the Unichain Sepolia Testnet 🌪
                </p>
                <button className="switch-network-btn" onClick={switchToUnichainSepolia}>
                  Switch/Add Network
                </button>
              </div>
            )}

            <div className="main-content centered-content">
              <div className="captcha-container">
                <HCaptcha
                  sitekey={hcaptchaSiteKey}
                  size="normal"
                  onVerify={handleCaptchaVerify}
                  onExpire={handleCaptchaExpire}
                  onError={handleCaptchaError}
                />
              </div>

              <button
                className="claim-btn"
                onClick={claimETH}
                disabled={
                  !isWhitelisted ||
                  remainingTime > 0 ||
                  isClaiming ||
                  !captchaToken ||
                  parseFloat(userBalance) < MIN_BALANCE
                }
                title={
                  !isWhitelisted
                    ? 'Contribute at least 0.01 ETH to get whitelisted'
                    : parseFloat(userBalance) < MIN_BALANCE
                    ? 'Insufficient Sepolia ETH to cover gas fees'
                    : 'Click to claim'
                }
              >
                {isClaiming ? 'Claiming...' : 'Claim'}
              </button>

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
                  disabled={parseFloat(userBalance) < MIN_BALANCE}
                />
                <button
                  className="contribute-btn"
                  onClick={contributeToFaucet}
                  disabled={isContributing || parseFloat(userBalance) < MIN_BALANCE}
                  title={
                    parseFloat(userBalance) < MIN_BALANCE
                      ? 'Users must have at least 0.0099 Sepolia ETH in their wallet to begin contributing/claiming. Contribute 0.01 ETH to get whitelisted and begin claiming daily.'
                      : 'Contribute 0.01 ETH to get whitelisted and begin claiming daily.'
                  }
                >
                  {isContributing ? 'Contributing...' : '✨ Contribute 💸'}
                  {/* **Tooltip Text** */}
                  <span className="tooltip-text">
                    Users need Unichain Sepolia ETH in their wallet to begin contributing/claiming. Contribute 0.01e or more to get whitelisted and begin claiming your daily rainbow-filled 🦄 💩 
                  </span>
                </button>
              </div>

              {successMessageContribute && (
                <p className={`success-message ${animationClass}`}>{successMessageContribute}</p>
              )}

              <p className="total-contributed">
                My Contributions: <strong>{totalContributed} ETH</strong>
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
                      <p>"I got my daily rainbow-filled at @UniPooFaucet 🦄 🌈💩"</p>
                      <a href={twitterProfileUrl} target="_blank" rel="noopener noreferrer">
                        Follow us on X
                      </a>
                      <div className="twitter-confirmation">
                        <input
                          type="checkbox"
                          id="twitterConfirmed"
                          checked={twitterConfirmed}
                          onChange={(e) => setTwitterConfirmed(e.target.checked)}
                        />
                        <label htmlFor="twitterConfirmed">I have followed and made the post</label>
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
                    const randomDelay = Math.random() * 2 + 1;
                    const randomRotation = Math.floor(Math.random() * 360);

                    const style = {
                      left: `${randomLeft}%`,
                      animationDelay: `${randomDelay}s`,
                      transform: `rotate(${randomRotation}deg)`,
                      animationDuration: '5s',
                    };

                    return (
                      <img
                        key={index}
                        src="/logo.png"
                        alt="Confetti"
                        className="confetti-piece"
                        style={style}
                      />
                    );
                  })}
                </div>
              )}

              {animationClass === 'failure-animation' && (
                <div className="animation-container">
                  <div className="shake"></div>
                </div>
              )}
            </div>
          </div>

          {!account && !isLoading && (
            <div className="connect-wallet-container">
              <button className="connect-wallet-btn" onClick={connectWallet}>
                <img src="/logo.png" alt="Logo" className="button-logo" />
                Connect Wallet
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
