# LoL Analyzer — Jäger #ALAN

Analiza tus últimas partidas con foco en:
- Win rate por rol (ADC main vs Support forzado)
- Detección de autofill en bot lane (tu sup o tu adc)
- Gold diff @14 vs oponente de carril (¿realmente ganas lane?)
- Qué carril rompe la partida cuando tú vas adelante
- KP% y vision score (traslado de ventaja post-lane)
- Racha de support forzado (el tilt loop)

## Setup

```bash
cd scripts
pip install -r requirements.txt
```

Saca tu API key gratuita (no requiere cuenta de desarrollador, solo cuenta de Riot):
1. Ve a https://developer.riotgames.com
2. Inicia sesión con tu cuenta de LoL
3. En el dashboard aparece tu **Development API Key** — cópialA
4. Dura 24h, la renuevas cuando la necesites

## Uso

```bash
# Linux/Mac
export RIOT_API_KEY='RGAPI-tu-key-aqui'
python lol_analyzer.py

# Windows (PowerShell)
$env:RIOT_API_KEY = 'RGAPI-tu-key-aqui'
python lol_analyzer.py
```

### Opciones

| Flag | Descripción |
|------|-------------|
| `--count 40` | Analizar 40 partidas (default: 30) |
| `--queue 440` | Flex en lugar de SoloQ (default: 420) |
| `--no-timeline` | Sin gold diff @14 (más rápido, menos info) |
| `--save-json` | Guarda resultados en records.json |

### Ejemplo con más partidas

```bash
python lol_analyzer.py --count 50 --save-json
```

## Qué hace cada sección del reporte

1. **Win rate por rol** — Cuánto pierdes de más cuando te mandan a sup
2. **Autofill en bot lane** — Frecuencia real de autofills y su impacto en tu WR
3. **Gold diff @14** — Valida si tu lane phase es tan sólida como la sientes
4. **Carril que rompe el juego** — El carril aliado más destruido en tus derrotas con ventaja
5. **KP% y visión** — Si estás desconectado del equipo después de lane
6. **Racha de sup forzado** — La racha máxima consecutiva de support
7. **Recomendaciones** — Condicionadas a tus números reales, no genéricas
