import React, { useState } from 'react';

const ClaimButton = ({ claimETH, disabled }) => {
    const [isClaiming, setIsClaiming] = useState(false);
    const [message, setMessage] = useState('');

    const handleClaim = async () => {
        setIsClaiming(true);
        setMessage('');

        try {
            await claimETH();
            setMessage('Claim successful! Check your wallet.');
        } catch (error) {
            setMessage('Error claiming ETH: ' + (error.reason || error.message));
        }

        setIsClaiming(false);
    };

    return (
        <div>
            <button onClick={handleClaim} disabled={isClaiming || disabled}>
                {isClaiming ? 'Claiming...' : 'Claim 0.01 ETH'}
            </button>
            {message && <p>{message}</p>}
        </div>
    );
};

export default ClaimButton;
