package models4template

import (
	"testing"
)

func TestNewExampleItemKey(t *testing.T) {
	key := NewExampleItemKey("item1")
	if key == nil || key.ID != "item1" {
		t.Fatalf("unexpected key: %v", key)
	}
}

func TestNewExampleItemRecord(t *testing.T) {
	record, dbo := NewExampleItemRecord("item1")
	if record == nil {
		t.Fatal("expected non-nil record")
	}
	if dbo == nil {
		t.Fatal("expected non-nil dbo")
	}
	if record.Key().ID != "item1" {
		t.Fatalf("unexpected key id: %v", record.Key().ID)
	}
}
