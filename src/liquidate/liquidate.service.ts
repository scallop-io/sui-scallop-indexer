import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Liquidate, LiquidateDocument } from './liquidate.schema';
import { SuiService } from 'src/sui/sui.service';
// import { ObligationService } from 'src/obligation/obligation.service';
// import { ObligationDocument } from 'src/obligation/obligation.schema';
import { EventState } from 'src/eventstate/eventstate.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class LiquidateService {
  constructor(
    @InjectModel(Liquidate.name)
    private liquidateModel: Model<LiquidateDocument>,
  ) {}

  async create(
    liquidate: Liquidate,
    session: mongoose.ClientSession | null = null,
  ): Promise<LiquidateDocument> {
    const createdLiquidate = new this.liquidateModel(liquidate);
    return createdLiquidate.save({ session });
  }

  async getLiquidatesFromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    return await suiService.getEventsFromQuery(
      process.env.EVENT_LIQUIDATE,
      eventStateMap,
      async (item) => {
        return {
          obligation_id: item.parsedJson.obligation,
          debtType: item.parsedJson.debt_type.name,
          collateralType: item.parsedJson.collateral_type.name,
          repayOnBehalf: item.parsedJson.repay_on_behalf,
          repayRevenue: item.parsedJson.repay_revenue,
          liqAmount: item.parsedJson.liq_amount,
          liquidator: item.parsedJson.liquidator,
        };
      },
    );
  }
}
