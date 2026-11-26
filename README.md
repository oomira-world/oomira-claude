# Oomira for Claude Code

One install that puts Oomira in Claude Code:

- The Oomira connector, so Claude can read your Oomira dashboard and your session's steps.
- A reminder that keeps the dashboard current. Once a chat has used Oomira, Claude reports what it finishes for the rest of that chat.

## Install

In Claude Code:

```
/plugin marketplace add oomira-world/oomira-claude
/plugin install oomira@oomira
```

Then run `/mcp`, choose Oomira, and sign in with your Oomira account.

## What it keeps on your computer

One small file per chat in the system's temporary folder: the chat's id and two yes/no marks. Nothing of what was said or done, and it sends nothing anywhere. It needs Node.js, which an Oomira setup installs.

Questions: https://oomira.com
