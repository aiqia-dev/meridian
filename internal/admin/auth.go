package admin

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims represents JWT claims
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// ValidateCredentials checks if username and password match config
func ValidateCredentials(username, password string, config Config) bool {
	usernameMatch := subtle.ConstantTimeCompare([]byte(username), []byte(config.Username)) == 1
	passwordMatch := subtle.ConstantTimeCompare([]byte(password), []byte(config.Password)) == 1
	return usernameMatch && passwordMatch
}

// GenerateJWT creates a new JWT token
func GenerateJWT(username string, secret []byte) (string, time.Time, error) {
	expiresAt := time.Now().Add(24 * time.Hour)

	claims := Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "meridian-admin",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(secret)
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

// ValidateJWT validates a JWT token and returns claims
func ValidateJWT(tokenString string, secret []byte) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return secret, nil
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// GenerateRandomSecret generates a random secret for JWT signing
func GenerateRandomSecret() ([]byte, error) {
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return nil, err
	}
	return secret, nil
}

// SecretFromString converts a hex string to bytes, or generates random if empty
func SecretFromString(s string) ([]byte, error) {
	if s == "" {
		return GenerateRandomSecret()
	}
	// If it looks like hex, decode it
	if len(s) == 64 {
		return hex.DecodeString(s)
	}
	// Otherwise use as-is (padded/truncated to 32 bytes)
	secret := make([]byte, 32)
	copy(secret, []byte(s))
	return secret, nil
}
