import L from 'leaflet';
import { getCachedTile, cacheTile } from './tileCache';

const CachedTileLayer = L.TileLayer.extend({
    createTile(coords, done) {
        const tile = document.createElement('img');
        tile.setAttribute('role', 'presentation');

        const url = this.getTileUrl(coords);

        getCachedTile(url).then((cached) => {
            if (cached) {
                // Serve from IndexedDB cache
                tile.src = URL.createObjectURL(cached);
                done(null, tile);
            } else {
                // Fetch from network and cache it
                fetch(url)
                    .then((res) => res.blob())
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