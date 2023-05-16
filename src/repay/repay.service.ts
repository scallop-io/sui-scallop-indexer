import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repay, RepayDocument } from './repay.schema';
import { SuiService } from 'src/sui/sui.service';
import { ObligationService } from 'src/obligation/obligation.service';
import { ObligationDocument } from 'src/obligation/obligation.schema';

@Injectable()
export class RepayService {
  constructor(
    @InjectModel(Repay.name)
    private repayModel: Model<RepayDocument>,
  ) {}

  async create(repay: Repay): Promise<RepayDocument> {
    const createdRepay = new this.repayModel(repay);
    return createdRepay.save();
  }

  async findAll(): Promise<RepayDocument[]> {
    return this.repayModel.find().exec();
  }

  async findOne(id: string): Promise<RepayDocument> {
    return this.repayModel.findById(id).exec();
  }

  async update(id: string, repay: Repay): Promise<RepayDocument> {
    return this.repayModel
      .findByIdAndUpdate(id, repay, {
        new: true,
      })
      .exec();
  }

  async findRepaysByObligationId(id: string): Promise<RepayDocument[]> {
    return this.repayModel.find({ obligation_id: id }).exec();
  }

  async updateRepaysFromEventData(
    suiService: SuiService,
    obligationService: ObligationService,
    obligationMap: Map<string, ObligationDocument>,
  ): Promise<any[]> {
    return await suiService.updateFromEventData(
      obligationService,
      process.env.EVENT_REPAY,
      obligationMap,
      async (item, obligation) => {
        const repay = {
          asset: item.parsedJson.asset.name,
          amount: item.parsedJson.amount,
          timestampMs: item.timestampMs,

          obligation_id: obligation.obligation_id,
          obligation: obligation,
        } as Repay;

        await this.create(repay);

        return obligation;
      },
    );
  }
}
