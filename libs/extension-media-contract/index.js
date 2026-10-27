export const mediaURL = (mediaID, variant, token) => {
  const path = `https://media.sneat.co/m/${encodeURIComponent(mediaID)}/${variant}`;
  return token ? `${path}?token=${encodeURIComponent(token)}` : path;
};

export default mediaURL;
