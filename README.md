## Overview
Indexer is an application that is responsible to store necessary objects data from Blockchain. When accessing data directly through the RPC it's way slower than accessing through the database, hence to solve this problem we duplicated the data from Blockchain into the database. The data stored should be limited, depending on the need.
To monitor any change in this data, we should emit an event in the smart contract for every change related to this object.

### Known Bugs
Even though it speeds up the time we need to access the data, there's still a trade-off. Sync the latest data from the blockchain is the challenge. There are a few seconds that data is not synced to the latest data. Hence any application that builds upon this indexer should consider this data inconsistency.

## Quick Starts
1. Create a new file called `.env` with the content based on the `.env.example`.
2. Install the dependencies by running `pnpm install`.
3. Run the application with `pnpm start`.