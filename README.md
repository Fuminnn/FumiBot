# Anime Notifier Bot 🎬

Never miss a new episode! This Discord bot keeps you updated on the latest episodes of your favorite anime with automatic notifications.

## What Does This Bot Do? 📺

- **Automatic Notifications** - Get pinged when your favorite anime releases a new episode
- **Watchlist Management** - Keep track of all anime you're interested in
- **AniList Integration** - Sync your watchlist with your AniList account
- **Episode Tracking** - See current airing episodes for each anime
- **Smart Updates** - Only notifies you about anime you're watching

## Getting Started 🚀

### Step 1: Add the Bot to Your Server
Invite the bot using the provided invite link and select the server you want to use it in.

### Step 2: Set Up Your Channel
Use `/setChannel` to pick which Discord channel the bot should send notifications to:
```
/setChannel
```

### Step 3: Connect Your AniList (Optional)
To sync with your AniList account:
```
/connect
```
The bot will give you a link to authorize. Once connected, any anime you add will automatically appear in your AniList watching list!

## Using the Bot 📝

### Adding Anime to Your Watchlist
```
/add <anime name>
```
Search for the anime you want to watch. The bot will find it on AniList and add it to your watchlist. If you're connected to AniList, it automatically syncs!

**Example:**
```
/add Jujutsu Kaisen
```

### Viewing Your Watchlist
```
/list
```
See all the anime you're watching along with:
- Total episodes in the series
- Current airing episode

### Removing Anime
```
/remove <anime name>
```
Stop watching an anime. If connected to AniList, it automatically removes it from there too!

### Checking Next Episode
```
/next <anime name>
```
Get detailed info about the next episode including:
- Episode number
- Air date and time
- Anime details

### Account Management
```
/status
```
Check if your AniList account is connected.

```
/disconnect
```
Disconnect your AniList account at any time.

## How Notifications Work 🔔

1. The bot checks for new episodes regularly
2. When a new episode airs, it sends a notification to your configured channel
3. You'll be notified about anime on your watchlist only
4. No spam - only one notification per episode!

## Tips & Tricks 💡

- **Autocomplete**: When adding or removing anime, start typing and select from suggestions
- **AniList Sync**: Connect your AniList account for seamless integration
- **Channel Settings**: Make sure the bot has permission to send messages in your notification channel
- **Multiple Servers**: You can use the bot in multiple servers - just set different channels for each!

## FAQ ❓

**Q: Does the bot track my progress on Anilist?**
A: No! The bot only cares about new episodes. It doesn't track how many episodes you've watched.

**Q: What happens if I disconnect my AniList account?**
A: Your Discord watchlist stays the same. Anime you add/remove won't sync to AniList anymore.

**Q: Can I get notifications in multiple channels?**
A: Currently, the bot sends all notifications to one channel per user. You can change it anytime with `/setChannel`.

**Q: How often does the bot check for new episodes?**
A: The bot checks regularly throughout the day to catch new episodes as they air.

## Need Help? 💬

- Use `/help` in Discord to see all commands
- React to error messages for more details
- Check the command descriptions when using autocomplete

---

Enjoy watching and never miss an episode! 🎬✨
