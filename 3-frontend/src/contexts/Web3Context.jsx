import React, { createContext, useState, useContext, useEffect } from 'react';
import Web3 from 'web3';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [networkId, setNetworkId] = useState(null);
  const [contract, setContract] = useState(null);

  // Contract ABI
  const contractABI = [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_productId",
          "type": "uint256"
        }
      ],
      "name": "buyProduct",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_productId",
          "type": "uint256"
        }
      ],
      "name": "getProduct",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "productType",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "harvestDate",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "region",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "farmName",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "farmer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "price",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isOrganic",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "isSold",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "productCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_productType",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "_harvestDate",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_region",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_farmName",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "_price",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "_isOrganic",
          "type": "bool"
        }
      ],
      "name": "registerProduct",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_role",
          "type": "string"
        }
      ],
      "name": "registerUser",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_user",
          "type": "address"
        }
      ],
      "name": "isUserRegistered",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  // Contract Address - Ganache Local
  const contractAddress = '0x7f9729D8c88BFAde7C16271812aA11056d9D1c84';

  useEffect(() => {
    initializeWeb3();
  }, []);

  const initializeWeb3 = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        console.log('✅ MetaMask detected');
        
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);
        
        // Initialize contract
        const checksumAddress = web3Instance.utils.toChecksumAddress(contractAddress);
        const contractInstance = new web3Instance.eth.Contract(contractABI, checksumAddress);
        setContract(contractInstance);
        
        console.log('✅ Web3 & Contract initialized');
        
        // Check existing connection
        await checkExistingConnection();
      } else {
        setError('⚠️ Vui lòng cài đặt MetaMask để sử dụng tính năng blockchain');
      }
    } catch (error) {
      console.error('❌ Error initializing Web3:', error);
      setError('Lỗi khởi tạo Web3: ' + error.message);
    }
  };

  const checkExistingConnection = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          setNetworkId(chainId);
          
          console.log('✅ Existing connection found:', {
            account: accounts[0],
            network: chainId
          });
        }
      }
    } catch (error) {
      console.error('❌ Error checking existing connection:', error);
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');

      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask chưa được cài đặt');
      }

      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const currentAccount = accounts[0];
      setAccount(currentAccount);
      setIsConnected(true);
      
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setNetworkId(chainId);

      console.log('✅ Wallet connected:', {
        account: currentAccount,
        network: chainId
      });

      return { success: true, account: currentAccount, networkId: chainId };
      
    } catch (error) {
      console.error('❌ Error connecting wallet:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error) => {
    if (error.code === 4001) {
      return '🔒 Người dùng từ chối kết nối ví';
    } else if (error.code === -32002) {
      return '⏳ Yêu cầu kết nối đang chờ xử lý, vui lòng kiểm tra MetaMask';
    } else {
      return error.message || '❌ Lỗi kết nối ví không xác định';
    }
  };

  const disconnectWallet = () => {
    setWeb3(null);
    setAccount('');
    setIsConnected(false);
    setError('');
    setNetworkId(null);
    setContract(null);
    console.log('🔌 Wallet disconnected');
  };

  const switchToGanacheNetwork = async () => {
    try {
      const ganacheChainId = '0x539'; // 1337 in hex
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ganacheChainId }],
      });
      
      return { success: true };
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x539',
                chainName: 'Ganache Local',
                rpcUrls: ['http://localhost:7545'],
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: null
              },
            ],
          });
          return { success: true };
        } catch (addError) {
          return { 
            success: false, 
            error: 'Không thể thêm Ganache network: ' + addError.message 
          };
        }
      }
      return { 
        success: false, 
        error: 'Không thể chuyển network: ' + switchError.message 
      };
    }
  };

  // 🎯 HÀM MUA HÀNG - ĐÃ FIX LỖI GAS FEE
  const buyProductOnChain = async (productId, expectedPriceETH) => {
    try {
      console.log('🛒 [BUY] === BẮT ĐẦU QUY TRÌNH MUA HÀNG ===');
      console.log('📦 Product ID:', productId);
      console.log('💰 Expected Price:', expectedPriceETH, 'ETH');
      console.log('👤 Buyer:', account);

      // 🔍 KIỂM TRA KẾT NỐI
      if (!isConnected || !account) {
        throw new Error('❌ Chưa kết nối ví MetaMask');
      }

      if (!web3 || !contract) {
        throw new Error('❌ Web3 hoặc contract chưa khởi tạo');
      }

      // 🔍 KIỂM TRA SẢN PHẨM CHI TIẾT
      console.log('🔍 [BUY] Đang lấy thông tin sản phẩm từ blockchain...');
      let productDetails;
      let actualPriceWei;
      try {
        const product = await contract.methods.getProduct(productId).call();
        console.log('📋 [BUY] Raw product data:', product);
        
        productDetails = {
          id: parseInt(product[0]),
          name: product[1],
          productType: product[2],
          harvestDate: new Date(parseInt(product[3]) * 1000),
          region: product[4],
          farmName: product[5],
          farmer: product[6],
          owner: product[7],
          price: web3.utils.fromWei(product[8], 'ether'),
          isOrganic: product[9],
          isSold: product[10],
          createdAt: new Date(parseInt(product[11]) * 1000)
        };

        actualPriceWei = product[8];

        console.log('✅ [BUY] Product details:', productDetails);
        console.log('💰 [BUY] Actual Price (Wei):', actualPriceWei);

        // 🚨 KIỂM TRA ĐIỀU KIỆN REVERT
        if (productDetails.isSold) {
          throw new Error('🚨 Sản phẩm đã được bán');
        }

        if (productDetails.farmer.toLowerCase() === account.toLowerCase()) {
          throw new Error('🚨 Không thể mua sản phẩm của chính mình');
        }

        if (parseFloat(productDetails.price) <= 0) {
          throw new Error('🚨 Giá sản phẩm không hợp lệ');
        }

        console.log('✅ [BUY] Tất cả điều kiện hợp lệ');

      } catch (productError) {
        console.error('❌ [BUY] Lỗi kiểm tra sản phẩm:', productError);
        throw new Error(`Không thể mua sản phẩm: ${productError.message}`);
      }

      // 💰 KIỂM TRA SỐ DƯ - FIXED: Gas fee thực tế
      console.log('💰 [BUY] Đang kiểm tra số dư...');
      const balance = await web3.eth.getBalance(account);
      const balanceETH = web3.utils.fromWei(balance, 'ether');
      const productPriceETH = parseFloat(productDetails.price);
      
      // 🎯 FIX: Gas fee thực tế chỉ ~0.002 ETH thay vì 0.2 ETH
      const estimatedGasFee = 0.002;
      const requiredAmount = productPriceETH + estimatedGasFee;

      console.log('💰 [BUY] Balance check - FIXED:', {
        currentBalance: parseFloat(balanceETH).toFixed(6) + ' ETH',
        productPrice: productPriceETH.toFixed(6) + ' ETH',
        gasFeeEstimate: estimatedGasFee.toFixed(6) + ' ETH',
        required: requiredAmount.toFixed(6) + ' ETH',
        hasEnough: parseFloat(balanceETH) >= requiredAmount
      });

      if (parseFloat(balanceETH) < requiredAmount) {
        throw new Error(
          `💸 Không đủ ETH!\n\n` +
          `• Số dư hiện tại: ${parseFloat(balanceETH).toFixed(6)} ETH\n` +
          `• Giá sản phẩm: ${productPriceETH.toFixed(6)} ETH\n` +
          `• Phí gas ước tính: ${estimatedGasFee.toFixed(6)} ETH\n` +
          `• Cần tối thiểu: ${requiredAmount.toFixed(6)} ETH\n\n` +
          `Vui lòng nạp thêm ETH vào ví.`
        );
      }

      // 👤 TỰ ĐỘNG ĐĂNG KÝ USER NẾU CHƯA CÓ
      try {
        console.log('👤 [BUY] Kiểm tra đăng ký người dùng...');
        const isRegistered = await contract.methods.isUserRegistered(account).call();
        if (!isRegistered) {
          console.log('⏳ [BUY] Người dùng chưa đăng ký. Đang đăng ký với vai trò "buyer"...');
          await contract.methods.registerUser("Người mua", "buyer").send({
            from: account,
            gas: 300000
          });
          console.log('✅ [BUY] Đăng ký người dùng thành công.');
        } else {
          console.log('✅ [BUY] Người dùng đã đăng ký.');
        }
      } catch (registerError) {
        console.error('❌ [BUY] Lỗi khi kiểm tra/đăng ký người dùng:', registerError);
        throw new Error(`Lỗi đăng ký người dùng: ${registerError.message}`);
      }

      // 🎯 THỰC HIỆN MUA HÀNG
      console.log('🚀 [BUY] Đang gửi transaction mua hàng...');

      const transaction = await contract.methods
        .buyProduct(productId)
        .send({
          from: account,
          value: actualPriceWei,
          gas: 300000, // Gas limit vừa đủ
        });

      console.log('🎉 [BUY] TRANSACTION THÀNH CÔNG!', {
        hash: transaction.transactionHash,
        block: transaction.blockNumber,
        gasUsed: transaction.gasUsed
      });

      // 🔄 KIỂM TRA LẠI TRẠNG THÁI SẢN PHẨM
      console.log('🔍 [BUY] Đang xác nhận trạng thái mới...');
      const updatedProduct = await contract.methods.getProduct(productId).call();
      const isNowSold = updatedProduct[10];
      const newOwner = updatedProduct[7];
      
      console.log('✅ [BUY] Updated product status:', {
        isSold: isNowSold,
        newOwner: newOwner,
        expectedOwner: account
      });

      if (newOwner.toLowerCase() !== account.toLowerCase()) {
        console.warn('⚠️ [BUY] Owner không khớp sau khi mua');
      }

      return {
        success: true,
        transactionHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber,
        gasUsed: transaction.gasUsed,
        newOwner: newOwner
      };

    } catch (error) {
      console.error('💥 [BUY] LỖI MUA HÀNG CHI TIẾT:', {
        name: error.name,
        message: error.message,
        code: error.code,
        data: error.data,
        stack: error.stack
      });

      // PHÂN TÍCH LỖI CHI TIẾT
      const errorAnalysis = analyzePurchaseError(error);
      
      return {
        success: false,
        error: errorAnalysis.userMessage,
        technicalDetails: errorAnalysis.technicalDetails,
        code: error.code,
        suggestion: errorAnalysis.suggestion
      };
    }
  };

  // 🎯 HÀM PHÂN TÍCH LỖI
  const analyzePurchaseError = (error) => {
    const message = error.message || '';
    
    console.log('🔍 [ERROR_ANALYSIS] Analyzing error:', message);

    if (message.includes('user rejected') || message.includes('User denied')) {
      return {
        userMessage: '❌ Bạn đã từ chối giao dịch trong MetaMask',
        technicalDetails: 'User rejected the transaction',
        suggestion: 'Chấp nhận transaction trong MetaMask'
      };
    }
    
    if (message.includes('insufficient funds')) {
      return {
        userMessage: '💸 Không đủ ETH trong ví để thực hiện giao dịch',
        technicalDetails: 'Insufficient funds for transaction',
        suggestion: 'Nạp thêm ETH vào ví'
      };
    }

    if (message.includes('execution reverted')) {
      const revertMatch = message.match(/execution reverted(.*?)(?="|$)/);
      const revertReason = revertMatch ? revertMatch[1].trim() : 'Unknown reason';
      
      return {
        userMessage: `📝 Smart Contract Revert: ${revertReason || 'Điều kiện không đạt'}`,
        technicalDetails: `Execution reverted: ${revertReason}`,
        suggestion: 'Kiểm tra điều kiện trong smart contract'
      };
    }
    
    if (message.includes('revert')) {
      return {
        userMessage: '📝 Lỗi từ Smart Contract',
        technicalDetails: 'Transaction reverted',
        suggestion: 'Có thể sản phẩm đã bán hoặc điều kiện không hợp lệ'
      };
    }

    if (message.includes('Internal JSON-RPC error')) {
      return {
        userMessage: '🔗 Lỗi kết nối blockchain',
        technicalDetails: 'Internal JSON-RPC error',
        suggestion: 'Kiểm tra Ganache và thử lại'
      };
    }

    if (message.includes('out of gas')) {
      return {
        userMessage: '⛽ Hết gas',
        technicalDetails: 'Transaction ran out of gas',
        suggestion: 'Thử lại với gas limit cao hơn'
      };
    }

    if (message.includes('not found')) {
      return {
        userMessage: '🔍 Sản phẩm không tồn tại trên blockchain',
        technicalDetails: 'Product not found',
        suggestion: 'Kiểm tra lại product ID'
      };
    }

    // Default error
    return {
      userMessage: `❌ Lỗi: ${message.substring(0, 150)}...`,
      technicalDetails: message,
      suggestion: 'Thử lại sau hoặc kiểm tra kết nối mạng'
    };
  };

// 🎯 HÀM ĐĂNG KÝ SẢN PHẨM - ĐÃ FIX LỖI SYNTAX
const registerProductOnChain = async (productData) => {
  try {
    console.log('🌱 [REGISTER] Bắt đầu đăng ký sản phẩm');

    if (!isConnected) {
      throw new Error('Vui lòng kết nối ví trước');
    }

    if (!web3 || !contract) {
      throw new Error('Web3 hoặc contract chưa khởi tạo');
    }

    // Chuyển đổi dữ liệu
    const priceInWei = web3.utils.toWei(productData.price.toString(), 'ether');
    const harvestTimestamp = Math.floor(new Date(productData.harvestDate).getTime() / 1000);

    console.log('📦 [REGISTER] Dữ liệu sản phẩm:', {
      name: productData.name,
      type: productData.productType,
      price: productData.price,
      priceInWei: priceInWei,
      harvestDate: harvestTimestamp
    });

    // Đăng ký user nếu chưa có
    const isRegistered = await contract.methods.isUserRegistered(account).call();
    if (!isRegistered) {
      console.log('👤 [REGISTER] Đăng ký user mới...');
      await contract.methods.registerUser("Nông dân", "farmer").send({
        from: account,
        gas: 300000
      });
    }

    // Đăng ký sản phẩm
    const transaction = await contract.methods
      .registerProduct(
        productData.name,
        productData.productType,
        harvestTimestamp,
        productData.region,
        productData.farmName || 'Nông trại',
        priceInWei,
        productData.isOrganic || false
      )
      .send({
        from: account,
        gas: 500000
      });

    console.log('✅ [REGISTER] Đăng ký thành công:', transaction.transactionHash);
    
    return {
      success: true,
      transactionHash: transaction.transactionHash,
      blockNumber: transaction.blockNumber
    };

  } catch (error) {
    console.error('❌ [REGISTER] Lỗi đăng ký sản phẩm:', error);
    return {
      success: false,
      error: analyzePurchaseError(error).userMessage
    };
  }
};

  // 🎯 HÀM LẤY THÔNG TIN SẢN PHẨM
  const getProductFromChain = async (productId) => {
    try {
      console.log('🔍 [GET] Lấy thông tin sản phẩm:', productId);
      
      const product = await contract.methods.getProduct(productId).call();
      
      const formattedProduct = {
        id: parseInt(product[0]),
        name: product[1],
        productType: product[2],
        harvestDate: new Date(parseInt(product[3]) * 1000),
        region: product[4],
        farmName: product[5],
        farmer: product[6],
        owner: product[7],
        price: web3.utils.fromWei(product[8], 'ether'),
        isOrganic: product[9],
        isSold: product[10],
        createdAt: new Date(parseInt(product[11]) * 1000)
      };

      console.log('✅ [GET] Thông tin sản phẩm:', formattedProduct);
      return { success: true, data: formattedProduct };

    } catch (error) {
      console.error('❌ [GET] Lỗi lấy thông tin sản phẩm:', error);
      return { 
        success: false, 
        error: `Không thể lấy thông tin sản phẩm #${productId}: ${error.message}` 
      };
    }
  };

  // 🎯 HÀM LẤY TỔNG SỐ SẢN PHẨM
  const getProductCount = async () => {
    try {
      const count = await contract.methods.productCount().call();
      console.log('📊 [COUNT] Tổng số sản phẩm:', count);
      return { success: true, count: parseInt(count) };
    } catch (error) {
      console.error('❌ [COUNT] Lỗi lấy số lượng sản phẩm:', error);
      return { success: false, error: error.message };
    }
  };

  // 🎯 HÀM LẤY SỐ DƯ
  const getBalance = async () => {
    try {
      if (!web3 || !account) {
        return { success: false, error: 'Chưa kết nối ví' };
      }
      
      const balance = await web3.eth.getBalance(account);
      const balanceETH = web3.utils.fromWei(balance, 'ether');
      
      console.log('💰 [BALANCE] Số dư:', {
        account: account,
        balance: parseFloat(balanceETH).toFixed(4) + ' ETH'
      });
      
      return { 
        success: true, 
        balance: parseFloat(balanceETH).toFixed(4),
        balanceWei: balance
      };
    } catch (error) {
      console.error('❌ [BALANCE] Lỗi lấy số dư:', error);
      return { success: false, error: error.message };
    }
  };

  // 🎯 HÀM KIỂM TRA CONTRACT
  const checkContractDeployment = async () => {
    try {
      if (!web3) return { success: false, error: 'Web3 chưa khởi tạo' };
      
      const code = await web3.eth.getCode(contractAddress);
      const isDeployed = code !== '0x';
      
      console.log('🔍 [CHECK] Contract deployment:', {
        address: contractAddress,
        isDeployed: isDeployed,
        codeLength: code.length
      });
      
      return { 
        success: isDeployed, 
        isDeployed: isDeployed,
        error: isDeployed ? null : 'Contract chưa được deploy tại địa chỉ này'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // 🎯 EVENT LISTENERS
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        console.log('🔄 Accounts changed:', accounts);
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      };

      const handleChainChanged = (chainId) => {
        console.log('🔄 Network changed to:', chainId);
        setNetworkId(chainId);
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const value = {
    // State
    web3,
    account,
    isConnected,
    loading,
    error,
    networkId,
    contract,
    
    // Methods
    connectWallet,
    disconnectWallet,
    switchToGanacheNetwork,
    
    // Product Functions
    registerProductOnChain,
    buyProductOnChain,
    getProductFromChain,
    getProductCount,
    
    // Utility Functions
    getBalance,
    checkContractDeployment,
    
    // Constants
    contractAddress
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};