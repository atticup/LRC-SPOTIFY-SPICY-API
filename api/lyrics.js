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
              if (typeof item.StartTime === 'number' && item.Text) {
                return `${formatLrcTime(item.StartTime)} ${item.Text}`;
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
