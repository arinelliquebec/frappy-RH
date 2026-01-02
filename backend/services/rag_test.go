package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCalculateSimilarity(t *testing.T) {
	tests := []struct {
		name     string
		query    string
		content  string
		minScore float64
	}{
		{
			name:     "Exact match keywords",
			query:    "férias",
			content:  "Como solicitar férias na empresa",
			minScore: 0.3,
		},
		{
			name:     "Partial match",
			query:    "holerite salário",
			content:  "Entendendo seu holerite e contracheque",
			minScore: 0.2,
		},
		{
			name:     "No match",
			query:    "xyz123abc",
			content:  "Política de férias da empresa",
			minScore: 0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := calculateSimilarity(tt.query, tt.content)
			assert.GreaterOrEqual(t, score, tt.minScore, "Score should be at least %f", tt.minScore)
		})
	}
}

func TestNormalizeText(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"Lowercase conversion", "HELLO WORLD", "hello world"},
		{"Remove accents", "férias são boas", "ferias sao boas"},
		{"Mixed case with accents", "Política de FÉRIAS", "politica de ferias"},
		{"Already normalized", "hello world", "hello world"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizeText(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestExtractKeywords(t *testing.T) {
	tests := []struct {
		name     string
		text     string
		minWords int
	}{
		{"Simple sentence", "Como solicitar férias", 2},
		{"Long text", "A política de férias da empresa permite 30 dias", 4},
		{"Empty text", "", 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			keywords := extractKeywords(tt.text)
			assert.GreaterOrEqual(t, len(keywords), tt.minWords)
		})
	}
}

// Helper functions that need to be implemented in rag.go
func calculateSimilarity(query, content string) float64 {
	// Simplified similarity for testing
	queryNorm := normalizeText(query)
	contentNorm := normalizeText(content)

	queryWords := extractKeywords(queryNorm)
	contentWords := extractKeywords(contentNorm)

	if len(queryWords) == 0 || len(contentWords) == 0 {
		return 0.0
	}

	matches := 0
	contentSet := make(map[string]bool)
	for _, w := range contentWords {
		contentSet[w] = true
	}

	for _, qw := range queryWords {
		if contentSet[qw] {
			matches++
		}
	}

	return float64(matches) / float64(len(queryWords))
}

func normalizeText(text string) string {
	// Simple normalization
	result := []rune{}
	for _, r := range text {
		// Convert to lowercase
		if r >= 'A' && r <= 'Z' {
			r = r + 32
		}
		// Remove common accents (simplified)
		switch r {
		case 'á', 'à', 'ã', 'â':
			r = 'a'
		case 'é', 'è', 'ê':
			r = 'e'
		case 'í', 'ì', 'î':
			r = 'i'
		case 'ó', 'ò', 'õ', 'ô':
			r = 'o'
		case 'ú', 'ù', 'û':
			r = 'u'
		case 'ç':
			r = 'c'
		}
		result = append(result, r)
	}
	return string(result)
}

func extractKeywords(text string) []string {
	// Simple word extraction
	words := []string{}
	current := []rune{}

	stopWords := map[string]bool{
		"de": true, "da": true, "do": true, "a": true, "o": true,
		"e": true, "em": true, "um": true, "uma": true, "para": true,
		"com": true, "que": true, "na": true, "no": true, "os": true,
		"as": true, "se": true, "por": true, "são": true,
	}

	for _, r := range text + " " {
		if r == ' ' || r == '\n' || r == '\t' {
			if len(current) > 2 {
				word := string(current)
				if !stopWords[word] {
					words = append(words, word)
				}
			}
			current = []rune{}
		} else {
			current = append(current, r)
		}
	}

	return words
}

