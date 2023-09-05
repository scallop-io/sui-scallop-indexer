import * as process from 'process';

export interface ConfigInterface {
  database: {
    uri: string;
  };
  network: {
    cluster: string;
    enpoint: string;
    qps: number;
    ds: number;
  };
  scallopApi: {
    url: string;
    key: string;
    addressesId: string;
  };
  leaderboardApi: {
    url: string;
    key: string;
    queryLimit: number;
    loopIntervalSeconds: number;
    enableSuins: boolean;
    writeToApi: boolean;
  };
  program: {
    protocolId: string;
    protocolObjectId: string;
    marketId: string;
  };
  app: {
    loopIntervalSeconds: number;
    obligationPageLimit: number;
  };
  sui: {
    queryLimit: number;
    pageLimit: number;
  };
  features: {
    flashLoan: boolean;
    lending: boolean;
    statistics: boolean;
  };
}

export const config = () => ({
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/Scallop',
  },
  network: {
    cluster: process.env.NETWORK || 'mainnet',
    enpoint: process.env.RPC_ENDPOINT || 'https://fullnode.mainnet.sui.io:443',
    qps: Number(process.env.RPC_QPS_LIMIT) || 100,
    ds: Number(process.env.RPC_DELAY_SECONDS) || 1,
  },
  scallopApi: {
    url: process.env.API_URL || 'https://sui.api.scallop.io/',
    key: process.env.API_KEY || 'scalloptestapikey',
    addressesId: process.env.API_ADDRESSES_ID || '6462a088a7ace142bb6d7e9b',
  },
  leaderboardApi: {
    url:
      process.env.LEADERBOARD_API_URL ||
      'https://api.zealy.io/communities/scallopio/leaderboard?limit=100&page=0',
    key: process.env.LEADERBOARD_API_KEY || 'e0f0d9MU4aYqPvu0JRTSFP0nYhs',
    queryLimit: Number(process.env.LEADERBOARD_QUERY_LIMIT) || 100,
    loopIntervalSeconds:
      Number(process.env.LEADERBOARD_LOOP_INTERVAL_SECONDS) || 600,
    enableSuins:
      process.env.LEADERBOARD_ENABLE_SUINS.toLocaleLowerCase() === 'true' ||
      false,
    writeToApi:
      process.env.LEADERBOARD_WRITE_TO_API.toLocaleLowerCase() === 'true' ||
      false,
  },
  program: {
    protocolId:
      process.env.PROTOCOL_ID ||
      '0xc05a9cdf09d2f2451dea08ca72641e013834baef3d2ea5fcfee60a9d1dc3c7d9',
    protocolObjectId:
      process.env.PROTOCOL_OBJECT_ID ||
      '0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf',
    marketId:
      process.env.MARKET_ID ||
      '0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9',
  },
  app: {
    loopIntervalSeconds: Number(process.env.APP_LOOP_INTERVAL_SECONDS) || 0,
    obligationPageLimit: Number(process.env.APP_OBLIGATION_PAGE_LIMIT) || 10,
  },
  sui: {
    queryLimit: Number(process.env.SUI_QUERY_LIMIT) || 50,
    pageLimit: Number(process.env.SUI_PAGE_LIMIT) || 1,
  },
  features: {
    flashLoan:
      process.env.FEATURES_FLASHLOAN.toLocaleLowerCase() === 'true' || false,
    lending:
      process.env.FEATURES_LENDING.toLocaleLowerCase() === 'true' || false,
    statistics:
      process.env.FEATURES_STATISTICS.toLocaleLowerCase() === 'true' || false,
  },
});
