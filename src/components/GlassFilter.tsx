// Displacement map: neutral grey (no shift) in the middle, with red/green
// gradients towards the edges, so the backdrop bends only at the rim like
// light through the curved edge of a glass lens.
const lensMap = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
  <defs>
    <linearGradient id="x"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/></linearGradient>
    <linearGradient id="y" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#0f0"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <rect width="100" height="100" fill="url(#x)"/>
  <rect width="100" height="100" fill="url(#y)" style="mix-blend-mode:screen"/>
  <rect x="12" y="12" width="76" height="76" rx="30" fill="rgb(128,128,128)" filter="url(#soft)"/>
</svg>`)}`;

// Only Chromium can use SVG filters in backdrop-filter; other browsers keep
// the frosted glass without the edge refraction.
export function supportsRefraction() {
  const nav = navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } };
  return nav.userAgentData?.brands.some((b) => b.brand === "Chromium") ?? false;
}

export function GlassFilter() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
      <filter
        id="liquid-lens"
        x="0"
        y="0"
        width="100%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feImage
          href={lensMap}
          x="0"
          y="0"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          result="map"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale="20"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
