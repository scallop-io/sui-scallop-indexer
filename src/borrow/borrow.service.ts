import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Borrow, BorrowDocument } from './borrow.schema';
import { SuiService } from 'src/sui/sui.service';
import { ObligationService } from 'src/obligation/obligation.service';
import { ObligationDocument } from 'src/obligation/obligation.schema';

@Injectable()
export class BorrowService {
  constructor(
    @InjectModel(Borrow.name)
    private borrowModel: Model<BorrowDocument>,
  ) {}

  async create(borrow: Borrow): Promise<BorrowDocument> {
    const createdBorrow = new this.borrowModel(borrow);
    return createdBorrow.save();
  }

  async findAll(): Promise<BorrowDocument[]> {
    return this.borrowModel.find().exec();
  }

  async findOne(id: string): Promise<BorrowDocument> {
    return this.borrowModel.findById(id).exec();
  }

  async update(id: string, borrow: Borrow): Promise<BorrowDocument> {
    return this.borrowModel
      .findByIdAndUpdate(id, borrow, {
        new: true,
      })
      .exec();
  }

  async findBorrowsByObligationId(id: string): Promise<BorrowDocument[]> {
    return this.borrowModel.find({ obligation_id: id }).exec();
  }

  async updateBorrowsFromEventData(
    suiService: SuiService,
    obligationService: ObligationService,
    obligationMap: Map<string, ObligationDocument>,
  ): Promise<any[]> {
    return await suiService.updateFromEventData(
      obligationService,
      process.env.EVENT_BORROW,
      obligationMap,
      async (item, obligation) => {
        const borrow: Borrow = {
          asset: item.parsedJson.asset.name,
          amount: item.parsedJson.amount,
          timestampMs: item.timestampMs,

          obligation_id: obligation.obligation_id,
          obligation: obligation,
        };

        await this.create(borrow);

        return obligation;
      },
    );
  }
}
