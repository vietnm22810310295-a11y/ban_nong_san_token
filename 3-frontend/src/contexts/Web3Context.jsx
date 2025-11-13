import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import Web3 from 'web3';
// [FIX] Import trực tiếp file JSON để tự lấy ABI và Address chuẩn nhất
import AgriculturalMarketplace from '../contracts/AgriculturalMarketplace.json';

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
  const [contractAddress, setContractAddress] = useState('');

  const checkExistingConnection = useCallback(async (web3Instance) => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          const netId = await web3Instance.eth.net.getId();
          setNetworkId(netId);
          console.log('✅ Existing connection found:', { account: accounts[0], network: netId });
          return netId; // Trả về netId để dùng tiếp
        }
      }
    } catch (error) {
      console.error('❌ Error checking existing connection:', error);
    }
    return null;
  }, []);

  // Hàm khởi tạo Contract động theo mạng
  const loadContract = async (web3Instance, netId) => {
    try {
        const deployedNetwork = AgriculturalMarketplace.networks[netId];
        
        if (!deployedNetwork) {
            setError(`❌ Contract chưa được deploy lên mạng này (ID: ${netId}). Hãy chuyển sang Ganache (5777 hoặc 1337).`);
            setContract(null);
            return;
        }

        const instance = new web3Instance.eth.Contract(
            AgriculturalMarketplace.abi,
            deployedNetwork.address
        );

        setContract(instance);
        setContractAddress(deployedNetwork.address);
        console.log('✅ Contract loaded at:', deployedNetwork.address);
        setError('');
    } catch (error) {
        console.error("Lỗi load contract:", error);
        setError("Không thể load Smart Contract.");
    }
  };

  useEffect(() => {
    const initializeWeb3 = async () => {
      try {
        if (typeof window.ethereum !== 'undefined') {
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);
          
          const netId = await checkExistingConnection(web3Instance);
          
          // Nếu đã kết nối ví, thử load contract ngay
          if (netId) {
             await loadContract(web3Instance, netId);
          } else {
             // Nếu chưa kết nối ví, thử lấy network ID hiện tại của MetaMask
             const currentNetId = await web3Instance.eth.net.getId();
             await loadContract(web3Instance, currentNetId);
          }

        } else {
          setError('⚠️ Vui lòng cài đặt MetaMask');
        }
      } catch (error) {
        console.error('❌ Error initializing Web3:', error);
        setError('Lỗi khởi tạo Web3: ' + error.message);
      }
    };
    initializeWeb3();
  }, [checkExistingConnection]);

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');
      if (typeof window.ethereum === 'undefined') throw new Error('MetaMask chưa được cài đặt');
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentAccount = accounts[0];
      setAccount(currentAccount);
      setIsConnected(true);
      
      // Lấy network ID mới nhất sau khi connect
      const web3Instance = new Web3(window.ethereum);
      const netId = await web3Instance.eth.net.getId();
      setNetworkId(netId);
      
      // Load lại contract theo mạng mới
      await loadContract(web3Instance, netId);
      
      return { success: true, account: currentAccount };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWeb3(null);
    setAccount('');
    setIsConnected(false);
    setContract(null);
  };

  // =====================================================
  // HÀM MUA HÀNG (CÓ TỰ ĐỘNG ĐĂNG KÝ + CHECK SỐ DƯ)
  // =====================================================
  const buyProductOnChain = async (productId, quantityToBuy = 1) => {
    try {
      console.log(`🛒 [BUY] Mua ID: ${productId} - Số lượng: ${quantityToBuy}`);

      if (!isConnected || !web3 || !contract) throw new Error('Chưa kết nối ví hoặc contract chưa load');

      // 1. Kiểm tra xem User này đã đăng ký chưa? Nếu chưa thì TỰ ĐỘNG ĐĂNG KÝ
      const isRegistered = await contract.methods.isUserRegistered(account).call();
      if (!isRegistered) {
          console.log("👤 Người dùng mới -> Đang tự động đăng ký...");
          // Gọi hàm đăng ký trước
          await contract.methods.registerUser("Người mua mới", "buyer").send({ from: account });
          console.log("✅ Đã đăng ký xong!");
      }

      // 2. Lấy giá đơn vị
      const product = await contract.methods.getProduct(productId).call();
      const unitPriceWei = product.price; 
      
      // 3. Tính tổng tiền
      const totalCostWei = BigInt(unitPriceWei) * BigInt(quantityToBuy);

      console.log(`💰 Giá gốc: ${unitPriceWei}, Tổng (Wei): ${totalCostWei}`);

      // 4. Gọi hàm MUA
      const transaction = await contract.methods
        .buyProduct(productId, quantityToBuy)
        .send({
          from: account,
          value: totalCostWei.toString(), 
          gas: 3000000 // Gas cao để đảm bảo
        });

      console.log('🎉 [BUY] Thành công:', transaction.transactionHash);
      return { success: true, transactionHash: transaction.transactionHash };

    } catch (error) {
      console.error('💥 [BUY] Lỗi:', error);
      
      let errorMessage = error.message;
      if (error.message.includes("revert")) {
          // Gợi ý các nguyên nhân revert phổ biến
          errorMessage = "Giao dịch bị từ chối! Kiểm tra:\n1. Bạn có đang mua hàng của chính mình không?\n2. Số dư ETH có đủ không?\n3. Hàng còn đủ số lượng không?";
      }
      return { success: false, error: errorMessage };
    }
  };

  // =====================================================
  // HÀM ĐĂNG KÝ SP
  // =====================================================
  const registerProductOnChain = async (productData) => {
    try {
      console.log('🌱 [REGISTER]', productData);
      if (!isConnected || !contract) throw new Error('Chưa kết nối contract');

      const priceInWei = web3.utils.toWei(productData.price.toString(), 'ether');
      const harvestTimestamp = Math.floor(new Date(productData.harvestDate).getTime() / 1000);

      // Check User
      const isRegistered = await contract.methods.isUserRegistered(account).call();
      if (!isRegistered) {
        await contract.methods.registerUser("Nông dân", "farmer").send({ from: account });
      }

      const transaction = await contract.methods
        .registerProduct(
          productData.name,
          productData.productType,
          harvestTimestamp,
          productData.region,
          productData.farmName || 'Nông trại',
          priceInWei,
          productData.isOrganic || false,
          productData.quantity || 1,
          productData.unit || 'kg'
        )
        .send({ from: account, gas: 800000 });

      return { success: true, transactionHash: transaction.transactionHash };
    } catch (error) {
      console.error('❌ [REGISTER] Lỗi:', error);
      return { success: false, error: error.message };
    }
  };

  // =====================================================
  // HÀM LẤY DỮ LIỆU
  // =====================================================
  const getProductFromChain = async (productId) => {
    try {
      if (!contract) return { success: false, error: "Contract not loaded" };
      const product = await contract.methods.getProduct(productId).call();
      
      // Mapping dữ liệu từ Struct trả về
      const formattedProduct = {
        id: parseInt(product.id),
        name: product.name,
        productType: product.productType,
        harvestDate: new Date(parseInt(product.harvestDate) * 1000),
        region: product.region,
        farmName: product.farmName,
        farmer: product.farmer,
        owner: product.owner,
        price: web3.utils.fromWei(product.price, 'ether'),
        isOrganic: product.isOrganic,
        isSold: product.isSold,
        createdAt: new Date(parseInt(product.createdAt) * 1000),
        quantity: parseInt(product.quantity),
        unit: product.unit
      };

      return { success: true, data: formattedProduct };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getProductCount = async () => {
    if (!contract) return { success: false };
    const count = await contract.methods.productCount().call();
    return { success: true, count: parseInt(count) };
  };
  
  const getBalance = async () => {
    if (!web3 || !account) return { success: false };
    const balance = await web3.eth.getBalance(account);
    return { success: true, balance: web3.utils.fromWei(balance, 'ether') };
  };

  const updateProductPriceOnChain = async (productId, newPriceETH) => { 
      if (!contract) return { success: false, error: "No contract" };
      const newPriceWei = web3.utils.toWei(newPriceETH.toString(), 'ether');
      try {
        const tx = await contract.methods.updateProductPrice(productId, newPriceWei).send({ from: account });
        return { success: true, transactionHash: tx.transactionHash };
      } catch (e) { return { success: false, error: e.message }; }
  };

  // Listen to network changes to reload contract
  useEffect(() => {
    if (window.ethereum) {
        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
        window.ethereum.on('accountsChanged', (accounts) => {
            if(accounts.length > 0) setAccount(accounts[0]);
            else disconnectWallet();
        });
    }
  }, []);

  const value = {
    web3, account, isConnected, loading, error, networkId, contract, contractAddress,
    connectWallet, disconnectWallet,
    registerProductOnChain,
    buyProductOnChain,
    getProductFromChain,
    getProductCount,
    updateProductPriceOnChain,
    getBalance
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};