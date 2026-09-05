# betterwaterguide: Flow reference

An information sidebar beside an open reading surface; water-flow bars and a system comparison band.

This site's homepage, masthead, footer, article and library templates are maintained in this repository. `assets/css/main.css` is the only presentation stylesheet and imports no shared theme. `data/presentation.json` prevents the worker scaffolder from replacing the design.

## Visual contract

The homepage composition in `layouts/index.html` is specific to this publication. Preserve its hierarchy, navigation treatment and reading direction when making changes; a fleet-wide hero/card layout must not replace it. The reading treatment is rail; the library uses rows. Colours are #ffffff, #153e57, #006698, #dff4fa; typography uses Arial,Helvetica,sans-serif.

## Reader paths

- Water & filtration: /guides/
- Compare systems: /vs/
- Filter reviews: /reviews/
- Filter shortlists: /best/

## Maintenance

Build with Hugo and inspect the homepage, a library, a guide and a commercial page at desktop and phone widths. Compare screenshots with neighbouring portfolio sites, not just this site in isolation. Different filenames, class names or hashes are not proof of visual distinction.

Keep real content, canonical URLs, author identity, analytics, product destinations and affiliate disclosures intact. Shared widget bug fixes must be reviewed against this site's local files. There is no claim that a visual redesign conceals common ownership or produces an SEO or conversion gain.
