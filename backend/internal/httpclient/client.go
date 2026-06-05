package httpclient

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	http *http.Client
}

func New(timeout time.Duration) *Client {
	return &Client{http: &http.Client{Timeout: timeout}}
}

func (c *Client) GetJSON(ctx context.Context, url string, out any) error {
	resp, err := c.Do(ctx, url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("upstream status %d for %s", resp.StatusCode, url)
	}

	if out == nil {
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func (c *Client) Do(ctx context.Context, url string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "SuperBet/0.1 (demo)")
	req.Header.Set("Accept", "application/json")
	return c.http.Do(req)
}
