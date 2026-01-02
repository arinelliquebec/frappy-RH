package config

import (
	"log"

	"github.com/joho/godotenv"
)

func init() {
	// Carrega variáveis de ambiente ANTES de qualquer outra inicialização
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  Arquivo .env não encontrado, usando variáveis do sistema")
	}
}
