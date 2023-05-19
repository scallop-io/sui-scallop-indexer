import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Deposit, DepositDocument } from './deposit.schema';
import { SuiService } from 'src/sui/sui.service';
import { ObligationService } from 'src/obligation/obligation.service';
import { ObligationDocument } from 'src/obligation/obligation.schema';

@Injectable()
export class DepositService {
  constructor(
    @InjectModel(Deposit.name)
    private depositModel: Model<DepositDocument>,
  ) {}

  async create(deposit: Deposit): Promise<DepositDocument> {
    const createdDeposit = new this.depositModel(deposit);
    return createdDeposit.save();
  }

  async findAll(): Promise<DepositDocument[]> {
    return this.depositModel.find().exec();
  }

  async findOne(id: string): Promise<DepositDocument> {
    return this.depositModel.findById(id).exec();
  }

  async update(id: string, deposit: Deposit): Promise<DepositDocument> {
    return this.depositModel
      .findByIdAndUpdate(id, deposit, {
        new: true,
      })
      .exec();
  }

  async findDepositsByObligationId(id: string): Promise<DepositDocument[]> {
    return this.depositModel.find({ obligation_id: id }).exec();
  }

  async updateDepositsFromEventData(
    suiService: SuiService,
    obligationService: ObligationService,
    obligationMap: Map<string, ObligationDocument>,
  ): Promise<any[]> {
    return await suiService.updateFromEventData(
      obligationService,
      process.env.EVENT_COLLATERAL_DEPOSIT,
      obligationMap,
      async (item, obligation) => {
        const deposit: Deposit = {
          asset: item.parsedJson.deposit_asset.name,
          amount: item.parsedJson.deposit_amount,
          timestampMs: item.timestampMs,

          obligation_id: obligation.obligation_id,
          obligation: obligation,
        };

        await this.create(deposit);

        return obligation;
      },
    );
  }
}
