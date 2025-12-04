require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
    ,
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
      // Using provided Ganache private key (development only)
      accounts: ["0x5c5ebce53b814a5644b816032b2a44942d315b081d4e44346200b7bf763f4ec2"]
    }
  }
};