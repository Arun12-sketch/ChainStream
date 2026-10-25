FROM rust:1.80-bullseye AS builder

WORKDIR /usr/src/chainstream

COPY Cargo.toml ./
COPY services/indexer-rust/Cargo.toml ./services/indexer-rust/
COPY services/event-processor-rust/Cargo.toml ./services/event-processor-rust/

RUN mkdir -p services/indexer-rust/src services/event-processor-rust/src && \
    echo "fn main() {}" > services/indexer-rust/src/main.rs && \
    echo "fn main() {}" > services/event-processor-rust/src/main.rs && \
    cargo build --release -p event-processor-rust || true

COPY services/event-processor-rust ./services/event-processor-rust

RUN touch services/event-processor-rust/src/main.rs && \
    cargo build --release -p event-processor-rust

FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/chainstream/target/release/event-processor-rust /usr/local/bin/event-processor-rust

EXPOSE 9091
ENTRYPOINT ["/usr/local/bin/event-processor-rust"]
