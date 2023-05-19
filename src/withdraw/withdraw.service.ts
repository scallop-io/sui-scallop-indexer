import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Withdraw, WithdrawDocument } from './withdraw.schema';
import { SuiService } from 'src/sui/sui.service';
import { ObligationService } from 'src/obligation/obligation.service';
import { ObligationDocument } from 'src/obligation/obligation.schema';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectModel(Withdraw.name)
    private withdrawModel: Model<WithdrawDocument>,
  ) {}

  async create(withdraw: Withdraw): Promise<WithdrawDocument> {
    const createdWithdraw = new this.withdrawModel(withdraw);
    return createdWithdraw.save();
  }

  async findAll(): Promise<WithdrawDocument[]> {
    return this.withdrawModel.find().exec();
  }

  async findOne(id: string): Promise<WithdrawDocument> {
    return this.withdrawModel.findById(id).exec();
  }

  async update(id: string, withdraw: Withdraw): Promise<WithdrawDocument> {
    return this.withdrawModel
      .findByIdAndUpdate(id, withdraw, {
        new: true,
      })
      .exec();
  }

  async findWithdrawsByObligationId(id: string): Promise<WithdrawDocument[]> {
    return this.withdrawModel.find({ obligation_id: id }).exec();
  }

  async updateWithdrawsFromEventData(
    suiService: SuiService,
    obligationService: ObligationService,
    obligationMap: Map<string, ObligationDocument>,
  ): Promise<any[]> {
    return await suiService.updateFromEventData(
      obligationService,
      process.env.EVENT_COLLATERAL_WITHDRAW,
      obligationMap,
      async (item, obligation) => {
        const withdraw: Withdraw = {
          asset: item.parsedJson.withdraw_asset.name,
          amount: item.parsedJson.withdraw_amount,
          timestampMs: item.timestampMs,

          obligation_id: obligation.obligation_id,
          obligation: obligation,
        };

        await this.create(withdraw);

        return obligation;
      },
    );
  }
}
