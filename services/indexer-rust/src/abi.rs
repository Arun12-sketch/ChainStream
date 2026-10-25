use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tiny_keccak::{Hasher, Keccak};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecodedEvent {
    pub event_name: String,
    pub event_signature: String,
    pub decoded_params: Value,
}

pub struct AbiDecoder {
    // Known signature hashes to event names and signatures
    signatures: Vec<EventDefinition>,
}

struct EventDefinition {
    pub name: &'static str,
    pub signature: &'static str,
    pub topic0: &'static str,
}

impl Default for AbiDecoder {
    fn default() -> Self {
        Self::new()
    }
}

impl AbiDecoder {
    pub fn new() -> Self {
        let signatures = vec![
            EventDefinition {
                name: "Transfer",
                signature: "Transfer(address,address,uint256)",
                topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            },
            EventDefinition {
                name: "Approval",
                signature: "Approval(address,address,uint256)",
                topic0: "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
            },
            EventDefinition {
                name: "Swap",
                signature: "Swap(address,address,int256,int256,uint160,uint128,int24)",
                topic0: "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",
            },
            EventDefinition {
                name: "Mint",
                signature: "Mint(address,int24,int24,uint128,uint256,uint256)",
                topic0: "0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde",
            },
        ];

        Self { signatures }
    }

    pub fn compute_keccak256(input: &str) -> String {
        let mut keccak = Keccak::v256();
        let mut output = [0u8; 32];
        keccak.update(input.as_bytes());
        keccak.finalize(&mut output);
        format!("0x{}", hex::encode(output))
    }

    pub fn decode_log(&self, topics: &[String], data: &str) -> Option<DecodedEvent> {
        let topic0 = topics.get(0)?;
        let topic0_lower = topic0.to_lowercase();

        for def in &self.signatures {
            if def.topic0 == topic0_lower {
                match def.name {
                    "Transfer" => {
                        let from = topics.get(1).map(|t| Self::topic_to_address(t)).unwrap_or_default();
                        let to = topics.get(2).map(|t| Self::topic_to_address(t)).unwrap_or_default();
                        let value = Self::decode_u256_from_data(data, 0);

                        return Some(DecodedEvent {
                            event_name: def.name.to_string(),
                            event_signature: def.signature.to_string(),
                            decoded_params: json!({
                                "from": from,
                                "to": to,
                                "value": value
                            }),
                        });
                    }
                    "Approval" => {
                        let owner = topics.get(1).map(|t| Self::topic_to_address(t)).unwrap_or_default();
                        let spender = topics.get(2).map(|t| Self::topic_to_address(t)).unwrap_or_default();
                        let value = Self::decode_u256_from_data(data, 0);

                        return Some(DecodedEvent {
                            event_name: def.name.to_string(),
                            event_signature: def.signature.to_string(),
                            decoded_params: json!({
                                "owner": owner,
                                "spender": spender,
                                "value": value
                            }),
                        });
                    }
                    "Swap" => {
                        let sender = topics.get(1).map(|t| Self::topic_to_address(t)).unwrap_or_default();
                        let recipient = topics.get(2).map(|t| Self::topic_to_address(t)).unwrap_or_default();
                        let amount0 = Self::decode_u256_from_data(data, 0);
                        let amount1 = Self::decode_u256_from_data(data, 1);
                        let sqrt_price = Self::decode_u256_from_data(data, 2);
                        let liquidity = Self::decode_u256_from_data(data, 3);
                        let tick = Self::decode_u256_from_data(data, 4);

                        return Some(DecodedEvent {
                            event_name: def.name.to_string(),
                            event_signature: def.signature.to_string(),
                            decoded_params: json!({
                                "sender": sender,
                                "recipient": recipient,
                                "amount0": amount0,
                                "amount1": amount1,
                                "sqrtPriceX96": sqrt_price,
                                "liquidity": liquidity,
                                "tick": tick
                            }),
                        });
                    }
                    _ => {}
                }
            }
        }

        // Generic fallback for unknown events
        Some(DecodedEvent {
            event_name: "UnknownEvent".to_string(),
            event_signature: topic0_lower.clone(),
            decoded_params: json!({
                "topic0": topic0_lower,
                "topics_count": topics.len(),
                "data_length": data.len()
            }),
        })
    }

    pub fn topic_to_address(topic: &str) -> String {
        let clean = topic.trim_start_matches("0x");
        if clean.len() >= 40 {
            format!("0x{}", &clean[clean.len() - 40..])
        } else {
            format!("0x{:0>40}", clean)
        }
    }

    pub fn decode_u256_from_data(data: &str, word_index: usize) -> String {
        let clean = data.trim_start_matches("0x");
        let start = word_index * 64;
        let end = start + 64;

        if clean.len() < end {
            return "0".to_string();
        }

        let slice = &clean[start..end];
        let trimmed = slice.trim_start_matches('0');
        if trimmed.is_empty() {
            return "0".to_string();
        }

        // For large numbers, format decimal if u128 fits, else hex decimal approximation
        if let Ok(val) = u128::from_str_radix(trimmed, 16) {
            val.to_string()
        } else {
            format!("0x{}", trimmed)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_keccak256_transfer() {
        let sig = "Transfer(address,address,uint256)";
        let hash = AbiDecoder::compute_keccak256(sig);
        assert_eq!(hash, "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");
    }

    #[test]
    fn test_decode_transfer_log() {
        let decoder = AbiDecoder::new();
        let topics = vec![
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef".to_string(),
            "0x0000000000000000000000001111111111111111111111111111111111111111".to_string(),
            "0x0000000000000000000000002222222222222222222222222222222222222222".to_string(),
        ];
        let data = "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000";

        let decoded = decoder.decode_log(&topics, data).expect("Failed to decode log");
        assert_eq!(decoded.event_name, "Transfer");
        assert_eq!(decoded.decoded_params["from"], "0x1111111111111111111111111111111111111111");
        assert_eq!(decoded.decoded_params["to"], "0x2222222222222222222222222222222222222222");
        assert_eq!(decoded.decoded_params["value"], "1000000000000000000");
    }

    #[test]
    fn test_decode_approval_log() {
        let decoder = AbiDecoder::new();
        let topics = vec![
            "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925".to_string(),
            "0x0000000000000000000000003333333333333333333333333333333333333333".to_string(),
            "0x0000000000000000000000004444444444444444444444444444444444444444".to_string(),
        ];
        let data = "0x0000000000000000000000000000000000000000000000000000000000000005";

        let decoded = decoder.decode_log(&topics, data).expect("Failed to decode log");
        assert_eq!(decoded.event_name, "Approval");
        assert_eq!(decoded.decoded_params["owner"], "0x3333333333333333333333333333333333333333");
        assert_eq!(decoded.decoded_params["spender"], "0x4444444444444444444444444444444444444444");
        assert_eq!(decoded.decoded_params["value"], "5");
    }
}
