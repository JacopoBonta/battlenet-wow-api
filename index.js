/**
 * BattleNet Community API World of Warcraft Client library.
 * Its porpuse is to facilitate the connection to the BattleNet API for WoW to an application client e.g.
 * One application that connects throught the OAuth client credentials flow.
 */
const fetch = require('node-fetch')
const FormData = require('form-data')
/**
 * Given the Battle.Net application Id and Secret this function generate
 * a new token that can be used to connect to the Battle.Net api.
 * @param {string} clientId Battle.Net application ID
 * @param {string} clientSecret Battle.Net application Secret
 * @param {string} region Battle.Net region of authentication server. Default is 'us'
 */
const generateToken = async (clientId, clientSecret, region) => {
  const requestURL = `https://${clientId}:${clientSecret}@${region.toLowerCase()}.battle.net/oauth/token`
  const formData = new FormData()
  formData.append('grant_type', 'client_credentials')
  const res = await fetch(requestURL, { method: 'POST', body: formData })
  return await res.json()
}
/**
 * WowClient facilitate the connection to the blizzard API
 * and expose methods to query information of the World of Warcraft API.
 * You must provide your application's Id and Secret obteined from the Blizzar Developer Portal.
 */
class WoWClient {
  constructor(clientId, clientSecret, { region = "us", locale = "en_US" }) {
    this._btnet_client_id = clientId
    this._btnet_client_secret = clientSecret
    this._btnet_region = region.toLowerCase()
    this._btnet_locale = locale
    this._btnet_token = null
  }
  /**
   * Submit a request for a given resource of the API.
   * Before send the request check if a valid token exist,
   * otherwise a new one is generated automatically.
   * @param {string} path A WoW api path starting after /wow/
   * @param {Array<string>} fields A list of fields to include in the request param list
   */
  async _fetchAPI(path, fields) {
    // if no token exists or if it has expired generate one
    if (!this._btnet_token || this._token_time_elapsed >= this._btnet_token.expires_in) {
      // get the time the new token is beign generated
      this._token_time0 = new Date().getTime() / 1000
      this._btnet_token = await generateToken(this._btnet_client_id, this._btnet_client_secret, this._btnet_region)
    }
    // at each request calculate the time elapsed since the token was created
    this._token_time_elapsed = Math.abs(Math.ceil(this._token_time0 - (new Date().getTime() / 1000)))
    const { access_token } = this._btnet_token
    const res = await fetch(`https://${this._btnet_region}.api.blizzard.com/wow/${path}?${fields ? `fields=${fields.join(',')}&` : ''}locale=${this._btnet_locale}&access_token=${access_token}`)
    return await res.json()
  }
  /**
   * Get information about a particular achievement
   * @param {number} id The achievement id
   */
  async achievement(id) {
    const achievement = await this._fetchAPI(`achievement/${id}`)
    return achievement.status ? null : achievement
  }
  /**
   * Retrive item informations in the auction house of the given realm 
   * @param {string} realm The realm slug
   */
  async auction(realm) {
    const auctionRequest = await this._fetchAPI(`auction/data/${realm}`)
    if (auctionRequest.status) {
      return null
    }
    const { url } = auctionRequest.files[0]
    const res = await fetch(url)
    const { auctions } = await res.json()
    return auctions
  }
  /**
   * Return a list of realm objects with detailed information about the status
   */
  async realmStatus() {
    const realmStatus = await this._fetchAPI(`realm/status`)
    return realmStatus.status ? null : realmStatus.realms
  }
  /**
   * Return a map object with realm names and their slugs
   */
  async realms() {
    const realmStatus = await this.realmStatus()
    const realmMap = new Map()
    realmStatus.forEach(realm => realmMap.set(realm.name, realm.slug))
    return realmMap
  }
  /**
   * Return a list of all supported bosses
   */
  async bossList() {
    const bossListReq = await this._fetchAPI(`boss`)
    return bossListReq.status ? null : bossListReq
  }
  /**
   * Provide information about a boss
   * @param {number} id The boss id
   */
  async bossId(id) {
    const bossIdReq = await this._fetchAPI(`boss/${id}`)
    return bossIdReq.status ? null : bossIdReq
  }
  /**
   * Provide character information. Different fields can be specified.
   * @param {string} realm The character's realm
   * @param {string} charname The character's name
   * @param {Array<string>} fields Specify the type of information(s) to retrive
   */
  async character(realm, charname, fields = null) {
    const characterReq = await this._fetchAPI(`character/${realm}/${charname}`, fields)
    return characterReq.status ? null : characterReq
  }
  /**
   * Returns a map of achievement data including completion timestamps and criteria information.
   * @param {string} realm Character's realm
   * @param {string} charname Character's name
   */
  async characterAchievements(realm, charname) {
    const characterAchievementReq = await this.character(realm, charname, ['achievements'])
    return characterAchievementReq.status ? null : characterAchievementReq
  }
  /**
   * Returns a map of a character's appearance settings, such as which face texture they've selected and whether or not a helm is visible.
   * @param {string} realm Character's realm
   * @param {string} charname Character's name
   */
  async characterAppearance(realm, charname) {
    const characterAppearanceReq = await this.character(realm, charname, ['appearance'])
    return characterAppearanceReq.status ? null : characterAppearanceReq
  }
  /**
 * The character's activity feed.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterFeed(realm, charname) {
    const characterFeedReq = await this.character(realm, charname, ['feed'])
    return characterFeedReq.status ? null : characterFeedReq
  }
  /**
 * A summary of the guild to which the character belongs. 
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterGuild(realm, charname) {
    const characterGuildReq = await this.character(realm, charname, ['guild'])
    return characterGuildReq.status ? null : characterGuildReq
  }
  /**
 * Returns a list of all combat pets the character has obtained.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterHunterPets(realm, charname) {
    const characterHunterPetsReq = await this.character(realm, charname, ['hunterPets'])
    return characterHunterPetsReq.status ? null : characterHunterPetsReq
  }
  /**
 * Returns a list of items equipped by the character.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterItems(realm, charname) {
    const characterItemsReq = await this.character(realm, charname, ['items'])
    return characterItemsReq.status ? null : characterItemsReq
  }
  /**
 * Returns a list of all mounts the character has obtained.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterMounts(realm, charname) {
    const characterMountsReq = await this.character(realm, charname, ['mounts'])
    return characterMountsReq.status ? null : characterMountsReq
  }
  /**
 * Returns a list of the battle pets the character has obtained.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterPets(realm, charname) {
    const characterPetsReq = await this.character(realm, charname, ['pets'])
    return characterPetsReq.status ? null : characterPetsReq
  }
  /**
 * Data about the character's current battle pet slots.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterPetSlot(realm, charname) {
    const characterPetSlotsReq = await this.character(realm, charname, ['petSlots'])
    return characterPetSlotsReq.status ? null : characterPetSlotsReq
  }
  /**
 * Returns a list of the character's professions. Does not include class professions.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterProfessions(realm, charname) {
    const characterProfessionsReq = await this.character(realm, charname, ['professions'])
    return characterProfessionsReq.status ? null : characterProfessionsReq
  }
  /**
 * Returns a list of raids and bosses indicating raid progression and completeness.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterProgression(realm, charname) {
    const characterProgressionReq = await this.character(realm, charname, ['progression'])
    return characterProgressionReq.status ? null : characterItemsReq
  }
  /**
 * Returns a map of PvP information, including arena team membership and rated battlegrounds information.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterPvP(realm, charname) {
    const characterPvPReq = await this.character(realm, charname, ['pvp'])
    return characterPvPReq.status ? null : characterPvPReq
  }
  /**
 * Returns a list of quests the character has completed.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterQuests(realm, charname) {
    const characterQuestsReq = await this.character(realm, charname, ['quests'])
    return characterQuestsReq.status ? null : characterQuestsReq
  }
  /**
 * Returns a list of the factions with which the character has an associated reputation.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterReputation(realm, charname) {
    const characterReputationReq = await this.character(realm, charname, ['reputation'])
    return characterReputationReq.status ? null : characterReputationReq
  }
  /**
 * Returns a map of character statistics.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterStatistics(realm, charname) {
    const characterStatisticsReq = await this.character(realm, charname, ['statistics'])
    return characterStatisticsReq.status ? null : characterStatisticsReq
  }
  /**
 * Returns a map of character attributes and stats.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterStats(realm, charname) {
    const characterStatsReq = await this.character(realm, charname, ['stats'])
    return characterStatsReq.status ? null : characterStatsReq
  }
  /**
 * Returns a list of the character's talent structures.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterTalents(realm, charname) {
    const characterTalentsReq = await this.character(realm, charname, ['talents'])
    return characterTalentsReq.status ? null : characterTalentsReq
  }
  /**
 * Returns a list of titles the character has obtained, including the currently selected title.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterTitles(realm, charname) {
    const characterTitlesReq = await this.character(realm, charname, ['titles'])
    return characterTitlesReq.status ? null : characterTitlesReq
  }
  /**
 * Raw character audit data that powers the character audit on the game site.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterAudit(realm, charname) {
    const characterAuditReq = await this.character(realm, charname, ['audit'])
    return characterAuditReq.status ? null : characterAuditReq
  }
}
// module.exports = WoWClient
// TEST AREA
// const wowClient = new WoWClient('ce921fd30443481f97b811cea2819bd8', 'bG2XpkKluDexic6X5RlZUFekEHlIsv84', { region: "eu", locale: "it_IT" })
// async function main() {
//   const audit = await wowClient.characterAudit('pozzo-delleternita', 'Paladrugs')
//   console.log(audit)
//   const mounts = await wowClient.characterMounts('pozzo-delleternita', 'Paladrugs')
//   console.log(mounts)
// }
// main()
//   .catch(error => {
//     console.error(error.message)
//   })