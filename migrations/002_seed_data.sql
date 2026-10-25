-- ChainStream Seed Data Migration 002
-- Pre-populates chains, standard ABIs, and default demo API key

-- Seed Chains: Ethereum Sepolia, Base Sepolia, Polygon Amoy
INSERT INTO chains (id, name, slug, network_type, rpc_url, ws_rpc_url, confirmation_depth, is_active)
VALUES 
    (11155111, 'Ethereum Sepolia', 'eth-sepolia', 'testnet', 'https://ethereum-sepolia-rpc.publicnode.com', 'wss://ethereum-sepolia-rpc.publicnode.com', 12, true),
    (84532, 'Base Sepolia', 'base-sepolia', 'testnet', 'https://sepolia.base.org', 'wss://base-sepolia-rpc.publicnode.com', 10, true),
    (80002, 'Polygon Amoy', 'polygon-amoy', 'testnet', 'https://rpc-amoy.polygon.technology', 'wss://polygon-amoy-bor-rpc.publicnode.com', 16, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    rpc_url = EXCLUDED.rpc_url,
    ws_rpc_url = EXCLUDED.ws_rpc_url,
    confirmation_depth = EXCLUDED.confirmation_depth,
    updated_at = NOW();

-- Seed Standard ERC-20 ABI
INSERT INTO contract_abis (chain_id, contract_address, name, abi_json)
VALUES (
    NULL,
    NULL,
    'ERC20',
    '[
        {"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Seed Uniswap V3 Swap ABI
INSERT INTO contract_abis (chain_id, contract_address, name, abi_json)
VALUES (
    NULL,
    NULL,
    'UniswapV3Pool',
    '[
        {"anonymous":false,"inputs":[{"indexed":true,"name":"sender","type":"address"},{"indexed":true,"name":"recipient","type":"address"},{"indexed":false,"name":"amount0","type":"int256"},{"indexed":false,"name":"amount1","type":"int256"},{"indexed":false,"name":"sqrtPriceX96","type":"uint160"},{"indexed":false,"name":"liquidity","type":"uint128"},{"indexed":false,"name":"tick","type":"int24"}],"name":"Swap","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"tickLower","type":"int24"},{"indexed":true,"name":"tickUpper","type":"int24"},{"indexed":false,"name":"amount","type":"uint128"},{"indexed":false,"name":"amount0","type":"uint256"},{"indexed":false,"name":"amount1","type":"uint256"}],"name":"Mint","type":"event"}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Seed Initial Checkpoints for the chains
INSERT INTO indexer_checkpoints (chain_id, last_indexed_block, last_indexed_hash, safe_confirmed_block, fencing_token, worker_id, updated_at)
VALUES 
    (11155111, 0, '0x0000000000000000000000000000000000000000000000000000000000000000', 0, 1, 'worker-init-1', NOW()),
    (84532, 0, '0x0000000000000000000000000000000000000000000000000000000000000000', 0, 1, 'worker-init-2', NOW()),
    (80002, 0, '0x0000000000000000000000000000000000000000000000000000000000000000', 0, 1, 'worker-init-3', NOW())
ON CONFLICT (chain_id) DO NOTHING;

-- Seed Default Demo API Key:
-- Key plaintext: cs_live_dev_test_key_99999
-- SHA256 of 'cs_live_dev_test_key_99999' = 'c05f7787756fba0429735d4f33190be218cce1a7c06eb69d1b6cf146a81e3a6c'
INSERT INTO api_keys (id, name, key_prefix, key_hash, rate_limit_per_min, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Default Admin Developer Key',
    'cs_live_dev',
    encode(digest('cs_live_dev_test_key_99999', 'sha256'), 'hex'),
    1000,
    true
) ON CONFLICT (key_hash) DO NOTHING;
