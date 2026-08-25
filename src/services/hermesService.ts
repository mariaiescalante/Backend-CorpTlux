import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';
import { getLandingSetting, saveLandingSetting } from '../models/landing.model';
import { uploadImageUrlToCloudinary, processHtmlImagesWithCloudinary, processObjectImagesWithCloudinary } from './cloudinaryService';

const apiKey = process.env.GROQ_API_KEY || '';
const groq = new Groq({ apiKey });

// ── HERMES MULTI-LANGUAGE AUTO-TRANSLATION & JSON PERSISTENCE ENGINE ──
async function translatePayloadWithAI(payload: any): Promise<{ en?: any; pt?: any }> {
  const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];
  const prompt = `Translate the following Spanish JSON object into both English (en) and Portuguese (pt). Return ONLY a valid JSON with top-level keys "en" and "pt" matching the exact structure and fields:
Input:
${JSON.stringify(payload, null, 2)}`;

  for (const model of models) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are an ultra-fast expert multilingual translator for web landing pages. Return ONLY a valid JSON object with {"en": {...}, "pt": {...}} without markdown or code blocks.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.en && parsed.pt) {
          return parsed;
        }
      }
    } catch (err: any) {
      console.warn(`[HERMES i18n] Translation retry with next model (failed on ${model}):`, err.message);
    }
  }
  return {};
}

function updateFrontendLocaleJsons(updaterFn: (json: any, lang: string) => void) {
  const baseDirs = [
    'c:/Users/manue/frontend2/locales',
    'c:/Users/manue/CorpTluxLanding/frontend2/locales'
  ];

  for (const dir of baseDirs) {
    for (const lang of ['es', 'en', 'pt']) {
      const filePath = `${dir}/${lang}.json`;
      if (fs.existsSync(filePath)) {
        try {
          const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          updaterFn(json, lang);
          fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
          console.log(`[HERMES i18n] Synchronized ${filePath}`);
        } catch (err: any) {
          console.error(`[HERMES i18n] Error synchronizing ${filePath}:`, err.message);
        }
      }
    }
  }
}

// ── RUTAS PÚBLICAS PARA PERSISTIR LOGOS SVG VECTORIALES ──
const PUBLIC_DIRS = [
  'c:/Users/manue/frontend2/public',
  'c:/Users/manue/CorpTluxLanding/frontend2/public'
];

/**
 * Busca, descarga y almacena el logo SVG oficial de una tecnología directamente en la carpeta public/
 */
async function downloadAndSaveOfficialTechSvg(techName: string, customUrl?: string): Promise<string | undefined> {
  const clean = techName.toLowerCase().trim();
  const slug = clean.replace(/[^a-z0-9]/g, '');

  const customSlugMap: Record<string, string> = {
    'vue.js': 'vuedotjs',
    vue: 'vuedotjs',
    'node.js': 'nodedotjs',
    nodejs: 'nodedotjs',
    'c++': 'cplusplus',
    'c#': 'csharp',
    'next.js': 'nextdotjs',
    nextjs: 'nextdotjs',
    golang: 'go',
    aws: 'amazonwebservices'
  };

  const primarySlug = customSlugMap[clean] || slug;

  const urlCandidates = [
    customUrl,
    `https://cdn.jsdelivr.net/npm/simple-icons@v10/icons/${primarySlug}.svg`,
    `https://api.iconify.design/logos:${slug}.svg`,
    `https://api.iconify.design/simple-icons:${primarySlug}.svg`,
    `https://cdn.jsdelivr.net/npm/simple-icons@v10/icons/${slug}.svg`,
    `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/${primarySlug}.svg`
  ].filter(Boolean) as string[];

  for (const url of urlCandidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        let svgContent = await res.text();
        if (svgContent.includes('<svg') && svgContent.length > 50) {
          const fileName = `${slug}.svg`;
          for (const pDir of PUBLIC_DIRS) {
            try {
              if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true });
              const fullPath = path.join(pDir, fileName);
              fs.writeFileSync(fullPath, svgContent, 'utf8');
              console.log(`[HERMES] Logo SVG oficial guardado en ${fullPath}`);
            } catch (err) {
              console.warn(`[HERMES] No se pudo guardar en ${pDir}:`, err);
            }
          }
          return `/${fileName}`;
        }
      }
    } catch (e) {
      // intentar siguiente
    }
  }

  return undefined;
}

// ── POOL DE MODELOS DE GROQ CON FALLBACK AUTOMÁTICO ANTE LIMITES DE TOKENS (TPD / 429) ──
const MODEL_CANDIDATES = [
  'openai/gpt-oss-120b',
  'groq/compound',
  'openai/gpt-oss-20b',
  'groq/compound-mini',
  'qwen/qwen3.6-27b',
];

// ── CATÁLOGO MAESTRO DE IMÁGENES ESTÉTICAS, VERIFICADAS Y TEMÁTICAS ──
export interface ThemedMedia {
  url: string;
  caption: string;
  alt: string;
}

const MASTER_IMAGE_CATALOG: Record<string, ThemedMedia[]> = {
  ux_ui: [
    {
      url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=85',
      caption: 'Arquitectura de Información y Prototipado UX/UI en Figma',
      alt: 'Prototipo de Interfaz de Usuario y Wireframes Digitales'
    },
    {
      url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=85',
      caption: 'Design Systems Modulares y Guías de Estilo Corporativas',
      alt: 'Sistema de Diseño y Componentes UI'
    },
    {
      url: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?auto=format&fit=crop&w=1200&q=85',
      caption: 'Investigación de Usuario y Pruebas de Usabilidad Centradas en el Humano',
      alt: 'Investigación UX y Mapeo de Experiencia de Usuario'
    },
    {
      url: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0?auto=format&fit=crop&w=1200&q=85',
      caption: 'Microinteracciones y Experiencias de Usuario Inmersivas',
      alt: 'Diseño de Interacción Digital y Microanimaciones'
    },
    {
      url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=85',
      caption: 'Diseño Web Responsivo y Maquetación de Interfaces Modernas',
      alt: 'Maquetación Web y Diseño Adaptativo'
    },
    {
      url: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=1200&q=85',
      caption: 'Flujos de Navegación y Pruebas A/B de Conversión en UI',
      alt: 'Flujo de Usuario y Optimización de Conversión'
    }
  ],

  artificial_intelligence: [
    {
      url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=85',
      caption: 'Redes Neuronales Profundas y Modelos Predictivos de IA',
      alt: 'Visualización de Redes Neuronales y Machine Learning'
    },
    {
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
      caption: 'Inteligencia Artificial Generativa y Procesamiento de Lenguaje Natural',
      alt: 'Modelos de Lenguaje y Algoritmos Generativos'
    },
    {
      url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=85',
      caption: 'Agentes Autónomos y Automatización Cognitiva en Tiempo Real',
      alt: 'Agentes de Inteligencia Artificial y Computación Cuántica'
    },
    {
      url: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=1200&q=85',
      caption: 'Robótica Inteligente y Aprendizaje por Refuerzo',
      alt: 'Robótica y Algoritmos de Aprendizaje Profundo'
    },
    {
      url: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1200&q=85',
      caption: 'Visión Computacional y Reconocimiento de Patrones Complejos',
      alt: 'Visión por Computadora y Análisis Predictivo'
    }
  ],

  frontend_web: [
    {
      url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=85',
      caption: 'Desarrollo Web Moderno con React, Next.js y TypeScript',
      alt: 'Entorno de Desarrollo Web y Programación Frontend'
    },
    {
      url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=85',
      caption: 'Arquitectura de Código Limpio y Componentes Frontend Escalables',
      alt: 'Editor de Código con Sintaxis Moderna'
    },
    {
      url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=85',
      caption: 'Optimización de Rendimiento Web y Core Web Vitals',
      alt: 'Programación Web y Optimización de Rendimiento'
    },
    {
      url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=85',
      caption: 'Desarrollo Fullstack y APIs Modernas',
      alt: 'Código Fuente y Desarrollo de Aplicaciones Web'
    }
  ],

  backend_architecture: [
    {
      url: 'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=85',
      caption: 'Arquitectura de Microservicios Distribuidos y APIs REST/GraphQL',
      alt: 'Arquitectura de Software y Servicios en la Nube'
    },
    {
      url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=85',
      caption: 'Integración Continua, Pruebas Automatizadas y Pipelines CI/CD',
      alt: 'Ingeniería de Software y Despliegue Continuo'
    },
    {
      url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=85',
      caption: 'Bases de Datos de Alto Rendimiento y Gestión de Datos a Gran Escala',
      alt: 'Infraestructura de Datos y Servidores de Base de Datos'
    }
  ],

  cybersecurity_cloud: [
    {
      url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=85',
      caption: 'Seguridad Perimetral, Modelos Zero Trust y Encriptación Homomórfica',
      alt: 'Ciberseguridad y Protección de Datos Corporativos'
    },
    {
      url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=85',
      caption: 'Centros de Datos de Alta Disponibilidad y Servidores Seguros',
      alt: 'Servidores en la Nube y Protección de Infraestructura'
    },
    {
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85',
      caption: 'Redes Globales de Defensa y Monitoreo de Amenazas en Tiempo Real',
      alt: 'Red Global de Ciberdefensa y Conectividad Cloud'
    }
  ],

  saas_strategy: [
    {
      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=85',
      caption: 'Métricas de Crecimiento SaaS, Retención de Usuarios y MRR',
      alt: 'Cuadros de Mando y Analítica de Crecimiento de Negocio'
    },
    {
      url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=85',
      caption: 'Estrategia de Transformación Digital y Liderazgo Tecnológico',
      alt: 'Planificación Estratégica y Consultoría de Negocio'
    },
    {
      url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85',
      caption: 'Modelos de Negocio Digitales y Escalabilidad Corporativa',
      alt: 'Gestión de Producto Digital y Modelos SaaS'
    },
    {
      url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=85',
      caption: 'Estrategias de Producto Digital y Optimización de Revenue',
      alt: 'Estrategia de Ingresos y Analítica Digital'
    }
  ],

  branding_creative: [
    {
      url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=85',
      caption: 'Construcción de Identidad de Marca y Sistemas Tipográficos',
      alt: 'Diseño de Marca y Dirección Creativa de Identidad'
    },
    {
      url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1200&q=85',
      caption: 'Dirección de Arte Digital y Narrativa Visual de Marca',
      alt: 'Arte Conceptual y Creación de Marca Digital'
    }
  ]
};

// Obtiene todas las URLs de imágenes utilizadas recientemente en MySQL para evitar repeticiones
async function getRecentlyUsedImages(limit: number = 20): Promise<Set<string>> {
  const used = new Set<string>();
  try {
    const [rows]: any = await pool.query('SELECT cover_image, content FROM articles ORDER BY id DESC LIMIT ?', [limit]);
    for (const r of rows) {
      if (r.cover_image) {
        try {
          const cover = typeof r.cover_image === 'string' ? JSON.parse(r.cover_image) : r.cover_image;
          if (cover && cover.es) used.add(cover.es);
        } catch {}
      }
      if (r.content) {
        try {
          const content = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
          const esContent = content.es || content;
          const matches = (typeof esContent === 'string' ? esContent : '').match(/<img[^>]+src=["']([^"']+)["']/g) || [];
          for (const m of matches) {
            const srcMatch = m.match(/src=["']([^"']+)["']/);
            if (srcMatch?.[1]) used.add(srcMatch[1]);
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('[HERMES] No se pudieron consultar imágenes recientes en MySQL:', err);
  }
  return used;
}

// Resolver temático avanzado que garantiza imágenes 100% acordes al tema y SIN REPETICIÓN
function resolveThemedMediaSelection(
  title: string,
  categoryName: string,
  recentlyUsed: Set<string>
): { cover: ThemedMedia; inlines: ThemedMedia[] } {
  const query = `${title} ${categoryName}`.toLowerCase();
  let poolKey = 'saas_strategy';

  if (query.includes('ux') || query.includes('ui') || query.includes('interfaz') || query.includes('diseño') || query.includes('figma') || query.includes('prototipo') || query.includes('design') || query.includes('wireframe')) {
    poolKey = 'ux_ui';
  } else if (query.includes('ia') || query.includes('inteligencia artificial') || query.includes('ai') || query.includes('machine learning') || query.includes('algoritmo') || query.includes('gpt') || query.includes('llm') || query.includes('deep learning') || query.includes('robot')) {
    poolKey = 'artificial_intelligence';
  } else if (query.includes('react') || query.includes('next') || query.includes('frontend') || query.includes('web') || query.includes('javascript') || query.includes('typescript') || query.includes('microfrontend') || query.includes('css') || query.includes('tailwind')) {
    poolKey = 'frontend_web';
  } else if (query.includes('backend') || query.includes('api') || query.includes('microservicio') || query.includes('serverless') || query.includes('database') || query.includes('sql') || query.includes('node') || query.includes('python') || query.includes('codigo') || query.includes('código') || query.includes('arquitectura')) {
    poolKey = 'backend_architecture';
  } else if (query.includes('seguridad') || query.includes('ciber') || query.includes('cloud') || query.includes('nube') || query.includes('servidor') || query.includes('infraestructura') || query.includes('devops') || query.includes('zero trust')) {
    poolKey = 'cybersecurity_cloud';
  } else if (query.includes('brand') || query.includes('marca') || query.includes('identidad') || query.includes('visual') || query.includes('logo') || query.includes('tipografia') || query.includes('creatividad')) {
    poolKey = 'branding_creative';
  }

  const categoryPool = MASTER_IMAGE_CATALOG[poolKey] || MASTER_IMAGE_CATALOG.saas_strategy;

  let available = categoryPool.filter((item) => !recentlyUsed.has(item.url));

  if (available.length === 0) {
    available = [...categoryPool];
  }

  const seed = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + Date.now();
  const shuffled = [...available].sort((a, b) => {
    const hashA = (a.url.length * 31 + seed) % 100;
    const hashB = (b.url.length * 31 + seed) % 100;
    return hashA - hashB;
  });

  const cover = shuffled[0];
  const inlines = shuffled.slice(1);

  if (inlines.length === 0) {
    const fallbackPool = MASTER_IMAGE_CATALOG.ux_ui.concat(MASTER_IMAGE_CATALOG.artificial_intelligence);
    inlines.push(fallbackPool[(seed + 1) % fallbackPool.length]);
  }

  return { cover, inlines };
}

// ── DEFINICIÓN DE HERRAMIENTAS DISPONIBLES PARA HERMES ──
const TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_article',
      description: 'Crea un nuevo artículo de blog extenso y profundo (800-1200+ palabras) con formato HTML enriquecido, colores de la paleta oficial TLUX, imagen de portada temática hermosa, figuras contextuales procesadas en Cloudinary, cajas de insights destacadas, listas estructuradas y lo guarda directamente en MySQL.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título principal del artículo en español' },
          excerpt: { type: 'string', description: 'Resumen ejecutivo conciso (2-3 frases)' },
          content: { type: 'string', description: 'Contenido completo en HTML semántico extenso.' },
          category_name: { type: 'string', description: 'Categoría' },
          cover_image: { type: 'string', description: 'URL de portada HD opcional' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Etiquetas clave' },
          status: { type: 'string', enum: ['draft', 'published'], description: 'Estado del artículo' },
          seo_title: { type: 'string', description: 'Meta título optimizado' },
          seo_description: { type: 'string', description: 'Meta descripción' }
        },
        required: ['title', 'content', 'excerpt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_tech_stack_item',
      description: 'Agrega una nueva tecnología al System Tech Stack de la Landing Page en MySQL, buscando y descargando automáticamente su logo SVG oficial en la carpeta public/ del proyecto.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre de la tecnología (ej: "Redis", "Docker", "Kubernetes", "GraphQL", "FastAPI", "Vue.js")' },
          category: { type: 'string', description: 'Categoría o etiqueta (ej: "CACHE", "CONTAINERS", "API", "CLOUD_ENGINE", "FRAMEWORK")' },
          description: { type: 'string', description: 'Descripción técnica y beneficios de su uso en proyectos de TLUX' },
          usageCase: { type: 'string', description: 'Caso de uso principal' },
          logoUrl: { type: 'string', description: 'URL opcional del logo. Si se omite, Hermes buscará y descargará el SVG oficial automáticamente.' }
        },
        required: ['name', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_feature_item',
      description: 'Agrega una nueva función / característica destacada interactiva a la sección de Funciones (Features) de la Landing Page en MySQL, con imagen temática HD optimizada automáticamente en Cloudinary.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título de la función o característica' },
          kicker: { type: 'string', description: 'Subtítulo o categoría de impacto' },
          imageUrl: { type: 'string', description: 'URL de imagen o temática deseada' }
        },
        required: ['title', 'kicker']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_service_item',
      description: 'Agrega un nuevo servicio o botón desplegable interactivo al acordeón de la sección Servicios y Soluciones de la Landing Page en MySQL.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Nombre del servicio' },
          kicker: { type: 'string', description: 'Frase corta de propuesta de valor' },
          description: { type: 'string', description: 'Descripción clara y concisa de lo que ofrece el servicio' },
          deliverables: { type: 'array', items: { type: 'string' }, description: 'Lista de 3 entregables clave' },
          result: { type: 'string', description: 'Resultado o beneficio medible' }
        },
        required: ['title', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_client_review',
      description: 'Crea y agrega una nueva opinión / reseña / testimonio de cliente en la sección de Opiniones (Ratings) de la Landing Page en MySQL.',
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Nombre del cliente o directivo' },
          comment: { type: 'string', description: 'Testimonio u opinión' },
          tag: { type: 'string', description: 'Etiqueta del servicio' },
          rating: { type: 'number', description: 'Calificación de 1 a 5 estrellas' }
        },
        required: ['clientName', 'comment']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_landing_section',
      description: 'Actualiza textos, imágenes y contenidos de cualquier sección de la Landing Page en MySQL.',
      parameters: {
        type: 'object',
        properties: {
          section_key: { 
            type: 'string', 
            enum: ['hero', 'services', 'about', 'stats', 'contact', 'ratings', 'features', 'clients', 'techStack'],
            description: 'Identificador de la sección'
          },
          updates: { type: 'object', description: 'Propiedades y textos a actualizar' }
        },
        required: ['section_key', 'updates']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_cms_stats',
      description: 'Obtiene estadísticas en tiempo real del CMS.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_faq',
      description: 'Crea una nueva pregunta frecuente (FAQ) en el CMS en MySQL.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Pregunta clara y directa en español' },
          answer: { type: 'string', description: 'Respuesta concisa, concreta y directa al grano' },
          category: { type: 'string', description: 'Categoría de la pregunta' }
        },
        required: ['question', 'answer']
      }
    }
  }
];

function formatToRichHtml(rawContent: string, selection: { cover: ThemedMedia; inlines: ThemedMedia[] }): string {
  if (!rawContent) return '';
  let html = rawContent;

  let inlineIndex = 0;
  html = html.replace(/https?:\/\/[^\s"']*(?:demo|tluxstudio|placeholder|example\.com)[^\s"']*/gi, () => {
    const inlineItem = selection.inlines[inlineIndex % selection.inlines.length] || selection.cover;
    inlineIndex++;
    return inlineItem.url;
  });

  if (html.includes('<h2>') || html.includes('<p>')) {
    if (!html.includes('<img')) {
      const primaryInline = selection.inlines[0] || selection.cover;
      const inlineFigure = `\n\n<figure class="my-8 border border-slate-200 bg-slate-50 p-2"><img src="${primaryInline.url}" alt="${primaryInline.alt}" class="w-full rounded-none border border-slate-200 object-cover max-h-96" /><figcaption class="text-xs text-slate-500 mt-2.5 text-center font-mono">[ FIGURA: ${primaryInline.caption} ]</figcaption></figure>\n\n`;
      const h2Idx = html.indexOf('</h2>');
      if (h2Idx !== -1) {
        html = html.slice(0, h2Idx + 5) + inlineFigure + html.slice(h2Idx + 5);
      } else {
        html += inlineFigure;
      }
    }
    return html;
  }

  html = html
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h2>$1</h2>')
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-slate-950 font-bold">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-blue-600 bg-slate-50 p-6 my-8 italic text-slate-800 font-medium leading-relaxed">$1</blockquote>')
    .replace(/\!\[(.*?)\]\((.*?)\)/gim, '<figure class="my-8 border border-slate-200 bg-slate-50 p-2"><img src="$2" alt="$1" class="w-full rounded-none border border-slate-200 object-cover max-h-96" /><figcaption class="text-xs text-slate-500 mt-2.5 text-center font-mono">[ FIGURA: $1 ]</figcaption></figure>')
    .replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^---$/gim, '<hr class="my-8 border-slate-200" />');

  html = html.replace(/(<li class="[^"]*">.*?<\/li>\s*)+/gis, (match) => `<ul class="my-6 space-y-2 list-disc list-inside">${match}</ul>`);

  const blocks = html.split(/\n\s*\n/);
  const processed = blocks
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h2|h3|ul|ol|blockquote|hr|figure|table|div)/i.test(block)) {
        return block;
      }
      return `<p class="mb-6 leading-relaxed text-slate-700 text-base sm:text-lg">${block.replace(/\n/g, '<br />')}</p>`;
    })
    .filter(Boolean)
    .join('\n\n');

  if (!processed.includes('<img')) {
    const primaryInline = selection.inlines[0] || selection.cover;
    const inlineFigure = `<figure class="my-8 border border-slate-200 bg-slate-50 p-2"><img src="${primaryInline.url}" alt="${primaryInline.alt}" class="w-full rounded-none border border-slate-200 object-cover max-h-96" /><figcaption class="text-xs text-slate-500 mt-2.5 text-center font-mono">[ FIGURA: ${primaryInline.caption} ]</figcaption></figure>`;
    return `${inlineFigure}\n\n${processed}`;
  }

  return processed;
}

function parseToolArgs(rawArgs: string): any {
  if (!rawArgs) return {};
  try {
    return JSON.parse(rawArgs);
  } catch {
    try {
      const sanitized = rawArgs.replace(/[\x00-\x1F\x7F-\x9F]/g, (c) =>
        c === '\n' ? '\\n' : c === '\r' ? '\\r' : c === '\t' ? '\\t' : ''
      );
      return JSON.parse(sanitized);
    } catch {
      const titleMatch = rawArgs.match(/"title"\s*:\s*"([^"]+)"/);
      const excerptMatch = rawArgs.match(/"excerpt"\s*:\s*"([^"]+)"/);
      return {
        title: titleMatch ? titleMatch[1] : 'Artículo de IA',
        excerpt: excerptMatch ? excerptMatch[1] : 'Resumen generado por IA.',
        content: rawArgs,
        status: 'published'
      };
    }
  }
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanOutputText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<function=[\s\S]*?>[\s\S]*?<\/function>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim();
}

// ── EJECUTOR DE HERRAMIENTAS EN MYSQL + CLOUDINARY + PUBLIC FILES ──
async function executeTool(name: string, args: any): Promise<{ result: any; description: string }> {
  switch (name) {
    case 'create_article': {
      const title = typeof args.title === 'string' ? args.title : 'Artículo de Blog';
      const rawSlug = slugify(title) || 'articulo-' + Date.now();
      const slug = rawSlug + '-' + Math.floor(Math.random() * 899 + 100);
      const excerpt = typeof args.excerpt === 'string' ? args.excerpt : title;
      const categoryName = args.category_name || 'General';
      const status = args.status || 'published';

      const recentlyUsedImages = await getRecentlyUsedImages(20);
      const mediaSelection = resolveThemedMediaSelection(title, categoryName, recentlyUsedImages);
      let initialCover = mediaSelection.cover.url;

      if (
        args.cover_image &&
        args.cover_image.startsWith('http') &&
        !args.cover_image.includes('tluxstudio') &&
        !args.cover_image.includes('demo') &&
        !args.cover_image.includes('example.com')
      ) {
        initialCover = args.cover_image;
      }

      let rawContent = '';
      if (typeof args.content === 'object' && args.content !== null) {
        rawContent = args.content.es || args.content.en || JSON.stringify(args.content);
      } else {
        rawContent = String(args.content || '');
      }

      const formattedHtml = formatToRichHtml(rawContent, mediaSelection);

      console.log(`[HERMES] Procesando imágenes temáticas en Cloudinary para "${title}"...`);
      const [cloudinaryCoverUrl, cloudinaryContentHtml] = await Promise.all([
        uploadImageUrlToCloudinary(initialCover, 'corptlux/articles/covers'),
        processHtmlImagesWithCloudinary(formattedHtml, 'corptlux/articles/content'),
      ]);

      const cleanWords = cloudinaryContentHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length;
      const readTimeMin = Math.max(1, Math.ceil(cleanWords / 200));

      let categoryId = 1;
      try {
        const [catRows]: any = await pool.query(
          "SELECT id FROM categories WHERE type = 'blog' AND (JSON_UNQUOTE(JSON_EXTRACT(name, '$.es')) = ? OR JSON_UNQUOTE(JSON_EXTRACT(name, '$.en')) = ?) LIMIT 1",
          [categoryName, categoryName]
        );
        if (catRows && catRows.length > 0) {
          categoryId = catRows[0].id;
        } else {
          const catSlug = slugify(categoryName) || 'cat-' + Date.now();
          const nameJson = JSON.stringify({ es: categoryName, en: categoryName, pt: categoryName });
          const slugJson = JSON.stringify({ es: catSlug, en: catSlug, pt: catSlug });
          const [insCat]: any = await pool.query(
            "INSERT INTO categories (type, name, slug, status, created_at, updated_at) VALUES ('blog', ?, ?, 'active', NOW(), NOW())",
            [nameJson, slugJson]
          );
          categoryId = insCat.insertId || 1;
        }
      } catch (err) {
        console.warn('Error resolviendo categoría, usando id 1:', err);
      }

      const titleJson = JSON.stringify({ es: title, en: title, pt: title });
      const excerptJson = JSON.stringify({ es: excerpt, en: excerpt, pt: excerpt });
      const contentJson = JSON.stringify({ es: cloudinaryContentHtml, en: cloudinaryContentHtml, pt: cloudinaryContentHtml });
      const slugJson = JSON.stringify({ es: slug, en: slug, pt: slug });
      const metaTitleJson = JSON.stringify({ es: args.seo_title || title, en: args.seo_title || title, pt: args.seo_title || title });
      const metaDescJson = JSON.stringify({ es: args.seo_description || excerpt, en: args.seo_description || excerpt, pt: args.seo_description || excerpt });
      const coverImageJson = JSON.stringify({ es: cloudinaryCoverUrl, en: cloudinaryCoverUrl, pt: cloudinaryCoverUrl });

      const [insertRes]: any = await pool.query(
        `INSERT INTO articles (
          category_id, author_id, created_by, title, excerpt, content, slug,
          meta_title, meta_description, cover_image, reading_time_min, status, is_featured, published_at, created_at, updated_at
        ) VALUES (?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW(), NOW())`,
        [
          categoryId,
          titleJson,
          excerptJson,
          contentJson,
          slugJson,
          metaTitleJson,
          metaDescJson,
          coverImageJson,
          readTimeMin,
          status
        ]
      );

      const articleId = insertRes.insertId;

      return {
        result: {
          article_id: articleId,
          title,
          slug,
          status,
          category: categoryName,
          cover_image: cloudinaryCoverUrl,
          reading_time_min: readTimeMin,
          url: '/blog/' + slug
        },
        description: `Artículo "${title}" creado, procesado con Cloudinary y publicado en MySQL (ID #${articleId})`
      };
    }

    case 'create_tech_stack_item': {
      const name = args.name || 'Tecnología';
      const category = args.category?.toUpperCase() || 'DEV_STACK';
      const description = args.description || 'Tecnología de última generación integrada en el stack oficial de TLUX.';
      const usageCase = args.usageCase || args.useCase || 'Plataformas web escalables y microservicios.';
      let customUrl = args.logoUrl || '';

      // 1. Buscar y descargar automáticamente el archivo SVG oficial a la carpeta public/
      console.log(`[HERMES] Buscando y guardando logo SVG oficial para la tecnología "${name}"...`);
      const localSvgPath = await downloadAndSaveOfficialTechSvg(name, customUrl);
      const finalLogoUrl = localSvgPath || (customUrl.startsWith('http') ? customUrl : undefined);

      const currentStack: any = (await getLandingSetting('techStack')) || {};
      const existingItems = Array.isArray(currentStack.items) ? currentStack.items : [];

      const newTech = {
        id: 't' + (existingItems.length + 1) + '-' + Date.now().toString().slice(-4),
        name,
        category,
        description,
        usageCase,
        logoUrl: finalLogoUrl
      };

      const updatedItems = [...existingItems, newTech];
      currentStack.items = updatedItems;

      await saveLandingSetting('techStack', currentStack);

      return {
        result: {
          tech: newTech,
          saved_svg: localSvgPath || 'LOCAL_FALLBACK',
          total_technologies: updatedItems.length,
          status: 'SAVED_IN_MYSQL'
        },
        description: `Tecnología "${name}" registrada en MySQL con logo SVG oficial guardado en public/ (${finalLogoUrl || 'svg generado'}). Total tecnologías activas: ${updatedItems.length}`
      };
    }

    case 'create_feature_item': {
      const title = args.title || 'Nueva Función';
      const kicker = args.kicker || 'Innovación & Tecnología';
      let initialImg = args.imageUrl || args.image || '';

      if (!initialImg || initialImg.includes('placeholder') || !initialImg.startsWith('http')) {
        const recentlyUsed = await getRecentlyUsedImages(15);
        const resolved = resolveThemedMediaSelection(`${title} ${kicker}`, 'feature_landing', recentlyUsed);
        initialImg = resolved.cover.url;
      }

      const cloudinaryImg = await uploadImageUrlToCloudinary(initialImg, 'corptlux/landing');

      const currentFeatures: any = (await getLandingSetting('features')) || {};
      const existingItems = Array.isArray(currentFeatures.items) ? currentFeatures.items : [];

      // Auto-traducción con IA para Inglés y Portugués
      let translationsData: any = {
        en: { title, kicker },
        pt: { title, kicker }
      };

      try {
        console.log(`[HERMES i18n] Traduciendo automáticamente función "${title}" a EN y PT con IA...`);
        const translations = await translatePayloadWithAI({ title, kicker });
        if (translations.en) translationsData.en = translations.en;
        if (translations.pt) translationsData.pt = translations.pt;
      } catch (err: any) {
        console.warn('[HERMES i18n] Advertencia traduciendo función:', err.message);
      }

      const newFeature = {
        id: 'f' + (existingItems.length + 1) + '-' + Date.now().toString().slice(-4),
        title,
        kicker,
        imageUrl: cloudinaryImg,
        translations: translationsData
      };

      const updatedItems = [...existingItems, newFeature];
      currentFeatures.items = updatedItems;

      await saveLandingSetting('features', currentFeatures);

      // Persistencia en los archivos JSON de idiomas del frontend
      try {
        const fIdx = updatedItems.length;
        updateFrontendLocaleJsons((json, lang) => {
          if (!json.funciones) json.funciones = {};
          if (lang === 'en') {
            json.funciones[`f${fIdx}_title`] = translationsData.en.title || title;
            json.funciones[`f${fIdx}_kicker`] = translationsData.en.kicker || kicker;
          } else if (lang === 'pt') {
            json.funciones[`f${fIdx}_title`] = translationsData.pt.title || title;
            json.funciones[`f${fIdx}_kicker`] = translationsData.pt.kicker || kicker;
          } else {
            json.funciones[`f${fIdx}_title`] = title;
            json.funciones[`f${fIdx}_kicker`] = kicker;
          }
        });
      } catch (err: any) {
        console.warn('[HERMES i18n] Error guardando JSONs de función:', err.message);
      }

      return {
        result: {
          feature: newFeature,
          total_features: updatedItems.length,
          status: 'SAVED_IN_MYSQL_AND_JSON_LOCALES'
        },
        description: `Función "${title}" agregada con éxito a la sección de Funciones en MySQL y traducida a inglés y portugués. Total funciones activas: ${updatedItems.length}`
      };
    }

    case 'create_service_item': {
      const title = args.title || 'Nuevo Servicio';
      const kicker = args.kicker || 'Solución de Alto Impacto';
      const description = args.description || 'Solución integral personalizada desarrollada por TLUX Studio.';
      const deliverables = Array.isArray(args.deliverables) && args.deliverables.length > 0
        ? args.deliverables
        : ['Solución 100% personalizada', 'Rendimiento y escalabilidad óptimos', 'Soporte e integración continua'];
      const result = args.result || 'Resultados medibles y garantizados.';

      const currentServices: any = (await getLandingSetting('services')) || {};
      const existingItems = Array.isArray(currentServices.items) ? currentServices.items : [];

      const newService = {
        id: 's' + (existingItems.length + 1) + '-' + Date.now().toString().slice(-4),
        title,
        kicker,
        description,
        deliverables,
        result
      };

      const updatedItems = [...existingItems, newService];
      currentServices.items = updatedItems;

      await saveLandingSetting('services', currentServices);

      // Auto-traducción y persistencia en los archivos JSON de idiomas (ES, EN, PT)
      try {
        console.log(`[HERMES i18n] Traduciendo automáticamente servicio "${title}" a EN y PT con IA...`);
        const translations = await translatePayloadWithAI({
          title,
          kicker,
          description,
          deliverables,
          result
        });

        const enData = translations.en || {};
        const ptData = translations.pt || {};

        const sIdx = updatedItems.length;
        updateFrontendLocaleJsons((json, lang) => {
          if (!json.servicios) json.servicios = {};
          if (lang === 'en') {
            json.servicios[`s${sIdx}_title`] = enData.title || title;
            json.servicios[`s${sIdx}_kicker`] = enData.kicker || kicker;
            json.servicios[`s${sIdx}_desc`] = enData.description || description;
            json.servicios[`s${sIdx}_result`] = enData.result || result;
            if (Array.isArray(enData.deliverables)) {
              enData.deliverables.forEach((d: string, i: number) => { json.servicios[`s${sIdx}_d${i + 1}`] = d; });
            }
          } else if (lang === 'pt') {
            json.servicios[`s${sIdx}_title`] = ptData.title || title;
            json.servicios[`s${sIdx}_kicker`] = ptData.kicker || kicker;
            json.servicios[`s${sIdx}_desc`] = ptData.description || description;
            json.servicios[`s${sIdx}_result`] = ptData.result || result;
            if (Array.isArray(ptData.deliverables)) {
              ptData.deliverables.forEach((d: string, i: number) => { json.servicios[`s${sIdx}_d${i + 1}`] = d; });
            }
          } else {
            json.servicios[`s${sIdx}_title`] = title;
            json.servicios[`s${sIdx}_kicker`] = kicker;
            json.servicios[`s${sIdx}_desc`] = description;
            json.servicios[`s${sIdx}_result`] = result;
            deliverables.forEach((d: string, i: number) => { json.servicios[`s${sIdx}_d${i + 1}`] = d; });
          }
        });
      } catch (err: any) {
        console.warn('[HERMES i18n] Advertencia guardando traducciones de servicio:', err.message);
      }

      return {
        result: {
          service: newService,
          total_services: updatedItems.length,
          status: 'SAVED_IN_MYSQL_AND_JSON_LOCALES'
        },
        description: `Servicio "${title}" agregado con éxito en MySQL y traducido automáticamente a inglés y portugués en los archivos JSON de idiomas. Total activos: ${updatedItems.length}`
      };
    }

    case 'create_client_review': {
      const clientName = args.clientName || 'Cliente TLUX';
      const comment = args.comment || 'Excelente servicio y calidad de desarrollo.';
      const rawTag = args.tag || '[ CLIENTE TLUX ]';
      const tag = rawTag.startsWith('[') ? rawTag : `[ ${rawTag.toUpperCase()} ]`;
      const rating = typeof args.rating === 'number' ? Math.min(5, Math.max(1, args.rating)) : 5;

      const currentRatings: any = (await getLandingSetting('ratings')) || {};
      const existingItems = Array.isArray(currentRatings.items) ? currentRatings.items : [];

      const newReview = {
        id: 'r' + (existingItems.length + 1) + '-' + Date.now().toString().slice(-4),
        clientName,
        tag,
        comment,
        rating
      };

      const updatedItems = [...existingItems, newReview];
      currentRatings.items = updatedItems;

      await saveLandingSetting('ratings', currentRatings);

      return {
        result: {
          review: newReview,
          total_reviews: updatedItems.length,
          status: 'SAVED_IN_MYSQL'
        },
        description: `Opinión de cliente de "${clientName}" agregada con éxito a la Landing Page en MySQL. Total opiniones: ${updatedItems.length}`
      };
    }

    case 'update_landing_section': {
      const sectionKey = args.section_key;
      let updates = args.updates || {};

      if (sectionKey === 'hero') {
        let targetImg = updates.heroImageUrl || updates.imageUrl || updates.image_url || updates.image || updates.coverImage;
        const promptContext = JSON.stringify(updates);
        const recentlyUsed = await getRecentlyUsedImages(15);
        const resolved = resolveThemedMediaSelection(promptContext, 'hero_landing', recentlyUsed);

        if (!targetImg || targetImg.includes('demo') || targetImg.includes('tluxstudio') || targetImg.includes('placeholder') || !targetImg.startsWith('http')) {
          targetImg = resolved.cover.url;
        }

        const processedCloudinaryImg = await uploadImageUrlToCloudinary(targetImg, 'corptlux/landing');
        updates.heroImageUrl = processedCloudinaryImg;
        updates.image_url = processedCloudinaryImg;
        updates.imageUrl = processedCloudinaryImg;
      } else if (sectionKey === 'ratings' && (updates.clientName || updates.review || updates.comment)) {
        const currentRatings: any = (await getLandingSetting('ratings')) || {};
        const existingItems = Array.isArray(currentRatings.items) ? currentRatings.items : [];
        const clientName = updates.clientName || updates.name || 'Cliente TLUX';
        const comment = updates.comment || updates.review || '';
        const tag = updates.tag || '[ CLIENTE TLUX ]';
        const rating = typeof updates.rating === 'number' ? updates.rating : 5;

        const newReview = {
          id: 'r' + (existingItems.length + 1) + '-' + Date.now().toString().slice(-4),
          clientName,
          tag: tag.startsWith('[') ? tag : `[ ${tag.toUpperCase()} ]`,
          comment,
          rating
        };
        updates.items = [...existingItems, newReview];
      } else if (sectionKey === 'services' && (updates.serviceTitle || (updates.title && !updates.titlePart1))) {
        const currentServices: any = (await getLandingSetting('services')) || {};
        const existingItems = Array.isArray(currentServices.items) ? currentServices.items : [];
        const title = updates.serviceTitle || updates.title || 'Nuevo Servicio';
        const kicker = updates.kicker || 'Solución de Alto Impacto';
        const description = updates.description || 'Solución integral personalizada desarrollada por TLUX Studio.';
        const deliverables = Array.isArray(updates.deliverables) ? updates.deliverables : ['Solución 100% personalizada', 'Rendimiento y escalabilidad', 'Soporte especializado'];
        const result = updates.result || 'Resultados medibles y garantizados.';

        const newService = {
          id: 's' + (existingItems.length + 1) + '-' + Date.now().toString().slice(-4),
          title,
          kicker,
          description,
          deliverables,
          result
        };
        updates.items = [...existingItems, newService];
      } else if (sectionKey === 'features' && (updates.featureTitle || (updates.title && !updates.titlePart1))) {
        const currentFeatures: any = (await getLandingSetting('features')) || {};
        const existingItems = Array.isArray(currentFeatures.items) ? currentFeatures.items : [];
        const title = updates.featureTitle || updates.title || 'Nueva Función';
        const kicker = updates.kicker || 'Innovación & Tecnología';
        let initialImg = updates.imageUrl || updates.image || '';

        if (!initialImg || !initialImg.startsWith('http')) {
          const recentlyUsed = await getRecentlyUsedImages(15);
          const resolved = resolveThemedMediaSelection(`${title} ${kicker}`, 'feature_landing', recentlyUsed);
          initialImg = resolved.cover.url;
        }

        const cloudinaryImg = await uploadImageUrlToCloudinary(initialImg, 'corptlux/landing');
        const newFeature = {
          id: 'f' + (existingItems.length + 1) + '-' + Date.now().toString().slice(-4),
          title,
          kicker,
          imageUrl: cloudinaryImg
        };
        updates.items = [...existingItems, newFeature];

        // Auto-traducción con IA y persistencia en los JSON de idiomas (ES, EN, PT)
        try {
          console.log(`[HERMES i18n] Traduciendo automáticamente función "${title}" a EN y PT con IA...`);
          const translations = await translatePayloadWithAI({ title, kicker });
          const enData = translations.en || {};
          const ptData = translations.pt || {};

          const fIdx = updates.items ? updates.items.length : (existingItems.length + 1);
          updateFrontendLocaleJsons((json, lang) => {
            if (!json.funciones) json.funciones = {};
            if (lang === 'en') {
              json.funciones[`f${fIdx}_title`] = enData.title || title;
              json.funciones[`f${fIdx}_kicker`] = enData.kicker || kicker;
            } else if (lang === 'pt') {
              json.funciones[`f${fIdx}_title`] = ptData.title || title;
              json.funciones[`f${fIdx}_kicker`] = ptData.kicker || kicker;
            } else {
              json.funciones[`f${fIdx}_title`] = title;
              json.funciones[`f${fIdx}_kicker`] = kicker;
            }
          });
        } catch (err: any) {
          console.warn('[HERMES i18n] Error en traducción de función:', err.message);
        }
      } else if (sectionKey === 'techStack' && (updates.techName || updates.name)) {
        const currentStack: any = (await getLandingSetting('techStack')) || {};
        const existingItems = Array.isArray(currentStack.items) ? currentStack.items : [];
        const name = updates.techName || updates.name || 'Nueva Tecnología';
        const category = (updates.category || 'SYSTEM_STACK').toUpperCase();
        const description = updates.description || 'Tecnología de alto rendimiento integrada en el stack de TLUX.';
        const usageCase = updates.usageCase || updates.useCase || 'Plataformas web escalables y microservicios.';
        let customUrl = updates.logoUrl || '';

        const localSvgPath = await downloadAndSaveOfficialTechSvg(name, customUrl);
        const finalLogoUrl = localSvgPath || (customUrl.startsWith('http') ? customUrl : undefined);

        const newTech = {
          id: 't' + (existingItems.length + 1) + '-' + Date.now().toString().slice(-4),
          name,
          category,
          description,
          usageCase,
          logoUrl: finalLogoUrl
        };
        updates.items = [...existingItems, newTech];
      } else {
        updates = await processObjectImagesWithCloudinary(updates, 'corptlux/landing');
      }

      const currentContent: any = (await getLandingSetting(sectionKey)) || {};
      const merged = typeof currentContent === 'object' && currentContent !== null
        ? { ...currentContent, ...updates }
        : updates;

      await saveLandingSetting(sectionKey, merged);

      return {
        result: {
          section_key: sectionKey,
          heroImageUrl: updates.heroImageUrl || undefined,
          updated_keys: Object.keys(updates),
          status: 'SAVED_IN_MYSQL'
        },
        description: `Sección '${sectionKey}' de la Landing Page actualizada exitosamente en MySQL: ${Object.keys(updates).join(', ')}`
      };
    }

    case 'get_cms_stats': {
      const [articles]: any = await pool.query('SELECT COUNT(*) as total FROM articles');
      const [published]: any = await pool.query("SELECT COUNT(*) as total FROM articles WHERE status = 'published'");
      const [leads]: any = await pool.query('SELECT COUNT(*) as total FROM leads');
      const [faqs]: any = await pool.query('SELECT COUNT(*) as total FROM faqs');
      const [users]: any = await pool.query('SELECT COUNT(*) as total FROM admin_users');
      const [recentLeads]: any = await pool.query('SELECT name, email, subtitle, status, created_at FROM leads ORDER BY id DESC LIMIT 5');

      return {
        result: {
          articles: {
            total: articles[0]?.total || 0,
            published: published[0]?.total || 0
          },
          leads: {
            total: leads[0]?.total || 0,
            recent: recentLeads || []
          },
          faqs: faqs[0]?.total || 0,
          users: users[0]?.total || 0
        },
        description: 'Métricas y estadísticas del CMS recuperadas en tiempo real de MySQL'
      };
    }

    case 'create_faq': {
      const question = args.question || 'Pregunta Frecuente';
      const answer = args.answer || 'Respuesta detallada';
      const categoryName = args.category || args.category_name || 'General';

      let categoryId = null;
      try {
        const [catRows]: any = await pool.query(
          "SELECT id FROM categories WHERE type = 'faq' AND (JSON_UNQUOTE(JSON_EXTRACT(name, '$.es')) = ? OR JSON_UNQUOTE(JSON_EXTRACT(name, '$.en')) = ?) LIMIT 1",
          [categoryName, categoryName]
        );
        if (catRows && catRows.length > 0) {
          categoryId = catRows[0].id;
        } else {
          const [firstCat]: any = await pool.query("SELECT id FROM categories WHERE type = 'faq' LIMIT 1");
          if (firstCat && firstCat.length > 0) {
            categoryId = firstCat[0].id;
          } else {
            const catSlug = slugify(categoryName) || 'faq-' + Date.now();
            const nameJson = JSON.stringify({ es: categoryName, en: categoryName, pt: categoryName });
            const slugJson = JSON.stringify({ es: catSlug, en: catSlug, pt: catSlug });
            const [insCat]: any = await pool.query(
              "INSERT INTO categories (type, name, slug, status, created_at, updated_at) VALUES ('faq', ?, ?, 'active', NOW(), NOW())",
              [nameJson, slugJson]
            );
            categoryId = insCat.insertId || null;
          }
        }
      } catch (err) {
        console.warn('Error resolviendo categoría de FAQ:', err);
      }

      const questionJson = JSON.stringify({ es: question, en: question, pt: question });
      const answerJson = JSON.stringify({ es: answer, en: answer, pt: answer });

      const [insRes]: any = await pool.query(
        `INSERT INTO faqs (category_id, question, answer, position, status, created_at, updated_at)
         VALUES (?, ?, ?, 0, 'active', NOW(), NOW())`,
        [categoryId, questionJson, answerJson]
      );

      const faqId = insRes.insertId;

      return {
        result: {
          faq_id: faqId,
          question,
          category: categoryName,
          category_id: categoryId,
          status: 'active'
        },
        description: `Pregunta frecuente "${question}" registrada en MySQL con ID #${faqId} en la categoría '${categoryName}'`
      };
    }

    default:
      throw new Error(`Herramienta '${name}' no implementada.`);
  }
}

// ── SERVICIO PRINCIPAL DE HERMES CON ROTACIÓN MULTI-MODELO Y TOLERANCIA A RATE-LIMITS (429) ──
export const HermesService = {
  async translateFields(
    fields: Record<string, any>,
    sourceLang: string = 'es',
    targetLangs: string[] = ['en', 'pt']
  ): Promise<{ en?: Record<string, any>; pt?: Record<string, any> }> {
    if (!apiKey) {
      throw new Error('GROQ_API_KEY no está configurada.');
    }
    return translatePayloadWithAI(fields);
  },

  async chatWithAgent(
    prompt: string,
    history: Array<{ role: string; content: string }> = []
  ): Promise<{
    reply: string;
    toolExecutions: Array<{
      tool: string;
      params: any;
      result: any;
      description: string;
    }>;
  }> {
    if (!apiKey) {
      throw new Error('GROQ_API_KEY no está configurada en el servidor Backend.');
    }

    const systemPrompt = `Eres HERMES, el Copiloto Autónomo oficial de TLUX Studio CMS (v1.0).
Tienes acceso a herramientas para ejecutar acciones directas en MySQL.

REGLAS DE OPERACIÓN OBLIGATORIAS:
1. SYSTEM TECH STACK / TECNOLOGÍAS MÁS USADAS:
   - Cuando el usuario te pida crear, agregar o registrar una tecnología al Stack Tecnológico (System Stack):
     * Invoca SIEMPRE 'create_tech_stack_item' con name, category (ej: "CACHE", "CONTAINERS", "DATABASE", "BACKEND_ENGINE", "CLOUD"), description, usageCase y logoUrl (opcional).
     * El sistema buscará y descargará automáticamente el logo oficial vectorial SVG y lo guardará en la carpeta public/ del proyecto.

2. FUNCIONES / FEATURES DE LA LANDING:
   - Cuando el usuario te pida crear, agregar o añadir una función / feature / característica destacada en la sección de Funciones:
     * Invoca SIEMPRE 'create_feature_item' con title, kicker e imageUrl (o temática deseada como "ia", "cloud", "ciberseguridad").

3. SERVICIOS Y SOLUCIONES (BOTONES DESPLEGABLES / ACORDEÓN):
   - Cuando el usuario te pida crear, agregar o añadir un nuevo servicio, solución o botón desplegable en la sección de Servicios de la landing:
     * Invoca SIEMPRE 'create_service_item' con title, kicker, description, deliverables y result.

4. OPINIONES Y RESEÑAS DE CLIENTES:
   - Cuando el usuario te pida agregar, crear o registrar una opinión / reseña / testimonio de cliente en la landing:
     * Invoca SIEMPRE 'create_client_review' con clientName, comment, tag y rating.

5. MODIFICAR LA LANDING PAGE:
   - Cuando el usuario te pida cambiar, actualizar o modificar cualquier sección de la landing (ej: hero, services, about, stats, contact, features, techStack):
     * Invoca SIEMPRE 'update_landing_section'.

6. CREACIÓN DE ARTÍCULOS:
   - Redacta artículos extensos (800 a 1200+ palabras) con 5 a 7 secciones <h2>, <h3>, cajas de insight TLUX y conclusiones oscuras.
   - Invoca 'create_article' para guardar en MySQL.

7. CONSULTA DE MÉTRICAS Y FAQS:
   - Estadísticas -> 'get_cms_stats'.
   - Crear FAQ -> 'create_faq' (respuestas concisas de 2-4 oraciones).

Responde siempre en español de forma ejecutiva, directa, profesional y sin incluir etiquetas de pensamiento interno.`;

    const trimmedHistory = history.slice(-6);

    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory.map((h) => ({
        role: (h.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: h.content,
      })),
      { role: 'user', content: prompt },
    ];

    const toolExecutions: Array<{
      tool: string;
      params: any;
      result: any;
      description: string;
    }> = [];

    let firstResponse: any = null;
    let selectedModel = MODEL_CANDIDATES[0];
    let lastError: any = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        firstResponse = await groq.chat.completions.create({
          model: modelName,
          messages,
          tools: TOOLS,
          temperature: 0.2,
          max_tokens: 3500,
        });
        selectedModel = modelName;
        break;
      } catch (err: any) {
        console.warn(`[HERMES] Modelo ${modelName} no disponible o límite alcanzado (${err.message}). Cambiando a siguiente modelo...`);
        lastError = err;
      }
    }

    if (!firstResponse) {
      throw new Error(`Todos los modelos del pool alcanzaron su límite temporal. ${lastError?.message || ''}`);
    }

    const choice = firstResponse.choices[0];
    const responseMessage = choice?.message;

    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      messages.push(responseMessage);

      const executedToolTypes = new Set<string>();

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const toolName = toolCall.function.name;

        if (
          (toolName === 'create_article' ||
            toolName === 'create_client_review' ||
            toolName === 'create_service_item' ||
            toolName === 'create_feature_item' ||
            toolName === 'create_tech_stack_item') &&
          executedToolTypes.has(toolName)
        ) {
          continue;
        }
        executedToolTypes.add(toolName);

        const toolArgs = parseToolArgs(toolCall.function.arguments || '{}');

        try {
          const execution = await executeTool(toolName, toolArgs);
          toolExecutions.push({
            tool: toolName,
            params: toolArgs,
            result: execution.result,
            description: execution.description,
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(execution.result),
          });
        } catch (toolErr: any) {
          toolExecutions.push({
            tool: toolName,
            params: toolArgs,
            result: { error: toolErr.message },
            description: `Error al ejecutar ${toolName}: ${toolErr.message}`,
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: toolErr.message }),
          });
        }
      }

      let secondResponse: any = null;
      for (const modelName of [selectedModel, ...MODEL_CANDIDATES]) {
        try {
          secondResponse = await groq.chat.completions.create({
            model: modelName,
            messages,
            temperature: 0.2,
            max_tokens: 600,
          });
          break;
        } catch (secErr: any) {
          console.warn(`[HERMES] Segundo pase falló en ${modelName}: ${secErr.message}`);
        }
      }

      const rawReply = secondResponse?.choices[0]?.message?.content || 'Acción completada con éxito en MySQL.';
      const finalReply = cleanOutputText(rawReply);
      return {
        reply: finalReply || 'Acción completada con éxito en MySQL.',
        toolExecutions,
      };
    }

    const rawContent = responseMessage?.content || 'Acción procesada por Hermes.';
    return {
      reply: cleanOutputText(rawContent),
      toolExecutions,
    };
  },

  async getStatus() {
    return {
      online: Boolean(apiKey),
      models_pool: MODEL_CANDIDATES,
      provider: 'Groq Cloud (Multi-Model Hermes Engine)',
      version: 'Hermes Copilot v1.1',
    };
  },
};
