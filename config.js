export const JSON_OUTPUT_PATH = "example/achievements.json" // Where achievement data is saved

export const USE_DIRECT_LINKS = true // Whether or not to use direct image links instead of downloading
export const ICONS_OUTPUT_FOLDER = "example/icons" // Folder where achievement icons are saved
export const RELATIVE_IMAGE_PATH = "example" // Where stored image file paths in JSON are relative to if not using direct image links

/**
 * "exclude" - default behavior, gets all owned games on your steam account and excludes anything in 'EXCLUDE_IDS'
 * "include" - only includes games in 'INCLUDE_IDS'
 */
export const FETCH_MODE = "exclude"

/* App IDs of games to exclude */
export const EXCLUDE_IDS = []

/* App IDs of games to include */
export const INCLUDE_IDS = []