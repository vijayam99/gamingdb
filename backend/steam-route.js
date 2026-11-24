// Author: James Finn
// **************************************************
// Purpose: Used for getting json data from Steam API doesn't create own express server, will be used in index.js
// **************************************************
// Inputs: SteamID64 and a game's AppID
// **************************************************
// Returns:
// ***Profile must be public***
// json object with steamId:username ,profileUrl, appID(game), playtimeHours, achievements%, review(if there is one)

const express = require('express')
const router = express.Router()
const STEAM_API_KEY = process.env.STEAM_API_KEY

const STEAM_API =
  'https://api.steampowered.com'

// **************************************************
// Steam API helper
// **************************************************

async function steamRequest(endpoint, params = {}) {
  const url = new URL(`${STEAM_API}/${endpoint}`)

  url.searchParams.set('key', STEAM_API_KEY)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Steam API returned ${response.status}`)
  }

  return response.json()
}

// **************************************************
// Find a user's review for a specific game
// **************************************************

async function findUserReview(appId, steamId) {
  let cursor = '*'

  // Limit the number of pages searched.
  const maxPages = 10

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(
      `https://store.steampowered.com/appreviews/${appId}`
    )

    url.searchParams.set('json', '1')
    url.searchParams.set('filter', 'recent')
    url.searchParams.set('language', 'all')
    url.searchParams.set('review_type', 'all')
    url.searchParams.set('purchase_type', 'all')
    url.searchParams.set('num_per_page', '100')
    url.searchParams.set('cursor', cursor)

    const response = await fetch(url)

    if (!response.ok) {
      console.warn(
        'Steam review request failed:',
        response.status
      )

      return null
    }

    const data = await response.json()

    const reviews = data.reviews || []

    const userReview = reviews.find(
      review => review.author?.steamid === steamId
    )

    if (userReview) {
      return {
        text: userReview.review,

        rating: userReview.voted_up
          ? 'Positive'
          : 'Negative',

        recommended: userReview.voted_up,

        playtimeAtReview:
          userReview.author.playtime_at_review,

        createdAt:
          userReview.timestamp_created,

        updatedAt:
          userReview.timestamp_updated
      }
    }

    if (!data.cursor || data.cursor === cursor) {
      break
    }

    cursor = data.cursor
  }

  return null
}

// **************************************************
// GET game information from a Steam library
// **************************************************

router.get('/game/:steamId/:appId', async (req, res) => {
  try {
    const { steamId, appId } = req.params

    // Validate SteamID64
    if (!/^\d{17}$/.test(steamId)) {
      return res.status(400).json({
        error: 'Invalid SteamID64.'
      })
    }

    // Validate AppID
    if (!/^\d+$/.test(appId)) {
      return res.status(400).json({
        error: 'Invalid Steam AppID.'
      })
    }

    if (!STEAM_API_KEY) {
      return res.status(500).json({
        error: 'Steam API key is not configured.'
      })
    }

    // **************************************************
    // 1. Get Steam profile
    // **************************************************

    const profileData = await steamRequest(
      'ISteamUser/GetPlayerSummaries/v2/',
      {
        steamids: steamId
      }
    )

    const player =
      profileData.response?.players?.[0]

    if (!player) {
      return res.status(404).json({
        error: 'Steam profile not found.'
      })
    }

    // Steam visibility state 3 means public.
    if (player.communityvisibilitystate !== 3) {
      return res.status(403).json({
        error: 'Steam profile is private.',
        publicProfileRequired: true
      })
    }

    // **************************************************
    // 2. Get owned games and playtime
    // **************************************************

    const ownedGamesData = await steamRequest(
      'IPlayerService/GetOwnedGames/v1/',
      {
        steamid: steamId,
        include_appinfo: '1',
        include_played_free_games: '1'
      }
    )

    const ownedGames =
      ownedGamesData.response?.games

    if (!Array.isArray(ownedGames)) {
      return res.status(403).json({
        error: 'Steam game details are private or unavailable.',
        gameLibraryPublicRequired: true
      })
    }

    const game = ownedGames.find(
      ownedGame => ownedGame.appid === Number(appId)
    )

    if (!game) {
      return res.status(404).json({
        error: 'Game not found in the visible Steam library.'
      })
    }

    const playtimeMinutes =
      game.playtime_forever || 0

    // **************************************************
    // 3. Get achievement statistics
    // **************************************************

    let achievements = null

    try {
      const achievementData = await steamRequest(
        'ISteamUserStats/GetPlayerAchievements/v1/',
        {
          steamid: steamId,
          appid: appId,
          l: 'english'
        }
      )

      const achievementList =
        achievementData.playerstats?.achievements

      if (Array.isArray(achievementList)) {
        const total = achievementList.length

        const unlocked = achievementList.filter(
          achievement => achievement.achieved === 1
        ).length

        achievements = {
          unlocked,
          total,

          percentage: total > 0
            ? Number(
                ((unlocked / total) * 100).toFixed(2)
              )
            : null
        }
      }
    } catch (error) {
      console.warn(
        'Achievement data unavailable:',
        error.message
      )
    }

    // **************************************************
    // 4. Get the user's review, if available
    // **************************************************

    let review = null

    try {
      review = await findUserReview(
        Number(appId),
        steamId
      )
    } catch (error) {
      console.warn(
        'Review data unavailable:',
        error.message
      )
    }

    // **************************************************
    // 5. Return combined data
    // **************************************************

    return res.json({
      steamId: player.steamid,
      username: player.personaname,
      avatar: player.avatarfull,
      profileUrl: player.profileurl,

      game: {
        appId: Number(appId),
        name: game.name,

        playtimeMinutes,

        playtimeHours: Number(
          (playtimeMinutes / 60).toFixed(2)
        ),

        achievements,

        review
      }
    })
  } catch (error) {
    console.error('Steam API error:', error.message)

    return res.status(500).json({
      error: 'Failed to retrieve Steam data.'
    })
  }
})

module.exports = router
