import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import LoadingSpinner from './LoadingSpinner';

const WalletConnect = () => {
  const { 
    account, 
    isConnected, 
    loading, 
    error, 
    connectWallet, 
    disconnectWallet 
  } = useWeb3();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleConnect = async () => {
    await connectWallet();
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <LoadingSpinner size="small" />
        <span className="text-sm text-gray-600">Đang kết nối...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {error && (
        <div className="text-red-600 text-sm bg-red-50 px-3 py-1 rounded">
          {error}
        </div>
      )}
      
      {isConnected ? (
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">
              {formatAddress(account)}
            </span>
          </div>
          <button
            onClick={disconnectWallet}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Ngắt kết nối
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center space-x-2"
        >
          <span>🦊</span>
          <span>Kết nối MetaMask</span>
        </button>
      )}
    </div>
  );
};

export default WalletConnect;