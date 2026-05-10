# CLAUDE.md — Math Strike (Calculations)

## Project Context
This is a Minecraft-themed math shooter game.
- **Root**: `c:\Users\86137\Desktop\IP-Builder\03_Projects\计算`
- **Tech**: Vite + TypeScript

## Environment Setup (Critical for Windows)
- **MCP Config**: `c:\Users\86137\.gemini\antigravity\mcp_config.json`
- **Windows Spawning**: Always use `npx.cmd` instead of `npx`.
- **Protocol Filtering**: 
  - Use `npm_config_loglevel: error` to suppress npm noise.
  - Use `edgeone_wrapper.js` for EdgeOne Pages MCP to filter version strings.

## Deployment
- **Method**: EdgeOne Pages
- **Docs**: `docs/deployment.md`
- **Troubleshooting**: `docs/mcp_troubleshooting.md`

## Common Commands
- `npm run dev`: Local development
- `npm run build`: Build production assets to `dist/`
