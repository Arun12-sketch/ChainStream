package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port        int
	DatabaseURL string
	RedisURL    string
	Environment string
	CorsOrigins string
}

func Load() *Config {
	port := 8080
	if p, err := strconv.Atoi(os.Getenv("PORT")); err == nil && p > 0 {
		port = p
	}

	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		dbUrl = "postgres://postgres:postgres@localhost:5432/chainstream?sslmode=disable"
	}

	redisUrl := os.Getenv("REDIS_URL")
	if redisUrl == "" {
		redisUrl = "redis://localhost:6379"
	}

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	origins := os.Getenv("CORS_ORIGINS")
	if origins == "" {
		origins = "*"
	}

	return &Config{
		Port:        port,
		DatabaseURL: dbUrl,
		RedisURL:    redisUrl,
		Environment: env,
		CorsOrigins: origins,
	}
}
