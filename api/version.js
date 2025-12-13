const axios = require("axios");

module.exports = async function (req, res) {
  try {
    const response = await axios.post(
      "https://api.spicylyrics.org/query",
      {
        jobs: [{ handler: "ext_version" }],
        client: { version: "5.18.55" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.176 Spotify/1.2.78.418 Safari/537.36"
        }
      }
    );

    const version =
      response.data?.jobs?.[0]?.result?.responseData;

    if (!version) {
      res.status(500).json({ error: "invalid res" });
      return;
    }

    res.json({ version });
  } catch (err) {
    res.status(500).json({
      error: "req failed",
      detail: err?.response?.data || err.message
    });
  }
};
