output "eks_cluster_name" {
  description = "EKS cluster identifier"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS API server endpoint"
  value       = module.eks.cluster_endpoint
}

output "rds_postgres_endpoint" {
  description = "RDS PostgreSQL master endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "msk_bootstrap_brokers" {
  description = "MSK Kafka cluster bootstrap brokers"
  value       = aws_msk_cluster.kafka.bootstrap_brokers
}

output "elasticache_redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}
