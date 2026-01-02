package config

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var JWTSecret []byte

func init() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Em produção, JWT_SECRET deve ser obrigatoriamente definido
		// O fallback existe apenas para facilitar desenvolvimento local
		panic("ERRO CRÍTICO: Variável de ambiente JWT_SECRET não definida. " +
			"Configure JWT_SECRET antes de iniciar a aplicação.")
	}
	if len(secret) < 32 {
		panic("ERRO CRÍTICO: JWT_SECRET deve ter pelo menos 32 caracteres para segurança adequada.")
	}
	JWTSecret = []byte(secret)
}

// Claims representa os claims do JWT
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken gera um novo token JWT
func GenerateToken(userID, role string, rememberMe bool) (string, error) {
	expiration := 24 * time.Hour
	if rememberMe {
		expiration = 7 * 24 * time.Hour // 7 dias
	}

	claims := &Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "frappyou",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret)
}

// ValidateToken valida um token JWT
func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return JWTSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}
