package profile

import (
	"log/slog"
	"net/http"
	"strings"

	"everknow/api/internal/httpx"
	"everknow/api/internal/user"
)

const ageMax = 150

type Handlers struct {
	store *Store
}

func NewHandlers(store *Store) *Handlers {
	return &Handlers{store: store}
}

type profileResponse struct {
	ID   int64   `json:"id"`
	Name *string `json:"name"`
	Age  *int    `json:"age"`
}

func toResponse(p *Profile) profileResponse {
	return profileResponse{ID: p.ID, Name: p.Name, Age: p.Age}
}

type createProfileBody struct {
	Name string `json:"name"`
	Age  *int   `json:"age"`
}

func (h *Handlers) Create(w http.ResponseWriter, r *http.Request) {
	u := user.FromContext(r.Context())
	body, err := httpx.DecodeJSON[createProfileBody](r)
	if err != nil {
		httpx.WriteError(w, err)
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		httpx.WriteError(w, httpx.BadRequest("name is required"))
		return
	}
	if body.Age != nil && (*body.Age < 0 || *body.Age > ageMax) {
		httpx.WriteError(w, httpx.BadRequest("invalid age"))
		return
	}

	p, err := h.store.Create(r.Context(), u.ID, &name, body.Age)
	if err != nil {
		slog.ErrorContext(r.Context(), "create profile", "err", err)
		httpx.WriteError(w, httpx.InternalServer("failed to create profile"))
		return
	}
	slog.InfoContext(r.Context(), "profile created", "user_id", u.ID, "profile_id", p.ID)
	httpx.WriteJSON(w, http.StatusCreated, toResponse(p))
}

func (h *Handlers) List(w http.ResponseWriter, r *http.Request) {
	u := user.FromContext(r.Context())
	profiles, err := h.store.ListByUser(r.Context(), u.ID)
	if err != nil {
		slog.ErrorContext(r.Context(), "list profiles", "err", err)
		httpx.WriteError(w, httpx.InternalServer("failed to list profiles"))
		return
	}
	out := make([]profileResponse, 0, len(profiles))
	for _, p := range profiles {
		out = append(out, toResponse(p))
	}
	httpx.WriteJSON(w, http.StatusOK, out)
}
