import L from 'leaflet';
import { getCachedTile, cacheTile } from './tileCache';

const CachedTileLayer = L.TileLayer.extend({
    // CachedTileLayer.js
    createTile(coords, done) {
        const tile = document.createElement('img');
        tile.setAttribute('role', 'presentation');

        const url = this.getTileUrl(coords);

        getCachedTile(url).then((cached) => {
            if (cached) {
                tile.src = URL.createObjectURL(cached);
                done(null, tile);
            } else {
                fetch(url, {
                    headers: {
                        'User-Agent': 'YourAppName/1.0 (contact@yourdomain.com)',
                        'Referer': 'https://yourdomain.com',
                    },
                })
                    .then((res) => {
                        if (!res.ok) throw new Error(`Tile fetch failed: ${res.status}`);
                        return res.blob();
                    })
                    .then((blob) => {
                        cacheTile(url, blob);
                        tile.src = URL.createObjectURL(blob);
                        done(null, tile);
                    })
                    .catch((err) => {
                        done(err, tile);
                    });
            }
        });

        return tile;
    },
});

export default function createCachedTileLayer(urlTemplate, options) {
    return new CachedTileLayer(urlTemplate, options);
}