import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Liquidate, LiquidateDocument } from './liquidate.schema';
import { SuiService } from 'src/sui/sui.service';
import { ObligationService } from 'src/obligation/obligation.service';
import { ObligationDocument } from 'src/obligation/obligation.schema';

@Injectable()
export class LiquidateService {
  constructor(
    @InjectModel(Liquidate.name)
    private liquidateModel: Model<LiquidateDocument>,
  ) {}

  async create(liquidate: Liquidate): Promise<LiquidateDocument> {
    const createdLiquidate = new this.liquidateModel(liquidate);
    return createdLiquidate.save();
  }

  async findAll(): Promise<LiquidateDocument[]> {
    return this.liquidateModel.find().exec();
  }

  async findOne(id: string): Promise<LiquidateDocument> {
    return this.liquidateModel.findById(id).exec();
  }

  async update(id: string, liquidate: Liquidate): Promise<LiquidateDocument> {
    return this.liquidateModel
      .findByIdAndUpdate(id, liquidate, {
        new: true,
      })
      .exec();
  }

  async findLiquidatesByObligationId(id: string): Promise<LiquidateDocument[]> {
    return this.liquidateModel.find({ obligation_id: id }).exec();
  }

  async updateLiquidatesFromEventData(
    suiService: SuiService,
    obligationService: ObligationService,
    obligationMap: Map<string, ObligationDocument>,
  ): Promise<any[]> {
    return await suiService.updateFromEventData(
      obligationService,
      process.env.EVENT_LIQUIDATE,
      obligationMap,
      async (item, obligation) => {
        const liquidate = {
          debtType: item.parsedJson.debt_type.name,
          collateralType: item.parsedJson.collateral_type.name,
          repayOnBehalf: item.parsedJson.repay_on_behalf,
          repayRevenue: item.parsedJson.repay_revenue,
          liqAmount: item.parsedJson.liq_amount,
          liquidator: item.parsedJson.liquidator,

          obligation_id: obligation.obligation_id,
          obligation: obligation,
        } as Liquidate;

        await this.create(liquidate);

        return obligation;
      },
    );
  }
}
