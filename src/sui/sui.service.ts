import { PaginatedEvents } from '@mysten/sui.js';
import { Inject, Injectable } from '@nestjs/common';
import { NetworkType, SuiKit } from '@scallop-io/sui-kit';
import axios from 'axios';
import { BorrowDynamic } from 'src/borrow-dynamic/borrow-dynamic.schema';
import { delay } from 'src/common/utils/time';
import { EventState } from 'src/eventstate/eventstate.schema';
import { EventStateService } from 'src/eventstate/eventstate.service';
import { Collateral, Debt } from 'src/obligation/obligation.schema';

@Injectable()
export class SuiService {
  private static _suiKit: SuiKit;
  private static _queryCount = 0;
  public SUI_QUERY_LIMIT = Number(process.env.QUERY_LIMIT) || 50;
  public RPC_QPS_LIMIT = Number(process.env.RPC_QPS) || 100;
  public RPC_DELAY_SECONDS = Number(process.env.RPC_DELAY_SECONDS) || 1;
  public SUI_PAGE_LIMIT = Number(process.env.PAGE_LIMIT) || 1;

  private API_URL = process.env.API_URL || 'https://sui.api.scallop.io/';
  private API_KEY = process.env.API_KEY || 'scalloptestapikey';
  private ADDRESSES_ID = process.env.ADDRESSES_ID || '6462a088a7ace142bb6d7e9b';
  private NETWORK = process.env.NETWORK || 'testnet';

  private MARKET_ID = process.env.MARKET_ID;
  private PROTOCOL_ID = process.env.PROTOCOL_ID;
  private INIT_PROTOCOL_ID =
    '0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf';

  private _addresses = undefined;
  private _protocolId = undefined;
  private _marketId = undefined;

  // event id
  private _obligationCreatedEventId = undefined;
  private _collateralDepositEventId = undefined;
  private _collateralWithdrawEventId = undefined;
  private _borrowEventId = undefined;
  private _borrowEventV2Id = undefined;
  private _repayEventId = undefined;
  private _liquidateEventId = undefined;
  private _flashloanBorrowEventId = undefined;
  private _flashloanRepayEventId = undefined;

  private _mintEventId = undefined;
  private _redeemEventId = undefined;

  private async fetchAddressesFromAPI() {
    let addresses = undefined;
    try {
      const response = await axios.get(
        this.API_URL + 'addresses/' + this.ADDRESSES_ID,
        {
          headers: {
            'api-key': this.API_KEY,
          },
        },
      );
      addresses = response.data;

      console.log('[Addresses]: fetchAddressesFromAPI() success');
    } catch (e) {
      console.error('Error caught while fetchAddressesFromAPI() ', e);
    }
    return addresses;
  }

  private async getAddresses() {
    if (!this._addresses) {
      this._addresses = await this.fetchAddressesFromAPI();
    }
    return this._addresses;
  }

  public async getMarketId() {
    if (!this._marketId) {
      if (this.MARKET_ID) {
        this._marketId = this.MARKET_ID;
      } else {
        const address = await this.getAddresses();
        if (this._addresses) {
          this._marketId = address[this.NETWORK]['core']['market'];
        }
      }
      console.log(`[Market-Id]: ${this._marketId}`);
    }
    return this._marketId;
  }

  private async getProtocolIdFromAPI() {
    if (!this._protocolId) {
      if (this.PROTOCOL_ID) {
        this._protocolId = this.PROTOCOL_ID;
      } else {
        const address = await this.getAddresses();
        if (this._addresses) {
          this._protocolId =
            address[this.NETWORK]['core']['packages']['protocol']['id'];
        }
      }
      console.log(`[Protocol-Id]: ${this._protocolId}`);
    }
    return this._protocolId;
  }

  private async getProtocolId() {
    if (!this._protocolId) {
      if (this.PROTOCOL_ID) {
        this._protocolId = this.PROTOCOL_ID;
      } else {
        // set default protocol id to INIT_PROTOCOL_ID
        this._protocolId = this.INIT_PROTOCOL_ID;
      }
      console.log(`[Protocol-Id]: ${this._protocolId}`);
    }
    return this._protocolId;
  }

  public async getObligationCreatedEventId() {
    if (!this._obligationCreatedEventId) {
      const protocol = await this.getProtocolId();
      this._obligationCreatedEventId = `${protocol}::open_obligation::ObligationCreatedEvent`;
    }
    return this._obligationCreatedEventId;
  }

  public async getCollateralDepositEventId() {
    if (!this._collateralDepositEventId) {
      const protocol = await this.getProtocolId();
      this._collateralDepositEventId = `${protocol}::deposit_collateral::CollateralDepositEvent`;
    }
    return this._collateralDepositEventId;
  }

  public async getCollateralWithdrawEventId() {
    if (!this._collateralWithdrawEventId) {
      const protocol = await this.getProtocolId();
      this._collateralWithdrawEventId = `${protocol}::withdraw_collateral::CollateralWithdrawEvent`;
    }
    return this._collateralWithdrawEventId;
  }

  public async getBorrowEventId() {
    if (!this._borrowEventId) {
      const protocol = await this.getProtocolId();
      this._borrowEventId = `${protocol}::borrow::BorrowEvent`;
    }
    return this._borrowEventId;
  }

  public async getBorrowEventV2Id() {
    if (!this._borrowEventV2Id) {
      // const protocol = await this.getProtocolId();
      // this._borrowEventV2Id = `${protocol}::borrow::BorrowEventV2`;

      // Get BorrowEventV2 from this intermedia protocol id due to contract upgrade twice
      this._borrowEventV2Id =
        '0xc38f849e81cfe46d4e4320f508ea7dda42934a329d5a6571bb4c3cb6ea63f5da::borrow::BorrowEventV2';
    }
    return this._borrowEventV2Id;
  }

  public async getRepayEventId() {
    if (!this._repayEventId) {
      const protocol = await this.getProtocolId();
      this._repayEventId = `${protocol}::repay::RepayEvent`;
    }
    return this._repayEventId;
  }

  public async getLiquidateEventId() {
    if (!this._liquidateEventId) {
      const protocol = await this.getProtocolId();
      this._liquidateEventId = `${protocol}::liquidate::LiquidateEvent`;
    }
    return this._liquidateEventId;
  }

  public async getFlashloanBorrowEventId() {
    if (!this._flashloanBorrowEventId) {
      const protocol = await this.getProtocolId();
      this._flashloanBorrowEventId = `${protocol}::flash_loan::BorrowFlashLoanEvent`;
    }
    return this._flashloanBorrowEventId;
  }

  public async getFlashloanRepayEventId() {
    if (!this._flashloanRepayEventId) {
      const protocol = await this.getProtocolId();
      this._flashloanRepayEventId = `${protocol}::flash_loan::RepayFlashLoanEvent`;
    }
    return this._flashloanRepayEventId;
  }

  public async getMintEventId() {
    if (!this._mintEventId) {
      const protocol = await this.getProtocolId();
      this._mintEventId = `${protocol}::mint::MintEvent`;
    }
    return this._mintEventId;
  }

  public async getRedeemEventId() {
    if (!this._redeemEventId) {
      const protocol = await this.getProtocolId();
      this._redeemEventId = `${protocol}::redeem::RedeemEvent`;
    }
    return this._redeemEventId;
  }

  @Inject(EventStateService)
  private readonly _eventStateService: EventStateService;

  static resetQueryCount() {
    SuiService._queryCount = 0;
  }

  async checkRPCLimit() {
    SuiService._queryCount++;
    if (SuiService._queryCount >= this.RPC_QPS_LIMIT) {
      // Delay 1 sec to avoid query limit
      console.debug(`Delay ${this.RPC_DELAY_SECONDS} sec to avoid query limit`);
      await delay(this.RPC_DELAY_SECONDS * 1000);
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
      console.error('Error caught while getCollaterals():', e);
      throw e;
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
      console.error('Error caught while getDebts():', e);
      throw e;
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
      console.error('Error caught while getBorrowDynamics():', e);
      throw e;
    }
    return borrowDynamics;
  }

  async getEventsFromQueryByPages(
    eventType: string,
    eventStateMap: Map<string, EventState>,
    createCallback: (item: any) => Promise<any>,
    pageLimit = this.SUI_PAGE_LIMIT,
  ): Promise<[any[], boolean]> {
    let hasNextPage = true;
    const eventObjects = [];
    const eventName = eventType.split('::')[2];
    try {
      const startTime = new Date().getTime();
      // Find if there is cursor stored in DB
      const eventState = await this._eventStateService.findByEventType(
        eventType,
      );

      let cursorTxDigest = undefined;
      let cursorEventSeq = undefined;
      if (eventState !== null) {
        cursorTxDigest = eventState.nextCursorTxDigest;
        cursorEventSeq = eventState.nextCursorEventSeq;
      }

      let latestEvent: PaginatedEvents;
      const eventData = [];
      let pageCount = 0;
      while (hasNextPage) {
        if (cursorTxDigest === undefined || cursorEventSeq === undefined) {
          latestEvent =
            await SuiService.getSuiKit().rpcProvider.provider.queryEvents({
              query: {
                MoveEventType: eventType,
              },
              limit: this.SUI_QUERY_LIMIT,
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
              limit: this.SUI_QUERY_LIMIT,
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

        pageCount++;
        if (pageCount >= pageLimit) {
          break;
        }
      } //end of while

      // Prase data
      for (const item of eventData) {
        const newEvent = await createCallback(item);
        eventObjects.push(newEvent);
        // console.log(`[${eventName}]: create <${newEvent.obligation_id}>`);
      }

      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;

      // Check parse data number match
      if (eventObjects.length === eventData.length) {
        console.log(
          `[${eventName}]: create <${eventObjects.length}> events, <${execTime}> sec.`,
        );

        // Save Next Cursor data
        if (eventObjects.length > 0) {
          const lastEventState: EventState = {
            eventType: eventType,
            nextCursorTxDigest: latestEvent.nextCursor.txDigest,
            nextCursorEventSeq: latestEvent.nextCursor.eventSeq,
          };
          eventStateMap.set(eventType, lastEventState);
        }
      } else {
        eventObjects.length = 0;
        hasNextPage = true;
        console.error(
          `[${eventName}]: Parse <${eventObjects.length}> events didn't match, <${execTime}> sec.`,
        );
      }
    } catch (err) {
      await delay(this.RPC_DELAY_SECONDS * 1000);
      console.error(
        `Delay ${this.RPC_DELAY_SECONDS} sec when error caught at getEventsFromQueryByPages() for ${eventName}: ${err}`,
      );
    }
    return [eventObjects, hasNextPage];
  }

  async getEventsFromQuery(
    eventType: string,
    eventStateMap: Map<string, EventState>,
    createCallback: (item: any) => Promise<any>,
    pageLimit = this.SUI_PAGE_LIMIT,
  ): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [eventObjects, hasNextPage] = await this.getEventsFromQueryByPages(
      eventType,
      eventStateMap,
      createCallback,
      pageLimit,
    );
    return eventObjects;
  }

  // async getObligationVersion(obligation_id: string): Promise<string> {
  //   const obj = await SuiService.getSuiKit()
  //     .provider()
  //     .getObject({
  //       id: obligation_id,
  //       options: {
  //         showContent: true,
  //         showBcs: true,
  //         showOwner: true,
  //       },
  //     });
  //   await this.checkRPCLimit();
  //   // console.log(obj.data.owner);
  //   const version = obj.data.owner['Shared']['initial_shared_version'];

  //   return version;
  // }

  // Set multiple obligation version and parent ids
  async setObligationVersionAndParentIds(obligationsMap: Map<string, any>) {
    try {
      const keys = [...obligationsMap.keys()];
      while (keys.length) {
        // Get the first batch(50 keys), and update 'keys' to contain the remaining keys
        const currentBatchOfKeys = keys.splice(
          0,
          Math.min(this.SUI_QUERY_LIMIT, keys.length),
        );

        const obligationObjs = await SuiService.getSuiKit().getObjects(
          currentBatchOfKeys,
        );
        await this.checkRPCLimit();
        for (const obj of obligationObjs) {
          if (obligationsMap.has(obj.objectId)) {
            // set obligation version
            obligationsMap.get(obj.objectId).version =
              obj.objectVersion.toString();
            // set collaterals parent id
            obligationsMap.get(obj.objectId).collaterals_parent_id =
              obj.objectFields['collaterals'].fields.table.fields.id.id;
            // set debts parent id
            obligationsMap.get(obj.objectId).debts_parent_id =
              obj.objectFields['debts'].fields.table.fields.id.id;
          }
        }
      } //end while
    } catch (e) {
      console.error(
        'Error caught while setObligationVersionAndParentIds():',
        e,
      );
      throw e;
    }
  }

  async getSuiName(address: string): Promise<string> {
    let suiName = address;
    try {
      // get default suiNS
      const suiNameObj = await SuiService.getSuiKit()
        .provider()
        .resolveNameServiceNames({
          address: address,
        });

      if (suiNameObj.data.length > 0) {
        suiName = suiNameObj.data[0];
      } else {
        let packageId =
          '0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0';
        if (process.env.NETWORK === 'testnet') {
          packageId =
            '0x701b8ca1c40f11288a1ed2de0a9a2713e972524fbab748a7e6c137225361653f';
        }
        const suinsRegistration = await SuiService.getSuiKit()
          .provider()
          .getOwnedObjects({
            owner: address,
            filter: {
              StructType: packageId + '::suins_registration::SuinsRegistration',
            },
            options: {
              showContent: true,
              showDisplay: true,
            },
          });
        if (suinsRegistration.data.length > 0) {
          // set 1st suiNS as default
          suiName = suinsRegistration.data[0].data.display.data['name'];
        }
      }
    } catch (e) {
      console.error('Error caught while getSuiName():', e);
      // throw e;
    }

    return suiName;
  }

  async getEventsFromEventStateMapByPages(
    eventType: string,
    eventStateMap: Map<string, EventState>,
    createCallback: (item: any) => Promise<any>,
    pageLimit = this.SUI_PAGE_LIMIT,
  ): Promise<[any[], boolean]> {
    let hasNextPage = true;
    const eventObjects = [];
    const eventName = eventType.split('::')[2];
    try {
      const startTime = new Date().getTime();

      // Find if there is cursor stored in eventStateMap
      const eventState = eventStateMap.get(eventType);

      let cursorTxDigest = undefined;
      let cursorEventSeq = undefined;
      if (eventState !== undefined) {
        cursorTxDigest = eventState.nextCursorTxDigest;
        cursorEventSeq = eventState.nextCursorEventSeq;
      }

      let latestEvent: PaginatedEvents;
      const eventData = [];
      let pageCount = 0;
      while (hasNextPage) {
        if (cursorTxDigest === undefined || cursorEventSeq === undefined) {
          latestEvent =
            await SuiService.getSuiKit().rpcProvider.provider.queryEvents({
              query: {
                MoveEventType: eventType,
              },
              limit: this.SUI_QUERY_LIMIT,
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
              limit: this.SUI_QUERY_LIMIT,
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

        pageCount++;
        if (pageCount >= pageLimit) {
          break;
        }
      } //end of while

      // Prase data
      for (const item of eventData) {
        const newEvent = await createCallback(item);
        eventObjects.push(newEvent);
        // console.log(`[${eventName}]: create <${newEvent.obligation_id}>`);
      }

      const endTime = new Date().getTime();
      const execTime = (endTime - startTime) / 1000;

      // Check parse data number match
      if (eventObjects.length === eventData.length) {
        console.log(
          `[${eventName}]: create <${eventObjects.length}> events, <${execTime}> sec.`,
        );

        // Save Next Cursor data
        if (eventObjects.length > 0) {
          const lastEventState: EventState = {
            eventType: eventType,
            nextCursorTxDigest: latestEvent.nextCursor.txDigest,
            nextCursorEventSeq: latestEvent.nextCursor.eventSeq,
          };
          eventStateMap.set(eventType, lastEventState);
        }
      } else {
        eventObjects.length = 0;
        hasNextPage = true;
        console.error(
          `[${eventName}]: Parse <${eventObjects.length}> events didn't match, <${execTime}> sec.`,
        );
      }
    } catch (err) {
      await delay(this.RPC_DELAY_SECONDS * 1000);
      console.error(
        `Delay ${this.RPC_DELAY_SECONDS} sec when error caught at getEventsFromEventStateMapByPages() for ${eventName}: ${err}`,
        err,
      );
    }
    return [eventObjects, hasNextPage];
  }
}
