# ChainStream — Production Deployment Guide

## 1. Local Development Stack (Docker Compose)

The local stack spins up PostgreSQL 16, Redis 7, Apache Kafka (KRaft mode), Prometheus, Grafana, Rust Indexers, Go API, and the Next.js Control Center Dashboard:

```bash
# Clone and enter repo
cd chainstream

# Copy environment template
cp .env.example .env

# Launch all services
make dev

# Check cluster status
docker compose ps
```

### Accessing Endpoints:
- **Next.js Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Go API Gateway**: [http://localhost:8080](http://localhost:8080)
- **OpenAPI / Swagger UI Docs**: [http://localhost:8080/docs](http://localhost:8080/docs)
- **Rust Indexer Metrics**: [http://localhost:9090/metrics](http://localhost:9090/metrics)
- **Prometheus UI**: [http://localhost:9099](http://localhost:9099)

## 2. Kubernetes Deployment (AWS EKS)

```bash
# 1. Create Namespace
kubectl apply -f deployments/kubernetes/namespace.yaml

# 2. Apply ConfigMap and Secrets
kubectl apply -f deployments/kubernetes/configmap.yaml

# 3. Deploy Core Indexer, API, and Dashboard
kubectl apply -f deployments/kubernetes/indexer-deployment.yaml
kubectl apply -f deployments/kubernetes/api-deployment.yaml
kubectl apply -f deployments/kubernetes/dashboard-deployment.yaml

# 4. Apply HPA, PDB, and Ingress
kubectl apply -f deployments/kubernetes/ingress.yaml
```

## 3. Infrastructure as Code (Terraform)

Provision the managed AWS dependencies (EKS cluster, Amazon MSK Kafka, Amazon RDS PostgreSQL 16, ElastiCache Redis, and ECR):

```bash
cd deployments/terraform

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```
