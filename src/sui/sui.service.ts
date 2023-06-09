import { PaginatedEvents } from '@mysten/sui.js';
import { Inject, Injectable } from '@nestjs/common';
import { NetworkType, SuiKit } from '@scallop-io/sui-kit';
import { BorrowDynamic } from 'src/borrow-dynamic/borrow-dynamic.schema';
import { delay } from 'src/common/utils/time';
import { EventState } from 'src/eventstate/eventstate.schema';
import { EventStateService } from 'src/eventstate/eventstate.service';
import { Collateral, Debt } from 'src/obligation/obligation.schema';

@Injectable()
export class SuiService {
  private static _suiKit: SuiKit;
  private static _queryCount = 0;

  @Inject(EventStateService)
  private readonly _eventStateService: EventStateService;

  static resetQueryCount() {
    SuiService._queryCount = 0;
  }

  async checkRPCLimit() {
    SuiService._queryCount++;
    if (SuiService._queryCount >= Number(process.env.RPC_QPS)) {
      // Delay 1 sec to avoid query limit
      console.debug('Delay 1 sec to avoid query limit');
      await delay(1000);
      SuiService._queryCount = 0;
    }
  }

  public static getSuiKit() {
    try {
      if (!this._suiKit) {
        const network = <NetworkType>process.env.NETWORK;
        const fullNodeUrl = process.env.RPC_ENDPOINT ?? undefined;
        this._suiKit = new SuiKit({
          networkType: network,
          fullnodeUrl: fullNodeUrl,
        });
      }
    } catch (e) {
      console.error('Error caught while getSuiKit(): ', e);
    }
    return this._suiKit;
  }

  async getCollaterals(parentId: string): Promise<Collateral[]> {
    const collaterals: Collateral[] = [];
    try {
      const dynamicFields = await SuiService.getSuiKit()
        .provider()
        .getDynamicFields({ parentId: parentId });
      await this.checkRPCLimit();
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
        await this.checkRPCLimit();

        let amount = '';
        if ('fields' in fieldObjs.data.content) {
          amount = fieldObjs.data.content.fields.value.fields.amount;
        }

        const collateral = {
          asset: item.name.value.name,
          amount: amount,
        } as Collateral;
        collaterals.push(collateral);
      }
    } catch (e) {
      console.error('Error caught while getCollaterals(): ', e);
    }
    return collaterals;
  }

  async getDebts(parentId: string): Promise<Debt[]> {
    const debts: Debt[] = [];
    try {
      const dynamicFields = await SuiService.getSuiKit()
        .provider()
        .getDynamicFields({ parentId: parentId });
      await this.checkRPCLimit();
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
        await this.checkRPCLimit();

        let amount = '';
        let borrowIdx = '';
        if ('fields' in fieldObjs.data.content) {
          amount = fieldObjs.data.content.fields.value.fields.amount;
          borrowIdx = fieldObjs.data.content.fields.value.fields.borrow_index;
        }
        const debt = {
          asset: item.name.value.name,
          amount: amount,
          borrowIndex: borrowIdx,
        } as Debt;

        debts.push(debt);
      }
    } catch (e) {
      console.error('Error caught while getDebts(): ', e);
    }
    return debts;
  }

  async getBorrowDynamics(market: string): Promise<Map<string, BorrowDynamic>> {
    const borrowDynamics = new Map<string, BorrowDynamic>();
    try {
      const objs = await SuiService.getSuiKit().getObjects([market]);
      await this.checkRPCLimit();
      const marketObj = objs[0];
      for (const content of marketObj.objectFields.borrow_dynamics.fields.keys
        .fields.contents) {
        const dynamicObjects = await SuiService.getSuiKit()
          .provider()
          .getDynamicFieldObject({
            parentId:
              marketObj.objectFields.borrow_dynamics.fields.table.fields.id.id,
            name: {
              type: '0x1::type_name::TypeName',
              value: content.fields.name,
            },
          });
        await this.checkRPCLimit();

        if ('fields' in dynamicObjects.data.content) {
          borrowDynamics.set(content.fields.name, {
            coinType: content.fields.name,
            borrowIndex:
              dynamicObjects.data.content.fields.value.fields.borrow_index,
            interestRateScale:
              dynamicObjects.data.content.fields.value.fields
                .interest_rate_scale,
            interestRate:
              dynamicObjects.data.content.fields.value.fields.interest_rate
                .fields.value,
            lastUpdated:
              dynamicObjects.data.content.fields.value.fields.last_updated,
          });
        }
      }
    } catch (e) {
      console.error('Error caught while getBorrowDynamics(): ', e);
    }
    return borrowDynamics;
  }

  async getEventsFromQuery(
    eventType: string,
    eventStateMap: Map<string, EventState>,
    createCallback: (item: any) => Promise<any>,
    limit = Number(process.env.QUERY_LIMIT),
  ): Promise<any[]> {
    const eventObjects = [];
    try {
      // Find if there is cursor stored in DB
      const eventName = eventType.split('::')[2];
      const eventState = await this._eventStateService.findByEventType(
        eventType,
      );

      let cursorTxDigest = undefined;
      let cursorEventSeq = undefined;
      if (eventState !== null) {
        cursorTxDigest = eventState.nextCursorTxDigest;
        cursorEventSeq = eventState.nextCursorEventSeq;
      }

      let hasNextPage = true;
      let latestEvent: PaginatedEvents;
      const eventData = [];
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
          console.debug(`[${eventName}]: query from <start>.`);
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
          console.debug(
            `[${eventName}]: query from cursor <${cursorTxDigest}>, seq<${cursorEventSeq}>`,
          );
        }
        await this.checkRPCLimit();

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

      // Prase data
      for (const item of eventData) {
        const newEvent = await createCallback(item);
        eventObjects.push(newEvent);
        // console.log(`[${eventName}]: create <${newEvent.obligation_id}>`);
      }
      console.log(`[${eventName}]: create <${eventObjects.length}> events.`);

      // Save Next Cursor data
      if (eventObjects.length > 0) {
        const lastEventState: EventState = {
          eventType: eventType,
          nextCursorTxDigest: latestEvent.nextCursor.txDigest,
          nextCursorEventSeq: latestEvent.nextCursor.eventSeq,
        };
        eventStateMap.set(eventType, lastEventState);
      }
    } catch (e) {
      console.error(
        `Error caught while getEventsFromQuery() for ${eventType}: ${e}`,
      );
    }
    return eventObjects;
  }

  async getObligationVersion(obligation_id: string): Promise<string> {
    const obj = await SuiService.getSuiKit()
      .provider()
      .getObject({
        id: obligation_id,
        options: {
          showContent: true,
          showBcs: true,
          showOwner: true,
        },
      });
    await this.checkRPCLimit();
    // console.log(obj.data.owner);
    const version = obj.data.owner['Shared']['initial_shared_version'];

    return version;
  }
}
