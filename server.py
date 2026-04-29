#!/usr/bin/env python3
"""
Servidor local para la web de guía de montaña.
Sirve los archivos estáticos + API para el editor por chat.
"""
import json, os, urllib.request, urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, 'config.json')
PORT = 3000


def read_config():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def write_config(data):
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def deep_merge(base, patch):
    result = dict(base)
    for k, v in patch.items():
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def apply_tool(name, inp):
    try:
        cfg = read_config()

        if name == 'update_business':
            cfg['business'].update({k: v for k, v in inp.items() if v is not None})

        elif name == 'update_guide':
            cfg['guide'].update({k: v for k, v in inp.items() if v is not None})

        elif name == 'update_stat':
            idx = inp.get('index')
            if idx is not None and 0 <= idx < len(cfg['stats']):
                cfg['stats'][idx].update({k: v for k, v in inp.items() if k != 'index' and v is not None})

        elif name == 'update_service':
            sid = inp.get('id')
            for svc in cfg['services']:
                if svc['id'] == sid:
                    svc.update({k: v for k, v in inp.items() if k != 'id' and v is not None})
                    break

        elif name == 'update_testimonial':
            idx = inp.get('index')
            if idx is not None and 0 <= idx < len(cfg['testimonials']):
                cfg['testimonials'][idx].update({k: v for k, v in inp.items() if k != 'index' and v is not None})

        elif name == 'update_faq':
            idx = inp.get('index')
            if idx is not None and 0 <= idx < len(cfg['faq']):
                cfg['faq'][idx].update({k: v for k, v in inp.items() if k != 'index' and v is not None})

        elif name == 'update_banner':
            cfg['featureBanner'].update({k: v for k, v in inp.items() if v is not None})

        write_config(cfg)
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def call_claude(api_key, body_bytes):
    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=body_bytes,
        headers={
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
        },
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode('utf-8'))


SYSTEM_PROMPT = """Eres el asistente de personalización de una web para un negocio de guía de montaña.
Tu trabajo es interpretar lo que el usuario quiere cambiar y ejecutar la herramienta adecuada para actualizarlo.

Reglas:
- Responde siempre en español, de forma breve y amigable.
- Cuando el usuario pida un cambio, usa la herramienta correspondiente. Puedes usar varias herramientas en una misma respuesta.
- Tras ejecutar los cambios, confirma qué has cambiado con una frase corta.
- Si el usuario pregunta qué puede personalizar, explícale las opciones disponibles.
- Si no está claro qué quiere cambiar, pregunta.
- No inventes datos. Si el usuario no da un valor concreto, pregunta cuál quiere."""

TOOLS = [
    {
        "name": "update_business",
        "description": "Actualiza los datos generales del negocio: nombre, eslogan, subtítulo, email, teléfono, instagram, ubicación, color de acento.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name":        {"type": "string", "description": "Nombre del negocio"},
                "tagline":     {"type": "string", "description": "Título principal del hero (usa \\n para saltos de línea)"},
                "subtitle":    {"type": "string", "description": "Subtítulo del hero"},
                "eyebrow":     {"type": "string", "description": "Texto pequeño encima del título hero"},
                "email":       {"type": "string", "description": "Email de contacto"},
                "phone":       {"type": "string", "description": "Teléfono"},
                "instagram":   {"type": "string", "description": "Usuario de Instagram"},
                "location":    {"type": "string", "description": "Localización en el footer"},
                "accentColor": {"type": "string", "description": "Color de acento en hex, ej: #f5a623"}
            }
        }
    },
    {
        "name": "update_guide",
        "description": "Actualiza la información personal del guía: nombre, bio, certificaciones.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name":           {"type": "string"},
                "bio1":           {"type": "string", "description": "Primer párrafo de la bio"},
                "bio2":           {"type": "string", "description": "Segundo párrafo de la bio"},
                "certifications": {"type": "array", "items": {"type": "string"}, "description": "Lista de certificaciones"}
            }
        }
    },
    {
        "name": "update_stat",
        "description": "Actualiza uno de los 4 contadores de estadísticas.",
        "input_schema": {
            "type": "object",
            "required": ["index"],
            "properties": {
                "index":  {"type": "number", "description": "0=años, 1=clientes, 2=rutas, 3=cimas"},
                "value":  {"type": "number"},
                "suffix": {"type": "string", "description": "Sufijo ej: + o vacío"},
                "label":  {"type": "string"}
            }
        }
    },
    {
        "name": "update_service",
        "description": "Actualiza un servicio existente por su ID.",
        "input_schema": {
            "type": "object",
            "required": ["id"],
            "properties": {
                "id":          {"type": "string", "description": "senderismo | alta-montana | escalada | raquetas | grupos | fotografia"},
                "title":       {"type": "string"},
                "description": {"type": "string"},
                "price":       {"type": "string", "description": "Solo el número en euros. null si es presupuesto personalizado."},
                "badge":       {"type": "string"},
                "duration":    {"type": "string"},
                "difficulty":  {"type": "string"},
                "season":      {"type": "string"},
                "featured":    {"type": "boolean"}
            }
        }
    },
    {
        "name": "update_testimonial",
        "description": "Actualiza un testimonio por índice (0-3).",
        "input_schema": {
            "type": "object",
            "required": ["index"],
            "properties": {
                "index":   {"type": "number"},
                "text":    {"type": "string"},
                "author":  {"type": "string"},
                "context": {"type": "string"}
            }
        }
    },
    {
        "name": "update_faq",
        "description": "Actualiza una pregunta frecuente por índice (0-5).",
        "input_schema": {
            "type": "object",
            "required": ["index"],
            "properties": {
                "index":    {"type": "number"},
                "question": {"type": "string"},
                "answer":   {"type": "string"}
            }
        }
    },
    {
        "name": "update_banner",
        "description": "Actualiza el banner intermedio de la web.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title":    {"type": "string"},
                "subtitle": {"type": "string"}
            }
        }
    }
]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, fmt, *args):
        print(f"  {self.command} {self.path} → {args[1]}")

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(length).decode('utf-8')) if length else {}

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/config':
            try:
                self.send_json(200, read_config())
            except Exception as e:
                self.send_json(500, {'error': str(e)})
        else:
            super().do_GET()

    def do_PATCH(self):
        if self.path == '/api/config':
            try:
                patch = self.read_body()
                cfg = deep_merge(read_config(), patch)
                write_config(cfg)
                self.send_json(200, {'ok': True, 'config': cfg})
            except Exception as e:
                self.send_json(500, {'error': str(e)})

    def do_POST(self):
        if self.path == '/api/chat':
            try:
                body = self.read_body()
                api_key = body.get('apiKey', '')
                messages = body.get('messages', [])

                if not api_key:
                    self.send_json(400, {'error': 'Falta la API key.'})
                    return

                cfg = read_config()
                system = SYSTEM_PROMPT + f"\n\nConfiguración actual:\n{json.dumps(cfg, ensure_ascii=False, indent=2)}"

                claude_body = json.dumps({
                    'model': 'claude-opus-4-6',
                    'max_tokens': 1024,
                    'system': system,
                    'tools': TOOLS,
                    'messages': messages
                }, ensure_ascii=False).encode('utf-8')

                response = call_claude(api_key, claude_body)

                # Apply tool calls
                tool_results = []
                for block in response.get('content', []):
                    if block.get('type') == 'tool_use':
                        result = apply_tool(block['name'], block['input'])
                        tool_results.append({'toolName': block['name'], 'input': block['input'], 'result': result})

                self.send_json(200, {'response': response, 'toolResults': tool_results})

            except urllib.error.HTTPError as e:
                err_body = e.read().decode('utf-8')
                self.send_json(500, {'error': f'Error de API ({e.code}): {err_body}'})
            except Exception as e:
                self.send_json(500, {'error': str(e)})


if __name__ == '__main__':
    os.chdir(BASE_DIR)
    server = HTTPServer(('localhost', PORT), Handler)
    print(f'\n✅  Servidor corriendo en http://localhost:{PORT}')
    print(f'   Sitio web:  http://localhost:{PORT}/index.html')
    print(f'   Editor:     http://localhost:{PORT}/editor.html')
    print(f'\n   (Ctrl+C para parar)\n')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServidor parado.')
