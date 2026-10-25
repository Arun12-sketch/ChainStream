use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use prometheus::{
    register_counter_vec, register_gauge_vec, register_histogram_vec, CounterVec, Encoder,
    GaugeVec, HistogramVec, TextEncoder,
};
use serde_json::json;
use std::sync::Arc;
use tracing::info;

#[derive(Clone)]
pub struct MetricsRegistry {
    pub blocks_indexed: CounterVec,
    pub txs_indexed: CounterVec,
    pub events_decoded: CounterVec,
    pub reorg_count: CounterVec,
    pub lag_blocks: GaugeVec,
    pub rpc_latency: HistogramVec,
}

impl Default for MetricsRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl MetricsRegistry {
    pub fn new() -> Self {
        let blocks_indexed = register_counter_vec!(
            "chainstream_blocks_indexed_total",
            "Total number of blockchain blocks indexed",
            &["chain_id"]
        )
        .unwrap();

        let txs_indexed = register_counter_vec!(
            "chainstream_transactions_indexed_total",
            "Total number of transactions indexed",
            &["chain_id"]
        )
        .unwrap();

        let events_decoded = register_counter_vec!(
            "chainstream_events_decoded_total",
            "Total number of decoded smart contract events",
            &["chain_id"]
        )
        .unwrap();

        let reorg_count = register_counter_vec!(
            "chainstream_reorg_count_total",
            "Total number of detected blockchain reorganizations",
            &["chain_id"]
        )
        .unwrap();

        let lag_blocks = register_gauge_vec!(
            "chainstream_lag_blocks",
            "Difference between observed chain head and indexed checkpoint",
            &["chain_id"]
        )
        .unwrap();

        let rpc_latency = register_histogram_vec!(
            "chainstream_rpc_latency_seconds",
            "RPC call latency in seconds",
            &["chain_id", "method"]
        )
        .unwrap();

        Self {
            blocks_indexed,
            txs_indexed,
            events_decoded,
            reorg_count,
            lag_blocks,
            rpc_latency,
        }
    }
}

async fn metrics_handler() -> Response {
    let encoder = TextEncoder::new();
    let metric_families = prometheus::gather();
    let mut buffer = Vec::new();
    if let Err(e) = encoder.encode(&metric_families, &mut buffer) {
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Metrics encoding failed: {}", e),
        )
            .into_response();
    }
    String::from_utf8(buffer).unwrap_or_default().into_response()
}

async fn health_handler() -> Response {
    Json(json!({
        "status": "healthy",
        "service": "indexer-rust",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
    .into_response()
}

async fn ready_handler() -> Response {
    Json(json!({
        "status": "ready",
        "service": "indexer-rust"
    }))
    .into_response()
}

pub async fn start_metrics_server(port: u16, metrics: Arc<MetricsRegistry>) {
    let app = Router::new()
        .route("/metrics", get(metrics_handler))
        .route("/healthz", get(health_handler))
        .route("/readyz", get(ready_handler))
        .with_state(metrics);

    let addr = format!("0.0.0.0:{}", port);
    info!(addr = %addr, "Starting Prometheus metrics & health server");

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    let _ = axum::serve(listener, app).await;
}
