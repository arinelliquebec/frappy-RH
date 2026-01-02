package handlers

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func TestCleanCPF(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"CPF with dots and dash", "123.456.789-00", "12345678900"},
		{"CPF already clean", "12345678900", "12345678900"},
		{"CPF with spaces", "123 456 789 00", "12345678900"},
		{"CPF with mixed chars", "123.456.789-00 ", "12345678900"},
		{"Empty CPF", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := cleanCPF(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsEmailAllowed(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		{"Fradema domain", "user@fradema.com.br", true},
		{"Frademaconstrucoes domain", "user@frademaconstrucoes.com.br", true},
		{"Facilite domain", "user@facilite.com.br", true},
		{"CID Imobiliaria domain", "user@cidimobiliaria.com.br", true},
		{"Gmail not allowed", "user@gmail.com", false},
		{"Hotmail not allowed", "user@hotmail.com", false},
		{"Invalid email format", "invalid-email", false},
		{"Empty email", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isEmailAllowed(tt.email)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestLoginValidation(t *testing.T) {
	app := fiber.New()
	app.Post("/api/auth/login", Login)

	tests := []struct {
		name           string
		body           map[string]interface{}
		expectedStatus int
	}{
		{
			name: "Missing CPF",
			body: map[string]interface{}{
				"password": "test123",
			},
			expectedStatus: fiber.StatusBadRequest,
		},
		{
			name: "Missing password",
			body: map[string]interface{}{
				"cpf": "12345678900",
			},
			expectedStatus: fiber.StatusBadRequest,
		},
		{
			name: "Empty body",
			body: map[string]interface{}{},
			expectedStatus: fiber.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bodyBytes, _ := json.Marshal(tt.body)
			req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")

			resp, err := app.Test(req, -1)
			assert.NoError(t, err)
			assert.Equal(t, tt.expectedStatus, resp.StatusCode)
		})
	}
}

