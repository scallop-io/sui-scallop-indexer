import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BorrowDynamic, BorrowDynamicDocument } from './borrow-dynamic.schema';
import { SuiService } from 'src/sui/sui.service';

@Injectable()
export class BorrowDynamicService {
  constructor(
    @InjectModel(BorrowDynamic.name)
    private borrowDynamicModel: Model<BorrowDynamicDocument>,
  ) {}

  async create(borrowDynamic: BorrowDynamic): Promise<BorrowDynamicDocument> {
    const createdBorrowDynamic = new this.borrowDynamicModel(borrowDynamic);
    return createdBorrowDynamic.save();
  }

  async findAll(): Promise<BorrowDynamicDocument[]> {
    return this.borrowDynamicModel.find().exec();
  }

  async findOne(id: string): Promise<BorrowDynamicDocument> {
    return this.borrowDynamicModel.findById(id).exec();
  }

  async update(
    id: string,
    borrowDynamic: BorrowDynamic,
  ): Promise<BorrowDynamicDocument> {
    return this.borrowDynamicModel
      .findByIdAndUpdate(id, borrowDynamic, {
        new: true,
      })
      .exec();
  }

  // findOneByCoinType
  async findOneByCoinType(coinType: string): Promise<BorrowDynamicDocument> {
    return this.borrowDynamicModel.findOne({ coinType: coinType }).exec();
  }

  // findOneAndUpdateBorrowDynamic
  async findOneByCoinTypeAndUpdateBorrowDynamic(
    coinType: string,
    borrowDynamic: BorrowDynamic,
  ): Promise<BorrowDynamicDocument> {
    return this.borrowDynamicModel
      .findOneAndUpdate({ coinType: coinType }, borrowDynamic, {
        upsert: true,
      })
      .exec();
  }

  async updateBorrowDynamics(
    suiService: SuiService,
    market: string,
  ): Promise<Map<string, BorrowDynamic>> {
    const borrowDynamics = await suiService.getBorrowDynamics(market);
    try {
      for (const [coinType, borrowDynamic] of borrowDynamics) {
        await this.findOneByCoinTypeAndUpdateBorrowDynamic(
          coinType,
          borrowDynamic,
        );
        console.log(`[BorrowDynamics]: update <${coinType}>`);
      }
      console.log(`[BorrowDynamics]: update <${borrowDynamics.size}> dynamics`);
    } catch (e) {
      console.error('Error caught while getBorrowDynamics. Error: ', e);
    }
    return borrowDynamics;
  }
}
