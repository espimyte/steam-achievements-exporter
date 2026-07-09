/* 
 * Author: espimyte (espy.world) 
 * https://github.com/espimyte/steam-achievements-exporter
 */

import fs from 'fs'
import http from 'http';
import stream from 'node:stream';
import path from 'path'
import { fileURLToPath } from 'url';
import { fetchJSON, writeJSON, saveImageFromURL, fetchJSONfromURL } from './utils.js'
import { RELATIVE_IMAGE_PATH, FETCH_MODE, INCLUDE_IDS, EXCLUDE_IDS, ICONS_OUTPUT_FOLDER, JSON_OUTPUT_PATH, USE_DIRECT_LINKS } from './config.js'

/** 
 * Returns whether or not the Steam profile is public
 * @param userId Steam User Id to check 
 * @returns whether or not the associated profile is public
 */
async function isProfilePublic(userId) {
    const apiKey = process.env.STEAM_API_KEY

    const res = await fetchJSONfromURL(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=400&key=${apiKey}&steamid=${userId}`);
    if (!res) {
        console.error("\x1b[31mCould not retrieve profile data.\x1b[0m")
        return false;
    }

    return res.playerstats.error !== "Profile is not public";
}

/**
 * Gets user data and writes JSON files
 * Only works if profile and game details are set to public.
 * @param userId Steam User Id to fetch data from
 * @returns achievement schemas and unlock times in JSON format
 */
async function getUserData(userId) {
    const apiKey = process.env.STEAM_API_KEY

    let appIds = []
    if (FETCH_MODE === "include") {
        appIds = [...INCLUDE_IDS]
    } else {
        // Get owned games
        const ownedGames = await fetchJSONfromURL(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${userId}&format=json&include_played_free_games=true`)

        appIds = ownedGames.response.games.map((game) => game.appid)
        appIds = Array.from(new Set([...appIds, ...INCLUDE_IDS]));
        appIds = appIds.filter((appId) => !EXCLUDE_IDS.includes(appId))
    }

    const query = appIds.map((appId, i) => `appids[${i}]=${appId}`).join("&")

    // Get achievement schemas
    const schemas = await fetchJSONfromURL(`https://api.steampowered.com/IPlayerService/GetTopAchievementsForGames/v1/?key=${apiKey}&steamid=${userId}&language=en&max_achievements=10000&${query}`);

    // Get unlock times
    const promises = [];
    const unlockTimes = {};
    schemas.response.games.forEach((game) => {
        if (!game.achievements) return;
        
        const promise = fetchJSONfromURL(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${game.appid}&key=${apiKey}&steamid=${userId}`);

        promise.then((data) => {
            unlockTimes[game.appid] = data;
        })
        promises.push(promise);
    });

    await Promise.all(promises);
    return {schemas: schemas, unlockTimes: unlockTimes}
}

/**
 * Returns the icon URL of the given app id and icon id.
 * @param appId app id of game
 * @param icon icon id of achievement (from schema)
 * @returns icon URL
 */
function getIconURL(appId, icon) {
    return `https://shared.fastly.steamstatic.com/community_assets/images/apps/${appId}/${icon}`;
}

async function main() {
    const dirname = path.dirname(fileURLToPath(import.meta.url))

    // Load .env
    try {
        process.loadEnvFile(`${dirname}/.env`);
    } catch (e) {
        if (e.code !== 'ENOENT') console.log(`\x1b[31m${e.name}\x1b[0m : ${e.message}`);
        console.log("\x1b[31mUnable to find .env file.\x1b[0m")
        return;
    }
    
    if (!process.env.STEAM_API_KEY) {
        console.error("\x1b[31mSteam API key not set.\x1b[0m")
        return;
    }
    if (!process.env.STEAM_USER_ID) {
        console.error("\x1b[31mSteam User ID not set.\x1b[0m")
        return;
    }
    const userId = process.env.STEAM_USER_ID;

    let userDataStartTime = new Date();
    process.stdout.write("\x1b[33mFetching user data...\x1b[0m");

    // Check if profile is public
    const isPublic = await isProfilePublic(userId);
    if (!isPublic) {
        console.error("\x1b[31m\nProfile is private. Aborting...\x1b[0m");
        return;
    }

    // Fetch user data
    const userData = await getUserData(userId);
    const unlockTimes = userData.unlockTimes;
    const schemas = userData.schemas;
    const gameDict = {};

    process.stdout.write(`\r\x1b[33mFetched user data. \x1b[0m(${(new Date() - userDataStartTime) / 1000}s)\x1b[0m\n`)

    // Create keys using game names
    Object.entries(unlockTimes).forEach((entry) => {
        if (entry[1].playerstats.error) return;
        const gameKey = entry[1].playerstats.gameName.replace(/[^A-Z0-9]+/ig, "_").toLowerCase();
        gameDict[entry[0]] = { key: gameKey, title: entry[1].playerstats.gameName};
    });

    // Populate games in achievements.json
    let json = fetchJSON(`${JSON_OUTPUT_PATH}`);
    if (!json) {
        console.log(`Unable to find ${path.resolve(JSON_OUTPUT_PATH)}. Creating new JSON file.`);
        json = {"games": {}, "achievements": []}
    }
    Object.values(gameDict).forEach((game) => {
        if (!json.games[game.key]) {
            json.games[game.key] = {title: game.title}
        }
    })

    // Clear steam achievements in json
    json.achievements = json.achievements.filter((ach) => {
        return ach.src !== "steam";
    });

    // Populate achievements in achievements.json
    Object.values(schemas.response.games).forEach((data) => {
        if (unlockTimes[data.appid]?.playerstats.error) return;
        if (!data.achievements) return;

        const sortedAchData = data.achievements.toSorted((a, b) => {
            if (a.statid === b.statid) return (a.bit > b.bit) || -(a.bit < b.bit);
            return (a.statid > b.statid) || -(a.statid < b.statid);
        })

        const filteredUnlockTimes = unlockTimes[data.appid]?.playerstats.achievements.filter((utAch) => utAch.achieved);

        const mergedAchData = sortedAchData.map((ach, i) => {
            return {...ach, unlockTime: filteredUnlockTimes[i].unlocktime}
        })
        
        mergedAchData.forEach((ach, i) => {
            const gameKey = gameDict[data.appid]?.key;
            if (!gameKey) return;
            
            const iconUrl = getIconURL(data.appid, ach.icon);

            const achEntry = {};
            achEntry.game = gameKey;
            achEntry.timestamp = ach.unlockTime;
            achEntry.title = ach.name;
            achEntry.desc = ach.desc;
            achEntry.img = USE_DIRECT_LINKS ? iconUrl : path.relative(RELATIVE_IMAGE_PATH, `${ICONS_OUTPUT_FOLDER}/${gameKey}/${ach.icon}`);
            achEntry.src = 'steam';
            json.achievements.push(achEntry);
        })
    });

    // Last updated
    json.last_updated = Date.now();

    // Write to JSON file
    writeJSON(`${JSON_OUTPUT_PATH}`, json, true);

    if (USE_DIRECT_LINKS) return;

    // Save achievement icons of achieved achievements from schemas
    let saveIconStartTime = new Date();
    process.stdout.write("\x1b[33mSaving icons...\x1b[0m");
    let savedIconsCount = 0;
    let alreadyExistsCount = 0;

    const savePromises = [];

    Object.values(schemas.response.games).forEach((data) => {
        data.achievements?.forEach((ach) => {
            if (!gameDict[data.appid]) return;

            const imageUrl = getIconURL(data.appid, ach.icon);
            const file = `${ICONS_OUTPUT_FOLDER}/${gameDict[data.appid].key}/${ach.icon}`;

            if (fs.existsSync(file)) {
                alreadyExistsCount++;
                return;
            }
            if (!fs.existsSync(path.dirname(file))) {
                fs.mkdirSync(path.dirname(file), {recursive: true})
            }
            const savePromise = saveImageFromURL(file, imageUrl);
            savePromises.push(savePromise);
            savePromise.then(() => {
                savedIconsCount++;
            })
        })
    });
    await Promise.all(savePromises);
    process.stdout.write(`\r\x1b[33mSaved ${savedIconsCount} icons, ${alreadyExistsCount} already exists. \x1b[0m(${(new Date() - saveIconStartTime) / 1000}s)\n`)
}

main()