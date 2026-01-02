package config

import (
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestGenerateToken(t *testing.T) {
	// Setup
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-purposes")

	tests := []struct {
		name       string
		userID     string
		role       string
		rememberMe bool
	}{
		{"Regular user token", "user-123", "user", false},
		{"Admin token", "admin-456", "admin", false},
		{"Remember me token", "user-789", "user", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := GenerateToken(tt.userID, tt.role, tt.rememberMe)

			assert.NoError(t, err)
			assert.NotEmpty(t, token)

			// Verify token is valid JWT format
			parts := 0
			for _, c := range token {
				if c == '.' {
					parts++
				}
			}
			assert.Equal(t, 2, parts, "JWT should have 3 parts separated by 2 dots")
		})
	}
}

func TestValidateToken(t *testing.T) {
	// Setup
	secret := "test-secret-key-for-testing-purposes"
	os.Setenv("JWT_SECRET", secret)

	t.Run("Valid token", func(t *testing.T) {
		token, _ := GenerateToken("user-123", "user", false)
		claims, err := ValidateToken(token)

		assert.NoError(t, err)
		assert.NotNil(t, claims)
		assert.Equal(t, "user-123", claims.UserID)
		assert.Equal(t, "user", claims.Role)
	})

	t.Run("Expired token", func(t *testing.T) {
		// Create an expired token manually
		claims := &JWTClaims{
			UserID: "user-123",
			Role:   "user",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
				Issuer:    "frappyou",
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, _ := token.SignedString([]byte(secret))

		_, err := ValidateToken(tokenString)
		assert.Error(t, err)
	})

	t.Run("Invalid token", func(t *testing.T) {
		_, err := ValidateToken("invalid.token.string")
		assert.Error(t, err)
	})

	t.Run("Empty token", func(t *testing.T) {
		_, err := ValidateToken("")
		assert.Error(t, err)
	})
}

func TestTokenExpiration(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-purposes")

	t.Run("Regular token expiration", func(t *testing.T) {
		token, _ := GenerateToken("user-123", "user", false)
		claims, err := ValidateToken(token)

		assert.NoError(t, err)

		// Regular token should expire in ~24 hours
		expiresIn := time.Until(claims.ExpiresAt.Time)
		assert.True(t, expiresIn > 23*time.Hour, "Regular token should expire in ~24 hours")
		assert.True(t, expiresIn < 25*time.Hour, "Regular token should expire in ~24 hours")
	})

	t.Run("Remember me token expiration", func(t *testing.T) {
		token, _ := GenerateToken("user-123", "user", true)
		claims, err := ValidateToken(token)

		assert.NoError(t, err)

		// Remember me token should expire in ~30 days
		expiresIn := time.Until(claims.ExpiresAt.Time)
		assert.True(t, expiresIn > 29*24*time.Hour, "Remember me token should expire in ~30 days")
		assert.True(t, expiresIn < 31*24*time.Hour, "Remember me token should expire in ~30 days")
	})
}

