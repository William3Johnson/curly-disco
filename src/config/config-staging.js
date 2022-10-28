// environmental configurations for the dapp for different environments
export const config = {
  /** 
   * Push Nodes Environment - can be dev, staging or prod - important to keep one on one connection
   */
  pushNodesEnv: 'staging',
  
  /** 
   * API Calls Related
   */
  appEnv: 'staging', // helps in deciding some text, links, etc, DO NOT CHANGE
  
  pushNodeApiVersion: 1,
  apiUrl: 'https://backend-staging.epns.io/apis',
  w2wApiUrl: 'https://backend-staging.epns.io/apis',
  toolingApiUrl: 'https://tooling.epns.io/apis',

  ipfsInfuraAPIKey: process.env.REACT_APP_IPFS_INFURA_API_KEY || '22rfiNb1J645FdehoqbKMpLbF6V',
  ipfsInfuraAPISecret: process.env.REACT_APP_IPFS_INFURA_API_SECRET || 'a757597f020425c3ae532e6be84de552',

  /** 
   * Allowed Networks
   */
  allowedNetworks: [
    // 42, //for kovan
    5, // for goerli
    80001, //for mumbai polygon
  ],

  /** 
   * Core Network Related Data
   */
  coreContractChain: 5, //the chain id of the network which the core contract relies on
  coreRPC: 'https://goerli.infura.io/v3/4ff53a5254144d988a8318210b56f47a',
  mainnetCoreRPC: "https://mainnet.infura.io/v3/4ff53a5254144d988a8318210b56f47a",
  mainnetCoreContractChain: 1,
  aliasRPC: {
    80001: "https://polygon-mumbai.infura.io/v3/150f25623ae64d08ab7ec7dd0c6b6ee9",
  },
  infuraApiUrl: 'https:/infura-ipfs.io/ipfs/',

  /** 
   * Analaytics + Firebase
   */
  googleAnalyticsId: 'UA-165415629-5',
  vapidKey: 'BFRmmAEEXOhk31FIsooph5CxlXKh6N0_NocUWHzvtpoUEvqQTwLXu6XtwkrH7ckyr2CvVz1ll-8q4oo6-ZqFJPY',
  firebaseConfig: {
    apiKey: 'AIzaSyClOk4qP0ttFW-BPnXy7WT920xfdXSbFu8',
    authDomain: 'epns-internal.firebaseapp.com',
    databaseURL: 'https://epns-internal.firebaseio.com',
    projectId: 'epns-internal',
    storageBucket: 'epns-internal.appspot.com',
    messagingSenderId: '755180533582',
    appId: '1:755180533582:web:752ff8db31905506b7d01f',
    measurementId: 'G-ZJH2T7R9S1',
  },

  /** 
   * External links
   */
  links: {
    ios: 'https://discord.com/invite/YVPB99F9W5',
    android: 'https://play.google.com/store/apps/details?gl=US&hl=en&id=io.epns.epnsstaging',
    extension: 'https://chrome.google.com/webstore/detail/epns-staging-protocol-alp/bjiennpmhdcandkpigcploafccldlakj',
    howto: 'https://docs.epns.io',
  },
}

/**
 * Smart Contract Related
 */
export const addresses = {
  ceaErc20: "0xc1C0472c0C80bCcDC7F5D01A376Bd97a734B8815",
  epnscore: "0xd4E3ceC407cD36d9e3767cD189ccCaFBF549202C",
  epnsEthComm: "0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa", // the core contract
  epnsPolyComm: "0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa", // the ploygon comm contract
  dai: "0x75Ab5AB1Eef154C0352Fc31D2428Cef80C7F8B33", //address for dai
  aDai: "0x31f30d9A5627eAfeC4433Ae2886Cf6cc3D25E772",
  staking: "0x8e129EF695F8761922F1AA38588292f8d8817bA5",
  yieldFarmPUSH: "0xb41cd6760d3b1d0d216851f63fda9573b04dd46e",
  yieldFarmLP: "0x604f629A6b5E85805D57f39493BBC2856cE8A540",
  epnsToken: "0x2b9bE9259a4F5Ba6344c1b1c07911539642a2D33",
  epnsLPToken: "0x1f094Bd8c260D0C3fC79157096015990885af4d2",
  rockstar: "0x3f8C2152b79276b78315CAF66cCF951780580A8a",
  batchMintNFT: "0xCf733D547B9f7F87c1B1f63f45c197C007F8eedf",
  NFTRewards: "0xc4708BB6EC3B797344f123126171302e4e3E68E2",
  distributor: "0x5B548D33874DeABaC2F683A6E1864795E09932F0",
  uniswapV2Router02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  WETHAddress: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
  USDTAddress: "0x13512979ade267ab5100878e2e0f485b568328a4",
  rockstarV2:"0xA2b885e7065EA59a3251489715ca80DE5Ff642f8",//mainnet address
  NFTRewardsV2: "0xdc66567a990B7fa10730459537620857c9e03287", //mainnet address
}
