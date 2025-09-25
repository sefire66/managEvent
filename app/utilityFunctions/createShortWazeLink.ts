export async function shortenUrlIsGd(longUrl: string): Promise<string> {
  const apiUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`;
  const res = await fetch(apiUrl);

  if (!res.ok) {
    console.error("קיצור הקישור נכשל", await res.text());
    return longUrl; // במקרה של שגיאה נחזיר את המקורי
  }

  return await res.text();
}

export async function createShortWazeLink(address: string): Promise<string> {
  const encodedAddress = encodeURIComponent(address);
  const wazeLong = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
  const wazeShort = await shortenUrlIsGd(wazeLong);
  return wazeShort;
}
