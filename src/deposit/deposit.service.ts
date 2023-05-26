import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Deposit, DepositDocument } from './deposit.schema';
import { SuiService } from 'src/sui/sui.service';
// import { ObligationService } from 'src/obligation/obligation.service';
// import { ObligationDocument } from 'src/obligation/obligation.schema';
import { EventState } from 'src/eventstate/eventstate.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class DepositService {
  constructor(
    @InjectModel(Deposit.name)
    private depositModel: Model<DepositDocument>,
  ) {}

  async create(
    deposit: Deposit,
    session: mongoose.ClientSession | null = null,
  ): Promise<DepositDocument> {
    const createdDeposit = new this.depositModel(deposit);
    return createdDeposit.save({ session });
  }

  async getDepositsFromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    return await suiService.getEventsFromQuery(
      process.env.EVENT_COLLATERAL_DEPOSIT,
      eventStateMap,
      async (item) => {
        return {
          obligation_id: item.parsedJson.obligation,
          asset: item.parsedJson.deposit_asset.name,
          amount: item.parsedJson.deposit_amount,
          timestampMs: item.timestampMs,
        };
      },
    );
  }
}
