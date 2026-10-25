FROM rust:1.80-bullseye AS builder

WORKDIR /usr/src/chainstream

# Copy Cargo manifests for dependency caching
COPY Cargo.toml ./
COPY services/indexer-rust/Cargo.toml ./services/indexer-rust/
COPY services/event-processor-rust/Cargo.toml ./services/event-processor-rust/

# Dummy builds for caching
RUN mkdir -p services/indexer-rust/src services/event-processor-rust/src && \
    echo "fn main() {}" > services/indexer-rust/src/main.rs && \
    echo "fn main() {}" > services/event-processor-rust/src/main.rs && \
    cargo build --release -p indexer-rust || true

# Copy actual source code
COPY services/indexer-rust ./services/indexer-rust
COPY packages ./packages

RUN touch services/indexer-rust/src/main.rs && \
    cargo build --release -p indexer-rust

# Runtime image
FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/chainstream/target/release/indexer-rust /usr/local/bin/indexer-rust

EXPOSE 9090
ENTRYPOINT ["/usr/local/bin/indexer-rust"]
