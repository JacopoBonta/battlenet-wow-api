# BattleNet World of Warcraft Community API Client

## Install
```bash
npm i --save battlenet-wow-api
```
## Usage
```javascript
const WoWClient = require('battlenet-wow-api')

// Initialize the client with your application's client ID and Secret. See https://develop.battle.net/access/clients
const client = new WoWClient(id, secret)

// Get realm status list
client.realmStatus()
  .then(console.log)
```
