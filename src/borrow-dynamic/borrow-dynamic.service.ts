import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BorrowDynamic, BorrowDynamicDocument } from './borrow-dynamic.schema';
import { SuiService } from 'src/sui/sui.service';
import * as mongoose from 'mongoose';

@Injectable()
export class BorrowDynamicService {
  constructor(
    @InjectModel(BorrowDynamic.name)
    private borrowDynamicModel: Model<BorrowDynamicDocument>,
  ) {}

  // findOneAndUpdateBorrowDynamic
  async findOneByCoinTypeAndUpdateBorrowDynamic(
    coinType: string,
    borrowDynamic: BorrowDynamic,
    session: mongoose.ClientSession | null = null,
  ): Promise<BorrowDynamicDocument> {
    return this.borrowDynamicModel
      .findOneAndUpdate({ coinType: coinType }, borrowDynamic, {
        upsert: true,
      })
      .session(session)
      .exec();
  }

  async updateBorrowDynamics(
    suiService: SuiService,
    market: string,
    session: mongoose.ClientSession | null = null,
  ): Promise<Map<string, BorrowDynamic>> {
    const borrowDynamics = await suiService.getBorrowDynamics(market);
    try {
      for (const [coinType, borrowDynamic] of borrowDynamics) {
        await this.findOneByCoinTypeAndUpdateBorrowDynamic(
          coinType,
          borrowDynamic,
          session,
        );
        // console.log(`[BorrowDynamics]: update <${coinType}>`);
      }
      console.log(`[BorrowDynamics]: update <${borrowDynamics.size}> dynamics`);
    } catch (e) {
      console.error('Error caught while updateBorrowDynamics(): ', e);
      throw e;
    }
    return borrowDynamics;
  }
}
