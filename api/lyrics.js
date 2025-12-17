const axios = require("axios");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.176 Spotify/1.2.78.418 Safari/537.36";

function getonlyid(input) {
  if (!input) return null;
  if (/^[A-Za-z0-9]{22}$/.test(input)) return input;
  const match = input.match(/track\/([A-Za-z0-9]{22})/);
  return match ? match[1] : null;
}

function formatLrcTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds - Math.floor(seconds)) * 100);
  return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}]`;
}

async function getSpotifyMetadata(id) {
  try {
    const { data } = await axios.get(`https://open.spotify.com/track/${id}`, {
      headers: { "User-Agent": USER_AGENT }
    });
    const titleMatch = data.match(/<meta property="og:title" content="(.*?)" \/>/);
    const artistMatch = data.match(/<meta property="og:description" content="(.*?) ·/);
    const durationMatch = data.match(/"duration_ms":(\d+)/);

    if (!titleMatch || !artistMatch || !durationMatch) return null;

    return {
      name: titleMatch[1],
      artist: artistMatch[1],
      durationMs: parseInt(durationMatch[1])
    };
  } catch (e) {
    console.error("Spotify scrape failed:", e.message);
    return null;
  }
}

exports.lrclib = async (req, res) => {
  const songInput = req.body.song;
  const songId = getonlyid(songInput);

  if (!songId) {
    return res.status(400).json({ error: "Invalid Spotify track ID or link" });
  }

  try {
    const meta = await getSpotifyMetadata(songId);
    if (!meta) {
      return res.status(500).send("Could not fetch track metadata from Spotify. (Scraper broke or invalid ID)");
    }
    const query = `${meta.artist} ${meta.name}`;
    const { data: results } = await axios.get("https://lrclib.net/api/search", {
      params: { q: query },
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.176 Spotify/1.2.78.418 Safari/537.36" }
    });

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(404).send("No lyrics found on Lrclib.");
    }
    
    let bestLyrics = "";
    let bestScore = -100;
    const candidates = results.slice(0, 12);
    const targetDuration = meta.durationMs / 1000.0;

    for (let i = 0; i < candidates.length; i++) {
      const doc = candidates[i];
      let score = 0;
      
      const sLyrics = doc.syncedLyrics || "";
      const pLyrics = doc.plainLyrics || "";
      const hasSynced = sLyrics.length > 10;
      const hasPlain = pLyrics.length > 10;

      if (hasSynced) score = 10;
      else if (hasPlain) score = 1;
      else continue;

      const lrcDuration = doc.duration;
      const diff = Math.abs(lrcDuration - targetDuration);

      if (diff < 2.0) score += 2;
      else if (diff < 6.0) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestLyrics = hasSynced ? sLyrics : pLyrics;
        if (score >= 12) break;
      }
    }

    if (bestScore > -1 && bestLyrics.length > 0) {
      res.set("Content-Type", "text/plain");
      return res.send(bestLyrics);
    }

    return res.status(404).send("No suitable lyrics found after filtering.");

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Error", details: err.message });
  }
};

exports.search = async (req, res) => {
  const songInput = req.body.song;
  const songId = getonlyid(songInput);
  if (!songId) {
    res.status(400).json({ error: "Invalid Spotify track ID or link" });
    return;
  }
  try {
    const response = await axios.post(
      "https://api.spicylyrics.org/query",
      {
        jobs: [
          {
            handler: "lyrics",
            args: {
              id: songId,
              auth: "SpicyLyrics-WebAuth"
            }
          }
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
          "spicylyrics-webauth": "Bearer funny"
        }
      }
    );
    if (req.headers.simple === "true") {
      const data = response.data;
      if (!data || !data.jobs || !data.jobs[0] || !data.jobs[0].result || !data.jobs[0].result.responseData) {
        return res.status(404).send("lyrics were not found and api prob down kms");
      }

      const responseData = data.jobs[0].result.responseData;
      const type = responseData.Type;
      let output = "";

      if (type === "Static") {
        if (responseData.Lines && Array.isArray(responseData.Lines)) {
          output = responseData.Lines.map(l => l.Text).join("\n");
        }
      } else if (type === "Line" || type === "Syllable") {
        if (responseData.Content && Array.isArray(responseData.Content)) {
          output = responseData.Content
            .filter(item => item.Type === "Vocal")
            .map(item => {
              let text = item.Text;
              let startTime = item.StartTime;
              if (type === "Syllable" && item.Lead && item.Lead.Syllables) {
                text = item.Lead.Syllables.map(s => {
                    return s.Text + (s.IsPartOfWord ? "" : " ");
                }).join("").trim();
                if (typeof startTime !== 'number' && item.Lead.Syllables.length > 0) {
                  startTime = item.Lead.Syllables[0].StartTime;
                }
              }

              if (typeof startTime === 'number' && text) {
                return `${formatLrcTime(startTime)} ${text}`;
              }
              return null;
            })
            .filter(Boolean)
            .join("\n");
        }
      } else {
        return res.status(400).send("wtf is that (yeah thats a failure so am i but shh no one knows)");
      }

      res.set("Content-Type", "text/plain");
      res.send(output);
      return;
    }
    res.json(response.data);

  } catch (err) {
    res.status(500).json({
      error: "failed...",
      detail: err?.response?.data || err.message
    });
  }
};
