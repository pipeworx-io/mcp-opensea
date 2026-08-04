# @pipeworx/opensea

OpenSea v2 MCP — NFT collections, stats, ownership.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `get_collection(collection_slug)`
- `get_collection_stats(collection_slug)`
- `list_collection_nfts(collection_slug, limit?, next?)`
- `get_nft(chain, contract_address, token_id)`
- `list_owned_nfts(chain, address, limit?, next?, collection_slug?)`

## Auth

- **Platform key:** gateway env `PLATFORM_OPENSEA_KEY`.
- **BYO:** `?_apiKey=<key>` after applying at https://docs.opensea.io/reference/api-keys.

## Data source

`https://api.opensea.io/api/v2/` — header `X-API-KEY`.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "opensea": {
      "url": "https://gateway.pipeworx.io/opensea/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Opensea data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
