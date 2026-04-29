const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = 3000;
const CONFIG_PATH = path.join(__dirname, 'config.json');

app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

// ── GET config ──────────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: 'No se pudo leer config.json' });
  }
});

// ── PATCH config ─────────────────────────────────────────────────────────────
app.patch('/api/config', (req, res) => {
  try {
    const current = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const updated = deepMerge(current, req.body);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf8');
    res.json({ ok: true, config: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── CHAT (proxy to Claude API) ───────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'Falta la API key de Anthropic.' });

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  const tools = [
    {
      name: 'update_business',
      description: 'Actualiza los datos generales del negocio: nombre, eslogan, subtítulo, email, teléfono, instagram, ubicación, color de acento.',
      input_schema: {
        type: 'object',
        properties: {
          name:        { type: 'string', description: 'Nombre del negocio' },
          tagline:     { type: 'string', description: 'Título principal del hero (puede tener \\n para saltos de línea)' },
          subtitle:    { type: 'string', description: 'Subtítulo del hero' },
          eyebrow:     { type: 'string', description: 'Texto pequeño encima del título hero' },
          email:       { type: 'string', description: 'Email de contacto' },
          phone:       { type: 'string', description: 'Teléfono' },
          instagram:   { type: 'string', description: 'Usuario de Instagram' },
          location:    { type: 'string', description: 'Localización en el footer' },
          accentColor: { type: 'string', description: 'Color de acento en hex, ej: #f5a623' }
        }
      }
    },
    {
      name: 'update_guide',
      description: 'Actualiza la información personal del guía: nombre, bio, certificaciones.',
      input_schema: {
        type: 'object',
        properties: {
          name:             { type: 'string', description: 'Nombre del guía' },
          bio1:             { type: 'string', description: 'Primer párrafo de la bio' },
          bio2:             { type: 'string', description: 'Segundo párrafo de la bio' },
          certifications:   { type: 'array', items: { type: 'string' }, description: 'Lista de certificaciones y habilidades' }
        }
      }
    },
    {
      name: 'update_stat',
      description: 'Actualiza uno de los 4 contadores de estadísticas.',
      input_schema: {
        type: 'object',
        required: ['index'],
        properties: {
          index:  { type: 'number', description: 'Índice del stat (0=años, 1=clientes, 2=rutas, 3=cimas)' },
          value:  { type: 'number', description: 'Valor numérico' },
          suffix: { type: 'string', description: 'Sufijo, ej: + o vacío' },
          label:  { type: 'string', description: 'Texto descriptivo' }
        }
      }
    },
    {
      name: 'update_service',
      description: 'Actualiza un servicio existente por su ID.',
      input_schema: {
        type: 'object',
        required: ['id'],
        properties: {
          id:          { type: 'string', description: 'ID del servicio: senderismo, alta-montana, escalada, raquetas, grupos, fotografia' },
          title:       { type: 'string' },
          description: { type: 'string' },
          price:       { type: 'string', description: 'Precio en euros, solo el número. null si es presupuesto personalizado.' },
          badge:       { type: 'string' },
          duration:    { type: 'string' },
          difficulty:  { type: 'string' },
          season:      { type: 'string' },
          featured:    { type: 'boolean' }
        }
      }
    },
    {
      name: 'update_testimonial',
      description: 'Actualiza un testimonio por índice.',
      input_schema: {
        type: 'object',
        required: ['index'],
        properties: {
          index:   { type: 'number', description: 'Índice (0-3)' },
          text:    { type: 'string', description: 'Texto del testimonio' },
          author:  { type: 'string', description: 'Nombre del autor' },
          context: { type: 'string', description: 'Contexto, ej: Mont Blanc, verano 2024' }
        }
      }
    },
    {
      name: 'update_faq',
      description: 'Actualiza una pregunta frecuente por índice.',
      input_schema: {
        type: 'object',
        required: ['index'],
        properties: {
          index:    { type: 'number', description: 'Índice (0-5)' },
          question: { type: 'string' },
          answer:   { type: 'string' }
        }
      }
    },
    {
      name: 'update_banner',
      description: 'Actualiza el banner intermedio de la web.',
      input_schema: {
        type: 'object',
        properties: {
          title:    { type: 'string' },
          subtitle: { type: 'string' }
        }
      }
    }
  ];

  const systemPrompt = `Eres el asistente de personalización de una web para un negocio de guía de montaña.
Tu trabajo es interpretar lo que el usuario quiere cambiar y ejecutar la herramienta adecuada para actualizarlo.

Configuración actual del sitio:
${JSON.stringify(config, null, 2)}

Reglas:
- Responde siempre en español, de forma breve y amigable.
- Cuando el usuario pida un cambio, usa la herramienta correspondiente. Puedes usar varias herramientas en una misma respuesta.
- Tras ejecutar los cambios, confirma qué has cambiado con una frase corta.
- Si el usuario pregunta qué puede personalizar, explícale las opciones disponibles.
- Si no está claro qué quiere cambiar, pregunta.
- No inventes datos. Si el usuario no da un valor concreto, pregunta cuál quiere.`;

  try {
    const claudeBody = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages
    });

    const responseData = await callClaude(apiKey, claudeBody);
    const parsed = JSON.parse(responseData);

    // Process tool calls and apply changes
    const toolResults = [];
    for (const block of parsed.content || []) {
      if (block.type === 'tool_use') {
        const result = applyTool(block.name, block.input);
        toolResults.push({ toolName: block.name, input: block.input, result });
      }
    }

    res.json({ response: parsed, toolResults });
  } catch (e) {
    console.error('Error calling Claude:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Apply tool to config ──────────────────────────────────────────────────────
function applyTool(name, input) {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

    if (name === 'update_business') {
      Object.assign(config.business, removeUndefined(input));
    } else if (name === 'update_guide') {
      Object.assign(config.guide, removeUndefined(input));
    } else if (name === 'update_stat') {
      const { index, ...rest } = input;
      if (config.stats[index]) Object.assign(config.stats[index], removeUndefined(rest));
    } else if (name === 'update_service') {
      const { id, ...rest } = input;
      const svc = config.services.find(s => s.id === id);
      if (svc) Object.assign(svc, removeUndefined(rest));
    } else if (name === 'update_testimonial') {
      const { index, ...rest } = input;
      if (config.testimonials[index]) Object.assign(config.testimonials[index], removeUndefined(rest));
    } else if (name === 'update_faq') {
      const { index, ...rest } = input;
      if (config.faq[index]) Object.assign(config.faq[index], removeUndefined(rest));
    } else if (name === 'update_banner') {
      Object.assign(config.featureBanner, removeUndefined(input));
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function removeUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function callClaude(apiKey, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`API Error ${res.statusCode}: ${data}`));
        else resolve(data);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

app.listen(PORT, () => {
  console.log(`\n✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`   Sitio web:  http://localhost:${PORT}/index.html`);
  console.log(`   Editor:     http://localhost:${PORT}/editor.html\n`);
});
