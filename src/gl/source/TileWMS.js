// import proj4 from 'proj4';

function TileWMS(url, options) {
	options = options || {};

	var
		// defaults for google.maps.ImageMapTypeOptions interface
		name = 'Unnamed Layer',
		alt = name,
		minZoom = 0,
		maxZoom = 19,
		opacity = 1, // float(0 - transparent to 1.0 - opaque)
		width = 256,
		height = width,
		tileSize = new google.maps.Size(width, height), // currently only support tileSize of 256

		defaultWmsParams = {
			request: 'GetMap',
			service: 'WMS',

			version: '1.3.0', // 1.0.0, 1.1.0, 1.1.1, 1.3.0,

			layers: '',
			styles: '',

			format: 'image/png',
			transparent: true,	

			width: width,
			height: height
		},

		getTileUrl = function (point, zoom) {
			var me = this,
				normalizedCoord = getNormalizedCoord(point, zoom);
			if (!normalizedCoord) {
				return '';
			}
			var url = me.url,
				options = me.options,

				lowerCase = options.lowerCase || false,

				crs = options.crs || options.srs || Epsg.sphericalMercator.code,

				bounds3857 = xyzToBounds3857(point.x, point.y, zoom),
				bounds = bounds3857,

				extraParams = {
					version: options.version || defaultWmsParams.version,

					layers: options.layers || defaultWmsParams.layers,
					styles: options.styles || defaultWmsParams.styles,

					/*
					bgcolor: '',
					exceptions: '',
					time: '',
					sld: '',
					sld_body: ''
					*/
				},
				wmsParams = Util.assign({}, defaultWmsParams, extraParams),

				tileUrl;

			if (crs == Epsg.sphericalMercator.code || Util.contains(Epsg.sphericalMercator.aliases, crs)) {
				// bounds = bounds3857;
			} else {
				bounds = transformBounds(bounds3857, Epsg.sphericalMercator.code, crs);
			}

			wmsParams.bbox = bounds.join(',');
			if (parseFloat(wmsParams.version) >= 1.3) { // version>='1.3.0'
				wmsParams.crs = crs;
				// wmsParams.bbox = bounds.join(',');
				if (crs == Epsg.wgs84.code) {
					wmsParams.bbox = toBounds(bounds, true).join(',');
				}
			} else {
				wmsParams.srs = crs;
				// wmsParams.bbox = bounds.join(',');
			}
			/*if(options.transparent){
				wmsParams.transparent = true;
				wmsParams.format = 'image/png';
			}else{
				wmsParams.transparent = false;
				wmsParams.format = options.format || 'image/jpeg';
			}*/

			tileUrl = url + Util.getParamsString(wmsParams, url, lowerCase);
			return tileUrl;
		},

		xyzToBounds3857 = function (x, y, zoom) {
			var radius = 6378137,
				halfSize = Math.PI * radius, // epsg3857Extent = 20037508.3427892430765884088807

				xOrig = -halfSize, // x starts from right
				yOrig = halfSize, // y starts from top

				// extent = [xOrig, xOrig, yOrig, yOrig],
				// extentShort = [xOrig, yOrig],
				// worldExtent = [-180, -85, 180, 85],

				tileSize = (halfSize * 2) / Math.pow(2, zoom),

				xmin = xOrig + x * tileSize,
				xmax = xOrig + (x + 1) * tileSize,

				// remember y origin starts at top
				ymin = yOrig - (y + 1) * tileSize,
				ymax = yOrig - y * tileSize,

				bounds = [xmin, ymin, xmax, ymax];

			return bounds;
		},

		// Normalizes the coords that tiles repeat across the x axis (horizontally)
		// like the standard Google map tiles.
		getNormalizedCoord = function (point, zoom) {
			var y = point.y, // Don't wrap tiles vertically.
				x = point.x,

				// tile range in one direction range is dependent on zoom level
				// 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
				scale = 1 << zoom;
				// tileRange = scale;

			// don't repeat across y-axis (vertically)
			if (y < 0 || y >= scale) {
				return null; // null, ''
			}

			// repeat across x-axis
			if (x < 0 || x >= scale) {
				x = ((x % scale) + scale) % scale; // Wrap tiles horizontally.
			}
			return { x: x, y: y };
		},

		toBounds = function (bounds, reverseAxisOrder) {
			var ymax = bounds[3],
				xmax = bounds[2],
				ymin = bounds[1],
				xmin = bounds[0],
				bounds = reverseAxisOrder ? [ymin, xmin, ymax, xmax] : [xmin, ymin, xmax, ymax];
			return bounds;
		},

		transformBounds = function (bounds, source, dest) {
			var ymax = bounds[3],
				xmax = bounds[2],
				ymin = bounds[1],
				xmin = bounds[0],

				lowerLeft = proj4(source, dest, { x: xmin, y: ymin }), // {x:x,y:y} / [x,y]
				lowerRight = proj4(source, dest, { x: xmax, y: ymin }),
				upperLeft = proj4(source, dest, { x: xmin, y: ymax }),
				upperRight = proj4(source, dest, { x: xmax, y: ymax }),

				xminTransformed = Math.min(lowerLeft.x, upperLeft.x),
				yminTransformed = Math.min(lowerLeft.y, lowerRight.y),
				xmaxTransformed = Math.max(lowerRight.x, upperRight.x),
				ymaxTransformed = Math.max(upperLeft.y, upperRight.y),

				boundsTransformed = [xminTransformed, yminTransformed, xmaxTransformed, ymaxTransformed];
			return boundsTransformed;
		},

		opts = {
			// google.maps.ImageMapTypeOptions interface
			getTileUrl: getTileUrl,
			name: options.name || options.alt || name,
			alt: options.alt || options.name || alt,
			minZoom: options.minZoom || minZoom,
			maxZoom: options.maxZoom || maxZoom,
			opacity: options.opacity || opacity,
			tileSize: tileSize,

			// WMS params & any other options
			// params needed in getTileUrl
			url: url,
			options: options
		},
		imageMapType = new google.maps.ImageMapType(opts);

	imageMapType.baseLayer = options.baseLayer || false;

	return imageMapType;
}

function tileWMS(url, options) {
	return new TileWMS(url, options);
}

var Epsg = {
	sphericalMercator: {
		code: 'EPSG:3857',
		aliases: ['EPSG:900913', 'EPSG:3587', 'EPSG:54004', 'EPSG:41001', 'EPSG:102113', 'EPSG:102100', 'EPSG:3785', 'GOOGLE']
	},

	wgs84: {
		code: 'EPSG:4326',
		aliases: ['WGS84']
	},

	4269: {
		code: 'EPSG:4269',
		aliases: []
    }
};

var Util = {
	isArray: function (obj) {
		if (Array.isArray) {
			return Array.isArray(obj);
		} else {
			return (Object.prototype.toString.call(obj) === '[object Array]');
		}
	},

	contains: function (array, item) {
		array.some(function (value, index, array) {
			return value == item;
		});
	},

	assign: function (dest) {
		var i, j, len, src;
		for (j = 1, len = arguments.length; j < len; j++) {
			src = arguments[j];
			for (i in src) {
				dest[i] = src[i];
			}
		}
		/*
		var target = { a: 1, b: 2 },
			source = { b: 4, c: 5 },
			returnedTarget = Object.assign(target, source);
		*/
		return dest;
	},

	getParamsString: function (paramsObj, url, lowerCase) {
		/*
		url = undefined, null, ''
		url = 'http://localhost:8080/geoserver/wms'
		url = 'http://localhost:8080/geoserver/wms?'
		*/
		var newParamsObj = {},
			paramsArr = [],
			paramsString,
			i,
			key,
			value;
		for (i in paramsObj) {
			key = lowerCase ? i.toLowerCase() : i.toUpperCase();
			value = paramsObj[i];
			newParamsObj[key] = value;
			paramsArr.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
		}
		if (window.URLSearchParams) {
			var urlSearchParams = new URLSearchParams(newParamsObj);
			paramsString = urlSearchParams.toString();
		} else {
			paramsString = paramsArr.join('&');
		}
		paramsString = ((!url || url.indexOf('?') === -1) ? '?' : '&') + paramsString;
		return paramsString;
	}
};

// export default TileWMS;
export { TileWMS as default, tileWMS, Epsg, Util };