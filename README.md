# Instance Service
## Node.js implementation
The Instance Service (Node.js ) is composed by two parts:

* **Service** This is for connecting the other entities, queue, publishing list of stores on ipfs, creating federation. The instance-lib-js is used for communication, publishing on ipfs, queue, federation. The service change the state of the network, who is online? who asks for registration, publishing of ipfs. Service communicates with entities


* **Backend** A set of API to manage the instance. The instance-lib-js is used for checking online nodes, using models to manage thing in the database. with the backend you manage registered nodes, clients. Backend communicates with admin app (frontend).

## Configuration
1. Install the nodejs dependencies
    ```
    npm install
    ```
3. Create empty file `./var/instance.db`
2. Migrate instance-lib-js migrations to the database
    ```
    npm run migrate-instance-lib-js
    ```
4. Copy and rename  `./instance.config.example.json` to `./instance.config.json`

## Running
```
npm start
```