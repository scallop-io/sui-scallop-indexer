import { PaginatedEvents } from '@mysten/sui.js';
import { Inject, Injectable } from '@nestjs/common';
import { NetworkType, SuiKit } from '@scallop-dao/sui-kit';
import { EventState } from 'src/eventstate/eventstate.schema';
import { EventStateService } from 'src/eventstate/eventstate.service';
import { ObligationDocument } from 'src/obligation/obligation.schema';
import { ObligationService } from 'src/obligation/obligation.service';

@Injectable()
export class SuiService {
  private static _suiKit: SuiKit;

  @Inject(EventStateService)
  private readonly _eventStateService: EventStateService;

  public static getSuiKit() {
    if (!this._suiKit) {
      const mnemonics = process.env.MNEMONICS;
      const network = <NetworkType>process.env.NETWORK;
      const fullNodeUrl = process.env.RPC_ENDPOINT ?? undefined;
      this._suiKit = new SuiKit({
        mnemonics,
        networkType: network,
        fullnodeUrl: fullNodeUrl,
      });
    }
    return this._suiKit;
  }

  // get event data
  async getEventData(
    eventType: string,
    limit = Number(process.env.QUERY_LIMIT),
    cursorTxDigest?: string,
    cursorEventSeq?: string,
  ): Promise<any[]> {
    // Find if there is cursor stored in DB
    const eventName = eventType.split('::')[2];
    const eventState = await this._eventStateService.findByEventType(eventType);
    if (eventState !== null) {
      cursorTxDigest = eventState.nextCursorTxDigest;
      cursorEventSeq = eventState.nextCursorEventSeq;
    }

    const eventData = [];
    let hasNextPage = true;
    let latestEvent: PaginatedEvents;
    while (hasNextPage) {
      if (cursorTxDigest === undefined || cursorEventSeq === undefined) {
        latestEvent =
          await SuiService.getSuiKit().rpcProvider.provider.queryEvents({
            query: {
              MoveEventType: eventType,
            },
            limit: limit,
            order: 'ascending',
          });
        console.log(`[${eventName}]: qurey from start.`);
      } else {
        latestEvent =
          await SuiService.getSuiKit().rpcProvider.provider.queryEvents({
            query: {
              MoveEventType: eventType,
            },
            cursor: {
              txDigest: cursorTxDigest,
              eventSeq: cursorEventSeq,
            },
            limit: limit,
            order: 'ascending',
          });
        console.log(`[${eventName}]: qurey from cursor[${cursorTxDigest}].`);
      }

      for (const element of latestEvent.data) {
        eventData.push(element);

        cursorTxDigest = element.id.txDigest;
        cursorEventSeq = element.id.eventSeq;
      }

      hasNextPage = latestEvent.hasNextPage;
      if (hasNextPage === true) {
        cursorTxDigest = latestEvent.nextCursor.txDigest;
        cursorEventSeq = latestEvent.nextCursor.eventSeq;
      }
    } //end of while

    // Save Next Cursor data
    if (eventData.length > 0) {
      const lastEventState: EventState = {
        eventType: eventType,
        nextCursorTxDigest: latestEvent.nextCursor.txDigest,
        nextCursorEventSeq: latestEvent.nextCursor.eventSeq,
      };
      await this._eventStateService.findOneByEventTypeAndUpdateEventState(
        eventType,
        lastEventState,
      );
    }
    return eventData;
  }

  async updateFromEventData(
    obligationService: ObligationService,
    eventType: string,
    obligationMap: Map<string, ObligationDocument>,
    updateCallback: (
      item: any,
      obligation: ObligationDocument,
    ) => Promise<ObligationDocument>,
  ): Promise<any[]> {
    try {
      const eventName = eventType.split('::')[2];
      const eventData = await this.getEventData(eventType);

      for (const item of eventData) {
        const obligation_id = item.parsedJson.obligation;

        let obligation = obligationMap.get(obligation_id);
        if (obligation === undefined || !obligation) {
          obligation = await obligationService.findByObligation(obligation_id);
          if (!obligation) {
            obligation = {
              obligation_id: obligation_id,
            } as ObligationDocument;
          }
        }

        // Prase data
        obligation = await updateCallback(item, obligation);

        obligationMap.set(obligation.obligation_id, obligation);
        console.log(`[${eventName}]: update <${obligation.obligation_id}>`);
      }

      console.log(`[${eventName}]: update <${eventData.length}> events.`);
      return eventData;
    } catch (error) {
      console.error(
        `Error updating event data for ${eventType}: ${error.message}`,
      );
      throw error;
    }
  }

  async updateFromObligationMap(
    fieldName: string,
    obligationMap: Map<string, ObligationDocument>,
    processField: (
      item: any,
      fieldObjs: any,
      obligation: ObligationDocument,
    ) => Promise<ObligationDocument>,
  ): Promise<void> {
    const keys = [...obligationMap.keys()];
    const obligationObjs = await SuiService.getSuiKit().getObjects(keys);

    for (const obligationObj of obligationObjs) {
      const parentId =
        obligationObj.objectFields[fieldName].fields.table.fields.id.id;
      const dynamicFields = await SuiService.getSuiKit()
        .provider()
        .getDynamicFields({ parentId });

      let obligation = obligationMap.get(obligationObj.objectId);
      for (const item of dynamicFields.data) {
        const fieldObjs = await SuiService.getSuiKit()
          .provider()
          .getDynamicFieldObject({
            parentId: parentId,
            name: {
              type: item.name.type,
              value: item.name.value,
            },
          });

        obligation = await processField(item, fieldObjs, obligation);

        obligationMap.set(obligation.obligation_id, obligation);
        console.log(`[${fieldName}]: update <${obligation.obligation_id}>`);
      }
    }
  }
}
