const axios = require("axios");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.176 Spotify/1.2.78.418 Safari/537.36";

function getonlyid(input) {
  if (!input) return null;
  if (/^[A-Za-z0-9]{22}$/.test(input)) return input;
  const match = input.match(/track\/([A-Za-z0-9]{22})/);
  return match ? match[1] : null;
}


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
    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      error: "failed...",
      detail: err?.response?.data || err.message
    });
  }
};
