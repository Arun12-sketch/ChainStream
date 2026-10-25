.PHONY: all build test test-rust test-go test-reorg test-e2e dev stop clean

all: build test

build:
	@echo "==> Compiling Rust workspace..."
	cargo build --workspace
	@echo "==> Compiling Go API service..."
	cd services/api-go && go build -v ./cmd/server
	@echo "==> Building Next.js Control Center Dashboard..."
	cd services/dashboard && npm run build

test: test-rust test-go test-reorg

test-rust:
	@echo "==> Running Rust unit tests..."
	cargo test --workspace

test-go:
	@echo "==> Running Go unit and API tests..."
	cd services/api-go && go test -v ./...

test-reorg:
	@echo "==> Running deterministic blockchain reorganization tests..."
	cd tests && go test -v ./...

test-e2e:
	@echo "==> Running End-to-End integration test pipeline..."
	./tests/integration/e2e_pipeline_test.sh

dev:
	@echo "==> Launching ChainStream local docker stack..."
	docker compose up -d

stop:
	@echo "==> Stopping ChainStream local docker stack..."
	docker compose down

clean:
	@echo "==> Cleaning build artifacts..."
	cargo clean
	rm -f services/api-go/server /tmp/chainstream-api-test
	rm -rf services/dashboard/.next services/dashboard/out
