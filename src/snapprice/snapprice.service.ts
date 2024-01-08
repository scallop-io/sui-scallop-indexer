import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Snapprice, SnappriceDocument } from './snapprice.schema';
import axios from 'axios';

@Injectable()
export class SnappriceService {
  constructor(
    @InjectModel(Snapprice.name)
    private snappriceModel: Model<SnappriceDocument>,
  ) {}

  async create(
    snapprice: Snapprice,
    session: mongoose.ClientSession | null = null,
  ): Promise<Snapprice> {
    const createdSnapprice = new this.snappriceModel(snapprice);
    return createdSnapprice.save({ session });
  }

  async findAll(): Promise<Snapprice[]> {
    return this.snappriceModel.find().exec();
  }

  async findByDate(snapshotDay: string): Promise<Snapprice[]> {
    return this.snappriceModel.find({ snapshotDay: snapshotDay }).exec();
  }

  async findOneBySenderAndUpdate(
    snapshotDay: string,
    coinType: string,
    snapprice: Snapprice,
    session: mongoose.ClientSession | null = null,
  ): Promise<Snapprice> {
    return this.snappriceModel
      .findOneAndUpdate(
        { snapshotDay: snapshotDay, coinType: coinType },
        snapprice,
        {
          upsert: true,
          new: true,
        },
      )
      .session(session)
      .exec();
  }

  // convert to yyyy-mm-dd format
  getFormatDateString(date: Date = new Date()): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // +1 because months are 0-indexed
    const year = date.getFullYear();

    return `${year}-${month}-${day}`;
  }

  // convert to dd-mm-yyyy format
  formatCoinGeckoDate(date: Date = new Date()): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // +1 because months are 0-indexed
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private COIN_DECIMALS = new Map<string, number>([
    [
      //SUI
      '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      9,
    ],
    [
      //USDC
      '5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      6,
    ],
    [
      //USDT
      'c060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      6,
    ],
    [
      //ETH
      'af8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN',
      8,
    ],
    [
      //SOL
      'b7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN',
      8,
    ],
    [
      //BTC
      '027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN',
      8,
    ],
    [
      //APT
      '3a5143bb1196e3bcdfab6203d1683ae29edd26294fc8bfeafe4aaa9d2704df37::coin::COIN',
      8,
    ],
    [
      //CETUS
      '06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS',
      9,
    ],
    // AFSUI
    [
      'f325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI',
      9,
    ],
    // HASUI
    [
      'bde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
      9,
    ],
    // VSUI
    [
      '549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
      9,
    ],
  ]);

  private WORMHOLE_COINS = new Map<string, string>([
    [
      '5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf',
      'USDC',
    ],
    [
      'c060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c',
      'USDT',
    ],
    ['af8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5', 'ETH'],
    ['b7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8', 'SOL'],
    ['027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881', 'BTC'],
    ['3a5143bb1196e3bcdfab6203d1683ae29edd26294fc8bfeafe4aaa9d2704df37', 'APT'],
  ]);

  private COIN_GECKO_IDS = new Map<string, string>([
    ['BTC', 'bitcoin'],
    ['SUI', 'sui'],
    ['ETH', 'ethereum'],
    ['USDC', 'usd-coin'],
    ['USDT', 'tether'],
    ['SOL', 'solana'],
    ['CETUS', 'cetus-protocol'],
    ['APT', 'aptos'],
    ['AFSUI', 'sui'],
    ['HASUI', 'sui'],
    ['VSUI', 'sui'],
    ['CERT', 'sui'],
  ]);

  getCoinSymbol(coinType: string): string {
    let coinSymbol = coinType.split('::')[2].toUpperCase();
    // Deal with WormholeCoin Mapping
    if (coinSymbol === 'COIN') {
      const coinContract = coinType.split('::')[0];
      coinSymbol = this.WORMHOLE_COINS.get(coinContract);
    }

    if (coinSymbol === 'CERT') {
      coinSymbol = 'VSUI';
    }
    return coinSymbol || '';
  }

  async getHistoryCoinPriceFromCoinGecko(
    dateAt: Date = new Date(),
    symbol = 'USDC',
  ): Promise<number> {
    const formatedDate = this.formatCoinGeckoDate(dateAt);
    let coinPrice = 0;
    let coinId = '';
    try {
      coinId = this.COIN_GECKO_IDS.get(symbol);
      if (coinId) {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${formatedDate}`,
        );
        if (response.data.market_data.current_price.usd) {
          coinPrice = Number(response.data.market_data.current_price.usd);
        }
      }
    } catch (error) {
      console.error(
        `Error caught while getHistoryCoinPriceFromCoinGecko(${symbol})[${coinId}]: ${error}`,
      );
    }

    return coinPrice;
  }

  async snapshotCoinPriceBetween(): Promise<void> {
    const snapStartAt = process.env.SNAPSHOT_START_AT
      ? new Date(process.env.SNAPSHOT_START_AT)
      : new Date(this.getFormatDateString());

    const snapEndAt = process.env.SNAPSHOT_END_AT
      ? new Date(process.env.SNAPSHOT_END_AT)
      : new Date(this.getFormatDateString());

    const endNextDate = new Date(snapEndAt);
    endNextDate.setDate(snapEndAt.getDate() + 1);
    const snapEndTSms = endNextDate.getTime();

    console.log(
      `[snapshotCoinPriceBetween]-From<${
        snapStartAt.toISOString().split('T')[0]
      }>, To<${endNextDate.toISOString()}>(${snapEndTSms})`,
    );

    // Get all history coin price map
    try {
      let currentDate = snapStartAt;
      let startTime = new Date().getTime();
      let endTime = new Date().getTime();
      while (currentDate <= snapEndAt) {
        startTime = new Date().getTime();
        console.log(
          `Getting <${currentDate.toISOString().split('T')[0]}> price map ...`,
        );
        const priceMap = new Map<string, number>();
        for (const coinType of this.COIN_DECIMALS.keys()) {
          const coinSymbol = this.getCoinSymbol(coinType);
          let coinPrice = 0;
          // LSD Tokens (*SUI) use SUI price temporarily
          if (coinSymbol.length > 3 && coinSymbol.endsWith('SUI')) {
            coinPrice =
              priceMap.get(
                '0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
              ) || 0;
          } else {
            coinPrice = await this.getHistoryCoinPriceFromCoinGecko(
              currentDate,
              coinSymbol,
            );
            // delay 12.5 sec to avoid rate limit (5 calls per minute)
            await this.delay(12500);
          }

          priceMap.set(coinType, coinPrice);

          const snapprice = {
            snapshotDay: currentDate.toISOString().split('T')[0],
            coinType: coinType,
            coinSymbol: coinSymbol,
            coinPrice: coinPrice,
            coinDecimal: this.COIN_DECIMALS.get(coinType) || 0,
          };
          // console.log(snapprice);
          const savedSnapprice = await this.findOneBySenderAndUpdate(
            snapprice.snapshotDay,
            coinType,
            snapprice,
          );
          console.log(
            `[CoinPrice]: save [${savedSnapprice.snapshotDay}], <${savedSnapprice.coinSymbol}> <${savedSnapprice.coinPrice}>`,
          );
        }

        // console.log(dayPriceMap);
        endTime = new Date().getTime();
        const execTime = (endTime - startTime) / 1000;
        console.log(
          `Getting <${
            currentDate.toISOString().split('T')[0]
          }> price map done, <${execTime}> sec.`,
        );

        // Move to the next day
        const nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + 1);
        currentDate = nextDate;
        if (currentDate > snapEndAt) {
          break;
        }
      } // end of while
    } catch (error) {
      console.error('Error caught while snapshotCoinPriceBetween() ', error);
    }
  }
}
