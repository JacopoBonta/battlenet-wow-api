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
    if (!id) {
      throw new MissingParameterException('id', 'number')
    }
    const achievement = await this._fetchAPI(`achievement/${id}`)
    return achievement.status ? undefined : achievement
  }
  /**
   * Returns a list of all achievements that characters can earn as well as the category structure and hierarchy.
   */
  async availableAchievements() {
    const response = await this._fetchAPI(`data/character/achievements`)
    return response.status ? undefined : response.achievements
  }
  /**
   * Retrive item informations in the auction house of the given realm 
   * @param {string} realm The realm slug
   */
  async auction(realm) {
    if (!realm) {
      throw new MissingParameterException('realm', 'string')
    }
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
   * Return a list of all supported bosses
   */
  async bosses() {
    const response = await this._fetchAPI(`boss/`)
    return response.status ? undefined : response.bosses
  }
  /**
   * Provide information about a boss
   * @param {number} id The boss id
   */
  async boss(id) {
    if (!id) {
      throw new MissingParameterException('id', 'number')
    }
    const bossIdReq = await this._fetchAPI(`boss/${id}`)
    return bossIdReq.status ? undefined : bossIdReq
  }
  /**
   * Provide character information. Different fields can be specified.
   * @param {string} realm The character's realm
   * @param {string} charname The character's name
   * @param {Array<string>} fields Specify the type of information(s) to retrive
   */
  async characterProfile(realm, charname, fields = null) {
    if (!realm) throw new MissingParameterException('realm', 'string')
    if (!charname) throw new MissingParameterException('charname', 'string')
    const response = await this._fetchAPI(`character/${realm}/${charname}`, fields)
    return response.status ? undefined : response
  }
  /**
   * Returns a map of achievement data including completion timestamps and criteria information.
   * @param {string} realm Character's realm
   * @param {string} charname Character's name
   */
  async characterAchievements(realm, charname) {
    return await this.characterProfile(realm, charname, ['achievements'])
  }
  /**
   * Returns a map of a character's appearance settings, such as which face texture they've selected and whether or not a helm is visible.
   * @param {string} realm Character's realm
   * @param {string} charname Character's name
   */
  async characterAppearance(realm, charname) {
    return await this.characterProfile(realm, charname, ['appearance'])
  }
  /**
 * The character's activity feed.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterFeed(realm, charname) {
    return await this.characterProfile(realm, charname, ['feed'])
  }
  /**
 * A summary of the guild to which the character belongs. 
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterGuild(realm, charname) {
    return await this.characterProfile(realm, charname, ['guild'])
  }
  /**
 * Returns a list of all combat pets the character has obtained.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterHunterPets(realm, charname) {
    return await this.characterProfile(realm, charname, ['hunterPets'])
  }
  /**
 * Returns a list of items equipped by the character.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterItems(realm, charname) {
    return await this.characterProfile(realm, charname, ['items'])
  }
  /**
 * Returns a list of all mounts the character has obtained.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterMounts(realm, charname) {
    return await this.characterProfile(realm, charname, ['mounts'])
  }
  /**
 * Returns a list of the battle pets the character has obtained.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterPets(realm, charname) {
    return await this.characterProfile(realm, charname, ['pets'])
  }
  /**
 * Data about the character's current battle pet slots.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterPetSlot(realm, charname) {
    return await this.characterProfile(realm, charname, ['petSlots'])
  }
  /**
 * Returns a list of the character's professions. Does not include class professions.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterProfessions(realm, charname) {
    return await this.characterProfile(realm, charname, ['professions'])
  }
  /**
 * Returns a list of raids and bosses indicating raid progression and completeness.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterProgression(realm, charname) {
    return await this.characterProfile(realm, charname, ['progression'])
  }
  /**
 * Returns a map of PvP information, including arena team membership and rated battlegrounds information.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterPvP(realm, charname) {
    return await this.characterProfile(realm, charname, ['pvp'])
  }
  /**
 * Returns a list of quests the character has completed.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterQuests(realm, charname) {
    return await this.characterProfile(realm, charname, ['quests'])
  }
  /**
 * Returns a list of the factions with which the character has an associated reputation.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterReputation(realm, charname) {
    return await this.characterProfile(realm, charname, ['reputation'])
  }
  /**
 * Returns a map of character statistics.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterStatistics(realm, charname) {
    return await this.characterProfile(realm, charname, ['statistics'])
  }
  /**
 * Returns a map of character attributes and stats.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterStats(realm, charname) {
    return await this.characterProfile(realm, charname, ['stats'])
  }
  /**
 * Returns a list of the character's talent structures.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterTalents(realm, charname) {
    return await this.characterProfile(realm, charname, ['talents'])
  }
  /**
 * Returns a list of titles the character has obtained, including the currently selected title.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterTitles(realm, charname) {
    return await this.characterProfile(realm, charname, ['titles'])
  }
  /**
 * Raw character audit data that powers the character audit on the game site.
 * @param {string} realm Character's realm
 * @param {string} charname Character's name
 */
  async characterAudit(realm, charname) {
    return await this.characterProfile(realm, charname, ['audit'])
  }
  /**
   * The guild profile API is the primary way to access guild information.
   * @param {string} realm The guild realm
   * @param {string} guildname The guild name
   */
  async guildProfile(realm, guildname, fields = undefined) {
    if (!realm) throw new MissingParameterException('realm', 'string')
    if (!guildname) throw new MissingParameterException('guildname', 'string')
    const guildProfile = await this._fetchAPI(`guild/${realm}/${guildname}`, fields)
    return guildProfile.status ? undefined : guildProfile
  }
  /**
 * Returns a list of characters that are members of the guild.
 * @param {string} realm The guild realm
 * @param {string} guildname The guild name
 */
  async guildMembers(realm, guildname) {
    return await this.guildProfile(`guild/${realm}/${guildname}`, ['members'])
  }
  /**
 * A set of data structures that describe the achievements earned by the guild.
 * @param {string} realm The guild realm
 * @param {string} guildname The guild name
 */
  async guildAchievements(realm, guildname) {
    return await this.guildProfile(`guild/${realm}/${guildname}`, ['achievements'])
  }
  /**
 * A set of data structures that describe the guild's news feed.
 * @param {string} realm The guild realm
 * @param {string} guildname The guild name
 */
  async guildNews(realm, guildname) {
    return await this.guildProfile(`guild/${realm}/${guildname}`, ['news'])
  }
  /**
 * The top three challenge mode guild run times for each challenge mode map.
 * @param {string} realm The guild realm
 * @param {string} guildname The guild name
 */
  async guildChallenge(realm, guildname) {
    return await this.guildProfile(`guild/${realm}/${guildname}`, ['challenge'])
  }
  /**
   * The item API provides detailed item information, including item set information.
   * @param {number} id Item Id
   */
  async item(id) {
    if (!id) throw new MissingParameterException('id', 'number')
    const item = await this._fetchAPI(`item/${id}`)
    return item.status ? undefined : item
  }
  /**
   * The item API provides detailed item information, including item set information.
   * @param {number} id Set Id
   */
  async itemSet(id) {
    if (!id) throw new MissingParameterException('id', 'number')
    const item = await this._fetchAPI(`item/set/${id}`)
    return item.status ? undefined : item
  }
  /**
   * Returns a list of all supported mounts.
   */
  async mounts() {
    const mounts = await this._fetchAPI(`mount/`)
    return mounts.status ? undefined : mounts
  }
  /**
   * Returns a list of all supported battle and vanity pets.
   */
  async pets() {
    const pets = await this._fetchAPI('pet/')
    return pets.status ? undefined : pets
  }
  /**
   * Returns data about a individual battle pet ability ID.
   * @param {number} abilityId The ID of the ability to retrieve.
   */
  async petAbility(abilityId) {
    if (!abilityId) throw new MissingParameterException('abilityId', 'number')
    const ability = await this._fetchAPI(`pet/ability/${abilityId}`)
    return ability.status ? undefined : ability
  }
  /**
   * Returns data about an individual pet species. 
   * @param {number} speciesId The species for which to retrieve data.
   */
  async petSpecies(speciesId) {
    if (!speciesId) throw new MissingParameterException('speciesId', 'number')
    const species = await this._fetchAPI(`pet/species/${speciesId}`)
    return species.status ? undefined : species
  }
  /**
   * Returns detailed information about a given species of pet.
   * @param {number} speciesId The pet's species ID. This can be found by querying a user's list of pets via characterPets().
   */
  async petStats(speciesId) {
    if (!speciesId) throw new MissingParameterException('speciesId', 'number')
    const stats = await this._fetchAPI(`pet/stats/${speciesId}`)
    return stats.status ? undefined : stats
  }
  /**
   * The Leaderboard API endpoint provides leaderboard information for the 2v2, 3v3, 5v5, and Rated Battleground leaderboards.
   * @param {string} bracket The type of leaderboard to retrive. Accepter values are 2v2, 3v3, 5v5, rbg.
   */
  async pvpLeaderboards(bracket) {
    if(!bracket) throw new MissingParameterException('bracket', 'string')
    if (bracket != "2v2" || bracket != "3v3" || bracket != "5v5" || bracket != "rbg") {
      throw new Error("Invalid bracket entry. Accepted entries are 2v2, 3v3, 5v5 and rbg.")
    }
    const leaderboard = await this._fetchAPI(`leaderboard/${bracket}`)
    return leaderboard.status ? undefined : leaderboard
  }
  /**
   * Returns metadata for a specified quest.
   * @param {number} id The ID of the quest to retrive.
   */
  async quest(id) {
    if(!id) throw new MissingParameterException('id', 'number')
    const quest = await this._fetchAPI(`quest/${id}`)
    return quest.status ? undefined : quest
  }
  /**
 * Return a list of realm objects with detailed information about the status
 */
  async realmStatus(locale) {
    const realmStatus = await this._fetchAPI(`realm/status`)
    if (realmStatus.status) return undefined
    const { realms } = realmStatus
    if (!locale) return realms
    const localeRealms = new Array()
    realms.forEach(realm => {
      if (realm.locale == locale) {
        localeRealms.push(realm)
      }
    })
    return localeRealms
  }
  /**
   * Return a map object with realm names and their slugs
   */
  async realms(locale) {
    const realmStatus = await this.realmStatus(locale)
    if (!realmStatus) return undefined
    const realmMap = new Map()
    realmStatus.forEach(realm => realmMap.set(realm.name, realm.slug))
    return realmMap
  }
  /**
   * Returns basic recipe information.
   * @param {number} id Unique ID for the desired recipe.
   */
  async recipe(id) {
    if(!id) throw new MissingParameterException('id', 'number')
    const recipe = await this._fetchAPI(`recipe/${id}`)
    return recipe.status ? undefined : recipe
  }
  /**
   * Returns information about spells.
   * @param {number} id The ID of the spell to retrive.
   */
  async spell(id) {
    if(!id) throw new MissingParameterException('id', 'number')
    const spell = await this._fetchAPI(`spell/${id}`)
    return spell.status ? undefined : spell
  }
  /**
   * Returns a list of all supported zones and their bosses. 
   */
  async zones() {
    const zones = await this._fetchAPI(`zones/`)
    return zones.status ? undefined : zones
  }
  /**
   * Returns information about zones.
   * @param {number} id The ID of the zone to retrive.
   */
  async zone(id) {
    if(!id) throw new MissingParameterException('id', 'number')
    const zone = await this._fetchAPI(`zones/${id}`)
    return zone.status ? undefined : zone
  }
  /** 
   * Returns a list of battlegroups for the specified region.
   */
  async battlegroups() {
    const battlegroups = await this._fetchAPI('data/battlegroups/')
    return battlegroups.status ? undefined : battlegroups
  }
  /**
   * Returns a list of races and their associated faction, name, uniqueID, and skin.
   */
  async races() {
    const racesObj = await this._fetchAPI('data/character/races')
    return racesObj.status ? undefined : racesObj.races
  }
  /**
   * Returns information about a race specified by its ID.
   * @param {number} id The ID of the race to retrive.
   */
  async race(id) {
    if(!id) throw new MissingParameterException('id', 'number')
    const races = await this.races()
    return races.find(race => race.id == id)
  }
  /**
   * Returns a list of character classes.
   */
  async classes() {
    const classesObj = await this._fetchAPI('data/character/classes')
    return classesObj.status ? undefined : classesObj.classes
  }
  /**
   * Returns information about a specific character class.
   * @param {number} id The ID of the character class to retrive
   */
  async class(id) {
    if(!id) throw new MissingParameterException('id', 'number')
    const classes = await this.classes()
    return classes.find(cla$$ => cla$$.id == id)
  }
  /**
   * The guild rewards data API provides a list of all guild rewards.
   */
  async guildRewards() {
    const rewards = await this._fetchAPI('data/guild/rewards')
    return rewards.status ? undefined : rewards
  }
  /**
   * The guild rewards data API provides a list of all guild rewards.
   */
  async guildPerks() {
    const perksObj = await this._fetchAPI('data/guild/perks')
    return perksObj.status ? undefined : perksObj.perks
  }
  /**
   * Returns a list of all guild achievements as well as the category structure and hierarchy.
   */
  async guildAchievements() {
    const achievementObj = await this._fetchAPI('data/guild/achievements')
    return achievementObj.status ? undefined : this.achievementObj.achievements
  }
  /**
   * Returns a list of item classes.
   */
  async itemClasses() {
    const itemClassesObj = await this._fetchAPI('data/item/classes')
    return itemClassesObj.status ? undefined : itemClassesObj.classes
  }
  /**
   * Returns a list of talents, specs, and glyphs for each class.
   * @param {number} classID The ID of the class for retriving specific talents.
   */
  async talents(classID) {
    const talents = await this._fetchAPI('data/talents')
    if (talents.status) return null
    else if (classID) {
      return talents[classID]
    } else {
      return talents
    }
  }
  /**
   * Returns a list of the different battle pet types, including what they are strong and weak against.
   */
  async petTypes() {
    const petTypesObj = await this._fetchAPI('data/pet/types')
    return petTypesObj.status ? undefined : petTypesObj.petTypes
  }
}
class MissingParameterException extends Error {
  constructor(paramname, paramtype = undefined) {
    super()
    this.name = "MissingParameterException"
    this.message = `Missing parameter ${paramname}${paramtype ? ` of type ${paramtype}.`: '.'}`
  }
}
module.exports = WoWClient