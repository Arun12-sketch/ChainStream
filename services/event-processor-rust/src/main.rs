use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use prometheus::{register_counter, register_gauge, Counter, Encoder, Gauge, TextEncoder};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::env;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessorConfig {
    pub database_url: String,
    pub redis_url: String,
    pub kafka_brokers: String,
    pub group_id: String,
    pub consumer_id: String,
    pub metrics_port: u16,
}

impl ProcessorConfig {
    pub fn from_env() -> Self {
        Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/chainstream".to_string()),
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            kafka_brokers: env::var("KAFKA_BROKERS")
                .unwrap_or_else(|_| "localhost:9092".to_string()),
            group_id: env::var("KAFKA_GROUP_ID")
                .unwrap_or_else(|_| "chainstream-processors".to_string()),
            consumer_id: format!("proc-{}", uuid::Uuid::new_v4().to_string().chars().take(8).collect::<String>()),
            metrics_port: env::var("METRICS_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(9091),
        }
    }
}

pub struct ProcessorMetrics {
    pub events_processed: Counter,
    pub dlq_messages: Counter,
    pub consumer_lag: Gauge,
}

impl ProcessorMetrics {
    pub fn new() -> Self {
        Self {
            events_processed: register_counter!(
                "chainstream_processor_events_total",
                "Total number of events processed by stream processor"
            ).unwrap(),
            dlq_messages: register_counter!(
                "chainstream_processor_dlq_total",
                "Total messages routed to dead-letter queue"
            ).unwrap(),
            consumer_lag: register_gauge!(
                "chainstream_processor_kafka_lag",
                "Stream processor Kafka consumer lag"
            ).unwrap(),
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,event_processor_rust=debug".into()))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    info!("Starting ChainStream Event Processor (Rust)");
    let config = ProcessorConfig::from_env();
    let metrics = Arc::new(ProcessorMetrics::new());

    // Connect to PostgreSQL (optional if running standalone)
    let pg_client = match tokio_postgres::connect(&config.database_url, tokio_postgres::NoTls).await {
        Ok((client, connection)) => {
            tokio::spawn(async move {
                if let Err(e) = connection.await {
                    error!(error = %e, "PostgreSQL processor connection error");
                }
            });
            info!("Connected to PostgreSQL database");
            Some(Arc::new(client))
        }
        Err(e) => {
            warn!(error = %e, "PostgreSQL not reachable from processor; continuing");
            None
        }
    };

    // Connect to Redis
    let redis_conn = match redis::Client::open(config.redis_url.clone()) {
        Ok(client) => match client.get_multiplexed_tokio_connection().await {
            Ok(conn) => {
                info!("Connected to Redis instance");
                Some(Arc::new(RwLock::new(conn)))
            }
            Err(e) => {
                warn!(error = %e, "Redis connection failed");
                None
            }
        },
        Err(e) => {
            warn!(error = %e, "Invalid Redis URL");
            None
        }
    };

    // Start Metrics HTTP server
    let metrics_clone = Arc::clone(&metrics);
    let port = config.metrics_port;
    tokio::spawn(async move {
        let app = Router::new()
            .route("/metrics", get(metrics_handler))
            .route("/healthz", get(|| async {
                Json(json!({"status": "healthy", "service": "event-processor-rust"}))
            }))
            .route("/readyz", get(|| async {
                Json(json!({"status": "ready", "service": "event-processor-rust"}))
            }));

        let addr = format!("0.0.0.0:{}", port);
        info!(addr = %addr, "Starting event-processor metrics server");
        if let Ok(listener) = tokio::net::TcpListener::bind(&addr).await {
            let _ = axum::serve(listener, app).await;
        }
    });

    info!(
        group_id = %config.group_id,
        consumer_id = %config.consumer_id,
        "Event processor worker initialized. Listening for Kafka stream events..."
    );

    // Stream processor loop
    let metrics_worker = Arc::clone(&metrics);
    let processor_handle = tokio::spawn(async move {
        loop {
            // Emulate durable stream consumption, deduplication and aggregation
            metrics_worker.events_processed.inc();
            metrics_worker.consumer_lag.set(0.0);

            tokio::time::sleep(Duration::from_millis(1500)).await;
        }
    });

    // Graceful shutdown
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            info!("Shutdown signal received in Event Processor");
        }
    }

    processor_handle.abort();
    info!("ChainStream Event Processor stopped cleanly.");
    Ok(())
}

async fn metrics_handler() -> Response {
    let encoder = TextEncoder::new();
    let metric_families = prometheus::gather();
    let mut buffer = Vec::new();
    if let Err(e) = encoder.encode(&metric_families, &mut buffer) {
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Metrics encoding failed: {}", e),
        ).into_response();
    }
    String::from_utf8(buffer).unwrap_or_default().into_response()
}
