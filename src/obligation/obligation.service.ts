import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Obligation, ObligationDocument } from './obligation.schema';
import { SuiService } from 'src/sui/sui.service';

@Injectable()
export class ObligationService {
  constructor(
    @InjectModel(Obligation.name)
    private obligationModel: Model<ObligationDocument>,
  ) {}

  async create(obligation: Obligation): Promise<ObligationDocument> {
    const createdObligation = new this.obligationModel(obligation);
    return createdObligation.save();
  }

  async findAll(): Promise<ObligationDocument[]> {
    return this.obligationModel.find().exec();
  }

  async findOne(id: string): Promise<ObligationDocument> {
    return this.obligationModel.findById(id).exec();
  }

  async update(
    id: string,
    obligation: Obligation,
  ): Promise<ObligationDocument> {
    return this.obligationModel
      .findByIdAndUpdate(id, obligation, {
        new: true,
      })
      .exec();
  }

  // findOneByObligationId
  async findByObligation(id: string): Promise<ObligationDocument> {
    return this.obligationModel.findOne({ obligation_id: id }).exec();
  }

  async findOneAndUpdateObligation(
    id: string,
    obligation: ObligationDocument,
  ): Promise<ObligationDocument> {
    return await this.obligationModel
      .findOneAndUpdate({ obligation_id: id }, obligation, {
        upsert: true,
        new: true,
      })
      .exec();
  }

  // update created obligations
  async updateObligationsFromEventData(
    suiService: SuiService,
    obligationMap: Map<string, ObligationDocument>,
  ): Promise<any[]> {
    return await suiService.updateFromEventData(
      this,
      process.env.EVENT_OBLIGATION_CREATED,
      obligationMap,
      async (item, obligation) => {
        obligation = {
          obligation_id: item.parsedJson.obligation,
          obligation_key: item.parsedJson.obligation_key,
          sender: item.parsedJson.sender,
          timestampMs: item.timestampMs,
        } as ObligationDocument;

        return await this.findOneAndUpdateObligation(
          obligation.obligation_id,
          obligation,
        );
      },
    );
  }

  async updateCollateralsInObligationMap(
    suiService: SuiService,
    obligationMap: Map<string, ObligationDocument>,
  ): Promise<void> {
    try {
      const keys = [...obligationMap.keys()];
      const obligationObjs = await SuiService.getSuiKit().getObjects(keys);
      for (const obligationObj of obligationObjs) {
        const parentId =
          obligationObj.objectFields['collaterals'].fields.table.fields.id.id;
        const collaterals = await suiService.getCollaterals(parentId);

        if (collaterals.length > 0) {
          const obligation = await this.findByObligation(
            obligationObj.objectId,
          );
          obligation.collaterals = collaterals;

          const savedObligation = await this.findOneAndUpdateObligation(
            obligation.obligation_id,
            obligation,
          );
          console.log(
            `[Collaterals]: update <${collaterals.length}> in <${savedObligation.obligation_id}>`,
          );
        }
      }
    } catch (e) {
      console.error(
        `Error caught while updateCollateralsInObligationMap() - Error: ${e}`,
      );
    }
  }

  async updateDebtsInObligationMap(
    suiService: SuiService,
    obligationMap: Map<string, ObligationDocument>,
  ): Promise<void> {
    try {
      const keys = [...obligationMap.keys()];
      const obligationObjs = await SuiService.getSuiKit().getObjects(keys);
      for (const obligationObj of obligationObjs) {
        const parentId =
          obligationObj.objectFields['debts'].fields.table.fields.id.id;
        const debts = await suiService.getDebts(parentId);

        if (debts.length > 0) {
          const obligation = await this.findByObligation(
            obligationObj.objectId,
          );
          obligation.debts = debts;

          const savedObligation = await this.findOneAndUpdateObligation(
            obligation.obligation_id,
            obligation,
          );
          console.log(
            `[Debts]: update <${debts.length}> in <${savedObligation.obligation_id}>`,
          );
        }
      }
    } catch (e) {
      console.error(
        `Error caught while updateDebtsInObligationMap() - Error: ${e}`,
      );
    }
  }
}
