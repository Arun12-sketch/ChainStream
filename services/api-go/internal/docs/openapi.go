package docs

import (
	"net/http"
)

const OpenAPISpecJSON = `{
  "openapi": "3.0.3",
  "info": {
    "title": "ChainStream Multi-Chain Blockchain Indexer API",
    "description": "Production-grade blockchain indexing platform exposing normalized on-chain events, blocks, transactions, and real-time streaming subscriptions.",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "/api/v1",
      "description": "Current Environment"
    }
  ],
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    }
  },
  "paths": {
    "/chains": {
      "get": {
        "summary": "List supported EVM blockchains",
        "responses": {
          "200": { "description": "List of chains" }
        }
      }
    },
    "/chains/{chainId}/stats": {
      "get": {
        "summary": "Get aggregate chain indexing metrics and health",
        "parameters": [
          { "name": "chainId", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Chain statistics and lag" }
        }
      }
    },
    "/chains/{chainId}/blocks": {
      "get": {
        "summary": "Get paginated blocks",
        "parameters": [
          { "name": "chainId", "in": "path", "required": true, "schema": { "type": "integer" } },
          { "name": "cursor", "in": "query", "schema": { "type": "string" } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 25 } }
        ],
        "responses": {
          "200": { "description": "Paginated blocks" }
        }
      }
    },
    "/chains/{chainId}/blocks/latest": {
      "get": {
        "summary": "Get latest canonical block",
        "parameters": [
          { "name": "chainId", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Latest block" }
        }
      }
    },
    "/chains/{chainId}/blocks/{blockNumber}": {
      "get": {
        "summary": "Get block by number or hex",
        "parameters": [
          { "name": "chainId", "in": "path", "required": true, "schema": { "type": "integer" } },
          { "name": "blockNumber", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Block detail" }
        }
      }
    },
    "/chains/{chainId}/transactions": {
      "get": {
        "summary": "Get paginated transactions",
        "parameters": [
          { "name": "chainId", "in": "path", "required": true, "schema": { "type": "integer" } },
          { "name": "cursor", "in": "query", "schema": { "type": "string" } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 25 } }
        ],
        "responses": {
          "200": { "description": "Paginated transactions" }
        }
      }
    },
    "/chains/{chainId}/transactions/{txHash}": {
      "get": {
        "summary": "Get transaction by hash",
        "parameters": [
          { "name": "chainId", "in": "path", "required": true, "schema": { "type": "integer" } },
          { "name": "txHash", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Transaction detail" }
        }
      }
    },
    "/chains/{chainId}/events": {
      "get": {
        "summary": "Get decoded contract events",
        "parameters": [
          { "name": "chainId", "in": "path", "required": true, "schema": { "type": "integer" } },
          { "name": "contract", "in": "query", "schema": { "type": "string" } },
          { "name": "signature", "in": "query", "schema": { "type": "string" } },
          { "name": "fromBlock", "in": "query", "schema": { "type": "integer" } },
          { "name": "toBlock", "in": "query", "schema": { "type": "integer" } },
          { "name": "cursor", "in": "query", "schema": { "type": "string" } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 25 } }
        ],
        "responses": {
          "200": { "description": "Decoded events" }
        }
      }
    },
    "/workers": {
      "get": {
        "summary": "List active indexer worker leases and fencing tokens",
        "responses": {
          "200": { "description": "Worker status list" }
        }
      }
    },
    "/infrastructure": {
      "get": {
        "summary": "Get health status of all infrastructure components",
        "responses": {
          "200": { "description": "Infrastructure status" }
        }
      }
    },
    "/reorgs": {
      "get": {
        "summary": "Get chain reorganization history log",
        "responses": {
          "200": { "description": "Reorganization records" }
        }
      }
    },
    "/keys": {
      "get": {
        "summary": "List managed API keys",
        "security": [{ "ApiKeyAuth": [] }],
        "responses": {
          "200": { "description": "API keys list" }
        }
      },
      "post": {
        "summary": "Create a new API key",
        "security": [{ "ApiKeyAuth": [] }],
        "responses": {
          "201": { "description": "Created key with plaintext secret" }
        }
      }
    }
  }
}`

func ServeOpenAPIJSON(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(OpenAPISpecJSON))
}

func ServeSwaggerUI(w http.ResponseWriter, r *http.Request) {
	html := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ChainStream API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
    <style>
        body { margin: 0; background-color: #080B14; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
    <script>
        window.onload = () => {
            SwaggerUIBundle({
                url: '/api/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
            });
        };
    </script>
</body>
</html>`
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(html))
}
