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
    const eventId = await suiService.getCollateralWithdrawEventId();
    return await suiService.getEventsFromQuery(
      // process.env.EVENT_COLLATERAL_WITHDRAW,
      eventId,
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

  async findByObligationIdAt(
    obligationId: string,
    snapTimestamp = new Date().getTime(),
  ): Promise<Withdraw[]> {
    return this.withdrawModel
      .find({
        obligation_id: obligationId,
        timestampMs: { $lt: snapTimestamp },
      })
      .sort({ timestampMs: 1 })
      .exec();
  }

  async findByObligationIdBefore(
    obligationId: string,
    snapTimestamp = new Date().getTime(),
  ): Promise<Withdraw[]> {
    return this.withdrawModel
      .find({
        obligation_id: obligationId,
        timestampMs: { $lt: snapTimestamp },
      })
      .sort({ timestampMs: 1 })
      .exec();
  }
}
