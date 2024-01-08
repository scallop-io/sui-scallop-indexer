import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Deposit, DepositDocument } from './deposit.schema';
import { SuiService } from 'src/sui/sui.service';
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
    const eventId = await suiService.getCollateralDepositEventId();
    return await suiService.getEventsFromQuery(
      // process.env.EVENT_COLLATERAL_DEPOSIT,
      eventId,
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

  async findByObligationIdAt(
    obligationId: string,
    snapTimestamp = new Date().getTime(),
  ): Promise<Deposit[]> {
    return this.depositModel
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
  ): Promise<Deposit[]> {
    return this.depositModel
      .find({
        obligation_id: obligationId,
        timestampMs: { $lt: snapTimestamp },
      })
      .sort({ timestampMs: 1 })
      .exec();
  }
}
