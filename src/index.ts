interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * OpenSea MCP — NFT marketplace data (v2 API)
 *
 * Collection metadata, floor/volume stats, owned NFTs, individual NFT
 * lookups across EVM chains.
 *
 * API: https://docs.opensea.io/reference/api-overview
 * Auth: header `X-API-KEY`. Free tier with per-second limits.
 *
 * Tools:
 * - get_collection:        collection metadata by OpenSea slug
 * - get_collection_stats:  floor / volume / supply / owners
 * - list_owned_nfts:       NFTs held by an account
 * - get_nft:               single NFT by chain + contract + token ID
 * - list_collection_nfts:  NFTs in a collection
 */


const BASE_URL = 'https://api.opensea.io/api/v2';

const tools: McpToolExport['tools'] = [
  {
    name: 'get_collection',
    description:
      'Fetch a collection by OpenSea slug. Returns name, description, contracts, social links, fees, image, banner. Find slugs at opensea.io/collection/<slug>.',
    inputSchema: {
      type: 'object',
      properties: {
        collection_slug: { type: 'string', description: 'OpenSea collection slug (URL suffix)' },
      },
      required: ['collection_slug'],
    },
  },
  {
    name: 'get_collection_stats',
    description:
      'Floor price, volume (24h/7d/30d/all), supply, owners, and best-offer for a collection.',
    inputSchema: {
      type: 'object',
      properties: {
        collection_slug: { type: 'string', description: 'OpenSea collection slug' },
      },
      required: ['collection_slug'],
    },
  },
  {
    name: 'list_collection_nfts',
    description:
      'List NFTs inside a collection (paginated). Returns identifier, name, image, traits, owner, last sale.',
    inputSchema: {
      type: 'object',
      properties: {
        collection_slug: { type: 'string', description: 'OpenSea collection slug' },
        limit: { type: 'number', description: '1-200 (default 50)' },
        next: { type: 'string', description: 'Pagination cursor from prior response' },
      },
      required: ['collection_slug'],
    },
  },
  {
    name: 'get_nft',
    description: 'Single NFT by chain + contract address + token ID.',
    inputSchema: {
      type: 'object',
      properties: {
        chain: {
          type: 'string',
          description: 'Chain slug (ethereum, polygon, base, arbitrum, optimism, avalanche, klaytn, bsc, solana, etc.)',
        },
        contract_address: { type: 'string', description: 'Contract address (0x... for EVM)' },
        token_id: { type: 'string', description: 'Token ID (numeric string for ERC-721/1155)' },
      },
      required: ['chain', 'contract_address', 'token_id'],
    },
  },
  {
    name: 'list_owned_nfts',
    description: 'NFTs owned by an address on a specific chain. Paginated.',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: 'Chain slug' },
        address: { type: 'string', description: 'Owner wallet address' },
        limit: { type: 'number', description: '1-200 (default 50)' },
        next: { type: 'string', description: 'Pagination cursor' },
        collection_slug: { type: 'string', description: 'Restrict to a single collection (optional)' },
      },
      required: ['chain', 'address'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = (args._apiKey as string | undefined)?.trim();
  if (!apiKey) {
    throw new Error(
      'OpenSea requires an API key. Contact the operator about platform credentials, or BYO via ?_apiKey=<key> after applying at https://docs.opensea.io/reference/api-keys.',
    );
  }
  switch (name) {
    case 'get_collection':
      return getCollection(apiKey, reqStr(args, 'collection_slug', '"boredapeyachtclub"'));
    case 'get_collection_stats':
      return getCollectionStats(apiKey, reqStr(args, 'collection_slug', '"boredapeyachtclub"'));
    case 'list_collection_nfts':
      return listCollectionNfts(apiKey, args);
    case 'get_nft':
      return getNft(
        apiKey,
        reqStr(args, 'chain', '"ethereum"'),
        reqStr(args, 'contract_address', '"0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d"'),
        reqStr(args, 'token_id', '"1234"'),
      );
    case 'list_owned_nfts':
      return listOwnedNfts(apiKey, args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing or empty. Pass a string like ${example}.`);
  }
  return v;
}

async function osFetch<T>(apiKey: string, path: string, params?: URLSearchParams): Promise<T> {
  const url = `${BASE_URL}${path}${params?.toString() ? `?${params}` : ''}`;
  const res = await fetch(url, {
    headers: { 'X-API-KEY': apiKey, Accept: 'application/json' },
  });
  if (res.status === 401 || res.status === 403) throw new Error('OpenSea: unauthorized — check the API key');
  if (res.status === 404) throw new Error('OpenSea: not found (HTTP 404)');
  if (res.status === 429) throw new Error('OpenSea: rate-limit (HTTP 429)');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenSea error: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface OsCollection {
  collection?: string;
  name?: string;
  description?: string;
  image_url?: string;
  banner_image_url?: string;
  owner?: string;
  safelist_status?: string;
  category?: string;
  is_disabled?: boolean;
  is_nsfw?: boolean;
  trait_offers_enabled?: boolean;
  collection_offers_enabled?: boolean;
  opensea_url?: string;
  project_url?: string;
  wiki_url?: string;
  discord_url?: string;
  telegram_url?: string;
  twitter_username?: string;
  instagram_username?: string;
  contracts?: { address?: string; chain?: string }[];
  total_supply?: number;
  fees?: { fee?: number; recipient?: string; required?: boolean }[];
}

async function getCollection(apiKey: string, slug: string) {
  const data = await osFetch<OsCollection>(apiKey, `/collections/${encodeURIComponent(slug)}`);
  return {
    slug: data.collection ?? slug,
    name: data.name ?? null,
    description: data.description ?? null,
    image: data.image_url ?? null,
    banner: data.banner_image_url ?? null,
    owner: data.owner ?? null,
    safelist_status: data.safelist_status ?? null,
    category: data.category ?? null,
    disabled: data.is_disabled ?? false,
    nsfw: data.is_nsfw ?? false,
    opensea_url: data.opensea_url ?? `https://opensea.io/collection/${slug}`,
    website: data.project_url ?? null,
    wiki: data.wiki_url ?? null,
    discord: data.discord_url ?? null,
    telegram: data.telegram_url ?? null,
    twitter: data.twitter_username ?? null,
    instagram: data.instagram_username ?? null,
    contracts: data.contracts ?? [],
    total_supply: data.total_supply ?? null,
    fees: (data.fees ?? []).map((f) => ({ pct: f.fee ?? null, recipient: f.recipient ?? null, required: f.required ?? null })),
  };
}

interface StatsResponse {
  total?: { volume?: number; sales?: number; average_price?: number; num_owners?: number; market_cap?: number; floor_price?: number };
  intervals?: { interval?: string; volume?: number; volume_diff?: number; volume_change?: number; sales?: number; sales_diff?: number; average_price?: number }[];
}

async function getCollectionStats(apiKey: string, slug: string) {
  const data = await osFetch<StatsResponse>(apiKey, `/collections/${encodeURIComponent(slug)}/stats`);
  return {
    slug,
    floor_price: data.total?.floor_price ?? null,
    market_cap: data.total?.market_cap ?? null,
    total_volume: data.total?.volume ?? null,
    total_sales: data.total?.sales ?? null,
    average_price: data.total?.average_price ?? null,
    num_owners: data.total?.num_owners ?? null,
    intervals: (data.intervals ?? []).map((i) => ({
      window: i.interval ?? null,
      volume: i.volume ?? null,
      volume_change_pct: i.volume_change ?? null,
      sales: i.sales ?? null,
      average_price: i.average_price ?? null,
    })),
  };
}

interface OsNft {
  identifier?: string;
  collection?: string;
  contract?: string;
  token_standard?: string;
  name?: string;
  description?: string;
  image_url?: string;
  display_image_url?: string;
  display_animation_url?: string;
  metadata_url?: string;
  opensea_url?: string;
  updated_at?: string;
  is_disabled?: boolean;
  is_nsfw?: boolean;
  traits?: { trait_type?: string; value?: string | number; display_type?: string | null }[];
  owners?: { address?: string; quantity?: number }[];
  rarity?: { rank?: number; score?: number };
}

function normalizeNft(n: OsNft) {
  return {
    identifier: n.identifier ?? null,
    collection: n.collection ?? null,
    contract: n.contract ?? null,
    standard: n.token_standard ?? null,
    name: n.name ?? null,
    description: n.description ?? null,
    image: n.display_image_url ?? n.image_url ?? null,
    animation: n.display_animation_url ?? null,
    metadata_url: n.metadata_url ?? null,
    opensea_url: n.opensea_url ?? null,
    updated_at: n.updated_at ?? null,
    disabled: n.is_disabled ?? false,
    nsfw: n.is_nsfw ?? false,
    traits: (n.traits ?? []).map((t) => ({
      type: t.trait_type ?? null,
      value: t.value ?? null,
      display_type: t.display_type ?? null,
    })),
    owners: (n.owners ?? []).map((o) => ({ address: o.address ?? null, quantity: o.quantity ?? 1 })),
    rarity_rank: n.rarity?.rank ?? null,
    rarity_score: n.rarity?.score ?? null,
  };
}

async function listCollectionNfts(apiKey: string, args: Record<string, unknown>) {
  const slug = reqStr(args, 'collection_slug', '"boredapeyachtclub"');
  const params = new URLSearchParams({
    limit: String(Math.min(200, Math.max(1, (args.limit as number) ?? 50))),
  });
  if (args.next) params.set('next', String(args.next));

  const data = await osFetch<{ nfts?: OsNft[]; next?: string }>(
    apiKey,
    `/collection/${encodeURIComponent(slug)}/nfts`,
    params,
  );
  return {
    collection_slug: slug,
    count: data.nfts?.length ?? 0,
    next: data.next ?? null,
    nfts: (data.nfts ?? []).map(normalizeNft),
  };
}

async function getNft(apiKey: string, chain: string, contract: string, tokenId: string) {
  const data = await osFetch<{ nft?: OsNft }>(
    apiKey,
    `/chain/${encodeURIComponent(chain)}/contract/${encodeURIComponent(contract)}/nfts/${encodeURIComponent(tokenId)}`,
  );
  if (!data.nft) throw new Error('OpenSea: NFT not found');
  return normalizeNft(data.nft);
}

async function listOwnedNfts(apiKey: string, args: Record<string, unknown>) {
  const chain = reqStr(args, 'chain', '"ethereum"');
  const address = reqStr(args, 'address', '"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"');
  const params = new URLSearchParams({
    limit: String(Math.min(200, Math.max(1, (args.limit as number) ?? 50))),
  });
  if (args.next) params.set('next', String(args.next));
  if (args.collection_slug) params.set('collection', String(args.collection_slug));

  const data = await osFetch<{ nfts?: OsNft[]; next?: string }>(
    apiKey,
    `/chain/${encodeURIComponent(chain)}/account/${encodeURIComponent(address)}/nfts`,
    params,
  );
  return {
    chain,
    owner: address,
    count: data.nfts?.length ?? 0,
    next: data.next ?? null,
    nfts: (data.nfts ?? []).map(normalizeNft),
  };
}

export default { tools, callTool, meter: { credits: 2 } } satisfies McpToolExport;
