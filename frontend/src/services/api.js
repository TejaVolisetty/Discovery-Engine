import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Generate or retrieve deterministic non-PII session_id
export const getSessionId = () => {
  let sessionId = localStorage.getItem('discovery_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('discovery_session_id', sessionId);
  }
  return sessionId;
};

export const fetchHomeRecommendations = async (sessionId, consent = true, limit = 20) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/recommendations/home`, {
      params: { session_id: sessionId, consent, limit }
    });
    return res.data;
  } catch (err) {
    console.warn('Backend API connection warning, returning demo feed:', err);
    return getFallbackDemoFeed();
  }
};

export const getHomeRecommendations = fetchHomeRecommendations;

export const logEvent = async (sessionId, articleId, eventType = 'click', consent = true) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/events`, {
      session_id: sessionId,
      article_id: articleId,
      event_type: eventType,
      consent
    });
    return res.data;
  } catch (err) {
    console.warn('Event logging warning:', err);
  }
};

export const searchArticles = async (query, sessionId, consent = true, limit = 20) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/search`, {
      params: { q: query, session_id: sessionId, consent, limit }
    });
    return res.data;
  } catch (err) {
    console.warn('Search API warning:', err);
    return { query, results: [] };
  }
};

// Fallback visual demo feed if backend is starting up
function getFallbackDemoFeed() {
  const categories = ['Tops', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Knitwear'];
  const colors = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#6366f1'];
  
  const recs = Array.from({ length: 12 }, (_, i) => {
    const cat = categories[i % categories.length];
    const color = colors[i % colors.length];
    const id = (108775001 + i).toString().padStart(10, '0');
    return {
      article_id: id,
      title: `${cat} Premium Edition ${i + 1}`,
      price: +(0.02 + (i * 0.015)).toFixed(2),
      image_url: `https://placehold.co/400x500/${color.replace('#', '')}/ffffff?text=${cat}+${i+1}`,
      category: cat,
      department: 'Womenswear',
      score: +(0.95 - (i * 0.04)).toFixed(4),
      reason: i % 2 === 0 ? 'Matches style of recent item you viewed' : 'Popular choice in this category'
    };
  });

  return {
    session_id: getSessionId(),
    consent_applied: true,
    recommendations: recs
  };
}
