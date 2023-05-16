import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Debt, DebtDocument } from './debt.schema';
import { SuiService } from 'src/sui/sui.service';
import { ObligationDocument } from 'src/obligation/obligation.schema';

@Injectable()
export class DebtService {
  constructor(
    @InjectModel(Debt.name)
    private debtModel: Model<DebtDocument>,
  ) {}

  async create(debt: Debt): Promise<DebtDocument> {
    const createdDebt = new this.debtModel(debt);
    return createdDebt.save();
  }

  async findAll(): Promise<DebtDocument[]> {
    return this.debtModel.find().exec();
  }

  async findOne(id: string): Promise<DebtDocument> {
    return this.debtModel.findById(id).exec();
  }

  async update(id: string, debt: Debt): Promise<DebtDocument> {
    return this.debtModel
      .findByIdAndUpdate(id, debt, {
        new: true,
      })
      .exec();
  }

  async delete(id: string): Promise<DebtDocument> {
    return this.debtModel.findByIdAndDelete(id).exec();
  }

  async deleteDebtsByObligationId(id: string): Promise<any> {
    return this.debtModel.deleteMany({ obligation_id: id }).exec();
  }

  async findDebtsByObligationId(id: string): Promise<DebtDocument[]> {
    return this.debtModel.find({ obligation_id: id }).exec();
  }

  async updateDebtsFromObligationMap(
    suiService: SuiService,
    obligationMap: Map<string, ObligationDocument>,
  ): Promise<void> {
    return suiService.updateFromObligationMap(
      'debts',
      obligationMap,
      async (item, fieldObjs, obligation) => {
        let amount = '';
        let borrowIdx = '';
        if ('fields' in fieldObjs.data.content) {
          amount = fieldObjs.data.content.fields.value.fields.amount;
          borrowIdx = fieldObjs.data.content.fields.value.fields.borrow_index;
        }
        const debt: Debt = {
          asset: item.name.value.name,
          amount: amount,
          borrowIndex: borrowIdx,

          obligation_id: obligation.obligation_id,
          obligation: obligation,
        };

        await this.create(debt);

        return obligation;
      },
    );
  }
}
