const axios = require("axios");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.176 Spotify/1.2.78.418 Safari/537.36";

function extractSpotifyId(input) {
  if (!input) return null;

  // raw ID
  if (/^[A-Za-z0-9]{22}$/.test(input)) return input;

  // spotify link
  const match = input.match(/track\/([A-Za-z0-9]{22})/);
  return match ? match[1] : null;
}

exports.page = (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>SpicyLyrics Search</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #0f172a;
      color: #e5e7eb;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .box {
      background: #020617;
      padding: 32px;
      border-radius: 12px;
      width: 420px;
      box-shadow: 0 0 40px rgba(0,0,0,.6);
    }
    h1 {
      margin: 0 0 16px;
      font-size: 22px;
    }
    input {
      width: 100%;
      padding: 12px;
      border-radius: 8px;
      border: none;
      margin-bottom: 12px;
      background: #020617;
      color: #fff;
      outline: 1px solid #334155;
    }
    button {
      width: 100%;
      padding: 12px;
      border-radius: 8px;
      border: none;
      background: #22c55e;
      color: #020617;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover {
      background: #16a34a;
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>Search Lyrics</h1>
    <form method="POST" action="/api/lyrics">
      <input
        name="song"
        placeholder="Spotify track ID or link"
        required
      />
      <button type="submit">Fetch Lyrics</button>
    </form>
  </div>
</body>
</html>
`);
};

exports.search = async (req, res) => {
  const songInput = req.body.song;
  const songId = extractSpotifyId(songInput);

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
        client: {
          version: "5.18.55"
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      error: "Lyrics request failed",
      detail: err?.response?.data || err.message
    });
  }
};
