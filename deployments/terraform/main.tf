terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. VPC & Networking
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "chainstream-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true
}

# 2. AWS EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "chainstream-eks-cluster"
  cluster_version = "1.29"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    indexer_workers = {
      name           = "chainstream-workers"
      instance_types = ["c6i.xlarge"]
      min_size       = 2
      max_size       = 6
      desired_size   = 3
    }
    api_gateway = {
      name           = "chainstream-api"
      instance_types = ["m6i.large"]
      min_size       = 2
      max_size       = 8
      desired_size   = 3
    }
  }
}

# 3. Amazon RDS for PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier          = "chainstream-rds-postgres"
  allocated_storage   = 100
  max_allocated_storage = 1000
  engine              = "postgres"
  engine_version      = "16.2"
  instance_class      = "db.r6g.xlarge"
  db_name             = "chainstream"
  username            = "chainstream_admin"
  password            = var.db_password
  db_subnet_group_name = aws_db_subnet_group.db_subnets.name
  skip_final_snapshot = true
  multi_az            = true
}

resource "aws_db_subnet_group" "db_subnets" {
  name       = "chainstream-db-subnets"
  subnet_ids = module.vpc.private_subnets
}

# 4. Amazon MSK (Managed Streaming for Apache Kafka)
resource "aws_msk_cluster" "kafka" {
  cluster_name           = "chainstream-msk-kafka"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type   = "kafka.m5.large"
    client_subnets  = module.vpc.private_subnets
    security_groups = [aws_security_group.msk_sg.id]
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS_PLAINTEXT"
    }
  }
}

resource "aws_security_group" "msk_sg" {
  name   = "chainstream-msk-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 9092
    to_port     = 9092
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
}

# 5. Amazon ElastiCache for Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "chainstream-redis"
  engine               = "redis"
  node_type            = "cache.m6g.large"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis_subnets.name
}

resource "aws_elasticache_subnet_group" "redis_subnets" {
  name       = "chainstream-redis-subnets"
  subnet_ids = module.vpc.private_subnets
}

# 6. Amazon ECR Repositories
resource "aws_ecr_repository" "indexer" {
  name                 = "chainstream/indexer-rust"
  image_tag_mutability = "MUTABLE"
}

resource "aws_ecr_repository" "processor" {
  name                 = "chainstream/event-processor-rust"
  image_tag_mutability = "MUTABLE"
}

resource "aws_ecr_repository" "api" {
  name                 = "chainstream/api-go"
  image_tag_mutability = "MUTABLE"
}

resource "aws_ecr_repository" "dashboard" {
  name                 = "chainstream/dashboard"
  image_tag_mutability = "MUTABLE"
}
