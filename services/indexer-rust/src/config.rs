use crate::types::ChainConfig;
use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub redis_url: String,
    pub kafka_brokers: String,
    pub worker_id: String,
    pub metrics_port: u16,
    pub chains: Vec<ChainConfig>,
    pub enable_simulation: bool,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/chainstream".to_string());
        let redis_url = env::var("REDIS_URL")
            .unwrap_or_else(|_| "redis://localhost:6379".to_string());
        let kafka_brokers = env::var("KAFKA_BROKERS")
            .unwrap_or_else(|_| "localhost:9092".to_string());
        let worker_id = env::var("WORKER_ID")
            .unwrap_or_else(|_| format!("worker-{}", uuid::Uuid::new_v4().to_string().chars().take(8).collect::<String>()));
        let metrics_port = env::var("METRICS_PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(9090);
        let enable_simulation = env::var("ENABLE_RPC_SIMULATION")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(false);

        // Chain 1: Ethereum Sepolia (11155111)
        let eth_sepolia_rpc = env::var("ETH_SEPOLIA_RPC")
            .unwrap_or_else(|_| "https://ethereum-sepolia-rpc.publicnode.com".to_string());
        let eth_sepolia_ws = env::var("ETH_SEPOLIA_WS")
            .unwrap_or_else(|_| "wss://ethereum-sepolia-rpc.publicnode.com".to_string());

        // Chain 2: Base Sepolia (84532)
        let base_sepolia_rpc = env::var("BASE_SEPOLIA_RPC")
            .unwrap_or_else(|_| "https://sepolia.base.org".to_string());
        let base_sepolia_ws = env::var("BASE_SEPOLIA_WS")
            .unwrap_or_else(|_| "wss://base-sepolia-rpc.publicnode.com".to_string());

        // Chain 3: Polygon Amoy (80002)
        let amoy_rpc = env::var("POLYGON_AMOY_RPC")
            .unwrap_or_else(|_| "https://rpc-amoy.polygon.technology".to_string());
        let amoy_ws = env::var("POLYGON_AMOY_WS")
            .unwrap_or_else(|_| "wss://polygon-amoy-bor-rpc.publicnode.com".to_string());

        let chains = vec![
            ChainConfig {
                chain_id: 11155111,
                name: "Ethereum Sepolia".to_string(),
                slug: "eth-sepolia".to_string(),
                network_type: "testnet".to_string(),
                rpc_url: eth_sepolia_rpc,
                fallback_rpc_urls: vec![
                    "https://rpc.sepolia.org".to_string(),
                    "https://gateway.tenderly.co/public/sepolia".to_string(),
                ],
                ws_rpc_url: Some(eth_sepolia_ws),
                confirmation_depth: 12,
                poll_interval_ms: 2000,
                max_batch_size: 5,
                start_block: env::var("ETH_SEPOLIA_START_BLOCK").ok().and_then(|v| v.parse().ok()),
            },
            ChainConfig {
                chain_id: 84532,
                name: "Base Sepolia".to_string(),
                slug: "base-sepolia".to_string(),
                network_type: "testnet".to_string(),
                rpc_url: base_sepolia_rpc,
                fallback_rpc_urls: vec![
                    "https://base-sepolia-rpc.publicnode.com".to_string(),
                ],
                ws_rpc_url: Some(base_sepolia_ws),
                confirmation_depth: 10,
                poll_interval_ms: 2000,
                max_batch_size: 5,
                start_block: env::var("BASE_SEPOLIA_START_BLOCK").ok().and_then(|v| v.parse().ok()),
            },
            ChainConfig {
                chain_id: 80002,
                name: "Polygon Amoy".to_string(),
                slug: "polygon-amoy".to_string(),
                network_type: "testnet".to_string(),
                rpc_url: amoy_rpc,
                fallback_rpc_urls: vec![
                    "https://polygon-amoy.drpc.org".to_string(),
                ],
                ws_rpc_url: Some(amoy_ws),
                confirmation_depth: 16,
                poll_interval_ms: 2500,
                max_batch_size: 5,
                start_block: env::var("POLYGON_AMOY_START_BLOCK").ok().and_then(|v| v.parse().ok()),
            },
        ];

        Self {
            database_url,
            redis_url,
            kafka_brokers,
            worker_id,
            metrics_port,
            chains,
            enable_simulation,
        }
    }
}
