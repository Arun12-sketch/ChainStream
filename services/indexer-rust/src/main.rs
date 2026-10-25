mod abi;
mod checkpoint;
mod config;
mod metrics;
mod publisher;
mod reorg;
mod rpc;
mod types;
mod worker;

use config::AppConfig;
use metrics::{start_metrics_server, MetricsRegistry};
use publisher::EventPublisher;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use worker::ChainWorker;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Initialize Structured Logging
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,indexer_rust=debug".into()))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    info!("Starting ChainStream Indexing Engine (Rust)");

    // 2. Load Configuration
    let config = AppConfig::from_env();
    info!(
        worker_id = %config.worker_id,
        chains_count = config.chains.len(),
        simulation_mode = config.enable_simulation,
        "Loaded environment configuration"
    );

    // 3. Connect to PostgreSQL (with retry)
    let pg_client = match connect_postgres(&config.database_url).await {
        Ok(client) => {
            info!("Connected to PostgreSQL database");
            Some(Arc::new(client))
        }
        Err(e) => {
            warn!(error = %e, "Could not connect to PostgreSQL; will operate in degraded standalone mode");
            None
        }
    };

    // 4. Connect to Redis (optional pub/sub fanout)
    let redis_conn = match connect_redis(&config.redis_url).await {
        Ok(conn) => {
            info!("Connected to Redis cluster/instance");
            Some(Arc::new(RwLock::new(conn)))
        }
        Err(e) => {
            warn!(error = %e, "Could not connect to Redis; continuing without Redis fanout");
            None
        }
    };

    // 5. Initialize Prometheus Metrics
    let metrics = Arc::new(MetricsRegistry::new());
    let metrics_server = {
        let metrics_clone = Arc::clone(&metrics);
        let port = config.metrics_port;
        tokio::spawn(async move {
            start_metrics_server(port, metrics_clone).await;
        })
    };

    // 6. Initialize Kafka / Storage Event Publisher
    let publisher = Arc::new(
        EventPublisher::new(
            config.kafka_brokers.clone(),
            pg_client.clone(),
            redis_conn.clone(),
        )
        .await,
    );

    // 7. Spawn Per-Chain Indexing Workers
    let mut worker_handles = Vec::new();
    for chain_cfg in config.chains {
        let worker = ChainWorker::new(
            chain_cfg,
            config.worker_id.clone(),
            Arc::clone(&publisher),
            Arc::clone(&metrics),
            pg_client.clone(),
            config.enable_simulation,
        );

        let handle = tokio::spawn(async move {
            worker.run().await;
        });
        worker_handles.push(handle);
    }

    info!("All chain indexer workers launched successfully. Listening for shutdown signal...");

    // 8. Graceful Shutdown on SIGINT / SIGTERM
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            info!("SIGINT received; initiating graceful shutdown...");
        }
    }

    metrics_server.abort();
    for handle in worker_handles {
        handle.abort();
    }

    info!("ChainStream Indexing Engine stopped cleanly.");
    Ok(())
}

async fn connect_postgres(db_url: &str) -> Result<tokio_postgres::Client, Box<dyn std::error::Error>> {
    let (client, connection) = tokio_postgres::connect(db_url, tokio_postgres::NoTls).await?;
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            error!(error = %e, "PostgreSQL connection error");
        }
    });
    Ok(client)
}

async fn connect_redis(redis_url: &str) -> Result<redis::aio::MultiplexedConnection, Box<dyn std::error::Error>> {
    let client = redis::Client::open(redis_url)?;
    let conn = client.get_multiplexed_tokio_connection().await?;
    Ok(conn)
}
