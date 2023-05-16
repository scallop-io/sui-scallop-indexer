import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Collateral, CollateralDocument } from './collateral.schema';
import { SuiService } from 'src/sui/sui.service';
import { ObligationDocument } from 'src/obligation/obligation.schema';

@Injectable()
export class CollateralService {
  constructor(
    @InjectModel(Collateral.name)
    private collateralModel: Model<CollateralDocument>,
  ) {}

  async create(collateral: Collateral): Promise<CollateralDocument> {
    const createdCollateral = new this.collateralModel(collateral);
    return createdCollateral.save();
  }

  async findAll(): Promise<CollateralDocument[]> {
    return this.collateralModel.find().exec();
  }

  async findOne(id: string): Promise<CollateralDocument> {
    return this.collateralModel.findById(id).exec();
  }

  async update(
    id: string,
    collateral: Collateral,
  ): Promise<CollateralDocument> {
    return this.collateralModel
      .findByIdAndUpdate(id, collateral, {
        new: true,
      })
      .exec();
  }

  async delete(id: string): Promise<CollateralDocument> {
    return this.collateralModel.findByIdAndDelete(id).exec();
  }

  async deleteCollateralsByObligationId(id: string): Promise<any> {
    return this.collateralModel.deleteMany({ obligation_id: id }).exec();
  }

  async findCollateralsByObligationId(
    id: string,
  ): Promise<CollateralDocument[]> {
    return this.collateralModel.find({ obligation_id: id }).exec();
  }

  async updateCollateralsFromObligationMap(
    suiService: SuiService,
    obligationMap: Map<string, ObligationDocument>,
  ): Promise<void> {
    return suiService.updateFromObligationMap(
      'collaterals',
      obligationMap,
      async (item, fieldObjs, obligation) => {
        let amount = '';
        if ('fields' in fieldObjs.data.content) {
          amount = fieldObjs.data.content.fields.value.fields.amount;
        }
        const collateral: Collateral = {
          asset: item.name.value.name,
          amount: amount,

          obligation_id: obligation.obligation_id,
          obligation: obligation,
        };

        await this.create(collateral);

        return obligation;
      },
    );
  }
}
