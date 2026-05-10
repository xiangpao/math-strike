# MCP Troubleshooting (Windows Environment)

During the setup of this project, several Windows-specific MCP issues were identified and resolved.

## 1. NPX Command Issues
**Problem**: `npx` alone often fails to spawn correctly in Windows `child_process` when communicating via `stdio`.
**Solution**: Always use `npx.cmd` in the `"command"` field of `mcp_config.json`.

## 2. Protocol Corruption (Non-JSON Output)
**Problem**: Some MCP servers or npm itself may output warnings or version strings (e.g., `Package version: 0.0.16` or `npm deprecation warnings`) that break JSON parsing.
**Solutions**:
- **Environment Variable**: Set `"npm_config_loglevel": "error"` to suppress npm warnings.
- **Wrapper Script**: For servers that output non-JSON strings even on success (like EdgeOne), use a Node.js wrapper to filter `stdout`.

## 3. GitHub MCP Filter Stability
**Problem**: Remote URL-based GitHub MCP servers can be unstable or fail to apply local tool filtering correctly.
**Solution**: Use the local `stdio` version of the GitHub MCP server.

## 4. Path Resolution
**Problem**: `MODULE_NOT_FOUND` errors when using relative paths for wrappers or scripts.
**Solution**: Use absolute paths for all script references in `mcp_config.json`.
