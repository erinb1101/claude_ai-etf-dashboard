/**
 * Vercel Serverless Function — Yahoo Finance Proxy
 * 경로: /api/quote?ticker=SMH&type=quote
 *       /api/quote?ticker=SMH&type=history&range=1mo
 */
export default async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ticker, type = 'quote', range = '1mo' } = req.query;

  if (!ticker) {
    return res.status(400).json({ error: 'ticker is required' });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; ETF-Dashboard/1.0)',
    'Accept': 'application/json',
  };

  try {
    let url;

    if (type === 'history') {
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}`;
    } else {
      // quote: 당일 데이터
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    }

    const upstream = await fetch(url, { headers });

    if (!upstream.ok) {
      // Yahoo가 막으면 v7 fallback
      const fallbackUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${type === 'history' ? range : '1d'}`;
      const fallback = await fetch(fallbackUrl, { headers });
      if (!fallback.ok) throw new Error(`Yahoo Finance error: ${fallback.status}`);
      const data = await fallback.json();
      return res.status(200).json(data);
    }

    const data = await upstream.json();
    // 5분 캐시 (Vercel Edge Cache)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(data);

  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
