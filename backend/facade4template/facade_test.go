package facade4template

import (
	"context"
	"errors"
	"testing"

	"github.com/dal-go/dalgo/dal"
	"github.com/sneat-co/sneat-go-core/sneatcoretesting"
)

// fakeIDGenerator is a trivial IDGenerator fake — no mocking framework needed
// for a one-method port (extension-backend-architecture.md: "Domain tests
// fake the port").
type fakeIDGenerator struct{ next string }

func (f fakeIDGenerator) NewID(context.Context) (string, error) { return f.next, nil }

func TestFacade_CreateExampleItem(t *testing.T) {
	f := NewFacade(sneatcoretesting.NewMemoryDB(), fakeIDGenerator{next: "item1"})

	id, err := f.CreateExampleItem(context.Background(), "My item")
	if err != nil {
		t.Fatalf("CreateExampleItem: %v", err)
	}
	if id != "item1" {
		t.Errorf("id = %q, want %q", id, "item1")
	}
}

func TestFacade_CreateExampleItem_ValidationError(t *testing.T) {
	f := NewFacade(sneatcoretesting.NewMemoryDB(), fakeIDGenerator{next: "item1"})

	if _, err := f.CreateExampleItem(context.Background(), ""); err == nil {
		t.Error("expected validation error for empty title, got nil")
	}
}

type errorIDGenerator struct{}

func (e errorIDGenerator) NewID(context.Context) (string, error) {
	return "", errors.New("id generator error")
}

func TestFacade_CreateExampleItem_IDError(t *testing.T) {
	f := NewFacade(sneatcoretesting.NewMemoryDB(), errorIDGenerator{})

	if _, err := f.CreateExampleItem(context.Background(), "My item"); err == nil {
		t.Error("expected ID generator error, got nil")
	}
}

type errorDB struct {
	dal.DB
}

func (e errorDB) RunReadwriteTransaction(ctx context.Context, f func(ctx context.Context, tx dal.ReadwriteTransaction) error, opts ...dal.TransactionOption) error {
	return errors.New("transaction error")
}

func TestFacade_CreateExampleItem_DBError(t *testing.T) {
	f := NewFacade(errorDB{}, fakeIDGenerator{next: "item1"})

	if _, err := f.CreateExampleItem(context.Background(), "My item"); err == nil {
		t.Error("expected DB transaction error, got nil")
	}
}
