# Deployment Guide — EdgeOne Pages

This project uses **EdgeOne Pages** for automated deployment and hosting.

## MCP Configuration

To deploy from within the Antigravity environment, the `edgeone-pages-mcp-server` must be correctly configured in `mcp_config.json`.

### Requirements
- **API Token**: `EDGEONE_PAGES_API_TOKEN` must be set.
- **Wrapper Script**: Due to non-JSON output from the `edgeone-pages-mcp` package, a wrapper script is required to filter `stdout`.

### Wrapper Script Location
`C:\Users\86137\.gemini\antigravity\edgeone_wrapper.js`

### Deployment Steps
1. Ensure the project is built: `npm run build` (if applicable).
2. Use the MCP tool `deploy_folder_or_zip` or `deploy_html`.
3. Provide the path to the `dist` folder or the target HTML file.

## Troubleshooting
If you encounter `invalid character 'P'` errors, ensure the `edgeone_wrapper.js` is being used as the entry point in `mcp_config.json`.
