/**
 * AUTO-GENERATED — do not edit by hand.
 * Run `npm run sync` to regenerate from public/albums/.
 */
const B = import.meta.env.BASE_URL
const a = (p) => `${B}albums/${p}`

export const ALBUMS = {
  'punta-garrobo': {
    order: 1,
    title: "Punta Garrobo",
    type: {"es":"Palapa Monumental","en":"Monumental Palapa"},
    location: {"es":"Zihuatanejo, Gro. · MX","en":"Zihuatanejo, Gro. · MX"},
    hero: a('punta-garrobo/01-cumbrera.jpeg'),
    images: [
      { src: a('punta-garrobo/01-cumbrera.jpeg'), caption: {"es":"Cumbrera monumental","en":"Monumental ridge"} },
      { src: a('punta-garrobo/02-vista-mar.jpeg'), caption: {"es":"Vista desde el mar","en":"View from the sea"} },
      { src: a('punta-garrobo/03-jungla.jpeg'), caption: {"es":"Integración al entorno","en":"Integration with the landscape"} },
      { src: a('punta-garrobo/04-pergola-acceso.jpeg'), caption: {"es":"Pérgola de acceso","en":"Entry pergola"} },
    ],
  },
  'delfiniti': {
    order: 2,
    title: "Delfiniti",
    type: {"es":"Pérgola y Deck","en":"Pergola & Deck"},
    location: {"es":"Costa del Pacífico · MX","en":"Pacific Coast · MX"},
    hero: a('delfiniti/01-pergola.jpeg'),
    images: [
      { src: a('delfiniti/01-pergola.jpeg'), caption: {"es":"Pérgola principal","en":"Main pergola"} },
      { src: a('delfiniti/02-deck.jpeg'), caption: {"es":"Deck de madera","en":"Timber deck"} },
      { src: a('delfiniti/03-alberca.jpeg'), caption: {"es":"Vista a la alberca","en":"Pool view"} },
    ],
  },
  'casa-frijol': {
    order: 3,
    title: "Casa Frijol",
    type: {"es":"Conjunto Residencial","en":"Residential"},
    location: {"es":"Costa del Pacífico · MX","en":"Pacific Coast · MX"},
    hero: a('casa-frijol/01-deck-bahia.jpeg'),
    images: [
      { src: a('casa-frijol/01-deck-bahia.jpeg'), caption: {"es":"Deck sobre la bahía","en":"Deck over the bay"} },
      { src: a('casa-frijol/02-detalle-parota.jpeg'), caption: {"es":"Detalle de parota","en":"Parota detail"} },
    ],
  },
  'tanta-vida': {
    order: 4,
    title: "Tanta Vida",
    type: {"es":"Palapa de Costa","en":"Coastal Palapa"},
    location: {"es":"Costa del Pacífico · MX","en":"Pacific Coast · MX"},
    hero: a('tanta-vida/01-palapa-costa.jpeg'),
    images: [
      { src: a('tanta-vida/01-palapa-costa.jpeg'), caption: {"es":"Palapa de costa","en":"Coastal palapa"} },
    ],
  },
}

export const GALLERY = [
  {
    n: '01',
    slug: 'punta-garrobo',
    title: "Punta Garrobo",
    type: {"es":"Palapa Monumental","en":"Monumental Palapa"},
    location: {"es":"Zihuatanejo, Gro. · MX","en":"Zihuatanejo, Gro. · MX"},
    img: a('punta-garrobo/01-cumbrera.jpeg'),
  },
  {
    n: '02',
    slug: 'delfiniti',
    title: "Delfiniti",
    type: {"es":"Pérgola y Deck","en":"Pergola & Deck"},
    location: {"es":"Costa del Pacífico · MX","en":"Pacific Coast · MX"},
    img: a('delfiniti/01-pergola.jpeg'),
  },
  {
    n: '03',
    slug: 'casa-frijol',
    title: "Casa Frijol",
    type: {"es":"Conjunto Residencial","en":"Residential"},
    location: {"es":"Costa del Pacífico · MX","en":"Pacific Coast · MX"},
    img: a('casa-frijol/01-deck-bahia.jpeg'),
  },
  {
    n: '04',
    slug: 'tanta-vida',
    title: "Tanta Vida",
    type: {"es":"Palapa de Costa","en":"Coastal Palapa"},
    location: {"es":"Costa del Pacífico · MX","en":"Pacific Coast · MX"},
    img: a('tanta-vida/01-palapa-costa.jpeg'),
  },
]
