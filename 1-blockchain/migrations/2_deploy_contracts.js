const AgriculturalMarketplace = artifacts.require("AgriculturalMarketplace");

module.exports = function (deployer) {
  deployer.deploy(AgriculturalMarketplace);
};