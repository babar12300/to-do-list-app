export const wallpapers = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=80",
  "/wallpapers/sharon-mccutcheon-NkQD-RHhbvY.webp",
  "/wallpapers/george-tsapakis-sSuxFPPBLUk.webp",
  "/wallpapers/joel-filipe-Wc8k-KryEPM.webp",
  "/wallpapers/erol-ahmed-XsQ8nUKpAO4.webp",
  "/wallpapers/pawel-czerwinski-hNrd99q5peI.webp",
  "/wallpapers/pawel-czerwinski-EKGBAu6QL10.webp",
  "/wallpapers/scott-webb-aHhhdKUP77M.webp",
  "/wallpapers/adrien-olichon-lHIdM7BrquM.webp",
  "/wallpapers/jakob-owens-Hj6_lgJHqC4.webp",
  "/wallpapers/jon-tyson-gIVzDR6JRWc.webp",
  "/wallpapers/pawel-czerwinski-ruJm3dBXCqw.webp",
  "/wallpapers/henrik-donnestad-t2Sai-AqIpI.webp",
  "/wallpapers/cassi-josh-lhnOvu72BM8.webp",
  "/wallpapers/vinicius-amano-f9oQZOk9vnk.webp",
  "/wallpapers/shapelined-_JBKdviweXI.webp",
  "/wallpapers/daniel-olah-VS_kFx4yF5g.webp",
  "/wallpapers/vincent-burkhead-LhlxYMfnTF0.webp",
  "/wallpapers/pawel-czerwinski-8uZPynIu-rQ.webp",
  "/wallpapers/tobias-van-schneider-lHGeqh3XhRY.webp",
];

export const defaultWallpaper = wallpapers[0];

export function wallpaperThumb(url: string): string {
  return url.startsWith("/wallpapers/") ? url.replace("/wallpapers/", "/wallpapers/thumbs/") : url.replace("w=1920", "w=200");
}
