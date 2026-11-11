/**
 * i18n.js — all visitor-facing text, ES and EN.
 *
 * Text that depends on an unconfirmed fact is written as a function of FACTS
 * (see facts.js) and resolves to a version without the claim, or to null so
 * the UI hides it. Nothing here may contain a bracketed placeholder.
 */
import { FACTS, say, EMAIL } from './facts.js'

const f = FACTS

export const T = {
  es: {
    brand: 'Estructuras del Pacífico',
    skip: 'Saltar al contenido',
    nav: { projects: 'Obras', services: 'Servicios', studio: 'Estudio', quote: 'Cotizar', privacy: 'Aviso de privacidad' },
    menu: 'Menú',
    close: 'Cerrar',
    cta: 'Cotizar proyecto',
    langLabel: 'Idioma',

    hero: {
      label: 'Zihuatanejo · Ixtapa · Acapulco',
      title: 'Palapas monumentales y estructuras de madera para la costa del Pacífico.',
      lede: 'Diseño y construcción de palapas monumentales, pérgolas y decks para hoteles, restaurantes y residencias.',
      secondary: 'Ver obras',
      alt: 'Palapa monumental de palma sobre un acantilado frente al océano Pacífico, con deck de madera en primer plano',
    },

    press: {
      label: 'Reconocimiento',
      line: (p) =>
        `Palapa construida por Estructuras del Pacífico en Punta Garrobo, Zihuatanejo (arquitectura: ${p.architect}). El proyecto fue publicado en`,
      issue: (v) => `(${v})`,
      link: 'Leer el artículo',
      tag: (outlet) => `Proyecto publicado en ${outlet}`,
    },

    facts: {
      yearsBuilding: 'años construyendo en la costa',
      structuresBuilt: 'estructuras construidas',
      largestSpanM: 'metros, el mayor claro construido',
      oldestInServiceYears: 'años en servicio, la obra más antigua',
    },

    selected: { title: 'Obras selectas', all: (n) => `Ver todas las obras (${n})` },
    viewProject: 'Ver obra',

    services: {
      title: 'Lo que construimos',
      more: 'Ver más',
      items: {
        palapas: {
          name: 'Palapas monumentales',
          short: `Estructuras de ${say(f.timber, 'es') || 'madera'} con cubierta de ${say(f.palm, 'es') || 'palma'}${f.engineeredForCoast ? ', calculadas para el viento y la humedad de la costa' : ''}.`,
          body: [
            `Estructuras de ${say(f.timber, 'es') || 'madera'} con cubierta de ${say(f.palm, 'es') || 'palma'}${f.engineeredForCoast ? ', calculadas para el viento y la humedad de la costa' : ''}.`,
            'Circulares, de dos aguas o de gran claro, para salas abiertas, restaurantes, clubes de playa y residencias.',
          ],
          alt: 'Palapa de palma con estructura de madera',
        },
        pergolas: {
          name: 'Pérgolas y decks',
          short: 'Sombra, terrazas y bordes de alberca en madera, con ensambles a la vista y herrajes para ambiente salino.',
          body: ['Sombra, terrazas y bordes de alberca en madera, con ensambles a la vista y herrajes para ambiente salino.'],
          alt: 'Deck y pérgola de madera frente al mar',
        },
        hospitality: {
          name: 'Hotelería y restaurantes',
          short: 'Palapas para lobbies, restaurantes, bares de playa y áreas de alberca.',
          body: [
            'Palapas para lobbies, restaurantes, bares de playa y áreas de alberca. Coordinamos con el arquitecto del proyecto.',
            f.hospitalityScheduling ? 'Ajustamos el calendario a la operación del hotel y entregamos en tiempos de temporada.' : null,
          ],
          alt: 'Estructura de madera con deck en un establecimiento de playa',
        },
        maintenance: {
          name: 'Mantenimiento y reparación',
          short: 'Mantenimiento, reparación y reestructuración de palapas.',
          body: [
            'Mantenimiento, reparación y reestructuración de palapas: refuerzo o reemplazo de piezas dañadas para devolverle firmeza a la estructura.',
            `Revisión estructural, cambio de palma y tratamiento de madera${f.maintenanceInterval ? ` cada ${say(f.maintenanceInterval, 'es')}` : ''}.`,
            f.servicesThirdParty ? 'Cuidamos cualquier palapa, sin importar quién la haya construido.' : null,
          ],
          alt: 'Interior de una cubierta de palma y madera',
        },
      },
    },

    film: {
      title: 'En obra',
      body: f.onSiteCrewClaim ? 'Cada estructura se arma en sitio, por la misma cuadrilla, pieza por pieza.' : null,
    },

    process: {
      title: 'Cómo trabajamos',
      steps: [
        {
          name: 'Visita al sitio',
          body: 'Recorremos el terreno con usted o su arquitecto: orientación, vientos, accesos, suelo.',
          note: f.freeSiteVisit ? 'Sin costo en la región' : null,
        },
        {
          name: 'Propuesta',
          body: `Concepto, dimensiones, materiales y presupuesto por escrito${f.proposalDays ? ` en ${f.proposalDays} días` : ''}.`,
        },
        {
          name: 'Taller y obra',
          body: 'Selección y preparación de la madera en taller; montaje en sitio con nuestro equipo.',
          note: 'Plazo según la obra',
        },
        f.warranty || f.offersMaintenance
          ? {
              name: 'Entrega y cuidado',
              body: [
                f.warranty ? `Garantía de ${say(f.warranty, 'es')}` : null,
                f.offersMaintenance ? 'programa de mantenimiento' : null,
              ].filter(Boolean).join(' y ').replace(/^./, (c) => c.toUpperCase()) + '.',
            }
          : null,
      ],
      closing: '¿Tiene planos o solo una idea? Las dos sirven para empezar.',
    },
    anatomy: {
      label: 'Anatomía de una cubierta',
      title: 'Una cubierta de cuatro aguas, pieza por pieza.',
      body: 'De las zapatas a la palma: el orden en que se arma una cubierta de madera a cuatro aguas, con sus medidas. Planta de 7.80 × 7.50 m, postes de 4.20 m y cumbrera a 6.98 m del suelo.',
      caption: 'Estructura genérica modelada a partir de uno de nuestros planos. Medidas en metros.',
      hint: 'Arrastre para girar la estructura.',
      steps: [
        { name: 'Zapatas', spec: 'Concreto, bajo cada poste', tag: 'Concreto' },
        { name: 'Postes', spec: 'Altura 4.20 m, planta de 7.80 × 7.50 m', tag: '4.20 m' },
        { name: 'Vigas perimetrales 8×6', spec: '20 × 15 cm, cierran el perímetro', tag: '8″ × 6″ · 20 × 15 cm' },
        { name: 'Limatesas', spec: 'De cada esquina a la cumbrera', tag: 'Cumbrera a 6.98 m' },
        { name: 'Polines', spec: 'A cada 0.735 m, alero de 1.00 m', tag: '@ 0.735 m' },
        { name: 'Estructura de cumbrera 6×6', spec: '15 × 15 cm, tirante de 4.02 m', tag: '6″ × 6″ · 15 × 15 cm' },
        { name: 'Cubierta de palma', spec: 'Capas traslapadas desde el alero', tag: 'Capas traslapadas' },
      ],
    },

    studio: {
      label: 'El estudio',
      title: say(f.studioHeadline, 'es') || 'Construimos en diálogo con el paisaje.',
      body: [
        'Cada palapa, cada deck y cada pérgola parte de una lectura del sitio: el viento dominante, el recorrido del sol, la salinidad, la pendiente.',
        f.onSiteCrewClaim
          ? `${f.foundingYear ? `Desde ${f.foundingYear}, un` : 'Un'} mismo taller diseña, prepara la madera y levanta la estructura en obra.${f.offersMaintenance ? ' Una sola responsabilidad, de la primera visita al mantenimiento.' : ''}`
          : 'Trabajamos en madera y palma: palapas, pérgolas y decks, en Zihuatanejo, Ixtapa y Acapulco.',
      ],
      builtFor: 'Hemos construido para',
      builtWith: 'Hemos construido junto a',
      portraitAlt: (name) => `${name} en obra`,
    },

    audience: {
      title: 'Para quién construimos',
      items: [
        { key: 'hotel', name: 'Hoteles y restaurantes', body: 'Obra en temporada baja, cuadrilla propia y entrega en la fecha acordada.' },
        { key: 'arquitecto', name: 'Arquitectos y desarrolladores', body: 'Trabajamos sobre sus planos: ingeniería de la estructura de madera, detalles y montaje.' },
        { key: 'residencia', name: 'Residencias', body: 'Un solo responsable desde la visita hasta el mantenimiento.' },
      ],
      link: 'Cotizar',
    },

    quote: {
      title: 'Cotice su proyecto',
      lede: `Cuéntenos qué quiere construir y dónde. Le respondemos por correo ${f.responseTime ? `en ${say(f.responseTime, 'es')}` : 'a la brevedad'}.`,
      direct: 'O escríbanos directamente:',
      attach: 'Si tiene planos o fotos del sitio, envíelos a ese mismo correo.',
      mailSubject: 'Cotización de proyecto',
      mailBody: ['Tipo de proyecto:', 'Ubicación:', 'Superficie aproximada:', 'Etapa:', 'Fecha deseada:'],
      reference: 'Referencia',
      type: '¿Qué quiere construir?',
      types: [
        ['palapa', 'Palapa'],
        ['deck', 'Deck o terraza'],
        ['pergola', 'Pérgola o techumbre'],
        ['hospitalidad', 'Hotel o restaurante'],
        f.offersMaintenance ? ['mantenimiento', 'Mantenimiento'] : null,
        ['otro', 'Otro'],
      ].filter(Boolean),
      location: '¿Dónde está el sitio?',
      locationPh: 'Ciudad o playa',
      stage: '¿En qué etapa está?',
      stages: ['Solo una idea', 'Tengo planos', 'Obra en curso'],
      timing: '¿Para cuándo lo necesita?',
      timings: ['En 3 meses', 'Este año', 'Sin fecha'],
      size: 'Medidas aproximadas',
      sizePh: 'Ej. 12 × 8 m',
      name: 'Nombre',
      email: 'Correo',
      company: 'Empresa o proyecto',
      message: 'Mensaje',
      optional: 'opcional',
      consent: ['Al enviar acepta nuestro ', 'Aviso de privacidad', '.'],
      reassure: 'Sin compromiso. Solo usamos sus datos para responderle.',
      submit: 'Enviar solicitud',
      sending: 'Enviando…',
      errRequired: 'Este dato es necesario.',
      errChoice: 'Elija una opción.',
      errEmail: 'Escriba un correo válido.',
      okTitle: 'Recibimos su solicitud.',
      okBody: (email) =>
        `Le responderemos a ${email} ${f.responseTime ? `en ${say(f.responseTime, 'es')}` : 'a la brevedad'}. Si tiene planos o fotos del sitio, puede enviarlos respondiendo a ese correo.`,
      okLink: 'Ver obras',
      fail: 'No se pudo enviar. Escríbanos a',
      subject: (type, place) => `Cotización: ${type} en ${place}`,
      profile: 'Perfil',
    },

    index: {
      title: 'Obras',
      lede: 'Palapas, decks y pérgolas en la costa de Guerrero.',
      all: 'Todas',
      closing: '¿No ve algo parecido a lo que imagina? Cuéntenos su proyecto.',
    },

    project: {
      ficha: {
        location: 'Ubicación',
        year: 'Año',
        type: 'Tipo de obra',
        client: 'Cliente',
        architect: 'Arquitectura',
        dimensions: 'Dimensiones',
        materials: 'Maderas y cubierta',
        duration: 'Duración de obra',
        scope: 'Alcance',
      },
      allPhotos: (n) => `Ver las ${n} fotografías`,
      process: 'Proceso',
      open: 'Ampliar fotografía',
      photoAlt: (title, place, i) => `${title}${place ? `, ${place}` : ''}: fotografía ${i}`,
      ctaTitle: '¿Un proyecto como este?',
      ctaBody: 'Cuéntenos el sitio y la idea; respondemos por correo.',
      ctaButton: 'Cotizar un proyecto similar',
      next: 'Siguiente obra',
      prev: 'Anterior',
      nextPhoto: 'Siguiente',
    },

    footer: {
      closing: '¿Tiene un proyecto en la costa?',
      rights: (year) => `© ${year}`,
      address: 'Zihuatanejo, Guerrero, México',
    },

    notFound: { title: 'No encontramos esta página.', body: 'Puede que el enlace haya cambiado.', home: 'Ir al inicio' },

    privacy: {
      title: 'Aviso de privacidad',
      updated: 'Última actualización: noviembre de 2026',
      sections: [
        ['Responsable', [
          `${f.legalEntity || 'Estructuras del Pacífico'}${f.legalAddress ? `, con domicilio en ${f.legalAddress},` : ''} es responsable del tratamiento de los datos personales que usted nos proporciona a través de este sitio. Contacto: ${EMAIL}.`,
        ]],
        ['Datos que recabamos', [
          'Únicamente los que usted escribe en el formulario de cotización: nombre, correo electrónico, empresa o proyecto (opcional), ubicación del sitio y la descripción de lo que quiere construir. No recabamos datos sensibles.',
        ]],
        ['Para qué los usamos', [
          'Para responder su solicitud, preparar una cotización y dar seguimiento a su proyecto. No los usamos para publicidad ni los vendemos o cedemos a terceros.',
        ]],
        ['Cómo se envían', [
          'El formulario se entrega a nuestro correo mediante el servicio FormSubmit (formsubmit.co), que actúa como encargado para ese único fin. Este sitio no utiliza cookies de publicidad ni de seguimiento.',
        ]],
        ['Sus derechos', [
          `Usted puede acceder a sus datos, rectificarlos, cancelarlos u oponerse a su uso (derechos ARCO), así como revocar su consentimiento, escribiendo a ${EMAIL}. Responderemos por el mismo medio.`,
        ]],
        ['Cambios a este aviso', [
          'Cualquier cambio se publicará en esta misma página.',
        ]],
      ],
    },
  },

  en: {
    brand: 'Estructuras del Pacífico',
    skip: 'Skip to content',
    nav: { projects: 'Projects', services: 'Services', studio: 'Studio', quote: 'Quote', privacy: 'Privacy notice' },
    menu: 'Menu',
    close: 'Close',
    cta: 'Request a quote',
    langLabel: 'Language',

    hero: {
      label: 'Zihuatanejo · Ixtapa · Acapulco',
      title: 'Monumental palapas and timber structures for Mexico’s Pacific coast.',
      lede: 'Design and construction of monumental palapas, pergolas and decks for hotels, restaurants and private residences.',
      secondary: 'View projects',
      alt: 'Monumental thatched palapa on a cliff above the Pacific Ocean, with a timber deck in the foreground',
    },

    press: {
      label: 'Recognition',
      line: (p) =>
        `Palapa built by Estructuras del Pacífico at Punta Garrobo, Zihuatanejo (architecture: ${p.architect}). The project was featured in`,
      issue: (v) => `(${v})`,
      link: 'Read the article',
      tag: (outlet) => `Project featured in ${outlet}`,
    },

    facts: {
      yearsBuilding: 'years building on the coast',
      structuresBuilt: 'structures built',
      largestSpanM: 'metres, our longest clear span',
      oldestInServiceYears: 'years in service, our oldest structure',
    },

    selected: { title: 'Selected projects', all: (n) => `View all projects (${n})` },
    viewProject: 'View project',

    services: {
      title: 'What we build',
      more: 'Learn more',
      items: {
        palapas: {
          name: 'Monumental palapas',
          short: `${cap(say(f.timber, 'en') || 'timber')} frames under a ${say(f.palm, 'en') || 'palm-thatch'} roof${f.engineeredForCoast ? ', engineered for coastal wind and humidity' : ''}.`,
          body: [
            `${cap(say(f.timber, 'en') || 'timber')} frames under a ${say(f.palm, 'en') || 'palm-thatch'} roof${f.engineeredForCoast ? ', engineered for coastal wind and humidity' : ''}.`,
            'Round, gabled or long-span, for open living rooms, restaurants, beach clubs and residences.',
          ],
          alt: 'Palm-thatched palapa with a timber frame',
        },
        pergolas: {
          name: 'Pergolas and decks',
          short: 'Shade, terraces and pool surrounds in timber, with exposed joinery and hardware specified for salt air.',
          body: ['Shade, terraces and pool surrounds in timber, with exposed joinery and hardware specified for salt air.'],
          alt: 'Timber deck and pergola facing the sea',
        },
        hospitality: {
          name: 'Hotels and restaurants',
          short: 'Palapas for lobbies, restaurants, beach bars and pool areas.',
          body: [
            'Palapas for lobbies, restaurants, beach bars and pool areas. We work with the project architect.',
            f.hospitalityScheduling ? 'We schedule around hotel operations and plan delivery ahead of high season.' : null,
          ],
          alt: 'Timber structure and deck at a beachfront venue',
        },
        maintenance: {
          name: 'Maintenance and repair',
          short: 'Maintenance, repair and restructuring of palapas.',
          body: [
            'Maintenance, repair and restructuring of palapas: reinforcing or replacing damaged members to make the structure sound again.',
            `Structural inspection, rethatching and timber treatment${f.maintenanceInterval ? ` every ${say(f.maintenanceInterval, 'en')}` : ''}.`,
            f.servicesThirdParty ? 'We care for any palapa, whoever built it.' : null,
          ],
          alt: 'Underside of a palm and timber roof',
        },
      },
    },

    film: {
      title: 'On site',
      body: f.onSiteCrewClaim ? 'Every structure is assembled on site, by the same crew, piece by piece.' : null,
    },

    process: {
      title: 'How we work',
      steps: [
        {
          name: 'Site visit',
          body: 'We walk the site with you or your architect: orientation, wind, access, ground.',
          note: f.freeSiteVisit ? 'At no cost within the region' : null,
        },
        {
          name: 'Proposal',
          body: `Concept, dimensions, materials and a written estimate${f.proposalDays ? ` within ${f.proposalDays} days` : ''}.`,
        },
        {
          name: 'Workshop and build',
          body: 'Timber selection and preparation in the workshop; on-site assembly by our own crew.',
          note: 'Schedule depends on the project',
        },
        f.warranty || f.offersMaintenance
          ? {
              name: 'Handover and care',
              body: cap([
                f.warranty ? `${say(f.warranty, 'en')} warranty` : null,
                f.offersMaintenance ? 'a maintenance programme' : null,
              ].filter(Boolean).join(' and ')) + '.',
            }
          : null,
      ],
      closing: 'Drawings ready, or only an idea? Either is enough to start.',
    },
    anatomy: {
      label: 'Anatomy of a roof',
      title: 'A hip roof, piece by piece.',
      body: 'From footings to palm: the order in which a timber hip roof goes up, with its dimensions. A 7.80 × 7.50 m plan, 4.20 m posts and an apex 6.98 m above the ground.',
      caption: 'A generic structure modelled from one of our plans. Dimensions in metres.',
      hint: 'Drag to turn the structure.',
      steps: [
        { name: 'Footings', spec: 'Concrete, under each post', tag: 'Concrete' },
        { name: 'Posts', spec: '4.20 m high, 7.80 × 7.50 m plan', tag: '4.20 m' },
        { name: 'Perimeter beams 8×6', spec: '20 × 15 cm, closing the perimeter', tag: '8″ × 6″ · 20 × 15 cm' },
        { name: 'Hip rafters', spec: 'From each corner to the apex', tag: 'Apex at 6.98 m' },
        { name: 'Rafters', spec: 'At 0.735 m centres, 1.00 m eave', tag: '@ 0.735 m' },
        { name: 'Apex structure 6×6', spec: '15 × 15 cm, 4.02 m tie', tag: '6″ × 6″ · 15 × 15 cm' },
        { name: 'Palm thatch', spec: 'Overlapping layers from the eave up', tag: 'Overlapping layers' },
      ],
    },

    studio: {
      label: 'The studio',
      title: say(f.studioHeadline, 'en') || 'We build in conversation with the landscape.',
      body: [
        'Every palapa, deck and pergola begins with a reading of the site: prevailing wind, sun path, salt air, slope.',
        f.onSiteCrewClaim
          ? `${f.foundingYear ? `Since ${f.foundingYear}, one` : 'One'} workshop ${f.foundingYear ? 'has designed, prepared the timber and raised' : 'designs, prepares the timber and raises'} the structure on site.${f.offersMaintenance ? ' One point of responsibility, from the first visit to long-term care.' : ''}`
          : 'We work in timber and palm thatch: palapas, pergolas and decks, in Zihuatanejo, Ixtapa and Acapulco.',
      ],
      builtFor: 'We have built for',
      builtWith: 'We have built alongside',
      portraitAlt: (name) => `${name} on site`,
    },

    audience: {
      title: 'Who we build for',
      items: [
        { key: 'hotel', name: 'Hotels and restaurants', body: 'Off-season construction, our own crew and delivery on the agreed date.' },
        { key: 'arquitecto', name: 'Architects and developers', body: 'We work from your drawings: timber structural engineering, detailing and assembly.' },
        { key: 'residencia', name: 'Residences', body: 'One point of responsibility, from the site visit to maintenance.' },
      ],
      link: 'Request a quote',
    },

    quote: {
      title: 'Request a quote',
      lede: `Tell us what you want to build and where. We reply by email ${f.responseTime ? `within ${say(f.responseTime, 'en')}` : 'as soon as we can'}.`,
      direct: 'Or write to us directly:',
      attach: 'If you have drawings or site photos, send them to that same address.',
      mailSubject: 'Project quote',
      mailBody: ['Project type:', 'Location:', 'Approximate size:', 'Stage:', 'Target date:'],
      reference: 'Reference',
      type: 'What do you want to build?',
      types: [
        ['palapa', 'Palapa'],
        ['deck', 'Deck or terrace'],
        ['pergola', 'Pergola or roof'],
        ['hospitalidad', 'Hotel or restaurant'],
        f.offersMaintenance ? ['mantenimiento', 'Maintenance'] : null,
        ['otro', 'Other'],
      ].filter(Boolean),
      location: 'Where is the site?',
      locationPh: 'Town or beach',
      stage: 'What stage is it at?',
      stages: ['Only an idea', 'Drawings ready', 'Under construction'],
      timing: 'When do you need it?',
      timings: ['Within 3 months', 'This year', 'No date yet'],
      size: 'Approximate size',
      sizePh: 'E.g. 12 × 8 m',
      name: 'Name',
      email: 'Email',
      company: 'Company or project',
      message: 'Message',
      optional: 'optional',
      consent: ['By sending you accept our ', 'privacy notice', '.'],
      reassure: 'No obligation. We only use your details to reply to you.',
      submit: 'Send request',
      sending: 'Sending…',
      errRequired: 'This field is required.',
      errChoice: 'Please choose an option.',
      errEmail: 'Enter a valid email address.',
      okTitle: 'We have your request.',
      okBody: (email) =>
        `We will reply to ${email} ${f.responseTime ? `within ${say(f.responseTime, 'en')}` : 'as soon as we can'}. If you have drawings or site photos, you can send them by replying to that email.`,
      okLink: 'View projects',
      fail: 'The message could not be sent. Please write to',
      subject: (type, place) => `Quote: ${type} in ${place}`,
      profile: 'Profile',
    },

    index: {
      title: 'Projects',
      lede: 'Palapas, decks and pergolas on the coast of Guerrero, Mexico.',
      all: 'All',
      closing: 'Nothing here quite like what you have in mind? Tell us about your project.',
    },

    project: {
      ficha: {
        location: 'Location',
        year: 'Year',
        type: 'Type of work',
        client: 'Client',
        architect: 'Architecture',
        dimensions: 'Dimensions',
        materials: 'Timber and roofing',
        duration: 'Build time',
        scope: 'Scope',
      },
      allPhotos: (n) => `View all ${n} photographs`,
      process: 'Process',
      open: 'Enlarge photograph',
      photoAlt: (title, place, i) => `${title}${place ? `, ${place}` : ''}: photograph ${i}`,
      ctaTitle: 'A project like this one?',
      ctaBody: 'Tell us about the site and the idea; we reply by email.',
      ctaButton: 'Quote a similar project',
      next: 'Next project',
      prev: 'Previous',
      nextPhoto: 'Next',
    },

    footer: {
      closing: 'Have a project on the coast?',
      rights: (year) => `© ${year}`,
      address: 'Zihuatanejo, Guerrero, Mexico',
    },

    notFound: { title: 'We could not find this page.', body: 'The link may have changed.', home: 'Go to the home page' },

    privacy: {
      title: 'Privacy notice',
      updated: 'Last updated: November 2026',
      sections: [
        ['Data controller', [
          `${f.legalEntity || 'Estructuras del Pacífico'}${f.legalAddress ? `, located at ${f.legalAddress},` : ''} is responsible for the personal data you provide through this site. Contact: ${EMAIL}.`,
        ]],
        ['What we collect', [
          'Only what you type into the quote form: name, email address, company or project (optional), site location and the description of what you want to build. We do not collect sensitive data.',
        ]],
        ['How we use it', [
          'To answer your request, prepare a quote and follow up on your project. We do not use it for advertising and we do not sell or share it with third parties.',
        ]],
        ['How it is sent', [
          'The form is delivered to our inbox through FormSubmit (formsubmit.co), which acts as a processor for that single purpose. This site uses no advertising or tracking cookies.',
        ]],
        ['Your rights', [
          `You may access, correct or delete your data, object to its use, or withdraw your consent by writing to ${EMAIL}. We will reply by the same means.`,
        ]],
        ['Changes to this notice', [
          'Any change will be published on this page.',
        ]],
      ],
    },
  },
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

/** Strips nulls so callers can map without checks. */
export const present = (list) => list.filter(Boolean)
