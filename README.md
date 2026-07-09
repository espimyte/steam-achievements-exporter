# Steam Achievements Exporter

A script that exports your Steam achievement data, from achievement titles, descriptions, completion time, and icons.
Data is exported into a JSON file, and icons are downloaded into a folder.

# Prerequisites

**Node.js**

- If you don't already have Node.js installed, you can install it here: https://nodejs.org/en/download/current
- If you can type and run `node -v` in the command line and get a version number you should be all set.

**A Steam account**

**Steam User ID**

- To get your Steam User ID, while logged into your account, visit this page: https://store.steampowered.com/account/
- Your Steam ID should be displayed near your name on that page.

**Steam API key**

- You can get one here: https://steamcommunity.com/dev/apikey
- You can write anything you want under "Domain Name"

### Steps

1. Before you begin, you should take a look at the `config.js` file. Make sure that the `JSON_OUTPUT_PATH` variable points to your `achievements.json` file (or where you intend it to be).

Here's a table of every config variable:
| Variable | Description |
| ------------- | ------------- |
| JSON_OUTPUT_PATH | The path where `achievements.json`, the file that stores all the achievement data, is. This can be an absolute or relative path. |
| DOWNLOAD_ICONS | Whether or not to download achievement icons. |
| ICONS_OUTPUT_FOLDER | The folder path where achievement icons are saved (if `DOWNLOAD_ICONS` is set to true). This can be an absolute or relative path. |
| RELATIVE_IMAGE_PATH | The path where image file paths stored in `achievements.json` are relative to. This can be an absolute or relative path. |
| FETCH_MODE | Defines the fetch mode for the Steam achievement fetch script. There are two modes: `exclude` and `include`. Exclude is the default behavior, which gets the achievements from all owned games on your Steam account and excludes anything in `EXCLUDE_IDS`. Include only includes games in `INCLUDE_IDS`. |
| EXCLUDE_IDS | If using `exclude` fetch mode, excludes app ids defined here from being fetched. |
| INCLUDE_IDS | If using `include` fetch mode, gets achievements from the app ids listed here. |

2. Create a `.env` file in the same area as the script.
3. Populate the `.env` file with your steam User ID and your Steam API key. You can copy the contents of the `.env.example` file and replace the sample values.

> [!WARNING]
> Take care to never share/publish the contents of the `.env` file anywhere, as your API key is sensitive data.

4. Make sure your account game details are set to public (you can set it back to private when you're done). If you're having trouble, see this [image](/images/game_details.png) for what settings need to be public.
5. Run `node import-steam.js` in your command line. This will create an `achievements.json` file (or modify it if it already exists) at the location specified in `config.js`.

If you turned `USE_DIRECT_LINKS` in the config to false, it will also download the relevant achievement icons to the specified icons folder.

6. And you're done! You can run the script again at any time to update it with your most recent Steam achievements.
