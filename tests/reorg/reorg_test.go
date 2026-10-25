package reorg_test

import (
	"encoding/json"
	"os"
	"testing"
)

type ReorgFixture struct {
	ChainID          int64           `json:"chain_id"`
	Description      string          `json:"description"`
	Ancestor         FixtureBlock    `json:"ancestor"`
	BranchAOrphaned  []FixtureBlock  `json:"branch_a_orphaned"`
	BranchBCanonical []FixtureBlock  `json:"branch_b_canonical"`
}

type FixtureBlock struct {
	BlockNumber int64  `json:"block_number"`
	BlockHash   string `json:"block_hash"`
	ParentHash  string `json:"parent_hash"`
	Timestamp   int64  `json:"timestamp"`
	TxCount     int    `json:"tx_count"`
}

func TestReorgScenarioFixture(t *testing.T) {
	fixtureData, err := os.ReadFile("../../packages/test-fixtures/reorg_scenario.json")
	if err != nil {
		t.Fatalf("Failed to read test fixture: %v", err)
	}

	var fixture ReorgFixture
	if err := json.Unmarshal(fixtureData, &fixture); err != nil {
		t.Fatalf("Failed to parse fixture JSON: %v", err)
	}

	if fixture.ChainID != 11155111 {
		t.Errorf("Expected chain ID 11155111, got %d", fixture.ChainID)
	}

	if fixture.Ancestor.BlockNumber != 1000 {
		t.Errorf("Expected ancestor block 1000, got %d", fixture.Ancestor.BlockNumber)
	}

	// 1. Verify Branch A builds on ancestor
	if len(fixture.BranchAOrphaned) != 2 {
		t.Fatalf("Expected 2 orphaned blocks in branch A, got %d", len(fixture.BranchAOrphaned))
	}
	if fixture.BranchAOrphaned[0].ParentHash != fixture.Ancestor.BlockHash {
		t.Errorf("Branch A root parent must match ancestor hash")
	}

	// 2. Verify Branch B builds on ancestor and overtakes Branch A
	if len(fixture.BranchBCanonical) != 3 {
		t.Fatalf("Expected 3 canonical blocks in branch B, got %d", len(fixture.BranchBCanonical))
	}
	if fixture.BranchBCanonical[0].ParentHash != fixture.Ancestor.BlockHash {
		t.Errorf("Branch B root parent must match ancestor hash")
	}

	// 3. Confirm head mismatch between branch A (block 1002) and branch B (block 1003)
	lastA := fixture.BranchAOrphaned[len(fixture.BranchAOrphaned)-1]
	lastB := fixture.BranchBCanonical[len(fixture.BranchBCanonical)-1]

	if lastA.BlockHash == lastB.BlockHash {
		t.Errorf("Branch A and Branch B must have divergent block hashes")
	}
}
