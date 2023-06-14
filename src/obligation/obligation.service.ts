import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Obligation, ObligationDocument } from './obligation.schema';
import { SuiService } from 'src/sui/sui.service';
import { EventState } from 'src/eventstate/eventstate.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class ObligationService {
  constructor(
    @InjectModel(Obligation.name)
    private obligationModel: Model<ObligationDocument>,
  ) {}

  // findOneByObligationId
  async findByObligation(
    id: string,
    session: mongoose.ClientSession | null = null,
  ): Promise<ObligationDocument> {
    return this.obligationModel
      .findOne({ obligation_id: id })
      .session(session)
      .exec();
  }

  async findOneAndUpdateObligation(
    id: string,
    obligation: ObligationDocument,
    session: mongoose.ClientSession | null = null,
  ): Promise<ObligationDocument> {
    return this.obligationModel
      .findOneAndUpdate({ obligation_id: id }, obligation, {
        upsert: true,
        new: true,
      })
      .session(session)
      .exec();
  }

  async updateCollateralsInObligationMap(
    suiService: SuiService,
    obligationMap: Map<string, ObligationDocument>,
    session: mongoose.ClientSession | null = null,
  ): Promise<void> {
    try {
      const keys = [...obligationMap.keys()];
      const obligationObjs = await SuiService.getSuiKit().getObjects(keys);
      await suiService.checkRPCLimit();
      for (const obligationObj of obligationObjs) {
        const parentId =
          obligationObj.objectFields['collaterals'].fields.table.fields.id.id;
        const collaterals = await suiService.getCollaterals(parentId);

        if (collaterals.length > 0) {
          const obligation = await this.findByObligation(
            obligationObj.objectId,
            session,
          );
          obligation.collaterals = collaterals;

          const savedObligation = await this.findOneAndUpdateObligation(
            obligation.obligation_id,
            obligation,
            session,
          );
          console.log(
            `[Collaterals]: update <${collaterals.length}> in <${savedObligation.obligation_id}>`,
          );
        }
      }
    } catch (e) {
      console.error(
        `Error caught while updateCollateralsInObligationMap(): ${e}`,
      );
      throw e;
    }
  }

  async updateDebtsInObligationMap(
    suiService: SuiService,
    obligationMap: Map<string, ObligationDocument>,
    session: mongoose.ClientSession | null = null,
  ): Promise<void> {
    try {
      const keys = [...obligationMap.keys()];
      const obligationObjs = await SuiService.getSuiKit().getObjects(keys);
      await suiService.checkRPCLimit();
      for (const obligationObj of obligationObjs) {
        const parentId =
          obligationObj.objectFields['debts'].fields.table.fields.id.id;
        const debts = await suiService.getDebts(parentId);

        if (debts.length > 0) {
          const obligation = await this.findByObligation(
            obligationObj.objectId,
            session,
          );
          obligation.debts = debts;

          const savedObligation = await this.findOneAndUpdateObligation(
            obligation.obligation_id,
            obligation,
            session,
          );
          console.log(
            `[Debts]: update <${debts.length}> in <${savedObligation.obligation_id}>`,
          );
        }
      }
    } catch (e) {
      console.error(`Error caught while updateDebtsInObligationMap(): ${e}`);
      throw e;
    }
  }

  // get created obligations
  async getObligationsFromQueryEvent(
    suiService: SuiService,
    eventStateMap: Map<string, EventState>,
  ): Promise<any[]> {
    return await suiService.getEventsFromQuery(
      process.env.EVENT_OBLIGATION_CREATED,
      eventStateMap,
      async (item) => {
        return {
          obligation_id: item.parsedJson.obligation,
          obligation_key: item.parsedJson.obligation_key,
          sender: item.parsedJson.sender,
          timestampMs: item.timestampMs,
        };
      },
    );
  }
}
