# Nile Instance APIs
The Nile instance is the director for all the local nodes. When a new node enters the network, the node sends its IPNS name to the local Nile instance, this instance will verify and then eventually accepts the node inside the local network inserting a new value in a table (node_id, ipns_name); then the Nile instance will publish the table on IPFS and update its IPNS name to point to the latest version of the table. Clients will then load the frontstore directly gathering this list from IPFS.

## Configuration
1. Install the nodejs dependencies
    ```
    npm install
    ```
2. Migrate data to the database
    ```
    npm run migrate -- up
    ```

## Running
```
npm start
```

## Contribute
Join us on Discord: https://discord.gg/je27JSc

Read the documentation here: https://docs.nile.shopping/
