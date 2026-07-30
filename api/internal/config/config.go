package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"
)

type EmailProvider string

const (
	EmailProviderConsole EmailProvider = "console"
	EmailProviderResend  EmailProvider = "resend"
)

type Config struct {
	Env             string
	APIAddr         string
	DatabaseURL     string
	AppBaseURL      string
	EmailProvider   EmailProvider
	EmailFrom       string
	ResendAPIKey    string
	AnthropicAPIKey string
	SessionTTL      time.Duration
	MagicLinkTTL    time.Duration
}

func (c *Config) IsDev() bool  { return c.Env == "dev" }
func (c *Config) IsProd() bool { return c.Env == "prod" }

func Load() (*Config, error) {
	dbURL, err := mustEnv("DATABASE_URL")
	if err != nil {
		return nil, err
	}
	appBaseURL, err := mustEnv("APP_BASE_URL")
	if err != nil {
		return nil, err
	}
	// Unconditional, unlike RESEND_API_KEY below: card generation has no
	// console-style stand-in, so an API without this key can't do the one
	// thing the product is for. Dev hits the real provider on purpose.
	anthropicAPIKey, err := mustEnv("ANTHROPIC_API_KEY")
	if err != nil {
		return nil, err
	}

	provider := EmailProvider(envOr("EMAIL_PROVIDER", "console"))
	if provider != EmailProviderConsole && provider != EmailProviderResend {
		return nil, fmt.Errorf("invalid EMAIL_PROVIDER: %q (expected %q or %q)",
			provider, EmailProviderConsole, EmailProviderResend)
	}
	if provider == EmailProviderResend && os.Getenv("RESEND_API_KEY") == "" {
		return nil, errors.New("EMAIL_PROVIDER=resend requires RESEND_API_KEY to be set")
	}

	sessionTTLHours, err := envInt("SESSION_TTL_HOURS", 720)
	if err != nil {
		return nil, err
	}
	magicTTLMin, err := envInt("MAGIC_LINK_TTL_MINUTES", 15)
	if err != nil {
		return nil, err
	}

	return &Config{
		Env:             envOr("APP_ENV", "dev"),
		APIAddr:         ":" + envOr("API_PORT", "8080"),
		DatabaseURL:     dbURL,
		AppBaseURL:      appBaseURL,
		EmailProvider:   provider,
		EmailFrom:       envOr("EMAIL_FROM", "hello@everknow.app"),
		ResendAPIKey:    os.Getenv("RESEND_API_KEY"),
		AnthropicAPIKey: anthropicAPIKey,
		SessionTTL:      time.Duration(sessionTTLHours) * time.Hour,
		MagicLinkTTL:    time.Duration(magicTTLMin) * time.Minute,
	}, nil
}

func mustEnv(key string) (string, error) {
	v := os.Getenv(key)
	if v == "" {
		return "", fmt.Errorf("missing required env var: %s", key)
	}
	return v, nil
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) (int, error) {
	v := os.Getenv(key)
	if v == "" {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("invalid int env var %s=%q: %w", key, v, err)
	}
	return n, nil
}
