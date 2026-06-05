package static

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type Handler struct {
	dir   string
	index string
}

func New(dir string) *Handler {
	if dir == "" {
		log.Println("STATIC_DIR vazio: frontend não será servido")
	} else if info, err := os.Stat(dir); err != nil || !info.IsDir() {
		log.Printf("STATIC_DIR=%s não é um diretório válido; rode 'npm run build' em frontend/", dir)
	}
	return &Handler{dir: dir, index: "index.html"}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if h.dir == "" {
		http.Error(w, "Frontend não configurado", http.StatusNotFound)
		return
	}

	p := r.URL.Path
	if p == "/" || p == "" {
		p = "/" + h.index
	}

	full := filepath.Join(h.dir, filepath.Clean(p))

	if info, err := os.Stat(full); err == nil && !info.IsDir() {
		http.ServeFile(w, r, full)
		return
	}

	looksLikeAsset := strings.HasPrefix(p, "/assets/") ||
		strings.HasPrefix(p, "/static/") ||
		strings.HasPrefix(p, "/favicon") ||
		strings.Contains(filepath.Base(p), ".")

	if looksLikeAsset {
		http.NotFound(w, r)
		return
	}

	indexPath := filepath.Join(h.dir, h.index)
	if _, err := os.Stat(indexPath); err != nil {
		http.Error(w, "Frontend não encontrado. Execute 'npm run build' em frontend/.", http.StatusNotFound)
		return
	}
	http.ServeFile(w, r, indexPath)
}
