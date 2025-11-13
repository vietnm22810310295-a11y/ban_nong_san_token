module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,            // Port mặc định của Ganache
      network_id: "*",       // Match any network id
      gas: 6721975,
      gasPrice: 20000000000
    }
  },
  compilers: {
    solc: {
      version: "0.8.19",      // Phiên bản phù hợp với contract
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        viaIR: true           // [QUAN TRỌNG] Dòng này giúp sửa lỗi Stack too deep
      }
    }
  },
  db: {
    enabled: false
  }
};