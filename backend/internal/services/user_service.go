package services

import (
	"context"
	"superbet/backend/internal/db"
	"superbet/backend/internal/models"
)

type UserService struct {
	db *db.DB
}

func NewUserService(database *db.DB) *UserService {
	return &UserService{db: database}
}

func (s *UserService) Login(ctx context.Context, username string) (*models.User, error) {
	u, err := s.db.GetUserByUsername(username)
	if err != nil {
		return nil, err
	}
	if u == nil {
		// Criar usuário demo com saldo inicial
		return s.db.CreateUser(username, 1000.0)
	}
	return u, nil
}

func (s *UserService) GetUser(username string) (*models.User, error) {
	return s.db.GetUserByUsername(username)
}
