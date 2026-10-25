FROM golang:1.22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY services/api-go/go.mod services/api-go/go.sum ./
RUN go mod download

COPY services/api-go/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /chainstream-api ./cmd/server

FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app

COPY --from=builder /chainstream-api /usr/local/bin/chainstream-api

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/chainstream-api"]
