export function createBanner(version) {
	return `/* @preserve
 * GoLayers ${version}, Google Maps JavaScript Web API Extensions/ Wrappers
 * for OGC (WMS, WFS, ...), ArcGIS (REST, OGC enabled, ...) & other Geospatial Map Services/ Layers/ Resources.
 * (c) 2021 - ${new Date().getFullYear()} Mohamed Ali.
 */
`;
}