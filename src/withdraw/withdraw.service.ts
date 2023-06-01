import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Withdraw, WithdrawDocument } from './withdraw.schema';
import { SuiService } from 'src/sui/sui.service';
import { EventState } from 'src/eventstate/eventstate.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectModel(Withdraw.name)
    private withdrawModel: Model<WithdrawDocument>,
  ) {}

  async create(
    withdraw: Withdraw,
    session: mongoose.ClientSession | null = null,
  ): Promise<WithdrawDocument> {
    const createdWithdraw = new this.withdrawModel(withdraw);
    return createdWithdraw.save({ session });
  }

  async getWithdrawsFromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    return await suiService.getEventsFromQuery(
      process.env.EVENT_COLLATERAL_WITHDRAW,
      eventStateMap,
      async (item) => {
        return {
          obligation_id: item.parsedJson.obligation,
          asset: item.parsedJson.withdraw_asset.name,
          amount: item.parsedJson.withdraw_amount,
          timestampMs: item.timestampMs,
        };
      },
    );
  }
}
